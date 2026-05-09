import { Questionnaire, Question, AnswerOption } from "@shared/types";
import { supabase } from "../db/supabaseClient";
import { redisGet, redisSet, redisDel } from "../db/redisClient";
import { prisma } from "../db/prismaClient";
import { query } from "../db/config";
import { logger } from "../logger";

const prismaEnabled =
  !!process.env.USE_PRISMA && process.env.USE_PRISMA === "true" && !!prisma;

export class QuestionnairesRepository {
  async getAllQuestionnaires(userId?: number): Promise<Questionnaire[]> {
    let result: Questionnaire[] = [];

    if (prismaEnabled) {
      const where = userId
        ? {
            OR: [
              { created_by: userId },
              {
                access: {
                  some: { user_id: userId },
                },
              },
            ],
          }
        : {};

      const items = await prisma!.questionnaire.findMany({
        where,
        orderBy: { created_at: "desc" },
      });
      result = items as unknown as Questionnaire[];
    } else if (supabase) {
      if (userId) {
        try {
          const { data: createdByUser, error: error1 } = await supabase
            .from("questionnaires")
            .select("*")
            .eq("created_by", userId)
            .order("created_at", { ascending: false });
          if (error1) throw error1;

          const { data: withAccess, error: error2 } = await supabase
            .from("questionnaire_access")
            .select("questionnaires(*)")
            .eq("user_id", userId);
          if (error2) throw error2;

          const createdMap = new Map<number, Questionnaire>();
          (createdByUser ?? []).forEach((q) =>
            createdMap.set((q as any).id, q as Questionnaire),
          );

          const accessQuestionnaires = (withAccess ?? [])
            .map((item: any) => item.questionnaires)
            .filter(Boolean) as Questionnaire[];

          accessQuestionnaires.forEach((q) => {
            if (!createdMap.has(q.id)) {
              createdMap.set(q.id, q);
            }
          });

          result = Array.from(createdMap.values()).sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime(),
          );
        } catch (err: any) {
          if (
            err?.code === "PGRST205" ||
            err?.message?.includes("could not find")
          ) {
            const { data, error } = await supabase
              .from("questionnaires")
              .select("*")
              .eq("created_by", userId)
              .order("created_at", { ascending: false });
            if (error) throw error;
            result = (data as unknown as Questionnaire[]) ?? [];
          } else {
            throw err;
          }
        }
      } else {
        const { data, error } = await supabase
          .from("questionnaires")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        result = (data as unknown as Questionnaire[]) ?? [];
      }
    } else {
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
        result = dbResult.rows.map(row => ({
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

    return result;
  }

  async getQuestionnaireWithDetails(id: number): Promise<(Questionnaire & { questions: (Question & { answer_options: AnswerOption[] })[] }) | null> {
    const cacheKey = `questionnaires:${id}:details`;
    const cached = await redisGet<Questionnaire & { questions: (Question & { answer_options: AnswerOption[] })[] }>(cacheKey);
    if (cached) {
      return cached;
    }

    if (prismaEnabled) {
      const q = await prisma!.questionnaire.findUnique({
        where: { id },
        include: {
          questions: {
            orderBy: { question_order: "asc" },
            include: {
              options: { orderBy: { option_order: "asc" } },
            },
          },
        },
      });
      if (!q) return null;

      const questionsWithOptions = (q.questions || []).map((qq: any) => {
        const answerOptions: AnswerOption[] = (qq.options || []).map(
          (opt: any) => opt as AnswerOption,
        );
        const { options, ...rest } = qq;
        return { ...(rest as Question), answer_options: answerOptions } as any;
      });

      const result = {
        ...(q as any as Questionnaire),
        questions: questionsWithOptions,
      } as Questionnaire & { questions: (Question & { answer_options: AnswerOption[] })[] };

      await redisSet(cacheKey, result, 120);
      return result;
    }

    if (supabase) {
      const { data: questionnaire, error: qErr } = await supabase
        .from("questionnaires")
        .select("*")
        .eq("id", id)
        .single();
      if (qErr) {
        if ((qErr as any).code === "PGRST116") return null;
        throw qErr;
      }

      const { data: questions, error: qsErr } = await supabase
        .from("questions")
        .select("*")
        .eq("questionnaire_id", id)
        .order("question_order", { ascending: true });
      if (qsErr) throw qsErr;

      const withOptions: any[] = [];
      for (const question of questions ?? []) {
        const { data: options, error: optErr } = await supabase
          .from("answer_options")
          .select("*")
          .eq("question_id", (question as any).id)
          .order("option_order", { ascending: true });
        if (optErr) throw optErr;
        withOptions.push({ ...(question as any), answer_options: options ?? [] });
      }

      const result = {
        ...(questionnaire as Questionnaire),
        questions: withOptions as any,
      } as Questionnaire & { questions: (Question & { answer_options: AnswerOption[] })[] };

      await redisSet(cacheKey, result, 120);
      return result;
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
    let created: any;

    if (prismaEnabled) {
      created = await prisma!.questionnaire.create({
        data: {
          title: questionnaireData.title,
          description: questionnaireData.description,
          version: questionnaireData.version,
          created_by: questionnaireData.created_by,
        },
      });

      if (questionnaireData.created_by) {
        await prisma!.questionnaireAccess.upsert({
          where: {
            questionnaire_id_user_id: {
              questionnaire_id: created.id,
              user_id: questionnaireData.created_by,
            },
          },
          update: {},
          create: {
            questionnaire_id: created.id,
            user_id: questionnaireData.created_by,
          },
        });
      }

      await redisDel("questionnaires:all");
      return created as unknown as Questionnaire;
    }

    if (supabase) {
      const { data, error } = await supabase
        .from("questionnaires")
        .insert({
          title: questionnaireData.title,
          description: questionnaireData.description,
          version: questionnaireData.version,
          created_by: questionnaireData.created_by,
        })
        .select()
        .single();
      if (error) throw error;

      if (questionnaireData.created_by) {
        await supabase.from("questionnaire_access").upsert(
          {
            questionnaire_id: data.id,
            user_id: questionnaireData.created_by,
          },
          { onConflict: "questionnaire_id,user_id" },
        );
      }

      await redisDel("questionnaires:all");
      return data as unknown as Questionnaire;
    }

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

    if (prismaEnabled) {
      const created = await prisma!.questionnaire.create({
        data: {
          title: payload.title,
          description: payload.description,
          version,
          created_by: payload.created_by ?? null,
          max_respondents: maxRespondents,
          questions: {
            create: (payload.questions || []).map((q, idx) => ({
              question_text: q.question_text,
              description: q.description || null,
              answer_placeholder: q.answer_placeholder || null,
              question_type: q.question_type ?? "text_line",
              is_required: q.is_required ?? false,
              question_order: q.question_order ?? idx + 1,
              formatting: q.formatting || null,
              options: q.options
                ? {
                    create: q.options.map((opt, optIdx) => ({
                      option_text: opt.option_text,
                      option_order: opt.option_order ?? optIdx + 1,
                    })),
                  }
                : undefined,
            })),
          },
        },
        include: {
          questions: {
            orderBy: { question_order: "asc" },
            include: { options: { orderBy: { option_order: "asc" } } },
          },
        },
      });

      const questionsWithOptions = (created.questions || []).map((qq: any) => {
        const answerOptions: AnswerOption[] = (qq.options || []).map(
          (opt: any) => opt as AnswerOption,
        );
        const { options, ...rest } = qq;
        return { ...(rest as Question), answer_options: answerOptions } as any;
      });

      if (payload.created_by) {
        await prisma!.questionnaireAccess.upsert({
          where: {
            questionnaire_id_user_id: {
              questionnaire_id: (created as any).id,
              user_id: payload.created_by,
            },
          },
          update: {},
          create: {
            questionnaire_id: (created as any).id,
            user_id: payload.created_by,
          },
        });
      }

      await redisDel("questionnaires:all");
      await redisDel(`questionnaires:${(created as any).id}:details`);

      return {
        ...(created as any as Questionnaire),
        questions: questionsWithOptions,
      };
    }

    if (supabase) {
      const { data: qData, error: qErr } = await supabase
        .from("questionnaires")
        .insert({
          title: payload.title,
          description: payload.description,
          version,
          created_by: payload.created_by,
          max_respondents: maxRespondents,
        })
        .select()
        .single();
      if (qErr) throw qErr;

      const questionnaire = qData as Questionnaire;
      const insertedQuestions: any[] = [];

      if (payload.questions && payload.questions.length > 0) {
        for (const [idx, q] of payload.questions.entries()) {
          const { data: insQ, error: insQErr } = await supabase
            .from("questions")
            .insert({
              questionnaire_id: questionnaire.id,
              question_text: q.question_text,
              question_type: q.question_type ?? "text_line",
              is_required: q.is_required ?? false,
              question_order: q.question_order ?? idx + 1,
              formatting: q.formatting || null,
            })
            .select()
            .single();
          if (insQErr) throw insQErr;

          const questionInserted = insQ as any;
          if (q.options && q.options.length > 0) {
            for (const [optIdx, opt] of q.options.entries()) {
              const { error: optErr } = await supabase
                .from("answer_options")
                .insert({
                  question_id: questionInserted.id,
                  option_text: opt.option_text,
                  option_order: opt.option_order ?? optIdx + 1,
                });
              if (optErr) throw optErr;
            }
          }

          insertedQuestions.push(questionInserted);
        }
      }

      if (payload.created_by) {
        await supabase.from("questionnaire_access").upsert(
          {
            questionnaire_id: questionnaire.id,
            user_id: payload.created_by,
          },
          { onConflict: "questionnaire_id,user_id" },
        );
      }

      await redisDel("questionnaires:all");
      await redisDel(`questionnaires:${questionnaire.id}:details`);

      return { ...questionnaire, questions: insertedQuestions } as any;
    }

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
    if (prismaEnabled) {
      const updated = await prisma!.$transaction(async (tx) => {
        const q = await tx.questionnaire.update({
          where: { id },
          data: {
            title: payload.title,
            description: payload.description,
            version: payload.version,
            created_by: payload.created_by ?? null,
            max_respondents: payload.max_respondents ?? null,
          },
        });

        await tx.answerOption.deleteMany({
          where: { question: { questionnaire_id: id } },
        });
        await tx.question.deleteMany({ where: { questionnaire_id: id } });

        const createdQuestions: any[] = [];

        for (const [idx, qPayload] of (payload.questions || []).entries()) {
          const created = await tx.question.create({
            data: {
              questionnaire_id: id,
              question_text: qPayload.question_text,
              description: qPayload.description || null,
              answer_placeholder: qPayload.answer_placeholder || null,
              question_type: qPayload.question_type ?? "text_line",
              is_required: qPayload.is_required ?? false,
              question_order: qPayload.question_order ?? idx + 1,
              formatting: qPayload.formatting || null,
              options: qPayload.options
                ? {
                    create: qPayload.options.map((opt, optIdx) => ({
                      option_text: opt.option_text,
                      option_order: opt.option_order ?? optIdx + 1,
                    })),
                  }
                : undefined,
            },
            include: { options: { orderBy: { option_order: "asc" } } },
          });
          createdQuestions.push(created);
        }

        return { q, createdQuestions };
      });

      const questionsWithOptions = (updated.createdQuestions || []).map(
        (qq: any) => {
          const answerOptions: AnswerOption[] = (qq.options || []).map(
            (opt: any) => opt as AnswerOption,
          );
          const { options, ...rest } = qq;
          return {
            ...(rest as Question),
            answer_options: answerOptions,
          } as any;
        },
      );

      await redisDel("questionnaires:all");
      await redisDel(`questionnaires:${id}:details`);

      return {
        ...(updated.q as any as Questionnaire),
        questions: questionsWithOptions,
      };
    }

    if (supabase) {
      const { data: updatedQ, error: updErr } = await supabase
        .from("questionnaires")
        .update({
          title: payload.title,
          description: payload.description,
          version: payload.version,
          created_by: payload.created_by,
          max_respondents: payload.max_respondents ?? null,
        })
        .eq("id", id)
        .select()
        .single();
      if (updErr) {
        if ((updErr as any).code === "PGRST116") return null;
        throw updErr;
      }

      const { data: existingQuestions } = await supabase
        .from("questions")
        .select("id")
        .eq("questionnaire_id", id);

      const questionIds = (existingQuestions || []).map((q: any) => q.id);
      if (questionIds.length > 0) {
        await supabase
          .from("answer_options")
          .delete()
          .in("question_id", questionIds);
        await supabase.from("questions").delete().in("id", questionIds);
      }

      const insertedQuestions: any[] = [];

      if (payload.questions && payload.questions.length > 0) {
        for (const [idx, q] of payload.questions.entries()) {
          const { data: insQ, error: insQErr } = await supabase
            .from("questions")
            .insert({
              questionnaire_id: id,
              question_text: q.question_text,
              question_type: q.question_type ?? "text_line",
              is_required: q.is_required ?? false,
              question_order: q.question_order ?? idx + 1,
              formatting: q.formatting || null,
            })
            .select()
            .single();
          if (insQErr) throw insQErr;

          const questionInserted = insQ as any;
          if (q.options && q.options.length > 0) {
            for (const [optIdx, opt] of q.options.entries()) {
              const { error: optErr } = await supabase
                .from("answer_options")
                .insert({
                  question_id: questionInserted.id,
                  option_text: opt.option_text,
                  option_order: opt.option_order ?? optIdx + 1,
                });
              if (optErr) throw optErr;
            }
          }

          insertedQuestions.push(questionInserted);
        }
      }

      await redisDel("questionnaires:all");
      await redisDel(`questionnaires:${id}:details`);

      return {
        ...(updatedQ as Questionnaire),
        questions: insertedQuestions,
      } as any;
    }

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
    if (prismaEnabled) {
      await prisma!.questionnaire.delete({ where: { id } });
      await redisDel("questionnaires:all");
      await redisDel(`questionnaires:${id}:details`);
      return true;
    }

    if (supabase) {
      const { data: existingQuestions } = await supabase
        .from("questions")
        .select("id")
        .eq("questionnaire_id", id);

      const questionIds = (existingQuestions || []).map((q: any) => q.id);
      if (questionIds.length > 0) {
        await supabase
          .from("answer_options")
          .delete()
          .in("question_id", questionIds);
        await supabase.from("questions").delete().in("id", questionIds);
      }

      const { error: delErr } = await supabase
        .from("questionnaires")
        .delete()
        .eq("id", id);
      if (delErr) throw delErr;

      await redisDel("questionnaires:all");
      await redisDel(`questionnaires:${id}:details`);

      return true;
    }

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