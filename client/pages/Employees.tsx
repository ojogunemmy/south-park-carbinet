import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ChevronRight, ChevronLeft, Edit2, Trash2, Eye, ChevronDown, Download, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import jsPDF from "jspdf";
import { useState, useEffect } from "react";
import { useYear } from "@/contexts/YearContext";
import { useSupabaseAuth } from "@/contexts/SupabaseAuthContext";
import { employeesService, paymentsService, type Employee, type Payment } from "@/lib/supabase-service";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { Toaster } from "sonner";
import { useToast } from "@/hooks/use-toast";
import { format, addDays, startOfWeek, isBefore, parseISO } from "date-fns";

// Helper for formatting dates cleanly
const formatDate = (dateString: string | null) => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString();
};

export default function Employees() {
  const { toast } = useToast();
  const { selectedYear } = useYear();
  const { user } = useSupabaseAuth();
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  
  // Form State
  const [formData, setFormData] = useState<any>({
    name: "",
    position: "",
    telephone: "",
    email: "",
    startDate: "",
    paymentStartDate: "",
    address: "",
    weeklyRate: "",
    paymentMethod: "cash",
    bankName: "",
    routingNumber: "",
    accountNumber: "",
    accountType: "checking",
    checkNumber: "",
    paymentDay: "wednesday",
    paymentStatus: "active",
    defaultDaysWorkedPerWeek: "5",
  });

  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Fetch Employees
  const { data: employees = [], isLoading: isLoadingEmployees } = useQuery({
    queryKey: ['employees'],
    queryFn: employeesService.getAll,
    enabled: !!user,
  });

  // Fetch Payments (needed for generation logic)
  const { data: payments = [], isLoading: isLoadingPayments } = useQuery({
    queryKey: ['payments'],
    queryFn: paymentsService.getAll,
    enabled: !!user,
  });

  // Mutations
  const createEmployeeMutation = useMutation({
    mutationFn: employeesService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setIsModalOpen(false);
      resetForm();
      toast({ title: "Success", description: "Employee added successfully" });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", description: err.message || "Failed to create employee" });
    }
  });

  const updateEmployeeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Employee> }) => employeesService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setIsModalOpen(false);
      resetForm();
      toast({ title: "Success", description: "Employee updated successfully" });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", description: err.message || "Failed to update employee" });
    }
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: employeesService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({ title: "Success", description: "Employee deleted successfully" });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", description: err.message || "Failed to delete employee" });
    }
  });

  const createPaymentBulkMutation = useMutation({
    mutationFn: paymentsService.createBulk,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast({ title: "Success", description: `Generated ${data.length} payments` });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", description: err.message || "Failed to generate payments" });
    }
  });

  const resetForm = () => {
    setFormData({
      name: "",
      position: "",
      telephone: "",
      email: "",
      startDate: "",
      paymentStartDate: "",
      address: "",
      ssn: "",
      itin: "",
      weeklyRate: "",
      paymentMethod: "cash",
      bankName: "",
      routingNumber: "",
      accountNumber: "",
      accountType: "checking",
      checkNumber: "",
      paymentDay: "wednesday",
      paymentStatus: "active",
      defaultDaysWorkedPerWeek: "5",
    });
    setSelectedEmployee(null);
    setIsEditMode(false);
  };

  const handleEdit = (employee: Employee) => {
    const details = employee.bank_details || {};
    setSelectedEmployee(employee);
    setFormData({
      name: employee.name,
      position: employee.position || "",
      startDate: employee.hire_date || "",
      weeklyRate: employee.weekly_rate?.toString() || "",
      paymentMethod: employee.payment_method || "cash",
      paymentStatus: employee.status || "active",
      
      // Extended details from JSONB
      telephone: details.telephone || "",
      email: details.email || "",
      paymentStartDate: details.paymentStartDate || "",
      address: details.address || "",
      ssn: details.ssn || "",
      itin: details.itin || "",
      bankName: details.bankName || "",
      routingNumber: details.routingNumber || "",
      accountNumber: details.accountNumber || "",
      accountType: details.accountType || "checking",
      checkNumber: details.checkNumber || "",
      paymentDay: details.paymentDay || "wednesday",
      defaultDaysWorkedPerWeek: details.defaultDaysWorkedPerWeek?.toString() || "5",
    });
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.weeklyRate) {
      toast({ variant: "destructive", description: "Name and Weekly Rate are required" });
      return;
    }

    const extendedDetails = {
      telephone: formData.telephone,
      email: formData.email,
      paymentStartDate: formData.paymentStartDate,
      address: formData.address,
      ssn: formData.ssn,
      itin: formData.itin,
      bankName: formData.bankName,
      routingNumber: formData.routingNumber,
      accountNumber: formData.accountNumber,
      accountType: formData.accountType,
      checkNumber: formData.checkNumber,
      paymentDay: formData.paymentDay,
      defaultDaysWorkedPerWeek: formData.defaultDaysWorkedPerWeek,
    };

    const payload = {
      name: formData.name,
      position: formData.position,
      weekly_rate: parseFloat(formData.weeklyRate),
      hire_date: formData.startDate || null,
      payment_method: formData.paymentMethod,
      status: formData.paymentStatus,
      bank_details: extendedDetails,
    };

    if (isEditMode && selectedEmployee) {
      updateEmployeeMutation.mutate({ id: selectedEmployee.id, data: payload });
    } else {
      createEmployeeMutation.mutate(payload);
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      deleteEmployeeMutation.mutate(id);
    }
  };

  const generatePaymentsForYear = () => {
    if (selectedYear !== 2026) {
      toast({ description: "Automatic generation is currently optimized for 2026." });
      return;
    }

    if (!confirm("This will generate weekly payments for all active employees for the entire year of 2026. Continue?")) return;

    const newPayments: Partial<Payment>[] = [];
    let currentDate = new Date(2026, 0, 4); // Jan 4, 2026 (Sunday)
    const endOfYear = new Date(2026, 11, 31);
    const existingDates = new Set(payments.map((p: any) => p.week_start_date));

    // For each week
    while (currentDate <= endOfYear) {
      const weekStartStr = format(currentDate, "yyyy-MM-dd");
      
      // If we haven't already generated payments for this week (simplification: checking if ANY payment exists for this week is risky if new employees added, but strictly following existing logic pattern for now)
      // Better logic: Check per employee per week
      
      const activeEmployees = employees.filter(e => e.status === 'active');
      
      activeEmployees.forEach(emp => {
        // Check if payment already exists for this employee and week
        const exists = payments.some((p: any) => p.employee_id === emp.id && p.week_start_date === weekStartStr);
        if (exists) return;

        const details = emp.bank_details || {};
        const paymentStart = details.paymentStartDate ? parseISO(details.paymentStartDate) : null;
        
        // Skip if before payment start date
        if (paymentStart && isBefore(currentDate, paymentStart)) return;

        newPayments.push({
            employee_id: emp.id,
            week_start_date: weekStartStr,
            week_end_date: format(addDays(currentDate, 6), "yyyy-MM-dd"),
            amount: emp.weekly_rate || 0,
            status: 'pending',
            payment_method: emp.payment_method || 'cash',
            days_worked: 5,
            deduction_amount: 0,
            bank_name: details.bankName,
            account_last_four: details.accountNumber ? details.accountNumber.slice(-4) : null,
        });
      });

      currentDate = addDays(currentDate, 7);
    }

    if (newPayments.length > 0) {
      createPaymentBulkMutation.mutate(newPayments);
    } else {
      toast({ description: "No new payments needed generation." });
    }
  };

  const filteredEmployees = employees.filter(e => {
    if (filterStatus === 'all') return true;
    return e.status === filterStatus;
  });

  if (isLoadingEmployees) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Employees</h1>
          <p className="text-slate-600 mt-1">Manage your workforce</p>
        </div>
        <div className="flex gap-2">
          <Button 
             variant="outline" 
             onClick={generatePaymentsForYear}
             className="gap-2"
          >
            <Loader2 className="w-4 h-4" />
            Generate 2026 Payments
          </Button>
          <Button 
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="bg-blue-600 hover:bg-blue-700 gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Employee
          </Button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
           <Label>Filter Status:</Label>
           <Select value={filterStatus} onValueChange={setFilterStatus}>
             <SelectTrigger className="w-[180px]">
               <SelectValue />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="all">All Employees</SelectItem>
               <SelectItem value="active">Active</SelectItem>
               <SelectItem value="paused">Paused</SelectItem>
               <SelectItem value="leaving">Leaving</SelectItem>
               <SelectItem value="laid_off">Laid Off</SelectItem>
             </SelectContent>
           </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEmployees.map((employee) => (
          <Card key={employee.id} className="border-slate-200 hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900">{employee.name}</CardTitle>
                  <CardDescription>{employee.position}</CardDescription>
                </div>
                <Badge className={
                  employee.status === 'active' ? "bg-green-100 text-green-700" : 
                  "bg-yellow-100 text-yellow-700"
                }>
                  {employee.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-slate-600 mt-2">
                 <div className="flex justify-between">
                   <span>Weekly Rate:</span>
                   <span className="font-semibold text-slate-900">${employee.weekly_rate?.toLocaleString()}</span>
                 </div>
                 <div className="flex justify-between">
                   <span>Hired:</span>
                   <span>{formatDate(employee.hire_date)}</span>
                 </div>
                 <div className="flex justify-between">
                   <span>Payment Method:</span>
                   <span className="capitalize">{employee.payment_method?.replace('_', ' ')}</span>
                 </div>
              </div>
              
              <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="flex-1 text-blue-600 hover:bg-blue-50"
                  onClick={() => handleEdit(employee)}
                >
                  <Edit2 className="w-3 h-3 mr-1" /> Edit
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="flex-1 text-red-600 hover:bg-red-50"
                  onClick={() => handleDelete(employee.id, employee.name)}
                >
                  <Trash2 className="w-3 h-3 mr-1" /> Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Edit Employee" : "Add New Employee"}</DialogTitle>
            <DialogDescription>
              {isEditMode ? "Update employee details" : "Enter new employee information"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
             <div className="space-y-2">
               <Label>Full Name *</Label>
               <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
             </div>
             <div className="space-y-2">
               <Label>Position</Label>
               <Input value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} />
             </div>
             <div className="space-y-2">
               <Label>Weekly Rate ($) *</Label>
               <Input type="number" value={formData.weeklyRate} onChange={e => setFormData({...formData, weeklyRate: e.target.value})} />
             </div>
             <div className="space-y-2">
               <Label>Start Date</Label>
               <Input type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
             </div>
             <div className="space-y-2">
               <Label>Payment Start Date</Label>
               <Input type="date" value={formData.paymentStartDate} onChange={e => setFormData({...formData, paymentStartDate: e.target.value})} />
             </div>
              <div className="space-y-2">
               <Label>Status</Label>
               <Select value={formData.paymentStatus} onValueChange={val => setFormData({...formData, paymentStatus: val})}>
                 <SelectTrigger><SelectValue /></SelectTrigger>
                 <SelectContent>
                   <SelectItem value="active">Active</SelectItem>
                   <SelectItem value="paused">Paused</SelectItem>
                   <SelectItem value="leaving">Leaving</SelectItem>
                   <SelectItem value="laid_off">Laid Off</SelectItem>
                 </SelectContent>
               </Select>
             </div>
             <div className="space-y-2">
               <Label>Payment Method</Label>
               <Select value={formData.paymentMethod} onValueChange={val => setFormData({...formData, paymentMethod: val})}>
                 <SelectTrigger><SelectValue /></SelectTrigger>
                 <SelectContent>
                   <SelectItem value="cash">Cash</SelectItem>
                   <SelectItem value="check">Check</SelectItem>
                   <SelectItem value="direct_deposit">Direct Deposit</SelectItem>
                 </SelectContent>
               </Select>
             </div>
             <div className="space-y-2">
               <Label>Phone</Label>
               <Input value={formData.telephone} onChange={e => setFormData({...formData, telephone: e.target.value})} />
             </div>
             <div className="space-y-2">
               <Label>Email</Label>
               <Input value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
             </div>
             <div className="space-y-2">
               <Label>Address</Label>
               <Input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
             </div>
             <div className="space-y-2">
                <Label>Bank Name</Label>
                <Input value={formData.bankName} onChange={e => setFormData({...formData, bankName: e.target.value})} />
             </div>
              <div className="space-y-2">
                <Label>Account Number</Label>
                <Input value={formData.accountNumber} onChange={e => setFormData({...formData, accountNumber: e.target.value})} />
             </div>
              <div className="space-y-2">
                <Label>Routing Number</Label>
                <Input value={formData.routingNumber} onChange={e => setFormData({...formData, routingNumber: e.target.value})} />
             </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
             <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
             <Button onClick={handleSave}>{isEditMode ? "Save Changes" : "Create Employee"}</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Toaster />
    </div>
  );
}
