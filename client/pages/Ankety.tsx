import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import SurveysTable from "@/components/SurveysTable";
import Header from "@/components/Header";
import AnketyFilterBar from "@/components/AnketyFilterBar";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

interface QuestionaireItem {
  id: number;
  title: string;
  description?: string;
  created_at?: string;
}

export default function Ankety() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<QuestionaireItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await api<any[]>("/api/questionnaires");
        if (!mounted) return;
        setItems(
          (data || []).map((d) => ({
            id: d.id,
            title: d.title,
            description: d.description,
            created_at: d.created_at,
          })),
        );
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Ошибка при загрузке анкет");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchData();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    return items.filter((it) => {
      const ql = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !ql ||
        (it.title || "").toLowerCase().includes(ql) ||
        (it.description || "").toLowerCase().includes(ql);

      let matchesDate = true;
      if (dateFrom || dateTo) {
        const itemDate = it.created_at ? new Date(it.created_at) : null;
        if (dateFrom) {
          const fromDate = new Date(dateFrom);
          fromDate.setHours(0, 0, 0, 0);
          if (!itemDate || itemDate < fromDate) {
            matchesDate = false;
          }
        }
        if (dateTo) {
          const toDate = new Date(dateTo);
          toDate.setHours(23, 59, 59, 999);
          if (!itemDate || itemDate > toDate) {
            matchesDate = false;
          }
        }
      }

      return matchesSearch && matchesDate;
    });
  }, [items, searchTerm, dateFrom, dateTo]);

  const surveys = filtered.map((it) => ({
    id: String(it.id),
    name: it.title || "Анкета",
    surveyId: String(it.id),
    date: it.created_at ? new Date(it.created_at).toLocaleDateString() : "-",
  }));

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const data = await api<any[]>("/api/questionnaires");
      setItems(
        (data || []).map((d) => ({
          id: d.id,
          title: d.title,
          description: d.description,
          created_at: d.created_at,
        })),
      );
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Ошибка при загрузке анкет");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row">
      <div className="lg:fixed lg:left-0 lg:top-0 lg:h-screen lg:overflow-y-auto">
        <Sidebar activePage="ankety" />
      </div>

      <div className="flex-1 lg:ml-[271px] flex flex-col">
        <div className="lg:hidden">
          <Header />
        </div>

        <div className="flex-1 p-4 lg:p-8 flex flex-col gap-6 lg:gap-8 overflow-y-auto pb-24">
          <div className="hidden lg:flex items-center justify-between">
            <h2 className="text-xl text-text-gray font-medium">Анкеты</h2>
          </div>

          <div className="flex items-center justify-between gap-4 flex-wrap">
            <AnketyFilterBar
              onSearch={setSearchTerm}
              onDateRangeFilter={(from, to) => {
                setDateFrom(from);
                setDateTo(to);
              }}
            />
            <div className="flex-shrink-0 mt-2 sm:mt-0">
              <button
                onClick={() => navigate("/ankety/new")}
                className="bg-blue-accent text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-600 transition-colors"
              >
                Добавить анкету
              </button>
            </div>
          </div>

          <SurveysTable
            surveys={surveys}
            onItemsDeleted={handleRefresh}
            onAccessChanged={handleRefresh}
            itemType="questionnaire"
          />
        </div>
      </div>
    </div>
  );
}
