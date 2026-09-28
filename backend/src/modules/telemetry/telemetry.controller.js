import mongoose from "mongoose";
import Telemetry from "./telemetry.model.js";
import Vehicle from "../vehicle/vehicle.model.js";
import Driver from "../driver/driver.model.js";
import { processAnomalyEvaluation } from "../anomaly/anomaly.controller.js";
import {
  findActiveIncident,
  processIncidentTrigger,
} from "../incident/incident.controller.js";

const isValidEvent = (event) => {
  if (!event || typeof event !== "object" || Array.isArray(event)) {
    return false;
  }

  const { vehicleId, driverId, timestamp, location, motion, vehicleData } = event;

  if (!vehicleId || !driverId || !timestamp) {
    return false;
  }

  if (
    !location ||
    location.latitude === undefined ||
    location.longitude === undefined ||
    location.speed === undefined
  ) {
    return false;
  }

  if (
    !motion ||
    motion.accelX === undefined ||
    motion.accelY === undefined ||
    motion.accelZ === undefined ||
    motion.gForce === undefined
  ) {
    return false;
  }

  if (
    !vehicleData ||
    vehicleData.speed === undefined ||
    vehicleData.rpm === undefined
  ) {
    return false;
  }

  return true;
};

/**
 * Process single telemetry event through the automatic Anomaly -> Incident pipeline.
 */
const processEventPipeline = async (event) => {
  try {
    const anomalyResult = await processAnomalyEvaluation(event);
    const anomalyEvent = anomalyResult?.data || null;

    if (!anomalyEvent || anomalyEvent.escalationFlag !== true) {
      return {
        anomaly: anomalyEvent,
        incident: null,
      };
    }

    // Check for an existing active incident for this driver & vehicle
    const activeIncident = await findActiveIncident(event.driverId, event.vehicleId);

    if (activeIncident) {
      // Active incident already exists: persist AnomalyEvent, but do NOT create duplicate Incident
      return {
        anomaly: anomalyEvent,
        incident: activeIncident,
        activeIncidentExists: true,
      };
    }

    // No active incident: trigger emergency incident creation
    const incidentResult = await processIncidentTrigger(anomalyEvent);
    return {
      anomaly: anomalyEvent,
      incident: incidentResult?.data || null,
      activeIncidentExists: false,
    };
  } catch (err) {
    console.error("Error in automatic telemetry processing pipeline:", err);
    return {
      anomaly: null,
      incident: null,
      pipelineError: err.message,
    };
  }
};

export const ingestTelemetry = async (req, res, next) => {
  try {
    const payload = req.body;

    if (
      !payload ||
      (Array.isArray(payload) && payload.length === 0) ||
      (typeof payload === "object" && Object.keys(payload).length === 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide telemetry data to ingest.",
      });
    }

    const isBatch = Array.isArray(payload);
    const events = isBatch ? payload : [payload];

    for (const event of events) {
      if (!isValidEvent(event)) {
        return res.status(400).json({
          success: false,
          message: "Telemetry reading missing required sensor fields.",
        });
      }
    }

    if (req.user) {
      const authDriver = await Driver.findOne({ userId: req.user._id });
      if (!authDriver) {
        return res.status(403).json({
          success: false,
          message: "Authenticated user does not have an active Driver profile.",
        });
      }

      for (const event of events) {
        if (
          event.driverId &&
          String(event.driverId) !== String(authDriver._id) &&
          String(event.driverId) !== String(req.user._id)
        ) {
          return res.status(403).json({
            success: false,
            message: "Cannot submit telemetry on behalf of another driver.",
          });
        }

        const vDoc = await Vehicle.findById(event.vehicleId);
        if (!vDoc) {
          return res.status(404).json({
            success: false,
            message: "Referenced vehicle profile not found.",
          });
        }

        if (
          String(vDoc.driverId) !== String(req.user._id) &&
          String(vDoc.driverId) !== String(authDriver._id)
        ) {
          return res.status(403).json({
            success: false,
            message: "Vehicle does not belong to the authenticated driver.",
          });
        }
      }
    }

    const vehicleIds = [
      ...new Set(events.map((e) => e.vehicleId).filter(Boolean)),
    ];
    const driverIds = [
      ...new Set(events.map((e) => e.driverId).filter(Boolean)),
    ];

    for (const id of [...vehicleIds, ...driverIds]) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(404).json({
          success: false,
          message: "Referenced vehicle or driver profile not found.",
        });
      }
    }


    const [vehicleCount, driverCount] = await Promise.all([
      Vehicle.countDocuments({ _id: { $in: vehicleIds } }),
      Driver.countDocuments({ _id: { $in: driverIds } }),
    ]);

    if (
      vehicleCount !== vehicleIds.length ||
      driverCount !== driverIds.length
    ) {
      return res.status(404).json({
        success: false,
        message: "Referenced vehicle or driver profile not found.",
      });
    }

    if (isBatch) {
      const createdEvents = await Telemetry.insertMany(events);

      // Process pipeline for each event in the batch
      const processingResults = await Promise.all(
        events.map((e) => processEventPipeline(e))
      );

      return res.status(201).json({
        success: true,
        message: "Telemetry batch ingested successfully",
        data: createdEvents,
        processingResults,
      });
    } else {
      const createdEvent = await Telemetry.create(payload);

      // Process pipeline for single telemetry event
      const pipelineResult = await processEventPipeline(payload);

      const responsePayload = {
        success: true,
        message: "Telemetry ingested successfully",
        data: createdEvent,
      };

      if (pipelineResult.anomaly) {
        responsePayload.anomaly = pipelineResult.anomaly;
      }

      if (pipelineResult.incident) {
        responsePayload.incident = pipelineResult.incident;
      }

      return res.status(201).json({
        ...responsePayload,
      });
    }
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
