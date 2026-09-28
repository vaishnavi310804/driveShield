import express from "express";
import db from "./src/config/db.js";
import cors from "cors";
import errorHandler from "./src/middleware/error.middleware.js";
import vehicleRoutes from "./src/modules/vehicle/vehicle.routes.js";
import driverRoutes from "./src/modules/driver/driver.routes.js";
import telemetryRoutes from "./src/modules/telemetry/telemetry.routes.js";
import baselineRoutes from "./src/modules/baseline/baseline.routes.js";
import anomalyRoutes from "./src/modules/anomaly/anomaly.routes.js";
import incidentRoutes from "./src/modules/incident/incident.routes.js";
import responderRoutes from "./src/modules/responder/responder.routes.js";
import authRoutes from "./src/modules/auth/auth.routes.js";
import { protect } from "./src/middleware/auth.middleware.js";

const app = express();

await db();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("API running");
});

app.use("/api/auth", authRoutes);
app.use("/api/vehicles", protect, vehicleRoutes);
app.use("/api/drivers", protect, driverRoutes);
app.use("/api/telemetry", protect, telemetryRoutes);
app.use("/api/baselines", protect, baselineRoutes);
app.use("/api/anomalies", protect, anomalyRoutes);
app.use("/api/incidents", protect, incidentRoutes);
app.use("/api/responders", protect, responderRoutes);



app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;