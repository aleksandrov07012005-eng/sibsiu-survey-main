import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { getSessionFingerprint } from "@/lib/deviceFingerprint";

const getTextAlignValue = (alignment?: string): string => {
  switch (alignment) {
    case "left":
      return "left";
    case "center":
      return "center";
    case "right":
      return "right";
    case "justify":
      return "justify";
    case "distribute":
      return "justify";
    case "space-evenly":
      return "justify";
    default:
      return "left";
  }
};

interface AnswerOption {
  id: number;
  option_text: string;
  option_order: number;
}

interface Question {
  id: number;
  question_text: string;
  question_type:
    | "single_choice"
    | "multiple_choice"
    | "text"
    | "text_line"
    | "text_paragraph";
  is_required: boolean;
  question_order: number;
  options: AnswerOption[];
  answer_options?: AnswerOption[];
  formatting?: {
    alignment?:
      | "left"
      | "center"
      | "right"
      | "justify"
      | "distribute"
      | "space-evenly";
    verticalAlignment?: "top" | "center" | "bottom";
    fontFamily?: string;
    fontWeight?: "400" | "700";
    fontSize?: number;
    color?: string;
    lineHeight?: number;
    paragraphSpacing?: number;
    isBold?: boolean;
    isItalic?: boolean;
    isUnderline?: boolean;
  };
}

interface QuestionnaireData {
  id: number;
  title: string;
  description?: string;
  max_respondents?: number | null;
  questions: Question[];
}

interface Answer {
  question_id: number;
  answer_data: any;
}

