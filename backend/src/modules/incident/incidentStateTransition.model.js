import mongoose from "mongoose";

const EMERGENCY_STATES = [
  "STATE 0: NORMAL OPERATION",
  "STATE 1: ANOMALY DETECTION",
  "STATE 2: AI VERIFICATION",
  "STATE 3: COMMUNITY MOBILIZATION",
  "STATE 4A: COMMUNITY RESPONSE",
  "STATE 4B: AUTHORITY / EMERGENCY ESCALATION",
];

const incidentStateTransitionSchema = new mongoose.Schema(
  {
    incidentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Incident",
      required: true,
    },
    fromState: {
      type: String,
      required: true,
      enum: EMERGENCY_STATES,
    },
    toState: {
      type: String,
      required: true,
      enum: EMERGENCY_STATES,
    },
    timestamp: {
      type: Date,
      required: true,
    },
    reason: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model(
  "IncidentStateTransition",
  incidentStateTransitionSchema
);
