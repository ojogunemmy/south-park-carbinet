import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, FileText, Receipt, TrendingUp, DollarSign, Printer, Loader2 } from "lucide-react";
import { useMemo } from "react";
import { useYear } from "@/contexts/YearContext";
import { useSupabaseAuth } from "@/contexts/SupabaseAuthContext";
import { employeesService, contractsService, billsService, paymentsService } from "@/lib/supabase-service";
import { useQuery } from "@tanstack/react-query";
import jsPDF from "jspdf";
import { format } from "date-fns";

export default function Index() {
  const { selectedYear } = useYear();
  const { user, role, loading: authLoading } = useSupabaseAuth();

  // Fetch Data using React Query
  const { data: employees = [], isLoading: isLoadingEmployees } = useQuery({
    queryKey: ['employees'],
    queryFn: employeesService.getAll,
    enabled: !!user,
  });

  const { data: contracts = [], isLoading: isLoadingContracts } = useQuery({
    queryKey: ['contracts'],
    queryFn: contractsService.getAll,
    enabled: !!user && role === 'admin',
  });

  const { data: bills = [], isLoading: isLoadingBills } = useQuery({
    queryKey: ['bills'],
    queryFn: billsService.getAll,
    enabled: !!user && role === 'admin',
  });

  const { data: payments = [], isLoading: isLoadingPayments } = useQuery({
    queryKey: ['payments'],
    queryFn: paymentsService.getAll,
    enabled: !!user,
  });

  // Calculate Dashboard Stats
  const dashboardStats = useMemo(() => {
    // Filter by selected year if applicable
    // Note: In a real app, we might want to filter on the server side
    // For now, we filter client side to match previous logic
    const currentYear = selectedYear.toString();

    // Stats
    const totalEmployees = employees.filter(e => e.status === 'active').length;
    
    // Contracts logic
    const activeContracts = contracts.filter(c => c.status === 'in_progress' || c.status === 'pending');
    const totalContractValue = contracts.reduce((sum, c) => sum + (c.total_value || 0), 0);
    
    // Bills logic
    const pendingBills = bills.filter(b => b.status === 'pending');
    const totalBillsAmount = bills.reduce((sum, b) => sum + (b.amount || 0), 0);
    const pendingBillsAmount = pendingBills.reduce((sum, b) => sum + (b.amount || 0), 0);

    // Costs & Profit (Simplified for now based on available data)
    // Real profit calculation would need thorough material cost linking
    const totalLaborCost = contracts.reduce((sum, c) => sum + (c.labor_cost || 0), 0);
    const totalMiscCost = contracts.reduce((sum, c) => sum + (c.misc_cost || 0), 0);
    const totalCosts = totalBillsAmount + totalLaborCost + totalMiscCost; // Rough estimate
    
    const totalProfit = totalContractValue - totalCosts;
    const profitMargin = totalContractValue > 0 ? (totalProfit / totalContractValue) * 100 : 0;

    // Payroll Monthly Breakdown
    const monthlyPayroll: { [key: string]: number } = {};
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    
    monthNames.forEach((_, index) => {
      monthlyPayroll[`${index + 1}`] = 0;
    });

    const yearlyPayments = payments.filter(p => {
      if (!p.paid_date) return false;
      return p.paid_date.startsWith(currentYear);
    });

    yearlyPayments.forEach(p => {
      if (p.status === 'paid' && p.paid_date) {
        const month = new Date(p.paid_date).getMonth() + 1;
        monthlyPayroll[`${month}`] += (p.amount || 0);
      }
    });

    const totalPayroll = Object.values(monthlyPayroll).reduce((sum, val) => sum + val, 0);
    const totalWeeklyPayments = employees
      .filter(e => e.status === 'active')
      .reduce((sum, e) => sum + (e.weekly_rate || 0), 0);

    return {
      totalEmployees,
      totalWeeklyPayments,
      totalContracts: activeContracts.length,
      totalContractValue,
      totalBills: pendingBills.length,
      pendingBills: pendingBillsAmount,
      totalCosts,
      totalProfit,
      profitMargin,
      monthlyPayroll,
      totalPayroll
    };
  }, [employees, contracts, bills, payments, selectedYear]);

  const printDashboard = () => {
    try {
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 15;
      const margin = 15;

      // Title
      pdf.setFontSize(16);
      pdf.setFont(undefined, "bold");
      pdf.text("CABINET BUSINESS MANAGEMENT DASHBOARD", margin, yPosition);
      yPosition += 8;

      // Generated date
      pdf.setFontSize(9);
      pdf.setFont(undefined, "normal");
      pdf.text(`Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, margin, yPosition);
      yPosition += 10;

      // Summary metrics section
      pdf.setFontSize(12);
      pdf.setFont(undefined, "bold");
      pdf.text("SUMMARY METRICS", margin, yPosition);
      yPosition += 8;

      // Metrics grid
      pdf.setFont(undefined, "normal");
      pdf.setFontSize(10);
      const metricsData = [
        ["Total Employees", `${dashboardStats.totalEmployees}`, "Active employees"],
        ["Active Contracts", `${dashboardStats.totalContracts}`, `$${dashboardStats.totalContractValue.toLocaleString()}`],
        ["Outstanding Bills", `${dashboardStats.totalBills}`, `$${dashboardStats.pendingBills.toLocaleString()}`],
        ["Total Costs", `$${dashboardStats.totalCosts.toLocaleString()}`, "Materials & misc"],
        ["Total Profit", `$${dashboardStats.totalProfit.toLocaleString()}`, `${dashboardStats.profitMargin.toFixed(1)}% margin`],
      ];

      const metricsColWidth = (pageWidth - 2 * margin) / 2;

      metricsData.forEach((metric, idx) => {
        if (yPosition > pageHeight - 40) {
          pdf.addPage();
          yPosition = 15;
        }

        pdf.setFont(undefined, "bold");
        pdf.text(metric[0], margin, yPosition);
        pdf.setFont(undefined, "normal");
        pdf.text(metric[1], margin + metricsColWidth, yPosition);
        yPosition += 5;
        pdf.setFontSize(8);
        pdf.text(metric[2], margin, yPosition);
        yPosition += 7;
        pdf.setFontSize(10);
      });

      pdf.save("Dashboard-Report.pdf");
    } catch (error) {
      console.error("Error generating dashboard report:", error);
      alert("Error generating report");
    }
  };

  const isLoading = authLoading || isLoadingEmployees || isLoadingContracts || isLoadingBills || isLoadingPayments;

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // ==========================================
  // EMPLOYEE VIEW (Restricted)
  // ==========================================
  if (role === 'employee') {
    return (
      <div className="space-y-8">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-8 text-white">
          <h1 className="text-4xl font-bold mb-2">Welcome, {user?.email}</h1>
          <p className="text-blue-100">
            Employee Dashboard
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle>My Assignments</CardTitle>
              <CardDescription>Current project assignments</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-slate-500 text-sm">No active assignments found.</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle>Announcements</CardTitle>
              <CardDescription>Latest company news</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-slate-500 text-sm">No new announcements.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ==========================================
  // ADMIN / MANAGER VIEW (Full Access)
  // ==========================================
  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-8 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold mb-2">Welcome to Cabinet Business Management</h1>
            <p className="text-blue-100">
              Manage your cabinet business with ease. Track employees, contracts, and expenses all in one place.
            </p>
          </div>
          <Button
            onClick={printDashboard}
            className="gap-2 bg-white text-blue-600 hover:bg-blue-50 h-fit"
          >
            <Printer className="w-4 h-4" />
            Print
          </Button>
        </div>
        
        {/* Quick Links */}
        <div className="flex flex-wrap gap-4 mt-6">
          <Link to="/employees">
            <Button className="bg-white text-blue-600 hover:bg-blue-50">View Employees</Button>
          </Link>
          <Link to="/contracts">
            <Button className="bg-white text-blue-600 hover:bg-blue-50">View Contracts</Button>
          </Link>
          <Link to="/bills">
            <Button className="bg-white text-blue-600 hover:bg-blue-50">View Bills</Button>
          </Link>
          {role === 'admin' && (
            <Link to="/costs">
              <Button className="bg-white text-blue-600 hover:bg-blue-50">View Costs</Button>
            </Link>
          )}
        </div>
      </div>

      {/* Quick Stats Rows */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Employees */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span>Total Employees</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-slate-900 whitespace-nowrap">{dashboardStats.totalEmployees}</p>
              <p className="text-xs text-slate-500">Active employees</p>
            </div>
          </CardContent>
        </Card>

        {/* Contracts */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <FileText className="w-4 h-4 text-green-600 flex-shrink-0" />
              <span>Active Contracts</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-slate-900 whitespace-nowrap">{dashboardStats.totalContracts}</p>
              <p className="text-xs text-slate-500 whitespace-nowrap">Value: ${dashboardStats.totalContractValue.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>

        {/* Bills */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-orange-600 flex-shrink-0" />
              <span>Outstanding Bills</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-slate-900 whitespace-nowrap">{dashboardStats.totalBills}</p>
              <p className="text-xs text-slate-500 whitespace-nowrap">Amount: ${dashboardStats.pendingBills.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>

        {/* Costs */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>Total Costs</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-slate-900 whitespace-nowrap">${dashboardStats.totalCosts.toLocaleString()}</p>
              <p className="text-xs text-slate-500">Estimated costs</p>
            </div>
          </CardContent>
        </Card>

        {/* Profit */}
        <Card className={`border-slate-200 ${dashboardStats.totalProfit >= 0 ? "bg-green-50" : "bg-red-50"}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <TrendingUp className={`w-4 h-4 ${dashboardStats.totalProfit >= 0 ? "text-green-600" : "text-red-600"} flex-shrink-0`} />
              <span>Profit</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className={`text-3xl font-bold whitespace-nowrap ${dashboardStats.totalProfit >= 0 ? "text-green-700" : "text-red-700"}`}>
                ${dashboardStats.totalProfit.toLocaleString()}
              </p>
              <p className={`text-xs whitespace-nowrap ${dashboardStats.totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                Margin: {dashboardStats.profitMargin.toFixed(1)}%
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payroll History Section */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            {selectedYear} Payroll History
          </CardTitle>
          <CardDescription>Monthly payment summary and annual total</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <p className="text-sm font-medium text-green-700">Total Paid YTD</p>
              <p className="text-3xl font-bold text-green-900 mt-2">${dashboardStats.totalPayroll.toLocaleString()}</p>
              <p className="text-xs text-green-600 mt-1">Completed payments</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="text-sm font-medium text-blue-700">Weekly Obligation</p>
              <p className="text-3xl font-bold text-blue-900 mt-2">${dashboardStats.totalWeeklyPayments.toLocaleString()}</p>
              <p className="text-xs text-blue-600 mt-1">Active employees</p>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-900">Monthly Breakdown</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-2">
              {Object.entries(dashboardStats.monthlyPayroll).map(([monthIdx, amount]) => {
                const monthName = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][parseInt(monthIdx) - 1];
                const maxAmount = Math.max(...Object.values(dashboardStats.monthlyPayroll), 1);
                const percentage = (amount / maxAmount) * 100;

                return (
                  <div key={monthIdx} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-slate-700">{monthName}</span>
                      <span className={`font-semibold ${amount > 0 ? "text-green-700" : "text-slate-500"}`}>
                        ${amount.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-green-400 to-green-600 h-full transition-all duration-300"
                        style={{ width: `${Math.max(percentage, 2)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Feature Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Employees */}
        <Card className="border-slate-200 hover:shadow-lg transition-shadow bg-white flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <CardTitle>Employees</CardTitle>
                <CardDescription>Manage your team</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-end">
             <Link to="/employees">
              <Button className="w-full bg-blue-600 hover:bg-blue-700">Manage Employees</Button>
            </Link>
          </CardContent>
        </Card>

        {/* Contracts */}
        <Card className="border-slate-200 hover:shadow-lg transition-shadow bg-white flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <CardTitle>Contracts</CardTitle>
                <CardDescription>Track agreements</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-end">
             <Link to="/contracts">
              <Button className="w-full bg-green-600 hover:bg-green-700">View Contracts</Button>
            </Link>
          </CardContent>
        </Card>

        {/* Bills */}
        <Card className="border-slate-200 hover:shadow-lg transition-shadow bg-white flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Receipt className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <CardTitle>Bills</CardTitle>
                <CardDescription>Manage expenses</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-end">
             <Link to="/bills">
              <Button className="w-full bg-orange-600 hover:bg-orange-700">Manage Bills</Button>
            </Link>
          </CardContent>
        </Card>

        {/* Costs */}
        <Card className="border-slate-200 hover:shadow-lg transition-shadow bg-white flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <CardTitle>Project Costs</CardTitle>
                <CardDescription>Track costs</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-end">
             <Link to="/costs">
              <Button className="w-full bg-red-600 hover:bg-red-700">View Costs</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
