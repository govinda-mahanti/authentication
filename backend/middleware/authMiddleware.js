import jwt from "jsonwebtoken";
import User from "../models/UserModel.js";

const verifyUser = async (req, res, next) => {
  try {
    const sessionToken = req.cookies.token;

    if (!sessionToken) {
      return res.status(401).json({
        message: "Please log in to continue",
      });
    }

    const tokenData = jwt.verify(
      sessionToken,
      process.env.JWT_SECRET
    );

    const currentUser = await User.findById(tokenData.id);

    if (
      !currentUser ||
      currentUser.activeSessionId !== tokenData.sessionId
    ) {
      return res.status(401).json({
        message: "Your session is no longer active. Please log in again.",
      });
    }

    req.user = {
      id: tokenData.id,
      sessionId: tokenData.sessionId,
    };

    return next();
  } catch (err) {
    return res.status(401).json({
      message: "Your session is invalid or has expired",
    });
  }
};

export default verifyUser;