export default function SurveyTaking() {
  const { surveyId } = useParams<{ surveyId: string }>();
  const navigate = useNavigate();
  const [questionnaire, setQuestionnaire] = useState<QuestionnaireData | null>(
    null,
  );
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [respondentCount, setRespondentCount] = useState(0);

  useEffect(() => {
    async function fetchQuestionnaire() {
      if (!surveyId) return;
      try {
        const payload = await api<any>(
          `/api/surveys/${surveyId}/questionnaire`,
        );
        const normalized: QuestionnaireData = {
          ...payload,
          questions: (payload?.questions ?? []).map((question: any) => ({
            ...question,
            options: question.options ?? question.answer_options ?? [],
          })),
        };
        setQuestionnaire(normalized);

        if (normalized.max_respondents != null) {
          try {
            const countData = await api<{ count: number }>(
              `/api/surveys/${surveyId}/responses/count`,
            );
            const count = countData?.count ?? 0;
            setRespondentCount(count);
            if (count >= normalized.max_respondents) {
              setLimitReached(true);
            }
          } catch {
            // не блокируем прохождение при ошибке счётчика
          }
        }
      } catch (error: any) {
        toast.error(error.message || "Ошибка загрузки опроса");
        navigate("/");
      } finally {
        setLoading(false);
      }
    }
    fetchQuestionnaire();
  }, [surveyId, navigate]);

  if (loading || !questionnaire) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center text-lg text-gray-600">
          Загрузка опроса...
        </div>
      </div>
    );
  }

  if (limitReached) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-[500px] bg-white rounded-3xl shadow-lg p-8 text-center">
          <p className="text-xl font-semibold text-[#4A4A4A] mb-4">
            Опрос недоступен
          </p>
          <p className="text-sm text-[#4A4A4A]">
            Достигнут лимит респондентов ({questionnaire.max_respondents}).
            Приём ответов завершён.
          </p>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-[500px] bg-white rounded-3xl shadow-lg p-8 text-center">
          <p className="text-xl font-semibold text-[#4A4A4A] mb-4">
            Спасибо за участие в опросе!
          </p>
          <p className="text-sm text-[#4A4A4A] mb-4">
            Ваши ответы сохранены. Теперь вы можете закрыть эту вкладку.
          </p>
        </div>
      </div>
    );
  }

  const questions = questionnaire.questions ?? [];
  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-[500px] bg-white rounded-3xl shadow-lg p-8 text-center">
          <p className="text-xl font-semibold text-[#4A4A4A] mb-4">
            Опрос не содержит вопросов
          </p>
          <p className="text-sm text-[#4A4A4A]">
            Вернитесь назад и выберите другой опрос или создайте вопросы в
            редакторе.
          </p>
          <button
            onClick={() => navigate(-1)}
            className="mt-6 bg-blue-accent text-white px-6 py-3 rounded-[10px] font-semibold"
          >
            Назад
          </button>
        </div>
      </div>
    );
  }

  const safeIndex = Math.min(currentQuestionIndex, questions.length - 1);
  const currentQuestion = questions[safeIndex];
  const currentAnswer = answers[currentQuestion.id];
  const isLastQuestion = safeIndex === questions.length - 1;

  const handleOptionSelect = (optionId: number) => {
    if (currentQuestion.question_type === "single_choice") {
      setAnswers({
        ...answers,
        [currentQuestion.id]: optionId,
      });
    } else if (currentQuestion.question_type === "multiple_choice") {
      const current = (answers[currentQuestion.id] || []) as number[];
      const updated = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];
      setAnswers({
        ...answers,
        [currentQuestion.id]: updated,
      });
    }
  };

  const handleTextChange = (text: string) => {
    setAnswers({
      ...answers,
      [currentQuestion.id]: text,
    });
  };

  const handleNext = async () => {
    if (currentQuestion.is_required && !currentAnswer) {
      toast.error("Пожалуйста, ответьте на вопрос");
      return;
    }

    if (isLastQuestion) {
      await handleSubmit();
    } else {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Повторная проверка лимита перед отправкой
      if (questionnaire.max_respondents != null) {
        try {
          const countData = await api<{ count: number }>(
            `/api/surveys/${surveyId}/responses/count`,
          );
          const count = countData?.count ?? 0;
          if (count >= questionnaire.max_respondents) {
            setLimitReached(true);
            toast.error("Достигнут лимит респондентов. Опрос недоступен.");
            return;
          }
        } catch {
          // не блокируем при ошибке счётчика
        }
      }

      const responseData: Answer[] = questions.map((q) => ({
        question_id: q.id,
        answer_data: answers[q.id] || null,
      }));

      const deviceFingerprint = getSessionFingerprint();

      await api(`/api/surveys/${surveyId}/responses`, {
        method: "POST",
        body: JSON.stringify({
          answers: responseData,
          device_fingerprint: deviceFingerprint,
        }),
      });

      toast.success("Спасибо за участие в опросе!");
      setCompleted(true);
    } catch (error: any) {
      if (error.message?.includes("уже заполнили")) {
        toast.error(
          "Вы уже заполнили этот опрос. Повторное заполнение невозможно.",
        );
      } else if (error.message?.includes("лимит")) {
        setLimitReached(true);
        toast.error("Достигнут лимит респондентов. Опрос недоступен.");
      } else {
        toast.error(error.message || "Ошибка отправки ответов");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const getOptionButtonClasses = (optionId: number): string => {
    const selected = isOptionSelected(optionId);
    const base =
      "w-full px-6 py-6 rounded-[11px] text-left transition-all border font-semibold";
    const border = selected
      ? "border-[#1935CA] border-2"
      : "border-[#D0D5DD] border";
    const background = selected
      ? "bg-white shadow-[0_0_0_6px_rgba(25,53,202,0.1)]"
      : "bg-[#FBF9F9]";
    const text = selected ? "text-[#1F4BC0]" : "text-[#4A4A4A] font-normal";
    return `${base} ${border} ${background} ${text}`;
  };

  const isOptionSelected = (optionId: number): boolean => {
    if (currentQuestion.question_type === "single_choice") {
      return currentAnswer === optionId;
    } else if (currentQuestion.question_type === "multiple_choice") {
      const selected = (currentAnswer || []) as number[];
      return selected.includes(optionId);
    }
    return false;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-[689px] bg-white rounded-3xl shadow-lg relative p-8 md:p-12">
        {questionnaire.max_respondents != null && (
          <div className="absolute top-4 right-6 text-xs text-[#696F79]">
            {respondentCount} / {questionnaire.max_respondents} респондентов
          </div>
        )}

        {currentQuestionIndex > 0 && (
          <button
            onClick={handleBack}
            className="absolute top-[53px] left-10 w-[42px] h-[41px] rounded-full bg-[#FBF9F9] border border-[#EDEDED] flex items-center justify-center hover:bg-gray-100 transition-colors"
            aria-label="Back"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M10.7985 12.4751C10.7404 12.5331 10.6618 12.5659 10.5797 12.5663C10.4976 12.5659 10.419 12.5331 10.3609 12.4751L8.03912 10.1398C7.98072 10.0813 7.94807 10.0019 7.94852 9.91922C7.94822 9.83672 7.98082 9.75757 8.03912 9.69922L10.3609 7.36392C10.4184 7.30497 10.4973 7.27177 10.5797 7.27177C10.6621 7.27177 10.741 7.30497 10.7985 7.36392C10.857 7.42217 10.8899 7.50132 10.8899 7.58392C10.8899 7.66647 10.857 7.74562 10.7985 7.80392L8.69557 9.91922L10.7985 12.0368C10.916 12.1593 10.916 12.3526 10.7985 12.4751Z"
                fill="#1F6019"
              />
            </svg>
          </button>
        )}

        <h1 className="text-center text-[#4A4A4A] font-semibold text-2xl mb-8">
          Question {currentQuestionIndex + 1}
        </h1>

        <div
          className="mb-8 flex flex-col min-h-[60px]"
          style={{
            justifyContent:
              currentQuestion.formatting?.verticalAlignment === "center"
                ? "center"
                : currentQuestion.formatting?.verticalAlignment === "bottom"
                  ? "flex-end"
                  : "flex-start",
          }}
        >
          <p
            style={{
              fontFamily: currentQuestion.formatting?.fontFamily || "Helvetica",
              fontSize: currentQuestion.formatting?.fontSize
                ? `${currentQuestion.formatting.fontSize}px`
                : "16px",
              color: currentQuestion.formatting?.color || "#4A4A4A",
              fontWeight: currentQuestion.formatting?.isBold
                ? 700
                : currentQuestion.formatting?.fontWeight === "700"
                  ? 700
                  : 400,
              fontStyle: currentQuestion.formatting?.isItalic
                ? "italic"
                : "normal",
              textDecoration: currentQuestion.formatting?.isUnderline
                ? "underline"
                : "none",
              textAlign: getTextAlignValue(
                currentQuestion.formatting?.alignment,
              ),
              lineHeight: currentQuestion.formatting?.lineHeight || 1.5,
              marginBottom: currentQuestion.formatting?.paragraphSpacing
                ? `${currentQuestion.formatting.paragraphSpacing}px`
                : "32px",
            }}
          >
            {currentQuestion.question_text}
          </p>

          {currentQuestion.description && (
            <p className="text-sm text-[#696F79] italic mt-2">
              {currentQuestion.description}
            </p>
          )}
        </div>

        <div className="space-y-4 mb-12">
          {currentQuestion.question_type === "text_line" ? (
            <input
              type="text"
              value={currentAnswer || ""}
              onChange={(e) => handleTextChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleNext();
                }
              }}
              className="w-full px-6 py-4 rounded-[11px] border border-[#1935CA] bg-[#FBF9F9] text-[#4A4A4A] text-base focus:outline-none focus:ring-2 focus:ring-[#1935CA] focus:border-transparent"
              placeholder={
                currentQuestion.answer_placeholder || "Введите ваш ответ..."
              }
            />
          ) : currentQuestion.question_type === "text" ||
            currentQuestion.question_type === "text_paragraph" ? (
            <textarea
              value={currentAnswer || ""}
              onChange={(e) => handleTextChange(e.target.value)}
              className="w-full min-h-[100px] px-6 py-4 rounded-[11px] border border-[#1935CA] bg-[#FBF9F9] text-[#4A4A4A] text-base focus:outline-none focus:ring-2 focus:ring-[#1935CA] focus:border-transparent resize-none"
              placeholder={
                currentQuestion.answer_placeholder || "Введите ваш ответ..."
              }
              rows={5}
            />
          ) : (
            (currentQuestion.options ?? []).map((option) => (
              <button
                key={option.id}
                onClick={() => handleOptionSelect(option.id)}
                className={getOptionButtonClasses(option.id)}
                type="button"
              >
                {option.option_text}
              </button>
            ))
          )}
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleNext}
            disabled={submitting}
            className="bg-[#1935CA] text-white font-semibold text-xl px-8 py-4 rounded-[10px] hover:bg-[#1935CA]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Отправка..." : isLastQuestion ? "Завершить" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}