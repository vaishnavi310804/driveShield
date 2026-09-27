import mongoose from "mongoose";

const notificationEventSchema = new mongoose.Schema(
  {
    incidentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Incident",
      required: true,
    },
    recipientType: {
      type: String,
      required: true,
      enum: ["AUTHORITY", "EMERGENCY_CONTACT"],
    },
    recipientDetail: {
      type: String,
      required: true,
    },
    payload: {
      type: Object,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["SENT", "DELIVERED"],
      default: "SENT",
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("NotificationEvent", notificationEventSchema);
