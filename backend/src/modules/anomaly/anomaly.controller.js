import mongoose from "mongoose";
import AnomalyEvent from "./anomaly.model.js";
import Vehicle from "../vehicle/vehicle.model.js";
import Driver from "../driver/driver.model.js";
import Baseline from "../baseline/baseline.model.js";
import Telemetry from "../telemetry/telemetry.model.js";
import { calculateBaselineInternal } from "../baseline/baseline.controller.js";

/**
 * Core reusable anomaly evaluation logic.
 * Evaluates raw or persisted telemetry against the driver & vehicle baseline.
 *
 * @param {Object} telemetryPayload - Telemetry data object containing driverId, vehicleId, location, motion, vehicleData, driverState, deviceContext
 * @returns {Promise<{ status: number, message: string, data: Object|null }>} Evaluation result
 */
export const processAnomalyEvaluation = async (telemetryPayload) => {
  const {
    driverId,
    vehicleId,
    timestamp,
    location,
    motion,
    vehicleData,
    driverState,
    deviceContext,
  } = telemetryPayload || {};

  if (!driverId || !vehicleId || !timestamp) {
    return {
      status: 400,
      message: "Please provide required fields: driverId, vehicleId, and timestamp.",
      data: null,
    };
  }

  if (
    !mongoose.Types.ObjectId.isValid(driverId) ||
    !mongoose.Types.ObjectId.isValid(vehicleId)
  ) {
    return {
      status: 404,
      message: "Referenced driver or vehicle profile not found.",
      data: null,
    };
  }

  const [driverExists, vehicleExists] = await Promise.all([
    Driver.findById(driverId),
    Vehicle.findById(vehicleId),
  ]);

  if (!driverExists || !vehicleExists) {
    return {
      status: 404,
      message: "Referenced driver or vehicle profile not found.",
      data: null,
    };
  }

  let baseline = await Baseline.findOne({ driverId, vehicleId });

  if (!baseline) {
    const calcResult = await calculateBaselineInternal(driverId, vehicleId);
    if (calcResult?.success) {
      baseline = calcResult.data;
    }
  }

  if (!baseline) {
    return {
      status: 400,
      message: "Baseline required for anomaly evaluation. No baseline found for this driver and vehicle.",
      data: null,
    };
  }

  const speed =
    vehicleData?.speed !== undefined && vehicleData?.speed !== null
      ? vehicleData.speed
      : location?.speed;
  const gForce = motion?.gForce;
  const rpm = vehicleData?.rpm;
  const perclos = driverState?.perclos;
  const rawAttentionState = driverState?.attentionState;
  const normalizedAttentionState =
    typeof rawAttentionState === "string"
      ? rawAttentionState.toUpperCase()
      : undefined;

  // Read stored baseline metrics directly without fallback default values
  const maxNormalGForce = baseline.vehicleBaseline?.maxNormalGForce;
  const avgSpeed = baseline.driverBaseline?.avgSpeed;
  const normalPerclos = baseline.driverBaseline?.normalPerclos;
  const avgRpm = baseline.vehicleBaseline?.avgRpm;
  const normalCoolantTemp = baseline.vehicleBaseline?.normalCoolantTemp;
  const normalBatteryVoltage = baseline.vehicleBaseline?.normalBatteryVoltage;

  // Determine rapid speed drop: check if previous traveling speed exists from history or stored avgSpeed baseline
  let isRapidSpeedDropToZero = false;
  if (speed === 0) {
    if (avgSpeed !== undefined && avgSpeed > 0) {
      isRapidSpeedDropToZero = true;
    } else {
      const lastTelemetry = await Telemetry.findOne({ driverId, vehicleId }).sort({ timestamp: -1 });
      const prevSpeed =
        lastTelemetry?.vehicleData?.speed !== undefined && lastTelemetry?.vehicleData?.speed !== null
          ? lastTelemetry.vehicleData.speed
          : lastTelemetry?.location?.speed;
      if (prevSpeed !== undefined && prevSpeed > 0) {
        isRapidSpeedDropToZero = true;
      }
    }
  }

  let detectedAnomaly = null;

  // 1. Multi-signal suspected accident evaluation (Highest Priority)
  // Coincidence of: rapid speed drop to zero + strong motion + RPM zero + impaired/unresponsive driver
  const isStrongMotion =
    gForce !== undefined &&
    (maxNormalGForce !== undefined ? gForce > maxNormalGForce : gForce >= 1.5);
  const isRpmZero = rpm === 0;
  const isDriverImpairedOrUnresponsive =
    normalizedAttentionState === "UNRESPONSIVE" ||
    normalizedAttentionState === "IMPAIRED" ||
    (perclos !== undefined && normalPerclos !== undefined && perclos >= normalPerclos * 3);

  if (isRapidSpeedDropToZero && isStrongMotion && isRpmZero && isDriverImpairedOrUnresponsive) {
    detectedAnomaly = {
      type: "suspected_accident",
      deviationScore:
        maxNormalGForce !== undefined ? Number((gForce / maxNormalGForce).toFixed(2)) : undefined,
      anomalyConfidence: 1.0,
      escalationFlag: true,
      context: {
        location,
        speed,
        rpm,
        gForce,
        attentionState: rawAttentionState,
        perclos,
        speedDropEstablished: true,
        multiSignalMatch: true,
      },
    };
  }
  // 2. High G-force / Hard Braking (Single-Modality Motion Event)
  else if (
    gForce !== undefined &&
    maxNormalGForce !== undefined &&
    gForce > maxNormalGForce
  ) {
    const isContextNormal =
      normalizedAttentionState !== "UNRESPONSIVE" &&
      normalizedAttentionState !== "IMPAIRED" &&
      (rpm === undefined || rpm > 0);

    detectedAnomaly = {
      type: "high_gforce",
      deviationScore: Number((gForce / maxNormalGForce).toFixed(2)),
      anomalyConfidence: 0.5,
      escalationFlag: !isContextNormal,
      context: {
        location,
        gForce,
        maxNormalGForce,
        speed,
        attentionState: rawAttentionState,
        isContextNormal,
      },
    };
  }
  // 3. Driver Fatigue / Drowsiness
  else if (
    perclos !== undefined &&
    normalPerclos !== undefined &&
    perclos > normalPerclos * 2
  ) {
    const isUnresponsive = normalizedAttentionState === "UNRESPONSIVE";

    detectedAnomaly = {
      type: "fatigue_drowsiness",
      deviationScore: Number((perclos / normalPerclos).toFixed(2)),
      anomalyConfidence: isUnresponsive ? 0.9 : 0.5,
      escalationFlag: isUnresponsive,
      context: {
        location,
        perclos,
        normalPerclos,
        attentionState: rawAttentionState,
      },
    };
  }
  // 4. RPM Drop / Engine Stall
  else if (rpm === 0 && speed !== undefined && speed > 0) {
    detectedAnomaly = {
      type: "rpm_drop_stall",
      deviationScore:
        avgRpm !== undefined && avgRpm > 0
          ? Number((avgRpm / 100).toFixed(2))
          : undefined,
      anomalyConfidence: 0.5,
      escalationFlag: normalizedAttentionState === "UNRESPONSIVE",
      context: {
        location,
        rpm,
        speed,
        attentionState: rawAttentionState,
      },
    };
  }
  // 5. Critical Vehicle Parameter Anomaly (Baseline-relative or diagnostic faults)
  else if (
    (vehicleData?.coolantTemp !== undefined &&
      normalCoolantTemp !== undefined &&
      vehicleData.coolantTemp > normalCoolantTemp * 1.25) ||
    (vehicleData?.batteryVoltage !== undefined &&
      normalBatteryVoltage !== undefined &&
      vehicleData.batteryVoltage < normalBatteryVoltage * 0.85) ||
    (vehicleData?.diagnosticFaults && vehicleData.diagnosticFaults.length > 0)
  ) {
    detectedAnomaly = {
      type: "critical_vehicle_parameter",
      deviationScore: undefined,
      anomalyConfidence: 0.5,
      escalationFlag: false,
      context: {
        location,
        coolantTemp: vehicleData?.coolantTemp,
        normalCoolantTemp,
        batteryVoltage: vehicleData?.batteryVoltage,
        normalBatteryVoltage,
        diagnosticFaults: vehicleData?.diagnosticFaults,
      },
    };
  }

  if (!detectedAnomaly) {
    return {
      status: 200,
      message: "Telemetry evaluated: normal operation, no anomaly detected",
      data: null,
    };
  }

  const anomalyEvent = await AnomalyEvent.create({
    driverId,
    vehicleId,
    type: detectedAnomaly.type,
    deviationScore: detectedAnomaly.deviationScore,
    anomalyConfidence: detectedAnomaly.anomalyConfidence,
    context: detectedAnomaly.context,
    timestamp: new Date(timestamp),
    escalationFlag: detectedAnomaly.escalationFlag,
  });

  return {
    status: 201,
    message: "Anomaly detected and recorded successfully",
    data: anomalyEvent,
  };
};

/**
 * HTTP Controller for POST /api/anomalies
 */
export const evaluateAnomaly = async (req, res, next) => {
  try {
    if (req.user) {
      const authDriver = await Driver.findOne({ userId: req.user._id });
      if (!authDriver) {
        return res.status(403).json({
          success: false,
          message: "Authenticated user does not have an active Driver profile.",
        });
      }

      if (
        req.body?.driverId &&
        String(req.body.driverId) !== String(authDriver._id) &&
        String(req.body.driverId) !== String(req.user._id)
      ) {
        return res.status(403).json({
          success: false,
          message: "Cannot evaluate anomaly for another driver.",
        });
      }
    }

    const result = await processAnomalyEvaluation(req.body);
    return res.status(result.status).json({
      success: result.status < 400,
      message: result.message,
      data: result.data,
    });

  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    next(error);
  }
};
