import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer, Loader2, AlertCircle, Trash2 } from "lucide-react";
import { useState } from "react";
import { useSupabaseAuth } from "@/contexts/SupabaseAuthContext";
import { paymentsService, employeesService, settingsService, type Payment, type Employee, type Settings } from "@/lib/supabase-service";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "sonner";
import { format, parseISO } from "date-fns";
import jsPDF from "jspdf";
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

export default function Payments() {
  const { toast } = useToast();
  const { user } = useSupabaseAuth();
  const queryClient = useQueryClient();

  // State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [paymentForm, setPaymentForm] = useState({
      paidDate: format(new Date(), "yyyy-MM-dd"),
      paymentMethod: "check",
      checkNumber: "",
  });

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
      toast({ title: "Success", description: "Payment recorded successfully" });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", description: err.message || "Failed to update payment" });
    }
  });

  const deletePaymentMutation = useMutation({
    mutationFn: paymentsService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast({ title: "Success", description: "Payment record deleted" });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", description: err.message || "Failed to delete payment" });
    }
  });

  const calculateTotal = (payment: Payment) => {
    return (payment.gross_amount || 0) + (payment.bonus_amount || 0) - (payment.deduction_amount || 0);
  };

  const getEmployeeName = (id: string) => {
    return employees.find(e => e.id === id)?.name || "Unknown";
  };

  const handleEdit = (payment: Payment) => {
    setSelectedPayment(payment);
    const checkNum = getNextCheckNumber();
    const method = payment.payment_method || "check";
    
    setPaymentForm({
        paidDate: format(new Date(), "yyyy-MM-dd"),
        checkNumber: checkNum.toString(),
        paymentMethod: method,
        status: payment.status
    } as any);
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

    const companyName = settings?.company_name || "Your Company";
    const companyAddress = settings?.company_address || "";
    const companyPhone = settings?.company_phone || "";

    // Header
    doc.setFontSize(10);
    doc.text(companyName, 15, y);
    y += 5;
    doc.setFontSize(8);
    doc.text(companyAddress, 15, y);
    y += 4;
    doc.text(companyPhone, 15, y);

    const checkNum = payment.check_number || "0000";
    doc.setFontSize(10);
    doc.text(`CHECK NO: ${checkNum}`, width - 50, 15);

    y = 40;
    // Date
    doc.text(`DATE: ${format(new Date(payment.paid_date || new Date()), "MM/dd/yyyy")}`, width - 50, y);
    
    y += 15;
    // Payee
    doc.setFontSize(11);
    doc.text('PAY TO THE', 15, y);
    doc.text('ORDER OF', 15, y + 5);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(emp.name, 45, y + 2.5);
    
    // Amount
    const total = calculateTotal(payment);
    doc.text(`$${total.toLocaleString(undefined, {minimumFractionDigits: 2})}`, width - 50, y + 2.5);

    y += 20;
    // Memo
    doc.setFontSize(9);
    doc.text('MEMO', 15, y);
    y += 5;
    doc.setFont(undefined, 'normal');
    doc.text(`Week of ${payment.week_start_date}`, 15, y);

    // MICR (Simulated)
    y += 25;
    doc.setFont(undefined, 'courier');
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Payments</h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">Manage payroll and employee payments</p>
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
              ${payments.slice(0, 10).reduce((sum, p) => sum + calculateTotal(p), 0).toLocaleString()}
            </p>
            <p className="text-xs text-slate-400 mt-1">(Last 10 payments est)</p>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white p-3 sm:p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
        <Label className="text-sm">Filter Status:</Label>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[180px] text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Payments</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {/* Mobile View - Cards */}
        <div className="md:hidden space-y-4">
          {filteredPayments.length === 0 ? (
            <Card className="border-slate-200">
              <CardContent className="p-6 text-center text-slate-500">
                <div className="flex flex-col items-center gap-2">
                  <AlertCircle className="w-8 h-8 text-slate-300" />
                  <p>No payments found</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            filteredPayments.map(payment => (
              <Card key={payment.id} className="border-slate-200 shadow-sm">
                <CardHeader className="p-4 pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg font-bold text-slate-900 truncate pr-2">{getEmployeeName(payment.employee_id)}</CardTitle>
                      <CardDescription className="text-xs">
                        {format(parseISO(payment.week_start_date), "MMM d")} - {format(parseISO(payment.week_end_date), "MMM d")}
                      </CardDescription>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize shrink-0 ${
                      payment.status === 'paid' ? 'bg-green-100 text-green-700' :
                      payment.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {payment.status}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-2 space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-slate-500">Amount:</div>
                    <div className="font-semibold text-slate-900 text-right">${calculateTotal(payment).toLocaleString()}</div>
                    
                    <div className="text-slate-500">Method:</div>
                    <div className="capitalize text-slate-900 text-right">{payment.payment_method?.replace('_', ' ') || '-'}</div>
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-slate-100 mt-2 justify-end">
                    {payment.status === 'pending' && (
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(payment)} className="text-blue-600 flex-1 justify-center bg-blue-50 hover:bg-blue-100">
                        Pay Now
                      </Button>
                    )}
                    {payment.status === 'paid' && payment.payment_method === 'check' && (
                      <Button variant="ghost" size="sm" onClick={() => generateCheckPDF(payment)} className="text-slate-600 flex-1 justify-center border border-slate-200">
                        <Printer className="w-4 h-4 mr-2" /> Print Check
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(payment.id)} className="text-red-600 flex-1 justify-center hover:bg-red-50">
                      <Trash2 className="w-4 h-4 mr-2" /> Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Desktop View - Table */}
        <div className="hidden md:block overflow-x-auto bg-white rounded-lg border border-slate-200">
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
      </div>

      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-md">
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
