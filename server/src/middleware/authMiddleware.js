const express = require("express");

const {
  register,
  login,
} = require("../controllers/authController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);

router.get("/me", protect, (req, res) => {
  res.json({
    message: "You are authenticated!",
    user: req.user,
  });
});

module.exports = router;