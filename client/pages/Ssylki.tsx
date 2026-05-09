import Sidebar from "@/components/Sidebar";
import ProgramsTable from "@/components/ProgramsTable";
import Header from "@/components/Header";
import LinksFilterBar from "@/components/LinksFilterBar";
import { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/api";

export default function Ssylki() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [selectedProgramName, setSelectedProgramName] = useState<string | null>(
    null,
  );

  useEffect(() => {
    loadPrograms();
  }, []);

  const loadPrograms = async () => {
    setLoading(true);
    try {
      const data = await api<any[]>("/api/programs");
      setPrograms(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccessChanged = () => {
    loadPrograms();
  };

  const filteredPrograms = useMemo(() => {
    return programs.filter((program) => {
      const matchesSearch =
        !searchTerm ||
        (program.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (program.code || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (program.program_name || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      const matchesCode = !selectedCode || program.code === selectedCode;
      const matchesName = !selectedName || program.name === selectedName;
      const matchesProgramName =
        !selectedProgramName || program.program_name === selectedProgramName;

      return matchesSearch && matchesCode && matchesName && matchesProgramName;
    });
  }, [programs, searchTerm, selectedCode, selectedName, selectedProgramName]);

  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row">
      <div className="lg:fixed lg:left-0 lg:top-0 lg:h-screen lg:overflow-y-auto">
        <Sidebar activePage="ssylki" />
      </div>

      <div className="flex-1 lg:ml-[271px] flex flex-col">
        <div className="lg:hidden">
          <Header />
        </div>

        <div className="flex-1 p-4 lg:p-8 flex flex-col gap-6 lg:gap-8 overflow-y-auto pb-24">
          <div className="hidden lg:flex items-center justify-between">
            <p className="text-xl text-[#C4C4C4] font-medium">
              Образовательные программы
            </p>
          </div>

          <LinksFilterBar
            onSearch={setSearchTerm}
            onCodeFilter={setSelectedCode}
            onNameFilter={setSelectedName}
            onProgramNameFilter={setSelectedProgramName}
            programs={programs}
          />

          <ProgramsTable
            programs={filteredPrograms}
            onItemsDeleted={loadPrograms}
            onAccessChanged={handleAccessChanged}
          />
        </div>
      </div>
    </div>
  );
}
