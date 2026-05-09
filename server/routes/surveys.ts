import { Router } from "express";
import { surveysRepository } from "../repositories/surveysRepository";
import { ApiResponse } from "@shared/types";
import { z } from "zod";
import { logger } from "../logger";
import { requireAuth } from "../middleware/auth";

const router = Router();

const createSurveySchema = z.object({
  questionnaire_id: z.union([z.number().int(), z.null()]).optional(),
  title: z.string().min(1),
  is_active: z.boolean().optional(),
  start_date: z.union([z.string().datetime().optional(), z.null()]).optional(),
  end_date: z.union([z.string().datetime().optional(), z.null()]).optional(),
  unique_link: z.string().optional(),
  created_by: z.number().int().optional(),
});

router.get("/home", requireAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const userId = res.locals.user?.id;
    const status = (req.query.status as string) || "active";

    const programIds = Array.isArray(req.query.programIds)
      ? (req.query.programIds as string[]).map(Number).filter(Boolean)
      : req.query.programIds
        ? [Number(req.query.programIds)]
        : [];

    const questionnaireIds = Array.isArray(req.query.questionnaireIds)
      ? (req.query.questionnaireIds as string[]).map(Number).filter(Boolean)
      : req.query.questionnaireIds
        ? [Number(req.query.questionnaireIds)]
        : [];

    const creatorIds = Array.isArray(req.query.creatorIds)
      ? (req.query.creatorIds as string[]).map(Number).filter(Boolean)
      : req.query.creatorIds
        ? [Number(req.query.creatorIds)]
        : [];

    const groupId = req.query.groupId ? Number(req.query.groupId) : undefined;
    const creationDateFrom = req.query.creationDateFrom
      ? (req.query.creationDateFrom as string)
      : undefined;
    const creationDateTo = req.query.creationDateTo
      ? (req.query.creationDateTo as string)
      : undefined;

    const result = await surveysRepository.getSurveysForHome(
      page,
      limit,
      userId,
      status,
      programIds,
      questionnaireIds,
      creatorIds,
      groupId,
      creationDateFrom,
      creationDateTo,
    );

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
    };

    res.json(response);
  } catch (error) {
    logger.error("Error fetching surveys for home", { error });
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

router.get("/available-groups", requireAuth, async (req, res) => {
  try {
    const userId = res.locals.user?.id;
    const groups = await surveysRepository.getAvailableGroupsForUser(userId);
    res.json({ success: true, data: groups });
  } catch (error) {
    logger.error("Error fetching available groups", { error });
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid survey ID" });
    }

    const survey = await surveysRepository.getSurveyById(id);
    if (!survey) {
      return res
        .status(404)
        .json({ success: false, error: "Survey not found" });
    }

    const response: ApiResponse<typeof survey> = {
      success: true,
      data: survey,
    };
    res.json(response);
  } catch (error) {
    logger.error("Error fetching survey", { error });
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const parsed = createSurveySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.message,
      });
    }

    const surveyData = parsed.data as any;

    const newSurvey = await surveysRepository.createSurvey(surveyData);

    const response: ApiResponse<typeof newSurvey> = {
      success: true,
      data: newSurvey,
    };

    res.status(201).json(response);
  } catch (error) {
    logger.error("Error creating survey", { error });
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid survey ID",
      });
    }

    const surveyData = req.body;
    const updatedSurvey = await surveysRepository.updateSurvey(id, surveyData);

    if (!updatedSurvey) {
      return res.status(404).json({
        success: false,
        error: "Survey not found",
      });
    }

    const response: ApiResponse<typeof updatedSurvey> = {
      success: true,
      data: updatedSurvey,
    };

    res.json(response);
  } catch (error) {
    logger.error("Error updating survey", { error });
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

router.get("/:id/programs", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id))
      return res.status(400).json({ success: false, error: "Invalid id" });
    const items = await surveysRepository.getProgramsForSurvey(id);
    res.json({ success: true, data: items });
  } catch (err) {
    logger.error("Error fetching survey programs", { err });
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.post("/:id/programs", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { program_id } = req.body;
    if (isNaN(id) || !program_id)
      return res.status(400).json({ success: false, error: "Invalid input" });
    const added = await surveysRepository.addProgramToSurvey(
      id,
      Number(program_id),
    );
    res.status(201).json({ success: true, data: added });
  } catch (err) {
    logger.error("Error adding program to survey", { err });
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.delete("/:id/programs/:programId", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const programId = parseInt(req.params.programId);
    if (isNaN(id) || isNaN(programId))
      return res.status(400).json({ success: false, error: "Invalid id" });
    await surveysRepository.removeProgramFromSurvey(id, programId);
    res.json({ success: true, data: null });
  } catch (err) {
    logger.error("Error removing program from survey", { err });
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.get("/:id/groups", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id))
      return res.status(400).json({ success: false, error: "Invalid id" });
    const items = await surveysRepository.getGroupsForSurvey(id);
    res.json({ success: true, data: items });
  } catch (err) {
    logger.error("Error fetching survey groups", { err });
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.post("/:id/groups", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, group_type } = req.body;
    if (isNaN(id) || !name)
      return res.status(400).json({ success: false, error: "Invalid input" });
    const created = await surveysRepository.createGroupForSurvey(id, {
      name,
      group_type,
    });
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    logger.error("Error creating survey group", { err });
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.delete("/:id/groups/:groupId", requireAuth, async (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId);
    if (isNaN(groupId))
      return res.status(400).json({ success: false, error: "Invalid id" });
    await surveysRepository.deleteGroupFromSurvey(groupId);
    res.json({ success: true, data: null });
  } catch (err) {
    logger.error("Error deleting survey group", { err });
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid survey ID",
      });
    }

    const success = await surveysRepository.deleteSurvey(id);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: "Survey not found",
      });
    }

    const response: ApiResponse<null> = {
      success: true,
      data: null,
    };

    res.json(response);
  } catch (error) {
    logger.error("Error deleting survey", { error });
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

router.get("/:id/responses", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid survey ID" });
    }

    const responses = await surveysRepository.getSurveyResponses(id);

    const response: ApiResponse<typeof responses> = {
      success: true,
      data: responses,
    };

    res.json(response);
  } catch (error) {
    logger.error("Error fetching survey responses", { error });
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.get("/responses/:responseId", requireAuth, async (req, res) => {
  try {
    const responseId = parseInt(req.params.responseId);
    if (isNaN(responseId)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid response ID" });
    }

    const detail = await surveysRepository.getSurveyResponseDetail(responseId);
    if (!detail) {
      return res
        .status(404)
        .json({ success: false, error: "Response not found" });
    }

    const response: ApiResponse<typeof detail> = {
      success: true,
      data: detail,
    };

    res.json(response);
  } catch (error) {
    logger.error("Error fetching response detail", { error });
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.get("/:id/report", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid survey ID" });
    }

    const survey = await surveysRepository.getSurveyById(id);
    if (!survey) {
      return res
        .status(404)
        .json({ success: false, error: "Survey not found" });
    }

    const programs = await surveysRepository.getProgramsForSurvey(id);
    const groups = await surveysRepository.getGroupsForSurvey(id);
    const responses = await surveysRepository.getSurveyResponses(id);

    const responseCount = responses ? responses.length : 0;

    let reportItems: Array<{
      index: number;
      code: string;
      name: string;
      programName: string;
      group: string;
      responseCount: number;
    }> = [];

    if (programs.length > 0) {
      reportItems = programs.map((program: any, index: number) => ({
        index: index + 1,
        code: program.code || "-",
        name: program.name || "-",
        programName: program.program_name || "-",
        group: groups.map((g: any) => g.name).join(", ") || "-",
        responseCount: responseCount,
      }));
    }

    let reportPrograms = reportItems;

    if (reportPrograms.length === 0 && responseCount > 0) {
      reportPrograms = [
        {
          index: 1,
          code: "-",
          name: "-",
          programName: "-",
          responseCount: responseCount,
        },
      ];
    }

    const reportData = {
      survey: {
        id: survey.id,
        title: survey.title,
      },
      programs: reportPrograms,
      totalResponses: responseCount,
    };

    res.json({ success: true, data: reportData });
  } catch (error) {
    logger.error("Error fetching survey report", { error });
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.get("/:id/export", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid survey ID" });
    }

    const survey = await surveysRepository.getSurveyById(id);
    if (!survey) {
      return res
        .status(404)
        .json({ success: false, error: "Survey not found" });
    }

    if (!survey.questionnaire_id) {
      return res
        .status(400)
        .json({ success: false, error: "Survey has no questionnaire" });
    }

    const { questionnairesRepository } = await import(
      "../repositories/questionnairesRepository"
    );
    const questionnaire =
      await questionnairesRepository.getQuestionnaireWithDetails(
        survey.questionnaire_id,
      );

    if (!questionnaire) {
      return res
        .status(404)
        .json({ success: false, error: "Questionnaire not found" });
    }

    const responses = await surveysRepository.getSurveyResponses(id);

    if (!responses || responses.length === 0) {
      logger.warn(`No responses found for survey ${id}`);
    }

    const responseDetails =
      responses && responses.length > 0
        ? await Promise.all(
            responses.map((r: any) =>
              surveysRepository.getSurveyResponseDetail(r.id),
            ),
          )
        : [];

    const questionsWithResponses = (questionnaire.questions || []).map(
      (question: any) => {
        const questionResponses: any[] = [];

        if (question.options && question.options.length > 0) {
          question.options.forEach((option: any) => {
            const count = responseDetails.filter((detail: any) => {
              if (!detail) return false;
              const answer = detail.answers.find(
                (a: any) => a.question_id === question.id,
              );
              if (!answer) return false;

              const answerData = answer.answer_data;
              if (typeof answerData === "number") {
                return answerData === option.id;
              }
              if (typeof answerData === "object" && answerData !== null) {
                return answerData.option_id === option.id;
              }
              return false;
            }).length;

            const totalResponses = responses ? responses.length : 0;
            questionResponses.push({
              optionId: option.id,
              text: option.option_text || "-",
              count,
              percentage:
                totalResponses > 0 ? (count / totalResponses) * 100 : 0,
            });
          });
        } else {
          responseDetails.forEach((detail: any) => {
            if (!detail) return;
            const answer = detail.answers.find(
              (a: any) => a.question_id === question.id,
            );
            if (answer) {
              const totalResponses = responses ? responses.length : 0;
              questionResponses.push({
                text:
                  typeof answer.answer_data === "string"
                    ? answer.answer_data
                    : JSON.stringify(answer.answer_data),
                count: 1,
                percentage: totalResponses > 0 ? (1 / totalResponses) * 100 : 0,
              });
            }
          });
        }

        return {
          id: question.id,
          text: question.question_text || "-",
          type: question.question_type || "text",
          order: question.question_order || 0,
          options: question.options || [],
          responses: questionResponses,
        };
      },
    );

    const groups = await surveysRepository.getGroupsForSurvey(id);
    const groupType =
      groups && groups.length > 0 ? (groups[0] as any).name : "Unknown";

    let programCode: string | undefined;
    const surveyPrograms = await surveysRepository.getProgramsForSurvey(id);
    if (surveyPrograms && surveyPrograms.length > 0) {
      programCode = surveyPrograms[0].code || undefined;
    }

    const { generateDocxReport } = await import("../utils/reportGenerator");

    const metadata = {
      title: survey.title || "Untitled Survey",
      organizationName: "Сибирский государственный индустриальный университет",
      surveyGoal:
        "Оценка удовлетворенности качеством образования и условиями обучения",
      surveyObject: groupType,
      surveySubject: "Качество образовательного процесса",
      startDate: survey.start_date
        ? new Date(survey.start_date).toLocaleDateString("ru-RU")
        : "не указана",
      endDate: survey.end_date
        ? new Date(survey.end_date).toLocaleDateString("ru-RU")
        : "не указана",
      totalResponses: responses ? responses.length : 0,
      groupType: groupType,
      programCode: programCode,
    };

    logger.info("Generating report with metadata and questions", {
      metadata,
      questionsCount: questionsWithResponses.length,
    });

    const buffer = await generateDocxReport(metadata, questionsWithResponses);

    if (!buffer || buffer.length === 0) {
      logger.error("Generated buffer is empty");
      return res
        .status(500)
        .json({ success: false, error: "Failed to generate report" });
    }

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );

    const sanitizedTitle = (survey.title || "Report")
      .replace(/[^\w\s]/g, "_")
      .substring(0, 50);
    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `Report_${sanitizedTitle}_${dateStr}.docx`;

    const encodedFilename = encodeURIComponent(filename);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"; filename*=UTF-8''${encodedFilename}`,
    );
    res.setHeader("Content-Length", buffer.length);

    res.send(buffer);
  } catch (error) {
    logger.error("Error exporting survey report", { error });
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({
      success: false,
      error: "Internal server error",
      details: errorMessage,
    });
  }
});

