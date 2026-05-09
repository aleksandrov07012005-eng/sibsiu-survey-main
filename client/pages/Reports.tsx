import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface ReportData {
  survey: {
    id: number;
    title: string;
  };
  programs: Array<{
    index: number;
    code: string;
    name: string;
    programName: string;
    group: string;
    responseCount: number;
  }>;
  totalResponses: number;
}

interface Survey {
  id: number;
  description: string;
}

export default function Reports() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>("");
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSurveys();
  }, []);

  const loadSurveys = async () => {
    setLoading(true);
    try {
      const response = await api<{
        items: Survey[];
        total: number;
      }>("/api/surveys/home?page=1&limit=1000&status=all");

      if (response && response.items) {
        setSurveys(response.items);
      }
    } catch (err) {
      console.error("Error loading surveys:", err);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить список опросов",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSurveySelect = async (surveyId: string) => {
    setSelectedSurveyId(surveyId);
    setReportLoading(true);

    try {
      const data = await api<ReportData>(`/api/surveys/${surveyId}/report`);
      if (data) {
        setReportData(data);
      }
    } catch (err) {
      console.error(err);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить данные отчёта",
        variant: "destructive",
      });
      setReportData(null);
    } finally {
      setReportLoading(false);
    }
  };

  const handleExportReport = async () => {
    if (!reportData) return;

    try {
      setReportLoading(true);
      const response = await fetch(`/api/surveys/${selectedSurveyId}/export`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        let errorMessage = `Server error: ${response.status}`;

        try {
          // Clone the response to safely read the body without consuming the original stream
          const clonedResponse = response.clone();
          const responseText = await clonedResponse.text();

          // Try to parse as JSON
          if (responseText) {
            try {
              const errorData = JSON.parse(responseText);
              if (errorData.error) {
                errorMessage = errorData.error;
              }
              if (errorData.details) {
                errorMessage += ` - ${errorData.details}`;
              }
            } catch {
              // If not JSON, use the text as-is
              if (responseText.length > 0) {
                errorMessage = responseText;
              }
            }
          }
        } catch (readError) {
          // If we can't read the response at all, just use the status message
          console.error("Could not read error response:", readError);
        }

        throw new Error(errorMessage);
      }

      const blob = await response.blob();

      if (blob.size === 0) {
        throw new Error("Empty response from server");
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Отчет_${reportData.survey.title}_${new Date().toISOString().split("T")[0]}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Успешно",
        description: "Отчет успешно экспортирован",
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("Error exporting report:", errorMsg);
      toast({
        title: "Ошибка при экспорте",
        description: errorMsg || "Не удалось экспортировать отчет",
        variant: "destructive",
      });
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row">
      <div className="lg:fixed lg:left-0 lg:top-0 lg:h-screen lg:overflow-y-auto">
        <Sidebar activePage="otchety" />
      </div>

      <div className="flex-1 lg:ml-[271px] flex flex-col">
        <div className="lg:hidden">
          <Header />
        </div>

        <div className="flex-1 p-4 lg:p-8 flex flex-col gap-6 lg:gap-8 overflow-y-auto pb-24">
          <div className="hidden lg:flex items-center justify-between">
            <p className="text-xl text-[#C4C4C4] font-medium">Отчёты</p>
          </div>

          <div className="flex flex-col gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Выберите опрос
              </label>
              <Select
                value={selectedSurveyId}
                onValueChange={handleSurveySelect}
              >
                <SelectTrigger className="w-full bg-white border-gray-300 text-gray-900">
                  <SelectValue placeholder="Выберите опрос по названию..." />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {surveys.length > 0 ? (
                    surveys.map((survey) => (
                      <SelectItem
                        key={survey.id}
                        value={String(survey.id)}
                        className="text-gray-900"
                      >
                        {survey.description || `Опрос #${survey.id}`}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-2 py-1.5 text-sm text-gray-500">
                      Опросы не найдены
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            {reportLoading && (
              <div className="flex justify-center items-center py-12">
                <div className="text-gray-500">Загрузка данных...</div>
              </div>
            )}

            {reportData && !reportLoading && (
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        {reportData.survey.title}
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">
                        Всего ответов: {reportData.totalResponses}
                      </p>
                    </div>
                    <Button
                      onClick={handleExportReport}
                      className="gap-2 bg-blue-600 hover:bg-blue-700"
                    >
                      <Download className="w-4 h-4" />
                      Экспорт отчёта
                    </Button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50 hover:bg-gray-50">
                        <TableHead className="font-semibold text-gray-900 w-12">
                          № п/п
                        </TableHead>
                        <TableHead className="font-semibold text-gray-900">
                          Шифр направления подготовки / специальности
                        </TableHead>
                        <TableHead className="font-semibold text-gray-900">
                          Наименование направления подготовки / специальности
                        </TableHead>
                        <TableHead className="font-semibold text-gray-900">
                          Наименование образовательной программы
                        </TableHead>
                        <TableHead className="font-semibold text-gray-900">
                          Группа анкетируемых
                        </TableHead>
                        <TableHead className="font-semibold text-gray-900 text-right w-32">
                          Количество ответов
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.programs.length > 0 ? (
                        reportData.programs.map((program) => (
                          <TableRow
                            key={`${program.index}-${program.code}`}
                            className="hover:bg-gray-50"
                          >
                            <TableCell className="font-medium text-gray-900">
                              {program.index}
                            </TableCell>
                            <TableCell className="text-gray-700">
                              {program.code}
                            </TableCell>
                            <TableCell className="text-gray-700">
                              {program.name}
                            </TableCell>
                            <TableCell className="text-gray-700">
                              {program.programName}
                            </TableCell>
                            <TableCell className="text-gray-700">
                              {program.group}
                            </TableCell>
                            <TableCell className="text-right">
                              <button
                                onClick={() =>
                                  navigate(`/survey/${reportData.survey.id}`)
                                }
                                className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                {program.responseCount}
                              </button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="text-center py-8 text-gray-500"
                          >
                            Программы не найдены
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {!selectedSurveyId && !reportLoading && (
              <div className="flex justify-center items-center py-12 text-gray-500">
                Выберите опрос для отображения данных
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
