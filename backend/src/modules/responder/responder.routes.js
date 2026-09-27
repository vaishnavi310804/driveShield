import express from "express";
import {
  createResponder,
  getResponders,
  getNearbyResponders,
} from "./responder.controller.js";

const router = express.Router();

router.post("/", createResponder);
router.get("/", getResponders);
router.get("/nearby", getNearbyResponders);

export default router;
