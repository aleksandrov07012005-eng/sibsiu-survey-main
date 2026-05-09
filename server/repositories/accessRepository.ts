import { prisma } from "../db/prismaClient";
import { supabase } from "../db/supabaseClient";

const prismaEnabled =
  !!process.env.USE_PRISMA && process.env.USE_PRISMA === "true" && !!prisma;

export class AccessRepository {
  // Get users with access to a questionnaire
  async getQuestionnaireAccessUsers(
    questionnaireId: number,
  ): Promise<number[]> {
    if (prismaEnabled) {
      const access = await prisma!.questionnaireAccess.findMany({
        where: { questionnaire_id: questionnaireId },
        select: { user_id: true },
      });
      return access.map((a) => a.user_id);
    }

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("questionnaire_access")
          .select("user_id")
          .eq("questionnaire_id", questionnaireId);
        if (error) throw error;
        return (data || []).map((a: any) => a.user_id);
      } catch (err: any) {
        // If table doesn't exist, return empty array
        if (
          err?.code === "PGRST205" ||
          err?.message?.includes("could not find")
        ) {
          return [];
        }
        throw err;
      }
    }

    return [];
  }

  // Get users with access to a survey
  async getSurveyAccessUsers(surveyId: number): Promise<number[]> {
    if (prismaEnabled) {
      const access = await prisma!.surveyAccess.findMany({
        where: { survey_id: surveyId },
        select: { user_id: true },
      });
      return access.map((a) => a.user_id);
    }

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("survey_access")
          .select("user_id")
          .eq("survey_id", surveyId);
        if (error) throw error;
        return (data || []).map((a: any) => a.user_id);
      } catch (err: any) {
        // If table doesn't exist, return empty array
        if (
          err?.code === "PGRST205" ||
          err?.message?.includes("could not find")
        ) {
          return [];
        }
        throw err;
      }
    }

    return [];
  }

  // Grant access to a user for a questionnaire
  async grantQuestionnaireAccess(
    questionnaireId: number,
    userId: number,
  ): Promise<void> {
    if (prismaEnabled) {
      await prisma!.questionnaireAccess.upsert({
        where: {
          questionnaire_id_user_id: {
            questionnaire_id: questionnaireId,
            user_id: userId,
          },
        },
        update: {},
        create: {
          questionnaire_id: questionnaireId,
          user_id: userId,
        },
      });
    } else if (supabase) {
      try {
        const { error } = await supabase.from("questionnaire_access").upsert(
          {
            questionnaire_id: questionnaireId,
            user_id: userId,
          },
          { onConflict: "questionnaire_id,user_id" },
        );
        if (error) {
          // Handle foreign key constraint error
          if (
            error.code === "23503" &&
            error.message?.includes("questionnaire_id")
          ) {
            throw new Error("Questionnaire not found");
          }
          throw error;
        }
      } catch (err: any) {
        // If table doesn't exist, silently ignore (access control not yet enabled)
        if (
          !(
            err?.code === "PGRST205" || err?.message?.includes("could not find")
          )
        ) {
          throw err;
        }
      }
    }
  }

  // Grant access to a user for a survey
  async grantSurveyAccess(surveyId: number, userId: number): Promise<void> {
    if (prismaEnabled) {
      await prisma!.surveyAccess.upsert({
        where: {
          survey_id_user_id: {
            survey_id: surveyId,
            user_id: userId,
          },
        },
        update: {},
        create: {
          survey_id: surveyId,
          user_id: userId,
        },
      });
    } else if (supabase) {
      try {
        const { error } = await supabase.from("survey_access").upsert(
          {
            survey_id: surveyId,
            user_id: userId,
          },
          { onConflict: "survey_id,user_id" },
        );
        if (error) {
          // Handle foreign key constraint error
          if (error.code === "23503" && error.message?.includes("survey_id")) {
            throw new Error("Survey not found");
          }
          throw error;
        }
      } catch (err: any) {
        // If table doesn't exist, silently ignore (access control not yet enabled)
        if (
          !(
            err?.code === "PGRST205" || err?.message?.includes("could not find")
          )
        ) {
          throw err;
        }
      }
    }
  }

  // Revoke access from a user for a questionnaire
  async revokeQuestionnaireAccess(
    questionnaireId: number,
    userId: number,
  ): Promise<void> {
    if (prismaEnabled) {
      await prisma!.questionnaireAccess.deleteMany({
        where: {
          questionnaire_id: questionnaireId,
          user_id: userId,
        },
      });
    } else if (supabase) {
      try {
        const { error } = await supabase
          .from("questionnaire_access")
          .delete()
          .eq("questionnaire_id", questionnaireId)
          .eq("user_id", userId);
        if (error) throw error;
      } catch (err: any) {
        // If table doesn't exist, silently ignore (access control not yet enabled)
        if (
          !(
            err?.code === "PGRST205" || err?.message?.includes("could not find")
          )
        ) {
          throw err;
        }
      }
    }
  }

  // Revoke access from a user for a survey
  async revokeSurveyAccess(surveyId: number, userId: number): Promise<void> {
    if (prismaEnabled) {
      await prisma!.surveyAccess.deleteMany({
        where: {
          survey_id: surveyId,
          user_id: userId,
        },
      });
    } else if (supabase) {
      try {
        const { error } = await supabase
          .from("survey_access")
          .delete()
          .eq("survey_id", surveyId)
          .eq("user_id", userId);
        if (error) throw error;
      } catch (err: any) {
        // If table doesn't exist, silently ignore (access control not yet enabled)
        if (
          !(
            err?.code === "PGRST205" || err?.message?.includes("could not find")
          )
        ) {
          throw err;
        }
      }
    }
  }

  // Get users with access to a program
  async getProgramAccessUsers(programId: number): Promise<number[]> {
    if (prismaEnabled) {
      const access = await prisma!.programAccess.findMany({
        where: { program_id: programId },
        select: { user_id: true },
      });
      return access.map((a) => a.user_id);
    }

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("program_access")
          .select("user_id")
          .eq("program_id", programId);
        if (error) throw error;
        return (data || []).map((a: any) => a.user_id);
      } catch (err: any) {
        if (
          err?.code === "PGRST205" ||
          err?.message?.includes("could not find")
        ) {
          return [];
        }
        throw err;
      }
    }

    return [];
  }

  // Grant access to a user for a program
  async grantProgramAccess(programId: number, userId: number): Promise<void> {
    if (prismaEnabled) {
      await prisma!.programAccess.upsert({
        where: {
          program_id_user_id: {
            program_id: programId,
            user_id: userId,
          },
        },
        update: {},
        create: {
          program_id: programId,
          user_id: userId,
        },
      });
    } else if (supabase) {
      try {
        const { error } = await supabase.from("program_access").upsert(
          {
            program_id: programId,
            user_id: userId,
          },
          { onConflict: "program_id,user_id" },
        );
        if (error) {
          // Handle foreign key constraint error
          if (error.code === "23503" && error.message?.includes("program_id")) {
            throw new Error("Program not found");
          }
          throw error;
        }
      } catch (err: any) {
        if (
          !(
            err?.code === "PGRST205" || err?.message?.includes("could not find")
          )
        ) {
          throw err;
        }
      }
    }
  }

  // Revoke access from a user for a program
  async revokeProgramAccess(programId: number, userId: number): Promise<void> {
    if (prismaEnabled) {
      await prisma!.programAccess.deleteMany({
        where: {
          program_id: programId,
          user_id: userId,
        },
      });
    } else if (supabase) {
      try {
        const { error } = await supabase
          .from("program_access")
          .delete()
          .eq("program_id", programId)
          .eq("user_id", userId);
        if (error) throw error;
      } catch (err: any) {
        if (
          !(
            err?.code === "PGRST205" || err?.message?.includes("could not find")
          )
        ) {
          throw err;
        }
      }
    }
  }
}

export const accessRepository = new AccessRepository();
