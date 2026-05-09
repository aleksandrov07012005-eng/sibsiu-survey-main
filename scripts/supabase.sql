-- Create questionnaires and related tables
CREATE TABLE IF NOT EXISTS questionnaires (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_by INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS surveys (
  id SERIAL PRIMARY KEY,
  questionnaire_id INTEGER REFERENCES questionnaires(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  start_date TIMESTAMP NULL,
  end_date TIMESTAMP NULL,
  unique_link VARCHAR(255),
  created_by INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS questions (
  id SERIAL PRIMARY KEY,
  questionnaire_id INTEGER NOT NULL REFERENCES questionnaires(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type VARCHAR(32) NOT NULL CHECK (question_type IN ('single_choice','multiple_choice','text')),
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  question_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS answer_options (
  id SERIAL PRIMARY KEY,
  question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  option_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_surveys_active ON surveys(is_active);
CREATE INDEX IF NOT EXISTS idx_surveys_dates ON surveys(end_date);
CREATE INDEX IF NOT EXISTS idx_questions_questionnaire ON questions(questionnaire_id);
CREATE INDEX IF NOT EXISTS idx_options_question ON answer_options(question_id);

-- Programs table
CREATE TABLE IF NOT EXISTS programs (
  id SERIAL PRIMARY KEY,
  code VARCHAR(255),
  name VARCHAR(255) NOT NULL,
  program_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Optional demo data (uncomment to seed via SQL editor)
-- INSERT INTO questionnaires (title, description, version, created_by) VALUES ('Оценка качества образования', 'Демо-анкета для примера', 1, 1);
-- INSERT INTO surveys (questionnaire_id, title, is_active, start_date, end_date, unique_link, created_by) VALUES (1, 'Опрос для обучающихся', true, now(), NULL, 'demo-link', 1);
-- INSERT INTO questions (questionnaire_id, question_text, question_type, is_required, question_order) VALUES (1, 'Насколько вы довольны качеством обучения?', 'single_choice', true, 1);
-- INSERT INTO answer_options (question_id, option_text, option_order) VALUES (1, 'Отлично', 1), (1, 'Хорошо', 2), (1, 'Удовлетворительно', 3);
