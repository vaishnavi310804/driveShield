import Responder from "./responder.model.js";

// Haversine distance formula in kilometers
const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 100) / 100;
};

export const createResponder = async (req, res, next) => {
  try {
    const { name, latitude, longitude, isActive, reputationScore } = req.body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid responder name.",
      });
    }

    if (latitude === undefined || latitude === null || typeof latitude !== "number" || isNaN(latitude)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid numeric latitude.",
      });
    }

    if (longitude === undefined || longitude === null || typeof longitude !== "number" || isNaN(longitude)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid numeric longitude.",
      });
    }

    const responder = await Responder.create({
      name: name.trim(),
      latitude,
      longitude,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      reputationScore: reputationScore !== undefined ? Number(reputationScore) : undefined,
    });

    return res.status(201).json({
      success: true,
      message: "Responder created successfully.",
      data: responder,
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

export const getResponders = async (req, res, next) => {
  try {
    const responders = await Responder.find().sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      count: responders.length,
      data: responders,
    });
  } catch (error) {
    next(error);
  }
};

export const getNearbyResponders = async (req, res, next) => {
  try {
    const { latitude, longitude } = req.query;

    if (latitude === undefined || latitude === null || latitude === "" || isNaN(Number(latitude))) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid numeric latitude query parameter.",
      });
    }

    if (longitude === undefined || longitude === null || longitude === "" || isNaN(Number(longitude))) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid numeric longitude query parameter.",
      });
    }

    const targetLat = Number(latitude);
    const targetLon = Number(longitude);

    const activeResponders = await Responder.find({ isActive: true });

    const results = activeResponders.map((responder) => {
      const obj = responder.toObject();
      const distanceKm = calculateDistanceKm(
        targetLat,
        targetLon,
        responder.latitude,
        responder.longitude
      );
      return {
        ...obj,
        distanceKm,
      };
    });

    results.sort((a, b) => a.distanceKm - b.distanceKm);

    return res.status(200).json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (error) {
    next(error);
  }
};
