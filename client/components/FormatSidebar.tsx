import { useState, useEffect } from "react";
import { QuestionData } from "./QuestionCard";

export default function FormatSidebar({
  onSave,
  disabled,
  selectedQuestion,
  onUpdateFormatting,
}: {
  onSave: () => void;
  disabled?: boolean;
  selectedQuestion?: QuestionData;
  onUpdateFormatting?: (
    formatting: Partial<QuestionData["formatting"]>,
  ) => void;
}) {
  const [alignment, setAlignment] = useState<
    "left" | "center" | "right" | "justify" | "distribute" | "space-evenly"
  >("left");
  const [verticalAlignment, setVerticalAlignment] = useState<
    "top" | "center" | "bottom"
  >("top");
  const [fontSize, setFontSize] = useState(16);
  const [fontColor, setFontColor] = useState("#000000");
  const [lineHeight, setLineHeight] = useState(1.5);
  const [paragraphSpacing, setParagraphSpacing] = useState(8);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [fontFamily, setFontFamily] = useState("Helvetica");
  const [fontWeight, setFontWeight] = useState<"400" | "700">("400");
  const [fontDropdownOpen, setFontDropdownOpen] = useState(false);
  const [weightDropdownOpen, setWeightDropdownOpen] = useState(false);

  const fontOptions = [
    "Helvetica",
    "Arial",
    "Times New Roman",
    "Courier New",
    "Georgia",
    "Verdana",
    "Comic Sans MS",
  ];

  const weightOptions = [
    { label: "Regular", value: "400" as const },
    { label: "Bold", value: "700" as const },
  ];

  useEffect(() => {
    if (selectedQuestion?.formatting) {
      setAlignment(selectedQuestion.formatting.alignment || "left");
      setVerticalAlignment(
        selectedQuestion.formatting.verticalAlignment || "top",
      );
      setFontSize(selectedQuestion.formatting.fontSize || 16);
      setFontColor(selectedQuestion.formatting.color || "#000000");
      setLineHeight(selectedQuestion.formatting.lineHeight || 1.5);
      setParagraphSpacing(selectedQuestion.formatting.paragraphSpacing || 8);
      setIsBold(selectedQuestion.formatting.isBold || false);
      setIsItalic(selectedQuestion.formatting.isItalic || false);
      setIsUnderline(selectedQuestion.formatting.isUnderline || false);
      setIsStrikethrough(selectedQuestion.formatting.isStrikethrough || false);
      setFontFamily(selectedQuestion.formatting.fontFamily || "Helvetica");
      setFontWeight(selectedQuestion.formatting.fontWeight || "400");
    } else {
      setAlignment("left");
      setVerticalAlignment("top");
      setFontSize(16);
      setFontColor("#000000");
      setLineHeight(1.5);
      setParagraphSpacing(8);
      setIsBold(false);
      setIsItalic(false);
      setIsUnderline(false);
      setIsStrikethrough(false);
      setFontFamily("Helvetica");
      setFontWeight("400");
    }
  }, [selectedQuestion]);

  const handleAlignmentChange = (
    newAlignment:
      | "left"
      | "center"
      | "right"
      | "justify"
      | "distribute"
      | "space-evenly",
  ) => {
    setAlignment(newAlignment);
    onUpdateFormatting?.({ alignment: newAlignment });
  };

  const handleVerticalAlignmentChange = (
    newVerticalAlignment: "top" | "center" | "bottom",
  ) => {
    setVerticalAlignment(newVerticalAlignment);
    onUpdateFormatting?.({ verticalAlignment: newVerticalAlignment });
  };

  const handleFontFamilyChange = (newFont: string) => {
    setFontFamily(newFont);
    onUpdateFormatting?.({ fontFamily: newFont });
    setFontDropdownOpen(false);
  };

  const handleFontWeightChange = (newWeight: "400" | "700") => {
    setFontWeight(newWeight);
    setIsBold(newWeight === "700");
    onUpdateFormatting?.({
      fontWeight: newWeight,
      isBold: newWeight === "700",
    });
    setWeightDropdownOpen(false);
  };

  const handleFontSizeChange = (newSize: number) => {
    setFontSize(newSize);
    onUpdateFormatting?.({ fontSize: newSize });
  };

  const handleColorChange = (newColor: string) => {
    setFontColor(newColor);
    onUpdateFormatting?.({ color: newColor });
  };

  const handleLineHeightChange = (newHeight: number) => {
    setLineHeight(newHeight);
    onUpdateFormatting?.({ lineHeight: newHeight });
  };

  const handleParagraphSpacingChange = (newSpacing: number) => {
    setParagraphSpacing(newSpacing);
    onUpdateFormatting?.({ paragraphSpacing: newSpacing });
  };

  const handleItalicToggle = () => {
    const newItalic = !isItalic;
    setIsItalic(newItalic);
    onUpdateFormatting?.({ isItalic: newItalic });
  };

  const handleUnderlineToggle = () => {
    const newUnderline = !isUnderline;
    setIsUnderline(newUnderline);
    onUpdateFormatting?.({ isUnderline: newUnderline });
  };

  const handleStrikethroughToggle = () => {
    const newStrikethrough = !isStrikethrough;
    setIsStrikethrough(newStrikethrough);
    onUpdateFormatting?.({ isStrikethrough: newStrikethrough });
  };

  if (!selectedQuestion) {
    return (
      <div className="w-[273px] h-screen bg-white border-l border-[#EFF2F7] flex items-center justify-center">
        <p className="text-gray-400 text-center px-4">
          Выберите вопрос для форматирования
        </p>
      </div>
    );
  }

  return (
    <div className="w-[273px] h-screen bg-white border-l border-[#EFF2F7] flex flex-col overflow-y-auto">
      <div className="border-t border-[#EFF2F7]"></div>
      <div className="p-4 flex flex-col gap-6">
        <div>
          <h3 className="text-black text-[15px] font-medium mb-3">
            Выравнивание
          </h3>
          <div className="flex flex-col gap-1">
            <div className="flex gap-1 p-1 bg-[#EFF2F7] rounded-xl">
              <button
                onClick={() => handleAlignmentChange("left")}
                className={`flex-1 p-1 rounded-lg ${alignment === "left" ? "bg-white" : "bg-[#EFF2F7]"}`}
              >
                <svg
                  className="w-5 h-5 mx-auto"
                  viewBox="0 0 20 20"
                  fill="none"
                >
                  <path
                    d="M10.8333 11.6667H6.66667C5.74619 11.6667 5 12.4129 5 13.3334V15.0001C5 15.9206 5.74619 16.6667 6.66667 16.6667H10.8333C11.7538 16.6667 12.5 15.9206 12.5 15.0001V13.3334C12.5 12.4129 11.7538 11.6667 10.8333 11.6667Z"
                    stroke="black"
                    strokeOpacity={alignment === "left" ? "1" : "0.4"}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M16.6667 3.33325H6.66667C5.74619 3.33325 5 4.07944 5 4.99992V6.66659C5 7.58706 5.74619 8.33325 6.66667 8.33325H16.6667C17.5871 8.33325 18.3333 7.58706 18.3333 6.66659V4.99992C18.3333 4.07944 17.5871 3.33325 16.6667 3.33325Z"
                    stroke="black"
                    strokeOpacity={alignment === "left" ? "1" : "0.4"}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M1.6665 1.66675V18.3334"
                    stroke="black"
                    strokeOpacity={alignment === "left" ? "1" : "0.4"}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <button
                onClick={() => handleAlignmentChange("center")}
                className={`flex-1 p-1 rounded-lg ${alignment === "center" ? "bg-white" : "bg-[#EFF2F7]"}`}
              >
                <svg
                  className="w-5 h-5 mx-auto"
                  viewBox="0 0 20 20"
                  fill="none"
                >
                  <g clipPath="url(#clip0_align_center_v)">
                    <path
                      d="M10 1.66675V18.3334"
                      stroke="black"
                      strokeOpacity={alignment === "center" ? "1" : "0.4"}
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M6.6665 8.33325H3.33317C2.89114 8.33325 2.46722 8.15766 2.15466 7.8451C1.8421 7.53254 1.6665 7.10861 1.6665 6.66659V4.99992C1.6665 4.08325 2.4165 3.33325 3.33317 3.33325H6.6665"
                      stroke="black"
                      strokeOpacity={alignment === "center" ? "1" : "0.4"}
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M13.3335 8.33325H16.6668C17.1089 8.33325 17.5328 8.15766 17.8453 7.8451C18.1579 7.53254 18.3335 7.10861 18.3335 6.66659V4.99992C18.3335 4.55789 18.1579 4.13397 17.8453 3.82141C17.5328 3.50885 17.1089 3.33325 16.6668 3.33325H13.3335"
                      stroke="black"
                      strokeOpacity={alignment === "center" ? "1" : "0.4"}
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M6.6665 16.6667H5.83317C5.39114 16.6667 4.96722 16.4912 4.65466 16.1786C4.3421 15.866 4.1665 15.4421 4.1665 15.0001V13.3334C4.1665 12.4167 4.9165 11.6667 5.83317 11.6667H6.6665"
                      stroke="black"
                      strokeOpacity={alignment === "center" ? "1" : "0.4"}
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M13.3335 11.6667H14.1668C14.6089 11.6667 15.0328 11.8423 15.3453 12.1549C15.6579 12.4675 15.8335 12.8914 15.8335 13.3334V15.0001C15.8335 15.4421 15.6579 15.866 15.3453 16.1786C15.0328 16.4912 14.6089 16.6667 14.1668 16.6667H13.3335"
                      stroke="black"
                      strokeOpacity={alignment === "center" ? "1" : "0.4"}
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                  <defs>
                    <clipPath id="clip0_align_center_v">
                      <rect width="20" height="20" fill="white" />
                    </clipPath>
                  </defs>
                </svg>
              </button>
              <button
                onClick={() => handleAlignmentChange("right")}
                className={`flex-1 p-1 rounded-lg ${alignment === "right" ? "bg-white" : "bg-[#EFF2F7]"}`}
              >
                <svg
                  className="w-5 h-5 mx-auto"
                  viewBox="0 0 20 20"
                  fill="none"
                >
                  <path
                    d="M13.3332 3.33325H3.33317C2.4127 3.33325 1.6665 4.07944 1.6665 4.99992V6.66659C1.6665 7.58706 2.4127 8.33325 3.33317 8.33325H13.3332C14.2536 8.33325 14.9998 7.58706 14.9998 6.66659V4.99992C14.9998 4.07944 14.2536 3.33325 13.3332 3.33325Z"
                    stroke="black"
                    strokeOpacity={alignment === "right" ? "1" : "0.4"}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M13.3333 11.6667H9.16667C8.24619 11.6667 7.5 12.4129 7.5 13.3334V15.0001C7.5 15.9206 8.24619 16.6667 9.16667 16.6667H13.3333C14.2538 16.6667 15 15.9206 15 15.0001V13.3334C15 12.4129 14.2538 11.6667 13.3333 11.6667Z"
                    stroke="black"
                    strokeOpacity={alignment === "right" ? "1" : "0.4"}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M18.3335 18.3334V1.66675"
                    stroke="black"
                    strokeOpacity={alignment === "right" ? "1" : "0.4"}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
            <div className="flex gap-1 p-1 bg-[#EFF2F7] rounded-xl">
              <button
                onClick={() => handleVerticalAlignmentChange("top")}
                className={`flex-1 p-1 rounded-lg ${verticalAlignment === "top" ? "bg-white" : "bg-[#EFF2F7]"}`}
              >
                <svg
                  className="w-5 h-5 mx-auto"
                  viewBox="0 0 20 20"
                  fill="none"
                >
                  <path
                    d="M6.66683 5H5.00016C4.07969 5 3.3335 5.74619 3.3335 6.66667V16.6667C3.3335 17.5871 4.07969 18.3333 5.00016 18.3333H6.66683C7.5873 18.3333 8.3335 17.5871 8.3335 16.6667V6.66667C8.3335 5.74619 7.5873 5 6.66683 5Z"
                    stroke="black"
                    strokeOpacity={verticalAlignment === "top" ? "1" : "0.4"}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M14.9998 5H13.3332C12.4127 5 11.6665 5.74619 11.6665 6.66667V10.8333C11.6665 11.7538 12.4127 12.5 13.3332 12.5H14.9998C15.9203 12.5 16.6665 11.7538 16.6665 10.8333V6.66667C16.6665 5.74619 15.9203 5 14.9998 5Z"
                    stroke="black"
                    strokeOpacity={verticalAlignment === "top" ? "1" : "0.4"}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M18.3332 1.66675H1.6665"
                    stroke="black"
                    strokeOpacity={verticalAlignment === "top" ? "1" : "0.4"}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <button
                onClick={() => handleVerticalAlignmentChange("center")}
                className={`flex-1 p-1 rounded-lg ${verticalAlignment === "center" ? "bg-white" : "bg-[#EFF2F7]"}`}
              >
                <svg
                  className="w-5 h-5 mx-auto"
                  viewBox="0 0 20 20"
                  fill="none"
                >
                  <g clipPath="url(#clip0_align_center_h)">
                    <path
                      d="M1.6665 10H18.3332"
                      stroke="black"
                      strokeOpacity={
                        verticalAlignment === "center" ? "1" : "0.4"
                      }
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M8.3335 13.3333V16.6666C8.3335 17.1086 8.1579 17.5325 7.84534 17.8451C7.53278 18.1577 7.10886 18.3333 6.66683 18.3333H5.00016C4.55814 18.3333 4.13421 18.1577 3.82165 17.8451C3.50909 17.5325 3.3335 17.1086 3.3335 16.6666V13.3333"
                      stroke="black"
                      strokeOpacity={
                        verticalAlignment === "center" ? "1" : "0.4"
                      }
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M8.3335 6.66675V3.33341C8.3335 2.89139 8.1579 2.46746 7.84534 2.1549C7.53278 1.84234 7.10886 1.66675 6.66683 1.66675H5.00016C4.55814 1.66675 4.13421 1.84234 3.82165 2.1549C3.50909 2.46746 3.3335 2.89139 3.3335 3.33341V6.66675"
                      stroke="black"
                      strokeOpacity={
                        verticalAlignment === "center" ? "1" : "0.4"
                      }
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M16.6665 13.3333V14.1666C16.6665 14.6086 16.4909 15.0325 16.1783 15.3451C15.8658 15.6577 15.4419 15.8333 14.9998 15.8333H13.3332C12.8911 15.8333 12.4672 15.6577 12.1547 15.3451C11.8421 15.0325 11.6665 14.6086 11.6665 14.1666V13.3333"
                      stroke="black"
                      strokeOpacity={
                        verticalAlignment === "center" ? "1" : "0.4"
                      }
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M11.6665 6.66675V5.83341C11.6665 4.91675 12.4165 4.16675 13.3332 4.16675H14.9998C15.4419 4.16675 15.8658 4.34234 16.1783 4.6549C16.4909 4.96746 16.6665 5.39139 16.6665 5.83341V6.66675"
                      stroke="black"
                      strokeOpacity={
                        verticalAlignment === "center" ? "1" : "0.4"
                      }
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                  <defs>
                    <clipPath id="clip0_align_center_h">
                      <rect width="20" height="20" fill="white" />
                    </clipPath>
                  </defs>
                </svg>
              </button>
              <button
                onClick={() => handleVerticalAlignmentChange("bottom")}
                className={`flex-1 p-1 rounded-lg ${verticalAlignment === "bottom" ? "bg-white" : "bg-[#EFF2F7]"}`}
              >
                <svg
                  className="w-5 h-5 mx-auto"
                  viewBox="0 0 20 20"
                  fill="none"
                >
                  <path
                    d="M6.66683 1.66675H5.00016C4.07969 1.66675 3.3335 2.41294 3.3335 3.33341V13.3334C3.3335 14.2539 4.07969 15.0001 5.00016 15.0001H6.66683C7.5873 15.0001 8.3335 14.2539 8.3335 13.3334V3.33341C8.3335 2.41294 7.5873 1.66675 6.66683 1.66675Z"
                    stroke="black"
                    strokeOpacity={verticalAlignment === "bottom" ? "1" : "0.4"}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M14.9998 7.5H13.3332C12.4127 7.5 11.6665 8.24619 11.6665 9.16667V13.3333C11.6665 14.2538 12.4127 15 13.3332 15H14.9998C15.9203 15 16.6665 14.2538 16.6665 13.3333V9.16667C16.6665 8.24619 15.9203 7.5 14.9998 7.5Z"
                    stroke="black"
                    strokeOpacity={verticalAlignment === "bottom" ? "1" : "0.4"}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M18.3332 18.3333H1.6665"
                    stroke="black"
                    strokeOpacity={verticalAlignment === "bottom" ? "1" : "0.4"}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-[#EFF2F7] pt-6">
          <h3 className="text-black text-[15px] font-medium mb-3">Шрифт</h3>
          <div className="flex gap-2 mb-3 relative">
            <div
              onClick={() => setFontDropdownOpen(!fontDropdownOpen)}
              className="flex-1 flex items-center justify-between px-3 py-2 bg-[#EFF2F7] rounded-xl cursor-pointer"
            >
              <span className="text-black/80 text-[15px]">{fontFamily}</span>
              <svg className="w-4 h-4" viewBox="0 0 11 6" fill="none">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M0.21967 0.21967C0.512563 -0.0732233 0.987437 -0.0732233 1.28033 0.21967L5.07322 4.01256C5.17085 4.11019 5.32914 4.11019 5.42678 4.01256L9.21967 0.21967C9.51256 -0.0732233 9.98744 -0.0732233 10.2803 0.21967C10.5732 0.512563 10.5732 0.987437 10.2803 1.28033L6.48744 5.07322C5.80402 5.75664 4.69598 5.75664 4.01256 5.07322L0.21967 1.28033C-0.0732233 0.987437 -0.0732233 0.512563 0.21967 0.21967Z"
                  fill="#262626"
                />
              </svg>
            </div>
            {fontDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-full bg-white border border-[#EFF2F7] rounded-xl shadow-lg z-10 max-h-60 overflow-y-auto">
                {fontOptions.map((font) => (
                  <button
                    key={font}
                    onClick={() => handleFontFamilyChange(font)}
                    className={`w-full px-3 py-2 text-left text-[15px] hover:bg-[#EFF2F7] ${fontFamily === font ? "bg-blue-accent text-white" : "text-black/80"}`}
                    style={{ fontFamily: font }}
                  >
                    {font}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2 mb-3">
            <div className="flex-1 relative">
              <div
                onClick={() => setWeightDropdownOpen(!weightDropdownOpen)}
                className="flex items-center justify-between px-3 py-2 bg-[#EFF2F7] rounded-xl cursor-pointer"
              >
                <span className="text-black/80 text-[15px]">
                  {weightOptions.find((w) => w.value === fontWeight)?.label}
                </span>
                <svg className="w-4 h-4" viewBox="0 0 11 6" fill="none">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M0.21967 0.21967C0.512563 -0.0732233 0.987437 -0.0732233 1.28033 0.21967L5.07322 4.01256C5.17085 4.11019 5.32914 4.11019 5.42678 4.01256L9.21967 0.21967C9.51256 -0.0732233 9.98744 -0.0732233 10.2803 0.21967C10.5732 0.512563 10.5732 0.987437 10.2803 1.28033L6.48744 5.07322C5.80402 5.75664 4.69598 5.75664 4.01256 5.07322L0.21967 1.28033C-0.0732233 0.987437 -0.0732233 0.512563 0.21967 0.21967Z"
                    fill="#262626"
                  />
                </svg>
              </div>
              {weightDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-full bg-white border border-[#EFF2F7] rounded-xl shadow-lg z-10">
                  {weightOptions.map((weight) => (
                    <button
                      key={weight.value}
                      onClick={() => handleFontWeightChange(weight.value)}
                      className={`w-full px-3 py-2 text-left text-[15px] hover:bg-[#EFF2F7] ${fontWeight === weight.value ? "bg-blue-accent text-white" : "text-black/80"}`}
                      style={{ fontWeight: weight.value }}
                    >
                      {weight.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="w-[86px] flex items-center px-3 py-2 bg-[#EFF2F7] rounded-xl relative">
              <input
                type="number"
                value={fontSize}
                onChange={(e) => handleFontSizeChange(parseInt(e.target.value))}
                className="w-full bg-transparent border-none outline-none text-black/80 text-[15px]"
              />
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => handleFontSizeChange(fontSize + 1)}
                  className="w-4 h-2 flex items-center justify-center hover:opacity-70"
                  type="button"
                >
                  <svg className="w-3 h-2" viewBox="0 0 8 5" fill="none">
                    <path
                      d="M0.5 5L4 0.5L7.5 5"
                      stroke="#262626"
                      strokeWidth="1"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => handleFontSizeChange(fontSize - 1)}
                  className="w-4 h-2 flex items-center justify-center hover:opacity-70"
                  type="button"
                >
                  <svg className="w-3 h-2" viewBox="0 0 8 5" fill="none">
                    <path
                      d="M0.5 0.5L4 5L7.5 0.5"
                      stroke="#262626"
                      strokeWidth="1"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between px-3 py-[3px] bg-[#EFF2F7] rounded-xl">
            <input
              type="text"
              value={fontColor.toUpperCase()}
              onChange={(e) => {
                const value = e.target.value;
                if (value.startsWith("#") && value.length <= 7) {
                  handleColorChange(value);
                }
              }}
              className="flex-1 bg-transparent border-none outline-none text-black/80 text-[15px]"
            />
            <div className="relative">
              <input
                type="color"
                value={fontColor}
                onChange={(e) => handleColorChange(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <div
                className="w-[30px] h-[30px] rounded-[10px] border border-black/10"
                style={{ backgroundColor: fontColor }}
              ></div>
            </div>
          </div>
        </div>

        <div>
          <div className="flex gap-8 mb-3">
            <span className="text-black/80 text-[15px]">Интервал</span>
            <span className="text-black/80 text-[15px]">Параграф</span>
          </div>
          <div className="flex gap-3">
            <div className="flex-1 flex items-center px-3 py-2 bg-[#EFF2F7] rounded-xl">
              <input
                type="number"
                value={lineHeight}
                onChange={(e) =>
                  handleLineHeightChange(parseFloat(e.target.value))
                }
                step="0.1"
                className="w-full bg-transparent border-none outline-none text-black/80 text-[15px]"
              />
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => handleLineHeightChange(lineHeight + 0.1)}
                  className="w-4 h-2 flex items-center justify-center hover:opacity-70"
                  type="button"
                >
                  <svg className="w-3 h-2" viewBox="0 0 8 5" fill="none">
                    <path
                      d="M0.5 5L4 0.5L7.5 5"
                      stroke="#262626"
                      strokeWidth="1"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <button
                  onClick={() =>
                    handleLineHeightChange(Math.max(0.1, lineHeight - 0.1))
                  }
                  className="w-4 h-2 flex items-center justify-center hover:opacity-70"
                  type="button"
                >
                  <svg className="w-3 h-2" viewBox="0 0 8 5" fill="none">
                    <path
                      d="M0.5 0.5L4 5L7.5 0.5"
                      stroke="#262626"
                      strokeWidth="1"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 flex items-center px-3 py-2 bg-[#EFF2F7] rounded-xl">
              <input
                type="number"
                value={paragraphSpacing}
                onChange={(e) =>
                  handleParagraphSpacingChange(parseInt(e.target.value))
                }
                className="w-full bg-transparent border-none outline-none text-black/80 text-[15px]"
              />
              <div className="flex flex-col gap-1">
                <button
                  onClick={() =>
                    handleParagraphSpacingChange(paragraphSpacing + 1)
                  }
                  className="w-4 h-2 flex items-center justify-center hover:opacity-70"
                  type="button"
                >
                  <svg className="w-3 h-2" viewBox="0 0 8 5" fill="none">
                    <path
                      d="M0.5 5L4 0.5L7.5 5"
                      stroke="#262626"
                      strokeWidth="1"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <button
                  onClick={() =>
                    handleParagraphSpacingChange(
                      Math.max(0, paragraphSpacing - 1),
                    )
                  }
                  className="w-4 h-2 flex items-center justify-center hover:opacity-70"
                  type="button"
                >
                  <svg className="w-3 h-2" viewBox="0 0 8 5" fill="none">
                    <path
                      d="M0.5 0.5L4 5L7.5 0.5"
                      stroke="#262626"
                      strokeWidth="1"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-black/80 text-[15px] mb-3">Оформление</h3>
          <div className="flex gap-1 p-1 bg-[#EFF2F7] rounded-xl">
            <button
              onClick={handleItalicToggle}
              className={`flex-1 p-1 rounded-lg ${isItalic ? "bg-white" : "bg-[#EFF2F7]"}`}
            >
              <svg className="w-5 h-5 mx-auto" viewBox="0 0 9 12" fill="none">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M9 0.75C9 1.16421 8.66421 1.5 8.25 1.5H6.63296L3.93296 10.5H5.25C5.66421 10.5 6 10.8358 6 11.25C6 11.6642 5.66421 12 5.25 12H0.75C0.335786 12 0 11.6642 0 11.25C0 10.8358 0.335786 10.5 0.75 10.5H2.36692L5.06692 1.5H3.75C3.33579 1.5 3 1.16421 3 0.75C3 0.335786 3.33579 0 3.75 0H8.25C8.66421 0 9 0.335786 9 0.75Z"
                  fill="#262626"
                />
              </svg>
            </button>
            <button
              onClick={handleStrikethroughToggle}
              className={`flex-1 p-1 rounded-lg ${isStrikethrough ? "bg-white" : "bg-[#EFF2F7]"}`}
            >
              <svg className="w-5 h-5 mx-auto" viewBox="0 0 20 20" fill="none">
                <path
                  d="M3 10H17"
                  stroke={isStrikethrough ? "#262626" : "#262626"}
                  strokeOpacity={isStrikethrough ? "1" : "0.4"}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <path
                  d="M6 5C6 4.5 6.66667 3.33333 8.66667 3.33333H11.3333C13.3333 3.33333 14 4.5 14 5V7.5"
                  stroke={isStrikethrough ? "#262626" : "#262626"}
                  strokeOpacity={isStrikethrough ? "1" : "0.4"}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <path
                  d="M14 12.5V15C14 15.5 13.3333 16.6667 11.3333 16.6667H8.66667C6.66667 16.6667 6 15.5 6 15V12.5"
                  stroke={isStrikethrough ? "#262626" : "#262626"}
                  strokeOpacity={isStrikethrough ? "1" : "0.4"}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <button
              onClick={handleUnderlineToggle}
              className={`flex-1 p-1 rounded-lg ${isUnderline ? "bg-white" : "bg-[#EFF2F7]"}`}
            >
              <svg className="w-5 h-5 mx-auto" viewBox="0 0 9 12" fill="none">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M1.5 0.75C1.5 0.335786 1.16421 0 0.75 0C0.335786 0 0 0.335786 0 0.75L1.19209e-07 5C1.19209e-07 7.48528 2.01472 9.5 4.5 9.5C6.98528 9.5 9 7.48528 9 5V0.749999C9 0.335786 8.66421 0 8.25 0C7.83579 0 7.5 0.335786 7.5 0.75V5C7.5 6.65685 6.15685 8 4.5 8C2.84315 8 1.5 6.65685 1.5 5V0.75ZM8.25 12C8.66421 12 9 11.6642 9 11.25C9 10.8358 8.66421 10.5 8.25 10.5H0.75C0.335786 10.5 0 10.8358 0 11.25C0 11.6642 0.335786 12 0.75 12H8.25Z"
                  fill={isUnderline ? "#262626" : "rgba(0, 0, 0, 0.4)"}
                />
              </svg>
            </button>
          </div>
        </div>

        <button
          onClick={() => !disabled && onSave()}
          disabled={disabled}
          className={`w-full text-[#E0E0E1] text-sm px-3 py-2.5 rounded flex items-center justify-center ${disabled ? "bg-gray-300 cursor-not-allowed" : "bg-blue-accent hover:bg-blue-600"}`}
        >
          {disabled ? "Сохранение..." : "Сохранить"}
        </button>
      </div>
    </div>
  );
}
