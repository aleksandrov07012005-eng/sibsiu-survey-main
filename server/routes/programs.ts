import { programsRepository } from "../repositories/programsRepository";
import { Router } from "express";
import { z } from "zod";
import { logger } from "../logger";
import { requireAuth } from "../middleware/auth";

const router = Router();

const createProgramSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  programName: z.string().min(1),
});

// GET /api/programs - list
router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = res.locals.user?.id;
    const items = await programsRepository.getAll(userId);
    res.json({ success: true, data: items });
  } catch (err) {
    logger.error("Error fetching programs", { err });
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// POST /api/programs - create
router.post("/", requireAuth, async (req, res) => {
  try {
    const parsed = createProgramSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ success: false, error: parsed.error.message });
    }
    const { code, name, programName } = parsed.data;
    const userId = res.locals.user?.id;
    const created = await programsRepository.create({
      code,
      name,
      program_name: programName,
      created_by: userId,
    });
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    logger.error("Error creating program", { err });
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// PUT /api/programs/:id - update
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id))
      return res.status(400).json({ success: false, error: "Invalid id" });
    const updates = req.body;
    const updated = await programsRepository.update(id, updates);
    if (!updated)
      return res.status(404).json({ success: false, error: "Not found" });
    res.json({ success: true, data: updated });
  } catch (err) {
    logger.error("Error updating program", { err });
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// DELETE /api/programs/:id
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id))
      return res.status(400).json({ success: false, error: "Invalid id" });
    const ok = await programsRepository.delete(id);
    if (!ok)
      return res.status(404).json({ success: false, error: "Not found" });
    res.json({ success: true, data: null });
  } catch (err) {
    logger.error("Error deleting program", { err });
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

export default router;
