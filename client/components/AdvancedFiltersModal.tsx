import { useState, useEffect } from "react";

interface AdvancedFiltersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: AdvancedFilters) => void;
  currentFilters: AdvancedFilters;
  availablePrograms: Array<{ id: string; name: string }>;
  availableQuestionnaires: Array<{ id: string; name: string }>;
  availableCreators: Array<{ id: string; name: string }>;
}

export interface AdvancedFilters {
  programs: string[];
  questionnaires: string[];
  creatorIds: string[];
  creationDateFrom?: string;
  creationDateTo?: string;
}

export default function AdvancedFiltersModal({
  isOpen,
  onClose,
  onApply,
  currentFilters,
  availablePrograms,
  availableQuestionnaires,
  availableCreators,
}: AdvancedFiltersModalProps) {
  const [filters, setFilters] = useState<AdvancedFilters>(currentFilters);

  useEffect(() => {
    setFilters(currentFilters);
  }, [currentFilters, isOpen]);

  const handleProgramToggle = (programId: string) => {
    setFilters((prev) => ({
      ...prev,
      programs: prev.programs.includes(programId)
        ? prev.programs.filter((id) => id !== programId)
        : [...prev.programs, programId],
    }));
  };

  const handleQuestionnaireToggle = (questionnaireId: string) => {
    setFilters((prev) => ({
      ...prev,
      questionnaires: prev.questionnaires.includes(questionnaireId)
        ? prev.questionnaires.filter((id) => id !== questionnaireId)
        : [...prev.questionnaires, questionnaireId],
    }));
  };

  const handleCreatorToggle = (creatorId: string) => {
    setFilters((prev) => ({
      ...prev,
      creatorIds: prev.creatorIds.includes(creatorId)
        ? prev.creatorIds.filter((id) => id !== creatorId)
        : [...prev.creatorIds, creatorId],
    }));
  };

  const handleReset = () => {
    setFilters({
      programs: [],
      questionnaires: [],
      creatorIds: [],
      creationDateFrom: undefined,
      creationDateTo: undefined,
    });
  };

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">
            Дополнительные фильтры
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-4 space-y-6">
          {availablePrograms.length === 0 &&
            availableQuestionnaires.length === 0 &&
            availableCreators.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">
                  Нет доступных фильтров. Пожалуйста, создайте опросы с
                  программами и анкетами.
                </p>
              </div>
            )}

          {/* Educational Programs */}
          {availablePrograms.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Образовательные программы
              </h3>
              <div className="space-y-2">
                {availablePrograms.map((program) => (
                  <label
                    key={program.id}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={filters.programs.includes(program.id)}
                      onChange={() => handleProgramToggle(program.id)}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">
                      {program.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Questionnaires */}
          {availableQuestionnaires.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Анкеты
              </h3>
              <div className="space-y-2">
                {availableQuestionnaires.map((questionnaire) => (
                  <label
                    key={questionnaire.id}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={filters.questionnaires.includes(
                        questionnaire.id,
                      )}
                      onChange={() =>
                        handleQuestionnaireToggle(questionnaire.id)
                      }
                      className="w-4 h-4 text-blue-600 rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">
                      {questionnaire.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Creators */}
          {availableCreators.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Авторы опросов
              </h3>
              <div className="space-y-2">
                {availableCreators.map((creator) => (
                  <label
                    key={creator.id}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={filters.creatorIds.includes(creator.id)}
                      onChange={() => handleCreatorToggle(creator.id)}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">
                      {creator.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Creation Date Range */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Период создания
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-2">От</label>
                <input
                  type="date"
                  value={filters.creationDateFrom || ""}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      creationDateFrom: e.target.value || undefined,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-2">До</label>
                <input
                  type="date"
                  value={filters.creationDateTo || ""}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      creationDateTo: e.target.value || undefined,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Сбросить
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Применить
          </button>
        </div>
      </div>
    </div>
  );
}
