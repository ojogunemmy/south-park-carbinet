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
      // Sort by ID in reverse order (most recent contracts first)
      // Extract numeric part of ID (handles CNT-123, CON-001, etc.)
      const aNum = parseInt(String(a.id || "").replace(/\D/g, ""), 10);
      const bNum = parseInt(String(b.id || "").replace(/\D/g, ""), 10);
      if (Number.isFinite(aNum) && Number.isFinite(bNum)) return bNum - aNum;
      return String(b.id || "").localeCompare(String(a.id || ""));
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

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 15;
      const margin = 12;
      const lineHeight = 7;
      const contentWidth = pageWidth - 2 * margin;
      const labelColumnWidth = contentWidth * 0.6;
      const amountX = margin + labelColumnWidth + 5;

      const ensureSpace = (requiredHeight: number) => {
        if (yPosition + requiredHeight > pageHeight - margin) {
          pdf.addPage();
          yPosition = 15;
        }
      };

      const writeWrappedLine = (text: string, x: number, maxWidth: number, fontSize = 9) => {
        pdf.setFontSize(fontSize);
        const lines = pdf.splitTextToSize(text || "", maxWidth);
        lines.forEach((line: string) => {
          ensureSpace(lineHeight);
          pdf.text(line, x, yPosition);
          yPosition += lineHeight - 1;
        });
        // Add a tiny gap after wrapped blocks
        yPosition += 1;
      };

      // Title
      pdf.setFontSize(16);
      pdf.setFont(undefined, "bold");
      pdf.text("PROJECT COSTS REPORT", margin, yPosition);
      yPosition += 10;

      // Generated date
      pdf.setFontSize(9);
      pdf.setFont(undefined, "normal");
      pdf.text(`Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, margin, yPosition);
      yPosition += 8;

      // Summary section
      pdf.setFont(undefined, "bold");
      pdf.setFontSize(11);
      pdf.text("SUMMARY", margin, yPosition);
      yPosition += lineHeight;

      pdf.setFont(undefined, "normal");
      pdf.setFontSize(10);

      const summaryLines = [
        { label: "Total Contract Value:", amount: `$${totalContractValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}` },
        { label: "Total Material Costs:", amount: `$${totalMaterialCosts.toLocaleString(undefined, { maximumFractionDigits: 2 })}` },
        { label: "Total Labor Costs:", amount: `$${totalLaborCosts.toLocaleString(undefined, { maximumFractionDigits: 2 })}` },
        { label: "Total Misc Costs:", amount: `$${totalMiscCosts.toLocaleString(undefined, { maximumFractionDigits: 2 })}` },
        { label: "Total Costs:", amount: `$${totalCosts.toLocaleString(undefined, { maximumFractionDigits: 2 })}` },
        { label: "Total Profit:", amount: `$${totalProfit.toLocaleString(undefined, { maximumFractionDigits: 2 })} (Margin: ${overallProfitMargin.toFixed(1)}%)` },
      ];

      summaryLines.forEach((line) => {
        ensureSpace(lineHeight);
        pdf.text(line.label, margin + 3, yPosition, { maxWidth: labelColumnWidth - 5 });
        pdf.text(line.amount, amountX, yPosition, { align: "left" });
        yPosition += lineHeight;
      });

      yPosition += 5;

      // Contracts breakdown
      pdf.setFont(undefined, "bold");
      pdf.setFontSize(11);
      pdf.text("CONTRACT BREAKDOWN", margin, yPosition);
      yPosition += lineHeight;

      // Each contract as a separate section
      filteredContracts.forEach((contract, idx) => {
        ensureSpace(12);

        const costTracking = getCostTracking(contract) as any;
        const materialCost = calculateMaterialCost(costTracking.materials || []);
        const laborCost = calculateLaborCost(costTracking.labor_cost ?? costTracking.laborCost);
        const miscCost = calculateMiscCost(costTracking.miscellaneous || []);
        const totalCost = materialCost + laborCost + miscCost;
        const profit = calculateProfit(contract);
        const margin = calculateProfitMargin(contract);

        // Contract header
        pdf.setFont(undefined, "bold");
        pdf.setFontSize(10);
        writeWrappedLine(
          `${idx + 1}. ${contract.id} - ${contract.project_name}`,
          margin,
          contentWidth,
          10,
        );

        // Contract details with two-column layout
        pdf.setFont(undefined, "normal");
        pdf.setFontSize(9);

        const detailLines = [
          { label: "Client:", amount: contract.client_name || "" },
          { label: "Status:", amount: contract.status ? contract.status.replace("-", " ") : "Pending" },
          { label: "Contract Value:", amount: `$${(contract.total_value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}` },
          { label: "Material Costs:", amount: `$${materialCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}` },
          { label: "Labor Costs:", amount: `$${laborCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}` },
          { label: "Misc Costs:", amount: `$${miscCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}` },
          { label: "Total Costs:", amount: `$${totalCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}` },
          { label: "Profit:", amount: `$${profit.toLocaleString(undefined, { maximumFractionDigits: 2 })}` },
          { label: "Profit Margin:", amount: `${margin.toFixed(1)}%` },
        ];

        detailLines.forEach((line) => {
          ensureSpace(lineHeight);
          pdf.text(line.label, margin + 5, yPosition, { maxWidth: 60 });
          // Wrap long values so they don't overflow
          const valueMaxWidth = contentWidth - 75;
          const valueLines = pdf.splitTextToSize(line.amount || "", valueMaxWidth);
          if (valueLines.length <= 1) {
            pdf.text(line.amount, margin + 75, yPosition);
            yPosition += lineHeight - 1;
          } else {
            // First line on the same row, then continue wrapped on next lines
            pdf.text(valueLines[0], margin + 75, yPosition);
            yPosition += lineHeight - 1;
            for (let i = 1; i < valueLines.length; i++) {
              ensureSpace(lineHeight);
              pdf.text(valueLines[i], margin + 75, yPosition);
              yPosition += lineHeight - 1;
            }
          }
        });

        yPosition += 3;
      });

      pdf.save("Costs-Report.pdf");
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
