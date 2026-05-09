import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { ApiResponse } from "../../shared/types";
import { authRepository } from "../repositories/authRepository";
import { requireAuth, requireAdmin } from "../middleware/auth";

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(4),
});

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(4),
  full_name: z.string().optional(),
  role: z.string().optional(),
});

const passwordSchema = z.object({
  password: z.string().min(4),
});

const sanitizeUser = (user: any) => ({
  id: user.id,
  email: user.email,
  full_name: user.full_name,
  role: user.role,
  is_active: user.is_active,
  created_at: user.created_at,
  updated_at: user.updated_at,
});

const ONE_HOUR_MS = 60 * 60 * 1000;

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ success: false, error: parsed.error.message });
  }
  const result = await authRepository.getUserWithPasswordByEmail(
    parsed.data.email,
  );
  if (!result?.user || !result.user.is_active) {
    return res
      .status(401)
      .json({ success: false, error: "Invalid credentials" });
  }
  const isMatch = await bcrypt.compare(
    parsed.data.password,
    result.password_hash,
  );
  if (!isMatch) {
    return res
      .status(401)
      .json({ success: false, error: "Invalid credentials" });
  }

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + ONE_HOUR_MS);

  await authRepository.deleteSessionsForUser(result.user.id);
  await authRepository.createSession(result.user.id, token, expiresAt);

  res.cookie("sid", token, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    maxAge: ONE_HOUR_MS,
  });

  const response: ApiResponse<{
    user: ReturnType<typeof sanitizeUser>;
    expires_at: Date;
  }> = {
    success: true,
    data: {
      user: sanitizeUser(result.user),
      expires_at: expiresAt,
    },
  };
  res.json(response);
});

router.post("/logout", requireAuth, async (req, res) => {
  const token = req.cookies?.["sid"];
  if (token) {
    await authRepository.deleteSession(token);
  }
  res.clearCookie("sid", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });
  res.json({ success: true });
});

router.get("/session", requireAuth, (req, res) => {
  const user = res.locals.user;
  if (!user) {
    return res.status(401).json({ success: false, error: "Not authenticated" });
  }
  res.json({ success: true, data: sanitizeUser(user) });
});

router.post("/users", requireAuth, requireAdmin, async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ success: false, error: parsed.error.message });
  }
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const created = await authRepository.createUser({
    email: parsed.data.email,
    full_name: parsed.data.full_name,
    password_hash: passwordHash,
    role: parsed.data.role,
  });
  res.status(201).json({ success: true, data: sanitizeUser(created) });
});

router.get("/users", requireAuth, requireAdmin, async (req, res) => {
  const users = await authRepository.listUsers();
  res.json({ success: true, data: users.map(sanitizeUser) });
});

router.put("/users/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ success: false, error: "Invalid user id" });
  }
  const updates: Partial<{
    full_name: string;
    role: string;
    is_active: boolean;
  }> = req.body;
  const updated = await authRepository.updateUser(id, updates);
  if (!updated) {
    return res.status(404).json({ success: false, error: "User not found" });
  }
  res.json({ success: true, data: sanitizeUser(updated) });
});

router.put("/users/:id/password", requireAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ success: false, error: "Invalid user id" });
  }
  const requester = res.locals.user;
  if (!requester) {
    return res
      .status(401)
      .json({ success: false, error: "Authentication required" });
  }

  if (requester.role !== "admin" && requester.id !== id) {
    return res
      .status(403)
      .json({ success: false, error: "Not allowed to change this password" });
  }

  const parsed = passwordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ success: false, error: parsed.error.message });
  }
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const updated = await authRepository.updatePassword(id, passwordHash);
  if (!updated) {
    return res.status(404).json({ success: false, error: "User not found" });
  }
  res.json({ success: true, data: sanitizeUser(updated) });
});

router.post("/password-reset", async (req, res) => {
  const parsed = z.object({ email: z.string().email() }).safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ success: false, error: parsed.error.message });
  }
  const user = await authRepository.getUserByEmail(parsed.data.email);
  if (!user) {
    return res.json({ success: true });
  }

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + ONE_HOUR_MS);
  await authRepository.createPasswordResetToken(user.id, token, expiresAt);

  res.json({
    success: true,
    data: {
      token,
      expires_at: expiresAt,
    },
  });
});

router.post("/password-reset/:token", async (req, res) => {
  const parsed = passwordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ success: false, error: parsed.error.message });
  }
  const entry = await authRepository.findPasswordResetToken(req.params.token);
  if (!entry || entry.used || entry.expires_at <= new Date()) {
    return res
      .status(400)
      .json({ success: false, error: "Invalid or expired token" });
  }
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await authRepository.updatePassword(entry.user_id, passwordHash);
  await authRepository.markPasswordTokenUsed(entry.id);
  res.json({ success: true });
});

export default router;
