import express from "express";
import {
  triggerIncident,
  verifyIncident,
  mobilizeIncident,
  acceptIncidentByResponder,
  responderUnableToAssist,
  escalateIncident,
  getIncidentTimeline,
  getIncidents,
} from "./incident.controller.js";

const router = express.Router();

router.get("/", getIncidents);
router.post("/trigger", triggerIncident);
router.post("/:id/verify", verifyIncident);
router.post("/:id/mobilize", mobilizeIncident);
router.post("/:id/responders/:responderId/accept", acceptIncidentByResponder);
router.post("/:id/responders/:responderId/unable", responderUnableToAssist);
router.post("/:id/escalate", escalateIncident);
router.get("/:id/timeline", getIncidentTimeline);

export default router;

