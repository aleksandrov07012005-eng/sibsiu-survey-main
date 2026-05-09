import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import SearchBar from "@/components/SearchBar";
import SurveyCard from "@/components/SurveyCard";
import { useSurveys } from "@/hooks/useSurveys";
import { api } from "@/lib/api";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AdvancedFilters } from "@/components/AdvancedFiltersModal";

export default function Index() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Активные");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [availableGroups, setAvailableGroups] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [surveyGroups, setSurveyGroups] = useState<
    Map<number, Array<{ id: number; name: string }>>
  >(new Map());
  const [availablePrograms, setAvailablePrograms] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [availableQuestionnaires, setAvailableQuestionnaires] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [availableCreators, setAvailableCreators] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    programs: [],
    questionnaires: [],
    creatorIds: [],
  });

  // Convert display status to API status parameter
  const apiStatus =
    statusFilter === "Активные"
      ? "active"
      : statusFilter === "Неактивные"
        ? "inactive"
        : "all";

  const { data, isLoading, error, refetch } = useSurveys(
    page,
    10,
    apiStatus,
    advancedFilters.programs.length > 0
      ? advancedFilters.programs.map(Number)
      : undefined,
    advancedFilters.questionnaires.length > 0
      ? advancedFilters.questionnaires.map(Number)
      : undefined,
    advancedFilters.creatorIds.length > 0
      ? advancedFilters.creatorIds.map(Number)
      : undefined,
    selectedGroupId ? Number(selectedGroupId) : undefined,
    advancedFilters.creationDateFrom,
    advancedFilters.creationDateTo,
  );

  // Fetch available groups whenever surveys data changes
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const groups = await api("/api/surveys/available-groups");
        if (Array.isArray(groups)) {
          setAvailableGroups(
            groups.map((group: any) => ({
              id: String(group.id),
              name: group.name,
            })),
          );
        }
      } catch (err) {
        console.error("Error fetching groups:", err);
        setAvailableGroups([]);
      }
    };

    fetchGroups();
  }, [data?.items]);

  // Fetch available programs, questionnaires, and creators
  useEffect(() => {
    const fetchFilterData = async () => {
      try {
        // Fetch programs
        try {
          const programsResponse = await api("/api/programs");
          if (Array.isArray(programsResponse)) {
            setAvailablePrograms(
              programsResponse.map((program: any) => ({
                id: String(program.id),
                name: program.name,
              })),
            );
          }
        } catch (err) {
          console.error("Error fetching programs:", err);
          setAvailablePrograms([]);
        }

        // Fetch questionnaires
        try {
          const questionnairesResponse = await api("/api/questionnaires");
          if (Array.isArray(questionnairesResponse)) {
            setAvailableQuestionnaires(
              questionnairesResponse.map((q: any) => ({
                id: String(q.id),
                name: q.title,
              })),
            );
          }
        } catch (err) {
          console.error("Error fetching questionnaires:", err);
          setAvailableQuestionnaires([]);
        }

        // Extract creators from current surveys
        try {
          if (data?.items) {
            const creators = new Map<string, string>();
            data.items.forEach((survey: any) => {
              if (survey.created_by_name && survey.created_by) {
                creators.set(String(survey.created_by), survey.created_by_name);
              }
            });
            setAvailableCreators(
              Array.from(creators.entries()).map(([id, name]) => ({
                id,
                name,
              })),
            );
          }
        } catch (err) {
          console.error("Error extracting creators:", err);
          setAvailableCreators([]);
        }
      } catch (err) {
        console.error("Error fetching filter data:", err);
      }
    };

    fetchFilterData();
  }, [data?.items]);

  // Fetch groups for each survey
  useEffect(() => {
    if (!data?.items || data.items.length === 0) return;

    const fetchSurveyGroups = async () => {
      const groupsMap = new Map<number, Array<{ id: number; name: string }>>();

      for (const survey of data.items) {
        try {
          const groups = await api(`/api/surveys/${survey.id}/groups`);
          if (Array.isArray(groups)) {
            groupsMap.set(survey.id, groups);
          }
        } catch (err) {
          console.error(`Error fetching groups for survey ${survey.id}:`, err);
        }
      }

      setSurveyGroups(groupsMap);
    };

    fetchSurveyGroups();
  }, [data?.items]);

  // Фильтрация по поисковому запросу (остальные фильтры применяются на сервере)
  const filteredSurveys =
    data?.items.filter((survey) => {
      const matchesSearch =
        survey.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        survey.target.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesSearch;
    }) || [];

  // Обновляем данные при изменении страницы
  useEffect(() => {
    refetch();
  }, [page, refetch]);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setPage(1); // Сбрасываем на первую страницу при поиске
  };

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    setPage(1);
  };

  const handleGroupFilter = (groupId: string | null) => {
    setSelectedGroupId(groupId);
    setPage(1);
  };

  const handleAdvancedFiltersApply = (filters: AdvancedFilters) => {
    setAdvancedFilters(filters);
    setPage(1);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col lg:flex-row">
        <div className="lg:fixed lg:left-0 lg:top-0 lg:h-screen lg:overflow-y-auto">
          <Sidebar activePage="oprosi" />
        </div>
        <div className="flex-1 lg:ml-[271px] p-4 lg:p-8 flex flex-col gap-6 lg:gap-8 overflow-y-auto pb-24">
          <Header />
          <SearchBar
            onSearch={handleSearch}
            onStatusFilter={handleStatusFilter}
            onGroupFilter={handleGroupFilter}
            onAdvancedFiltersApply={handleAdvancedFiltersApply}
            availableGroups={availableGroups}
            availablePrograms={availablePrograms}
            availableQuestionnaires={availableQuestionnaires}
            availableCreators={availableCreators}
            currentAdvancedFilters={advancedFilters}
            currentStatus={statusFilter}
            currentGroupId={selectedGroupId}
          />
          <div className="flex justify-center items-center h-64">
            <div className="text-lg text-gray-500">Загрузка опросов...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex flex-col lg:flex-row">
        <div className="lg:fixed lg:left-0 lg:top-0 lg:h-screen lg:overflow-y-auto">
          <Sidebar activePage="oprosi" />
        </div>
        <div className="flex-1 lg:ml-[271px] p-4 lg:p-8 flex flex-col gap-6 lg:gap-8 overflow-y-auto pb-24">
          <Header />
          <SearchBar
            onSearch={handleSearch}
            onStatusFilter={handleStatusFilter}
            onGroupFilter={handleGroupFilter}
            onAdvancedFiltersApply={handleAdvancedFiltersApply}
            availableGroups={availableGroups}
            availablePrograms={availablePrograms}
            availableQuestionnaires={availableQuestionnaires}
            availableCreators={availableCreators}
            currentAdvancedFilters={advancedFilters}
            currentStatus={statusFilter}
            currentGroupId={selectedGroupId}
          />
          <div className="flex justify-center items-center h-64">
            <div className="text-lg text-red-500 text-center">
              Ошибка загрузки опросов
              <br />
              <span className="text-sm">{(error as Error).message}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row">
      <div className="lg:fixed lg:left-0 lg:top-0 lg:h-screen lg:overflow-y-auto">
        <Sidebar activePage="oprosi" />
      </div>

      <div className="flex-1 lg:ml-[271px] p-4 lg:p-8 flex flex-col gap-6 lg:gap-8 overflow-y-auto pb-24">
        <Header />

        <div className="flex flex-col gap-6 lg:gap-8">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <SearchBar
              onSearch={handleSearch}
              onStatusFilter={handleStatusFilter}
              onGroupFilter={handleGroupFilter}
              onAdvancedFiltersApply={handleAdvancedFiltersApply}
              availableGroups={availableGroups}
              availablePrograms={availablePrograms}
              availableQuestionnaires={availableQuestionnaires}
              availableCreators={availableCreators}
              currentAdvancedFilters={advancedFilters}
              currentStatus={statusFilter}
              currentGroupId={selectedGroupId}
            />
            <div className="flex-shrink-0 mt-2 sm:mt-0">
              <button
                onClick={async () => {
                  const title = prompt("Название опроса");
                  if (!title) return;
                  try {
                    const payload = {
                      title,
                      is_active: true,
                      start_date: new Date().toISOString(),
                      end_date: null,
                      unique_link:
                        "link-" + Math.random().toString(36).slice(2, 9),
                      created_by: user?.id || 1,
                    } as any;

                    await api("/api/surveys", {
                      method: "POST",
                      body: JSON.stringify(payload),
                    });

                    refetch();
                  } catch (err) {
                    console.error(err);
                    alert(
                      err instanceof Error
                        ? err.message
                        : "Ошибка при создании опроса",
                    );
                  }
                }}
                className="bg-blue-accent text-white px-4 py-2 rounded-lg"
              >
                Добавить опрос
              </button>
            </div>
          </div>

          <div className="bg-white rounded-[33px] shadow-[0_5.157px_13.752px_1.719px_rgba(237,237,237,1)] p-6 lg:p-10 flex flex-col gap-6">
            {filteredSurveys.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchTerm
                  ? "Ничего не найдено"
                  : `Нет ${statusFilter === "Активные" ? "активных" : statusFilter === "Неактивные" ? "неактивных" : ""} опросов`.trim()}
              </div>
            ) : (
              <>
                {filteredSurveys.map((survey) => (
                  <SurveyCard
                    key={survey.id}
                    id={survey.id}
                    dateRange={survey.dateRange}
                    description={survey.description}
                    target={survey.target}
                    isActive={survey.isActive}
                    createdAt={survey.created_at}
                    onAccessChanged={() => refetch()}
                  />
                ))}

                {/* Пагинация */}
                {data && data.totalPages > 1 && (
                  <div className="flex justify-center gap-4 mt-8 items-center">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-6 py-2 bg-blue-500 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
                    >
                      Назад
                    </button>

                    <div className="flex gap-2">
                      {Array.from(
                        { length: Math.min(5, data.totalPages) },
                        (_, i) => {
                          const pageNum = i + 1;
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setPage(pageNum)}
                              className={`px-4 py-2 rounded-lg transition-colors ${
                                page === pageNum
                                  ? "bg-blue-500 text-white"
                                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        },
                      )}
                    </div>

                    <span className="text-gray-600 mx-2">
                      Страница {page} из {data.totalPages}
                    </span>

                    <button
                      onClick={() =>
                        setPage((p) => Math.min(data.totalPages, p + 1))
                      }
                      disabled={page === data.totalPages}
                      className="px-6 py-2 bg-blue-500 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
                    >
                      Вперед
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
