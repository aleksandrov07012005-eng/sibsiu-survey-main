import { useState } from "react";

interface AddGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (groupType: string, groupName: string) => void;
  existingGroups?: Array<{ id: string; name: string }>;
}

export default function AddGroupModal({
  isOpen,
  onClose,
  onAdd,
  existingGroups = [],
}: AddGroupModalProps) {
  const [groupName, setGroupName] = useState("");
  const [showExistingGroupsList, setShowExistingGroupsList] = useState(false);

  if (!isOpen) return null;

  const handleAdd = () => {
    if (groupName.trim()) {
      onAdd("", groupName.trim());
      setGroupName("");
      setShowExistingGroupsList(false);
      onClose();
    }
  };

  const handleSelectExistingGroup = (groupName: string) => {
    onAdd("", groupName);
    setGroupName("");
    setShowExistingGroupsList(false);
    onClose();
  };

  const handleClose = () => {
    setGroupName("");
    setShowExistingGroupsList(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-md shadow-[0_4px_20px_0_rgba(0,0,0,0.15)] w-full max-w-[288px] p-2.5 flex flex-col gap-2.5">
        <div className="flex justify-end">
          <button
            onClick={handleClose}
            className="text-[#E0E0E1] hover:text-gray-400 transition-colors"
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
        </div>

        {existingGroups.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowExistingGroupsList(!showExistingGroupsList)}
              className="w-full h-[34px] px-3 flex items-center justify-between border border-[#696F79] rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-accent bg-gray-50"
            >
              <span className="text-[#696F79] text-sm">
                Существующие группы
              </span>
              <svg
                className={`w-4 h-4 transition-transform ${showExistingGroupsList ? "rotate-180" : ""}`}
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

            {showExistingGroupsList && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#696F79] rounded shadow-lg z-10 max-h-[200px] overflow-y-auto">
                {existingGroups.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => handleSelectExistingGroup(group.name)}
                    className="w-full px-3 py-2 text-left text-sm text-black hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
                  >
                    {group.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="py-3">
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Введите группу"
            className="w-full h-[35px] px-3 py-2 border border-[#696F79] rounded text-sm text-[#696F79] placeholder:text-[#696F79] focus:outline-none focus:ring-1 focus:ring-blue-accent"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleAdd();
              }
            }}
          />
        </div>

        <button
          onClick={handleAdd}
          disabled={!groupName.trim()}
          className="w-full bg-blue-accent text-[#E0E0E1] px-3 py-2.5 rounded text-sm hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Добавить
        </button>
      </div>
    </div>
  );
}
