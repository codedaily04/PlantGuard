const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const machineRoutes = require("./routes/machineRoutes");
const factoryRoutes = require("./routes/factoryRoutes");
const sensorRoutes = require("./routes/sensorRoutes");
const plantRoutes = require("./routes/plantRoutes");
const aiRoutes = require("./routes/aiRoutes");
const simulationRoutes = require("./routes/simulationRoutes");
const app = express();

// Enable CORS for frontend
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "PlantGuard API is running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/machines", machineRoutes);
app.use("/api/factories", factoryRoutes);
app.use("/api/sensors", sensorRoutes);
app.use("/api/plants", plantRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/simulation", simulationRoutes);
module.exports = app;