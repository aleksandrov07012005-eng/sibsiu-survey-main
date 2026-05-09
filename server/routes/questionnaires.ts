import { Router } from "express";
import { questionnairesRepository } from "../repositories/questionnairesRepository";
import { ApiResponse } from "../../shared/types";
import { logger } from "../logger";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

// Helper to extract error message from various error types
function getErrorMessage(error: any): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object") {
    if (error.message) return error.message;
    if (error.msg) return error.msg;
    if (error.error_description) return error.error_description;
    if (error.hint) return error.hint;
  }
  return "Internal server error";
}

// GET /api/questionnaires - Получить все анкеты
router.get("/", async (req, res) => {
  try {
    const userId = res.locals.user?.id;
    const questionnaires =
      await questionnairesRepository.getAllQuestionnaires(userId);

    const response: ApiResponse<typeof questionnaires> = {
      success: true,
      data: questionnaires,
    };

    res.json(response);
  } catch (error) {
    logger.error("Error fetching questionnaires", { error });
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// GET /api/questionnaires/:id - Получить ��нкету с деталями
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid questionnaire ID",
      });
    }

    const questionnaire =
      await questionnairesRepository.getQuestionnaireWithDetails(id);

    if (!questionnaire) {
      return res.status(404).json({
        success: false,
        error: "Questionnaire not found",
      });
    }

    const response: ApiResponse<typeof questionnaire> = {
      success: true,
      data: questionnaire,
    };

    res.json(response);
  } catch (error) {
    logger.error("Error fetching questionnaire", { error });
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// POST /api/questionnaires - Создать анкету (включая вопросы и варианты)
router.post("/", async (req, res) => {
  try {
    const payload = req.body;
    const userId = res.locals.user?.id;
    logger.info("Create questionnaire payload", {
      title: payload?.title,
      questionsCount: payload?.questions?.length || 0,
      payload: JSON.stringify(payload),
    });

    if (!payload || !payload.title) {
      return res.status(400).json({ success: false, error: "Missing title" });
    }

    payload.created_by = userId;

    const created =
      await questionnairesRepository.createQuestionnaireWithDetails(payload);
    res.json({ success: true, data: created });
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    logger.error("Error creating questionnaire", {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      fullError: JSON.stringify(error),
    });
    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

// PUT /api/questionnaires/:id - Обновить анкету и вопросы
router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id))
      return res.status(400).json({ success: false, error: "Invalid id" });

    const payload = req.body;
    logger.info("Update questionnaire payload", {
      id,
      title: payload?.title,
      questionsCount: payload?.questions?.length || 0,
    });

    const updated =
      await questionnairesRepository.updateQuestionnaireWithDetails(
        id,
        payload,
      );
    if (!updated)
      return res.status(404).json({ success: false, error: "Not found" });

    res.json({ success: true, data: updated });
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    logger.error("Error updating questionnaire", {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      fullError: JSON.stringify(error),
    });
    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

// DELETE /api/questionnaires/:id - Удалить анкету
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id))
      return res.status(400).json({ success: false, error: "Invalid id" });

    await questionnairesRepository.deleteQuestionnaire(id);
    res.json({ success: true });
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    logger.error("Error deleting questionnaire", {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      fullError: JSON.stringify(error),
    });
    res.status(500).json({ success: false, error: errorMessage });
  }
});

export default router;
