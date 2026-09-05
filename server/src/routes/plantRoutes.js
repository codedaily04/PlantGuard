const express = require("express");
const protect = require("../middleware/authMiddleware");

const {
  createPlant,
  getPlants,
  getPlant,
  updatePlant,
  deletePlant,
} = require("../controllers/plantController");

const router = express.Router();

// All plant routes are protected
router.use(protect);

router.post("/", createPlant);
router.get("/", getPlants);
router.get("/:id", getPlant);
router.put("/:id", updatePlant);
router.delete("/:id", deletePlant);

module.exports = router;
