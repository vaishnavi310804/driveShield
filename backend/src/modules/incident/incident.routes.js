import express from "express";
import {
  triggerIncident,
  verifyIncident,
  mobilizeIncident,
  acceptIncidentByResponder,
  escalateIncident,
  getIncidentTimeline,
} from "./incident.controller.js";

const router = express.Router();

router.post("/trigger", triggerIncident);
router.post("/:id/verify", verifyIncident);
router.post("/:id/mobilize", mobilizeIncident);
router.post("/:id/responders/:responderId/accept", acceptIncidentByResponder);
router.post("/:id/escalate", escalateIncident);
router.get("/:id/timeline", getIncidentTimeline);

export default router;
