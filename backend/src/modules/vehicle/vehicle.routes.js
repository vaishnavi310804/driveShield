import express from "express";
import { createVehicle, getMyVehicle } from "./vehicle.controller.js";

const router = express.Router();

router.get("/me", getMyVehicle);
router.post("/", createVehicle);

export default router;
