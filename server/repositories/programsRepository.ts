import { supabase } from "../db/supabaseClient";
import { query } from "../db/config";
import { prisma } from "../db/prismaClient";

const prismaEnabled =
  !!process.env.USE_PRISMA && process.env.USE_PRISMA === "true" && !!prisma;

export interface Program {
  id: number;
  code: string;
  name: string;
  program_name: string;
  created_at?: string;
}

export class ProgramsRepository {
  async getOne(id: number): Promise<Program | null> {
    if (prismaEnabled) {
      const item = await prisma!.program.findUnique({
        where: { id },
      });
      return (item as unknown as Program) || null;
    } else if (supabase) {
      const { data, error } = await supabase
        .from("programs")
        .select("*")
        .eq("id", id)
        .single();
      if (error) {
        if ((error as any).code === "PGRST116") return null;
        throw error;
      }
      return (data as Program) || null;
    } else {
      const result = await query("SELECT * FROM programs WHERE id = $1", [id]);
      return result.rows[0] || null;
    }
  }

  async getAll(userId?: number): Promise<Program[]> {
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

      const items = await prisma!.program.findMany({
        where,
        orderBy: { created_at: "desc" },
      });
      return items as unknown as Program[];
    } else if (supabase) {
      if (userId) {
        try {
          console.log(
            `[ProgramsRepository] Fetching programs for userId: ${userId}`,
          );

          // Fetch programs created by the user
          const { data: createdByUser, error: error1 } = await supabase
            .from("programs")
            .select("*")
            .eq("created_by", userId)
            .order("created_at", { ascending: false });
          if (error1) throw error1;
          console.log(
            `[ProgramsRepository] Found ${createdByUser?.length || 0} programs created by user`,
          );

          // Fetch programs where user has access via program_access table
          let accessPrograms: Program[] = [];
          try {
            const { data: withAccess, error: error2 } = await supabase
              .from("program_access")
              .select("programs(*)")
              .eq("user_id", userId);
            if (error2) throw error2;
            console.log(
              `[ProgramsRepository] Found ${withAccess?.length || 0} program_access records`,
            );

            const accessProgramList = (withAccess ?? [])
              .map((item: any) => item.programs)
              .filter(Boolean) as Program[];

            accessPrograms = accessProgramList;
            console.log(
              `[ProgramsRepository] Found ${accessPrograms.length} programs with access`,
            );
          } catch (err: any) {
            // If program_access table doesn't exist or relationship not set up, fallback to separate queries
            if (
              err?.code === "PGRST205" ||
              err?.message?.includes("could not find") ||
              err?.message?.includes("400")
            ) {
              console.log(
                `[ProgramsRepository] Fallback: program_access relationship not available, trying separate query`,
              );
              try {
                const { data: accessData, error: fallbackError } =
                  await supabase
                    .from("program_access")
                    .select("program_id")
                    .eq("user_id", userId);
                if (fallbackError) throw fallbackError;

                if (accessData && accessData.length > 0) {
                  const programIds = (accessData as any[]).map(
                    (a) => a.program_id,
                  );
                  const { data: programs, error: error3 } = await supabase
                    .from("programs")
                    .select("*")
                    .in("id", programIds)
                    .order("created_at", { ascending: false });
                  if (error3) throw error3;
                  accessPrograms = (programs ?? []) as Program[];
                }
              } catch (fallbackErr) {
                console.warn(
                  `[ProgramsRepository] Fallback also failed:`,
                  fallbackErr,
                );
              }
            } else {
              throw err;
            }
          }

          // Combine and deduplicate
          const createdMap = new Map<number, Program>();
          (createdByUser ?? []).forEach((p) =>
            createdMap.set((p as any).id, p as Program),
          );

          accessPrograms.forEach((p) => {
            if (!createdMap.has(p.id)) {
              createdMap.set(p.id, p);
            }
          });

          // Convert to array and sort by created_at descending
          const result = Array.from(createdMap.values()).sort(
            (a, b) =>
              new Date(b.created_at || 0).getTime() -
              new Date(a.created_at || 0).getTime(),
          );
          console.log(
            `[ProgramsRepository] Returning ${result.length} total programs`,
          );
          return result;
        } catch (err: any) {
          // If access tables don't exist, fallback to showing only programs created by user
          if (
            err?.code === "PGRST205" ||
            err?.message?.includes("could not find")
          ) {
            const { data, error } = await supabase
              .from("programs")
              .select("*")
              .eq("created_by", userId)
              .order("created_at", { ascending: false });
            if (error) throw error;
            return (data as unknown as Program[]) ?? [];
          } else {
            throw err;
          }
        }
      } else {
        const { data, error } = await supabase
          .from("programs")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        return (data ?? []) as Program[];
      }
    } else {
      if (userId) {
        // SQL-based: get programs created by user OR programs user has access to
        const result = await query(
          `SELECT DISTINCT p.* FROM programs p
           LEFT JOIN program_access pa ON p.id = pa.program_id
           WHERE p.created_by = $1 OR pa.user_id = $1
           ORDER BY p.created_at DESC`,
          [userId],
        );
        return result.rows;
      } else {
        const result = await query(
          "SELECT * FROM programs ORDER BY created_at DESC",
        );
        return result.rows;
      }
    }
  }

  async create(programData: {
    code: string;
    name: string;
    program_name: string;
    created_by?: number;
  }): Promise<Program> {
    if (prismaEnabled) {
      const created = await prisma!.program.create({
        data: {
          code: programData.code,
          name: programData.name,
          program_name: programData.program_name,
          created_by: programData.created_by,
        },
      });
      return created as unknown as Program;
    } else if (supabase) {
      const { data, error } = await supabase
        .from("programs")
        .insert({
          code: programData.code,
          name: programData.name,
          program_name: programData.program_name,
          created_by: programData.created_by,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Program;
    } else {
      const result = await query(
        `INSERT INTO programs (code, name, program_name, created_by) VALUES ($1, $2, $3, $4) RETURNING *`,
        [
          programData.code,
          programData.name,
          programData.program_name,
          programData.created_by,
        ],
      );
      return result.rows[0];
    }
  }

  async update(id: number, updates: Partial<Program>): Promise<Program | null> {
    if (prismaEnabled) {
      const updated = await prisma!.program.update({
        where: { id },
        data: updates as any,
      });
      return updated as unknown as Program;
    } else if (supabase) {
      const { data, error } = await supabase
        .from("programs")
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return (data as Program) || null;
    } else {
      const fields: string[] = [];
      const values: any[] = [];
      let idx = 1;
      for (const [k, v] of Object.entries(updates)) {
        fields.push(`${k} = $${idx++}`);
        values.push(v);
      }
      if (fields.length === 0) return null;
      values.push(id);
      const result = await query(
        `UPDATE programs SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
        values,
      );
      return result.rows[0] || null;
    }
  }

  async delete(id: number): Promise<boolean> {
    if (prismaEnabled) {
      await prisma!.program.delete({ where: { id } });
      return true;
    } else if (supabase) {
      const { error } = await supabase.from("programs").delete().eq("id", id);
      if (error) throw error;
      return true;
    } else {
      const result = await query("DELETE FROM programs WHERE id = $1", [id]);
      return result.rowCount > 0;
    }
  }
}

export const programsRepository = new ProgramsRepository();
