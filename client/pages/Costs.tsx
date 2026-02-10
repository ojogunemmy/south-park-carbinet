import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Printer, Download } from "lucide-react";
import { useState, useEffect } from "react";
import { useYear } from "@/contexts/YearContext";
import jsPDF from "jspdf";
import { Input } from "@/components/ui/input";
import { contractsService, type Contract } from "@/lib/supabase-service";

type ContractStatus = 'pending' | 'in-progress' | 'completed';

// Local interfaces for cost tracking structure
interface MaterialItem {
  id: string;
  name: string;
  // Contracts page persists as snake_case; keep camelCase for backward compatibility
  unit_price?: number;
  unitPrice?: number;
  quantity: number;
  unit: string;
}

interface MiscellaneousItem {
  id: string;
  description: string;
  amount: number;
}

interface CostTracking {
  materials: MaterialItem[];
  // Contracts page persists as snake_case; keep camelCase for backward compatibility
  labor_cost?: {
    calculation_method: "manual" | "daily" | "monthly" | "hours";
    amount: number;
    daily_rate?: number;
    days?: number;
    monthly_rate?: number;
    months?: number;
    hourly_rate?: number;
    hours?: number;
    description: string;
  };
  laborCost?: {
    calculationMethod: "manual" | "daily" | "monthly" | "hours";
    amount: number;
    dailyRate?: number;
    days?: number;
    monthlyRate?: number;
    months?: number;
    hourlyRate?: number;
    hours?: number;
    description: string;
  };
  miscellaneous: MiscellaneousItem[];
  profit_margin_percent?: number;
  profitMarginPercent?: number;
}

// exampleContracts removed, data is now in Supabase

