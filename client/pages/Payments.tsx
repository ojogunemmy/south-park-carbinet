import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, AlertCircle, Printer, Trash2, Paperclip, Download, Eye, X, Plus, Loader2 } from "lucide-react";
import jsPDF from "jspdf";
import { useState } from "react";
import { useYear } from "@/contexts/YearContext";
import { useSupabaseAuth } from "@/contexts/SupabaseAuthContext";
import { paymentsService, employeesService, settingsService, type Payment, type Employee, type Settings } from "@/lib/supabase-service";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "sonner";
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
import { format, parseISO } from "date-fns";

// Helper for number to words
const convertNumberToWords = (num: number): string => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertHundreds = (n: number): string => {
    let result = '';
    if (n >= 100) {
      result += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      result += tens[Math.floor(n / 10)];
      if (n % 10 > 0) result += ' ' + ones[n % 10];
    } else if (n >= 10) {
      result += teens[n - 10];
    } else if (n > 0) {
      result += ones[n];
    }
    return result.trim();
  };

  if (num === 0) return 'Zero Dollars';
  const dollars = Math.floor(num);
  const cents = Math.round((num - dollars) * 100);

  let words = '';
  if (dollars > 0) {
    words += convertHundreds(Math.floor(dollars / 1000000)) + ' Million ';
    words += convertHundreds(Math.floor((dollars % 1000000) / 1000)) + ' Thousand ';
    words += convertHundreds(dollars % 1000);
    words = words.replace(/\s+/g, ' ').trim() + ' Dollars';
  }

  if (cents > 0) {
    words += ' and ' + cents + '/100';
  }
  return words.trim();
};

