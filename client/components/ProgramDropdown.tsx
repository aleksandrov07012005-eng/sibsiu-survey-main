import { useEffect, useRef } from "react";

interface ProgramDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onRename: () => void;
  onEdit: () => void;
  onAccessSettings: () => void;
  onDelete: () => void;
  position?: { top: number; right: number };
}

export default function ProgramDropdown({
  isOpen,
  onClose,
  onRename,
  onEdit,
  onAccessSettings,
  onDelete,
  position,
}: ProgramDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute z-50 bg-white rounded shadow-[0_4px_20px_0_rgba(0,0,0,0.15)] py-2 min-w-[151px]"
      style={{
        top: position?.top || 0,
        right: position?.right || 0,
      }}
    >
      <button
        onClick={() => {
          onRename();
          onClose();
        }}
        className="w-full flex items-center px-4 py-2 text-[#696F79] hover:bg-gray-50 text-left text-sm"
      >
        Переименовать
      </button>

      <button
        onClick={() => {
          onEdit();
          onClose();
        }}
        className="w-full flex items-center px-4 py-2 text-[#696F79] hover:bg-gray-50 text-left text-sm"
      >
        Изменить
      </button>

      <button
        onClick={() => {
          onAccessSettings();
          onClose();
        }}
        className="w-full flex items-center px-4 py-2 text-[#696F79] hover:bg-gray-50 text-left text-sm"
      >
        Настроить доступ
      </button>

      <button
        onClick={() => {
          onDelete();
          onClose();
        }}
        className="w-full flex items-center px-4 py-2 text-[#D04745] hover:bg-gray-50 text-left text-sm"
      >
        Удалить
      </button>
    </div>
  );
}
