import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, FileText, Receipt, TrendingUp, AlertCircle, DollarSign, Printer, Plus, Trash2, Edit2, Eye, EyeOff, ChevronDown, ChevronRight } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { useYear } from "@/contexts/YearContext";
import { useSupabaseAuth } from "@/contexts/SupabaseAuthContext";
import { supabase } from "@/lib/supabase";
import { 
  employeesService,
  contractsService,
  billsService,
  paymentsService,
  profilesService,
  type Profile,
  type Employee,
  type Contract,
  type Bill,
  type Payment
} from "@/lib/supabase-service";

type UserRole = "admin" | "manager" | "worker" | "employee";

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
  const { profile: currentUser, signOut } = useSupabaseAuth();
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<string>("worker");
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editRole, setEditRole] = useState<string>("worker");
  const [showNewUserPassword, setShowNewUserPassword] = useState(false);
  const [showEditUserPassword, setShowEditUserPassword] = useState(false);
  const [isMonthlyBreakdownOpen, setIsMonthlyBreakdownOpen] = useState(false);

  // Fetch all data on mount or year change
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [empData, conData, billData, payData, profData] = await Promise.all([
          employeesService.getAll(),
          contractsService.getAll(),
          billsService.getAll(),
          paymentsService.getAll(),
          profilesService.getAll()
        ]);
        
        setEmployees(empData || []);
        setContracts(conData || []);
        setBills(billData || []);
        setPayments(payData || []);
        setProfiles(profData || []);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedYear]);

  const handleAddUser = async () => {
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) {
      alert("Please fill in all fields");
      return;
    }

    try {
      // Create user via backend Admin API to prevent session switching
      await profilesService.create({
        email: newUserEmail,
        password: newUserPassword,
        name: newUserName,
        role: newUserRole,
      });

      alert("User account created successfully!");
      
      // Refresh profiles
      const updatedProfiles = await profilesService.getAll();
      setProfiles(updatedProfiles);
      
      setNewUserName("");
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserRole("worker");
      setShowNewUserPassword(false);
      setIsAddUserOpen(false);
    } catch (error: any) {
      alert(`Error creating user: ${error.message}`);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    alert("User deletion requires Supabase Auth Admin API which is not directly accessible from the client for security. Use the Supabase Dashboard to remove users from Auth.");
  };

  const handleEditUser = (user: Profile) => {
    setEditingUserId(user.id);
    setEditName(user.name || "");
    setEditEmail(user.email || "");
    setEditRole(user.role || "worker");
    setIsEditUserOpen(true);
  };

  const handleSaveEditUser = async () => {
    if (!editName.trim() || !editEmail.trim()) {
      alert("Please fill in all fields");
      return;
    }

    if (!editingUserId) return;

    try {
      await profilesService.update(editingUserId, {
        name: editName,
        email: editEmail,
        role: editRole as any,
      });

      const updatedProfiles = await profilesService.getAll();
      setProfiles(updatedProfiles);

      setEditingUserId(null);
      setEditName("");
      setEditEmail("");
      setEditRole("worker");
      setIsEditUserOpen(false);
    } catch (error: any) {
      alert(`Error updating user: ${error.message}`);
    }
  };

  const dashboardStats = useMemo(() => {
    // Filter contracts by selected year (using due_date or start_date)
    const yearContracts = contracts.filter(c => {
      const date = c.due_date || c.start_date;
      if (!date) return false;
      return new Date(date).getFullYear() === selectedYear;
    });

    // Filter bills by selected year (using due_date or created_at)
    const yearBills = bills.filter(b => {
      const date = b.due_date || b.created_at;
      if (!date) return false;
      return new Date(date).getFullYear() === selectedYear;
    });

    // Calculate costs from year-filtered contracts
    let totalMaterialCosts = 0;
    let totalMiscCosts = 0;
    yearContracts.forEach((contract: any) => {
      // cost_tracking is JSONB in Supabase
      if (contract.cost_tracking) {
        const materialCost = contract.cost_tracking.materials?.reduce((sum: number, m: any) => sum + (m.unitPrice * m.quantity), 0) || 0;
        const miscCost = contract.cost_tracking.miscellaneous?.reduce((sum: number, m: any) => sum + m.amount, 0) || 0;
        totalMaterialCosts += materialCost;
        totalMiscCosts += miscCost;
      }
    });

    const totalBillsAmount = yearBills.reduce((sum: number, b: any) => sum + (Number(b.amount) || 0), 0);
    const pendingBills = yearBills.filter((b: any) => b.status !== "paid").reduce((sum: number, b: any) => sum + (Number(b.amount) || 0), 0);

    const totalContractValue = yearContracts.reduce((sum: number, c: any) => sum + (c.total_value || 0), 0);
    
    // Total Costs = Project Costs (Materials + Misc) + Operating Costs (Bills)
    const totalCosts = totalMaterialCosts + totalMiscCosts + totalBillsAmount;
    
    const totalProfit = totalContractValue - totalCosts;
    const profitMargin = totalContractValue > 0 ? (totalProfit / totalContractValue) * 100 : 0;

    // Calculate month-by-month payroll data
    const monthlyPayroll: { [key: string]: number } = {};
    const monthNames = ["January", "February", "March", "April", "May", "June",
                        "July", "August", "September", "October", "November", "December"];

    // Initialize all months to 0
    monthNames.forEach((_, index) => {
      monthlyPayroll[`${index + 1}`] = 0;
    });

    // Sum paid payments by month (filter by selected year)
    payments.forEach((payment: any) => {
      if (payment.status === "paid" && payment.paid_date) {
        const paymentDate = new Date(payment.paid_date);
        if (paymentDate.getFullYear() === selectedYear) {
          const month = paymentDate.getMonth() + 1;
          monthlyPayroll[`${month}`] = (monthlyPayroll[`${month}`] || 0) + (Number(payment.amount) || 0);
        }
      }
    });

    const totalPayroll = Object.values(monthlyPayroll).reduce((sum: number, val: any) => sum + val, 0);

    // Filter employees by hire_date for the selected year
    // We include employees hired on or before the selected year
    const yearEmployees = employees.filter(e => {
      if (!e.hire_date) return true; // Include if no hire date is set (legacy/safety)
      return new Date(e.hire_date).getFullYear() <= selectedYear;
    });

    return {
      totalEmployees: yearEmployees.length,
      totalWeeklyPayments: yearEmployees.reduce((sum: number, e: any) => sum + (Number(e.weekly_rate) || 0), 0),
      totalContracts: yearContracts.length,
      totalContractValue,
      totalMaterialCosts,
      totalMiscCosts,
      totalCosts,
      totalProfit,
      profitMargin,
      totalBills: yearBills.length,
      pendingBills,
      revenue: totalContractValue,
      monthlyPayroll,
      totalPayroll,
    };
  }, [selectedYear, employees, contracts, bills, payments]);

  const printDashboard = () => {
    try {
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - 2 * margin;

      const formatCurrency = (value: number) =>
        `$${(Number(value) || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

      const drawHeader = () => {
        pdf.setFillColor(31, 41, 55);
        pdf.rect(0, 0, pageWidth, 25, "F");

        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(20);
        pdf.setFont(undefined, "bold");
        pdf.text("SOUTH PARK CABINETS", margin, 12);

        pdf.setFontSize(12);
        pdf.setFont(undefined, "normal");
        pdf.text("Business Dashboard", margin, 20);

        pdf.setFontSize(9);
        pdf.setTextColor(150, 150, 150);
        pdf.text(
          `Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
          pageWidth - margin,
          20,
          { align: "right" },
        );

        pdf.setTextColor(0, 0, 0);
      };

      const drawSummaryBoxes = (startY: number) => {
        const boxWidth = (contentWidth - 12) / 3; // 3 boxes per row
        const boxHeight = 18;

        const summaryData = [
          {
            label: "Total Employees",
            value: String(dashboardStats.totalEmployees),
            color: [59, 130, 246] as const,
            subtitle: "Active staff"
          },
          {
            label: "Active Contracts",
            value: formatCurrency(dashboardStats.totalContractValue),
            color: [34, 197, 94] as const,
            subtitle: `${dashboardStats.totalContracts} contracts`
          },
          {
            label: "Outstanding Bills",
            value: formatCurrency(dashboardStats.pendingBills),
            color: [239, 68, 68] as const,
            subtitle: `${dashboardStats.totalBills} bills`
          },
          {
            label: "Total Costs",
            value: formatCurrency(dashboardStats.totalCosts),
            color: [249, 115, 22] as const,
            subtitle: "Project + Operating"
          },
          {
            label: "Total Profit",
            value: formatCurrency(dashboardStats.totalProfit),
            color: [16, 185, 129] as const,
            subtitle: `${dashboardStats.profitMargin.toFixed(1)}% margin`
          },
          {
            label: "Net Position",
            value: formatCurrency(dashboardStats.totalContractValue - dashboardStats.pendingBills - dashboardStats.totalCosts),
            color: [139, 92, 246] as const,
            subtitle: "Revenue - Expenses"
          },
        ];

        let currentY = startY;
        let currentX = margin;

        summaryData.forEach((item, idx) => {
          if (idx > 0 && idx % 3 === 0) {
            currentY += boxHeight + 6;
            currentX = margin;
          }

          const [r, g, b] = item.color;
          pdf.setFillColor(r, g, b);
          pdf.rect(currentX, currentY, boxWidth, boxHeight, "F");

          pdf.setTextColor(255, 255, 255);
          pdf.setFontSize(9);
          pdf.setFont(undefined, "normal");
          pdf.text(item.label, currentX + 3, currentY + 5);

          pdf.setFontSize(12);
          pdf.setFont(undefined, "bold");
          pdf.text(item.value, currentX + 3, currentY + 12);

          pdf.setFontSize(7);
          pdf.setFont(undefined, "normal");
          pdf.text(item.subtitle, currentX + 3, currentY + 16);

          currentX += boxWidth + 4;
        });

        return currentY + boxHeight + 10;
      };

      const drawDetailedMetrics = (startY: number) => {
        pdf.setFontSize(14);
        pdf.setFont(undefined, "bold");
        pdf.text("DETAILED METRICS", margin, startY);
        let yPos = startY + 8;

        // Contract breakdown
        pdf.setFontSize(11);
        pdf.setFont(undefined, "bold");
        pdf.text("Contract Status", margin, yPos);
        yPos += 6;

        pdf.setFontSize(9);
        pdf.setFont(undefined, "normal");
        const contractData = [
          ["Active Contracts", dashboardStats.totalContracts],
          ["Total Contract Value", formatCurrency(dashboardStats.totalContractValue)],
        ];

        contractData.forEach(([label, value]) => {
          pdf.text(`${label}:`, margin, yPos);
          pdf.text(String(value), margin + 60, yPos);
          yPos += 5;
        });

        yPos += 5;

        // Financial breakdown
        pdf.setFontSize(11);
        pdf.setFont(undefined, "bold");
        pdf.text("Financial Overview", margin, yPos);
        yPos += 6;

        pdf.setFontSize(9);
        pdf.setFont(undefined, "normal");
        const financialData = [
          ["Total Revenue", formatCurrency(dashboardStats.totalContractValue)],
          ["Outstanding Bills", formatCurrency(dashboardStats.pendingBills)],
          ["Total Costs", formatCurrency(dashboardStats.totalCosts)],
          ["Net Profit", formatCurrency(dashboardStats.totalProfit)],
          ["Profit Margin", `${dashboardStats.profitMargin.toFixed(1)}%`],
        ];

        financialData.forEach(([label, value]) => {
          pdf.text(`${label}:`, margin, yPos);
          pdf.text(String(value), margin + 60, yPos);
          yPos += 5;
        });

        return yPos + 10;
      };

      const drawFooter = (yPos: number) => {
        const footerY = pageHeight - 15;
        pdf.setDrawColor(200, 200, 200);
        pdf.setLineWidth(0.2);
        pdf.line(margin, footerY - 2, pageWidth - margin, footerY - 2);

        pdf.setFont(undefined, "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(`Dashboard Report - ${selectedYear}`, margin, footerY);
        pdf.text(`Page 1 of 1`, pageWidth - margin, footerY, { align: "right" });
        pdf.setTextColor(0, 0, 0);
      };

      // Generate PDF
      drawHeader();
      let currentY = drawSummaryBoxes(35);
      currentY = drawDetailedMetrics(currentY);
      drawFooter(currentY);

      pdf.save(`Dashboard-Report-${selectedYear}.pdf`);
    } catch (error) {
      console.error("Error generating dashboard report:", error);
      alert(`Error generating report: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-8 text-white">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
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
        {/* <div className="flex flex-wrap gap-4 mt-6">
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
        </div> */}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Revenue */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span>Total Revenue</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-slate-900 whitespace-nowrap">
                ${dashboardStats.revenue.toLocaleString()}
              </p>
              <p className="text-xs text-slate-500">
                {dashboardStats.totalContracts} active contracts
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Total Costs */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-orange-600 flex-shrink-0" />
              <span>Total Costs</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-slate-900 whitespace-nowrap">
                ${dashboardStats.totalCosts.toLocaleString()}
              </p>
              <p className="text-xs text-slate-500">
                Project + Operating
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Net Profit */}
        <Card className="border-green-200 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600 flex-shrink-0" />
              <span>Net Profit</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-green-700 whitespace-nowrap">
                ${dashboardStats.totalProfit.toLocaleString()}
              </p>
              <p className="text-sm font-semibold text-green-600">
                {dashboardStats.profitMargin.toFixed(1)}% <span className="text-xs font-normal text-slate-500 ml-1">margin</span>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <button 
                onClick={() => setIsMonthlyBreakdownOpen(!isMonthlyBreakdownOpen)}
                className="flex items-center gap-2 w-full hover:bg-slate-50 p-2 rounded -ml-2 transition-colors group"
              >
                {isMonthlyBreakdownOpen ? (
                  <ChevronDown className="w-4 h-4 text-slate-500 group-hover:text-slate-700" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-700" />
                )}
                <h4 className="text-sm font-semibold text-slate-900">Monthly Breakdown</h4>
              </button>
              
              {isMonthlyBreakdownOpen && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-2 animate-in slide-in-from-top-2 duration-200">
                  {["January", "February", "March", "April", "May", "June",
                    "July", "August", "September", "October", "November", "December"].map((month, index) => {
                    const monthNumber = index + 1;
                    const amount = dashboardStats.monthlyPayroll[`${monthNumber}`] || 0;
                    const monthlyValues = Object.values(dashboardStats.monthlyPayroll);
                    const maxAmount = Math.max(...monthlyValues, 74000); // Estimate ~$18.5k x 4 weeks
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
              )}
            </div>

            <Link to="/payments" className="block pt-2">
              <Button className="w-full bg-green-600 hover:bg-green-700">
                View Payment Details
              </Button>
            </Link>
          </CardContent>
      </Card>

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
                  <Select value={newUserRole} onValueChange={(value) => setNewUserRole(value)}>
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
                  <Label htmlFor="editUserRole">Role</Label>
                  <Select value={editRole} onValueChange={(value) => setEditRole(value)}>
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
          <div className="hidden lg:block overflow-x-auto">
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
                {profiles.map((profile, idx) => (
                  <tr key={profile.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="p-3 text-slate-700 font-medium">{profile.name || "N/A"}</td>
                    <td className="p-3 text-slate-700">{profile.email}</td>
                    <td className="p-3 text-slate-700 font-mono text-sm">••••••••</td>
                    <td className="p-3">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
                        profile.role === "admin"
                          ? "bg-red-100 text-red-700"
                          : profile.role === "manager"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-blue-100 text-blue-700"
                      }`}>
                        {profile.role === "admin" ? "Admin" : profile.role === "manager" ? "Manager" : "Worker"}
                      </span>
                    </td>
                    <td className="p-3 flex gap-2">
                      <button
                        onClick={() => handleEditUser(profile)}
                        className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded transition-colors"
                        title="Edit user"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(profile.id)}
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

          <div className="lg:hidden space-y-3">
            {profiles.map((profile) => (
              <div key={profile.id} className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 truncate">{profile.name || "N/A"}</div>
                    <div className="text-sm text-slate-600 break-all">{profile.email}</div>
                  </div>
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
                    profile.role === "admin"
                      ? "bg-red-100 text-red-700"
                      : profile.role === "manager"
                      ? "bg-purple-100 text-purple-700"
                      : "bg-blue-100 text-blue-700"
                  }`}>
                    {profile.role === "admin" ? "Admin" : profile.role === "manager" ? "Manager" : "Worker"}
                  </span>
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  <button
                    onClick={() => handleEditUser(profile)}
                    className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded transition-colors"
                    title="Edit user"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteUser(profile.id)}
                    className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded transition-colors"
                    title="Delete user"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
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
