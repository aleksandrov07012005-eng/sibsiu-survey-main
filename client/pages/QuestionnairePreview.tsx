import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import QuestionPreview from "@/components/QuestionPreview";
import { QuestionData } from "@/components/QuestionCard";

export default function QuestionnairePreview() {
  const { id } = useParams();
  const navigate = useNavigate();

  const questionnaireName = "Название анкеты";
  const questions: QuestionData[] = [
    {
      id: "1",
      text: "Место для текста",
      type: "text_line",
      isRequired: true,
    },
    {
      id: "2",
      text: "Место для текста",
      description: "Описание",
      type: "text_paragraph",
      isRequired: true,
    },
    {
      id: "3",
      text: "Место для текста",
      type: "single_choice",
      isRequired: false,
      options: ["Вопрос", "Вопрос", "Вопрос"],
    },
    {
      id: "4",
      text: "Место для текста",
      type: "multiple_choice",
      isRequired: false,
      options: ["Вопрос", "Вопрос", "Вопрос"],
    },
  ];

  return (
    <div className="min-h-screen bg-white flex">
      <div className="fixed left-0 top-0 h-screen overflow-y-auto">
        <Sidebar activePage="ankety" />
      </div>

      <div className="flex-1 ml-[271px] flex">
        <div className="flex-1 p-6 flex flex-col gap-8 overflow-y-auto">
          <div className="flex items-center justify-between">
            <p className="text-xl text-[#C4C4C4] font-medium">
              Анкеты/{questionnaireName}
            </p>
          </div>

          <div className="flex flex-col gap-10 items-center pb-8">
            {questions.map((question) => (
              <QuestionPreview key={question.id} question={question} />
            ))}
          </div>
        </div>

        <div className="fixed right-0 top-0 bg-white p-[18px] pt-[7px]">
          <button
            onClick={() => navigate(`/ankety/${id}`)}
            className="w-[236px] bg-blue-accent text-[#E0E0E1] text-sm px-3 py-2.5 rounded flex items-center justify-center"
          >
            Редактрировать
          </button>
        </div>
      </div>
    </div>
  );
}
