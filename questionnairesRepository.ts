import { Questionnaire, Question, AnswerOption } from "@shared/types";
import { redisGet, redisSet, redisDel } from "../db/redisClient";
import { query } from "../db/config";
import { logger } from "../logger";

export class QuestionnairesRepository {
  async getAllQuestionnaires(userId?: number): Promise<Questionnaire[]> {
    try {
      let sql = "SELECT * FROM questionnaires";
      const params: any[] = [];

      if (userId) {
        try {
          const checkTable = await query(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'questionnaire_access')"
          );

          if (checkTable.rows[0].exists) {
            sql = `
              SELECT DISTINCT q.* 
              FROM questionnaires q
              LEFT JOIN questionnaire_access qa ON q.id = qa.questionnaire_id
              WHERE q.created_by = $1 OR qa.user_id = $2
              ORDER BY q.created_at DESC
            `;
            params.push(userId, userId);
          } else {
            sql = "SELECT * FROM questionnaires WHERE created_by = $1 ORDER BY created_at DESC";
            params.push(userId);
          }
        } catch (tableError) {
          sql = "SELECT * FROM questionnaires WHERE created_by = $1 ORDER BY created_at DESC";
          params.push(userId);
        }
      } else {
        sql += " ORDER BY created_at DESC";
      }

      const dbResult = await query(sql, params);
      return dbResult.rows.map(row => ({
        id: row.id,
        title: row.title,
        description: row.description,
        version: row.version,
        created_by: row.created_by,
        created_at: row.created_at,
        max_respondents: row.max_respondents ?? null,
      })) as Questionnaire[];
    } catch (error: any) {
      logger.error("Error fetching questionnaires from PostgreSQL", { error });
      throw error;
    }
  }

  async getQuestionnaireWithDetails(id: number): Promise<(Questionnaire & { questions: (Question & { answer_options: AnswerOption[] })[] }) | null> {
    const cacheKey = `questionnaires:${id}:details`;
    const cached = await redisGet<Questionnaire & { questions: (Question & { answer_options: AnswerOption[] })[] }>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const questionnaireResult = await query(
        "SELECT * FROM questionnaires WHERE id = $1",
        [id]
      );

      if (questionnaireResult.rows.length === 0) {
        return null;
      }

      const questionnaire = questionnaireResult.rows[0];

      const questionsResult = await query(
        "SELECT * FROM questions WHERE questionnaire_id = $1 ORDER BY question_order ASC",
        [id]
      );

      const questionsWithOptions: (Question & { answer_options: AnswerOption[] })[] = [];

      for (const question of questionsResult.rows) {
        const optionsResult = await query(
          "SELECT * FROM answer_options WHERE question_id = $1 ORDER BY option_order ASC",
          [question.id]
        );

        questionsWithOptions.push({
          id: question.id,
          questionnaire_id: question.questionnaire_id,
          question_text: question.question_text,
          question_type: question.question_type,
          is_required: question.is_required,
          question_order: question.question_order,
          formatting: question.formatting,
          created_at: question.created_at,
          answer_options: optionsResult.rows.map(opt => ({
            id: opt.id,
            question_id: opt.question_id,
            option_text: opt.option_text,
            option_order: opt.option_order,
            created_at: opt.created_at,
          })) as AnswerOption[],
        });
      }

      const result = {
        id: questionnaire.id,
        title: questionnaire.title,
        description: questionnaire.description,
        version: questionnaire.version,
        created_by: questionnaire.created_by,
        created_at: questionnaire.created_at,
        max_respondents: questionnaire.max_respondents ?? null,
        questions: questionsWithOptions,
      } as Questionnaire & { questions: (Question & { answer_options: AnswerOption[] })[] };

      await redisSet(cacheKey, result, 120);
      return result;
    } catch (error) {
      logger.error("Error fetching questionnaire with details from PostgreSQL", { error });
      throw error;
    }
  }

  async createQuestionnaire(
    questionnaireData: Omit<Questionnaire, "id" | "created_at">,
  ): Promise<Questionnaire> {
    try {
      const result = await query(
        `INSERT INTO questionnaires (title, description, version, created_by)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [
          questionnaireData.title,
          questionnaireData.description || null,
          questionnaireData.version || 1,
          questionnaireData.created_by || null,
        ]
      );

      const createdQuestionnaire = result.rows[0] as Questionnaire;

      if (questionnaireData.created_by) {
        try {
          await query(
            `INSERT INTO questionnaire_access (questionnaire_id, user_id, created_at)
             VALUES ($1, $2, NOW())
             ON CONFLICT (questionnaire_id, user_id) DO NOTHING`,
            [createdQuestionnaire.id, questionnaireData.created_by]
          );
        } catch (accessError: any) {
          if (!accessError.message?.includes("questionnaire_access")) {
            logger.warn("Could not create questionnaire access", { error: accessError });
          }
        }
      }

      await redisDel("questionnaires:all");
      return createdQuestionnaire;
    } catch (error) {
      logger.error("Error creating questionnaire in PostgreSQL", { error });
      throw error;
    }
  }

  async createQuestionnaireWithDetails(payload: {
    title: string;
    description?: string;
    version?: number;
    created_by?: number | null;
    max_respondents?: number | null;
    questions?: {
      question_text: string;
      description?: string;
      answer_placeholder?: string;
      question_type?: string;
      is_required?: boolean;
      question_order?: number;
      formatting?: any;
      options?: { option_text: string; option_order?: number }[];
    }[];
  }): Promise<Questionnaire & { questions: any[] }> {
    const version = payload.version ?? 1;
    const maxRespondents = payload.max_respondents ?? null;

    try {
      await query("BEGIN");

      const questionnaireResult = await query(
        `INSERT INTO questionnaires (title, description, version, created_by, max_respondents)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          payload.title,
          payload.description || null,
          version,
          payload.created_by || null,
          maxRespondents,
        ]
      );

      const questionnaire = questionnaireResult.rows[0];
      const insertedQuestions: any[] = [];

      if (payload.questions && payload.questions.length > 0) {
        for (const [idx, q] of payload.questions.entries()) {
          const questionResult = await query(
            `INSERT INTO questions 
             (questionnaire_id, question_text, question_type, is_required, question_order, formatting)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [
              questionnaire.id,
              q.question_text,
              q.question_type ?? "text_line",
              q.is_required ?? false,
              q.question_order ?? idx + 1,
              q.formatting ? JSON.stringify(q.formatting) : null,
            ]
          );

          const question = questionResult.rows[0];

          if (q.options && q.options.length > 0) {
            for (const [optIdx, opt] of q.options.entries()) {
              await query(
                `INSERT INTO answer_options (question_id, option_text, option_order)
                 VALUES ($1, $2, $3)`,
                [
                  question.id,
                  opt.option_text,
                  opt.option_order ?? optIdx + 1,
                ]
              );
            }

            const optionsResult = await query(
              "SELECT * FROM answer_options WHERE question_id = $1 ORDER BY option_order ASC",
              [question.id]
            );
            question.answer_options = optionsResult.rows;
          } else {
            question.answer_options = [];
          }

          insertedQuestions.push(question);
        }
      }

      if (payload.created_by) {
        try {
          await query(
            `INSERT INTO questionnaire_access (questionnaire_id, user_id, created_at)
             VALUES ($1, $2, NOW())
             ON CONFLICT (questionnaire_id, user_id) DO NOTHING`,
            [questionnaire.id, payload.created_by]
          );
        } catch (accessError: any) {
          if (!accessError.message?.includes("questionnaire_access")) {
            logger.warn("Could not create questionnaire access", { error: accessError });
          }
        }
      }

      await query("COMMIT");

      await redisDel("questionnaires:all");
      await redisDel(`questionnaires:${questionnaire.id}:details`);

      return {
        id: questionnaire.id,
        title: questionnaire.title,
        description: questionnaire.description,
        version: questionnaire.version,
        created_by: questionnaire.created_by,
        created_at: questionnaire.created_at,
        max_respondents: questionnaire.max_respondents ?? null,
        questions: insertedQuestions,
      } as any;
    } catch (error) {
      await query("ROLLBACK");
      logger.error("Error creating questionnaire with details in PostgreSQL", { error });
      throw error;
    }
  }

  async updateQuestionnaireWithDetails(
    id: number,
    payload: {
      title?: string;
      description?: string;
      version?: number;
      created_by?: number | null;
      max_respondents?: number | null;
      questions?: {
        question_text: string;
        description?: string;
        answer_placeholder?: string;
        question_type?: string;
        is_required?: boolean;
        question_order?: number;
        formatting?: any;
        options?: { option_text: string; option_order?: number }[];
      }[];
    },
  ): Promise<(Questionnaire & { questions: any[] }) | null> {
    try {
      await query("BEGIN");

      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramCount = 1;

      if (payload.title !== undefined) {
        updateFields.push(`title = $${paramCount}`);
        updateValues.push(payload.title);
        paramCount++;
      }
      if (payload.description !== undefined) {
        updateFields.push(`description = $${paramCount}`);
        updateValues.push(payload.description);
        paramCount++;
      }
      if (payload.version !== undefined) {
        updateFields.push(`version = $${paramCount}`);
        updateValues.push(payload.version);
        paramCount++;
      }
      if (payload.created_by !== undefined) {
        updateFields.push(`created_by = $${paramCount}`);
        updateValues.push(payload.created_by);
        paramCount++;
      }
      updateFields.push(`max_respondents = $${paramCount}`);
      updateValues.push(payload.max_respondents ?? null);
      paramCount++;

      updateValues.push(id);

      const questionnaireResult = await query(
        `UPDATE questionnaires SET ${updateFields.join(", ")} WHERE id = $${paramCount} RETURNING *`,
        updateValues
      );

      if (questionnaireResult.rows.length === 0) {
        await query("ROLLBACK");
        return null;
      }

      const questionnaire = questionnaireResult.rows[0];

      const existingQuestionsResult = await query(
        "SELECT id FROM questions WHERE questionnaire_id = $1",
        [id]
      );

      const questionIds = existingQuestionsResult.rows.map(row => row.id);

      if (questionIds.length > 0) {
        await query(
          "DELETE FROM answer_options WHERE question_id = ANY($1)",
          [questionIds]
        );
        await query(
          "DELETE FROM questions WHERE id = ANY($1)",
          [questionIds]
        );
      }

      const insertedQuestions: any[] = [];

      if (payload.questions && payload.questions.length > 0) {
        for (const [idx, q] of payload.questions.entries()) {
          const questionResult = await query(
            `INSERT INTO questions 
             (questionnaire_id, question_text, question_type, is_required, question_order, formatting)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [
              id,
              q.question_text,
              q.question_type ?? "text_line",
              q.is_required ?? false,
              q.question_order ?? idx + 1,
              q.formatting ? JSON.stringify(q.formatting) : null,
            ]
          );

          const question = questionResult.rows[0];

          if (q.options && q.options.length > 0) {
            for (const [optIdx, opt] of q.options.entries()) {
              await query(
                `INSERT INTO answer_options (question_id, option_text, option_order)
                 VALUES ($1, $2, $3)`,
                [
                  question.id,
                  opt.option_text,
                  opt.option_order ?? optIdx + 1,
                ]
              );
            }

            const optionsResult = await query(
              "SELECT * FROM answer_options WHERE question_id = $1 ORDER BY option_order ASC",
              [question.id]
            );
            question.answer_options = optionsResult.rows;
          } else {
            question.answer_options = [];
          }

          insertedQuestions.push(question);
        }
      }

      await query("COMMIT");

      await redisDel("questionnaires:all");
      await redisDel(`questionnaires:${id}:details`);

      return {
        id: questionnaire.id,
        title: questionnaire.title,
        description: questionnaire.description,
        version: questionnaire.version,
        created_by: questionnaire.created_by,
        created_at: questionnaire.created_at,
        max_respondents: questionnaire.max_respondents ?? null,
        questions: insertedQuestions,
      } as any;
    } catch (error) {
      await query("ROLLBACK");
      logger.error("Error updating questionnaire with details in PostgreSQL", { error });
      throw error;
    }
  }

  async deleteQuestionnaire(id: number): Promise<boolean> {
    try {
      await query("BEGIN");

      const questionsResult = await query(
        "SELECT id FROM questions WHERE questionnaire_id = $1",
        [id]
      );

      const questionIds = questionsResult.rows.map(row => row.id);

      if (questionIds.length > 0) {
        await query(
          "DELETE FROM answer_options WHERE question_id = ANY($1)",
          [questionIds]
        );
      }

      await query(
        "DELETE FROM questions WHERE questionnaire_id = $1",
        [id]
      );

      try {
        await query(
          "DELETE FROM questionnaire_access WHERE questionnaire_id = $1",
          [id]
        );
      } catch (accessError: any) {
        if (!accessError.message?.includes("questionnaire_access")) {
          logger.warn("Could not delete questionnaire access", { error: accessError });
        }
      }

      const deleteResult = await query(
        "DELETE FROM questionnaires WHERE id = $1",
        [id]
      );

      await query("COMMIT");

      await redisDel("questionnaires:all");
      await redisDel(`questionnaires:${id}:details`);

      return deleteResult.rowCount > 0;
    } catch (error) {
      await query("ROLLBACK");
      logger.error("Error deleting questionnaire from PostgreSQL", { error });
      throw error;
    }
  }
}

export const questionnairesRepository = new QuestionnairesRepository();
