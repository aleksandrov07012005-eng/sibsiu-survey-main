import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import QuestionCard, { QuestionData } from "@/components/QuestionCard";
import FormatSidebar from "@/components/FormatSidebar";
import MobileFormatPanel from "@/components/MobileFormatPanel";
import { api } from "@/lib/api";

export default function QuestionnaireEditor() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [questionnaireName, setQuestionnaireName] =
    useState("Название анкеты");
  const [description, setDescription] = useState("");
  const [maxRespondents, setMaxRespondents] = useState<string>("");
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(
    null,
  );
  const [mobileFormatPanelOpen, setMobileFormatPanelOpen] = useState(false);
  const isSavingRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    const fetchQuestionnaire = async () => {
      if (!id || id === "new") return;
      setLoading(true);
      try {
        const data = await api<any>(`/api/questionnaires/${id}`);
        if (!mounted) return;
        setQuestionnaireName(data.title || "Название анкеты");
        setDescription(data.description || "");
        setMaxRespondents(
          data.max_respondents != null ? String(data.max_respondents) : "",
        );

        const mappedQuestions: QuestionData[] = (data.questions || []).map(
          (q: any) => ({
            id: String(q.id),
            text: q.question_text || "Вопрос",
            description: q.description,
            answerPlaceholder: q.answer_placeholder,
            type:
              q.question_type === "text_paragraph"
                ? "text_paragraph"
                : q.question_type === "text" || q.question_type === "text_line"
                  ? "text_line"
                  : (q.question_type as any) || "text_line",
            isRequired: !!q.is_required,
            formatting: q.formatting,
            options: (q.answer_options || []).map((o: any) => o.option_text),
          }),
        );

        setQuestions(
          mappedQuestions.length
            ? mappedQuestions
            : [
                {
                  id: Date.now().toString(),
                  text: "Место для текста",
                  type: "text_line",
                  isRequired: true,
                },
              ],
        );
      } catch (err: any) {
        console.error(err);
        alert(err.message || "Ошибка при загрузке анкеты");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchQuestionnaire();
    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (id === "new" && questions.length === 0) {
      setQuestions([
        {
          id: Date.now().toString(),
          text: "Место для текста",
          type: "text_line",
          isRequired: true,
        },
      ]);
    }
  }, [id]);

  const updateQuestion = (updatedQuestion: QuestionData) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === updatedQuestion.id ? updatedQuestion : q)),
    );
  };

  const deleteQuestion = (qid: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== qid));
  };

  const duplicateQuestion = (question: QuestionData) => {
    const newQuestion = { ...question, id: Date.now().toString() };
    setQuestions((prev) => {
      const index = prev.findIndex((q) => q.id === question.id);
      const newQuestions = [...prev];
      newQuestions.splice(index + 1, 0, newQuestion);
      return newQuestions;
    });
  };

  const updateFormatting = (
    formatting: Partial<QuestionData["formatting"]>,
  ) => {
    if (!selectedQuestionId) return;
    const question = questions.find((q) => q.id === selectedQuestionId);
    if (!question) return;
    updateQuestion({
      ...question,
      formatting: { ...question.formatting, ...formatting },
    });
  };

  const selectedQuestion = questions.find((q) => q.id === selectedQuestionId);

  const handleSave = async () => {
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    setSaving(true);
    try {
      const parsedMax = maxRespondents.trim() !== ""
        ? parseInt(maxRespondents, 10)
        : null;

      const payload: any = {
        title: questionnaireName,
        description,
        version: 1,
        max_respondents: parsedMax,
        questions: questions
          .filter((q) => q.text && q.text.trim())
          .map((q, idx) => ({
            question_text: q.text,
            description: q.description || undefined,
            answer_placeholder: q.answerPlaceholder || undefined,
            question_type: q.type,
            is_required: q.isRequired,
            question_order: idx + 1,
            formatting: q.formatting,
            options: (q.options || [])
              .filter((opt) => opt && opt.trim())
              .map((opt, optIdx) => ({
                option_text: opt,
                option_order: optIdx + 1,
              })),
          })),
      };

      console.log("Saving questionnaire with payload:", payload);

      if (!id || id === "new") {
        const created = await api<any>("/api/questionnaires", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        if (created?.id) {
          navigate(`/ankety/${created.id}`);
        } else {
          navigate("/ankety");
        }
      } else {
        await api<any>(`/api/questionnaires/${id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      }
    } catch (err: any) {
      console.error("Save failed", err);
      alert(err.message || "Save failed");
    } finally {
      isSavingRef.current = false;
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id || id === "new") return;
    if (!confirm("Удалить анкету? Это действие нельзя отменить.")) return;
    try {
      await api(`/api/questionnaires/${id}`, {
        method: "DELETE",
      });
      navigate("/ankety");
    } catch (err: any) {
      console.error("Delete failed", err);
      alert(err.message || "Delete failed");
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row">
      <div className="lg:fixed lg:left-0 lg:top-0 lg:h-screen lg:overflow-y-auto">
        <Sidebar activePage="ankety" />
      </div>

      <div className="flex-1 lg:ml-[271px] flex flex-col">
        <div className="lg:hidden">
          <Header />
        </div>

        <div className="flex-1 lg:flex lg:mr-[273px]">
          <div className="flex-1 p-4 lg:p-6 flex flex-col gap-6 lg:gap-8 overflow-y-auto">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <p className="hidden lg:block text-xl text-[#C4C4C4] font-medium">
                  Анкеты/{questionnaireName}
                </p>
                <input
                  value={questionnaireName}
                  onChange={(e) => setQuestionnaireName(e.target.value)}
                  className="w-full lg:w-auto mt-2 border rounded px-2 py-1"
                  placeholder="Название анкеты"
                />
              </div>

              <div className="flex items-center gap-3">
                {id && id !== "new" && (
                  <button
                    onClick={handleDelete}
                    className="bg-red-600 text-white px-3 py-2 rounded text-sm"
                  >
                    Удалить
                  </button>
                )}
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-blue-600 text-white px-4 py-2 rounded text-sm"
                >
                  {saving ? "Сохранение..." : "Сохранить"}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2 max-w-[340px]">
              <label className="text-sm font-medium text-[#696F79]">
                Максимальное количество респондентов
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  value={maxRespondents}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "" || (parseInt(val, 10) > 0)) {
                      setMaxRespondents(val);
                    }
                  }}
                  placeholder="Без ограничений"
                  className="w-full border rounded px-3 py-2 text-sm text-[#181818] placeholder-[#C4C4C4] focus:outline-none focus:ring-2 focus:ring-blue-accent/30"
                />
                {maxRespondents !== "" && (
                  <button
                    onClick={() => setMaxRespondents("")}
                    className="text-xs text-[#696F79] hover:text-red-500 transition-colors whitespace-nowrap"
                  >
                    Снять лимит
                  </button>
                )}
              </div>
              <p className="text-xs text-[#C4C4C4]">
                Оставьте пустым — опрос будет доступен без ограничений
              </p>
            </div>

            <div className="flex flex-col gap-6 pb-8">
              {loading ? (
                <div>Загрузка...</div>
              ) : (
                questions.map((question) => (
                  <QuestionCard
                    key={question.id}
                    question={question}
                    onUpdate={updateQuestion}
                    onDelete={deleteQuestion}
                    onDuplicate={duplicateQuestion}
                    isSelected={selectedQuestionId === question.id}
                    onSelect={setSelectedQuestionId}
                    onFormatClick={(id) => {
                      setSelectedQuestionId(id);
                      setMobileFormatPanelOpen(true);
                    }}
                  />
                ))
              )}
            </div>
          </div>

          <div className="hidden lg:block lg:fixed lg:right-0 lg:top-0 lg:h-screen lg:overflow-y-auto">
            <FormatSidebar
              onSave={handleSave}
              disabled={saving}
              selectedQuestion={selectedQuestion}
              onUpdateFormatting={updateFormatting}
            />
          </div>
        </div>
      </div>

      <MobileFormatPanel
        isOpen={mobileFormatPanelOpen}
        onClose={() => setMobileFormatPanelOpen(false)}
        onSave={handleSave}
        disabled={saving}
        selectedQuestion={selectedQuestion}
        onUpdateFormatting={updateFormatting}
      />
    </div>
  );
}