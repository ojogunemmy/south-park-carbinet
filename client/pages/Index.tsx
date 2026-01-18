import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, FileText, Receipt, TrendingUp, AlertCircle, DollarSign, Printer, Plus, Trash2, Edit2, Eye, EyeOff } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { useYear } from "@/contexts/YearContext";
import { useAuth, type StoredUser, type UserRole } from "@/contexts/AuthContext";
import { getYearData } from "@/utils/yearStorage";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import jsPDF from "jspdf";

export default function Index() {
  const { selectedYear } = useYear();
  const { users: contextUsers, updateUsers: updateContextUsers } = useAuth();
  const [users, setUsers] = useState<StoredUser[]>([]);

  // Sync users from context on mount and when context changes
  useEffect(() => {
    setUsers(contextUsers);
  }, [contextUsers]);

  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<UserRole>("worker");
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editRole, setEditRole] = useState<UserRole>("worker");
  const [showNewUserPassword, setShowNewUserPassword] = useState(false);
  const [showEditUserPassword, setShowEditUserPassword] = useState(false);

  const handleAddUser = () => {
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) {
      alert("Please fill in all fields");
      return;
    }

    const newUser: StoredUser = {
      id: `USR-${String(users.length + 1).padStart(3, "0")}`,
      name: newUserName,
      email: newUserEmail,
      password: newUserPassword,
      role: newUserRole,
    };

    const updatedUsers = [...users, newUser];
    updateContextUsers(updatedUsers);
    setNewUserName("");
    setNewUserEmail("");
    setNewUserPassword("");
    setNewUserRole("worker");
    setShowNewUserPassword(false);
    setIsAddUserOpen(false);
  };

  const handleDeleteUser = (userId: string) => {
    const updatedUsers = users.filter(u => u.id !== userId);
    updateContextUsers(updatedUsers);
  };

  const handleEditUser = (user: User) => {
    setEditingUserId(user.id);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditPassword(user.password);
    setEditRole(user.role);
    setIsEditUserOpen(true);
  };

  const handleSaveEditUser = () => {
    if (!editName.trim() || !editEmail.trim() || !editPassword.trim()) {
      alert("Please fill in all fields");
      return;
    }

    const updatedUsers = users.map(u =>
      u.id === editingUserId
        ? { ...u, name: editName, email: editEmail, password: editPassword, role: editRole }
        : u
    );
    updateContextUsers(updatedUsers);

    setEditingUserId(null);
    setEditName("");
    setEditEmail("");
    setEditPassword("");
    setEditRole("worker");
    setShowEditUserPassword(false);
    setIsEditUserOpen(false);
  };

  const dashboardStats = useMemo(() => {
    // Load real data from year-based storage
    const employees = getYearData<any[]>("employees", selectedYear, []);
    const contracts = getYearData<any[]>("contracts", selectedYear, []);
    const allBills = getYearData<any[]>("allBills", selectedYear, []);
    const contractExpenseBills = getYearData<any[]>("contractExpenseBills", selectedYear, []);
    const bills = [...allBills, ...contractExpenseBills.filter((cb: any) => !allBills.some((b: any) => b.id === cb.id))];
    const payments = getYearData<any[]>("payments", selectedYear, []);

    // Calculate costs from contracts
    let totalMaterialCosts = 0;
    let totalMiscCosts = 0;
    contracts.forEach((contract: any) => {
      if (contract.costTracking) {
        const materialCost = contract.costTracking.materials?.reduce((sum: number, m: any) => sum + (m.unitPrice * m.quantity), 0) || 0;
        const miscCost = contract.costTracking.miscellaneous?.reduce((sum: number, m: any) => sum + m.amount, 0) || 0;
        totalMaterialCosts += materialCost;
        totalMiscCosts += miscCost;
      }
    });

    const totalContractValue = contracts.reduce((sum: number, c: any) => sum + (c.totalValue || 0), 0);
    const totalCosts = totalMaterialCosts + totalMiscCosts;
    const totalProfit = totalContractValue - totalCosts;
    const profitMargin = totalContractValue > 0 ? (totalProfit / totalContractValue) * 100 : 0;

    const totalBillsAmount = bills.reduce((sum: number, b: any) => sum + (b.amount || 0), 0);
    const pendingBills = bills.filter((b: any) => b.status !== "paid").reduce((sum: number, b: any) => sum + (b.amount || 0), 0);

    // Calculate month-by-month payroll data
    const monthlyPayroll: { [key: string]: number } = {};
    const monthNames = ["January", "February", "March", "April", "May", "June",
                        "July", "August", "September", "October", "November", "December"];

    // Initialize all months to 0
    monthNames.forEach((_, index) => {
      monthlyPayroll[`${index + 1}`] = 0;
    });

    // Sum paid payments by month
    payments.forEach((payment: any) => {
      if (payment.status === "paid" && payment.paidDate) {
        const month = new Date(payment.paidDate).getMonth() + 1;
        monthlyPayroll[`${month}`] = (monthlyPayroll[`${month}`] || 0) + (payment.amount || 0);
      }
    });

    const totalPayroll = Object.values(monthlyPayroll).reduce((sum: number, val: any) => sum + val, 0);

    return {
      totalEmployees: employees.length,
      totalWeeklyPayments: employees.reduce((sum: number, e: any) => sum + (e.weeklyRate || 0), 0),
      totalContracts: contracts.length,
      totalContractValue,
      totalMaterialCosts,
      totalMiscCosts,
      totalCosts,
      totalProfit,
      profitMargin,
      totalBills: bills.length,
      pendingBills,
      revenue: totalContractValue,
      monthlyPayroll,
      totalPayroll,
    };
  }, [selectedYear]);

  const printDashboard = () => {
    try {
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 15;
      const margin = 15;
      const lineHeight = 5;

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

      yPosition += 5;

      // Platform features section
      pdf.setFont(undefined, "bold");
      pdf.setFontSize(12);
      pdf.text("PLATFORM FEATURES", margin, yPosition);
      yPosition += 8;

      pdf.setFont(undefined, "normal");
      pdf.setFontSize(9);
      const features = [
        "✓ Persistent Database - All data synced to Supabase",
        "✓ Smart Notifications - Overdue payment alerts",
        "✓ Auto-generation - Numbers for employees, contracts, bills",
        "✓ Export & Print - PDF export across all sections",
        "✓ Tax Reporting - IRS tax reporting ready",
        "✓ Responsive Design - Works on all devices",
      ];

      features.forEach((feature) => {
        if (yPosition > pageHeight - 15) {
          pdf.addPage();
          yPosition = 15;
        }
        pdf.text(feature, margin, yPosition);
        yPosition += 5;
      });

      pdf.save("Dashboard-Report.pdf");
    } catch (error) {
      console.error("Error generating dashboard report:", error);
      alert(`Error generating report: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

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
        <div className="flex flex-wrap gap-4 mt-6">
          <Link to="/employees">
            <Button className="bg-white text-blue-600 hover:bg-blue-50">
              View Employees
            </Button>
          </Link>
          <Link to="/contracts">
            <Button className="bg-white text-blue-600 hover:bg-blue-50">
              View Contracts
            </Button>
          </Link>
          <Link to="/bills">
            <Button className="bg-white text-blue-600 hover:bg-blue-50">
              View Bills
            </Button>
          </Link>
          <Link to="/costs">
            <Button className="bg-white text-blue-600 hover:bg-blue-50">
              View Costs
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
              <p className="text-xs text-slate-500">Materials & misc</p>
            </div>
          </CardContent>
        </Card>

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
      {selectedYear === 2026 && (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              2026 Payroll History
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
                <p className="text-xs text-blue-600 mt-1">All employees</p>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-900">Monthly Breakdown</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-2">
                {["January", "February", "March", "April", "May", "June",
                  "July", "August", "September", "October", "November", "December"].map((month, index) => {
                  const monthNumber = index + 1;
                  const amount = dashboardStats.monthlyPayroll[`${monthNumber}`] || 0;
                  const maxAmount = Math.max(...Object.values(dashboardStats.monthlyPayroll as any), 74000); // Estimate ~$18.5k x 4 weeks
                  const percentage = maxAmount > 0 ? (amount / maxAmount) * 100 : 0;

                  return (
                    <div key={month} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-medium text-slate-700">{month}</span>
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

            <Link to="/payments" className="block pt-2">
              <Button className="w-full bg-green-600 hover:bg-green-700">
                View Payment Details
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Main Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 auto-rows-fr">
        {/* Employees Section */}
        <Card className="border-slate-200 hover:shadow-lg transition-shadow flex flex-col">
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
          <CardContent className="flex-1 flex flex-col">
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Track employee information, manage weekly payments, and handle payroll with automatic employee number generation.
              </p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                  Automatic employee numbering
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                  Weekly payment generation
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                  PDF export & print
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                  IRS tax reporting
                </li>
              </ul>
            </div>
            <Link to="/employees" className="block mt-auto pt-4">
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                Manage Employees
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Contracts Section */}
        <Card className="border-slate-200 hover:shadow-lg transition-shadow flex flex-col">
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
          <CardContent className="flex-1 flex flex-col">
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Handle client contracts with deposit tracking, payment schedules, and comprehensive project details.
              </p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                  Deposit management
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                  Payment schedules
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                  Project tracking
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                  Overdue notifications
                </li>
              </ul>
            </div>
            <Link to="/contracts" className="block mt-auto pt-4">
              <Button className="w-full bg-green-600 hover:bg-green-700">
                View Contracts
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Bills Section */}
        <Card className="border-slate-200 hover:shadow-lg transition-shadow flex flex-col">
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
          <CardContent className="flex-1 flex flex-col">
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Track company expenses and bills with automatic number generation organized by category.
              </p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-orange-600 rounded-full" />
                  Category-based numbering
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-orange-600 rounded-full" />
                  Expense tracking
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-orange-600 rounded-full" />
                  Print & PDF export
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-orange-600 rounded-full" />
                  Overdue alerts
                </li>
              </ul>
            </div>
            <Link to="/bills" className="block mt-auto pt-4">
              <Button className="w-full bg-orange-600 hover:bg-orange-700">
                Manage Bills
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Costs Section */}
        <Card className="border-slate-200 hover:shadow-lg transition-shadow flex flex-col">
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
          <CardContent className="flex-1 flex flex-col">
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Track material and miscellaneous costs across all projects with profit margin analysis.
              </p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-red-600 rounded-full" />
                  Material cost tracking
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-red-600 rounded-full" />
                  Miscellaneous expenses
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-red-600 rounded-full" />
                  Profit calculation
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-red-600 rounded-full" />
                  Margin analysis
                </li>
              </ul>
            </div>
            <Link to="/costs" className="block mt-auto pt-4">
              <Button className="w-full bg-red-600 hover:bg-red-700">
                View Costs
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* User Management Section */}
      <Card className="border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>User Management</CardTitle>
            <CardDescription>Manage team members and access control</CardDescription>
          </div>
          <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4" />
                Add New User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
                <DialogDescription>
                  Add a new team member to your cabinet business
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newUserName">Name</Label>
                  <Input
                    id="newUserName"
                    placeholder="Full name"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className="border-slate-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newUserEmail">Email/Username</Label>
                  <Input
                    id="newUserEmail"
                    placeholder="email@example.com"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="border-slate-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newUserPassword">Password</Label>
                  <div className="relative">
                    <Input
                      id="newUserPassword"
                      type={showNewUserPassword ? "text" : "password"}
                      placeholder="Password"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      className="border-slate-300 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewUserPassword(!showNewUserPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      title={showNewUserPassword ? "Hide password" : "Show password"}
                    >
                      {showNewUserPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newUserRole">Role</Label>
                  <Select value={newUserRole} onValueChange={(value) => setNewUserRole(value as UserRole)}>
                    <SelectTrigger className="border-slate-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="worker">Worker</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAddUser} className="w-full bg-blue-600 hover:bg-blue-700">
                  Add User
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit User</DialogTitle>
                <DialogDescription>
                  Update team member information
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="editUserName">Name</Label>
                  <Input
                    id="editUserName"
                    placeholder="Full name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="border-slate-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editUserEmail">Email/Username</Label>
                  <Input
                    id="editUserEmail"
                    placeholder="email@example.com"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="border-slate-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editUserPassword">Password</Label>
                  <div className="relative">
                    <Input
                      id="editUserPassword"
                      type={showEditUserPassword ? "text" : "password"}
                      placeholder="Password"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      className="border-slate-300 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditUserPassword(!showEditUserPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      title={showEditUserPassword ? "Hide password" : "Show password"}
                    >
                      {showEditUserPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editUserRole">Role</Label>
                  <Select value={editRole} onValueChange={(value) => setEditRole(value as UserRole)}>
                    <SelectTrigger className="border-slate-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="worker">Worker</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSaveEditUser} className="w-full bg-blue-600 hover:bg-blue-700">
                  Save Changes
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="text-left p-3 font-semibold text-slate-900">Name</th>
                  <th className="text-left p-3 font-semibold text-slate-900">Email/Username</th>
                  <th className="text-left p-3 font-semibold text-slate-900">Password</th>
                  <th className="text-left p-3 font-semibold text-slate-900">Role</th>
                  <th className="text-left p-3 font-semibold text-slate-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, idx) => (
                  <tr key={user.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="p-3 text-slate-700 font-medium">{user.name}</td>
                    <td className="p-3 text-slate-700">{user.email}</td>
                    <td className="p-3 text-slate-700 font-mono text-sm">••••••••</td>
                    <td className="p-3">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
                        user.role === "admin"
                          ? "bg-red-100 text-red-700"
                          : user.role === "manager"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-blue-100 text-blue-700"
                      }`}>
                        {user.role === "admin" ? "Admin" : user.role === "manager" ? "Manager" : "Worker"}
                      </span>
                    </td>
                    <td className="p-3 flex gap-2">
                      <button
                        onClick={() => handleEditUser(user)}
                        className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded transition-colors"
                        title="Edit user"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded transition-colors"
                        title="Delete user"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Features Section */}
      <Card className="border-slate-200 bg-slate-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
              ✓
            </span>
            Platform Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex gap-3">
              <div className="w-5 h-5 rounded-full bg-blue-600 flex-shrink-0 flex items-center justify-center text-white text-xs">
                ✓
              </div>
              <div>
                <p className="font-medium text-slate-900">Persistent Database</p>
                <p className="text-sm text-slate-600">All data synced to Supabase</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-5 h-5 rounded-full bg-blue-600 flex-shrink-0 flex items-center justify-center text-white text-xs">
                ✓
              </div>
              <div>
                <p className="font-medium text-slate-900">Smart Notifications</p>
                <p className="text-sm text-slate-600">Overdue payment alerts</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-5 h-5 rounded-full bg-blue-600 flex-shrink-0 flex items-center justify-center text-white text-xs">
                ✓
              </div>
              <div>
                <p className="font-medium text-slate-900">Auto-generation</p>
                <p className="text-sm text-slate-600">Numbers for employees, contracts, bills</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-5 h-5 rounded-full bg-blue-600 flex-shrink-0 flex items-center justify-center text-white text-xs">
                ✓
              </div>
              <div>
                <p className="font-medium text-slate-900">Export & Print</p>
                <p className="text-sm text-slate-600">PDF export across all sections</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-5 h-5 rounded-full bg-blue-600 flex-shrink-0 flex items-center justify-center text-white text-xs">
                ✓
              </div>
              <div>
                <p className="font-medium text-slate-900">Tax Reporting</p>
                <p className="text-sm text-slate-600">IRS tax reporting ready</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-5 h-5 rounded-full bg-blue-600 flex-shrink-0 flex items-center justify-center text-white text-xs">
                ✓
              </div>
              <div>
                <p className="font-medium text-slate-900">Responsive Design</p>
                <p className="text-sm text-slate-600">Works on all devices</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
