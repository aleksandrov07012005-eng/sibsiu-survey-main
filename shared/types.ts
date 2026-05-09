// Базовые типы для сущностей БД
export interface Admin {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  full_name?: string;
  is_active: boolean;
  created_at: Date;
  last_login_at?: Date;
}

export interface AuthUser {
  id: number;
  email: string;
  full_name?: string;
  role: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface AuthSession {
  token: string;
  expires_at: Date;
  user_id: number;
}

export interface PasswordResetEntry {
  token: string;
  expires_at: Date;
  used: boolean;
  user_id: number;
}

export interface SurveyFingerprintRecord {
  survey_id: number;
  fingerprint: string;
  cookie_id?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}

export interface Survey {
  id: number;
  questionnaire_id: number;
  title: string;
  is_active: boolean;
  start_date?: Date;
  end_date?: Date;
  unique_link?: string;
  created_by?: number;
  created_at: Date;
}

export interface SurveyCardData {
  id: number;
  dateRange: string;
  description: string;
  target: string;
  isActive: boolean;
  questionnaire_id?: number;
  questionnaire_title?: string;
  created_by?: number;
  created_at?: Date;
  created_by_name?: string;
  programs?: Array<{ id: number; name: string }>;
}

export interface Questionnaire {
  id: number;
  title: string;
  description?: string;
  version: number;
  created_by?: number;
  created_at: Date;
}

export interface Question {
  id: number;
  questionnaire_id: number;
  question_text: string;
  description?: string;
  answer_placeholder?: string;
  question_type:
    | "single_choice"
    | "multiple_choice"
    | "text"
    | "text_line"
    | "text_paragraph";
  is_required: boolean;
  question_order: number;
}

export interface AnswerOption {
  id: number;
  question_id: number;
  option_text: string;
  option_order: number;
}

export interface SurveyResponse {
  id: number;
  survey_id: number;
  participant_id?: number;
  started_at: Date;
  completed_at?: Date;
  time_spent_seconds?: number;
  status: "in_progress" | "completed" | "abandoned";
}

export interface QuestionResponse {
  id: number;
  response_id: number;
  question_id: number;
  answer_data: any; // JSONB
  answered_at: Date;
}

// Типы для API ответов
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
