import { Router } from "express";
import { accessRepository } from "../repositories/accessRepository";
import { authRepository } from "../repositories/authRepository";
import { questionnairesRepository } from "../repositories/questionnairesRepository";
import { surveysRepository } from "../repositories/surveysRepository";
import { programsRepository } from "../repositories/programsRepository";
import { requireAuth } from "../middleware/auth";
import { logger } from "../logger";
import { ApiResponse } from "@shared/types";

const router = Router();
router.use(requireAuth);

// GET /api/access/questionnaires/:id/users - Get users with access to a questionnaire
router.get("/questionnaires/:id/users", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid questionnaire ID" });
    }

    const userIds = await accessRepository.getQuestionnaireAccessUsers(id);
    const response: ApiResponse<number[]> = {
      success: true,
      data: userIds,
    };

    res.json(response);
  } catch (error) {
    logger.error("Error fetching questionnaire access", { error });
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// GET /api/access/surveys/:id/users - Get users with access to a survey
router.get("/surveys/:id/users", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid survey ID" });
    }

    const userIds = await accessRepository.getSurveyAccessUsers(id);
    const response: ApiResponse<number[]> = {
      success: true,
      data: userIds,
    };

    res.json(response);
  } catch (error) {
    logger.error("Error fetching survey access", { error });
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// POST /api/access/questionnaires/:id/grant - Grant access to a user
router.post("/questionnaires/:id/grant", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { user_id } = req.body;

    if (isNaN(id) || !user_id) {
      return res.status(400).json({ success: false, error: "Invalid input" });
    }

    // Validate questionnaire exists
    const questionnaire =
      await questionnairesRepository.getQuestionnaireWithDetails(id);
    if (!questionnaire) {
      return res
        .status(404)
        .json({ success: false, error: "Questionnaire not found" });
    }

    await accessRepository.grantQuestionnaireAccess(id, user_id);

    const response: ApiResponse<null> = {
      success: true,
      data: null,
    };

    res.json(response);
  } catch (error) {
    logger.error("Error granting questionnaire access", { error });
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    res.status(400).json({ success: false, error: errorMessage });
  }
});

// POST /api/access/surveys/:id/grant - Grant access to a user
router.post("/surveys/:id/grant", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { user_id } = req.body;

    if (isNaN(id) || !user_id) {
      return res.status(400).json({ success: false, error: "Invalid input" });
    }

    // Validate survey exists
    const survey = await surveysRepository.getSurveyById(id);
    if (!survey) {
      return res
        .status(404)
        .json({ success: false, error: "Survey not found" });
    }

    await accessRepository.grantSurveyAccess(id, user_id);

    const response: ApiResponse<null> = {
      success: true,
      data: null,
    };

    res.json(response);
  } catch (error) {
    logger.error("Error granting survey access", { error });
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    res.status(400).json({ success: false, error: errorMessage });
  }
});

// DELETE /api/access/questionnaires/:id/revoke - Revoke access from a user
router.delete("/questionnaires/:id/revoke", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { user_id } = req.body;
    const currentUserId = res.locals.user?.id;

    if (isNaN(id) || !user_id) {
      return res.status(400).json({ success: false, error: "Invalid input" });
    }

    // Prevent user from revoking their own access
    if (user_id === currentUserId) {
      return res.status(400).json({
        success: false,
        error: "Вы не можете отозвать доступ у себя",
      });
    }

    await accessRepository.revokeQuestionnaireAccess(id, user_id);

    const response: ApiResponse<null> = {
      success: true,
      data: null,
    };

    res.json(response);
  } catch (error) {
    logger.error("Error revoking questionnaire access", { error });
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// DELETE /api/access/surveys/:id/revoke - Revoke access from a user
router.delete("/surveys/:id/revoke", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { user_id } = req.body;
    const currentUserId = res.locals.user?.id;

    if (isNaN(id) || !user_id) {
      return res.status(400).json({ success: false, error: "Invalid input" });
    }

    // Prevent user from revoking their own access
    if (user_id === currentUserId) {
      return res.status(400).json({
        success: false,
        error: "Вы не можете отозвать доступ у себя",
      });
    }

    await accessRepository.revokeSurveyAccess(id, user_id);

    const response: ApiResponse<null> = {
      success: true,
      data: null,
    };

    res.json(response);
  } catch (error) {
    logger.error("Error revoking survey access", { error });
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// GET /api/access/programs/:id/users - Get users with access to a program
router.get("/programs/:id/users", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid program ID" });
    }

    const userIds = await accessRepository.getProgramAccessUsers(id);
    const response: ApiResponse<number[]> = {
      success: true,
      data: userIds,
    };

    res.json(response);
  } catch (error) {
    logger.error("Error fetching program access", { error });
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// POST /api/access/programs/:id/grant - Grant access to a user
router.post("/programs/:id/grant", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { user_id } = req.body;

    if (isNaN(id) || !user_id) {
      return res.status(400).json({ success: false, error: "Invalid input" });
    }

    // Validate program exists
    const program = await programsRepository.getOne(id);
    if (!program) {
      return res
        .status(404)
        .json({ success: false, error: "Program not found" });
    }

    await accessRepository.grantProgramAccess(id, user_id);

    const response: ApiResponse<null> = {
      success: true,
      data: null,
    };

    res.json(response);
  } catch (error) {
    logger.error("Error granting program access", { error });
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    res.status(400).json({ success: false, error: errorMessage });
  }
});

// DELETE /api/access/programs/:id/revoke - Revoke access from a user
router.delete("/programs/:id/revoke", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { user_id } = req.body;
    const currentUserId = res.locals.user?.id;

    if (isNaN(id) || !user_id) {
      return res.status(400).json({ success: false, error: "Invalid input" });
    }

    // Prevent user from revoking their own access
    if (user_id === currentUserId) {
      return res.status(400).json({
        success: false,
        error: "Вы не можете отозвать доступ у себя",
      });
    }

    await accessRepository.revokeProgramAccess(id, user_id);

    const response: ApiResponse<null> = {
      success: true,
      data: null,
    };

    res.json(response);
  } catch (error) {
    logger.error("Error revoking program access", { error });
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

export default router;
