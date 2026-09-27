import express from "express";
import { createVehicle } from "./vehicle.controller.js";

const router = express.Router();

router.post("/", createVehicle);

export default router;
