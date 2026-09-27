import mongoose from "mongoose";

const responderActionSchema = new mongoose.Schema(
  {
    incidentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Incident",
      required: true,
    },
    responderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Responder",
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: ["ACCEPTED", "ENROUTE", "UNABLE_TO_ASSIST"],
    },
    reason: {
      type: String,
      required: false,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("ResponderAction", responderActionSchema);
