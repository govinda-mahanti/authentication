import crypto from "crypto";
import jwt from "jsonwebtoken";
import User from "../models/UserModel.js";
import sendOTP from "../utils/sendOtp.js";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";

const generateOTP = () => {
  const otp = crypto.randomInt(100_000, 1_000_000);
  return String(otp);
};

const hashOTP = (otp) => {
  const hmac = crypto.createHmac("sha256", process.env.OTP_SECRET);
  hmac.update(otp);
  return hmac.digest("hex");
};
const issueSession = (user, res) => {
  const sessionId = crypto.randomUUID();

  user.activeSessionId = sessionId;
  user.failedAttempts = 0;
  user.lockedUntil = null;

  const payload = {
    id: user._id.toString(),
    sessionId: sessionId,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };

  res.cookie("token", token, cookieOptions);
};

// SIGNUP
export const signup = async (req, res) => {
  try {
    const { email, phone, dob, surname } = req.body;

    if ((!email && !phone) || !dob || !surname) {
      return res.status(400).json({
        message: "All required fields must be provided",
      });
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        message: "Invalid email address",
      });
    }

    if (phone && /^\+?[1-9]\d{7,14}$/.test(phone) === false) {
      return res.status(400).json({
        message: "Use phone number with country code",
      });
    }

    const birthDate = new Date(dob);

    if (Number.isNaN(birthDate.getTime()) || birthDate >= new Date()) {
      return res.status(400).json({
        message: "Enter a valid date of birth",
      });
    }

    const conditions = [];

    if (email) {
      conditions.push({ email: email.toLowerCase() });
    }

    if (phone) {
      conditions.push({ phone });
    }

    const existingUser = await User.findOne({
      $or: conditions,
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Account already exists",
      });
    }

    const newUser = await User.create({
      email: email ? email.toLowerCase() : undefined,
      phone,
      dob: birthDate,
      surname: surname.trim(),
    });

    return res.status(201).json({
      message: "Registration successful. Please login.",
      userId: newUser._id,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

// REQ OTP
export const sendLoginOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (typeof email !== "string" || !email.trim()) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const emailAddress = email.trim().toLowerCase();
    const user = await User.findOne({ email: emailAddress });

    if (!user) {
      return res.status(404).json({
        message: "Account not found",
      });
    }

    const currentTime = new Date();

    if (user.lockedUntil && user.lockedUntil > currentTime) {
      return res.status(423).json({
        message: "Account locked. Try again later.",
        lockedUntil: user.lockedUntil,
      });
    }

    const otp = generateOTP();

    user.otpHash = hashOTP(otp);
    user.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await user.save();

    if (!user.email) {
      return res.status(501).json({
        message: "SMS provider not configured yet",
      });
    }

    await sendOTP(user.email, otp);

    return res.json({
      message: "OTP sent successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

// VERIFY OTP
export const confirmLoginOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (typeof email !== "string" || !email.trim() || !otp) {
      return res.status(400).json({
        message: "Email and OTP are required",
      });
    }

    const emailAddress = email.trim().toLowerCase();
    const user = await User.findOne({ email: emailAddress });

    if (!user) {
      return res.status(404).json({
        message: "Account not found",
      });
    }

    const now = new Date();

    if (user.lockedUntil && user.lockedUntil > now) {
      return res.status(423).json({
        message: "Account locked for one hour",
        lockedUntil: user.lockedUntil,
      });
    }

    if (user.lockedUntil && user.lockedUntil <= now) {
      user.lockedUntil = null;
      user.failedAttempts = 0;
    }

    const otpMatches =
      /^\d{6}$/.test(String(otp)) &&
      user.otpHash &&
      user.otpExpiresAt > now &&
      hashOTP(String(otp)) === user.otpHash;

    if (!otpMatches) {
      user.failedAttempts += 1;

      if (user.failedAttempts >= 5) {
        user.lockedUntil = new Date(Date.now() + 60 * 60 * 1000);
      }

      await user.save();

      return res.status(401).json({
        message: user.lockedUntil
          ? "Too many attempts. Account locked for 1 hour."
          : "Invalid or expired OTP",
        attemptsRemaining: Math.max(0, 5 - user.failedAttempts),
      });
    }

    // Clear OTP after successful verification
    user.otpHash = undefined;
    user.otpExpiresAt = undefined;

    // Create a session for the authenticated user
    issueSession(user, res);

    await user.save();

    return res.json({
      message: "Login successful",
      user: {
        id: user._id,
        surname: user.surname,
        email: user.email,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

// LOGOUT
export const logout = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);

    if (
      currentUser &&
      currentUser.activeSessionId === req.user.sessionId
    ) {
      currentUser.activeSessionId = null;
      await currentUser.save();
    }

    res.clearCookie("token");

    return res.json({
      message: "Logged out successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

// GET CURRENT USER
export const fetchCurrentUser = async (req, res) => {
  const currentUser = await User.findById(req.user.id).select(
    "-otpHash -otpExpiresAt -credentials -currentChallenge"
  );

  return res.json({
    user: currentUser,
  });
};

// GENERATE PASSKEY REGISTRATION OPTIONS
export const createPasskeySetupOptions = async (req, res) => {
  const rpID = process.env.RP_ID;
  const currentUser = await User.findById(req.user.id);

  const registrationOptions = await generateRegistrationOptions({
    rpName: process.env.RP_NAME,
    rpID,
    userID: Buffer.from(currentUser._id.toString()),
    userName: currentUser.email || currentUser.phone,
    attestationType: "none",
    excludeCredentials: currentUser.credentials.map((item) => ({
      id: item.credentialID,
      transports: item.transports,
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "required",
    },
  });

  currentUser.currentChallenge = registrationOptions.challenge;
  await currentUser.save();

  return res.json(registrationOptions);
};

// VERIFY PASSKEY REGISTRATION
export const savePasskeyCredential = async (req, res) => {
  const rpID = process.env.RP_ID;
  const currentUser = await User.findById(req.user.id);

  const result = await verifyRegistrationResponse({
    response: req.body,
    expectedChallenge: currentUser.currentChallenge,
    expectedOrigin: process.env.ORIGIN,
    expectedRPID: rpID,
  });

  if (!result.verified) {
    return res.status(400).json({
      message: "Biometric registration failed",
    });
  }

  const savedCredential = result.registrationInfo.credential;

  currentUser.credentials.push({
    credentialID: savedCredential.id,
    credentialPublicKey: Buffer.from(
      savedCredential.publicKey
    ).toString("base64url"),
    counter: savedCredential.counter,
    transports: savedCredential.transports || [],
  });

  currentUser.currentChallenge = undefined;

  await currentUser.save();

  return res.json({
    message: "Biometric authentication registered successfully",
  });
};

// GENERATE PASSKEY LOGIN OPTIONS
export const createPasskeyLoginOptions = async (req, res) => {
  const rpID = process.env.RP_ID;
  const { email } = req.body;

  const loginId = email.includes("@") ? email.toLowerCase() : email;

  const user = await User.findOne({
    $or: [{ email: loginId }, { phone: loginId }],
  });

  if (!user || user.credentials.length === 0) {
    return res.status(404).json({
      message: "No registered passkey found",
    });
  }

  const currentTime = new Date();

  if (user.lockedUntil && user.lockedUntil > currentTime) {
    return res.status(423).json({
      message: "Account locked for one hour",
    });
  }

  const loginOptions = await generateAuthenticationOptions({
    rpID,
    allowCredentials: user.credentials.map((item) => ({
      id: item.credentialID,
      transports: item.transports,
    })),
    userVerification: "required",
  });

  user.currentChallenge = loginOptions.challenge;
  await user.save();

  return res.json(loginOptions);
};

// VERIFY PASSKEY LOGIN

export const authenticateWithPasskey = async (req, res) => {
  const rpID = process.env.RP_ID;
  const { email, credential } = req.body;

  const loginId = email.includes("@") ? email.toLowerCase() : email;

  const user = await User.findOne({
    $or: [{ email: loginId }, { phone: loginId }],
  });

  if (!user) {
    return res.status(401).json({
      message: "Authentication failed",
    });
  }

  const currentTime = new Date();

  if (user.lockedUntil && user.lockedUntil > currentTime) {
    return res.status(423).json({
      message: "Account locked for one hour",
    });
  }

  const savedCredential = user.credentials.find(
    (item) => item.credentialID === credential.id
  );

  // if (!savedCredential || !user.currentChallenge) {
  //   return res.status(401).json({
  //     message: "Invalid biometric credential",
  //   });
  // }

  if (!savedCredential) {
  console.log("Passkey error: Credential not found");
  return res.status(401).json({
    message: "Credential not found",
  });
}

if (!user.currentChallenge) {
  console.log("Passkey error: Challenge missing");
  return res.status(401).json({
    message: "Challenge missing",
  });
}

  try {
    const result = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge: user.currentChallenge,
      expectedOrigin: process.env.ORIGIN,
      expectedRPID: [rpID],
      credential: {
        id: savedCredential.credentialID,
        publicKey: Buffer.from(
          savedCredential.credentialPublicKey,
          "base64url"
        ),
        counter: savedCredential.counter,
        transports: savedCredential.transports,
      },
    });

    if (!result.verified) {
      throw new Error("Verification failed");
    }

    savedCredential.counter = result.authenticationInfo.newCounter;
    user.currentChallenge = undefined;

    issueSession(user, res);
    await user.save();

    return res.json({
      message: "Biometric login successful",
    });
  } catch (error) {
  console.error("Passkey verification error:", error.message);

  user.currentChallenge = undefined;
  await user.save();

  return res.status(401).json({
    message: "Passkey verification failed",
  });
}
};