import express from "express";
import { calculateBaseline } from "./baseline.controller.js";

const router = express.Router();

router.post("/", calculateBaseline);

export default router;
