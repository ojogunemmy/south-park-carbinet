import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit2, Trash2, Printer, Paperclip, ChevronRight, ChevronLeft, Download, FileIcon, Loader2 } from "lucide-react";
import jsPDF from "jspdf";
import { useState } from "react";
import { useYear } from "@/contexts/YearContext";
import { useSupabaseAuth } from "@/contexts/SupabaseAuthContext";
import { contractsService, type Contract } from "@/lib/supabase-service";
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
import { format } from "date-fns";

const CABINET_TYPES = ["Kitchen", "Bathroom", "Office", "Bedroom", "Living Room", "Custom"];
const FINISHES = ["Paint", "Stain", "Both (Stain & Paint)", "Natural/Unfinished", "Other"];

export default function Contracts() {
  const { toast } = useToast();
  const { selectedYear } = useYear();
  const { user } = useSupabaseAuth();
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  
  // State for form data
  const [formData, setFormData] = useState<Partial<Contract>>({
    client_name: "",
    project_name: "",
    status: "pending",
    total_value: 0,
    deposit_amount: 0,
    start_date: "",
    due_date: "",
    client_phone: "",
    client_email: "",
    client_address: "",
    project_location: "",
    cabinet_type: CABINET_TYPES[0],
    material: "Wood",
    installation_included: false,
    additional_notes: "",
    cost_tracking: {}, // Initialize as empty, logic handled in detail view or separate components
  });

  // Filter state
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Fetch Contracts
  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ['contracts'],
    queryFn: contractsService.getAll,
    enabled: !!user,
  });

  // Mutations
  const createContractMutation = useMutation({
    mutationFn: contractsService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      setIsModalOpen(false);
      resetForm();
      toast({ title: "Success", description: "Contract created successfully" });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", description: err.message || "Failed to create contract" });
    }
  });

  const updateContractMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Contract> }) => contractsService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      setIsModalOpen(false);
      resetForm();
      toast({ title: "Success", description: "Contract updated successfully" });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", description: err.message || "Failed to update contract" });
    }
  });

  const deleteContractMutation = useMutation({
    mutationFn: contractsService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast({ title: "Success", description: "Contract deleted successfully" });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", description: err.message || "Failed to delete contract" });
    }
  });

  const resetForm = () => {
    setFormData({
      client_name: "",
      project_name: "",
      status: "pending",
      total_value: 0,
      deposit_amount: 0,
      start_date: "",
      due_date: "",
      client_phone: "",
      client_email: "",
      client_address: "",
      project_location: "",
      cabinet_type: CABINET_TYPES[0],
      material: "Wood",
      installation_included: false,
      additional_notes: "",
      cost_tracking: {},
    });
    setSelectedContract(null);
    setIsEditMode(false);
  };

  const handleEdit = (contract: Contract) => {
    setSelectedContract(contract);
    setFormData({
      ...contract,
      // Ensure these exist
      cost_tracking: contract.cost_tracking || {},
      payment_schedule: contract.payment_schedule || [],
      expenses: contract.expenses || [],
      attachments: contract.attachments || [],
      down_payments: contract.down_payments || []
    });
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete contract "${name}"?`)) {
      deleteContractMutation.mutate(id);
    }
  };

  const handleSave = () => {
    if (!formData.client_name || !formData.project_name) {
      toast({ variant: "destructive", description: "Client Name and Project Name are required" });
      return;
    }

    if (isEditMode && selectedContract) {
      updateContractMutation.mutate({ id: selectedContract.id, data: formData });
    } else {
      createContractMutation.mutate(formData as Omit<Contract, "id" | "created_at" | "updated_at">);
    }
  };

  const filteredContracts = contracts.filter(c => {
    if (filterStatus === 'all') return true;
    return c.status === filterStatus;
  });

  const totalValue = filteredContracts.reduce((sum, c) => sum + (c.total_value || 0), 0);

  if (isLoading) {
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
          <h1 className="text-3xl font-bold text-slate-900">Contracts</h1>
          <p className="text-slate-600 mt-1">Manage client contracts and projects</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="bg-green-600 hover:bg-green-700 gap-2"
          >
            <Plus className="w-4 h-4" />
            New Contract
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Total Active Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">
               {contracts.filter(c => c.status === 'in_progress').length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Pending Start</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-600">
               {contracts.filter(c => c.status === 'pending').length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              ${totalValue.toLocaleString()}
            </p>
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
            <SelectItem value="all">All Contracts</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredContracts.length === 0 ? (
           <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-300">
             No contracts found
           </div>
        ) : (
          filteredContracts.map((contract) => (
            <Card key={contract.id} className="border-slate-200 hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                       <h3 className="text-xl font-bold text-slate-900">{contract.project_name}</h3>
                       <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${
                          contract.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                          contract.status === 'in_progress' ? 'bg-green-100 text-green-700' :
                          'bg-yellow-100 text-yellow-700'
                       }`}>
                         {contract.status?.replace('_', ' ')}
                       </span>
                    </div>
                    <p className="text-slate-600 font-medium">{contract.client_name}</p>
                    <div className="text-sm text-slate-500">
                       <p>{contract.project_location}</p>
                       <p className="mt-1">Due: {contract.due_date ? format(new Date(contract.due_date), "MMM d, yyyy") : "No date"} | Value: <span className="font-semibold text-slate-900">${(contract.total_value || 0).toLocaleString()}</span></p>
                    </div>
                  </div>
                  
                  <div className="flex md:flex-col gap-2 justify-center">
                    <Button 
                       variant="outline"
                       size="sm"
                       onClick={() => handleEdit(contract)}
                       className="text-blue-600 hover:bg-blue-50"
                    >
                      <Edit2 className="w-4 h-4 mr-2" /> Details/Edit
                    </Button>
                    <Button 
                       variant="outline"
                       size="sm"
                       onClick={() => handleDelete(contract.id, contract.project_name)}
                       className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Edit Contract" : "New Contract"}</DialogTitle>
            <DialogDescription>
              {isEditMode ? "Update contract details" : "Enter project information"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
             <div className="space-y-2">
               <Label>Project Name *</Label>
               <Input value={formData.project_name} onChange={e => setFormData({...formData, project_name: e.target.value})} placeholder="e.g. Smith Kitchen Renovation" />
             </div>
             <div className="space-y-2">
               <Label>Client Name *</Label>
               <Input value={formData.client_name} onChange={e => setFormData({...formData, client_name: e.target.value})} />
             </div>
             <div className="space-y-2">
               <Label>Total Value ($)</Label>
               <Input type="number" value={formData.total_value} onChange={e => setFormData({...formData, total_value: parseFloat(e.target.value) || 0})} />
             </div>
              <div className="space-y-2">
               <Label>Deposit Amount ($)</Label>
               <Input type="number" value={formData.deposit_amount} onChange={e => setFormData({...formData, deposit_amount: parseFloat(e.target.value) || 0})} />
             </div>
             <div className="space-y-2">
               <Label>Start Date</Label>
               <Input type="date" value={formData.start_date || ""} onChange={e => setFormData({...formData, start_date: e.target.value})} />
             </div>
             <div className="space-y-2">
               <Label>Due Date</Label>
               <Input type="date" value={formData.due_date || ""} onChange={e => setFormData({...formData, due_date: e.target.value})} />
             </div>
             <div className="space-y-2">
               <Label>Status</Label>
               <Select value={formData.status} onValueChange={val => setFormData({...formData, status: val as any})}>
                 <SelectTrigger><SelectValue /></SelectTrigger>
                 <SelectContent>
                   <SelectItem value="pending">Pending</SelectItem>
                   <SelectItem value="in_progress">In Progress</SelectItem>
                   <SelectItem value="completed">Completed</SelectItem>
                 </SelectContent>
               </Select>
             </div>
             <div className="space-y-2">
               <Label>Cabinet Type</Label>
               <Select value={formData.cabinet_type} onValueChange={val => setFormData({...formData, cabinet_type: val})}>
                 <SelectTrigger><SelectValue /></SelectTrigger>
                 <SelectContent>
                   {CABINET_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                 </SelectContent>
               </Select>
             </div>
             <div className="space-y-2 md:col-span-2">
               <Label>Project Location</Label>
               <Input value={formData.project_location || ""} onChange={e => setFormData({...formData, project_location: e.target.value})} />
             </div>
             <div className="space-y-2 md:col-span-2">
               <Label>Additional Notes</Label>
               <Input value={formData.additional_notes || ""} onChange={e => setFormData({...formData, additional_notes: e.target.value})} />
             </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
             <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
             <Button onClick={handleSave}>{isEditMode ? "Save Changes" : "Create Contract"}</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Toaster />
    </div>
  );
}
