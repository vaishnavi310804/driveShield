import mongoose from "mongoose";

const EMERGENCY_STATES = [
  "STATE 0: NORMAL OPERATION",
  "STATE 1: ANOMALY DETECTION",
  "STATE 2: AI VERIFICATION",
  "STATE 3: COMMUNITY MOBILIZATION",
  "STATE 4A: COMMUNITY RESPONSE",
  "STATE 4B: AUTHORITY / EMERGENCY ESCALATION",
];

const incidentSchema = new mongoose.Schema(
  {
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
    },
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      required: true,
    },
    timestamp: {
      type: Date,
      required: true,
    },
    location: {
      latitude: {
        type: Number,
      },
      longitude: {
        type: Number,
      },
      speed: {
        type: Number,
      },
      heading: {
        type: Number,
      },
    },
    severity: {
      type: String,
    },
    latestTelemetry: {
      type: Object,
    },
    driverStateAssessment: {
      type: String,
      enum: ["RESPONSIVE", "IMPAIRED", "UNRESPONSIVE"],
    },
    communityResponseStatus: {
      type: String,
    },
    currentState: {
      type: String,
      required: true,
      enum: EMERGENCY_STATES,
      default: "STATE 0: NORMAL OPERATION",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Incident", incidentSchema);
