import type { MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useDeleteSurvey } from "@/hooks/useSurveys";
import { useState } from "react";
import AccessModal from "./AccessModal";

interface SurveyCardProps {
  id?: number;
  dateRange: string;
  description: string;
  target: string;
  isActive: boolean;
  createdAt?: Date | string;
  onAccessChanged?: () => void;
}

async function fallbackCopy(text: string) {
  if (typeof document === "undefined") {
    throw new Error("Clipboard fallback unavailable");
  }

  return new Promise<void>((resolve, reject) => {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "absolute";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();

    const successful = document.execCommand?.("copy");

    document.body.removeChild(textarea);

    if (successful) {
      resolve();
    } else {
      reject(new Error("Clipboard fallback failed"));
    }
  });
}

async function canUseClipboardAPI() {
  if (typeof navigator === "undefined" || !navigator.clipboard) {
    return false;
  }

  const permissionQuery = navigator.permissions?.query;
  if (!permissionQuery) {
    return true;
  }

  try {
    const permission = await navigator.permissions.query({
      name: "clipboard-write" as PermissionName,
    });

    return permission.state === "granted" || permission.state === "prompt";
  } catch (error) {
    console.warn("Clipboard permission query failed", error);
    return false;
  }
}

async function copyTextToClipboard(text: string) {
  if (await canUseClipboardAPI()) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch (error) {
      console.warn("Clipboard write failed", error);
    }
  }

  await fallbackCopy(text);
}

function formatCreatedDate(date?: Date | string): string {
  if (!date) return "";
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const day = String(dateObj.getDate()).padStart(2, "0");
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const year = dateObj.getFullYear();
  return `${day}.${month}.${year}`;
}

export default function SurveyCard({
  id,
  dateRange,
  description,
  target,
  isActive,
  createdAt,
  onAccessChanged,
}: SurveyCardProps) {
  const navigate = useNavigate();
  const deleteMut = useDeleteSurvey();
  const { toast } = useToast();
  const [showMenu, setShowMenu] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);

  const handleClick = () => {
    if (id) {
      navigate(`/survey/${id}`);
    }
  };

  const handleTakeSurvey = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (!id) return;

    const url = `${window.location.origin}/take-survey/${id}`;

    try {
      await copyTextToClipboard(url);
      toast({
        title: "Ссылка скопирована",
        description:
          "Вставьте ссылку в мессенджер или почту и отправьте участникам. Каждое устройство может пройти опрос только один раз.",
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Не удалось скопировать ссылку",
        description: "Скопируйте ссылку вручную и отправьте участникам.",
      });
    }
  };

  const handleDeleteClick = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!id) return;
    if (!confirm("Удалить опрос?")) return;
    try {
      await deleteMut.mutateAsync(id);
    } catch (err) {
      console.error(err);
      alert("Ошибка при удалении опроса");
    }
  };

  return (
    <>
      <div className="relative w-full cursor-pointer" onClick={handleClick}>
        <div className="rounded-[33px] border-2 border-blue-accent bg-light-bg overflow-hidden hover:shadow-lg transition-shadow">
          <div className="flex">
            <div className="w-[54px] bg-blue-accent rounded-l-[33px] flex-shrink-0" />

            <div className="flex-1 p-6 lg:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4 lg:mb-6">
                <button
                  onClick={handleTakeSurvey}
                  onMouseDown={(e) => e.stopPropagation()}
                  type="button"
                  className="bg-blue-accent text-white rounded-full px-4 py-2 shadow hover:bg-blue-accent/90 text-sm font-semibold whitespace-nowrap"
                  aria-label="Скопировать ссылку на опрос"
                >
                  Скопировать ссылку
                </button>
                <div
                  className="flex flex-wrap gap-3 lg:gap-4 items-center justify-end"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="bg-blue-accent text-white px-3 lg:px-4 py-1.5 lg:py-2 rounded text-xs lg:text-sm font-bold">
                    {target}
                  </span>
                  <div className="flex items-center gap-2 bg-blue-accent text-white px-3 lg:px-4 py-1.5 lg:py-2 rounded text-xs lg:text-sm font-bold">
                    <svg
                      className="w-4 h-4 lg:w-5 lg:h-5"
                      viewBox="0 0 20 12"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M19.8287 5.89565C19.8287 5.47316 19.5683 5.22 19.0476 4.71368C17.4094 3.12101 14.1248 0.483093 10.34 0.483093C6.55519 0.483093 3.27065 3.12101 1.63249 4.71368C1.11171 5.22 0.851318 5.47316 0.851318 5.89565C0.851318 6.31813 1.11171 6.57129 1.63249 7.07761C3.27065 8.67029 6.55519 11.3082 10.34 11.3082C14.1248 11.3082 17.4094 8.67029 19.0476 7.07761C19.5683 6.57129 19.8287 6.31813 19.8287 5.89565ZM10.34 8.60192C12.1472 8.60192 13.6122 7.39028 13.6122 5.89565C13.6122 4.40101 12.1472 3.18937 10.34 3.18937C8.53287 3.18937 7.06788 4.40101 7.06788 5.89565C7.06788 7.39028 8.53287 8.60192 10.34 8.60192Z"
                        fill="white"
                      />
                    </svg>
                    <span>{isActive ? "Активен" : "Не Активен"}</span>
                  </div>
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowMenu(!showMenu);
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      type="button"
                      className="bg-white rounded-full p-2 shadow hover:bg-gray-50"
                      aria-label="Меню опроса"
                    >
                      <svg
                        className="w-4 h-4 text-gray-600"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <circle cx="12" cy="5" r="2" />
                        <circle cx="12" cy="12" r="2" />
                        <circle cx="12" cy="19" r="2" />
                      </svg>
                    </button>
                    {showMenu && (
                      <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[200px]">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowAccessModal(true);
                            setShowMenu(false);
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          type="button"
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-gray-700 border-b border-gray-100"
                        >
                          Настроить доступ
                        </button>
                        <button
                          onClick={handleDeleteClick}
                          onMouseDown={(e) => e.stopPropagation()}
                          type="button"
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-red-600"
                        >
                          Удалить опрос
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-blue-accent/50 rounded p-4 lg:p-6">
                <div className="mb-3 lg:mb-4 flex flex-wrap gap-2 items-center">
                  <div className="inline-block bg-blue-accent text-white px-3 lg:px-4 py-2 rounded text-xs lg:text-sm font-bold">
                    {dateRange}
                  </div>
                  {createdAt && (
                    <div className="inline-block bg-blue-accent text-white px-3 lg:px-4 py-2 rounded text-xs lg:text-sm font-bold">
                      Создан: {formatCreatedDate(createdAt)}
                    </div>
                  )}
                </div>
                <p className="text-white text-sm lg:text-base leading-relaxed">
                  {description}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {id && (
        <AccessModal
          isOpen={showAccessModal}
          onClose={() => setShowAccessModal(false)}
          onAccessChanged={onAccessChanged}
          itemId={id}
          itemType="survey"
          itemName={description}
        />
      )}
    </>
  );
}
