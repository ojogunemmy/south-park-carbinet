import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Printer, Trash2, Loader2, FileIcon } from "lucide-react";
import { useState } from "react";
import { contractsService, billsService, type Contract, type Bill } from "@/lib/supabase-service";
import { useQuery } from "@tanstack/react-query";
import { useSupabaseAuth } from "@/contexts/SupabaseAuthContext";
import jsPDF from "jspdf";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Costs() {
  const { user } = useSupabaseAuth();
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterFromDate, setFilterFromDate] = useState<string>("");
  const [filterToDate, setFilterToDate] = useState<string>("");

  // Fetch Contracts
  const { data: contracts = [], isLoading: loadingContracts } = useQuery<Contract[]>({
    queryKey: ['contracts'],
    queryFn: contractsService.getAll,
    enabled: !!user,
  });

  // Fetch Bills
  const { data: bills = [], isLoading: loadingBills } = useQuery<Bill[]>({
    queryKey: ['bills'],
    queryFn: billsService.getAll,
    enabled: !!user,
  });

  const calculateMaterialCost = (contractId: string) => {
    return bills
      .filter(b => b.contract_id === contractId && b.category === 'materials')
      .reduce((sum, b) => sum + (b.amount || 0), 0);
  };

  const calculateLaborCost = (contract: Contract) => {
    return (contract.labor_cost || 0);
  };

  const calculateMiscCost = (contract: Contract) => {
    // Sum of bills with category 'other' OR 'permits'
    const extraBills = bills
      .filter(b => b.contract_id === contract.id && (b.category === 'other' || b.category === 'permits'))
      .reduce((sum, b) => sum + (b.amount || 0), 0);
    
    return (contract.misc_cost || 0) + extraBills;
  };

  const calculateProfit = (contract: Contract) => {
    const materialCost = calculateMaterialCost(contract.id);
    const laborCost = calculateLaborCost(contract);
    const miscCost = calculateMiscCost(contract);
    const totalCosts = materialCost + laborCost + miscCost;
    return (contract.total_value || 0) - totalCosts;
  };

  const calculateProfitMargin = (contract: Contract) => {
    const profit = calculateProfit(contract);
    return contract.total_value > 0 ? (profit / contract.total_value) * 100 : 0;
  };

  const filteredContracts = contracts
    .filter((contract) => {
      const statusMatch = filterStatus === "all" || contract.status === filterStatus;

      let dateMatch = true;
      if (filterFromDate || filterToDate) {
        if (!contract.due_date) return false;
        const dueDate = new Date(contract.due_date);

        if (filterFromDate) {
           if (dueDate < new Date(filterFromDate)) dateMatch = false;
        }
        if (filterToDate) {
           if (dueDate > new Date(filterToDate)) dateMatch = false;
        }
      }

      return statusMatch && dateMatch;
    });

  const totalContractValue = filteredContracts.reduce((sum, c) => sum + (c.total_value || 0), 0);
  const totalMaterialCosts = filteredContracts.reduce((sum, c) => sum + calculateMaterialCost(c.id), 0);
  const totalLaborCosts = filteredContracts.reduce((sum, c) => sum + calculateLaborCost(c), 0);
  const totalMiscCosts = filteredContracts.reduce((sum, c) => sum + calculateMiscCost(c), 0);
  const totalCosts = totalMaterialCosts + totalLaborCosts + totalMiscCosts;
  const totalProfit = totalContractValue - totalCosts;
  const overallProfitMargin = totalContractValue > 0 ? (totalProfit / totalContractValue) * 100 : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in_progress":
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
      pdf.setFont("helvetica", "bold");
      pdf.text("PROJECT COSTS REPORT", margin, yPosition);
      yPosition += 10;

      // Generated date
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, margin, yPosition);
      yPosition += 8;

      // Summary section
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.text("SUMMARY", margin, yPosition);
      yPosition += lineHeight;

      pdf.setFont("helvetica", "normal");
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
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.text("CONTRACT BREAKDOWN", margin, yPosition);
      yPosition += lineHeight;

      // Each contract as a separate section
      filteredContracts.forEach((contract, idx) => {
        if (yPosition > pageHeight - 35) {
          pdf.addPage();
          yPosition = 15;
        }

        const materialCost = calculateMaterialCost(contract.id);
        const laborCost = calculateLaborCost(contract);
        const miscCost = calculateMiscCost(contract);
        const totalCost = materialCost + laborCost + miscCost;
        const profit = calculateProfit(contract);
        const margin = calculateProfitMargin(contract);

        // Contract header
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10);
        pdf.text(`${idx + 1}. ${contract.id} - ${contract.project_name}`, margin, yPosition);
        yPosition += lineHeight;

        // Contract details with two-column layout
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);

        const detailLines = [
          { label: "Client:", amount: contract.client_name || "N/A" },
          { label: "Status:", amount: contract.status.replace("_", " ") },
          { label: "Contract Value:", amount: `$${(contract.total_value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}` },
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

  if (loadingContracts || loadingBills) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Project Costs</h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">Track material, labor, and miscellaneous costs across all projects</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={printCostReport}
            className="gap-2 bg-slate-600 hover:bg-slate-700 w-full sm:w-auto justify-center"
            disabled={filteredContracts.length === 0}
          >
            <Printer className="w-4 h-4" />
            Print
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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

      <Card className="border-slate-200">
         <div className="border-b border-slate-200 px-4 py-4">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
            <div className="flex flex-wrap gap-2 w-full lg:w-auto">
              <Button
                onClick={() => setFilterStatus("all")}
                variant={filterStatus === "all" ? "default" : "outline"}
                size="sm"
                className={filterStatus === "all" ? "bg-blue-600 hover:bg-blue-700" : "border-slate-300"}
              >
                All ({contracts.length})
              </Button>
              <Button
                onClick={() => setFilterStatus("pending")}
                variant={filterStatus === "pending" ? "default" : "outline"}
                size="sm"
                className={filterStatus === "pending" ? "bg-yellow-600 hover:bg-yellow-700" : "border-slate-300"}
              >
                Pending ({contracts.filter(c => c.status === "pending").length})
              </Button>
              <Button
                onClick={() => setFilterStatus("in_progress")}
                variant={filterStatus === "in_progress" ? "default" : "outline"}
                size="sm"
                className={filterStatus === "in_progress" ? "bg-blue-600 hover:bg-blue-700" : "border-slate-300"}
              >
                In Progress ({contracts.filter(c => c.status === "in_progress").length})
              </Button>
              <Button
                onClick={() => setFilterStatus("completed")}
                variant={filterStatus === "completed" ? "default" : "outline"}
                size="sm"
                className={filterStatus === "completed" ? "bg-green-600 hover:bg-green-700" : "border-slate-300"}
              >
                Completed ({contracts.filter(c => c.status === "completed").length})
              </Button>
            </div>

             <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
               <div className="flex items-center gap-2">
                 <Label className="text-xs text-slate-500 mr-1">From:</Label>
                 <Input
                   type="date"
                   value={filterFromDate}
                   onChange={(e) => setFilterFromDate(e.target.value)}
                   className="border-slate-300 w-full sm:w-36"
                 />
               </div>
               <div className="flex items-center gap-2">
                 <Label className="text-xs text-slate-500 mr-1">To:</Label>
                 <Input
                   type="date"
                   value={filterToDate}
                   onChange={(e) => setFilterToDate(e.target.value)}
                   className="border-slate-300 w-full sm:w-36"
                 />
                 {(filterFromDate || filterToDate) && (
                   <Button
                     onClick={() => {
                       setFilterFromDate("");
                       setFilterToDate("");
                     }}
                     variant="outline"
                     size="icon"
                     className="border-slate-300 shrink-0"
                   >
                     <Trash2 className="w-4 h-4" />
                   </Button>
                 )}
               </div>
             </div>
          </div>
        </div>
      </Card>

      {filteredContracts.length > 0 ? (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Cost Breakdown by Contract</CardTitle>
            <CardDescription>Material, labor, and miscellaneous costs for each project</CardDescription>
          </CardHeader>
          <CardContent>
           <div className="space-y-4 md:hidden">
             {filteredContracts.map(contract => {
                const materialCost = calculateMaterialCost(contract.id);
                const laborCost = calculateLaborCost(contract);
                const miscCost = calculateMiscCost(contract);
                const totalCost = materialCost + laborCost + miscCost;
                const profit = calculateProfit(contract);
                const margin = calculateProfitMargin(contract);

                return (
                  <Card key={contract.id} className="border-slate-200 shadow-sm">
                    <CardHeader className="p-4 pb-2">
                       <div className="flex justify-between items-start">
                         <div>
                           <CardTitle className="text-sm font-bold text-slate-900">{contract.project_name}</CardTitle>
                           <CardDescription className="text-xs">{contract.client_name} (#{contract.id})</CardDescription>
                         </div>
                         <span className={`px-2 py-1 rounded text-xs font-medium shrink-0 ${getStatusColor(contract.status)}`}>
                            {contract.status.replace("_", " ")}
                         </span>
                       </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-2 space-y-3">
                       <div className="grid grid-cols-2 gap-2 text-sm border-b border-slate-100 pb-2">
                          <div className="text-slate-500">Contract Value:</div>
                          <div className="font-semibold text-slate-900 text-right">${(contract.total_value || 0).toLocaleString()}</div>
                          
                          <div className="text-slate-500">Total Costs:</div>
                          <div className="font-semibold text-slate-700 text-right">${totalCost.toLocaleString()}</div>
                       </div>
                       
                       <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="text-slate-500">Materials:</div>
                          <div className="text-blue-600 text-right">${materialCost.toLocaleString()}</div>
                          
                          <div className="text-slate-500">Labor:</div>
                          <div className="text-purple-600 text-right">${laborCost.toLocaleString()}</div>
                          
                          <div className="text-slate-500">Misc:</div>
                          <div className="text-orange-600 text-right">${miscCost.toLocaleString()}</div>
                       </div>

                       <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                          <span className="text-sm font-semibold">Profit</span>
                          <div className="text-right">
                             <div className={`font-bold ${profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                               ${profit.toLocaleString()}
                             </div>
                             <div className={`text-xs ${margin >= 0 ? "text-green-600" : "text-red-600"}`}>
                               Margin: {margin.toFixed(1)}%
                             </div>
                          </div>
                       </div>
                    </CardContent>
                  </Card>
                );
             })}
           </div>

           <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="text-left p-3 font-semibold text-slate-900">Contract ID</th>
                    <th className="text-left p-3 font-semibold text-slate-900">Project</th>
                    <th className="text-left p-3 font-semibold text-slate-900">Client</th>
                    <th className="text-left p-3 font-semibold text-slate-900 whitespace-nowrap">Status</th>
                    <th className="text-right p-3 font-semibold text-slate-900">Value</th>
                    <th className="text-right p-3 font-semibold text-slate-900">Materials</th>
                    <th className="text-right p-3 font-semibold text-slate-900">Labor</th>
                    <th className="text-right p-3 font-semibold text-slate-900">Misc</th>
                    <th className="text-right p-3 font-semibold text-slate-900">Total Costs</th>
                    <th className="text-right p-3 font-semibold text-slate-900">Profit</th>
                    <th className="text-right p-3 font-semibold text-slate-900">Margin %</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContracts.map((contract, idx) => {
                    const materialCost = calculateMaterialCost(contract.id);
                    const laborCost = calculateLaborCost(contract);
                    const miscCost = calculateMiscCost(contract);
                    const totalCost = materialCost + laborCost + miscCost;
                    const profit = calculateProfit(contract);
                    const margin = calculateProfitMargin(contract);

                    return (
                      <tr key={contract.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                        <td className="p-3 text-slate-700 font-semibold">{contract.id}</td>
                        <td className="p-3 text-slate-700">{contract.project_name}</td>
                        <td className="p-3 text-slate-700 text-xs">{contract.client_name}</td>
                        <td className="p-3 whitespace-nowrap">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusColor(contract.status)}`}>
                            {contract.status.replace("_", " ")}
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
