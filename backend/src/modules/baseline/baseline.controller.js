import mongoose from "mongoose";
import Baseline from "./baseline.model.js";
import Vehicle from "../vehicle/vehicle.model.js";
import Driver from "../driver/driver.model.js";
import Telemetry from "../telemetry/telemetry.model.js";

// Isolated motion classification function.
// Device-axis sign conventions for braking vs acceleration are not defined by the assignment.
// Leaves classification-dependent metrics unpopulated until axis conventions are specified.
const classifyMotion = (reading) => {
  return {
    isBraking: false,
    isAcceleration: false,
  };
};

export const calculateBaseline = async (req, res, next) => {
  try {
    const { driverId, vehicleId } = req.body || {};

    if (!driverId || !vehicleId) {
      return res.status(400).json({
        success: false,
        message: "Please provide both driverId and vehicleId to calculate baseline.",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(driverId) ||
      !mongoose.Types.ObjectId.isValid(vehicleId)
    ) {
      return res.status(404).json({
        success: false,
        message: "Referenced driver or vehicle profile not found.",
      });
    }

    const [driverExists, vehicleExists] = await Promise.all([
      Driver.findById(driverId),
      Vehicle.findById(vehicleId),
    ]);

    if (!driverExists || !vehicleExists) {
      return res.status(404).json({
        success: false,
        message: "Referenced driver or vehicle profile not found.",
      });
    }

    if (req.user) {
      const authDriver = await Driver.findOne({ userId: req.user._id });
      if (!authDriver) {
        return res.status(403).json({
          success: false,
          message: "Authenticated user does not have an active Driver profile.",
        });
      }

      if (
        String(driverId) !== String(authDriver._id) &&
        String(driverId) !== String(req.user._id)
      ) {
        return res.status(403).json({
          success: false,
          message: "Cannot calculate baseline for another driver.",
        });
      }

      if (
        String(vehicleExists.driverId) !== String(req.user._id) &&
        String(vehicleExists.driverId) !== String(authDriver._id)
      ) {
        return res.status(403).json({
          success: false,
          message: "Vehicle does not belong to the authenticated driver.",
        });
      }
    }


    const telemetryRecords = await Telemetry.find({ driverId, vehicleId });

    if (!telemetryRecords || telemetryRecords.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No historical telemetry found for this driver and vehicle pair.",
      });
    }

    // 1. Calculate avgSpeed (vehicleData.speed takes precedence over location.speed)
    const speeds = telemetryRecords
      .map((r) =>
        r.vehicleData?.speed !== undefined && r.vehicleData?.speed !== null
          ? r.vehicleData.speed
          : r.location?.speed
      )
      .filter((s) => s !== undefined && s !== null && !isNaN(s));

    const avgSpeed =
      speeds.length > 0
        ? speeds.reduce((sum, val) => sum + val, 0) / speeds.length
        : undefined;

    // 2. Calculate avgRpm
    const rpms = telemetryRecords
      .map((r) => r.vehicleData?.rpm)
      .filter((r) => r !== undefined && r !== null && !isNaN(r));

    const avgRpm =
      rpms.length > 0
        ? rpms.reduce((sum, val) => sum + val, 0) / rpms.length
        : undefined;

    // 3. Calculate maxNormalGForce
    const gForces = telemetryRecords
      .map((r) => r.motion?.gForce)
      .filter((g) => g !== undefined && g !== null && !isNaN(g));

    const maxNormalGForce =
      gForces.length > 0 ? Math.max(...gForces) : undefined;

    // 4. Calculate normalCoolantTemp
    const coolantTemps = telemetryRecords
      .map((r) => r.vehicleData?.coolantTemp)
      .filter((c) => c !== undefined && c !== null && !isNaN(c));

    const normalCoolantTemp =
      coolantTemps.length > 0
        ? coolantTemps.reduce((sum, val) => sum + val, 0) / coolantTemps.length
        : undefined;

    // 5. Calculate normalBatteryVoltage
    const batteryVoltages = telemetryRecords
      .map((r) => r.vehicleData?.batteryVoltage)
      .filter((v) => v !== undefined && v !== null && !isNaN(v));

    const normalBatteryVoltage =
      batteryVoltages.length > 0
        ? batteryVoltages.reduce((sum, val) => sum + val, 0) /
          batteryVoltages.length
        : undefined;

    // 6. Calculate normalPerclos
    const perclosValues = telemetryRecords
      .map((r) => r.driverState?.perclos)
      .filter((p) => p !== undefined && p !== null && !isNaN(p));

    const normalPerclos =
      perclosValues.length > 0
        ? perclosValues.reduce((sum, val) => sum + val, 0) / perclosValues.length
        : undefined;

    // 7. Braking and Acceleration G-force (classification isolated via helper)
    let avgBrakingGForce;
    let avgAccelerationGForce;

    const brakingGForces = [];
    const accelGForces = [];

    for (const record of telemetryRecords) {
      const { isBraking, isAcceleration } = classifyMotion(record);
      if (isBraking && record.motion?.gForce !== undefined) {
        brakingGForces.push(record.motion.gForce);
      }
      if (isAcceleration && record.motion?.gForce !== undefined) {
        accelGForces.push(record.motion.gForce);
      }
    }

    if (brakingGForces.length > 0) {
      avgBrakingGForce =
        brakingGForces.reduce((sum, v) => sum + v, 0) / brakingGForces.length;
    }

    if (accelGForces.length > 0) {
      avgAccelerationGForce =
        accelGForces.reduce((sum, v) => sum + v, 0) / accelGForces.length;
    }

    const driverBaseline = {
      avgSpeed,
      avgBrakingGForce,
      avgAccelerationGForce,
      normalPerclos,
    };

    const vehicleBaseline = {
      avgRpm,
      maxNormalGForce,
      normalCoolantTemp,
      normalBatteryVoltage,
    };

    const lastUpdated = new Date();

    let baseline = await Baseline.findOne({ driverId, vehicleId });

    if (baseline) {
      baseline.driverBaseline = driverBaseline;
      baseline.vehicleBaseline = vehicleBaseline;
      baseline.lastUpdated = lastUpdated;
      await baseline.save();
    } else {
      baseline = await Baseline.create({
        driverId,
        vehicleId,
        driverBaseline,
        vehicleBaseline,
        lastUpdated,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Baseline calculated and updated successfully",
      data: baseline,
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
