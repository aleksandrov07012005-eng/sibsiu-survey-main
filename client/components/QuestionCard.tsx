import { useState, useRef, useEffect } from "react";

export type QuestionType =
  | "text_line"
  | "text_paragraph"
  | "single_choice"
  | "multiple_choice";

export interface QuestionData {
  id: string;
  text: string;
  description?: string;
  answerPlaceholder?: string;
  type: QuestionType;
  isRequired: boolean;
  options?: string[];
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
    isStrikethrough?: boolean;
  };
}

interface QuestionCardProps {
  question: QuestionData;
  onUpdate: (question: QuestionData) => void;
  onDelete: (id: string) => void;
  onDuplicate: (question: QuestionData) => void;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  onFormatClick?: (id: string) => void;
}

const questionTypeLabels: Record<QuestionType, string> = {
  text_line: "Текст (Строка)",
  text_paragraph: "Текст (Абзац)",
  single_choice: "Один из списка",
  multiple_choice: "Несколько из списка",
};

export default function QuestionCard({
  question,
  onUpdate,
  onDelete,
  onDuplicate,
  isSelected,
  onSelect,
  onFormatClick,
}: QuestionCardProps) {
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const typeButtonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const handleTypeButtonClick = () => {
    if (!showTypeDropdown && typeButtonRef.current) {
      const rect = typeButtonRef.current.getBoundingClientRect();
      const maxHeight = 200; // approximate height of dropdown
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      // If not enough space below, position above the button
      const isAbove = spaceBelow < maxHeight && spaceAbove > spaceBelow;

      setDropdownPosition({
        top: isAbove ? rect.top - maxHeight - 4 : rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
    setShowTypeDropdown(!showTypeDropdown);
  };

  useEffect(() => {
    if (!showTypeDropdown) return;

    const handleClickOutside = () => {
      setShowTypeDropdown(false);
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [showTypeDropdown]);

  const updateQuestion = (updates: Partial<QuestionData>) => {
    onUpdate({ ...question, ...updates });
  };

  const addOption = () => {
    const newOptions = [...(question.options || []), ""];
    updateQuestion({ options: newOptions });
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...(question.options || [])];
    newOptions[index] = value;
    updateQuestion({ options: newOptions });
  };

  const deleteOption = (index: number) => {
    const newOptions = question.options?.filter((_, i) => i !== index);
    updateQuestion({ options: newOptions });
  };

  const formatting = question.formatting || {};
  const textDecorations: string[] = [];
  if (formatting.isUnderline) textDecorations.push("underline");
  if (formatting.isStrikethrough) textDecorations.push("line-through");

  const textareaStyle: React.CSSProperties = {
    fontFamily: formatting.fontFamily || "Helvetica",
    fontSize: formatting.fontSize || 14,
    color: formatting.color || "#393939",
    fontWeight: formatting.isBold ? 700 : 400,
    fontStyle: formatting.isItalic ? "italic" : "normal",
    textDecoration:
      textDecorations.length > 0 ? textDecorations.join(" ") : "none",
    textAlign: (formatting.alignment || "left") as any,
    lineHeight: formatting.lineHeight || 1.5,
    marginBottom: `${formatting.paragraphSpacing || 0}px`,
  };

  return (
    <div className="relative">
      <div
        className={`w-full bg-white border rounded-[8px] overflow-hidden ${isSelected ? "border-blue-600 border-2" : "border-blue-accent"}`}
      >
        <div className="absolute left-0 top-0 w-[22px] h-full bg-blue-accent rounded-l-[8px] border border-blue-accent flex flex-col items-center pt-1">
          <svg
            className="w-[20px] h-[9px]"
            viewBox="0 0 23 11"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect width="23" height="11" rx="5" fill="#0078FF" />
            <circle cx="6.5" cy="7.5" r="1.5" fill="#94BCFF" />
            <circle cx="6.5" cy="3.5" r="1.5" fill="#94BCFF" />
            <circle cx="11.5" cy="7.5" r="1.5" fill="#94BCFF" />
            <circle cx="11.5" cy="3.5" r="1.5" fill="#94BCFF" />
            <circle cx="16.5" cy="7.5" r="1.5" fill="#94BCFF" />
            <circle cx="16.5" cy="3.5" r="1.5" fill="#94BCFF" />
          </svg>
        </div>

        <div className="pl-[40px] pr-[24px] py-[14px]">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-4 gap-4">
            <div className="flex-1 w-full lg:max-w-[390px] min-w-0">
              <div
                className="bg-[#F9F9FF] rounded-[10px] p-2 flex flex-col min-h-[150px]"
                style={{
                  justifyContent:
                    formatting.verticalAlignment === "center"
                      ? "center"
                      : formatting.verticalAlignment === "bottom"
                        ? "flex-end"
                        : "flex-start",
                }}
              >
                <textarea
                  value={question.text}
                  onChange={(e) => updateQuestion({ text: e.target.value })}
                  onFocus={() => onSelect?.(question.id)}
                  placeholder="Место для текста"
                  className="w-full bg-transparent border-none outline-none resize-none"
                  style={textareaStyle}
                  rows={question.type === "text_paragraph" ? 3 : 2}
                />
              </div>

              {question.description !== undefined ? (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="text-[#696F79] text-[15px]">Описание</div>
                    <button
                      onClick={() => updateQuestion({ description: undefined })}
                      className="text-[#696F79] text-xs hover:text-red-500"
                    >
                      Удалить описание
                    </button>
                  </div>
                  <div className="h-0.5 bg-[#696F79] w-full max-w-[421px] mb-1"></div>
                  <textarea
                    value={question.description || ""}
                    onChange={(e) =>
                      updateQuestion({ description: e.target.value })
                    }
                    placeholder="Дополнительная инструкция (опционально)"
                    className="w-full max-w-[421px] bg-transparent border-none outline-none resize-none text-[#696F79] text-[14px] italic"
                    rows={2}
                  />
                </div>
              ) : (
                <button
                  onClick={() => updateQuestion({ description: "" })}
                  className="mt-2 text-blue-accent text-[14px] hover:underline"
                >
                  + Добавить описание
                </button>
              )}

              {question.type === "text_line" && (
                <div className="mt-3">
                  <div className="text-[#696F79] text-[15px] mb-0.5">
                    Краткий ответ
                  </div>
                  <input
                    type="text"
                    value={question.answerPlaceholder || ""}
                    onChange={(e) =>
                      updateQuestion({
                        answerPlaceholder: e.target.value || undefined,
                      })
                    }
                    placeholder="Введите краткий ответ..."
                    className="w-full max-w-[421px] bg-transparent border-b border-[#696F79] text-[#696F79] text-[14px] pb-1 outline-none focus:border-blue-accent focus:text-blue-accent"
                  />
                </div>
              )}

              {question.type === "text_paragraph" && (
                <div className="mt-3">
                  <div className="text-[#696F79] text-[15px] mb-0.5">
                    Краткий ответ
                  </div>
                  <textarea
                    value={question.answerPlaceholder || ""}
                    onChange={(e) =>
                      updateQuestion({
                        answerPlaceholder: e.target.value || undefined,
                      })
                    }
                    placeholder="Введите развёрнутый ответ..."
                    rows={3}
                    className="w-full max-w-[421px] bg-transparent border-b border-[#696F79] text-[#696F79] text-[14px] pb-1 outline-none focus:border-blue-accent focus:text-blue-accent resize-none"
                  />
                </div>
              )}

              {(question.type === "single_choice" ||
                question.type === "multiple_choice") && (
                <div className="mt-4 flex flex-col gap-2">
                  {question.options?.map((option, index) => (
                    <div key={index} className="flex items-center gap-2.5">
                      {question.type === "single_choice" ? (
                        <svg
                          className="w-[21px] h-[21px] flex-shrink-0"
                          viewBox="0 0 21 21"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <circle
                            cx="10.5"
                            cy="10.5"
                            r="10"
                            stroke="#696F79"
                            strokeWidth="1"
                            fill="none"
                          />
                        </svg>
                      ) : (
                        <div className="w-5 h-5 rounded-[5px] border border-black/10 flex-shrink-0"></div>
                      )}
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => updateOption(index, e.target.value)}
                        placeholder="Вопрос"
                        className="text-[#696F79] text-[15px] bg-transparent border-none outline-none flex-1"
                      />
                      {index > 1 && (
                        <button
                          onClick={() => deleteOption(index)}
                          className="text-red-500 text-xs"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={addOption}
                    className="flex items-center gap-2.5 text-blue-accent text-[15px]"
                  >
                    {question.type === "single_choice" ? (
                      <svg
                        className="w-[21px] h-[21px] flex-shrink-0"
                        viewBox="0 0 21 21"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <circle
                          cx="10.5"
                          cy="10.5"
                          r="10"
                          stroke="#0078FF"
                          strokeWidth="1"
                          fill="none"
                        />
                      </svg>
                    ) : (
                      <div className="w-5 h-5 rounded-[5px] border border-blue-accent flex-shrink-0"></div>
                    )}
                    Добавить вариант
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-start gap-2 min-w-0 flex-wrap lg:flex-nowrap">
              <div className="relative min-w-0 flex-1 lg:flex-initial">
                <button
                  ref={typeButtonRef}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTypeButtonClick();
                  }}
                  className="flex items-center justify-between gap-4 px-4 py-2 border border-[#696F79] rounded-[3px] w-full sm:w-[201px] h-[34px] whitespace-nowrap overflow-hidden"
                >
                  <span className="text-black text-sm truncate">
                    {questionTypeLabels[question.type]}
                  </span>
                  <svg
                    className="w-4 h-4 flex-shrink-0"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12.8 5L8 9.7L3.2 5L2.5 5.7L8 11L13.5 5.7L12.8 5Z"
                      fill="black"
                    />
                  </svg>
                </button>

                {showTypeDropdown && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="fixed sm:absolute top-full left-0 right-0 sm:left-0 sm:right-auto mt-1 max-w-[90vw] sm:w-[201px] max-h-[50vh] overflow-y-auto bg-white border border-[#5E5D62] rounded shadow-lg z-50"
                    style={
                      dropdownPosition && window.innerWidth < 640
                        ? {
                            position: "fixed",
                            top: `${dropdownPosition.top}px`,
                            left: `${dropdownPosition.left}px`,
                            width: `${dropdownPosition.width}px`,
                            maxWidth: "calc(100vw - 16px)",
                          }
                        : undefined
                    }
                  >
                    {Object.entries(questionTypeLabels).map(([type, label]) => (
                      <button
                        key={type}
                        onClick={() => {
                          updateQuestion({ type: type as QuestionType });
                          setShowTypeDropdown(false);
                          if (
                            type === "single_choice" ||
                            type === "multiple_choice"
                          ) {
                            if (
                              !question.options ||
                              question.options.length === 0
                            ) {
                              updateQuestion({
                                type: type as QuestionType,
                                options: ["Вопрос", "Вопрос"],
                              });
                            }
                          }
                        }}
                        className="w-full px-4 py-2 text-left text-[#696F79] text-sm hover:bg-gray-100 truncate"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {question.isRequired && (
                <span className="text-[#9D0000] text-xl leading-[34px] flex-shrink-0">
                  *
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-4">
            <button onClick={() => onDuplicate(question)}>
              <svg
                className="w-6 h-6"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M11 4C11 3.06812 11 2.60218 10.8478 2.23463C10.6448 1.74458 10.2554 1.35523 9.76537 1.15224C9.39782 1 8.93188 1 8 1H5C3.11438 1 2.17157 1 1.58579 1.58579C1 2.17157 1 3.11438 1 5V8C1 8.93188 1 9.39782 1.15224 9.76537C1.35523 10.2554 1.74458 10.6448 2.23463 10.8478C2.60218 11 3.06812 11 4 11"
                  stroke="#33363F"
                  strokeWidth="2"
                />
                <rect
                  x="10"
                  y="10"
                  width="10"
                  height="10"
                  rx="2"
                  stroke="#33363F"
                  strokeWidth="2"
                />
              </svg>
            </button>

            <button
              onClick={() => onFormatClick?.(question.id)}
              className="lg:hidden"
              title="Форматирование"
            >
              <svg
                className="w-6 h-6"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M3 3H21M3 7H21M3 11H21M3 15H21M3 19H21"
                  stroke="#33363F"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            <button onClick={() => onDelete(question.id)}>
              <svg
                className="w-6 h-6"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M10 15L10 12"
                  stroke="#33363F"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M14 15L14 12"
                  stroke="#33363F"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M3 7H21C20.0681 7 19.6022 7 19.2346 7.15224C18.7446 7.35523 18.3552 7.74458 18.1522 8.23463C18 8.60218 18 9.06812 18 10V16C18 17.8856 18 18.8284 17.4142 19.4142C16.8284 20 15.8856 20 14 20H10C8.11438 20 7.17157 20 6.58579 19.4142C6 18.8284 6 17.8856 6 16V10C6 9.06812 6 8.60218 5.84776 8.23463C5.64477 7.74458 5.25542 7.35523 4.76537 7.15224C4.39782 7 3.93188 7 3 7Z"
                  stroke="#33363F"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M10.0681 3.37059C10.1821 3.26427 10.4332 3.17033 10.7825 3.10332C11.1318 3.03632 11.5597 3 12 3C12.4403 3 12.8682 3.03632 13.2175 3.10332C13.5668 3.17033 13.8179 3.26427 13.9319 3.37059"
                  stroke="#33363F"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            <div className="w-px h-6 bg-black"></div>

            <div className="flex items-center gap-2 text-[#696F79] text-[10px]">
              <span>Обязательный вопрос</span>
              <button
                onClick={() =>
                  updateQuestion({ isRequired: !question.isRequired })
                }
                className={`w-[26px] h-[14px] rounded-full relative transition-colors ${
                  question.isRequired ? "bg-white shadow" : "bg-white shadow"
                }`}
              >
                <div
                  className={`w-[11px] h-[11px] rounded-full absolute top-0.5 transition-all ${
                    question.isRequired
                      ? "left-0.5 bg-blue-accent"
                      : "right-0.5 bg-[#696F79]"
                  }`}
                ></div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
