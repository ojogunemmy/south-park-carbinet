import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { useSupabaseAuth } from "@/contexts/SupabaseAuthContext";
import { settingsService, type Settings as SupabaseSettings } from "@/lib/supabase-service";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "sonner";
import { Loader2 } from "lucide-react";

export default function Settings() {
  const { toast } = useToast();
  const { user, role, signOut } = useSupabaseAuth();
  const queryClient = useQueryClient();

  // Fetch Settings (Only if admin)
  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsService.get,
    enabled: !!user && role === 'admin',
  });

  // Default values
  const defaultSettings = {
    company_name: "Your Company Name",
    company_address: "123 Business Ave",
    company_phone: "(303) 555-0000",
    bank_name: "Wells Fargo",
    routing_number: "121000248",
    account_number: "1234567890",
    check_template: { startNumber: "1001", city: "Denver", state: "CO", zip: "80202" }
  };

  const [formState, setFormState] = useState(defaultSettings);

  // Sync state with fetched data
  useEffect(() => {
    if (settingsData) {
      setFormState({
        company_name: settingsData.company_name || defaultSettings.company_name,
        company_address: settingsData.company_address || defaultSettings.company_address,
        company_phone: settingsData.company_phone || defaultSettings.company_phone,
        bank_name: settingsData.bank_name || defaultSettings.bank_name,
        routing_number: settingsData.routing_number || defaultSettings.routing_number,
        account_number: settingsData.account_number || defaultSettings.account_number,
        check_template: settingsData.check_template || defaultSettings.check_template,
      });
    }
  }, [settingsData]);

  const updateSettingsMutation = useMutation({
    mutationFn: (newSettings: Partial<SupabaseSettings>) => settingsService.update(newSettings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast({ title: "Saved", description: "Settings saved successfully" });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", description: err.message || "Failed to save settings" });
    }
  });

  const handleSave = () => {
    updateSettingsMutation.mutate(formState);
  };

  const handleClearAllData = () => {
    if (confirm("⚠️ This will permanently delete ALL local storage data. It will NOT affect Supabase data. Continue?")) {
      localStorage.clear();
      window.location.href = "/";
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      window.location.href = "/login";
    } catch (error) {
      toast({ variant: "destructive", description: "Error signing out" });
    }
  };

  if (isLoading && role === 'admin') {
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
          <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
          <p className="text-slate-600 mt-1">
            {role === 'admin' ? "Configure company information" : "Manage your account"}
          </p>
        </div>
        <div className="flex gap-2">
           {role === 'admin' && (
              <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
                Save Changes
              </Button>
           )}
           <Button onClick={handleLogout} variant="outline" className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200">
              Logout
           </Button>
        </div>
      </div>

      {role === 'admin' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Company Information */}
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle>Company Information</CardTitle>
                <CardDescription>Your business details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input
                    value={formState.company_name}
                    onChange={(e) => setFormState({...formState, company_name: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Street Address</Label>
                  <Input
                    value={formState.company_address}
                    onChange={(e) => setFormState({...formState, company_address: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input
                      value={formState.check_template.city || ""}
                      onChange={(e) => setFormState({...formState, check_template: {...formState.check_template, city: e.target.value}})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>State</Label>
                    <Input
                      maxLength={2}
                      value={formState.check_template.state || ""}
                      onChange={(e) => setFormState({...formState, check_template: {...formState.check_template, state: e.target.value.toUpperCase()}})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>ZIP</Label>
                    <Input
                      value={formState.check_template.zip || ""}
                      onChange={(e) => setFormState({...formState, check_template: {...formState.check_template, zip: e.target.value}})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input
                    value={formState.company_phone}
                    onChange={(e) => setFormState({...formState, company_phone: e.target.value})}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Bank Information */}
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle>Bank Information</CardTitle>
                <CardDescription>For check printing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Bank Name</Label>
                  <Input
                    value={formState.bank_name}
                    onChange={(e) => setFormState({...formState, bank_name: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Routing Number</Label>
                  <Input
                    value={formState.routing_number}
                    onChange={(e) => setFormState({...formState, routing_number: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Account Number</Label>
                  <Input
                    type="password"
                    value={formState.account_number}
                    onChange={(e) => setFormState({...formState, account_number: e.target.value})}
                    placeholder="Account number (masked)"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Starting Check Number</Label>
                  <Input
                    type="number"
                    value={formState.check_template.startNumber || "1001"}
                    onChange={(e) => setFormState({...formState, check_template: {...formState.check_template, startNumber: e.target.value}})}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-slate-200 bg-blue-50">
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>How company info will appear on checks</CardDescription>
            </CardHeader>
            <CardContent>
               <div className="space-y-1 font-mono text-sm text-slate-700">
                <div className="font-bold">{formState.company_name}</div>
                <div>{formState.company_address}</div>
                <div>{formState.check_template.city}, {formState.check_template.state} {formState.check_template.zip}</div>
                <div>{formState.company_phone}</div>
                <div className="mt-3 pt-3 border-t border-slate-300">
                  Bank: {formState.bank_name}
                </div>
                <div>Routing: {formState.routing_number}</div>
                <div>Account: •••••••••••{(formState.account_number || "").slice(-4)}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-300 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-900">Legacy Data Cleanup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-red-800">
                Remove local storage data from previous version. Only do this after confirming all data is in Supabase.
              </p>
              <Button
                onClick={handleClearAllData}
                className="bg-red-600 hover:bg-red-700 w-full"
              >
                Clear Local Storage
              </Button>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardHeader>
             <CardTitle>My Account</CardTitle>
             <CardDescription>Manage your personal settings</CardDescription>
          </CardHeader>
          <CardContent>
             <p className="text-slate-600">Logged in as: <strong>{user?.email}</strong></p>
             <p className="text-slate-500 text-sm mt-1">Role: {role}</p>
          </CardContent>
        </Card>
      )}
      <Toaster />
    </div>
  );
}
