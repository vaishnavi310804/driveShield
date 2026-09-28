import express from "express";
import { calculateBaseline, getBaseline } from "./baseline.controller.js";

const router = express.Router();

router.get("/", getBaseline);
router.post("/", calculateBaseline);

export default router;