export default function Payments() {
  const { toast } = useToast();
  const { selectedYear } = useYear();
  const { user } = useSupabaseAuth();
  const queryClient = useQueryClient();

  // Fetch Data
  const { data: payments = [], isLoading: isLoadingPayments } = useQuery({
    queryKey: ['payments'],
    queryFn: paymentsService.getAll,
    enabled: !!user,
  });

  const { data: employees = [], isLoading: isLoadingEmployees } = useQuery({
    queryKey: ['employees'],
    queryFn: employeesService.getAll,
    enabled: !!user,
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsService.get,
    enabled: !!user,
  });

  // Mutations
  const updatePaymentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Payment> }) => paymentsService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      setIsPaymentModalOpen(false);
      toast({ title: "Updated", description: "Payment updated successfully" });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", description: err.message || "Failed to update payment" });
    }
  });

   const deletePaymentMutation = useMutation({
    mutationFn: paymentsService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast({ title: "Deleted", description: "Payment deleted successfully" });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", description: err.message || "Failed to delete payment" });
    }
  });

  // State
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  
  // Payment processing form state
  const [paymentForm, setPaymentForm] = useState({
    paidDate: "",
    checkNumber: "",
    paymentMethod: "",
    status: "paid" as "paid" | "pending" | "canceled"
  });

  // Helper to get employee name
  const getEmployeeName = (empId: string) => {
    return employees.find(e => e.id === empId)?.name || "Unknown Employee";
  };

  const calculateTotal = (p: Payment) => {
    return (p.amount || 0) - (p.deduction_amount || 0);
  };

  const handleEdit = (payment: Payment) => {
    setSelectedPayment(payment);
    const method = payment.payment_method || employees.find(e => e.id === payment.employee_id)?.payment_method || "check";
    const nextCheckNum = method === 'check' ? getNextCheckNumber().toString() : "";
    
    setPaymentForm({
        paidDate: payment.paid_date ? format(parseISO(payment.paid_date), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
        checkNumber: payment.check_number || nextCheckNum,
        paymentMethod: method,
        status: payment.status
    });
    setIsPaymentModalOpen(true);
  };

  const handleSavePayment = () => {
    if (!selectedPayment) return;

    updatePaymentMutation.mutate({
        id: selectedPayment.id,
        data: {
            status: 'paid',
            paid_date: paymentForm.paidDate,
            check_number: paymentForm.paymentMethod === 'check' ? paymentForm.checkNumber : null,
            payment_method: paymentForm.paymentMethod,
        }
    });
  };

   const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this payment record?")) {
      deletePaymentMutation.mutate(id);
    }
  };

  const getNextCheckNumber = (): number => {
    const startingNumber = parseInt(settings?.check_template?.startNumber || "1001");
    // Find used numbers
    const used = payments
        .map(p => parseInt(p.check_number || "0"))
        .filter(n => !isNaN(n) && n > 0);
    
    if (used.length === 0) return startingNumber;
    return Math.max(...used) + 1;
  };

  const generateCheckPDF = (payment: Payment) => {
    const emp = employees.find(e => e.id === payment.employee_id);
    if (!emp) return;
    
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const width = doc.internal.pageSize.getWidth();
    let y = 15;

    // Use settings or defaults
    const companyName = settings?.company_name || "Your Company";
    const companyAddress = settings?.company_address || "";
    const cityStateZip = settings?.company_phone ? settings.company_phone : ""; // Using phone field as placeholder for city/state if needed or just append

    // Header
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text(companyName, 15, y);
    y += 7;
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.text(companyAddress, 15, y);
    y += 10;

    // Check Number
    const checkNum = payment.check_number || "XXXX";
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text(checkNum, width - 30, 20);
    doc.setFontSize(8);
    doc.text('Check #', width - 30, 26);

    // Date
    y += 5;
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text('DATE', 15, y);
    doc.setFont(undefined, 'normal');
    const dateStr = payment.paid_date ? format(parseISO(payment.paid_date), "MM/dd/yyyy") : format(new Date(), "MM/dd/yyyy");
    doc.text(dateStr, 35, y);
    y += 8;

    // Pay to
    doc.setFont(undefined, 'bold');
    doc.text('PAY TO THE ORDER OF', 15, y);
    y += 6;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(14);
    doc.text(emp.name, 15, y);
    y += 8;

    // Amount Words
    const total = calculateTotal(payment);
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text('AMOUNT IN WORDS', 15, y);
    y += 6;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(11);
    const words = convertNumberToWords(total);
    doc.text(words, 15, y);

    // Amount Numeric
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text(`$${total.toLocaleString(undefined, {minimumFractionDigits: 2})}`, width - 50, y);

    y += 20;
    // Memo
    doc.setFontSize(9);
    doc.text('MEMO', 15, y);
    y += 5;
    doc.setFont(undefined, 'normal');
    doc.text(`Week of ${payment.week_start_date}`, 15, y);

    // MICR (Simulated)
    y += 25;
    doc.setFont(undefined, 'courier'); // Monospace for MICR look
    doc.setFontSize(14);
    const routing = settings?.routing_number || "000000000";
    const account = settings?.account_number || "0000000000";
    doc.text(`|${routing}| ${account} | ${checkNum}`, 15, y);

    doc.save(`Check_${emp.name.replace(/\s/g, '_')}_${checkNum}.pdf`);
  };

  const filteredPayments = payments.filter(p => {
    if (filterStatus === 'all') return true;
    return p.status === filterStatus;
  });

  const totalPending = filteredPayments.filter(p => p.status === 'pending').reduce((sum, p) => sum + calculateTotal(p), 0);

  if (isLoadingPayments || isLoadingEmployees) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Payments</h1>
          <p className="text-slate-600 mt-1">Manage payroll and employee payments</p>
        </div>
      </div>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Pending Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-600">
               {payments.filter(p => p.status === 'pending').length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Pending Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">
              ${totalPending.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">This Week Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">
               {/* Simplified logic for "This Week" */}
               ${payments.slice(0, 10).reduce((sum, p) => sum + calculateTotal(p), 0).toLocaleString()}
            </p>
             <p className="text-xs text-slate-400 mt-1">(Last 10 payments est)</p>
          </CardContent>
        </Card>
      </div>

       <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-center gap-4">
        <Label>Filter Status:</Label>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Payments</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>
      </div>

       <div className="overflow-x-auto bg-white rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="p-3 text-left font-semibold text-slate-900">Employee</th>
              <th className="p-3 text-left font-semibold text-slate-900">Week</th>
              <th className="p-3 text-left font-semibold text-slate-900">Amount</th>
              <th className="p-3 text-left font-semibold text-slate-900">Status</th>
              <th className="p-3 text-left font-semibold text-slate-900">Method</th>
              <th className="p-3 text-right font-semibold text-slate-900">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPayments.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-500">No payments found</td></tr>
            ) : (
                filteredPayments.map(payment => (
                    <tr key={payment.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-3 font-medium text-slate-900">{getEmployeeName(payment.employee_id)}</td>
                         <td className="p-3 text-slate-600">
                            {format(parseISO(payment.week_start_date), "MMM d")} - {format(parseISO(payment.week_end_date), "MMM d")}
                         </td>
                         <td className="p-3 font-semibold text-slate-900">${calculateTotal(payment).toLocaleString()}</td>
                         <td className="p-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                                payment.status === 'paid' ? 'bg-green-100 text-green-700' :
                                payment.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                            }`}>
                                {payment.status}
                            </span>
                         </td>
                          <td className="p-3 text-slate-600 capitalize">{payment.payment_method?.replace('_', ' ') || '-'}</td>
                          <td className="p-3 text-right">
                             <div className="flex justify-end gap-2">
                                {payment.status === 'pending' && (
                                    <Button variant="ghost" size="sm" onClick={() => handleEdit(payment)} className="text-blue-600">
                                        Pay
                                    </Button>
                                )}
                                {payment.status === 'paid' && payment.payment_method === 'check' && (
                                     <Button variant="ghost" size="icon" onClick={() => generateCheckPDF(payment)} className="text-slate-600">
                                        <Printer className="w-4 h-4" />
                                     </Button>
                                )}
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(payment.id)} className="text-red-600">
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                             </div>
                          </td>
                    </tr>
                ))
            )}
          </tbody>
        </table>
       </div>

       <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="max-w-md">
            <DialogHeader>
                <DialogTitle>Process Payment</DialogTitle>
                <DialogDescription>Record payment for {selectedPayment ? getEmployeeName(selectedPayment.employee_id) : 'Employee'}</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Payment Date</Label>
                        <Input type="date" value={paymentForm.paidDate} onChange={e => setPaymentForm({...paymentForm, paidDate: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                        <Label>Method</Label>
                        <Select value={paymentForm.paymentMethod} onValueChange={val => setPaymentForm({...paymentForm, paymentMethod: val})}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="check">Check</SelectItem>
                                <SelectItem value="direct_deposit">Direct Deposit</SelectItem>
                                <SelectItem value="cash">Cash</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                
                {paymentForm.paymentMethod === 'check' && (
                    <div className="space-y-2">
                        <Label>Check Number</Label>
                        <Input value={paymentForm.checkNumber} onChange={e => setPaymentForm({...paymentForm, checkNumber: e.target.value})} />
                    </div>
                )}
            </div>

            <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsPaymentModalOpen(false)}>Cancel</Button>
                <Button onClick={handleSavePayment} className="bg-green-600 hover:bg-green-700">Mark as Paid</Button>
            </div>
        </DialogContent>
       </Dialog>
       <Toaster />
    </div>
  );
}
