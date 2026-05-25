import { query } from "../db/config";

export interface Program {
  id: number;
  code: string;
  name: string;
  program_name: string;
  created_at?: string;
}

export class ProgramsRepository {
  async getOne(id: number): Promise<Program | null> {
    const result = await query("SELECT * FROM programs WHERE id = $1", [id]);
    return result.rows[0] || null;
  }

  async getAll(userId?: number): Promise<Program[]> {
    if (userId) {
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

  async create(programData: {
    code: string;
    name: string;
    program_name: string;
    created_by?: number;
  }): Promise<Program> {
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

  async update(id: number, updates: Partial<Program>): Promise<Program | null> {
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

  async delete(id: number): Promise<boolean> {
    const result = await query("DELETE FROM programs WHERE id = $1", [id]);
    return result.rowCount > 0;
  }
}

export const programsRepository = new ProgramsRepository();
