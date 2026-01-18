import { useYear } from "@/contexts/YearContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const YearSelector = () => {
  const { selectedYear, setSelectedYear, availableYears } = useYear();
  const navigate = useNavigate();

  const handleYearChange = (value: string) => {
    const newYear = parseInt(value, 10);
    setSelectedYear(newYear);
    navigate("/");
  };

  return (
    <div className="flex items-center gap-2">
      <Calendar className="w-4 h-4 text-slate-600" />
      <Select value={String(selectedYear)} onValueChange={handleYearChange}>
        <SelectTrigger className="w-32 bg-white border-slate-200">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {availableYears.map((year) => (
            <SelectItem key={year} value={String(year)}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
