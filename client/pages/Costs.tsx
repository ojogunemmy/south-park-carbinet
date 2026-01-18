import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Printer } from "lucide-react";
import { useState, useEffect } from "react";
import { useYear } from "@/contexts/YearContext";
import { getYearData, shouldUseExampleData, saveYearData } from "@/utils/yearStorage";
import { useAutoSave } from "@/hooks/useAutoSave";
import jsPDF from "jspdf";
import { Input } from "@/components/ui/input";

interface MaterialItem {
  id: string;
  name: string;
  unitPrice: number;
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
  laborCost: {
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
  profitMarginPercent: number;
}

interface Contract {
  id: string;
  clientName: string;
  projectName: string;
  totalValue: number;
  status: "pending" | "in-progress" | "completed";
  startDate: string;
  dueDate: string;
  costTracking: CostTracking;
}

const exampleContracts: Contract[] = [
  {
    id: "CON-001",
    clientName: "Marconi",
    projectName: "2231 Hessell pl Charlotte",
    totalValue: 7600,
    status: "pending",
    startDate: "2026-01-01",
    dueDate: "2026-01-31",
    costTracking: {
      materials: [
        {
          id: "MAT-001",
          name: "Materials",
          unitPrice: 1042.96,
          quantity: 1,
          unit: "lot"
        }
      ],
      laborCost: {
        calculationMethod: "manual",
        amount: 1000,
        description: "Labor costs"
      },
      miscellaneous: [],
      profitMarginPercent: 73.1
    }
  },
  {
    id: "CON-002",
    clientName: "PSR Construction",
    projectName: "709 Woodcliff",
    totalValue: 14600,
    status: "pending",
    startDate: "2026-01-05",
    dueDate: "2026-01-28",
    costTracking: {
      materials: [
        {
          id: "MAT-001",
          name: "Plywood Birch Prefinished 3/4\" 4x8 C2",
          unitPrice: 38.51,
          quantity: 25,
          unit: "EA"
        },
        {
          id: "MAT-012",
          name: "Drawer Side 8\"x96\" 5/8\" Rubberwood Flat Edge UV",
          unitPrice: 21.65,
          quantity: 15,
          unit: "EA"
        },
        {
          id: "MAT-025",
          name: "Blum Clip Top Hinge 110 Blumotion F-OL Inserta",
          unitPrice: 3.70,
          quantity: 55,
          unit: "EA"
        },
        {
          id: "MAT-027",
          name: "Tandem Plus Blumotion 563H 18\" Full Ext Drawer Zinc",
          unitPrice: 16.97,
          quantity: 15,
          unit: "EA"
        },
        {
          id: "MAT-028",
          name: "Tandem Plus Blumotion 563/9 Locking Device Left",
          unitPrice: 1.33,
          quantity: 15,
          unit: "EA"
        },
        {
          id: "MAT-029",
          name: "Tandem Plus Blumotion 563/9 Locking Device Right",
          unitPrice: 1.33,
          quantity: 15,
          unit: "EA"
        },
        {
          id: "MAT-030",
          name: "Blum Plates",
          unitPrice: 0.80,
          quantity: 55,
          unit: "EA"
        },
        {
          id: "MAT-031",
          name: "Paint",
          unitPrice: 130.00,
          quantity: 5,
          unit: "unit"
        },
        {
          id: "MAT-032",
          name: "Primer",
          unitPrice: 130.00,
          quantity: 5,
          unit: "unit"
        }
      ],
      laborCost: {
        calculationMethod: "manual",
        amount: 3000,
        description: "Labor costs"
      },
      miscellaneous: [],
      profitMarginPercent: 35.0
    }
  },
  {
    id: "CON-003",
    clientName: "PRS Construction",
    projectName: "207 bellmeade Ct",
    totalValue: 78000,
    status: "pending",
    startDate: "2026-01-01",
    dueDate: "2026-01-09",
    costTracking: {
      materials: [
        {
          id: "MAT-001",
          name: "Materials",
          unitPrice: 25000,
          quantity: 1,
          unit: "lot"
        }
      ],
      laborCost: {
        calculationMethod: "manual",
        amount: 15000,
        description: "Labor costs"
      },
      miscellaneous: [],
      profitMarginPercent: 38.0
    }
  }
];

export default function Costs() {
  const { selectedYear } = useYear();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "in-progress" | "completed">("all");
  const [filterFromDate, setFilterFromDate] = useState<string>("");
  const [filterToDate, setFilterToDate] = useState<string>("");

  useEffect(() => {
    // Try to load from year-based storage first
    const savedContracts = getYearData<Contract[]>("contracts", selectedYear, null);
    if (savedContracts && savedContracts.length > 0) {
      setContracts(savedContracts);
    } else if (shouldUseExampleData(selectedYear) && exampleContracts.length > 0) {
      // For 2025/2026, load example contracts and save them
      saveYearData("contracts", selectedYear, exampleContracts);
      setContracts(exampleContracts);
    } else {
      setContracts([]);
    }
  }, [selectedYear]);

  // Auto-save contracts whenever they change
  useAutoSave({
    data: contracts,
    key: "contracts",
    year: selectedYear,
    debounceMs: 500,
  });

  const calculateMaterialCost = (materials: MaterialItem[]) => {
    return materials.reduce((sum, m) => sum + m.quantity * m.unitPrice, 0);
  };

  const calculateMiscCost = (misc: MiscellaneousItem[]) => {
    return misc.reduce((sum, m) => sum + m.amount, 0);
  };

  const calculateLaborCost = (laborCost: CostTracking["laborCost"]) => {
    return laborCost?.amount || 0;
  };

  const calculateProfit = (contract: Contract) => {
    const materialCost = calculateMaterialCost(contract.costTracking.materials);
    const laborCost = calculateLaborCost(contract.costTracking.laborCost);
    const miscCost = calculateMiscCost(contract.costTracking.miscellaneous);
    const totalCosts = materialCost + laborCost + miscCost;
    return contract.totalValue - totalCosts;
  };

  const calculateProfitMargin = (contract: Contract) => {
    const profit = calculateProfit(contract);
    return contract.totalValue > 0 ? (profit / contract.totalValue) * 100 : 0;
  };

  const filteredContracts = contracts
    .filter((contract) => {
      const statusMatch = filterStatus === "all" || contract.status === filterStatus;

      let dateMatch = true;
      if (filterFromDate || filterToDate) {
        const dueDateParts = contract.dueDate.split('-');
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
      // Extract numeric part of ID (e.g., "CON-001" -> 1)
      const aNum = parseInt(a.id.replace("CON-", ""), 10);
      const bNum = parseInt(b.id.replace("CON-", ""), 10);
      return bNum - aNum;
    });

  const totalContractValue = filteredContracts.reduce((sum, c) => sum + c.totalValue, 0);
  const totalMaterialCosts = filteredContracts.reduce((sum, c) => sum + calculateMaterialCost(c.costTracking.materials), 0);
  const totalLaborCosts = filteredContracts.reduce((sum, c) => sum + calculateLaborCost(c.costTracking.laborCost), 0);
  const totalMiscCosts = filteredContracts.reduce((sum, c) => sum + calculateMiscCost(c.costTracking.miscellaneous), 0);
  const totalCosts = totalMaterialCosts + totalLaborCosts + totalMiscCosts;
  const totalProfit = totalContractValue - totalCosts;
  const overallProfitMargin = totalContractValue > 0 ? (totalProfit / totalContractValue) * 100 : 0;

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
        if (yPosition > pageHeight - 35) {
          pdf.addPage();
          yPosition = 15;
        }

        const materialCost = calculateMaterialCost(contract.costTracking.materials);
        const laborCost = calculateLaborCost(contract.costTracking.laborCost);
        const miscCost = calculateMiscCost(contract.costTracking.miscellaneous);
        const totalCost = materialCost + laborCost + miscCost;
        const profit = calculateProfit(contract);
        const margin = calculateProfitMargin(contract);

        // Contract header
        pdf.setFont(undefined, "bold");
        pdf.setFontSize(10);
        pdf.text(`${idx + 1}. ${contract.id} - ${contract.projectName}`, margin, yPosition);
        yPosition += lineHeight;

        // Contract details with two-column layout
        pdf.setFont(undefined, "normal");
        pdf.setFontSize(9);

        const detailLines = [
          { label: "Client:", amount: contract.clientName },
          { label: "Status:", amount: contract.status.replace("-", " ") },
          { label: "Contract Value:", amount: `$${contract.totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}` },
          { label: "Material Costs:", amount: `$${materialCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}` },
          { label: "Labor Costs:", amount: `$${laborCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}` },
          { label: "Misc Costs:", amount: `$${miscCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}` },
          { label: "Total Costs:", amount: `$${totalCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}` },
          { label: "Profit:", amount: `$${profit.toLocaleString(undefined, { maximumFractionDigits: 2 })}` },
          { label: "Profit Margin:", amount: `${margin.toFixed(1)}%` },
        ];

        detailLines.forEach((line) => {
          pdf.text(line.label, margin + 5, yPosition, { maxWidth: 60 });
          pdf.text(line.amount, margin + 75, yPosition);
          yPosition += lineHeight - 1;
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Project Costs</h1>
          <p className="text-slate-600 mt-1">Track material, labor, and miscellaneous costs across all projects</p>
        </div>
        <Button
          onClick={printCostReport}
          className="gap-2 bg-slate-600 hover:bg-slate-700"
          disabled={filteredContracts.length === 0}
        >
          <Printer className="w-4 h-4" />
          Print
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Total Contract Value</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">${totalContractValue.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Total Material Costs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">${totalMaterialCosts.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Total Labor Costs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-purple-600">${totalLaborCosts.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Total Misc Costs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-600">${totalMiscCosts.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className={`border-slate-200 ${totalProfit >= 0 ? "bg-green-50" : "bg-red-50"}`}>
          <CardHeader>
            <CardTitle className="text-lg">Total Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className={`text-3xl font-bold ${totalProfit >= 0 ? "text-green-700" : "text-red-700"}`}>
                ${totalProfit.toLocaleString()}
              </p>
              <p className={`text-sm font-semibold ${totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                Margin: {overallProfitMargin.toFixed(1)}%
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {contracts.length > 0 && (
        <Card className="border-slate-200">
          <div className="border-b border-slate-200 px-6 py-4">
            <div className="flex gap-2 flex-wrap items-center">
              <Button
                onClick={() => setFilterStatus("all")}
                variant={filterStatus === "all" ? "default" : "outline"}
                className={filterStatus === "all" ? "bg-blue-600 hover:bg-blue-700" : "border-slate-300"}
              >
                All ({contracts.length})
              </Button>
              <Button
                onClick={() => setFilterStatus("pending")}
                variant={filterStatus === "pending" ? "default" : "outline"}
                className={filterStatus === "pending" ? "bg-yellow-600 hover:bg-yellow-700" : "border-slate-300"}
              >
                Pending ({contracts.filter(c => c.status === "pending").length})
              </Button>
              <Button
                onClick={() => setFilterStatus("in-progress")}
                variant={filterStatus === "in-progress" ? "default" : "outline"}
                className={filterStatus === "in-progress" ? "bg-blue-600 hover:bg-blue-700" : "border-slate-300"}
              >
                In Progress ({contracts.filter(c => c.status === "in-progress").length})
              </Button>
              <Button
                onClick={() => setFilterStatus("completed")}
                variant={filterStatus === "completed" ? "default" : "outline"}
                className={filterStatus === "completed" ? "bg-green-600 hover:bg-green-700" : "border-slate-300"}
              >
                Completed ({contracts.filter(c => c.status === "completed").length})
              </Button>
              <div className="border-l border-slate-200 mx-2 h-6"></div>
              <Input
                type="date"
                placeholder="From"
                value={filterFromDate}
                onChange={(e) => setFilterFromDate(e.target.value)}
                className="border-slate-300 w-36"
              />
              <Input
                type="date"
                placeholder="To"
                value={filterToDate}
                onChange={(e) => setFilterToDate(e.target.value)}
                className="border-slate-300 w-36"
              />
              {(filterFromDate || filterToDate) && (
                <Button
                  onClick={() => {
                    setFilterFromDate("");
                    setFilterToDate("");
                  }}
                  variant="outline"
                  className="border-slate-300"
                >
                  Clear Dates
                </Button>
              )}
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
            <div className="overflow-x-auto">
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
                    const materialCost = calculateMaterialCost(contract.costTracking.materials);
                    const laborCost = calculateLaborCost(contract.costTracking.laborCost);
                    const miscCost = calculateMiscCost(contract.costTracking.miscellaneous);
                    const totalCost = materialCost + laborCost + miscCost;
                    const profit = calculateProfit(contract);
                    const margin = calculateProfitMargin(contract);

                    return (
                      <tr key={contract.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                        <td className="p-3 text-slate-700 font-semibold">{contract.id}</td>
                        <td className="p-3 text-slate-700">{contract.projectName}</td>
                        <td className="p-3 text-slate-700 text-xs">{contract.clientName}</td>
                        <td className="p-3 whitespace-nowrap">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusColor(contract.status)}`}>
                            {contract.status.replace("-", " ")}
                          </span>
                        </td>
                        <td className="p-3 text-right text-slate-700 font-semibold whitespace-nowrap">
                          ${contract.totalValue.toLocaleString()}
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
