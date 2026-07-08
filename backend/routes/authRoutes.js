const express = require("express");
const router = express.Router();
const {
  register,
  login,
  refreshToken,
  getMe,
  logout,
  verifyEmail,
} = require("../controllers/authController");
const {
  registerValidation,
  loginValidation,
  validate,
} = require("../validators/authValidations");
const { protect } = require("../middleware/auth");
const { authLimiter } = require("../middleware/rateLimiter");

router.post("/register", registerValidation, validate, register);
// router.post("/login", authLimiter, loginValidation, validate, login);
router.post(
  "/login",
  (req, res, next) => {
    console.log("➡️ /login route hit");
    next();
  },
  authLimiter,
  loginValidation,
  validate,
  login,
);
router.post("/refresh-token", refreshToken);
router.get("/verify-email/:token", verifyEmail);
router.post("/logout", logout);
router.get("/me", protect, getMe);

module.exports = router;
