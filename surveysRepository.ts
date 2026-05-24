import { Survey, PaginatedResponse, SurveyCardData } from "@shared/types";
import { query } from "../db/config";
import { redisGet, redisSet } from "../db/redisClient";
import { logger } from "../logger";

type SurveyAnswerPayload = {
  question_id: number;
  answer_data: any;
};

export class SurveysRepository {

  async getSurveyById(id: number): Promise<Survey | null> {
    const result = await query("SELECT * FROM surveys WHERE id = $1", [id]);
    return (result.rows[0] as Survey) || null;
  }


  async getActiveSurveysForHome(
    page: number = 1,
    limit: number = 10,
    userId?: number,
  ): Promise<PaginatedResponse<SurveyCardData>> {

    await this.deactivateExpiredSurveys();

    const offset = (page - 1) * limit;
    let formattedSurveys: SurveyCardData[] = [];
    let total = 0;

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

    const result2: PaginatedResponse<SurveyCardData> = {
      items: formattedSurveys,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };

    return result2;
  }


  private async deactivateExpiredSurveys(): Promise<void> {
    try {
      await query(
        "UPDATE surveys SET is_active = false WHERE is_active = true AND end_date < NOW()",
        [],
      );
    } catch (error) {
      logger.error("Error deactivating expired surveys", { error });
    }
  }


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

    await this.deactivateExpiredSurveys();

    const offset = (page - 1) * limit;
    let formattedSurveys: SurveyCardData[] = [];
    let total = 0;


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

    if (questionnaireIds && questionnaireIds.length > 0) {
      whereClause += ` AND s.questionnaire_id = ANY($${queryParams.length + 1})`;
      queryParams.push(questionnaireIds);
    }

    if (creatorIds && creatorIds.length > 0) {
      whereClause += ` AND s.created_by = ANY($${queryParams.length + 1})`;
      queryParams.push(creatorIds);
    }


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


    let joinClause = "";
    if (programIds && programIds.length > 0) {
      joinClause = ` INNER JOIN survey_programs sp ON s.id = sp.survey_id`;
      whereClause += ` AND sp.program_id = ANY($${queryParams.length + 1})`;
      queryParams.push(programIds);
    }

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

    const finalResult: PaginatedResponse<SurveyCardData> = {
      items: formattedSurveys,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };

    return finalResult;
  }

  async createSurvey(
    surveyData: Omit<Survey, "id" | "created_at">,
  ): Promise<Survey> {
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
    const created = result.rows[0];

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


  async updateSurvey(
    id: number,
    surveyData: Partial<Survey>,
  ): Promise<Survey | null> {
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


  async getProgramsForSurvey(surveyId: number): Promise<any[]> {
    const result = await query(
      `SELECT p.* FROM programs p JOIN survey_programs sp ON sp.program_id = p.id WHERE sp.survey_id = $1 ORDER BY p.created_at DESC`,
      [surveyId],
    );
    return result.rows;
  }

  async addProgramToSurvey(surveyId: number, programId: number) {
    const result = await query(
      `INSERT INTO survey_programs (survey_id, program_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *`,
      [surveyId, programId],
    );
    return result.rows[0];
  }

  async removeProgramFromSurvey(surveyId: number, programId: number) {
    const result = await query(
      `DELETE FROM survey_programs WHERE survey_id = $1 AND program_id = $2`,
      [surveyId, programId],
    );
    return result.rowCount > 0;
  }

 
  async getGroupsForSurvey(surveyId: number) {
    const result = await query(
      "SELECT * FROM survey_groups WHERE survey_id = $1 ORDER BY created_at DESC",
      [surveyId],
    );
    return result.rows;
  }


  async getAvailableGroupsForUser(
    userId?: number,
  ): Promise<Array<{ id: number; name: string }>> {
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

  async createGroupForSurvey(
    surveyId: number,
    groupData: { name: string; group_type?: string },
  ) {
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

  async deleteGroupFromSurvey(groupId: number) {
    const result = await query("DELETE FROM survey_groups WHERE id = $1", [
      groupId,
    ]);
    return result.rowCount > 0;
  }


  async deleteSurvey(id: number): Promise<boolean> {
    const result = await query(
      "UPDATE surveys SET is_active = false WHERE id = $1",
      [id],
    );
    return result.rowCount > 0;
  }


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


  async saveSurveyResponse(
    surveyId: number,
    answers: Array<{ question_id: number; answer_data: any }>,
    deviceFingerprint?: string,
  ): Promise<number> {
    const startedAt = new Date();
    const completedAt = new Date();

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


  async getSurveyResponses(surveyId: number): Promise<
    Array<{
      id: number;
      survey_id: number;
      started_at: string;
      completed_at: string;
      status: string;
    }>
  > {
    const result = await query(
      `SELECT * FROM survey_responses WHERE survey_id = $1 ORDER BY completed_at DESC`,
      [surveyId],
    );
    return result.rows;
  }


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

  async checkDuplicateFingerprint(
    surveyId: number,
    deviceFingerprint: string,
  ): Promise<boolean> {
    const result = await query(
      `SELECT id FROM survey_responses WHERE survey_id = $1 AND device_fingerprint = $2 LIMIT 1`,
      [surveyId, deviceFingerprint],
    );
    return result.rows.length > 0;
  }
}

export const surveysRepository = new SurveysRepository();
