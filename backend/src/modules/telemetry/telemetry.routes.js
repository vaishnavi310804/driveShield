import express from "express";
import { ingestTelemetry } from "./telemetry.controller.js";

const router = express.Router();

router.post("/", ingestTelemetry);

export default router;
