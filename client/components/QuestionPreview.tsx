import { QuestionData } from "./QuestionCard";

interface QuestionPreviewProps {
  question: QuestionData;
}

const getTextAlign = (alignment?: string): string => {
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
      return "right";
    default:
      return "left";
  }
};

export default function QuestionPreview({ question }: QuestionPreviewProps) {
  return (
    <div className="relative w-full max-w-[491px]">
      <div className="bg-white border border-blue-accent rounded-[10px] overflow-hidden">
        <div className="absolute left-0 top-0 w-[27px] h-full bg-blue-accent rounded-l-[10px] border border-blue-accent"></div>

        <div className="pl-[45px] pr-[45px] py-[21px]">
          <div className="flex flex-col gap-4">
            <div className="bg-[#F9F9FF] rounded-[13px] shadow-[3px_3px_2.5px_0_rgba(0,0,0,0.04)]">
              <div
                className="p-2.5 flex flex-col min-h-[80px]"
                style={{
                  justifyContent:
                    question.formatting?.verticalAlignment === "center"
                      ? "center"
                      : question.formatting?.verticalAlignment === "bottom"
                        ? "flex-end"
                        : "flex-start",
                }}
              >
                <p
                  className="text-[#3D3D3D] text-[14px] font-medium whitespace-pre-wrap"
                  style={{
                    fontFamily: question.formatting?.fontFamily || "Helvetica",
                    fontSize: question.formatting?.fontSize
                      ? `${question.formatting.fontSize}px`
                      : "14px",
                    color: question.formatting?.color || "#3D3D3D",
                    fontWeight: question.formatting?.isBold ? 700 : 400,
                    fontStyle: question.formatting?.isItalic
                      ? "italic"
                      : "normal",
                    textDecoration: question.formatting?.isUnderline
                      ? "underline"
                      : "none",
                    textAlign: getTextAlign(question.formatting?.alignment),
                    lineHeight: question.formatting?.lineHeight || 1.5,
                    marginBottom: question.formatting?.paragraphSpacing
                      ? `${question.formatting.paragraphSpacing}px`
                      : "0px",
                  }}
                >
                  {question.text}
                </p>
              </div>
            </div>

            {question.description && question.description.trim() && (
              <div className="pb-3">
                <div className="text-[#696F79] text-[12px] mb-1 italic">
                  {question.description}
                </div>
              </div>
            )}

            {question.type === "text_line" && (
              <div>
                <input
                  type="text"
                  placeholder={question.answerPlaceholder || "Краткий ответ"}
                  disabled
                  className="w-full bg-transparent border-b border-[#696F79] text-[#696F79] text-[12px] pb-1 placeholder:text-[#696F79] outline-none"
                />
              </div>
            )}

            {question.type === "text_paragraph" && (
              <div>
                <textarea
                  placeholder={question.answerPlaceholder || "Краткий ответ"}
                  disabled
                  rows={3}
                  className="w-full bg-transparent border-b border-[#696F79] text-[#696F79] text-[12px] pb-1 placeholder:text-[#696F79] outline-none resize-none"
                />
              </div>
            )}

            {question.type === "single_choice" && question.options && (
              <div className="flex flex-col gap-2 pb-2.5">
                {question.options.map((option, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <svg
                      className="w-[21px] h-[21px] flex-shrink-0"
                      viewBox="0 0 21 21"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M21 10.5C21 16.299 16.299 21 10.5 21C4.70101 21 0 16.299 0 10.5C0 4.70101 4.70101 0 10.5 0C16.299 0 21 4.70101 21 10.5ZM1.05 10.5C1.05 15.7191 5.28091 19.95 10.5 19.95C15.7191 19.95 19.95 15.7191 19.95 10.5C19.95 5.28091 15.7191 1.05 10.5 1.05C5.28091 1.05 1.05 5.28091 1.05 10.5Z"
                        fill="#696F79"
                      />
                    </svg>
                    <span className="text-[#696F79] text-[11px]">{option}</span>
                  </div>
                ))}
              </div>
            )}

            {question.type === "multiple_choice" && question.options && (
              <div className="flex flex-col gap-2 pb-2.5">
                {question.options.map((option, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-[5px] border border-[#696F79] flex-shrink-0"></div>
                    <span className="text-[#696F79] text-[11px]">{option}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {question.isRequired && (
            <div className="absolute top-2 right-2">
              <span className="text-[#9D0000] text-[11px]">*</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
