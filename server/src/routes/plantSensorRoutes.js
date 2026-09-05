const express = require("express");
const protect = require("../middleware/authMiddleware");

const {
  addReading,
  getPlantReadings,
  getLatestReading,
  getHistoricalReadings,
} = require("../controllers/plantSensorController");

const router = express.Router();

// All sensor routes are protected
router.use(protect);

router.post("/readings", addReading);
router.get("/readings/:plantId", getPlantReadings);
router.get("/readings/:plantId/latest", getLatestReading);
router.get("/readings/:plantId/history", getHistoricalReadings);

module.exports = router;
