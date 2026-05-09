import { Survey, PaginatedResponse, SurveyCardData } from "@shared/types";
import { supabase } from "../db/supabaseClient";
import { query } from "../db/config";
import { redisGet, redisSet } from "../db/redisClient";
import { prisma } from "../db/prismaClient";
import { logger } from "../logger";

type SurveyAnswerPayload = {
  question_id: number;
  answer_data: any;
};

const prismaEnabled =
  !!process.env.USE_PRISMA && process.env.USE_PRISMA === "true" && !!prisma;

const inMemoryResponseStore = {
  nextId: 1,
  records: [] as Array<{
    responseId: number;
    surveyId: number;
    answers: SurveyAnswerPayload[];
    createdAt: Date;
  }>,
};

const SUPABASE_TABLE_NOT_FOUND_CODE = "PGRST205";

function isSupabaseMissingTableError(error: any) {
  return error?.code === SUPABASE_TABLE_NOT_FOUND_CODE;
}

function recordInMemoryResponse(
  surveyId: number,
  answers: SurveyAnswerPayload[],
) {
  const responseId = inMemoryResponseStore.nextId++;
  inMemoryResponseStore.records.push({
    responseId,
    surveyId,
    answers: [...answers],
    createdAt: new Date(),
  });
  console.warn(
    "Survey response tables missing in Supabase; falling back to in-memory store",
  );
  return responseId;
}

export class SurveysRepository {
  // Получите один опрос по ID
  async getSurveyById(id: number): Promise<Survey | null> {
    if (prismaEnabled) {
      const item = await prisma!.survey.findUnique({ where: { id } });
      return (item as unknown as Survey) || null;
    }

    if (supabase) {
      const { data, error } = await supabase
        .from("surveys")
        .select("*")
        .eq("id", id)
        .single();
      if (error) {
        if ((error as any).code === "PGRST116") return null;
        throw error;
      }
      return (data as unknown as Survey) || null;
    }

    const result = await query("SELECT * FROM surveys WHERE id = $1", [id]);
    return (result.rows[0] as Survey) || null;
  }

  // Получить все активные опросы для главной страницы
  async getActiveSurveysForHome(
    page: number = 1,
    limit: number = 10,
    userId?: number,
  ): Promise<PaginatedResponse<SurveyCardData>> {
    // Deactivate expired surveys first
    await this.deactivateExpiredSurveys();

    const offset = (page - 1) * limit;
    let formattedSurveys: SurveyCardData[] = [];
    let total = 0;

    if (prismaEnabled) {
      const where = {
        is_active: true,
        OR: [{ end_date: null }, { end_date: { gt: new Date() } }],
      } as any;

      if (userId) {
        where.OR = [
          { created_by: userId },
          {
            access: {
              some: { user_id: userId },
            },
          },
        ];
      }

      const [items, count] = await Promise.all([
        prisma!.survey.findMany({
          where,
          orderBy: { created_at: "desc" },
          skip: offset,
          take: limit,
          include: {
            questionnaire: { select: { title: true } },
            programs: { select: { id: true, name: true } },
          },
        }),
        prisma!.survey.count({ where }),
      ]);

      total = count;
      formattedSurveys = items.map((s: any) => {
        const description = s.title || s.questionnaire?.title || "Опрос";
        return {
          id: s.id,
          dateRange: this.formatDateRange(s.start_date, s.end_date),
          description,
          target: this.getTargetFromDescription(description),
          isActive: s.is_active,
          questionnaire_id: s.questionnaire_id,
          questionnaire_title: s.questionnaire?.title,
          created_by: s.created_by,
          created_at: s.created_at,
          programs: s.programs || [],
        };
      });
    } else if (supabase) {
      let surveys: any[] = [];

      if (userId) {
        try {
          // Fetch surveys created by the user
          const { data: createdByUser, error: error1 } = await supabase
            .from("surveys")
            .select(
              "id, title, start_date, end_date, is_active, questionnaire_id, created_by",
            )
            .eq("is_active", true)
            .eq("created_by", userId)
            .or("end_date.is.null,end_date.gt.now()")
            .order("created_at", { ascending: false });
          if (error1) throw error1;

          // Fetch surveys where user has access
          const { data: withAccess, error: error2 } = await supabase
            .from("survey_access")
            .select(
              "surveys(id, title, start_date, end_date, is_active, questionnaire_id, created_by)",
            )
            .eq("user_id", userId);
          if (error2) throw error2;

          // Combine and deduplicate surveys
          const surveyMap = new Map<number, any>();
          (createdByUser ?? []).forEach((s) => surveyMap.set((s as any).id, s));

          const accessSurveys = (withAccess ?? [])
            .map((item: any) => item.surveys)
            .filter(Boolean) as any[];

          accessSurveys.forEach((s) => {
            if (
              !surveyMap.has(s.id) &&
              s.is_active &&
              (!s.end_date || new Date(s.end_date) > new Date())
            ) {
              surveyMap.set(s.id, s);
            }
          });

          // Convert to array, sort by created_at descending, and apply pagination
          surveys = Array.from(surveyMap.values())
            .sort(
              (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime(),
            )
            .slice(offset, offset + limit);

          // Total count is the number of unique surveys
          total = surveyMap.size;
        } catch (err: any) {
          // If access tables don't exist, fallback to showing only surveys created by user
          if (
            err?.code === "PGRST205" ||
            err?.message?.includes("could not find")
          ) {
            const { count, error: countErr } = await supabase
              .from("surveys")
              .select("id", { count: "exact", head: true })
              .eq("is_active", true)
              .eq("created_by", userId)
              .or("end_date.is.null,end_date.gt.now()");
            if (countErr) throw countErr;
            total = count ?? 0;

            const { data, error } = await supabase
              .from("surveys")
              .select(
                "id, title, start_date, end_date, is_active, questionnaire_id",
              )
              .eq("is_active", true)
              .eq("created_by", userId)
              .or("end_date.is.null,end_date.gt.now()")
              .order("created_at", { ascending: false })
              .range(offset, offset + limit - 1);

            if (error) throw error;
            surveys = data ?? [];
          } else {
            throw err;
          }
        }
      } else {
        const { count, error: countErr } = await supabase
          .from("surveys")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true)
          .or("end_date.is.null,end_date.gt.now()");
        if (countErr) throw countErr;
        total = count ?? 0;

        const { data, error } = await supabase
          .from("surveys")
          .select(
            "id, title, start_date, end_date, is_active, questionnaire_id",
          )
          .eq("is_active", true)
          .or("end_date.is.null,end_date.gt.now()")
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1);

        if (error) throw error;
        surveys = data ?? [];
      }

      const qIds = Array.from(
        new Set((surveys ?? []).map((s) => s.questionnaire_id).filter(Boolean)),
      );
      let qTitleById: Record<number, string> = {};
      if (qIds.length) {
        const { data: questionnaires, error: qErr } = await supabase
          .from("questionnaires")
          .select("id, title")
          .in("id", qIds as number[]);
        if (qErr) throw qErr;
        qTitleById = Object.fromEntries(
          (questionnaires ?? []).map((q) => [q.id, q.title]),
        );
      }

      formattedSurveys = (surveys ?? []).map((s) => {
        const description =
          (s as any).title ||
          qTitleById[(s as any).questionnaire_id as number] ||
          "Опрос";
        return {
          id: (s as any).id,
          dateRange: this.formatDateRange(
            (s as any).start_date as any,
            (s as any).end_date as any,
          ),
          description,
          target: this.getTargetFromDescription(description),
          isActive: (s as any).is_active as boolean,
          created_at: (s as any).created_at,
        };
      });
    } else {
      let whereClause =
        "s.is_active = true AND (s.end_date IS NULL OR s.end_date > NOW())";
      const queryParams: any[] = [];

      if (userId) {
        whereClause += ` AND (s.created_by = $${queryParams.length + 1} OR EXISTS (SELECT 1 FROM survey_access sa WHERE sa.survey_id = s.id AND sa.user_id = $${queryParams.length + 2}))`;
        queryParams.push(userId, userId);
      }

      const result = await query(
        `SELECT
          s.id,
          s.title as description,
          s.start_date,
          s.end_date,
          s.is_active,
          s.created_at,
          q.title as questionnaire_title
         FROM surveys s
         LEFT JOIN questionnaires q ON s.questionnaire_id = q.id
         WHERE ${whereClause}
         ORDER BY s.created_at DESC
         LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`,
        [...queryParams, limit, offset],
      );

      const countResult = await query(
        `SELECT COUNT(*) FROM surveys s
         LEFT JOIN questionnaires q ON s.questionnaire_id = q.id
         WHERE ${whereClause}`,
        queryParams,
      );

      total = parseInt(countResult.rows[0].count);

      formattedSurveys = result.rows.map((survey) => ({
        id: survey.id,
        dateRange: this.formatDateRange(survey.start_date, survey.end_date),
        description:
          survey.description || survey.questionnaire_title || "Опрос",
        target: this.getTargetFromDescription(
          survey.description || survey.questionnaire_title,
        ),
        isActive: survey.is_active,
        created_at: survey.created_at,
      }));
    }

