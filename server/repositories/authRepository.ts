import { query } from "../db/config";
import { AuthUser, SurveyFingerprintRecord } from "../../shared/types";

export interface SessionWithUser {
  token: string;
  expires_at: Date;
  user: AuthUser;
}

export class AuthRepository {
  private mapUser(row: any): AuthUser {
    return {
      id: row.id,
      email: row.email,
      full_name: row.full_name || undefined,
      role: row.role,
      is_active: row.is_active,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    };
  }

  private mapFingerprint(row: any): SurveyFingerprintRecord {
    return {
      survey_id: row.survey_id,
      fingerprint: row.fingerprint,
      cookie_id: row.cookie_id || undefined,
      ip_address: row.ip_address || undefined,
      user_agent: row.user_agent || undefined,
      created_at: new Date(row.created_at),
    };
  }

  async listUsers(): Promise<AuthUser[]> {
    const result = await query(
      `SELECT id, email, full_name, role, is_active, created_at, updated_at FROM auth_users ORDER BY created_at DESC`,
    );
    return result.rows.map((row: any) => this.mapUser(row));
  }

  async getUserByEmail(email: string): Promise<AuthUser | null> {
    const result = await query(
      `SELECT id, email, full_name, role, is_active, created_at, updated_at FROM auth_users WHERE email = $1 LIMIT 1`,
      [email],
    );
    return result.rows[0] ? this.mapUser(result.rows[0]) : null;
  }

  async getUserWithPasswordByEmail(
    email: string,
  ): Promise<{ user: AuthUser; password_hash: string } | null> {
    const result = await query(
      `SELECT id, email, full_name, role, is_active, created_at, updated_at, password_hash FROM auth_users WHERE email = $1 LIMIT 1`,
      [email],
    );
    if (!result.rows[0]) return null;
    const { password_hash, ...userRow } = result.rows[0];
    return { user: this.mapUser(userRow), password_hash };
  }

  async getUserById(id: number): Promise<AuthUser | null> {
    const result = await query(
      `SELECT id, email, full_name, role, is_active, created_at, updated_at FROM auth_users WHERE id = $1 LIMIT 1`,
      [id],
    );
    return result.rows[0] ? this.mapUser(result.rows[0]) : null;
  }

  async createUser(data: {
    email: string;
    full_name?: string;
    password_hash: string;
    role?: string;
    is_active?: boolean;
  }): Promise<AuthUser> {
    const payload = {
      email: data.email,
      full_name: data.full_name ?? null,
      password_hash: data.password_hash,
      role: data.role ?? "admin",
      is_active: data.is_active ?? true,
    };

    const result = await query(
      `INSERT INTO auth_users (email, full_name, password_hash, role, is_active)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id, email, full_name, role, is_active, created_at, updated_at`,
      [
        payload.email,
        payload.full_name,
        payload.password_hash,
        payload.role,
        payload.is_active,
      ],
    );
    return this.mapUser(result.rows[0]);
  }

  async updateUser(
    id: number,
    updates: Partial<{ full_name: string; role: string; is_active: boolean }>,
  ): Promise<AuthUser | null> {
    const patch: Partial<AuthUser> = {};
    if (updates.full_name !== undefined) patch.full_name = updates.full_name;
    if (updates.role !== undefined) patch.role = updates.role;
    if (updates.is_active !== undefined) patch.is_active = updates.is_active;

    const setClauses: string[] = [];
    const values: any[] = [];
    let idx = 1;
    for (const [key, value] of Object.entries(patch)) {
      setClauses.push(`${key} = $${idx}`);
      values.push(value);
      idx++;
    }
    if (setClauses.length === 0) return this.getUserById(id);
    setClauses.push(`updated_at = NOW()`);
    const result = await query(
      `UPDATE auth_users SET ${setClauses.join(", ")} WHERE id = $${idx} RETURNING id, email, full_name, role, is_active, created_at, updated_at`,
      [...values, id],
    );
    return result.rows[0] ? this.mapUser(result.rows[0]) : null;
  }

