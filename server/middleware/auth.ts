import { RequestHandler } from "express";
import { logger } from "../logger";
import {
  authRepository,
  SessionWithUser,
} from "../repositories/authRepository";
import { AuthUser } from "../../shared/types";
import { RequestHandler } from "express";

declare global {
  namespace Express {
    interface Locals {
      user?: AuthUser;
      session?: SessionWithUser;
    }
  }
}

export const attachSession: RequestHandler = async (req, res, next) => {
  try {
    const token = req.cookies?.["sid"];
    if (!token) return next();
    const session = await authRepository.getSessionByToken(token);
    if (!session) return next();
    res.locals.session = session;
    res.locals.user = session.user;
  } catch (error) {
    logger.warn("Failed to hydrate auth session", { error });
  }
  next();
};

export const requireAuth: RequestHandler = (req, res, next) => {
  if (!res.locals.user) {
    return res
      .status(401)
      .json({ success: false, error: "Authentication required" });
  }
  next();
};

export const requireAdmin: RequestHandler = (req, res, next) => {
  if (!res.locals.user || res.locals.user.role !== "admin") {
    return res
      .status(403)
      .json({ success: false, error: "User is not authorized" });
  }
  next();
};
