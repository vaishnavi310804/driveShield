import mongoose from "mongoose";
import Telemetry from "./telemetry.model.js";
import Vehicle from "../vehicle/vehicle.model.js";
import Driver from "../driver/driver.model.js";

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
      return res.status(201).json({
        success: true,
        message: "Telemetry batch ingested successfully",
        data: createdEvents,
      });
    } else {
      const createdEvent = await Telemetry.create(payload);
      return res.status(201).json({
        success: true,
        message: "Telemetry ingested successfully",
        data: createdEvent,
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
