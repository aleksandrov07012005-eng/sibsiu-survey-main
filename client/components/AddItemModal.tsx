import { useState } from "react";

interface Item {
  id: string;
  name: string;
  idNumber: string;
  code?: string;
  program_name?: string;
}

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  availableItems: Item[];
  onAdd: (selectedIds: string[]) => void;
  placeholder?: string;
  itemLabel?: string;
}

export default function AddItemModal({
  isOpen,
  onClose,
  title,
  availableItems,
  onAdd,
  placeholder = "Название анкеты",
  itemLabel = "Анкеты",
}: AddItemModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  if (!isOpen) return null;

  const filteredItems = availableItems.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const isAllSelected =
    selectedIds.length === filteredItems.length && filteredItems.length > 0;
  const isIndeterminate =
    selectedIds.length > 0 && selectedIds.length < filteredItems.length;

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((itemId) => itemId !== id)
        : [...prev, id],
    );
  };

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map((item) => item.id));
    }
  };

  const handleAdd = () => {
    onAdd(selectedIds);
    setSelectedIds([]);
    setSearchTerm("");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-md shadow-[0_4px_20px_0_rgba(0,0,0,0.15)] w-full max-w-[764px] max-h-[472px] flex flex-col">
        <div className="p-4 sm:p-7 pb-4 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-[#E0E0E1] hover:text-gray-400 transition-colors flex-shrink-0 z-10"
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

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4 pr-12 sm:pr-0">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={placeholder}
              className="flex-1 min-w-0 h-[35px] px-3 py-2 border border-[#6D6C71] rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-accent"
            />
            <button
              onClick={handleAdd}
              disabled={selectedIds.length === 0}
              className="bg-blue-accent text-[#E0E0E1] px-4 py-2 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex-shrink-0"
            >
              Добавить
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 pb-8">
          <div className="w-full">
            <div className="flex border-b border-[#EFF2F7]">
              <div className="w-[50px] flex items-center justify-center h-[60px]">
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
              <div className="flex-1 flex items-center px-5 h-[60px]">
                <span className="text-black text-[15px] font-medium">
                  {itemLabel}
                </span>
              </div>
            </div>

            {filteredItems.length === 0 ? (
              <div className="flex border-b border-[#EFF2F7]">
                <div className="w-[50px] flex items-center justify-center min-h-[76px]">
                  <div className="w-5 h-5 rounded border border-black/10"></div>
                </div>
                <div className="flex-1 flex items-center px-5 py-6">
                  <span className="text-[#696F79] text-[15px]">
                    Ничего не найдено
                  </span>
                </div>
              </div>
            ) : (
              filteredItems.map((item, idx) => (
                <div
                  key={item.id}
                  className={`flex ${
                    idx === filteredItems.length - 1
                      ? ""
                      : "border-b border-[#EFF2F7]"
                  }`}
                >
                  <div className="w-[50px] flex items-center justify-center min-h-[76px]">
                    <button
                      onClick={() => toggleSelection(item.id)}
                      className="w-5 h-5 rounded border-2 border-black/20 flex items-center justify-center hover:border-blue-accent transition-colors"
                      style={{
                        backgroundColor: selectedIds.includes(item.id)
                          ? "#0078FF"
                          : "transparent",
                        borderColor: selectedIds.includes(item.id)
                          ? "#0078FF"
                          : "rgba(0,0,0,0.2)",
                      }}
                    >
                      {selectedIds.includes(item.id) && (
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
                  <div className="flex-1 flex items-center px-5 py-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-col gap-1">
                        <span className="text-black text-[15px]">
                          {item.name}
                        </span>
                        <span className="text-black/40 text-xs">
                          id {item.idNumber}
                        </span>
                      </div>
                      {item.code && (
                        <div className="text-sm text-black/70">
                          <span className="font-semibold">Шифр:</span>{" "}
                          {item.code}
                        </div>
                      )}
                      {item.program_name && (
                        <div className="text-sm text-black/70">
                          {item.program_name}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
