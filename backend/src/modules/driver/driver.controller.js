import Driver from "./driver.model.js";

export const createDriver = async (req, res, next) => {
  try {
    const { userId, licenseNumber, phone, emergencyContact } = req.body || {};

    let targetUserId = userId;
    if (req.user) {
      if (userId && String(userId) !== String(req.user._id)) {
        return res.status(403).json({
          success: false,
          message: "Cannot create a driver profile for another user.",
        });
      }
      targetUserId = req.user._id;
    }

    if (
      !targetUserId ||
      !licenseNumber ||
      !phone ||
      !emergencyContact ||
      !emergencyContact.name ||
      !emergencyContact.phone
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Please provide all required driver fields: userId, licenseNumber, phone, and emergencyContact (with name and phone).",
      });
    }

    const driver = await Driver.create({
      userId: targetUserId,
      licenseNumber,
      phone,
      emergencyContact,
    });


    return res.status(201).json({
      success: true,
      message: "Driver profile created successfully",
      data: driver,
    });
  } catch (error) {
    if (error.code === 11000) {
      if (error.keyPattern?.userId || error.message?.includes("userId")) {
        return res.status(409).json({
          success: false,
          message: "A driver profile for this user already exists.",
        });
      }

      if (
        error.keyPattern?.licenseNumber ||
        error.message?.includes("licenseNumber")
      ) {
        return res.status(409).json({
          success: false,
          message:
            "A driver profile with this license number is already registered.",
        });
      }

      return res.status(409).json({
        success: false,
        message: "A driver profile with these unique details already exists.",
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
