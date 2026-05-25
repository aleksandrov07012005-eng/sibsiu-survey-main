import { query } from "../db/config";

export class AccessRepository {

  async getQuestionnaireAccessUsers(
    questionnaireId: number,
  ): Promise<number[]> {
    const result = await query(
      `SELECT user_id FROM questionnaire_access WHERE questionnaire_id = $1`,
      [questionnaireId],
    );
    return result.rows.map((a: any) => a.user_id);
  }


  async getSurveyAccessUsers(surveyId: number): Promise<number[]> {
    const result = await query(
      `SELECT user_id FROM survey_access WHERE survey_id = $1`,
      [surveyId],
    );
    return result.rows.map((a: any) => a.user_id);
  }


  async grantQuestionnaireAccess(
    questionnaireId: number,
    userId: number,
  ): Promise<void> {
    await query(
      `INSERT INTO questionnaire_access (questionnaire_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (questionnaire_id, user_id) DO NOTHING`,
      [questionnaireId, userId],
    );
  }


  async grantSurveyAccess(surveyId: number, userId: number): Promise<void> {
    await query(
      `INSERT INTO survey_access (survey_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (survey_id, user_id) DO NOTHING`,
      [surveyId, userId],
    );
  }

  async revokeQuestionnaireAccess(
    questionnaireId: number,
    userId: number,
  ): Promise<void> {
    await query(
      `DELETE FROM questionnaire_access WHERE questionnaire_id = $1 AND user_id = $2`,
      [questionnaireId, userId],
    );
  }


  async revokeSurveyAccess(surveyId: number, userId: number): Promise<void> {
    await query(
      `DELETE FROM survey_access WHERE survey_id = $1 AND user_id = $2`,
      [surveyId, userId],
    );
  }


  async getProgramAccessUsers(programId: number): Promise<number[]> {
    const result = await query(
      `SELECT user_id FROM program_access WHERE program_id = $1`,
      [programId],
    );
    return result.rows.map((a: any) => a.user_id);
  }


  async grantProgramAccess(programId: number, userId: number): Promise<void> {
    await query(
      `INSERT INTO program_access (program_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (program_id, user_id) DO NOTHING`,
      [programId, userId],
    );
  }


  async revokeProgramAccess(programId: number, userId: number): Promise<void> {
    await query(
      `DELETE FROM program_access WHERE program_id = $1 AND user_id = $2`,
      [programId, userId],
    );
  }
}

export const accessRepository = new AccessRepository();
