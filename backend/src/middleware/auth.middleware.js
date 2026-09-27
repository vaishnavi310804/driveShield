import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Not authorized. No token provided.",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password").populate("roleId");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found.",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated.",
      });
    }

    if (decoded.sessionId) {
      const session = await Session.findOne({
        _id: decoded.sessionId,
        userId: decoded.id,
      });

      if (
        !session ||
        session.isRevoked ||
        (session.expiresAt && new Date(session.expiresAt) <= new Date())
      ) {
        return res.status(401).json({
          success: false,
          code: "SESSION_REVOKED",
          message: "Your session has been revoked. Please log in again.",
        });
      }

      const now = new Date();
      if (
        !session.lastActivityAt ||
        now.getTime() - new Date(session.lastActivityAt).getTime() > 5 * 60 * 1000
      ) {
        Session.findByIdAndUpdate(session._id, { lastActivityAt: now }).catch((err) =>
          console.error("Non-blocking lastActivityAt update error:", err)
        );
      }

      req.sessionId = decoded.sessionId;
      user.sessionId = decoded.sessionId;
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Protect Middleware Error:", error);
    return res.status(401).json({
      success: false,
      message: error.message || "Invalid or expired token.",
    });
  }
};