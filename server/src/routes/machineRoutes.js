const express = require("express");

const protect = require("../middleware/authMiddleware");

const {
  createMachine,
  getMachines,
  getMachine,
  updateMachine,
  deleteMachine,
} = require("../controllers/machineController");

const router = express.Router();

// All machine routes are protected
router.use(protect);

router.post("/", createMachine);

router.get("/", getMachines);

router.get("/:id", getMachine);

router.put("/:id", updateMachine);

router.delete("/:id", deleteMachine);

module.exports = router;