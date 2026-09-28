import Vehicle from "./vehicle.model.js";
import Driver from "../driver/driver.model.js";

export const createVehicle = async (req, res, next) => {
  try {
    const { driverId, make, model, year, licensePlate, vehicleType, color } = req.body || {};

    let targetDriverId = driverId;
    if (req.user) {
      const authDriver = await Driver.findOne({ userId: req.user._id });
      if (!authDriver) {
        return res.status(403).json({
          success: false,
          message: "Authenticated user must create a Driver profile before registering a vehicle.",
        });
      }

      if (
        driverId &&
        String(driverId) !== String(authDriver._id) &&
        String(driverId) !== String(req.user._id)
      ) {
        return res.status(403).json({
          success: false,
          message: "Cannot register a vehicle for another driver.",
        });
      }
      targetDriverId = driverId || authDriver._id;
    }

    if (!targetDriverId || !make || !model || !year || !licensePlate || !vehicleType) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required vehicle fields: driverId, make, model, year, licensePlate, and vehicleType.",
      });
    }

    const vehicle = await Vehicle.create({
      driverId: targetDriverId,
      make,
      model,
      year,
      licensePlate,
      vehicleType,
      color,
    });


    return res.status(201).json({
      success: true,
      message: "Vehicle registered successfully",
      data: vehicle,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A vehicle with this license plate is already registered.",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    next(error);
  }
};

export const getMyVehicle = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authorized.",
      });
    }

    const driver = await Driver.findOne({ userId: req.user._id });
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver profile is not linked.",
      });
    }

    const vehicles = await Vehicle.find({
      driverId: driver._id,
      isActive: true,
    });

    if (vehicles.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No active vehicle is registered.",
      });
    }

    if (vehicles.length > 1) {
      return res.status(409).json({
        success: false,
        message: "Multiple active vehicles found for driver. Active vehicle configuration is ambiguous.",
      });
    }

    return res.status(200).json({
      success: true,
      data: vehicles[0],
    });
  } catch (error) {
    next(error);
  }
};
