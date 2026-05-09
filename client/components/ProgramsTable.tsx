import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import AddProgramModal from "./AddProgramModal";
import EditProgramModal from "./EditProgramModal";
import AccessModal from "./AccessModal";

interface Program {
  id: number | string;
  code?: string;
  name?: string;
  title?: string;
  program_name?: string;
  programId?: string;
  date?: string;
  created_at?: string;
}

const formatDate = (dateString?: string): string => {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("ru-RU");
  } catch {
    return dateString;
  }
};

interface ProgramsTableProps {
  programs: Program[];
  onItemsDeleted?: () => void;
  onAccessChanged?: () => void;
}

export default function ProgramsTable({
  programs,
  onItemsDeleted,
  onAccessChanged,
}: ProgramsTableProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | number | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<number | string>>(
    new Set(),
  );
  const [deleting, setDeleting] = useState(false);
  const [accessModalOpen, setAccessModalOpen] = useState(false);
  const [accessModalData, setAccessModalData] = useState<{
    id: number;
    name: string;
  } | null>(null);

  const isAllSelected =
    selectedItems.size === programs.length && programs.length > 0;
  const isIndeterminate =
    selectedItems.size > 0 && selectedItems.size < programs.length;

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(programs.map((p) => p.id)));
    }
  };

  const handleSelectItem = (id: number | string) => {
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
        `Удалить ${selectedItems.size} программ(у)? Это действие не может быть отменено.`,
      )
    ) {
      return;
    }

    setDeleting(true);
    try {
      const deletePromises = Array.from(selectedItems).map((id) =>
        api(`/api/programs/${id}`, { method: "DELETE" }),
      );
      await Promise.all(deletePromises);
      toast.success(`${selectedItems.size} программ(а) удалена(ны)`);
      setSelectedItems(new Set());
      onItemsDeleted?.();
    } catch (error: any) {
      toast.error(error?.message || "Не удалось удалить программы");
    } finally {
      setDeleting(false);
    }
  };

  const handleAddProgram = async (data: {
    code: string;
    name: string;
    programName: string;
  }) => {
    try {
      await api("/api/programs", {
        method: "POST",
        body: JSON.stringify(data),
      });
      toast.success("Программа добавлена");
      setIsModalOpen(false);
      setTimeout(() => onItemsDeleted?.(), 100);
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error ? err.message : "Ошибка при добавлении программы",
      );
    }
  };

  const handleEdit = (id: string | number) => {
    const current = programs.find((p) => p.id === id);
    if (!current) return;
    setEditingProgram(current);
    setIsEditModalOpen(true);
  };

  const handleEditProgram = async (data: {
    code: string;
    name: string;
    programName: string;
  }) => {
    if (!editingProgram) return;
    try {
      await api(`/api/programs/${editingProgram.id}`, {
        method: "PUT",
        body: JSON.stringify({
          code: data.code,
          name: data.name,
          program_name: data.programName,
        }),
      });
      toast.success("Программа обновлена");
      setIsEditModalOpen(false);
      setEditingProgram(null);
      setTimeout(() => onItemsDeleted?.(), 100);
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error ? err.message : "Ошибка при обновлении программы",
      );
    }
  };

  const handleDelete = async (id: string | number) => {
    if (!confirm("Удалить программу?")) return;
    try {
      await api(`/api/programs/${id}`, { method: "DELETE" });
      toast.success("Программа удалена");
      setTimeout(() => onItemsDeleted?.(), 100);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Ошибка при удалении");
    }
  };

  return (
    <div className="w-full rounded-[10px] bg-white shadow-[0_15px_40px_5px_rgba(237,237,237,1)] p-6 lg:p-10">
      {selectedItems.size > 0 && (
        <div className="mb-6 flex items-center justify-between bg-blue-50 border border-blue-100 rounded-lg p-4">
          <span className="text-sm font-semibold text-blue-900">
            Выбрано: {selectedItems.size} из {programs.length}
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

      <div className="mb-6 flex items-center justify-between">
        <h2 style={{ fontSize: "18px", fontWeight: "600", color: "#0078FF" }}>
          Образовательные программы
        </h2>
        <button
          onClick={() => setIsModalOpen(true)}
          style={{
            backgroundColor: "#0078FF",
            color: "white",
            padding: "8px 16px",
            border: "none",
            borderRadius: "6px",
            fontWeight: "500",
            cursor: "pointer",
          }}
        >
          Добавить
        </button>
      </div>

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
              title={isAllSelected ? "Снять выделение" : "Выделить все"}
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

        {programs.map((program) => (
          <div
            key={program.id}
            className={`flex items-center border-b border-[#EFF2F7] bg-white min-h-[76px] py-4 relative transition-colors ${
              selectedItems.has(program.id) ? "bg-blue-50" : "hover:bg-gray-50"
            }`}
          >
            <div className="w-12 flex items-center justify-center">
              <button
                onClick={() => handleSelectItem(program.id)}
                className="w-5 h-5 rounded border-2 border-black/20 flex items-center justify-center hover:border-blue-accent transition-colors"
                style={{
                  backgroundColor: selectedItems.has(program.id)
                    ? "#0078FF"
                    : "transparent",
                  borderColor: selectedItems.has(program.id)
                    ? "#0078FF"
                    : "rgba(0,0,0,0.2)",
                }}
              >
                {selectedItems.has(program.id) && (
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
              <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-1">
                  <div className="text-black text-xl font-normal">
                    {program.name ?? program.title ?? "Программа"}
                  </div>
                  <span className="text-black/40 text-xs">
                    id {program.programId ?? program.id}
                  </span>
                </div>
                {program.code && (
                  <div className="text-sm text-black/70">
                    <span className="font-semibold">Шифр:</span> {program.code}
                  </div>
                )}
                {program.program_name && (
                  <div className="text-sm text-black/70">
                    {program.program_name}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-8">
                <span className="text-black text-sm">
                  {formatDate(program.date || program.created_at)}
                </span>

                <button
                  className="p-2 hover:bg-gray-100 rounded relative"
                  onClick={() =>
                    setActiveMenu(activeMenu === program.id ? null : program.id)
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

                {activeMenu === program.id && (
                  <div className="absolute right-0 top-12 z-10 flex flex-col bg-white rounded shadow-[0_4px_20px_0_rgba(0,0,0,0.15)] py-1">
                    <button
                      onClick={() => {
                        setActiveMenu(null);
                        handleEdit(program.id);
                      }}
                      className="px-4 py-2 text-left text-sm text-text-gray hover:bg-gray-100"
                    >
                      Изменить
                    </button>
                    <button
                      onClick={() => {
                        setActiveMenu(null);
                        setAccessModalData({
                          id: parseInt(String(program.id)),
                          name: program.name || program.title || "Программа",
                        });
                        setAccessModalOpen(true);
                      }}
                      className="px-4 py-2 text-left text-sm text-text-gray hover:bg-gray-100"
                    >
                      Настроить доступ
                    </button>
                    <button
                      onClick={() => {
                        setActiveMenu(null);
                        handleDelete(program.id);
                      }}
                      className="px-4 py-2 text-left text-sm text-[#D04745] hover:bg-gray-100"
                    >
                      Удалить
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <AddProgramModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddProgram}
      />

      <EditProgramModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingProgram(null);
        }}
        onSave={handleEditProgram}
        program={editingProgram}
      />

      {accessModalData && (
        <AccessModal
          isOpen={accessModalOpen}
          onClose={() => {
            setAccessModalOpen(false);
            setAccessModalData(null);
          }}
          itemId={accessModalData.id}
          itemType="program"
          itemName={accessModalData.name}
          onAccessChanged={onAccessChanged}
        />
      )}
    </div>
  );
}