export default function Costs() {
  const { selectedYear } = useYear();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "in-progress" | "completed">("all");
  const [filterFromDate, setFilterFromDate] = useState<string>("");
  const [filterToDate, setFilterToDate] = useState<string>("");

  const [loading, setLoading] = useState(true);

  const fetchContracts = async () => {
    try {
      setLoading(true);
      const data = await contractsService.getAll();
      setContracts(data);
    } catch (error: any) {
      console.error("Error loading contracts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, [selectedYear]);

  const getYearFromISODate = (dateStr?: string | null): number | null => {
    if (!dateStr) return null;
    const parts = String(dateStr).split("-");
    if (parts.length < 1) return null;
    const year = parseInt(parts[0], 10);
    return Number.isFinite(year) ? year : null;
  };

  const calculateMaterialCost = (materials: Array<Partial<MaterialItem> & Record<string, any>>) => {
    return materials.reduce((sum, m) => {
      const quantity = Number(m.quantity) || 0;
      const unitPrice = Number(m.unit_price ?? m.unitPrice) || 0;
      return sum + quantity * unitPrice;
    }, 0);
  };

  const calculateMiscCost = (misc: Array<Partial<MiscellaneousItem> & Record<string, any>>) => {
    return misc.reduce((sum, m) => sum + (Number(m.amount) || 0), 0);
  };

  const calculateLaborCost = (labor: any) => {
    // Prefer explicit amount, but gracefully handle either snake_case or camelCase shapes
    const amount = Number(labor?.amount);
    if (!Number.isNaN(amount) && amount !== 0) return amount;

    // Fallback: compute if only rates/units were provided
    const method = labor?.calculation_method ?? labor?.calculationMethod;
    if (method === "daily") return (Number(labor?.daily_rate ?? labor?.dailyRate) || 0) * (Number(labor?.days) || 0);
    if (method === "monthly") return (Number(labor?.monthly_rate ?? labor?.monthlyRate) || 0) * (Number(labor?.months) || 0);
    if (method === "hours") return (Number(labor?.hourly_rate ?? labor?.hourlyRate) || 0) * (Number(labor?.hours) || 0);
    return 0;
  };

  const getCostTracking = (contract: Contract): CostTracking | Record<string, any> => {
    const ct = (contract.cost_tracking || {}) as any;
    return {
      ...ct,
      materials: Array.isArray(ct.materials) ? ct.materials : [],
      miscellaneous: Array.isArray(ct.miscellaneous) ? ct.miscellaneous : (Array.isArray(ct.misc) ? ct.misc : []),
      labor_cost: ct.labor_cost,
      laborCost: ct.laborCost,
    };
  };

  const calculateProfit = (contract: Contract) => {
    const costTracking = getCostTracking(contract) as any;
    const materialCost = calculateMaterialCost(costTracking.materials || []);
    const laborCost = calculateLaborCost(costTracking.labor_cost ?? costTracking.laborCost);
    const miscCost = calculateMiscCost(costTracking.miscellaneous || []);
    const totalCosts = materialCost + laborCost + miscCost;
    return (contract.total_value || 0) - totalCosts;
  };

  const calculateProfitMargin = (contract: Contract) => {
    const profit = calculateProfit(contract);
    return (contract.total_value || 0) > 0 ? (profit / contract.total_value) * 100 : 0;
  };

  const filteredContracts = contracts
    .filter((contract) => {
      // Filter by Year
      // Parse YYYY-MM-DD as a plain string to avoid timezone shifting the year
      const contractYear = getYearFromISODate(contract.due_date) ?? getYearFromISODate(contract.start_date);
      if (contractYear && contractYear !== selectedYear) {
         return false;
      }

      const statusMatch = filterStatus === "all" || contract.status === filterStatus;

      let dateMatch = true;
      if (filterFromDate || filterToDate) {
        const dueDateStr = contract.due_date || "";
        const dueDateParts = dueDateStr.split('-');
        if (dueDateParts.length < 3) return statusMatch;
        const dueDate = new Date(parseInt(dueDateParts[0]), parseInt(dueDateParts[1]) - 1, parseInt(dueDateParts[2]));

        if (filterFromDate) {
          const fromDateParts = filterFromDate.split('-');
          const fromDate = new Date(parseInt(fromDateParts[0]), parseInt(fromDateParts[1]) - 1, parseInt(fromDateParts[2]));
          if (dueDate < fromDate) dateMatch = false;
        }
        if (filterToDate) {
          const toDateParts = filterToDate.split('-');
          const toDate = new Date(parseInt(toDateParts[0]), parseInt(toDateParts[1]) - 1, parseInt(toDateParts[2]));
          // Include the end date (don't add 1 day)
          if (dueDate > toDate) dateMatch = false;
        }
      }

      return statusMatch && dateMatch;
    })
    .sort((a, b) => {
      // Sort by created_at in descending order (newest contracts first)
      if (!a.created_at) return 1;
      if (!b.created_at) return -1;
      const aDate = new Date(a.created_at);
      const bDate = new Date(b.created_at);
      return bDate.getTime() - aDate.getTime();
    });

  const totalContractValue = filteredContracts.reduce((sum, c) => sum + (c.total_value || 0), 0);
  const totalMaterialCosts = filteredContracts.reduce((sum, c) => {
    const ct = getCostTracking(c) as any;
    return sum + calculateMaterialCost(ct.materials || []);
  }, 0);
  const totalLaborCosts = filteredContracts.reduce((sum, c) => {
    const ct = getCostTracking(c) as any;
    return sum + calculateLaborCost(ct.labor_cost ?? ct.laborCost);
  }, 0);
  const totalMiscCosts = filteredContracts.reduce((sum, c) => {
    const ct = getCostTracking(c) as any;
    return sum + calculateMiscCost(ct.miscellaneous || []);
  }, 0);
  const totalCosts = totalMaterialCosts + totalLaborCosts + totalMiscCosts;
  const totalProfit = totalContractValue - totalCosts;
  const overallProfitMargin = totalContractValue > 0 ? (totalProfit / totalContractValue) * 100 : 0;

  const exportToCSV = () => {
    if (filteredContracts.length === 0) {
      alert("No data to export");
      return;
    }

    const escapeCsvValue = (value: unknown) => {
      const raw = value == null ? "" : String(value);
      // Quote if it contains a comma, quote, or newline
      if (/[",\n\r]/.test(raw)) {
        return `"${raw.replace(/"/g, '""')}"`;
      }
      return raw;
    };

    const headers = [
      "Contract ID",
      "Project",
      "Client",
      "Status",
      "Contract Value",
      "Material Costs",
      "Labor Costs",
      "Misc Costs",
      "Total Costs",
      "Profit",
      "Margin %"
    ];

    const csvRows = [headers.map(escapeCsvValue).join(",")];

    filteredContracts.forEach(contract => {
      const costTracking = getCostTracking(contract) as any;
      const materialCost = calculateMaterialCost(costTracking.materials || []);
      const laborCost = calculateLaborCost(costTracking.labor_cost ?? costTracking.laborCost);
      const miscCost = calculateMiscCost(costTracking.miscellaneous || []);
      const totalCost = materialCost + laborCost + miscCost;
      const profit = calculateProfit(contract);
      const margin = calculateProfitMargin(contract);

      const row = [
        contract.id,
        contract.project_name,
        contract.client_name || "",
        contract.status,
        contract.total_value || 0,
        materialCost,
        laborCost,
        miscCost,
        totalCost,
        profit,
        margin.toFixed(2),
      ].map(escapeCsvValue);
      csvRows.push(row.join(","));
    });

    // Add UTF-8 BOM so Excel opens it cleanly
    const csvString = `\uFEFF${csvRows.join("\n")}`;
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `project_costs_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in-progress":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const printCostReport = () => {
    try {
      if (filteredContracts.length === 0) {
        alert("No contracts to print");
        return;
      }

      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 12;
      const contentWidth = pageWidth - 2 * margin;
      const footerHeight = 12;

      const formatCurrency = (value: number) =>
        `$${(Number(value) || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

      const statusLabel = (status?: string | null) =>
        status ? String(status).replace(/-/g, " ") : "pending";

      const fitText = (text: string, maxWidth: number, fontSize: number) => {
        pdf.setFontSize(fontSize);
        const str = text ?? "";
        if (pdf.getTextWidth(str) <= maxWidth) return str;
        const ellipsis = "…";
        let lo = 0;
        let hi = str.length;
        while (lo < hi) {
          const mid = Math.floor((lo + hi) / 2);
          const candidate = str.slice(0, mid) + ellipsis;
          if (pdf.getTextWidth(candidate) <= maxWidth) lo = mid + 1;
          else hi = mid;
        }
        const finalLen = Math.max(0, lo - 1);
        return str.slice(0, finalLen) + ellipsis;
      };

      const drawHeader = () => {
        // Header background
        pdf.setFillColor(31, 41, 55);
        pdf.rect(0, 0, pageWidth, 22, "F");

        // Title
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(20);
        pdf.setFont(undefined, "bold");
        pdf.text("SOUTH PARK CABINETS", margin, 10);

        // Subtitle
        pdf.setFontSize(11);
        pdf.setFont(undefined, "normal");
        pdf.text("Project Costs Report", margin, 18);

        const filterParts: string[] = [];
        filterParts.push(`Year: ${selectedYear}`);
        if (filterStatus !== "all") filterParts.push(`Status: ${statusLabel(filterStatus)}`);
        if (filterFromDate) filterParts.push(`From: ${filterFromDate}`);
        if (filterToDate) filterParts.push(`To: ${filterToDate}`);
        const filters = filterParts.join(" | ");

        pdf.setTextColor(200, 200, 200);
        pdf.setFontSize(9);
        pdf.text(filters, margin, 22 + 6);

        pdf.setTextColor(150, 150, 150);
        pdf.text(
          `Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
          pageWidth - margin,
          18,
          { align: "right" },
        );

        pdf.setTextColor(0, 0, 0);
      };

      const drawSummary = (startY: number) => {
        const boxWidth = (contentWidth - 9) / 4;
        const summaryData = [
          { label: "Total Contract Value", value: formatCurrency(totalContractValue), color: [59, 130, 246] as const },
          { label: "Total Costs", value: formatCurrency(totalCosts), color: [239, 68, 68] as const },
          { label: "Total Profit", value: formatCurrency(totalProfit), color: [34, 197, 94] as const },
          { label: "Avg Margin", value: `${overallProfitMargin.toFixed(1)}%`, color: [168, 85, 247] as const },
        ];

        summaryData.forEach((item, idx) => {
          const xPos = margin + idx * (boxWidth + 3);
          const [r, g, b] = item.color;
          pdf.setFillColor(r, g, b);
          pdf.rect(xPos, startY, boxWidth, 12, "F");

          pdf.setTextColor(255, 255, 255);
          pdf.setFontSize(8);
          pdf.setFont(undefined, "normal");
          pdf.text(item.label, xPos + 2, startY + 4);

          pdf.setFontSize(10);
          pdf.setFont(undefined, "bold");
          pdf.text(String(item.value), xPos + 2, startY + 10);
        });

        pdf.setTextColor(0, 0, 0);
        return startY + 18;
      };

      // Must sum to contentWidth (landscape A4 minus margins)
      // Wider Contract column so full IDs show without truncation
      const colWidths = [7, 28, 42, 30, 18, 23, 20, 20, 20, 23, 23, 14];
      const headers = [
        "#",
        "Contract",
        "Project",
        "Client",
        "Status",
        "Value",
        "Materials",
        "Labor",
        "Misc",
        "Total",
        "Profit",
        "Margin",
      ];

      const drawTableHeader = (y: number) => {
        pdf.setFillColor(59, 70, 87);
        pdf.rect(margin, y - 5, contentWidth, 8, "F");
        pdf.setTextColor(255, 255, 255);
        pdf.setFont(undefined, "bold");
        pdf.setFontSize(10);

        let x = margin + 2;
        headers.forEach((h, idx) => {
          const w = colWidths[idx];
          const isNumberCol = idx >= 5;
          if (isNumberCol) {
            pdf.text(h, x + w - 2, y, { align: "right" });
          } else {
            pdf.text(h, x, y);
          }
          x += w;
        });

        pdf.setTextColor(0, 0, 0);
        return y + 10;
      };

      const drawFooter = (pageNumber: number) => {
        const y = pageHeight - 8;
        pdf.setDrawColor(200, 200, 200);
        pdf.setLineWidth(0.2);
        pdf.line(margin, y - 4, pageWidth - margin, y - 4);
        pdf.setFont(undefined, "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(`Contracts: ${filteredContracts.length}`, margin, y);
        pdf.text(`Page ${pageNumber}`, pageWidth - margin, y, { align: "right" });
        pdf.setTextColor(0, 0, 0);
      };

      // Start
      drawHeader();
      let yPosition = drawSummary(34);
      yPosition = drawTableHeader(yPosition);

      const lineHeight = 4.2;
      let zebra = 0;
      let currentPage = 1;

      filteredContracts.forEach((contract, idx) => {
        const normalized = getCostTracking(contract) as any;
        const materialCost = calculateMaterialCost(normalized.materials || []);
        const laborCost = calculateLaborCost(normalized.labor_cost ?? normalized.laborCost);
        const miscCost = calculateMiscCost(normalized.miscellaneous || []);
        const totalCost = materialCost + laborCost + miscCost;
        const profit = calculateProfit(contract);
        const profitMargin = calculateProfitMargin(contract);

        const contractIdLines = pdf.splitTextToSize(String(contract.id || ""), colWidths[1] - 3);
        const projectLines = pdf.splitTextToSize(String(contract.project_name || ""), colWidths[2] - 4);
        const clientLines = pdf.splitTextToSize(String(contract.client_name || ""), colWidths[3] - 4);
        const maxLines = Math.max(1, contractIdLines.length, projectLines.length, clientLines.length);
        const rowHeight = Math.max(8, 2 + maxLines * lineHeight);

        // Page break
        if (yPosition + rowHeight > pageHeight - footerHeight) {
          drawFooter(currentPage);
          pdf.addPage();
          currentPage += 1;
          drawHeader();
          yPosition = drawSummary(34);
          yPosition = drawTableHeader(yPosition);
          zebra = 0;
        }

        // Row background
        pdf.setFillColor(zebra % 2 === 0 ? 240 : 255, zebra % 2 === 0 ? 245 : 255, zebra % 2 === 0 ? 250 : 255);
        pdf.rect(margin, yPosition - 4, contentWidth, rowHeight, "F");
        pdf.setDrawColor(220, 220, 220);
        pdf.setLineWidth(0.2);
        pdf.line(margin, yPosition - 4 + rowHeight, margin + contentWidth, yPosition - 4 + rowHeight);

        // Cell text
        pdf.setFont(undefined, "normal");
        pdf.setFontSize(8.5);
        let x = margin + 2;
        const topY = yPosition;

        // #
        pdf.setFont(undefined, "bold");
        pdf.text(String(idx + 1), x, topY);
        x += colWidths[0];

        // Contract ID (wrap to show full value)
        pdf.setFont(undefined, "bold");
        contractIdLines.forEach((line: string, i: number) => {
          pdf.text(line, x, topY + i * lineHeight);
        });
        x += colWidths[1];

        // Project (wrap)
        pdf.setFont(undefined, "normal");
        projectLines.slice(0, 3).forEach((line: string, i: number) => {
          pdf.text(line, x, topY + i * lineHeight);
        });
        x += colWidths[2];

        // Client (wrap)
        clientLines.slice(0, 3).forEach((line: string, i: number) => {
          pdf.text(line, x, topY + i * lineHeight);
        });
        x += colWidths[3];

        // Status
        const status = statusLabel(contract.status);
        pdf.text(fitText(status, colWidths[4] - 3, 8.5), x, topY);
        x += colWidths[4];

        // Numeric columns (right aligned)
        const numbers = [
          formatCurrency(contract.total_value || 0),
          formatCurrency(materialCost),
          formatCurrency(laborCost),
          formatCurrency(miscCost),
          formatCurrency(totalCost),
          formatCurrency(profit),
          `${profitMargin.toFixed(1)}%`,
        ];
        numbers.forEach((val, nIdx) => {
          const w = colWidths[5 + nIdx];
          pdf.text(val, x + w - 2, topY, { align: "right" });
          x += w;
        });

        yPosition += rowHeight;
        zebra += 1;
      });

      drawFooter(currentPage);
      pdf.save(`Project-Costs-Report-${selectedYear}.pdf`);
    } catch (error) {
      console.error("Error generating cost report:", error);
      alert(`Error generating report: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Project Costs</h1>
          <p className="text-slate-600 mt-1">Track and analyze costs across all contracts</p>
        </div>
        <div className="flex gap-2 w-full lg:w-auto">
          <Button onClick={printCostReport} className="gap-2 bg-slate-600 hover:bg-slate-700">
             <Printer className="w-4 h-4" />
             Print Report
          </Button>
          <Button onClick={exportToCSV} variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Total Contract Value</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">${totalContractValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Total Costs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">${totalCosts.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
           <CardHeader>
            <CardTitle className="text-lg">Total Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">${totalProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardHeader>
             <CardTitle className="text-lg">Avg Margin</CardTitle>
          </CardHeader>
           <CardContent>
            <p className="text-3xl font-bold text-blue-600">{overallProfitMargin.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      {contracts.length > 0 && (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Filter Projects</CardTitle>
            <CardDescription>Filter by status or date range</CardDescription>
          </CardHeader>
          <div className="border-b border-slate-200 px-6 py-4">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center flex-wrap">
              <div className="flex gap-2 flex-wrap w-full lg:w-auto">
                <Button
                  onClick={() => setFilterStatus("all")}
                  variant={filterStatus === "all" ? "default" : "outline"}
                  className={filterStatus === "all" ? "bg-blue-600 hover:bg-blue-700" : "border-slate-300"}
                  size="sm"
                >
                  All ({contracts.length})
                </Button>
                <Button
                  onClick={() => setFilterStatus("pending")}
                  variant={filterStatus === "pending" ? "default" : "outline"}
                  className={filterStatus === "pending" ? "bg-yellow-600 hover:bg-yellow-700" : "border-slate-300"}
                  size="sm"
                >
                  Pending ({contracts.filter(c => c.status === "pending").length})
                </Button>
                <Button
                  onClick={() => setFilterStatus("in-progress")}
                  variant={filterStatus === "in-progress" ? "default" : "outline"}
                  className={filterStatus === "in-progress" ? "bg-blue-600 hover:bg-blue-700" : "border-slate-300"}
                   size="sm"
                >
                  In Progress ({contracts.filter(c => c.status === "in-progress").length})
                </Button>
                <Button
                  onClick={() => setFilterStatus("completed")}
                  variant={filterStatus === "completed" ? "default" : "outline"}
                  className={filterStatus === "completed" ? "bg-green-600 hover:bg-green-700" : "border-slate-300"}
                   size="sm"
                >
                  Completed ({contracts.filter(c => c.status === "completed").length})
                </Button>
              </div>

               <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto items-start sm:items-center">
                  <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                    <Input
                      type="date"
                      placeholder="From"
                      value={filterFromDate}
                      onChange={(e) => setFilterFromDate(e.target.value)}
                      className="border-slate-300 w-full sm:w-36"
                    />
                    <span className="text-slate-500 text-sm">to</span>
                    <Input
                      type="date"
                      placeholder="To"
                      value={filterToDate}
                      onChange={(e) => setFilterToDate(e.target.value)}
                      className="border-slate-300 w-full sm:w-36"
                    />
                  </div>
                  {(filterFromDate || filterToDate) && (
                    <Button
                      onClick={() => {
                        setFilterFromDate("");
                        setFilterToDate("");
                      }}
                      variant="outline"
                      className="border-slate-300 w-full sm:w-auto"
                      size="sm"
                    >
                      Clear
                    </Button>
                  )}
               </div>
            </div>
          </div>
        </Card>
      )}

      {filteredContracts.length > 0 ? (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Cost Breakdown by Contract</CardTitle>
            <CardDescription>Material, labor, and miscellaneous costs for each project</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="text-left p-3 font-semibold text-slate-900">Contract ID</th>
                    <th className="text-left p-3 font-semibold text-slate-900">Project</th>
                    <th className="text-left p-3 font-semibold text-slate-900">Client</th>
                    <th className="text-left p-3 font-semibold text-slate-900 whitespace-nowrap">Status</th>
                    <th className="text-right p-3 font-semibold text-slate-900">Contract Value</th>
                    <th className="text-right p-3 font-semibold text-slate-900">Materials</th>
                    <th className="text-right p-3 font-semibold text-slate-900">Labor</th>
                    <th className="text-right p-3 font-semibold text-slate-900">Miscellaneous</th>
                    <th className="text-right p-3 font-semibold text-slate-900">Total Costs</th>
                    <th className="text-right p-3 font-semibold text-slate-900 whitespace-nowrap">Profit</th>
                    <th className="text-right p-3 font-semibold text-slate-900">Margin %</th>
                  </tr>
                </thead>
                <tbody>
                   {filteredContracts.map((contract, idx) => {
                    const costTracking = contract.cost_tracking as CostTracking;
                      const normalized = getCostTracking(contract) as any;
                      const materialCost = calculateMaterialCost(normalized.materials || []);
                      const laborCost = calculateLaborCost(normalized.labor_cost ?? normalized.laborCost);
                      const miscCost = calculateMiscCost(normalized.miscellaneous || []);
                    const totalCost = materialCost + laborCost + miscCost;
                    const profit = calculateProfit(contract);
                    const margin = calculateProfitMargin(contract);

                    return (
                      <tr key={contract.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                        <td className="p-3 text-slate-700 font-semibold">{contract.id}</td>
                        <td className="p-3 text-slate-700">{contract.project_name}</td>
                        <td className="p-3 text-slate-700 text-xs">{contract.client_name}</td>
                        <td className="p-3 whitespace-nowrap">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${getStatusColor(contract.status)}`}>
                            {contract.status ? contract.status.replace("-", " ") : "Pending"}
                          </span>
                        </td>
                        <td className="p-3 text-right text-slate-700 font-semibold whitespace-nowrap">
                          ${(contract.total_value || 0).toLocaleString()}
                        </td>
                        <td className="p-3 text-right text-blue-600 font-semibold whitespace-nowrap">
                          ${materialCost.toLocaleString()}
                        </td>
                        <td className="p-3 text-right text-purple-600 font-semibold whitespace-nowrap">
                          ${laborCost.toLocaleString()}
                        </td>
                        <td className="p-3 text-right text-orange-600 font-semibold whitespace-nowrap">
                          ${miscCost.toLocaleString()}
                        </td>
                        <td className="p-3 text-right text-slate-700 font-semibold whitespace-nowrap">
                          ${totalCost.toLocaleString()}
                        </td>
                        <td className={`p-3 text-right font-semibold whitespace-nowrap ${profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                          ${profit.toLocaleString()}
                        </td>
                        <td className={`p-3 text-right font-semibold whitespace-nowrap ${margin >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {margin.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-4">
               {filteredContracts.map((contract) => {
                const normalized = getCostTracking(contract) as any;
                const materialCost = calculateMaterialCost(normalized.materials || []);
                const laborCost = calculateLaborCost(normalized.labor_cost ?? normalized.laborCost);
                const miscCost = calculateMiscCost(normalized.miscellaneous || []);
                  const totalCost = materialCost + laborCost + miscCost;
                  const profit = calculateProfit(contract);
                  const margin = calculateProfitMargin(contract);

                  return (
                    <div key={contract.id} className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-bold text-slate-900">{contract.project_name}</h4>
                          <p className="text-xs text-slate-600">{contract.client_name}</p>
                        </div>
                         <span className={`inline-block px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${getStatusColor(contract.status)}`}>
                            {contract.status ? contract.status.replace("-", " ") : "Pending"}
                          </span>
                      </div>

                      <div className="flex justify-between items-center mb-3">
                         <span className="text-sm text-slate-500">Contract Value</span>
                         <span className="font-bold text-slate-900">${(contract.total_value || 0).toLocaleString()}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm mb-3 pt-2 border-t border-slate-100">
                          <div>
                            <span className="block text-xs text-blue-600 font-medium">Materials</span>
                            <span>${materialCost.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="block text-xs text-purple-600 font-medium">Labor</span>
                            <span>${laborCost.toLocaleString()}</span>
                          </div>
                           <div>
                            <span className="block text-xs text-orange-600 font-medium">Misc</span>
                            <span>${miscCost.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="block text-xs text-slate-600 font-medium">Total Cost</span>
                            <span className="font-semibold">${totalCost.toLocaleString()}</span>
                          </div>
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-slate-100 bg-slate-50 -mx-4 -mb-4 p-4 mt-2">
                         <div>
                            <span className="block text-xs text-slate-500">Profit Margin</span>
                            <span className={`font-bold ${margin >= 0 ? "text-green-600" : "text-red-600"}`}>{margin.toFixed(1)}%</span>
                         </div>
                         <div className="text-right">
                             <span className="block text-xs text-slate-500">Net Profit</span>
                             <span className={`font-bold text-lg ${profit >= 0 ? "text-green-600" : "text-red-600"}`}>${profit.toLocaleString()}</span>
                         </div>
                      </div>
                    </div>
                  );
               })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-3 py-8">
              <AlertCircle className="w-5 h-5 text-slate-400" />
              <p className="text-slate-600">No contracts found. Create a contract to start tracking costs.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
