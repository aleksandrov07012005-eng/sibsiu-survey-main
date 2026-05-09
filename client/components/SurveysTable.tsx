import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api } from "@/lib/api";
import AccessModal from "./AccessModal";

interface Survey {
  id: string;
  name: string;
  surveyId: string;
  date: string;
}

interface SurveysTableProps {
  surveys: Survey[];
  onItemsDeleted?: () => void;
  onAccessChanged?: () => void;
  itemType?: "survey" | "questionnaire";
}

export default function SurveysTable({
  surveys,
  onItemsDeleted,
  onAccessChanged,
  itemType = "survey",
}: SurveysTableProps) {
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [accessModalOpen, setAccessModalOpen] = useState(false);
  const [accessModalData, setAccessModalData] = useState<{
    id: number;
    name: string;
  } | null>(null);

  const isAllSelected =
    selectedItems.size === surveys.length && surveys.length > 0;
  const isIndeterminate =
    selectedItems.size > 0 && selectedItems.size < surveys.length;

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(surveys.map((s) => s.id)));
    }
  };

  const handleSelectItem = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const handleDeleteSelected = async () => {
    if (
      !window.confirm(
        `Удалить ${selectedItems.size} анкет(у)? Это действие не может быть отменено.`,
      )
    ) {
      return;
    }

    setDeleting(true);
    try {
      const deletePromises = Array.from(selectedItems).map((id) =>
        api(`/api/questionnaires/${id}`, { method: "DELETE" }),
      );
      await Promise.all(deletePromises);
      toast.success(`${selectedItems.size} анкета(т) удалена(ны)`);
      setSelectedItems(new Set());
      onItemsDeleted?.();
    } catch (error: any) {
      toast.error(error?.message || "Не удалось удалить анкеты");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="w-full rounded-[10px] bg-white shadow-[0_15px_40px_5px_rgba(237,237,237,1)] p-6 lg:p-10">
      {selectedItems.size > 0 && (
        <div className="mb-6 flex items-center justify-between bg-blue-50 border border-blue-100 rounded-lg p-4">
          <span className="text-sm font-semibold text-blue-900">
            Выбрано: {selectedItems.size} из {surveys.length}
          </span>
          <button
            onClick={handleDeleteSelected}
            disabled={deleting}
            className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600 disabled:opacity-60 transition-colors"
          >
            {deleting ? "Удаление…" : "Удалить выбранные"}
          </button>
        </div>
      )}

      <div className="flex flex-col">
        <div className="flex items-center border-b border-[#EFF2F7] bg-white h-[60px]">
          <div className="w-12 flex items-center justify-center">
            <button
              onClick={handleSelectAll}
              className="w-5 h-5 rounded border-2 border-black/20 flex items-center justify-center hover:border-blue-accent transition-colors"
              style={{
                backgroundColor: isAllSelected
                  ? "#0078FF"
                  : isIndeterminate
                    ? "#E0EFFF"
                    : "transparent",
                borderColor:
                  isAllSelected || isIndeterminate
                    ? "#0078FF"
                    : "rgba(0,0,0,0.2)",
              }}
              title={isAllSelected ? "Снять выделение" : "Выделить вс��"}
            >
              {isAllSelected && (
                <svg
                  className="w-3 h-3 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              {isIndeterminate && (
                <svg
                  className="w-3 h-3 text-blue-accent"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          </div>
          <div className="flex-1 flex items-center justify-between px-5">
            <span className="text-black text-xl font-medium">Название</span>
            <span className="text-black text-sm">Дата изменения</span>
          </div>
        </div>

        {surveys.map((survey) => (
          <div
            key={survey.id}
            className={`flex items-center border-b border-[#EFF2F7] bg-white min-h-[76px] py-4 relative transition-colors ${
              selectedItems.has(survey.id) ? "bg-blue-50" : "hover:bg-gray-50"
            }`}
          >
            <div className="w-12 flex items-center justify-center">
              <button
                onClick={() => handleSelectItem(survey.id)}
                className="w-5 h-5 rounded border-2 border-black/20 flex items-center justify-center hover:border-blue-accent transition-colors"
                style={{
                  backgroundColor: selectedItems.has(survey.id)
                    ? "#0078FF"
                    : "transparent",
                  borderColor: selectedItems.has(survey.id)
                    ? "#0078FF"
                    : "rgba(0,0,0,0.2)",
                }}
              >
                {selectedItems.has(survey.id) && (
                  <svg
                    className="w-3 h-3 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            </div>
            <div className="flex-1 flex items-center justify-between px-5">
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => navigate(`/ankety/${survey.id}`)}
                  className="text-black text-xl font-normal text-left hover:text-blue-accent transition-colors"
                >
                  {survey.name}
                </button>
                <span className="text-black/40 text-xs">
                  id {survey.surveyId}
                </span>
              </div>
              <div className="flex items-center gap-8">
                <span className="text-black text-sm">{survey.date}</span>
                <button
                  className="p-2 hover:bg-gray-100 rounded relative"
                  onClick={() =>
                    setActiveMenu(activeMenu === survey.id ? null : survey.id)
                  }
                >
                  <svg
                    className="w-[18px] h-1"
                    viewBox="0 0 18 4"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M1.75 3.5C2.7165 3.5 3.5 2.7165 3.5 1.75C3.5 0.7835 2.7165 0 1.75 0C0.7835 0 0 0.7835 0 1.75C0 2.7165 0.7835 3.5 1.75 3.5ZM15.75 3.5C16.7165 3.5 17.5 2.7165 17.5 1.75C17.5 0.7835 16.7165 0 15.75 0C14.7835 0 14 0.7835 14 1.75C14 2.7165 14.7835 3.5 15.75 3.5ZM10.5 1.75C10.5 2.7165 9.7165 3.5 8.75 3.5C7.7835 3.5 7 2.7165 7 1.75C7 0.7835 7.7835 0 8.75 0C9.7165 0 10.5 0.7835 10.5 1.75Z"
                      fill="black"
                    />
                  </svg>
                </button>

                {activeMenu === survey.id && (
                  <div className="absolute right-0 top-12 z-10 flex flex-col bg-white rounded shadow-[0_4px_20px_0_rgba(0,0,0,0.15)] py-1">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setAccessModalData({
                          id: parseInt(survey.id),
                          name: survey.name,
                        });
                        setAccessModalOpen(true);
                        setActiveMenu(null);
                      }}
                      className="px-4 py-2 text-left text-sm text-text-gray hover:bg-gray-100"
                    >
                      Настроить доступ
                    </button>
                    <button className="px-4 py-2 text-left text-sm text-[#D04745] hover:bg-gray-100">
                      Удалить
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {accessModalData && (
        <AccessModal
          isOpen={accessModalOpen}
          onClose={() => {
            setAccessModalOpen(false);
            setAccessModalData(null);
          }}
          onAccessChanged={onAccessChanged}
          itemId={accessModalData.id}
          itemType={itemType}
          itemName={accessModalData.name}
        />
      )}
    </div>
  );
}
