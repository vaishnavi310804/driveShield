import mongoose from "mongoose";

const baselineSchema = new mongoose.Schema(
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
    driverBaseline: {
      avgSpeed: {
        type: Number,
      },
      avgBrakingGForce: {
        type: Number,
      },
      avgAccelerationGForce: {
        type: Number,
      },
      normalPerclos: {
        type: Number,
      },
    },
    vehicleBaseline: {
      avgRpm: {
        type: Number,
      },
      maxNormalGForce: {
        type: Number,
      },
      normalCoolantTemp: {
        type: Number,
      },
      normalBatteryVoltage: {
        type: Number,
      },
    },
    lastUpdated: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Baseline", baselineSchema);
