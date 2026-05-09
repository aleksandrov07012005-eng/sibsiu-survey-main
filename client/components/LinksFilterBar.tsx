import { useState, useRef, useEffect } from "react";

interface Program {
  id: number | string;
  code?: string;
  name?: string;
  program_name?: string;
}

interface LinksFilterBarProps {
  onSearch: (term: string) => void;
  onCodeFilter?: (code: string | null) => void;
  onNameFilter?: (name: string | null) => void;
  onProgramNameFilter?: (programName: string | null) => void;
  programs: Program[];
}

export default function LinksFilterBar({
  onSearch,
  onCodeFilter,
  onNameFilter,
  onProgramNameFilter,
  programs,
}: LinksFilterBarProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCodeOpen, setIsCodeOpen] = useState(false);
  const [isNameOpen, setIsNameOpen] = useState(false);
  const [isProgramNameOpen, setIsProgramNameOpen] = useState(false);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [selectedProgramName, setSelectedProgramName] = useState<string | null>(
    null,
  );

  const codeRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLDivElement>(null);
  const programNameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (codeRef.current && !codeRef.current.contains(event.target as Node)) {
        setIsCodeOpen(false);
      }
      if (nameRef.current && !nameRef.current.contains(event.target as Node)) {
        setIsNameOpen(false);
      }
      if (
        programNameRef.current &&
        !programNameRef.current.contains(event.target as Node)
      ) {
        setIsProgramNameOpen(false);
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

  const handleCodeSelect = (code: string | null) => {
    setSelectedCode(code);
    setIsCodeOpen(false);
    onCodeFilter?.(code);
  };

  const handleNameSelect = (name: string | null) => {
    setSelectedName(name);
    setIsNameOpen(false);
    onNameFilter?.(name);
  };

  const handleProgramNameSelect = (programName: string | null) => {
    setSelectedProgramName(programName);
    setIsProgramNameOpen(false);
    onProgramNameFilter?.(programName);
  };

  const uniqueCodes = Array.from(
    new Set(programs.map((p) => p.code).filter(Boolean)),
  ).sort();

  const uniqueNames = Array.from(
    new Set(programs.map((p) => p.name).filter(Boolean)),
  ).sort();

  const uniqueProgramNames = Array.from(
    new Set(programs.map((p) => p.program_name).filter(Boolean)),
  ).sort();

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2 bg-white rounded-xl shadow-[0_4px_4px_0_rgba(0,0,0,0.25)] px-3 py-2 flex-1 min-w-0 md:min-w-[300px] max-w-[900px]">
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
          placeholder="Поиск по программам"
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

      <div className="flex items-center gap-2">
        <div className="relative" ref={codeRef}>
          <button
            onClick={() => setIsCodeOpen(!isCodeOpen)}
            className="flex items-center gap-3 bg-white rounded-xl shadow-[0_4px_4px_0_rgba(0,0,0,0.25)] px-3 py-2 hover:bg-gray-50 transition-colors whitespace-nowrap"
          >
            <span className="text-[#696F79] text-[15px] font-light">
              {selectedCode || "Шифр"}
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

          {isCodeOpen && (
            <div className="absolute top-full left-0 mt-1 z-10 bg-white rounded shadow-[0_4px_20px_0_rgba(0,0,0,0.15)] py-1 min-w-[160px] max-h-[300px] overflow-y-auto">
              <button
                onClick={() => handleCodeSelect(null)}
                className={`w-full px-4 py-2 text-left text-sm ${
                  selectedCode === null
                    ? "text-blue-accent font-semibold"
                    : "text-[#696F79]"
                } hover:bg-gray-100`}
              >
                Все коды
              </button>
              {uniqueCodes.map((code) => (
                <button
                  key={code}
                  onClick={() => handleCodeSelect(code)}
                  className={`w-full px-4 py-2 text-left text-sm ${
                    selectedCode === code
                      ? "text-blue-accent font-semibold"
                      : "text-[#696F79]"
                  } hover:bg-gray-100`}
                >
                  {code}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative" ref={nameRef}>
          <button
            onClick={() => setIsNameOpen(!isNameOpen)}
            className="flex items-center gap-3 bg-white rounded-xl shadow-[0_4px_4px_0_rgba(0,0,0,0.25)] px-3 py-2 hover:bg-gray-50 transition-colors whitespace-nowrap"
          >
            <span className="text-[#696F79] text-[15px] font-light">
              {selectedName
                ? selectedName.length > 15
                  ? selectedName.slice(0, 15) + "..."
                  : selectedName
                : "Направление"}
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

          {isNameOpen && (
            <div className="absolute top-full left-0 mt-1 z-10 bg-white rounded shadow-[0_4px_20px_0_rgba(0,0,0,0.15)] py-1 min-w-[200px] max-h-[300px] overflow-y-auto">
              <button
                onClick={() => handleNameSelect(null)}
                className={`w-full px-4 py-2 text-left text-sm ${
                  selectedName === null
                    ? "text-blue-accent font-semibold"
                    : "text-[#696F79]"
                } hover:bg-gray-100`}
              >
                Все направления
              </button>
              {uniqueNames.map((name) => (
                <button
                  key={name}
                  onClick={() => handleNameSelect(name)}
                  className={`w-full px-4 py-2 text-left text-sm ${
                    selectedName === name
                      ? "text-blue-accent font-semibold"
                      : "text-[#696F79]"
                  } hover:bg-gray-100`}
                  title={name}
                >
                  {name && name.length > 30 ? name.slice(0, 30) + "..." : name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative" ref={programNameRef}>
          <button
            onClick={() => setIsProgramNameOpen(!isProgramNameOpen)}
            className="flex items-center gap-3 bg-white rounded-xl shadow-[0_4px_4px_0_rgba(0,0,0,0.25)] px-3 py-2 hover:bg-gray-50 transition-colors whitespace-nowrap"
          >
            <span className="text-[#696F79] text-[15px] font-light">
              {selectedProgramName
                ? selectedProgramName.length > 15
                  ? selectedProgramName.slice(0, 15) + "..."
                  : selectedProgramName
                : "Программа"}
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

          {isProgramNameOpen && (
            <div className="absolute top-full left-0 mt-1 z-10 bg-white rounded shadow-[0_4px_20px_0_rgba(0,0,0,0.15)] py-1 min-w-[200px] max-h-[300px] overflow-y-auto">
              <button
                onClick={() => handleProgramNameSelect(null)}
                className={`w-full px-4 py-2 text-left text-sm ${
                  selectedProgramName === null
                    ? "text-blue-accent font-semibold"
                    : "text-[#696F79]"
                } hover:bg-gray-100`}
              >
                Все программы
              </button>
              {uniqueProgramNames.map((programName) => (
                <button
                  key={programName}
                  onClick={() => handleProgramNameSelect(programName)}
                  className={`w-full px-4 py-2 text-left text-sm ${
                    selectedProgramName === programName
                      ? "text-blue-accent font-semibold"
                      : "text-[#696F79]"
                  } hover:bg-gray-100`}
                  title={programName}
                >
                  {programName && programName.length > 30
                    ? programName.slice(0, 30) + "..."
                    : programName}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
