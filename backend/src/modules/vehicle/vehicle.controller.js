import Vehicle from "./vehicle.model.js";

export const createVehicle = async (req, res, next) => {
  try {
    const { driverId, make, model, year, licensePlate, vehicleType, color } = req.body;

    if (!driverId || !make || !model || !year || !licensePlate || !vehicleType) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required vehicle fields: driverId, make, model, year, licensePlate, and vehicleType.",
      });
    }

    const vehicle = await Vehicle.create({
      driverId,
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
