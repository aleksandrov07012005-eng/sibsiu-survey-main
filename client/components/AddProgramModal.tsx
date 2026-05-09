import { useState } from "react";

interface AddProgramModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: { code: string; name: string; programName: string }) => void;
}

export default function AddProgramModal({
  isOpen,
  onClose,
  onAdd,
}: AddProgramModalProps) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [programName, setProgramName] = useState("");

  if (!isOpen) return null;

  const handleAdd = () => {
    if (!code.trim() || !name.trim() || !programName.trim()) {
      return;
    }

    onAdd({
      code: code.trim(),
      name: name.trim(),
      programName: programName.trim(),
    });

    setCode("");
    setName("");
    setProgramName("");
    onClose();
  };

  const handleClose = () => {
    setCode("");
    setName("");
    setProgramName("");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-md shadow-[0_4px_20px_0_rgba(0,0,0,0.15)] w-full max-w-[655px]">
        <div className="relative p-6 lg:p-8">
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 text-[#E0E0E1] hover:text-gray-400 transition-colors"
          >
            <svg
              className="w-6 h-6"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M19.2071 6.20711C19.5976 5.81658 19.5976 5.18342 19.2071 4.79289C18.8166 4.40237 18.1834 4.40237 17.7929 4.79289L12 10.5858L6.20711 4.79289C5.81658 4.40237 5.18342 4.40237 4.79289 4.79289C4.40237 5.18342 4.40237 5.81658 4.79289 6.20711L10.5858 12L4.79289 17.7929C4.40237 18.1834 4.40237 18.8166 4.79289 19.2071C5.18342 19.5976 5.81658 19.5976 6.20711 19.2071L12 13.4142L17.7929 19.2071C18.1834 19.5976 18.8166 19.5976 19.2071 19.2071C19.5976 18.8166 19.5976 18.1834 19.2071 17.7929L13.4142 12L19.2071 6.20711Z"
                fill="currentColor"
              />
            </svg>
          </button>

          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-8">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Шифр направления подготовки / специальности"
                className="h-[35px] px-3 py-2 border border-[#696F79] rounded-[3px] text-sm text-[#4C4B51] placeholder:text-[#4C4B51] focus:outline-none focus:ring-1 focus:ring-blue-accent"
              />

              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Наименование направления подготовки / специальности"
                className="h-[35px] px-3 py-2 border border-[#696F79] rounded-[3px] text-sm text-[#4C4B51] placeholder:text-[#4C4B51] focus:outline-none focus:ring-1 focus:ring-blue-accent"
              />

              <input
                type="text"
                value={programName}
                onChange={(e) => setProgramName(e.target.value)}
                placeholder="Наименование образовательной программы"
                className="h-[35px] px-3 py-2 border border-[#696F79] rounded-[3px] text-sm text-[#4C4B51] placeholder:text-[#4C4B51] focus:outline-none focus:ring-1 focus:ring-blue-accent"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleAdd}
                disabled={!code.trim() || !name.trim() || !programName.trim()}
                className="bg-blue-accent text-[#E0E0E1] px-3 py-2 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
              >
                Добавить
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
