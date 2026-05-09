import { useState } from "react";

interface AnketyFilterBarProps {
  onSearch: (term: string) => void;
  onDateRangeFilter?: (dateFrom: string | null, dateTo: string | null) => void;
}

export default function AnketyFilterBar({
  onSearch,
  onDateRangeFilter,
}: AnketyFilterBarProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    onSearch(value);
  };

  const handleClear = () => {
    setSearchTerm("");
    onSearch("");
  };

  const handleDateFromChange = (value: string) => {
    setDateFrom(value || null);
    onDateRangeFilter?.(value || null, dateTo);
  };

  const handleDateToChange = (value: string) => {
    setDateTo(value || null);
    onDateRangeFilter?.(dateFrom, value || null);
  };

  const handleClearDates = () => {
    setDateFrom(null);
    setDateTo(null);
    onDateRangeFilter?.(null, null);
  };

  const formatDateDisplay = (date: string | null) => {
    if (!date) return "";
    try {
      const d = new Date(date);
      return d.toLocaleDateString("ru-RU");
    } catch {
      return date;
    }
  };

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
          placeholder="Поиск по анкетам"
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

      <div className="relative">
        <button
          onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
          className="flex items-center gap-3 bg-white rounded-xl shadow-[0_4px_4px_0_rgba(0,0,0,0.25)] px-3 py-2 hover:bg-gray-50 transition-colors whitespace-nowrap"
        >
          <span className="text-[#696F79] text-[15px] font-light">
            {dateFrom || dateTo
              ? `${formatDateDisplay(dateFrom) || "..."} - ${formatDateDisplay(dateTo) || "..."}`
              : "Дата изменения"}
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

        {isDatePickerOpen && (
          <div className="absolute top-full right-0 mt-1 z-10 bg-white rounded shadow-[0_4px_20px_0_rgba(0,0,0,0.15)] p-4 min-w-[320px]">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  От даты:
                </label>
                <input
                  type="date"
                  value={dateFrom || ""}
                  onChange={(e) => handleDateFromChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  По дату:
                </label>
                <input
                  type="date"
                  value={dateTo || ""}
                  onChange={(e) => handleDateToChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-accent"
                />
              </div>

              <div className="flex gap-2 pt-2">
                {(dateFrom || dateTo) && (
                  <button
                    onClick={handleClearDates}
                    className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Очистить
                  </button>
                )}
                <button
                  onClick={() => setIsDatePickerOpen(false)}
                  className="flex-1 px-3 py-2 text-sm font-medium text-white bg-blue-accent rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Готово
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
