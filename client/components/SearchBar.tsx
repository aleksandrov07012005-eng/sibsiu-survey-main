import { useState, useEffect, useRef } from "react";
import AdvancedFiltersModal, { AdvancedFilters } from "./AdvancedFiltersModal";

interface SearchBarProps {
  onSearch: (term: string) => void;
  onStatusFilter?: (status: string) => void;
  onGroupFilter?: (groupId: string | null) => void;
  onAdvancedFiltersApply?: (filters: AdvancedFilters) => void;
  availableGroups?: Array<{ id: string; name: string }>;
  availablePrograms?: Array<{ id: string; name: string }>;
  availableQuestionnaires?: Array<{ id: string; name: string }>;
  availableCreators?: Array<{ id: string; name: string }>;
  currentAdvancedFilters?: AdvancedFilters;
  currentStatus?: string;
  currentGroupId?: string | null;
}

export default function SearchBar({
  onSearch,
  onStatusFilter,
  onGroupFilter,
  onAdvancedFiltersApply,
  availableGroups = [],
  availablePrograms = [],
  availableQuestionnaires = [],
  availableCreators = [],
  currentAdvancedFilters,
  currentStatus = "Активные",
  currentGroupId = null,
}: SearchBarProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isGroupsOpen, setIsGroupsOpen] = useState(false);
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);

  const statusRef = useRef<HTMLDivElement>(null);
  const groupsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        statusRef.current &&
        !statusRef.current.contains(event.target as Node)
      ) {
        setIsStatusOpen(false);
      }
      if (
        groupsRef.current &&
        !groupsRef.current.contains(event.target as Node)
      ) {
        setIsGroupsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    onSearch(value);
  };

  const handleClear = () => {
    setSearchTerm("");
    onSearch("");
  };

  const handleStatusSelect = (status: string) => {
    setIsStatusOpen(false);
    onStatusFilter?.(status);
  };

  const handleGroupSelect = (groupId: string | null) => {
    setIsGroupsOpen(false);
    onGroupFilter?.(groupId);
  };

  const hasActiveFilters = () => {
    if (!currentAdvancedFilters) return false;
    return (
      (currentAdvancedFilters.programs &&
        currentAdvancedFilters.programs.length > 0) ||
      (currentAdvancedFilters.questionnaires &&
        currentAdvancedFilters.questionnaires.length > 0) ||
      (currentAdvancedFilters.creatorIds &&
        currentAdvancedFilters.creatorIds.length > 0) ||
      !!currentAdvancedFilters.creationDateFrom ||
      !!currentAdvancedFilters.creationDateTo
    );
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex items-center gap-2 bg-white rounded-xl shadow-[0_4px_4px_0_rgba(0,0,0,0.25)] px-3 py-2 w-full">
        <svg
          className="w-3 h-3 flex-shrink-0"
          viewBox="0 0 12 11"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 10.4247L8.64799 7.35202C9.4535 6.46558 9.85518 5.32859 9.76947 4.17759C9.68376 3.02659 9.11726 1.95018 8.18782 1.1723C7.25838 0.394419 6.03756 -0.025049 4.77932 0.00115802C3.52108 0.0273651 2.32231 0.497229 1.43237 1.31301C0.542432 2.12878 0.0298528 3.22766 0.00126329 4.38105C-0.0273262 5.53443 0.430275 6.65352 1.27887 7.5055C2.12747 8.35749 3.30173 8.87678 4.55737 8.95535C5.81301 9.03392 7.05336 8.66571 8.02038 7.92733L11.3724 11L12 10.4247ZM0.903585 4.4901C0.903585 3.76586 1.13787 3.05789 1.57682 2.45571C2.01576 1.85352 2.63965 1.38418 3.36959 1.10703C4.09952 0.829872 4.90273 0.757356 5.67762 0.898648C6.45252 1.03994 7.16431 1.38869 7.72298 1.90081C8.28165 2.41292 8.66211 3.0654 8.81625 3.77572C8.97038 4.48604 8.89128 5.22231 8.58893 5.89142C8.28658 6.56053 7.77456 7.13243 7.11764 7.53479C6.46071 7.93716 5.68837 8.15192 4.89829 8.15192C3.83919 8.15084 2.82381 7.7647 2.07491 7.07821C1.32601 6.39172 0.90476 5.46095 0.903585 4.4901Z"
            fill="#0078FF"
          />
        </svg>

        <input
          type="text"
          placeholder="Поиск по опросам"
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-[15px] text-black/40 placeholder:text-black/40"
        />

        {searchTerm && (
          <button
            onClick={handleClear}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 w-full">
        <div className="relative" ref={statusRef}>
          <button
  onClick={() => setIsStatusOpen(!isStatusOpen)}
  className="flex items-center justify-between gap-3 bg-white rounded-xl shadow-[0_4px_4px_0_rgba(0,0,0,0.25)] px-3 py-2 hover:bg-gray-50 transition-colors flex-1"
          >
            <span className="text-[#696F79] text-[15px] font-light">
              {currentStatus}
            </span>
            <div className="w-4 h-4 flex items-center justify-center">
              <svg
                className="w-[11px] h-[6px]"
                viewBox="0 0 11 6"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M0.21967 0.21967C0.512563 -0.0732233 0.987437 -0.0732233 1.28033 0.21967L5.07322 4.01256C5.17085 4.11019 5.32914 4.1102 5.42678 4.01256L9.21967 0.21967C9.51256 -0.0732233 9.98744 -0.0732233 10.2803 0.21967C10.5732 0.512563 10.5732 0.987437 10.2803 1.28033L6.48744 5.07322C5.80402 5.75664 4.69598 5.75664 4.01256 5.07322L0.21967 1.28033C-0.0732233 0.987437 -0.0732233 0.512563 0.21967 0.21967Z"
                  fill="#696F79"
                />
              </svg>
            </div>
          </button>

          {isStatusOpen && (
            <div className="absolute top-full left-0 mt-1 z-10 bg-white rounded shadow-[0_4px_20px_0_rgba(0,0,0,0.15)] py-1 min-w-[140px]">
              <button
                onClick={() => handleStatusSelect("Активные")}
                className="w-full px-4 py-2 text-left text-sm text-[#696F79] hover:bg-gray-100"
              >
                Активные
              </button>
              <button
                onClick={() => handleStatusSelect("Неактивные")}
                className="w-full px-4 py-2 text-left text-sm text-[#696F79] hover:bg-gray-100"
              >
                Неактивные
              </button>
              <button
                onClick={() => handleStatusSelect("Все")}
                className="w-full px-4 py-2 text-left text-sm text-[#696F79] hover:bg-gray-100"
              >
                Все
              </button>
            </div>
          )}
        </div>

        <div className="relative" ref={groupsRef}>
          <button
  onClick={() => setIsGroupsOpen(!isGroupsOpen)}
  className="flex items-center justify-between gap-3 bg-white rounded-xl shadow-[0_4px_4px_0_rgba(0,0,0,0.25)] px-3 py-2 hover:bg-gray-50 transition-colors flex-1"
          >
            <span className="text-[#696F79] text-[15px] font-light">
              {currentGroupId
                ? availableGroups.find((g) => g.id === currentGroupId)?.name ||
                  "Группа"
                : "Группа"}
            </span>
            <div className="w-4 h-4 flex items-center justify-center">
              <svg
                className="w-[11px] h-[6px]"
                viewBox="0 0 11 6"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M0.21967 0.21967C0.512563 -0.0732233 0.987437 -0.0732233 1.28033 0.21967L5.07322 4.01256C5.17085 4.11019 5.32914 4.1102 5.42678 4.01256L9.21967 0.21967C9.51256 -0.0732233 9.98744 -0.0732233 10.2803 0.21967C10.5732 0.512563 10.5732 0.987437 10.2803 1.28033L6.48744 5.07322C5.80402 5.75664 4.69598 5.75664 4.01256 5.07322L0.21967 1.28033C-0.0732233 0.987437 -0.0732233 0.512563 0.21967 0.21967Z"
                  fill="#696F79"
                />
              </svg>
            </div>
          </button>

          {isGroupsOpen && (
            <div className="absolute top-full left-0 mt-1 z-10 bg-white rounded shadow-[0_4px_20px_0_rgba(0,0,0,0.15)] py-1 min-w-[160px]">
              <button
                onClick={() => handleGroupSelect(null)}
                className={`w-full px-4 py-2 text-left text-sm ${
                  currentGroupId === null
                    ? "text-blue-accent font-semibold"
                    : "text-[#696F79]"
                } hover:bg-gray-100`}
              >
                Все группы
              </button>
              {availableGroups.length > 0 ? (
                availableGroups.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => handleGroupSelect(group.id)}
                    className={`w-full px-4 py-2 text-left text-sm ${
                      currentGroupId === group.id
                        ? "text-blue-accent font-semibold"
                        : "text-[#696F79]"
                    } hover:bg-gray-100`}
                  >
                    {group.name}
                  </button>
                ))
              ) : (
                <div className="px-4 py-2 text-sm text-[#696F79]">
                  Нет групп
                </div>
              )}
            </div>
          )}
        </div>

        <button
          onClick={() => setIsAdvancedFiltersOpen(true)}
          className={`flex items-center justify-center w-9 h-9 rounded-xl shadow-[0_4px_4px_0_rgba(0,0,0,0.25)] transition-colors ${
            hasActiveFilters()
              ? "bg-blue-accent hover:bg-blue-accent/90"
              : "bg-white hover:bg-gray-50"
          }`}
        >
          <div className="w-5 h-5 flex items-center justify-center">
            <svg
              className={`w-[15px] h-[18px] ${
                hasActiveFilters() ? "text-white" : "text-[#696F79]"
              }`}
              viewBox="0 0 15 19"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M13.5 3.75C13.5 4.17425 13.2609 4.70039 12.1759 5.20002C11.0881 5.70096 9.452 6 7.5 6C5.548 6 3.91194 5.70096 2.82412 5.20002C1.73912 4.70039 1.5 4.17425 1.5 3.75C1.5 3.32575 1.73912 2.79961 2.82412 2.29998C3.91194 1.79904 5.548 1.5 7.5 1.5C9.452 1.5 11.0881 1.79904 12.1759 2.29998C13.2609 2.79961 13.5 3.32575 13.5 3.75ZM11.8779 6.91645C10.6459 7.30548 9.13399 7.5 7.5 7.5C5.86601 7.5 4.35407 7.30548 3.12215 6.91645L5.85 10.9173L4.61066 11.7623L0.704171 6.03278C0.245389 5.3599 0 4.5644 0 3.75C0 1.25 3.35786 0 7.5 0C11.6421 0 15 1.25 15 3.75C15 4.5644 14.7546 5.3599 14.2958 6.03278L10.3893 11.7623C10.3393 11.8357 10.3125 11.9225 10.3125 12.0114V15C10.3125 16.875 8.75 18.125 6.875 18.125C5 18.125 4.6875 16.875 4.6875 16.875V12.0114C4.6875 11.9225 4.66072 11.8357 4.61066 11.7623L5.85 10.9173C6.06989 11.2398 6.1875 11.6211 6.1875 12.0114V16.4792C6.26877 16.5341 6.4642 16.625 6.875 16.625C8.11598 16.625 8.8125 15.8647 8.8125 15V12.0114C8.8125 11.6211 8.93011 11.2398 9.15 10.9173L11.8779 6.91645Z"
              />
            </svg>
          </div>
        </button>
      </div>

      <AdvancedFiltersModal
        isOpen={isAdvancedFiltersOpen}
        onClose={() => setIsAdvancedFiltersOpen(false)}
        onApply={(filters) => {
          onAdvancedFiltersApply?.(filters);
        }}
        currentFilters={
          currentAdvancedFilters || {
            programs: [],
            questionnaires: [],
            creatorIds: [],
          }
        }
        availablePrograms={availablePrograms}
        availableQuestionnaires={availableQuestionnaires}
        availableCreators={availableCreators}
      />
    </div>
  );
}
