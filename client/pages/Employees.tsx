import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Plus, Edit2, Trash2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useYear } from "@/contexts/YearContext";
import { useSupabaseAuth } from "@/contexts/SupabaseAuthContext";
import { employeesService, paymentsService, profilesService, type Employee, type Payment, type Profile } from "@/lib/supabase-service";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle } from "lucide-react";
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

const formatDate = (dateString: string | null) => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString();
};

const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const formatYYYYMMDD = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseISO = (dateString: string) => new Date(dateString);

const isBefore = (date1: Date, date2: Date) => date1 < date2;

export default function Employees() {
  const { toast } = useToast();
  const { selectedYear } = useYear();
  const { user } = useSupabaseAuth();
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  
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

  const { data: employees = [], isLoading: isLoadingEmployees } = useQuery({
    queryKey: ['employees'],
    queryFn: employeesService.getAll,
    enabled: !!user,
  });

  const { data: payments = [], isLoading: isLoadingPayments } = useQuery({
    queryKey: ['payments'],
    queryFn: paymentsService.getAll,
    enabled: !!user,
  });

  const { data: allProfiles = [] } = useQuery<Profile[]>({
    queryKey: ['profiles'],
    queryFn: profilesService.getAll,
    enabled: !!user && user.role === 'admin',
  });

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
    let currentDate = new Date(2026, 0, 4);
    const endOfYear = new Date(2026, 11, 31);

    while (currentDate <= endOfYear) {
      const weekStartStr = formatYYYYMMDD(currentDate);
      const activeEmployees = employees.filter(e => e.status === 'active');
      
      activeEmployees.forEach(emp => {
        const exists = payments.some((p: any) => p.employee_id === emp.id && p.week_start_date === weekStartStr);
        if (exists) return;

        const details = emp.bank_details || {};
        const paymentStart = details.paymentStartDate ? parseISO(details.paymentStartDate) : null;
        
        if (paymentStart && isBefore(currentDate, paymentStart)) return;

        newPayments.push({
            employee_id: emp.id,
            week_start_date: weekStartStr,
            week_end_date: formatYYYYMMDD(addDays(currentDate, 6)),
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

  const isEmployeeVerified = (emp: Employee) => {
    if (emp.is_verified) return true;
    const profile = allProfiles.find(p => p.id === emp.user_id);
    return profile?.is_verified === true;
  };

  const filteredEmployees = employees.filter(e => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'pending') return !isEmployeeVerified(e);
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
    <div className="space-y-4 sm:space-y-6 p-1 sm:p-6">
       <div className="flex flex-col gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Employees</h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">Manage your workforce</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button 
             variant="outline" 
             onClick={generatePaymentsForYear}
             className="gap-2 w-full sm:w-auto text-sm sm:text-base"
          >
            <span className="text-bold text-md">Generate 2026 Payments</span>
          </Button>
          <Button 
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="bg-blue-600 hover:bg-blue-700 gap-2 w-full sm:w-auto text-sm sm:text-base"
          >
            <Plus className="w-4 h-4" />
            Add Employee
          </Button>
        </div>
      </div>

      <div className="bg-white p-3 sm:p-4 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
           <Label className="text-sm sm:text-base">Filter Status:</Label>
           <Select value={filterStatus} onValueChange={setFilterStatus}>
             <SelectTrigger className="w-full sm:w-[180px]">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {filteredEmployees.map((employee) => (
          <Card key={employee.id} className="border-slate-200 hover:shadow-md transition-shadow">
            <CardHeader className="pb-2 p-4 sm:p-6">
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base sm:text-lg font-bold text-slate-900 truncate">{employee.name}</CardTitle>
                  <CardDescription className="text-sm truncate">
                    {employee.position}
                    {employee.email && <span className="block text-[10px] text-slate-400 mt-0.5">{employee.email}</span>}
                  </CardDescription>
                </div>
                <Badge className={`shrink-0 text-xs ${
                  employee.status === 'active' ? "bg-green-100 text-green-700" : 
                  "bg-yellow-100 text-yellow-700"
                }`}>
                  {employee.status}
                </Badge>
              </div>
              <div className="mt-1 flex items-center gap-1">
                {isEmployeeVerified(employee) ? (
                  <div className="flex items-center text-green-600 text-xs font-medium">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Verified Employee
                  </div>
                ) : (
                  <div className="flex items-center text-amber-600 text-xs font-medium">
                    <XCircle className="w-3 h-3 mr-1" /> Pending Validation
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="space-y-2 text-xs sm:text-sm text-slate-600 mt-2">
                 <div className="flex justify-between gap-2">
                   <span>Weekly Rate:</span>
                   <span className="font-semibold text-slate-900">${employee.weekly_rate?.toLocaleString()}</span>
                 </div>
                 <div className="flex justify-between gap-2">
                   <span>Hired:</span>
                   <span className="truncate">{formatDate(employee.hire_date)}</span>
                 </div>
                 <div className="flex justify-between gap-2">
                   <span>Payment Method:</span>
                   <span className="capitalize truncate">{employee.payment_method?.replace('_', ' ')}</span>
                 </div>
              </div>
              
              <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="flex-1 text-blue-600 hover:bg-blue-50 text-xs sm:text-sm"
                  onClick={() => handleEdit(employee)}
                >
                  <Edit2 className="w-3 h-3 mr-1" /> Edit
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="flex-1 text-red-600 hover:bg-red-50 text-xs sm:text-sm"
                  onClick={() => handleDelete(employee.id, employee.name)}
                >
                  <Trash2 className="w-3 h-3 mr-1" /> Delete
                </Button>
              </div>

              <div className="mt-2 text-center">
                <Button
                  variant={isEmployeeVerified(employee) ? "outline" : "default"}
                  size="sm"
                  className={cn(
                    "w-full text-xs h-8",
                    !isEmployeeVerified(employee) && "bg-amber-600 hover:bg-amber-700 text-white"
                  )}
                  onClick={async (e) => {
                    e.stopPropagation();
                    const newStatus = !isEmployeeVerified(employee);
                    const hasBeenVerified = employee.has_been_verified || 
                                          (allProfiles.find(p => p.id === employee.user_id)?.has_been_verified === true);
                    
                    try {
                      // 1. Update Profile if exists
                      if (employee.user_id) {
                        await profilesService.update(employee.user_id, { 
                          is_verified: newStatus,
                          has_been_verified: hasBeenVerified || newStatus
                        });
                      }

                      // 2. Update Employee (HR record) - If columns exist
                      try {
                        await employeesService.update(employee.id, {
                          is_verified: newStatus,
                          has_been_verified: hasBeenVerified || newStatus
                        });
                      } catch (hrError) {
                        console.warn("HR table update failed (legacy schema?):", hrError);
                        // Silently continue if HR table lacks columns
                      }

                      queryClient.invalidateQueries({ queryKey: ['employees'] });
                      queryClient.invalidateQueries({ queryKey: ['profiles'] });
                      
                      toast({ 
                        title: newStatus ? "Verification Successful" : "Access Revoked", 
                        description: newStatus 
                          ? `${employee.name} is now verified. ${!employee.user_id ? "(Note: No account linked yet)" : ""}` 
                          : `${employee.name}'s verification has been removed.`
                      });
                    } catch (err: any) {
                      toast({ variant: "destructive", description: err.message });
                    }
                  }}
                >
                  {isEmployeeVerified(employee) ? "Unverify User" : "Verify User Now"}
                </Button>
                {!employee.user_id && !isEmployeeVerified(employee) && (
                  <p className="text-[10px] text-slate-400 mt-1 italic">
                    Employee hasn't created an account yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">{isEditMode ? "Edit Employee" : "Add New Employee"}</DialogTitle>
            <DialogDescription className="text-sm">
              {isEditMode ? "Update employee details" : "Enter new employee information"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 py-4">
             <div className="space-y-2">
               <Label className="text-sm">Full Name *</Label>
               <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="text-sm" />
             </div>
             <div className="space-y-2">
               <Label className="text-sm">Position</Label>
               <Input value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} className="text-sm" />
             </div>
             <div className="space-y-2">
               <Label className="text-sm">Weekly Rate ($) *</Label>
               <Input type="number" value={formData.weeklyRate} onChange={e => setFormData({...formData, weeklyRate: e.target.value})} className="text-sm" />
             </div>
             <div className="space-y-2">
               <Label className="text-sm">Start Date</Label>
               <Input type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className="text-sm" />
             </div>
             <div className="space-y-2">
               <Label className="text-sm">Payment Start Date</Label>
               <Input type="date" value={formData.paymentStartDate} onChange={e => setFormData({...formData, paymentStartDate: e.target.value})} className="text-sm" />
             </div>
              <div className="space-y-2">
               <Label className="text-sm">Status</Label>
               <Select value={formData.paymentStatus} onValueChange={val => setFormData({...formData, paymentStatus: val})}>
                 <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                 <SelectContent>
                   <SelectItem value="active">Active</SelectItem>
                   <SelectItem value="paused">Paused</SelectItem>
                   <SelectItem value="leaving">Leaving</SelectItem>
                   <SelectItem value="laid_off">Laid Off</SelectItem>
                 </SelectContent>
               </Select>
             </div>
             <div className="space-y-2">
               <Label className="text-sm">Payment Method</Label>
               <Select value={formData.paymentMethod} onValueChange={val => setFormData({...formData, paymentMethod: val})}>
                 <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                 <SelectContent>
                   <SelectItem value="cash">Cash</SelectItem>
                   <SelectItem value="check">Check</SelectItem>
                   <SelectItem value="direct_deposit">Direct Deposit</SelectItem>
                 </SelectContent>
               </Select>
             </div>
             <div className="space-y-2">
               <Label className="text-sm">Phone</Label>
               <Input value={formData.telephone} onChange={e => setFormData({...formData, telephone: e.target.value})} className="text-sm" />
             </div>
             <div className="space-y-2">
               <Label className="text-sm">Email</Label>
               <Input value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="text-sm" />
             </div>
             <div className="space-y-2">
               <Label className="text-sm">Address</Label>
               <Input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="text-sm" />
             </div>
             <div className="space-y-2">
                <Label className="text-sm">Bank Name</Label>
                <Input value={formData.bankName} onChange={e => setFormData({...formData, bankName: e.target.value})} className="text-sm" />
             </div>
              <div className="space-y-2">
                <Label className="text-sm">Account Number</Label>
                <Input value={formData.accountNumber} onChange={e => setFormData({...formData, accountNumber: e.target.value})} className="text-sm" />
             </div>
              <div className="space-y-2">
                <Label className="text-sm">Routing Number</Label>
                <Input value={formData.routingNumber} onChange={e => setFormData({...formData, routingNumber: e.target.value})} className="text-sm" />
             </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 mt-4">
             <Button variant="outline" onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto text-sm">Cancel</Button>
             <Button onClick={handleSave} className="w-full sm:w-auto text-sm">{isEditMode ? "Save Changes" : "Create Employee"}</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Toaster />
    </div>
  );
}