import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import SearchBar from "@/components/SearchBar";
import AddItemModal from "@/components/AddItemModal";
import AddGroupModal from "@/components/AddGroupModal";
import { useSurvey, useUpdateSurvey } from "@/hooks/useSurveys";
import { api } from "@/lib/api";

type SimpleItem = {
  id: string;
  name: string;
  idNumber: string;
  code?: string;
  program_name?: string;
};

export default function SurveyEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const surveyId = id ? parseInt(id, 10) : null;

  const { data: survey } = useSurvey(surveyId || 0);
  const updateSurveyMut = useUpdateSurvey();

  const [activeTab, setActiveTab] = useState<
    "survey" | "responses" | "settings"
  >("survey");
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: "questionnaire" | "program" | "group" | null;
  }>({ isOpen: false, type: null });
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

  const [questionnaires, setQuestionnaires] = useState<SimpleItem[]>([]);
  const [programs, setPrograms] = useState<SimpleItem[]>([]);
  const [groups, setGroups] = useState<SimpleItem[]>([]);

  const [selectedQuestionnaires, setSelectedQuestionnaires] = useState<
    Set<string>
  >(new Set());
  const [selectedPrograms, setSelectedPrograms] = useState<Set<string>>(
    new Set(),
  );
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());

  const [availableQuestionnaires, setAvailableQuestionnaires] = useState<
    SimpleItem[]
  >([]);
  const [availablePrograms, setAvailablePrograms] = useState<SimpleItem[]>([]);

  const [responses, setResponses] = useState<
    Array<{
      id: number;
      survey_id: number;
      started_at: string;
      completed_at: string;
      status: string;
    }>
  >([]);

  const [isActive, setIsActive] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState("");
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);
  const today = new Date();
  const [currentMonthIndex, setCurrentMonthIndex] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [showMobileCalendar, setShowMobileCalendar] = useState(false);

  const API_BASE = import.meta.env.VITE_API_BASE || "/api";

  const monthNames = [
    "Январь",
    "Февраль",
    "Март",
    "Апрель",
    "Май",
    "Июнь",
    "Июль",
    "Август",
    "Сентябрь",
    "Октябрь",
    "Ноябрь",
    "Декабрь",
  ];

  const formatDate = (d: Date) => {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
  };

  const getCalendarDays = (year: number, month: number) => {
    const first = new Date(year, month, 1);
    const dayOfWeek = first.getDay();
    const shift = (dayOfWeek + 6) % 7;
    const start = new Date(year, month, 1 - shift);
    const days: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const prevMonth = () => {
    setCurrentMonthIndex((m) => {
      if (m === 0) {
        setCurrentYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  };

  const nextMonth = () => {
    setCurrentMonthIndex((m) => {
      if (m === 11) {
        setCurrentYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  };

  // Helper: serialize a date as UTC noon to avoid timezone-based day shifts.
  const toUtcNoonISOString = (d: Date) => {
    const utcNoon = new Date(
      Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0),
    );
    return utcNoon.toISOString();
  };

  const handleDayClick = (d: Date) => {
    let newStart = rangeStart;
    let newEnd = rangeEnd;

    if (!rangeStart || (rangeStart && rangeEnd)) {
      newStart = d;
      newEnd = null;
    } else if (rangeStart && !rangeEnd) {
      const startTime = new Date(
        rangeStart.getFullYear(),
        rangeStart.getMonth(),
        rangeStart.getDate(),
      ).getTime();
      const clickTime = new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
      ).getTime();
      if (clickTime < startTime) {
        newStart = d;
      } else {
        newEnd = d;
      }
    }

    setRangeStart(newStart);
    setRangeEnd(newEnd);
    setStartDate(newStart ? formatDate(newStart) : "");
    setEndDate(newEnd ? formatDate(newEnd) : "");

    // Ensure the calendar view stays in sync with the clicked date
    setCurrentMonthIndex(d.getMonth());
    setCurrentYear(d.getFullYear());

    if (surveyId) {
      const data: any = {};
      if (newStart) data.start_date = toUtcNoonISOString(newStart);
      if (newEnd) data.end_date = toUtcNoonISOString(newEnd);
      if (Object.keys(data).length > 0) {
        updateSurveyMut.mutate({ id: surveyId, data });
      }
    }
  };

  const openModal = (type: "questionnaire" | "program" | "group") => {
    if (type === "group") {
      setIsGroupModalOpen(true);
    } else {
      setModalState({ isOpen: true, type });
    }
  };

  const closeModal = () => {
    setModalState({ isOpen: false, type: null });
  };

  const handleAdd = async (selectedIds: string[]) => {
    if (modalState.type === "questionnaire") {
      if (!selectedIds.length) return;
      const selectedId = selectedIds[0];
      const selected = availableQuestionnaires.find((q) => q.id === selectedId);
      if (!selected) return;
      setQuestionnaires([selected]);
      if (surveyId) {
        updateSurveyMut.mutate({
          id: surveyId,
          data: { questionnaire_id: Number(selected.id) },
        });
      }
    } else if (modalState.type === "program") {
      if (!surveyId) return;
      try {
        const addedPrograms: SimpleItem[] = [];
        for (const pid of selectedIds) {
          await api(`${API_BASE}/surveys/${surveyId}/programs`, {
            method: "POST",
            body: JSON.stringify({ program_id: Number(pid) }),
          });
          const p = availablePrograms.find((ap) => ap.id === String(pid));
          if (p) addedPrograms.push(p);
        }
        setPrograms((prev) => [...prev, ...addedPrograms]);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleAddGroup = async (groupType: string, groupName: string) => {
    if (!surveyId) return;
    try {
      const created = await api<any>(`${API_BASE}/surveys/${surveyId}/groups`, {
        method: "POST",
        body: JSON.stringify({ name: groupName, group_type: groupType }),
      });
      const newGroup: SimpleItem = {
        id: String(created.id),
        name: created.name,
        idNumber: String(created.id),
      };
      setGroups((prev) => [...prev, newGroup]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (
    itemId: string,
    type: "questionnaire" | "program" | "group",
  ) => {
    if (type === "questionnaire") {
      setQuestionnaires(questionnaires.filter((item) => item.id !== itemId));
      if (surveyId) {
        updateSurveyMut.mutate({
          id: surveyId,
          data: { questionnaire_id: null as any },
        });
      }
    } else if (type === "program") {
      if (!surveyId) return;
      try {
        await api(`${API_BASE}/surveys/${surveyId}/programs/${itemId}`, {
          method: "DELETE",
        });
        setPrograms((prev) => prev.filter((item) => item.id !== itemId));
      } catch (err) {
        console.error(err);
      }
    } else if (type === "group") {
      try {
        await api(`${API_BASE}/surveys/${surveyId}/groups/${itemId}`, {
          method: "DELETE",
        });
        setGroups((prev) => prev.filter((item) => item.id !== itemId));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const getSelectedSet = (type: "questionnaire" | "program" | "group") => {
    if (type === "questionnaire") return selectedQuestionnaires;
    if (type === "program") return selectedPrograms;
    return selectedGroups;
  };

  const setSelectedSet = (
    type: "questionnaire" | "program" | "group",
    newSet: Set<string>,
  ) => {
    if (type === "questionnaire") setSelectedQuestionnaires(newSet);
    else if (type === "program") setSelectedPrograms(newSet);
    else setSelectedGroups(newSet);
  };

  const renderTableSection = (
    title: string,
    subtitle: string,
    items: SimpleItem[],
    emptyMessage: string,
    type: "questionnaire" | "program" | "group",
  ) => {
    const selectedSet = getSelectedSet(type);
    const isAllSelected = selectedSet.size === items.length && items.length > 0;
    const isIndeterminate =
      selectedSet.size > 0 && selectedSet.size < items.length;

    const handleSelectAll = () => {
      if (isAllSelected) {
        setSelectedSet(type, new Set());
      } else {
        setSelectedSet(type, new Set(items.map((item) => item.id)));
      }
    };

    const handleSelectItem = (id: string) => {
      const newSelected = new Set(selectedSet);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      setSelectedSet(type, newSelected);
    };

    const handleDeleteSelected = async () => {
      if (
        !window.confirm(
          `Удалить ${selectedSet.size} элементов? Это действие не может быть отменено.`,
        )
      ) {
        return;
      }

      try {
        const deletePromises = Array.from(selectedSet).map((id) => {
          if (type === "questionnaire") {
            return api(`${API_BASE}/surveys/${surveyId}/questionnaires/${id}`, {
              method: "DELETE",
            });
          } else if (type === "program") {
            return api(`${API_BASE}/surveys/${surveyId}/programs/${id}`, {
              method: "DELETE",
            });
          } else {
            return api(`${API_BASE}/surveys/${surveyId}/groups/${id}`, {
              method: "DELETE",
            });
          }
        });
        await Promise.all(deletePromises);

        if (type === "questionnaire") {
          setQuestionnaires((prev) =>
            prev.filter((item) => !selectedSet.has(item.id)),
          );
        } else if (type === "program") {
          setPrograms((prev) =>
            prev.filter((item) => !selectedSet.has(item.id)),
          );
        } else {
          setGroups((prev) => prev.filter((item) => !selectedSet.has(item.id)));
        }
        setSelectedSet(type, new Set());
      } catch (err) {
        console.error(err);
        alert("Ошибка при удалении элементов");
      }
    };

    return (
      <div className="w-full max-w-[780px]">
        {selectedSet.size > 0 && (
          <div className="mb-6 flex items-center justify-between bg-blue-50 border border-blue-100 rounded-lg p-4">
            <span className="text-sm font-semibold text-blue-900">
              Выбрано: {selectedSet.size} из {items.length}
            </span>
            <button
              onClick={handleDeleteSelected}
              className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600 transition-colors"
            >
              Удалить выбранные
            </button>
          </div>
        )}

        <div className="flex items-center justify-between mb-2">
          <h2 className="text-blue-accent text-2xl font-bold">{title}</h2>
          <button
            onClick={() => openModal(type)}
            className="bg-blue-accent text-[#E0E0E1] text-sm px-3 py-2.5 rounded hover:bg-blue-600 transition-colors"
          >
            Добавить
          </button>
        </div>

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
            <div className="flex-1 flex items-center px-5 h-[60px] bg-transparent">
              <span className="text-black text-[15px] font-medium">
                {subtitle}
              </span>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="flex border-b border-[#EFF2F7]">
              <div className="w-[50px] flex items-center justify-center min-h-[76px]">
                <div className="w-5 h-5 rounded border border-black/10"></div>
              </div>
              <div className="flex-1 flex items-center px-5 py-6">
                <span className="text-[#696F79] text-[15px]">
                  {emptyMessage}
                </span>
              </div>
            </div>
          ) : (
            Array.from(
              new Map(items.map((item) => [item.id, item])).values(),
            ).map((item, idx) => (
              <div
                key={item.id}
                className={`flex ${idx === items.length - 1 ? "" : "border-b border-[#EFF2F7]"} transition-colors ${
                  selectedSet.has(item.id) ? "bg-blue-50" : "hover:bg-gray-50"
                }`}
              >
                <div className="w-[50px] flex items-center justify-center min-h-[76px]">
                  <button
                    onClick={() => handleSelectItem(item.id)}
                    className="w-5 h-5 rounded border-2 border-black/20 flex items-center justify-center hover:border-blue-accent transition-colors"
                    style={{
                      backgroundColor: selectedSet.has(item.id)
                        ? "#0078FF"
                        : "transparent",
                      borderColor: selectedSet.has(item.id)
                        ? "#0078FF"
                        : "rgba(0,0,0,0.2)",
                    }}
                  >
                    {selectedSet.has(item.id) && (
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
                <div className="flex-1 min-w-0 flex items-center justify-between px-5 py-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-black text-[15px] truncate">
                        {item.name}
                      </span>
                      <span className="text-black/40 text-xs">
                        id {item.idNumber}
                      </span>
                    </div>
                    {item.code && (
                      <div className="text-sm text-black/70">
                        <span className="font-semibold">Шифр:</span> {item.code}
                      </div>
                    )}
                    {item.program_name && (
                      <div className="text-sm text-black/70">
                        {item.program_name}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(item.id, type)}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                    title="Удалить"
                  >
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  useEffect(() => {
    if (!surveyId) {
      navigate("/");
    }
  }, [surveyId, navigate]);

  useEffect(() => {
    let cancelled = false;
    const loadLists = async () => {
      try {
        const [questionnairesData, programsData] = await Promise.all([
          api<any[]>(`${API_BASE}/questionnaires`),
          api<any[]>(`${API_BASE}/programs`),
        ]);

        if (cancelled) return;
        const qItems: SimpleItem[] = (questionnairesData || []).map(
          (q: any) => ({
            id: String(q.id),
            name: q.title,
            idNumber: String(q.id),
          }),
        );
        const pItems: SimpleItem[] = (programsData || []).map((p: any) => ({
          id: String(p.id),
          name: p.name,
          idNumber: String(p.id),
          code: p.code,
          program_name: p.program_name,
        }));
        setAvailableQuestionnaires(qItems);
        setAvailablePrograms(pItems);
      } catch (e) {
        console.error("Failed to load lists", e);
      }
    };
    loadLists();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!survey) return;
    setIsActive(!!survey.is_active);

    // Prefer to center the calendar on the start date (if present), otherwise end date.
    if (survey.start_date) {
      const d = new Date(survey.start_date as any);
      setRangeStart(d);
      setStartDate(formatDate(d));
      setCurrentMonthIndex(d.getMonth());
      setCurrentYear(d.getFullYear());
    } else {
      setRangeStart(null);
      setStartDate("");
    }

    if (survey.end_date) {
      const d = new Date(survey.end_date as any);
      setRangeEnd(d);
      setEndDate(formatDate(d));
      // If there was no start date, center on the end date
      if (!survey.start_date) {
        setCurrentMonthIndex(d.getMonth());
        setCurrentYear(d.getFullYear());
      }
    } else {
      setRangeEnd(null);
      setEndDate("");
    }

    setDescription(survey.title || "");

    if (survey.questionnaire_id && availableQuestionnaires.length) {
      const found = availableQuestionnaires.find(
        (q) => Number(q.id) === (survey.questionnaire_id as any),
      );
      setQuestionnaires(found ? [found] : []);
    }

    // Load programs and groups attached to this survey
    let cancelled = false;
    const loadAttached = async () => {
      if (!survey.id) return;
      try {
        const [programsData, groupsData] = await Promise.all([
          api<any[]>(`${API_BASE}/surveys/${survey.id}/programs`),
          api<any[]>(`${API_BASE}/surveys/${survey.id}/groups`),
        ]);

        if (cancelled) return;
        const pItems: SimpleItem[] = (programsData || []).map((p: any) => ({
          id: String(p.id),
          name: p.program_name || p.name,
          idNumber: String(p.id),
        }));
        const gItems: SimpleItem[] = (groupsData || []).map((g: any) => ({
          id: String(g.id),
          name: g.name,
          idNumber: String(g.id),
        }));
        setPrograms(pItems);
        setGroups(gItems);
      } catch (e) {
        console.error(
          `Failed to load attached programs/groups for survey ${survey?.id}`,
          e,
        );
      }
    };
    loadAttached();
    return () => {
      cancelled = true;
    };
  }, [survey, availableQuestionnaires]);

  // Load survey responses
  useEffect(() => {
    if (!survey?.id) return;
    const loadResponses = async () => {
      try {
        const data = await api<any[]>(
          `${API_BASE}/surveys/${survey.id}/responses`,
        );
        setResponses(data || []);
      } catch (e) {
        console.error(`Failed to load responses for survey ${survey?.id}`, e);
      }
    };
    loadResponses();
  }, [survey?.id]);

  const toggleActive = () => {
    const next = !isActive;
    setIsActive(next);
    if (surveyId) {
      updateSurveyMut.mutate({ id: surveyId, data: { is_active: next } });
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row overflow-x-hidden">
      <div className="lg:fixed lg:left-0 lg:top-0 lg:h-screen lg:overflow-y-auto">
        <Sidebar activePage="oprosi" />
      </div>

      <div className="flex-1 lg:ml-[271px] p-4 lg:p-6 flex flex-col gap-6 overflow-y-auto pb-24">
        <Header />

        <div className="hidden lg:flex items-center justify-between">
          <p className="text-xl text-[#C4C4C4] font-medium">
            Опросы /{survey?.title || "Название опроса"}
          </p>
        </div>

        <div className="lg:hidden sticky top-14 bg-white z-20 px-4 py-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded text-xs font-semibold ${
                  isActive
                    ? "bg-blue-accent text-white"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                {isActive ? "Активен" : "Не активен"}
              </span>
            </div>

            <div />
          </div>

          <div className="mt-3">
            <SearchBar onSearch={() => {}} />
          </div>
        </div>

        <div className="bg-white rounded-[10px] shadow-[0_15px_40px_5px_rgba(237,237,237,1)] p-4 lg:p-8 mt-2 lg:mt-0">
          <div className="flex flex-wrap justify-center items-center gap-4 mb-6">
            <button
              onClick={() => setActiveTab("survey")}
              className={`text-lg font-semibold ${
                activeTab === "survey" ? "text-blue-accent" : "text-black"
              }`}
            >
              Опрос
            </button>
            <button
              onClick={() => setActiveTab("responses")}
              className={`text-lg font-semibold ${
                activeTab === "responses" ? "text-blue-accent" : "text-black"
              }`}
            >
              <p className="m-0">Ответы</p>
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`text-lg font-semibold ${
                activeTab === "settings" ? "text-blue-accent" : "text-black"
              }`}
            >
              Настройки
            </button>
          </div>

          {activeTab === "survey" && (
            <div className="flex flex-col lg:flex-row gap-8">
              <div className="flex-1">
                <div className="flex flex-col gap-6">
                  <div className="w-full">
                    <div className="flex items-start justify-between mb-4">
                      <h1 className="text-blue-accent text-2xl font-bold">
                        {survey?.title || "Название опроса"}
                      </h1>
                      <div className="flex items-center gap-3">
                        <button className="flex items-center gap-1.5 text-green-600 hover:text-green-700">
                          <svg
                            className="w-5 h-5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                          </svg>
                          <span className="text-sm font-medium">146</span>
                        </button>
                        <button className="flex items-center gap-1.5 text-red-600 hover:text-red-700">
                          <svg
                            className="w-5 h-5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
                          </svg>
                          <span className="text-sm font-medium">8</span>
                        </button>
                        <button className="p-1.5 text-gray-600 hover:text-gray-700">
                          <svg
                            className="w-5 h-5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    {renderTableSection(
                      "Анкеты для опроса",
                      "Анкеты:",
                      questionnaires,
                      "Нет анкет, хотите добавить?",
                      "questionnaire",
                    )}
                  </div>

                  <div className="w-full">
                    {renderTableSection(
                      "Образовательные программы",
                      "Название программы:",
                      programs,
                      "Нет программ, хотите добавить?",
                      "program",
                    )}
                  </div>

                  <div className="w-full">
                    {renderTableSection(
                      "Группа анкетируемых",
                      "Название группы:",
                      groups,
                      "Нет групп, хотите добавить?",
                      "group",
                    )}
                  </div>
                </div>
              </div>

              <div className="hidden lg:block w-full lg:w-[220px] flex-shrink-0">
                <div className="bg-transparent p-2">
                  <div className="text-[#696F79]">
                    <div className="text-sm font-semibold">Сроки:</div>
                    <div className="text-base">
                      {startDate || "?"} {endDate ? `- ${endDate}` : ""}
                    </div>
                  </div>

                  <div className="mt-4 text-[#696F79]">
                    <div className="text-sm font-semibold">Активность:</div>
                    <div className="text-base">
                      {isActive ? "Активен" : "Не активен"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "responses" && (
            <div className="flex flex-col gap-6 px-8">
              <div className="w-full max-w-[780px]">
                <h2 className="text-blue-accent text-2xl font-bold mb-4">
                  Ответы участников
                </h2>

                <div className="w-full">
                  <div className="flex border-b border-[#EFF2F7]">
                    <div className="flex-1 flex items-center px-5 h-[60px]">
                      <span className="text-black text-[15px] font-medium">
                        Всего ответов: {responses.length}
                      </span>
                    </div>
                  </div>

                  {responses.length === 0 ? (
                    <div className="flex border-b border-[#EFF2F7]">
                      <div className="flex-1 flex items-center px-5 py-6">
                        <span className="text-[#696F79] text-[15px]">
                          Нет ответов на опрос
                        </span>
                      </div>
                    </div>
                  ) : (
                    responses.map((response, idx) => (
                      <button
                        key={response.id}
                        onClick={() =>
                          navigate(
                            `/survey/${surveyId}/response/${response.id}`,
                          )
                        }
                        className={`flex w-full text-left hover:bg-gray-50 transition-colors ${
                          idx === responses.length - 1
                            ? ""
                            : "border-b border-[#EFF2F7]"
                        }`}
                      >
                        <div className="flex-1 flex items-center px-5 py-4 gap-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-black text-[15px]">
                              Ответ #{response.id}
                            </span>
                            <span className="text-black/40 text-xs">
                              {new Date(response.completed_at).toLocaleString(
                                "ru-RU",
                              )}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center px-5">
                          <svg
                            className="w-5 h-5 text-blue-accent"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "settings" && (
            <div className="flex gap-4 px-2 items-start">
              <div className="flex-1 flex flex-col gap-6">
                <h2 className="text-blue-accent text-2xl font-bold">
                  Настройки
                </h2>

                <div className="flex flex-col gap-3 py-3">
                  <div className="flex items-center gap-4">
                    <span className="text-[#696F79] text-sm font-light">
                      Активен
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={toggleActive}
                        className="relative w-[26px] h-[14px] rounded-full bg-white shadow-md"
                      >
                        <div
                          className={`absolute top-[1px] w-[11px] h-[11px] rounded-full bg-blue-accent transition-transform ${
                            isActive ? "left-[1px]" : "left-[14px]"
                          }`}
                        />
                      </button>
                      <button
                        onClick={() => setShowMobileCalendar(true)}
                        aria-label="Открыть календарь"
                        className="ml-2 inline-flex items-center gap-2 bg-blue-accent text-white px-2 py-1 rounded hover:bg-blue-600 transition-colors"
                      >
                        <svg
                          className="w-4 h-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <rect
                            x="3"
                            y="4"
                            width="18"
                            height="18"
                            rx="2"
                            ry="2"
                          />
                          <path d="M16 2v4M8 2v4M3 10h18" />
                        </svg>
                        <span className="text-sm">Календарь</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between w-[207px]">
                    <span className="text-[#696F79] text-sm font-light">
                      Дата начала
                    </span>
                    <span className="text-[#696F79] text-sm font-light">
                      {startDate || "-"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between w-[207px]">
                    <span className="text-[#696F79] text-sm font-light">
                      Дата окончания
                    </span>
                    <span className="text-[#696F79] text-sm font-light">
                      {endDate || "-"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <h3 className="text-blue-accent text-2xl font-bold">
                    Описание опроса
                  </h3>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full max-w-[520px] min-h-[200px] md:min-h-[310px] p-3 rounded-[25px] bg-[#F9F9FF] text-[#696F79] text-[15px] font-medium resize-none focus:outline-none focus:ring-2 focus:ring-blue-accent/20"
                  />
                </div>
              </div>

              <div className="hidden lg:block w-full lg:w-[376px] flex-shrink-0">
                <div className="bg-white rounded-xl shadow-md p-6 flex flex-col gap-5">
                  <div className="flex items-start justify-between">
                    <span className="text-[#181818] text-2xl font-medium">
                      {monthNames[currentMonthIndex]}
                    </span>
                    <span className="text-[#181818] text-2xl font-medium">
                      {currentYear}
                    </span>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-7 gap-2">
                      {["пн", "вт", "ср", "чт", "пт", "сб", "вс"].map(
                        (day, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-center h-10 text-[#AAA] text-center text-base"
                          >
                            {day}
                          </div>
                        ),
                      )}
                    </div>

                    <div className="grid grid-cols-7 gap-2">
                      {getCalendarDays(currentYear, currentMonthIndex).map(
                        (d) => {
                          const inCurrent = d.getMonth() === currentMonthIndex;
                          const isWeekend =
                            d.getDay() === 0 || d.getDay() === 6;
                          const isToday =
                            d.toDateString() === new Date().toDateString();

                          const isStart =
                            rangeStart &&
                            d.toDateString() === rangeStart.toDateString();
                          const isEnd =
                            rangeEnd &&
                            d.toDateString() === rangeEnd.toDateString();
                          let isInRange = false;
                          if (rangeStart && rangeEnd) {
                            const s = new Date(
                              rangeStart.getFullYear(),
                              rangeStart.getMonth(),
                              rangeStart.getDate(),
                            ).getTime();
                            const e = new Date(
                              rangeEnd.getFullYear(),
                              rangeEnd.getMonth(),
                              rangeEnd.getDate(),
                            ).getTime();
                            const t = new Date(
                              d.getFullYear(),
                              d.getMonth(),
                              d.getDate(),
                            ).getTime();
                            isInRange = t >= s && t <= e;
                          }

                          let baseClass =
                            "flex items-center justify-center h-10 rounded text-base";
                          if (!inCurrent)
                            baseClass += " bg-[#F7F7F7] text-[#9E9E9E]";
                          else if (isStart || isEnd)
                            baseClass += " bg-blue-accent text-white";
                          else if (isInRange)
                            baseClass += " bg-blue-accent/20 text-[#181818]";
                          else if (isWeekend)
                            baseClass += " bg-[#F7F7F7] text-[#EC2A4D]";
                          else baseClass += " bg-[#F7F7F7] text-[#181818]";

                          if (isToday && !isStart && !isEnd)
                            baseClass += " ring-1 ring-blue-accent/30";

                          return (
                            <button
                              key={d.toISOString()}
                              onClick={() => handleDayClick(d)}
                              className={baseClass}
                              title={formatDate(d)}
                            >
                              {d.getDate()}
                            </button>
                          );
                        },
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <button
                      onClick={prevMonth}
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                    >
                      <svg
                        width="16"
                        height="14"
                        viewBox="0 0 16 14"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M1.41406 6.70715L0.706956 6.00005L-0.000151038 6.70715L0.706956 7.41426L1.41406 6.70715ZM16.4141 7.70715C16.9663 7.70715 17.4141 7.25944 17.4141 6.70715C17.4141 6.15487 16.9663 5.70715 16.4141 5.70715V7.70715ZM6.70696 4.65512e-05L0.706956 6.00005L2.12117 7.41426L8.12117 1.41426L6.70696 4.65512e-05ZM0.706956 7.41426L6.70696 13.4143L8.12117 12L2.12117 6.00005L0.706956 7.41426ZM1.41406 7.70715H16.4141V5.70715H1.41406V7.70715Z"
                          fill="#33363F"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={nextMonth}
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                    >
                      <svg
                        width="16"
                        height="14"
                        viewBox="0 0 16 14"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M14.5859 6.70715L15.293 6.00005L16.0002 6.70715L15.293 7.41426L14.5859 6.70715ZM-0.414062 7.70715C-0.966349 7.70715 -1.41406 7.25944 -1.41406 6.70715C-1.41406 6.15487 -0.966349 5.70715 -0.414062 5.70715L-0.414062 7.70715ZM9.29296 4.65512e-05L15.293 6.00005L13.8788 7.41426L7.87883 1.41426L9.29296 4.65512e-05ZM15.293 7.41426L9.29296 13.4143L7.87883 12L13.8788 6.00005L15.293 7.41426ZM14.5859 7.70715L-0.414062 7.70715L-0.414062 5.70715L14.5859 5.70715L14.5859 7.70715Z"
                          fill="#33363F"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <AddItemModal
          isOpen={modalState.isOpen && modalState.type !== "group"}
          onClose={closeModal}
          title={
            modalState.type === "questionnaire"
              ? "Выберите анкету"
              : "Выберите программы"
          }
          availableItems={
            modalState.type === "questionnaire"
              ? availableQuestionnaires
              : availablePrograms
          }
          onAdd={handleAdd}
          placeholder={
            modalState.type === "questionnaire"
              ? "Название анкеты"
              : "Название программы"
          }
          itemLabel={
            modalState.type === "questionnaire"
              ? "Анкеты"
              : "Образовательные программы"
          }
        />

        <AddGroupModal
          isOpen={isGroupModalOpen}
          onClose={() => setIsGroupModalOpen(false)}
          onAdd={handleAddGroup}
          existingGroups={groups}
        />
      </div>
    </div>
  );
}
