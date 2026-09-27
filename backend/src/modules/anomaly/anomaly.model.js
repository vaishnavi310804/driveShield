import mongoose from "mongoose";

const anomalyEventSchema = new mongoose.Schema(
  {
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      required: true,
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    deviationScore: {
      type: Number,
    },
    anomalyConfidence: {
      type: Number,
    },
    context: {
      type: Object,
    },
    timestamp: {
      type: Date,
      required: true,
    },
    escalationFlag: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("AnomalyEvent", anomalyEventSchema);