router.get("/:id/questionnaire", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid survey ID" });
    }

    const survey = await surveysRepository.getSurveyById(id);
    if (!survey || !survey.questionnaire_id) {
      return res
        .status(404)
        .json({ success: false, error: "Survey not found" });
    }

    const questionnairesRepository = await import(
      "../repositories/questionnairesRepository"
    ).then((m) => m.questionnairesRepository);
    const questionnaire =
      await questionnairesRepository.getQuestionnaireWithDetails(
        survey.questionnaire_id,
      );

    if (!questionnaire) {
      return res
        .status(404)
        .json({ success: false, error: "Questionnaire not found" });
    }

    res.json({ success: true, data: questionnaire });
  } catch (error) {
    logger.error("Error fetching survey questionnaire", { error });
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// GET /api/surveys/:id/responses/count - Получить количество ответов без авторизации
router.get("/:id/responses/count", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid survey ID" });
    }

    const responses = await surveysRepository.getSurveyResponses(id);
    const count = responses ? responses.length : 0;

    res.json({ success: true, data: { count } });
  } catch (error) {
    logger.error("Error fetching survey response count", { error });
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.post("/:id/responses", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid survey ID" });
    }

    const { answers, device_fingerprint } = req.body;
    if (!answers || !Array.isArray(answers)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid answers format" });
    }

    if (device_fingerprint) {
      const existingResponse =
        await surveysRepository.checkDuplicateFingerprint(
          id,
          device_fingerprint,
        );
      if (existingResponse) {
        return res.status(400).json({
          success: false,
          error: `Вы уже заполнили этот опрос. Повторное заполнение невозможно.`,
        });
      }
    }

    // Проверка лимита респондентов
    const survey = await surveysRepository.getSurveyById(id);
    if (survey && survey.questionnaire_id) {
      const { questionnairesRepository } = await import(
        "../repositories/questionnairesRepository"
      );
      const questionnaire =
        await questionnairesRepository.getQuestionnaireWithDetails(
          survey.questionnaire_id,
        );
      if (
        questionnaire &&
        questionnaire.max_respondents != null
      ) {
        const responses = await surveysRepository.getSurveyResponses(id);
        const currentCount = responses ? responses.length : 0;
        if (currentCount >= questionnaire.max_respondents) {
          return res.status(400).json({
            success: false,
            error: "Достигнут лимит респондентов для данного опроса.",
          });
        }
      }
    }

    const responseId = await surveysRepository.saveSurveyResponse(
      id,
      answers,
      device_fingerprint,
    );

    res.json({ success: true, data: { response_id: responseId } });
  } catch (error) {
    logger.error("Error saving survey responses", { error });
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

export default router;