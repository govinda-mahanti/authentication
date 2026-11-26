
import express from "express";

import {
  signup,
  sendLoginOTP,
  confirmLoginOTP,
  logout,
  fetchCurrentUser,
  createPasskeySetupOptions,
  savePasskeyCredential,
  createPasskeyLoginOptions,
  authenticateWithPasskey,
} from "../controllers/authController.js";

import verifyUser from "../middleware/authMiddleware.js";

const router = express.Router();

// Account
router.post("/signup", signup);

// OTP verification
router.post("/otp/send", sendLoginOTP);
router.post("/otp/verify", confirmLoginOTP);

// User session
router.post("/session/logout", verifyUser, logout);
router.get("/session", verifyUser, fetchCurrentUser);

// Passkey registration
router.post(
  "/passkeys/register/options",
  verifyUser,
  createPasskeySetupOptions
);

router.post(
  "/passkeys/register/verify",
  verifyUser,
  savePasskeyCredential
);

// Passkey login
router.post("/passkeys/login/options", createPasskeyLoginOptions);
router.post("/passkeys/login/verify", authenticateWithPasskey);

export default router;