    const result: PaginatedResponse<SurveyCardData> = {
      items: formattedSurveys,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };

    return result;
  }

  // Деактивировать истекшие опросы
  private async deactivateExpiredSurveys(): Promise<void> {
    try {
      if (prismaEnabled) {
        await prisma!.survey.updateMany({
          where: {
            is_active: true,
            end_date: {
              lt: new Date(),
            },
          },
          data: {
            is_active: false,
          },
        });
      } else if (supabase) {
        const now = new Date().toISOString();
        const { error } = await supabase
          .from("surveys")
          .update({ is_active: false })
          .eq("is_active", true)
          .lt("end_date", now);

        if (error) throw error;
      } else {
        await query(
          "UPDATE surveys SET is_active = false WHERE is_active = true AND end_date < NOW()",
          [],
        );
      }
    } catch (error) {
      logger.error("Error deactivating expired surveys", { error });
    }
  }

  // Получить опросы для главной страницы с фильтром по статусу
  async getSurveysForHome(
    page: number = 1,
    limit: number = 10,
    userId?: number,
    status: string = "active",
    programIds?: number[],
    questionnaireIds?: number[],
    creatorIds?: number[],
    groupId?: number,
    creationDateFrom?: string,
    creationDateTo?: string,
  ): Promise<PaginatedResponse<SurveyCardData>> {
    // Deactivate expired surveys first
    await this.deactivateExpiredSurveys();

    const offset = (page - 1) * limit;
    let formattedSurveys: SurveyCardData[] = [];
    let total = 0;

    if (prismaEnabled) {
      const where: any = {};

      // Apply status filter
      if (status === "active") {
        where.is_active = true;
        where.OR = [{ end_date: null }, { end_date: { gt: new Date() } }];
      } else if (status === "inactive") {
        where.OR = [
          { is_active: false },
          { AND: [{ is_active: true }, { end_date: { lt: new Date() } }] },
        ];
      }
      // "all" means no filter on is_active

      if (userId) {
        where.AND = [
          {
            OR: [
              { created_by: userId },
              {
                access: {
                  some: { user_id: userId },
                },
              },
            ],
          },
        ];
      }

      // Apply advanced filters
      if (programIds && programIds.length > 0) {
        where.programs = {
          some: {
            id: { in: programIds },
          },
        };
      }

      if (questionnaireIds && questionnaireIds.length > 0) {
        where.questionnaire_id = { in: questionnaireIds };
      }

      if (creatorIds && creatorIds.length > 0) {
        where.created_by = { in: creatorIds };
      }

      if (groupId) {
        where.groups = {
          some: {
            id: groupId,
          },
        };
      }

      if (creationDateFrom) {
        where.created_at = {
          ...(where.created_at || {}),
          gte: new Date(creationDateFrom),
        };
      }

      if (creationDateTo) {
        const toDate = new Date(creationDateTo);
        toDate.setHours(23, 59, 59, 999);
        where.created_at = {
          ...(where.created_at || {}),
          lte: toDate,
        };
      }

      const [items, count] = await Promise.all([
        prisma!.survey.findMany({
          where,
          orderBy: { created_at: "desc" },
          skip: offset,
          take: limit,
          include: {
            questionnaire: { select: { title: true } },
            programs: { select: { id: true, name: true } },
          },
        }),
        prisma!.survey.count({ where }),
      ]);

      total = count;
      formattedSurveys = items.map((s: any) => {
        const description = s.title || s.questionnaire?.title || "Опрос";
        return {
          id: s.id,
          dateRange: this.formatDateRange(s.start_date, s.end_date),
          description,
          target: this.getTargetFromDescription(description),
          isActive: s.is_active,
          questionnaire_id: s.questionnaire_id,
          questionnaire_title: s.questionnaire?.title,
          created_by: s.created_by,
          created_at: s.created_at,
          programs: s.programs || [],
        };
      });
    } else if (supabase) {
      let surveys: any[] = [];

      if (userId) {
        try {
          // Build status filter
          let statusFilter = "";
          if (status === "active") {
            statusFilter = '.eq("is_active",true)';
          } else if (status === "inactive") {
            statusFilter = '.eq("is_active",false)';
          }
          // For "all" we don't filter by status

          // Fetch surveys created by the user
          let createdByUserQuery = supabase
            .from("surveys")
            .select(
              "id, title, start_date, end_date, is_active, questionnaire_id, created_by, created_at",
            )
            .eq("created_by", userId);

          if (status === "active") {
            createdByUserQuery = createdByUserQuery
              .eq("is_active", true)
              .or("end_date.is.null,end_date.gt.now()");
          } else if (status === "inactive") {
            createdByUserQuery = createdByUserQuery.or(
              "is_active.eq.false,and(is_active.eq.true,end_date.lt.now())",
            );
          }

          const { data: createdByUser, error: error1 } =
            await createdByUserQuery.order("created_at", { ascending: false });
          if (error1) throw error1;

          // Fetch surveys where user has access
          const { data: withAccess, error: error2 } = await supabase
            .from("survey_access")
            .select(
              "surveys(id, title, start_date, end_date, is_active, questionnaire_id, created_by, created_at)",
            )
            .eq("user_id", userId);
          if (error2) throw error2;

          // Combine and deduplicate surveys
          const surveyMap = new Map<number, any>();
          (createdByUser ?? []).forEach((s) => surveyMap.set((s as any).id, s));

          const accessSurveys = (withAccess ?? [])
            .map((item: any) => item.surveys)
            .filter(Boolean) as any[];

          accessSurveys.forEach((s) => {
            if (!surveyMap.has(s.id)) {
              let matches = true;
              if (status === "active") {
                matches =
                  s.is_active &&
                  (!s.end_date || new Date(s.end_date) > new Date());
              } else if (status === "inactive") {
                matches =
                  !s.is_active ||
                  (s.is_active &&
                    s.end_date &&
                    new Date(s.end_date) < new Date());
              }
              if (matches) {
                surveyMap.set(s.id, s);
              }
            }
          });

          // Apply advanced filters
          let filteredSurveys = Array.from(surveyMap.values());

          if (questionnaireIds && questionnaireIds.length > 0) {
            filteredSurveys = filteredSurveys.filter((s) =>
              questionnaireIds.includes(s.questionnaire_id),
            );
          }
          if (creatorIds && creatorIds.length > 0) {
            filteredSurveys = filteredSurveys.filter((s) =>
              creatorIds.includes(s.created_by),
            );
          }

          // Filter by creation date range
          if (creationDateFrom) {
            const fromDate = new Date(creationDateFrom);
            filteredSurveys = filteredSurveys.filter(
              (s) => new Date(s.created_at) >= fromDate,
            );
          }

          if (creationDateTo) {
            const toDate = new Date(creationDateTo);
            toDate.setHours(23, 59, 59, 999);
            filteredSurveys = filteredSurveys.filter(
              (s) => new Date(s.created_at) <= toDate,
            );
          }

          // Filter by programs if needed
          if (programIds && programIds.length > 0) {
            const surveyIds = filteredSurveys.map((s) => s.id);
            const { data: surveyPrograms, error: programsError } =
              await supabase
                .from("survey_programs")
                .select("survey_id, program_id")
                .in("survey_id", surveyIds);

            if (!programsError && surveyPrograms) {
              const surveysWithPrograms = new Set<number>();
              surveyPrograms.forEach((sp: any) => {
                if (programIds.includes(sp.program_id)) {
                  surveysWithPrograms.add(sp.survey_id);
                }
              });
              filteredSurveys = filteredSurveys.filter((s) =>
                surveysWithPrograms.has(s.id),
              );
            }
          }

          // Filter by group if needed
          if (groupId) {
            const surveyIds = filteredSurveys.map((s) => s.id);
            const { data: surveyGroups, error: groupsError } = await supabase
              .from("survey_groups")
              .select("survey_id")
              .eq("id", groupId)
              .in("survey_id", surveyIds);

            if (!groupsError && surveyGroups) {
              const surveysWithGroup = new Set<number>();
              surveyGroups.forEach((sg: any) => {
                surveysWithGroup.add(sg.survey_id);
              });
              filteredSurveys = filteredSurveys.filter((s) =>
                surveysWithGroup.has(s.id),
              );
            }
          }

          // Convert to array, sort by created_at descending, and apply pagination
          surveys = filteredSurveys
            .sort(
              (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime(),
            )
            .slice(offset, offset + limit);

          // Total count is the number of unique surveys
          total = surveyMap.size;
        } catch (err: any) {
          // Fallback to surveys created by user only
          let query = supabase
            .from("surveys")
            .select("id", { count: "exact", head: true })
            .eq("created_by", userId);

          if (status === "active") {
            query = query
              .eq("is_active", true)
              .or("end_date.is.null,end_date.gt.now()");
          } else if (status === "inactive") {
            query = query.or(
              "is_active.eq.false,and(is_active.eq.true,end_date.lt.now())",
            );
          }

          const { count, error: countErr } = await query;
          if (countErr) throw countErr;
          total = count ?? 0;

          let dataQuery = supabase
            .from("surveys")
            .select(
              "id, title, start_date, end_date, is_active, questionnaire_id, created_by, created_at",
            )
            .eq("created_by", userId);

          if (status === "active") {
            dataQuery = dataQuery
              .eq("is_active", true)
              .or("end_date.is.null,end_date.gt.now()");
          } else if (status === "inactive") {
            dataQuery = dataQuery.or(
              "is_active.eq.false,and(is_active.eq.true,end_date.lt.now())",
            );
          }

          let { data, error } = await dataQuery
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

          if (error) throw error;
          surveys = data ?? [];

          // Apply advanced filters to fallback data
          if (questionnaireIds && questionnaireIds.length > 0) {
            surveys = surveys.filter((s: any) =>
              questionnaireIds.includes(s.questionnaire_id),
            );
          }
          if (creatorIds && creatorIds.length > 0) {
            surveys = surveys.filter((s: any) =>
              creatorIds.includes(s.created_by),
            );
          }

          // Filter by creation date range
          if (creationDateFrom) {
            const fromDate = new Date(creationDateFrom);
            surveys = surveys.filter(
              (s: any) => new Date(s.created_at) >= fromDate,
            );
          }

          if (creationDateTo) {
            const toDate = new Date(creationDateTo);
            toDate.setHours(23, 59, 59, 999);
            surveys = surveys.filter(
              (s: any) => new Date(s.created_at) <= toDate,
            );
          }

          // Filter by programs if needed
          if (programIds && programIds.length > 0) {
            const surveyIds = surveys.map((s: any) => s.id);
            const { data: surveyPrograms, error: programsError } =
              await supabase
                .from("survey_programs")
                .select("survey_id, program_id")
                .in("survey_id", surveyIds);

            if (!programsError && surveyPrograms) {
              const surveysWithPrograms = new Set<number>();
              surveyPrograms.forEach((sp: any) => {
                if (programIds.includes(sp.program_id)) {
                  surveysWithPrograms.add(sp.survey_id);
                }
              });
              surveys = surveys.filter((s: any) =>
                surveysWithPrograms.has(s.id),
              );
            }
          }

          // Filter by group if needed
          if (groupId) {
            const surveyIds = surveys.map((s: any) => s.id);
            const { data: surveyGroups, error: groupsError } = await supabase
              .from("survey_groups")
              .select("survey_id")
              .eq("id", groupId)
              .in("survey_id", surveyIds);

            if (!groupsError && surveyGroups) {
              const surveysWithGroup = new Set<number>();
              surveyGroups.forEach((sg: any) => {
                surveysWithGroup.add(sg.survey_id);
              });
              surveys = surveys.filter((s: any) => surveysWithGroup.has(s.id));
            }
          }
        }
      } else {
        let countQuery = supabase
          .from("surveys")
          .select("id", { count: "exact", head: true });

        if (status === "active") {
          countQuery = countQuery
            .eq("is_active", true)
            .or("end_date.is.null,end_date.gt.now()");
        } else if (status === "inactive") {
          countQuery = countQuery.or(
            "is_active.eq.false,and(is_active.eq.true,end_date.lt.now())",
          );
        }

        const { count, error: countErr } = await countQuery;
        if (countErr) throw countErr;
        total = count ?? 0;

        let dataQuery = supabase
          .from("surveys")
          .select(
            "id, title, start_date, end_date, is_active, questionnaire_id, created_by, created_at",
          );

        if (status === "active") {
          dataQuery = dataQuery
            .eq("is_active", true)
            .or("end_date.is.null,end_date.gt.now()");
        } else if (status === "inactive") {
          dataQuery = dataQuery.eq("is_active", false);
        }

        let { data, error } = await dataQuery
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1);

        if (!error && data) {
          // Apply advanced filters
          if (questionnaireIds && questionnaireIds.length > 0) {
            data = data.filter((s: any) =>
              questionnaireIds.includes(s.questionnaire_id),
            );
          }
          if (creatorIds && creatorIds.length > 0) {
            data = data.filter((s: any) => creatorIds.includes(s.created_by));
          }

          // Filter by creation date range
          if (creationDateFrom) {
            const fromDate = new Date(creationDateFrom);
            data = data.filter((s: any) => new Date(s.created_at) >= fromDate);
          }

          if (creationDateTo) {
            const toDate = new Date(creationDateTo);
            toDate.setHours(23, 59, 59, 999);
            data = data.filter((s: any) => new Date(s.created_at) <= toDate);
          }

          // Filter by programs if needed
          if (programIds && programIds.length > 0) {
            const surveyIds = data.map((s: any) => s.id);
            const { data: surveyPrograms, error: programsError } =
              await supabase
                .from("survey_programs")
                .select("survey_id, program_id")
                .in("survey_id", surveyIds);

            if (!programsError && surveyPrograms) {
              const surveysWithPrograms = new Set<number>();
              surveyPrograms.forEach((sp: any) => {
                if (programIds.includes(sp.program_id)) {
                  surveysWithPrograms.add(sp.survey_id);
                }
              });
              data = data.filter((s: any) => surveysWithPrograms.has(s.id));
            }
          }

          // Filter by group if needed
          if (groupId) {
            const surveyIds = data.map((s: any) => s.id);
            const { data: surveyGroups, error: groupsError } = await supabase
              .from("survey_groups")
              .select("survey_id")
              .eq("id", groupId)
              .in("survey_id", surveyIds);

            if (!groupsError && surveyGroups) {
              const surveysWithGroup = new Set<number>();
              surveyGroups.forEach((sg: any) => {
                surveysWithGroup.add(sg.survey_id);
              });
              data = data.filter((s: any) => surveysWithGroup.has(s.id));
            }
          }
        }

        if (error) throw error;
        surveys = data ?? [];
      }

      const qIds = Array.from(
        new Set((surveys ?? []).map((s) => s.questionnaire_id).filter(Boolean)),
      );
      let qTitleById: Record<number, string> = {};
      if (qIds.length) {
        const { data: questionnaires, error: qErr } = await supabase
          .from("questionnaires")
          .select("id, title")
          .in("id", qIds as number[]);
        if (qErr) throw qErr;
        qTitleById = Object.fromEntries(
          (questionnaires ?? []).map((q) => [q.id, q.title]),
        );
      }

      formattedSurveys = (surveys ?? []).map((s) => {
        const description =
          (s as any).title ||
          qTitleById[(s as any).questionnaire_id as number] ||
          "Опрос";
        return {
          id: (s as any).id,
          dateRange: this.formatDateRange(
            (s as any).start_date as any,
            (s as any).end_date as any,
          ),
          description,
          target: this.getTargetFromDescription(description),
          isActive: (s as any).is_active as boolean,
          created_at: (s as any).created_at,
        };
      });
    } else {
      // PostgreSQL fallback
      let whereClause = "";
      const queryParams: any[] = [];

      if (status === "active") {
        whereClause =
          "s.is_active = true AND (s.end_date IS NULL OR s.end_date > NOW())";
      } else if (status === "inactive") {
        whereClause =
          "s.is_active = false OR (s.is_active = true AND s.end_date IS NOT NULL AND s.end_date < NOW())";
      } else {
        // "all" - no filter
        whereClause = "1 = 1";
      }

      if (userId) {
        whereClause += ` AND (s.created_by = $${queryParams.length + 1} OR EXISTS (SELECT 1 FROM survey_access sa WHERE sa.survey_id = s.id AND sa.user_id = $${queryParams.length + 2}))`;
        queryParams.push(userId, userId);
      }

      // Add questionnaire filter
      if (questionnaireIds && questionnaireIds.length > 0) {
        whereClause += ` AND s.questionnaire_id = ANY($${queryParams.length + 1})`;
        queryParams.push(questionnaireIds);
      }

      // Add creator filter
      if (creatorIds && creatorIds.length > 0) {
        whereClause += ` AND s.created_by = ANY($${queryParams.length + 1})`;
        queryParams.push(creatorIds);
      }

      // Add creation date range filter
      if (creationDateFrom) {
        whereClause += ` AND s.created_at >= $${queryParams.length + 1}`;
        queryParams.push(new Date(creationDateFrom));
      }

      if (creationDateTo) {
        const toDate = new Date(creationDateTo);
        toDate.setHours(23, 59, 59, 999);
        whereClause += ` AND s.created_at <= $${queryParams.length + 1}`;
        queryParams.push(toDate);
      }

      // Add program filter (needs join to survey_programs table)
      let joinClause = "";
      if (programIds && programIds.length > 0) {
        joinClause = ` INNER JOIN survey_programs sp ON s.id = sp.survey_id`;
        whereClause += ` AND sp.program_id = ANY($${queryParams.length + 1})`;
        queryParams.push(programIds);
      }

      // Add group filter (needs join to groups table)
      if (groupId) {
        joinClause += ` INNER JOIN groups g ON s.id = g.survey_id`;
        whereClause += ` AND g.id = $${queryParams.length + 1}`;
        queryParams.push(groupId);
      }

      const result = await query(
        `SELECT s.id, s.title as description, s.start_date, s.end_date, s.is_active, s.created_at,
         q.title as questionnaire_title
         FROM surveys s
         LEFT JOIN questionnaires q ON s.questionnaire_id = q.id
         ${joinClause}
         WHERE ${whereClause}
         ORDER BY s.created_at DESC
         LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`,
        [...queryParams, limit, offset],
      );

      const countResult = await query(
        `SELECT COUNT(DISTINCT s.id) FROM surveys s
         LEFT JOIN questionnaires q ON s.questionnaire_id = q.id
         ${joinClause}
         WHERE ${whereClause}`,
        queryParams,
      );

      total = parseInt(countResult.rows[0].count);

      formattedSurveys = result.rows.map((survey) => ({
        id: survey.id,
        dateRange: this.formatDateRange(survey.start_date, survey.end_date),
        description:
          survey.description || survey.questionnaire_title || "Опрос",
        target: this.getTargetFromDescription(
          survey.description || survey.questionnaire_title,
        ),
        isActive: survey.is_active,
        created_at: survey.created_at,
      }));
    }

    const result: PaginatedResponse<SurveyCardData> = {
      items: formattedSurveys,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };

    return result;
  }

  // Создать новый опрос
  async createSurvey(
    surveyData: Omit<Survey, "id" | "created_at">,
  ): Promise<Survey> {
    let created: any;

    if (prismaEnabled) {
      created = await prisma!.survey.create({
        data: {
          questionnaire_id: (surveyData as any).questionnaire_id ?? null,
          title: surveyData.title,
          is_active: surveyData.is_active,
          start_date: surveyData.start_date as any,
          end_date: surveyData.end_date as any,
          unique_link: surveyData.unique_link,
          created_by: surveyData.created_by,
        },
      });

      if (surveyData.created_by) {
        await prisma!.surveyAccess.upsert({
          where: {
            survey_id_user_id: {
              survey_id: created.id,
              user_id: surveyData.created_by,
            },
          },
          update: {},
          create: {
            survey_id: created.id,
            user_id: surveyData.created_by,
          },
        });
      }

      return created as unknown as Survey;
    } else if (supabase) {
      const { data, error } = await supabase
        .from("surveys")
        .insert({
          questionnaire_id: (surveyData as any).questionnaire_id ?? null,
          title: surveyData.title,
          is_active: surveyData.is_active,
          start_date: surveyData.start_date as any,
          end_date: surveyData.end_date as any,
          unique_link: surveyData.unique_link,
          created_by: surveyData.created_by,
        })
        .select()
        .single();
      if (error) throw error;

      if (surveyData.created_by) {
        await supabase.from("survey_access").upsert(
          {
            survey_id: data.id,
            user_id: surveyData.created_by,
          },
          { onConflict: "survey_id,user_id" },
        );
      }

      return data as unknown as Survey;
    } else {
      const result = await query(
        `INSERT INTO surveys
         (questionnaire_id, title, is_active, start_date, end_date, unique_link, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          (surveyData as any).questionnaire_id ?? null,
          surveyData.title,
          surveyData.is_active,
          surveyData.start_date,
          surveyData.end_date,
          surveyData.unique_link,
          surveyData.created_by,
        ],
      );
      created = result.rows[0];

      if (surveyData.created_by) {
        await query(
          `INSERT INTO survey_access (survey_id, user_id)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [created.id, surveyData.created_by],
        );
      }

      return created;
    }
  }

  // Обновить опрос
  async updateSurvey(
    id: number,
    surveyData: Partial<Survey>,
  ): Promise<Survey | null> {
    if (prismaEnabled) {
      const updated = await prisma!.survey.update({
        where: { id },
        data: surveyData as any,
      });
      return updated as unknown as Survey;
    } else if (supabase) {
      const { data, error } = await supabase
        .from("surveys")
        .update(surveyData as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return (data as unknown as Survey) || null;
    } else {
      const fields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      for (const [key, value] of Object.entries(surveyData)) {
        if (value !== undefined && key !== "id" && key !== "created_at") {
          fields.push(`${key} = $${paramCount}`);
          values.push(value);
          paramCount++;
        }
      }

      if (fields.length === 0) {
        throw new Error("No fields to update");
      }

      values.push(id);
      const result = await query(
        `UPDATE surveys SET ${fields.join(", ")} WHERE id = $${paramCount} RETURNING *`,
        values,
      );
      return result.rows[0] || null;
    }
  }

  // Programs attached to a survey
  async getProgramsForSurvey(surveyId: number): Promise<any[]> {
    if (prismaEnabled) {
      const items = await prisma!.survey.findUnique({
        where: { id: surveyId },
        include: { programs: true },
      });
      return (items as any)?.programs || [];
    } else if (supabase) {
      const { data, error } = await supabase
        .from("survey_programs")
        .select("programs(id, code, name, program_name)")
        .eq("survey_id", surveyId);
      if (error) throw error;
      return (data ?? []).map((r: any) => r.programs);
    } else {
      const result = await query(
        `SELECT p.* FROM programs p JOIN survey_programs sp ON sp.program_id = p.id WHERE sp.survey_id = $1 ORDER BY p.created_at DESC`,
        [surveyId],
      );
      return result.rows;
    }
  }

  async addProgramToSurvey(surveyId: number, programId: number) {
    if (prismaEnabled) {
      await prisma!.survey.update({
        where: { id: surveyId },
        data: { programs: { connect: { id: programId } } },
      });
      return true;
    } else if (supabase) {
      const { data, error } = await supabase
        .from("survey_programs")
        .insert({ survey_id: surveyId, program_id: programId })
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const result = await query(
        `INSERT INTO survey_programs (survey_id, program_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *`,
        [surveyId, programId],
      );
      return result.rows[0];
    }
  }

  async removeProgramFromSurvey(surveyId: number, programId: number) {
    if (prismaEnabled) {
      await prisma!.survey.update({
        where: { id: surveyId },
        data: { programs: { disconnect: { id: programId } } },
      });
      return true;
    } else if (supabase) {
      const { error } = await supabase
        .from("survey_programs")
        .delete()
        .match({ survey_id: surveyId, program_id: programId });
      if (error) throw error;
      return true;
    } else {
      const result = await query(
        `DELETE FROM survey_programs WHERE survey_id = $1 AND program_id = $2`,
        [surveyId, programId],
      );
      return result.rowCount > 0;
    }
  }

  // Groups per survey
  async getGroupsForSurvey(surveyId: number) {
    if (prismaEnabled) {
      const items = await prisma!.survey.findUnique({
        where: { id: surveyId },
        include: { survey_groups: true },
      });
      return (items as any)?.survey_groups || [];
    } else if (supabase) {
      const { data, error } = await supabase
        .from("survey_groups")
        .select("*")
        .eq("survey_id", surveyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    } else {
      const result = await query(
        "SELECT * FROM survey_groups WHERE survey_id = $1 ORDER BY created_at DESC",
        [surveyId],
      );
      return result.rows;
    }
  }

  // Get all distinct groups for user's surveys
  async getAvailableGroupsForUser(
    userId?: number,
  ): Promise<Array<{ id: number; name: string }>> {
    if (prismaEnabled) {
      const where: any = {};
      if (userId) {
        where.OR = [
          { survey: { created_by: userId } },
          { survey: { access: { some: { user_id: userId } } } },
        ];
      }

      const groups = await prisma!.survey_group.findMany({
        where,
        distinct: ["name"],
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      });
      return groups;
    } else if (supabase) {
      try {
        if (userId) {
          // Get survey IDs for surveys created by user
          const { data: createdByUser, error: err1 } = await supabase
            .from("surveys")
            .select("id")
            .eq("created_by", userId);
          if (err1) throw err1;

          logger.info(
            `Found ${createdByUser?.length || 0} surveys created by user ${userId}`,
          );

          // Get survey IDs for surveys shared with user
          const { data: sharedWithUser, error: err2 } = await supabase
            .from("survey_access")
            .select("survey_id")
            .eq("user_id", userId);
          if (err2) throw err2;

          logger.info(
            `Found ${sharedWithUser?.length || 0} surveys shared with user ${userId}`,
          );

          // Combine and deduplicate survey IDs
          const surveyIds = new Set<number>();
          (createdByUser ?? []).forEach((s: any) => surveyIds.add(s.id));
          (sharedWithUser ?? []).forEach((s: any) =>
            surveyIds.add(s.survey_id),
          );

          logger.info(`Total unique survey IDs: ${surveyIds.size}`);

          if (surveyIds.size === 0) {
            logger.info(`No surveys found for user ${userId}`);
            return [];
          }

          // Get groups for these surveys
          const { data: groups, error: groupError } = await supabase
            .from("survey_groups")
            .select("id, name")
            .in("survey_id", Array.from(surveyIds))
            .order("name", { ascending: true });

          if (groupError) throw groupError;

          logger.info(`Found ${groups?.length || 0} groups for user ${userId}`);

          // Deduplicate by name
          const seen = new Set<string>();
          const result: Array<{ id: number; name: string }> = [];
          for (const group of groups || []) {
            if (!seen.has(group.name)) {
              seen.add(group.name);
              result.push(group);
            }
          }
          logger.info(
            `Returning ${result.length} unique groups: ${result.map((g) => g.name).join(", ")}`,
          );
          return result;
        } else {
          // If no userId, return all groups
          const { data, error } = await supabase
            .from("survey_groups")
            .select("id, name")
            .order("name", { ascending: true });

          if (error) throw error;

          // Deduplicate by name
          const seen = new Set<string>();
          const result: Array<{ id: number; name: string }> = [];
          for (const group of data || []) {
            if (!seen.has(group.name)) {
              seen.add(group.name);
              result.push(group);
            }
          }
          return result;
        }
      } catch (error: any) {
        console.error("Error fetching groups:", error);
        throw error;
      }
    } else {
      let sql =
        "SELECT DISTINCT ON (name) id, name FROM survey_groups WHERE survey_id IN (SELECT id FROM surveys";
      const params: any[] = [];

      if (userId) {
        sql +=
          " WHERE created_by = $1 OR id IN (SELECT survey_id FROM survey_access WHERE user_id = $2)";
        params.push(userId, userId);
      }

      sql += ") ORDER BY name ASC";

      const result = await query(sql, params);
      return result.rows;
    }
  }

  async createGroupForSurvey(
    surveyId: number,
    groupData: { name: string; group_type?: string },
  ) {
    if (prismaEnabled) {
      const existing = await prisma!.survey_group.findFirst({
        where: {
          survey_id: surveyId,
          name: groupData.name,
        },
      });
      if (existing) {
        return existing;
      }
      const created = await prisma!.survey_group.create({
        data: {
          survey_id: surveyId,
          name: groupData.name,
          group_type: groupData.group_type,
        },
      });
      return created;
    } else if (supabase) {
      const { data: existing } = await supabase
        .from("survey_groups")
        .select()
        .eq("survey_id", surveyId)
        .eq("name", groupData.name)
        .single();
      if (existing) {
        return existing;
      }
      const { data, error } = await supabase
        .from("survey_groups")
        .insert({
          survey_id: surveyId,
          name: groupData.name,
          group_type: groupData.group_type,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const result = await query(
        "SELECT * FROM survey_groups WHERE survey_id = $1 AND name = $2",
        [surveyId, groupData.name],
      );
      if (result.rows.length > 0) {
        return result.rows[0];
      }
      const insertResult = await query(
        "INSERT INTO survey_groups (survey_id, name, group_type) VALUES ($1, $2, $3) RETURNING *",
        [surveyId, groupData.name, groupData.group_type],
      );
      return insertResult.rows[0];
    }
  }

  async deleteGroupFromSurvey(groupId: number) {
    if (prismaEnabled) {
      await prisma!.survey_group.delete({ where: { id: groupId } });
      return true;
    } else if (supabase) {
      const { error } = await supabase
        .from("survey_groups")
        .delete()
        .eq("id", groupId);
      if (error) throw error;
      return true;
    } else {
      const result = await query("DELETE FROM survey_groups WHERE id = $1", [
        groupId,
      ]);
      return result.rowCount > 0;
    }
  }

  // Удалить опрос (мягкое удаление через is_active)
  async deleteSurvey(id: number): Promise<boolean> {
    if (prismaEnabled) {
      await prisma!.survey.update({
        where: { id },
        data: { is_active: false },
      });
      return true;
    } else if (supabase) {
      const { error } = await supabase
        .from("surveys")
        .update({ is_active: false })
        .eq("id", id);
      if (error) throw error;
      return true;
    } else {
      const result = await query(
        "UPDATE surveys SET is_active = false WHERE id = $1",
        [id],
      );
      return result.rowCount > 0;
    }
  }

  // Форматирование дат в строку "дд.мм.гггг-дд.мм.гггг"
  private formatDateRange(
    startDate: Date | null,
    endDate: Date | null,
  ): string {
    if (!startDate && !endDate) return "Дата не указана";

    const formatDate = (date: Date) => {
      return new Date(date)
        .toLocaleDateString("ru-RU", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
        .replace(/\//g, ".");
    };

    if (startDate && endDate) {
      return `${formatDate(startDate)}-${formatDate(endDate)}`;
    } else if (startDate) {
      return `${formatDate(startDate)}-∞`;
    } else {
      return `∞-${formatDate(endDate!)}`;
    }
  }

  // О��ределение целевой аудитории из описания
  private getTargetFromDescription(description: string): string {
    const lowerDesc = description.toLowerCase();

    if (lowerDesc.includes("обучающ") || lowerDesc.includes("студент")) {
      return "Обучающиеся";
    } else if (
      lowerDesc.includes("преподавател") ||
      lowerDesc.includes("учител")
    ) {
      return "Преподаватели";
    } else if (
      lowerDesc.includes("сотрудник") ||
      lowerDesc.includes("работник")
    ) {
      return "Сотрудники";
    } else if (lowerDesc.includes("выпускник")) {
      return "Выпускники";
    } else {
      return "Все категории";
    }
  }

  // Сохранить ответы пользователя на опрос
  async saveSurveyResponse(
    surveyId: number,
    answers: Array<{ question_id: number; answer_data: any }>,
    deviceFingerprint?: string,
  ): Promise<number> {
    const startedAt = new Date();
    const completedAt = new Date();

    if (prismaEnabled) {
      const response = await prisma!.survey_response.create({
        data: {
          survey_id: surveyId,
          device_fingerprint: deviceFingerprint,
          started_at: startedAt,
          completed_at: completedAt,
          status: "completed",
        },
      });

      for (const answer of answers) {
        await prisma!.question_response.create({
          data: {
            response_id: response.id,
            question_id: answer.question_id,
            answer_data: answer.answer_data,
          },
        });
      }

      return response.id;
    } else if (supabase) {
      try {
        const { data: response, error: responseError } = await supabase
          .from("survey_responses")
          .insert({
            survey_id: surveyId,
            device_fingerprint: deviceFingerprint,
            started_at: startedAt.toISOString(),
            completed_at: completedAt.toISOString(),
            status: "completed",
          })
          .select("id")
          .single();

        if (responseError) throw responseError;

        const questionResponses = answers.map((answer) => ({
          response_id: response.id,
          question_id: answer.question_id,
          answer_data: answer.answer_data,
        }));

        const { error: questionsError } = await supabase
          .from("question_responses")
          .insert(questionResponses);

        if (questionsError) throw questionsError;

        return response.id;
      } catch (error: any) {
        if (isSupabaseMissingTableError(error)) {
          return recordInMemoryResponse(surveyId, answers);
        }
        throw error;
      }
    } else {
      const responseResult = await query(
        `INSERT INTO survey_responses (survey_id, device_fingerprint, started_at, completed_at, status)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [surveyId, deviceFingerprint, startedAt, completedAt, "completed"],
      );

      const responseId = responseResult.rows[0].id;

      for (const answer of answers) {
        await query(
          `INSERT INTO question_responses (response_id, question_id, answer_data)
           VALUES ($1, $2, $3)`,
          [responseId, answer.question_id, JSON.stringify(answer.answer_data)],
        );
      }

      return responseId;
    }
  }

  // Получить все ответы на опрос
  async getSurveyResponses(surveyId: number): Promise<
    Array<{
      id: number;
      survey_id: number;
      started_at: string;
      completed_at: string;
      status: string;
    }>
  > {
    if (prismaEnabled) {
      const responses = await prisma!.survey_response.findMany({
        where: { survey_id: surveyId },
        orderBy: { completed_at: "desc" },
      });
      return responses as any;
    } else if (supabase) {
      const { data, error } = await supabase
        .from("survey_responses")
        .select("*")
        .eq("survey_id", surveyId)
        .order("completed_at", { ascending: false });
      if (error) throw error;
      return data || [];
    } else {
      const result = await query(
        `SELECT * FROM survey_responses WHERE survey_id = $1 ORDER BY completed_at DESC`,
        [surveyId],
      );
      return result.rows;
    }
  }

  // Получить детали ответа на опрос (все ответы на вопросы)
  async getSurveyResponseDetail(responseId: number): Promise<{
    response: {
      id: number;
      survey_id: number;
      started_at: string;
      completed_at: string;
      status: string;
    };
    answers: Array<{
      id?: number;
      response_id: number;
      question_id: number;
      answer_data: any;
    }>;
  } | null> {
    if (prismaEnabled) {
      const response = await prisma!.survey_response.findUnique({
        where: { id: responseId },
        include: { question_response: true },
      });
      if (!response) return null;
      return {
        response: response as any,
        answers: response.question_response as any,
      };
    } else if (supabase) {
      const { data: responseData, error: respError } = await supabase
        .from("survey_responses")
        .select("*")
        .eq("id", responseId)
        .single();
      if (respError) throw respError;
      if (!responseData) return null;

      const { data: answersData, error: ansError } = await supabase
        .from("question_responses")
        .select("*")
        .eq("response_id", responseId);
      if (ansError) throw ansError;

      return {
        response: responseData,
        answers: answersData || [],
      };
    } else {
      const respResult = await query(
        `SELECT * FROM survey_responses WHERE id = $1`,
        [responseId],
      );
      if (respResult.rows.length === 0) return null;

      const ansResult = await query(
        `SELECT * FROM question_responses WHERE response_id = $1`,
        [responseId],
      );

      return {
        response: respResult.rows[0],
        answers: ansResult.rows,
      };
    }
  }

  // Проверить, прошел ли пользователь опрос с этого устройства
  async checkDuplicateFingerprint(
    surveyId: number,
    deviceFingerprint: string,
  ): Promise<boolean> {
    if (prismaEnabled) {
      const existing = await prisma!.survey_response.findFirst({
        where: {
          survey_id: surveyId,
          device_fingerprint: deviceFingerprint,
        },
      });
      return !!existing;
    } else if (supabase) {
      try {
        const { data, error } = await supabase
          .from("survey_responses")
          .select("id")
          .eq("survey_id", surveyId)
          .eq("device_fingerprint", deviceFingerprint)
          .limit(1);

        if (error) throw error;
        return (data && data.length > 0) || false;
      } catch (error: any) {
        if (isSupabaseMissingTableError(error)) {
          return false;
        }
        throw error;
      }
    } else {
      const result = await query(
        `SELECT id FROM survey_responses WHERE survey_id = $1 AND device_fingerprint = $2 LIMIT 1`,
        [surveyId, deviceFingerprint],
      );
      return result.rows.length > 0;
    }
  }
}

export const surveysRepository = new SurveysRepository();
