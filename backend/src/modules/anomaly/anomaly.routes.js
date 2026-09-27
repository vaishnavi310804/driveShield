import express from "express";
import { evaluateAnomaly } from "./anomaly.controller.js";

const router = express.Router();

router.post("/", evaluateAnomaly);

export default router;
