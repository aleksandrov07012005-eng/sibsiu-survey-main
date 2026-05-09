import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { api } from "@/lib/api";

interface Question {
  id: number;
  question_text: string;
  question_type: "single_choice" | "multiple_choice" | "text";
  question_order: number;
  answer_options?: Array<{
    id: number;
    option_text: string;
    option_order: number;
  }>;
}

interface Response {
  id: number;
  survey_id: number;
  started_at: string;
  completed_at: string;
  status: string;
}

interface Answer {
  id?: number;
  response_id: number;
  question_id: number;
  answer_data: any;
}

export default function ResponseDetail() {
  const { surveyId, responseId } = useParams<{
    surveyId: string;
    responseId: string;
  }>();
  const navigate = useNavigate();
  const [response, setResponse] = useState<Response | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [questions, setQuestions] = useState<
    Array<Question & { answer?: Answer }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_BASE = import.meta.env.VITE_API_BASE || "/api";

  useEffect(() => {
    if (!surveyId || !responseId) return;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [responseData, questionnaireData] = await Promise.all([
          api<any>(`${API_BASE}/surveys/responses/${responseId}`),
          api<any>(`${API_BASE}/surveys/${surveyId}/questionnaire`),
        ]);

        setResponse(responseData.response);
        setAnswers(responseData.answers || []);

        const questionsWithAnswers = (questionnaireData.questions || []).map(
          (q: Question) => {
            const answer = (responseData.answers || []).find(
              (a: Answer) => a.question_id === q.id,
            );
            return { ...q, answer };
          },
        );

        setQuestions(questionsWithAnswers);
      } catch (err: any) {
        setError(err.message || "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [surveyId, responseId]);

  const formatAnswer = (
    answer: Answer,
    questionType: string,
    options?: Array<{ id: number; option_text: string }>,
  ): string => {
    if (!answer || answer.answer_data === null) {
      return "Нет ответа";
    }

    // For single_choice and multiple_choice, map option IDs to option text
    if (
      (questionType === "single_choice" ||
        questionType === "multiple_choice") &&
      options
    ) {
      const optionMap = new Map(
        options.map((opt) => [opt.id, opt.option_text]),
      );

      if (Array.isArray(answer.answer_data)) {
        return answer.answer_data
          .map((id) => optionMap.get(id) || String(id))
          .join(", ");
      }

      if (typeof answer.answer_data === "number") {
        return optionMap.get(answer.answer_data) || String(answer.answer_data);
      }
    }

    // For text questions or fallback
    if (Array.isArray(answer.answer_data)) {
      return answer.answer_data.join(", ");
    }

    if (typeof answer.answer_data === "string") {
      return answer.answer_data;
    }

    if (typeof answer.answer_data === "number") {
      return String(answer.answer_data);
    }

    return JSON.stringify(answer.answer_data);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col lg:flex-row">
        <div className="lg:fixed lg:left-0 lg:top-0 lg:h-screen lg:overflow-y-auto">
          <Sidebar activePage="oprosi" />
        </div>
        <div className="flex-1 lg:ml-[271px] p-4 lg:p-8 flex items-center justify-center">
          <div className="text-lg text-gray-600">Загрузка ответов...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex flex-col lg:flex-row">
        <div className="lg:fixed lg:left-0 lg:top-0 lg:h-screen lg:overflow-y-auto">
          <Sidebar activePage="oprosi" />
        </div>
        <div className="flex-1 lg:ml-[271px] p-4 lg:p-8 flex flex-col gap-4">
          <Header />
          <div className="text-red-600">{error}</div>
          <button
            onClick={() => navigate(-1)}
            className="bg-blue-accent text-white px-6 py-2 rounded-lg w-fit"
          >
            Вернуться назад
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row">
      <div className="lg:fixed lg:left-0 lg:top-0 lg:h-screen lg:overflow-y-auto">
        <Sidebar activePage="oprosi" />
      </div>

      <div className="flex-1 lg:ml-[271px] p-4 lg:p-8 flex flex-col gap-6">
        <Header />

        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              Ответ #{response?.id}
            </h1>
            <p className="text-slate-500">
              Заполнено:{" "}
              {new Date(response?.completed_at || "").toLocaleString("ru-RU")}
            </p>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="bg-blue-accent text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Вернуться
          </button>
        </div>

        <div className="max-w-3xl space-y-6">
          {questions.map((question, index) => (
            <div
              key={question.id}
              className="bg-slate-50 rounded-lg p-6 border border-slate-200"
            >
              <div className="mb-4">
                <h3 className="font-semibold text-slate-900 mb-2">
                  Вопрос {index + 1}
                </h3>
                <p className="text-slate-700">{question.question_text}</p>
              </div>

              <div className="bg-white rounded p-4 border border-slate-200">
                <p className="text-slate-900 font-medium">
                  {formatAnswer(
                    question.answer as Answer,
                    question.question_type,
                    question.answer_options,
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