  async updatePassword(
    id: number,
    password_hash: string,
  ): Promise<AuthUser | null> {
    const result = await query(
      `UPDATE auth_users SET password_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, full_name, role, is_active, created_at, updated_at`,
      [password_hash, id],
    );
    return result.rows[0] ? this.mapUser(result.rows[0]) : null;
  }

  private async fetchSessionRow(token: string) {
    const result = await query(
      `SELECT token, user_id, expires_at FROM auth_sessions WHERE token = $1 LIMIT 1`,
      [token],
    );
    return result.rows[0] || null;
  }

  async getSessionByToken(token: string): Promise<SessionWithUser | null> {
    const sessionRow = await this.fetchSessionRow(token);
    if (!sessionRow) return null;
    const expiresAt = new Date(sessionRow.expires_at);
    if (expiresAt <= new Date()) return null;
    const user = await this.getUserById(sessionRow.user_id);
    if (!user) return null;
    return { token: sessionRow.token, expires_at: expiresAt, user };
  }

  async createSession(userId: number, token: string, expiresAt: Date) {
    await query(
      `INSERT INTO auth_sessions (user_id, token, expires_at) VALUES ($1,$2,$3)`,
      [userId, token, expiresAt],
    );
  }

  async deleteSession(token: string) {
    await query(`DELETE FROM auth_sessions WHERE token = $1`, [token]);
  }

  async deleteSessionsForUser(userId: number) {
    await query(`DELETE FROM auth_sessions WHERE user_id = $1`, [userId]);
  }

  async createPasswordResetToken(
    userId: number,
    token: string,
    expiresAt: Date,
  ) {
    await query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1,$2,$3)`,
      [userId, token, expiresAt],
    );
  }

  async findPasswordResetToken(
    token: string,
  ): Promise<{
    id: number;
    user_id: number;
    expires_at: Date;
    used: boolean;
  } | null> {
    const result = await query(
      `SELECT id, user_id, expires_at, used FROM password_reset_tokens WHERE token = $1 LIMIT 1`,
      [token],
    );
    if (!result.rows[0]) return null;
    return {
      id: result.rows[0].id,
      user_id: result.rows[0].user_id,
      expires_at: new Date(result.rows[0].expires_at),
      used: result.rows[0].used,
    };
  }

  async markPasswordTokenUsed(id: number) {
    await query(`UPDATE password_reset_tokens SET used = true WHERE id = $1`, [
      id,
    ]);
  }

  async recordFingerprint(payload: {
    survey_id: number;
    fingerprint: string;
    cookie_id?: string;
    ip_address?: string;
    user_agent?: string;
  }): Promise<SurveyFingerprintRecord | null> {
    const result = await query(
      `INSERT INTO survey_fingerprints (survey_id, fingerprint, cookie_id, ip_address, user_agent)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (survey_id, fingerprint) DO NOTHING
       RETURNING survey_id, fingerprint, cookie_id, ip_address, user_agent, created_at`,
      [
        payload.survey_id,
        payload.fingerprint,
        payload.cookie_id,
        payload.ip_address,
        payload.user_agent,
      ],
    );
    return result.rows[0] ? this.mapFingerprint(result.rows[0]) : null;
  }

  async findFingerprint(
    survey_id: number,
    fingerprint: string,
  ): Promise<SurveyFingerprintRecord | null> {
    const result = await query(
      `SELECT survey_id, fingerprint, cookie_id, ip_address, user_agent, created_at FROM survey_fingerprints WHERE survey_id = $1 AND fingerprint = $2 LIMIT 1`,
      [survey_id, fingerprint],
    );
    return result.rows[0] ? this.mapFingerprint(result.rows[0]) : null;
  }
}

export const authRepository = new AuthRepository();              
