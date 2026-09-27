import mongoose from "mongoose";

const telemetrySchema = new mongoose.Schema(
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
        required: true,
      },
      longitude: {
        type: Number,
        required: true,
      },
      speed: {
        type: Number,
        required: true,
      },
      heading: {
        type: Number,
      },
    },
    motion: {
      accelX: {
        type: Number,
        required: true,
      },
      accelY: {
        type: Number,
        required: true,
      },
      accelZ: {
        type: Number,
        required: true,
      },
      gForce: {
        type: Number,
        required: true,
      },
      gyroX: {
        type: Number,
      },
      gyroY: {
        type: Number,
      },
      gyroZ: {
        type: Number,
      },
    },
    vehicleData: {
      speed: {
        type: Number,
        required: true,
      },
      rpm: {
        type: Number,
        required: true,
      },
      engineLoad: {
        type: Number,
      },
      throttle: {
        type: Number,
      },
      coolantTemp: {
        type: Number,
      },
      batteryVoltage: {
        type: Number,
      },
      diagnosticFaults: {
        type: Array,
        default: [],
      },
    },
    driverState: {
      perclos: {
        type: Number,
      },
      gazeDirection: {
        type: String,
      },
      headPose: {
        type: String,
      },
      attentionState: {
        type: String,
      },
    },
    deviceContext: {
      batteryLevel: {
        type: Number,
      },
      isCharging: {
        type: Boolean,
      },
      networkState: {
        type: String,
      },
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Telemetry", telemetrySchema);
