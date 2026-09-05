const express = require("express");

const protect = require("../middleware/authMiddleware");

const {
  addReading,
  getMachineReadings,
} = require("../controllers/sensorController");

const router = express.Router();

router.use(protect);

router.post("/", addReading);

router.get(
  "/machine/:machineId",
  getMachineReadings
);

module.exports = router;