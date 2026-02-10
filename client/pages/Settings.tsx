import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { useYear } from "@/contexts/YearContext";
import { getYearData, saveYearData } from "@/utils/yearStorage";
import jsPDF from "jspdf";

interface CompanySettings {
  companyName: string;
  companyAddress: string;
  companyCity: string;
  companyState: string;
  companyZip: string;
  companyPhone: string;
  bankName: string;
  routingNumber: string;
  accountNumber: string;
  checkStartNumber: number;
}

const defaultSettings: CompanySettings = {
  companyName: "Your Company Name",
  companyAddress: "123 Business Ave",
  companyCity: "Denver",
  companyState: "CO",
  companyZip: "80202",
  companyPhone: "(303) 555-0000",
  bankName: "Wells Fargo",
  routingNumber: "121000248",
  accountNumber: "1234567890",
  checkStartNumber: 1001,
};

export default function Settings() {
  const { selectedYear } = useYear();

  const [settings, setSettings] = useState<CompanySettings>(() => {
    const saved = getYearData<CompanySettings>("companySettings", selectedYear, null);
    if (saved) {
      try {
        return saved;
      } catch {
        return defaultSettings;
      }
    }
    return defaultSettings;
  });

  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    saveYearData("companySettings", selectedYear, settings);
    setIsSaved(true);
    const timer = setTimeout(() => setIsSaved(false), 2000);
    return () => clearTimeout(timer);
  }, [settings, selectedYear]);

  const handleChange = (field: keyof CompanySettings, value: string | number) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleClearAllData = () => {
    if (window.confirm("⚠️ This will permanently delete ALL employees, payments, and absence records. This cannot be undone. Continue?")) {
      localStorage.removeItem("employees");
      localStorage.removeItem("weeklyPayments");
      localStorage.removeItem("employeeAbsences");
      window.location.href = "/";
    }
  };

  const generateSettingsPDF = () => {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    let yPosition = 20;

    // Header
    pdf.setFillColor(31, 41, 55);
    pdf.rect(0, 0, pageWidth, 30, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(24);
    pdf.setFont(undefined, 'bold');
    pdf.text('SOUTH PARK CABINETS', margin, 15);
    pdf.setFontSize(14);
    pdf.setFont(undefined, 'normal');
    pdf.text('Company Settings Report', margin, 25);
    pdf.setTextColor(0, 0, 0);

    yPosition = 45;

    // Company Information Section
    pdf.setFontSize(16);
    pdf.setFont(undefined, 'bold');
    pdf.text('Company Information', margin, yPosition);
    yPosition += 10;

    pdf.setFontSize(12);
    pdf.setFont(undefined, 'normal');
    const companyInfo = [
      { label: 'Company Name:', value: settings.companyName },
      { label: 'Address:', value: settings.companyAddress },
      { label: 'City:', value: `${settings.companyCity}, ${settings.companyState} ${settings.companyZip}` },
      { label: 'Phone:', value: settings.companyPhone }
    ];

    companyInfo.forEach((info) => {
      pdf.setFont(undefined, 'bold');
      pdf.text(info.label, margin, yPosition);
      pdf.setFont(undefined, 'normal');
      pdf.text(info.value, margin + 50, yPosition);
      yPosition += 8;
    });

    yPosition += 10;

    // Bank Information Section
    pdf.setFontSize(16);
    pdf.setFont(undefined, 'bold');
    pdf.text('Bank Information', margin, yPosition);
    yPosition += 10;

    pdf.setFontSize(12);
    pdf.setFont(undefined, 'normal');
    const bankInfo = [
      { label: 'Bank Name:', value: settings.bankName },
      { label: 'Routing Number:', value: settings.routingNumber },
      { label: 'Account Number:', value: `••••••••${settings.accountNumber.slice(-4)}` },
      { label: 'Starting Check Number:', value: settings.checkStartNumber.toString() }
    ];

    bankInfo.forEach((info) => {
      pdf.setFont(undefined, 'bold');
      pdf.text(info.label, margin, yPosition);
      pdf.setFont(undefined, 'normal');
      pdf.text(info.value, margin + 50, yPosition);
      yPosition += 8;
    });

    // Footer
    const footerY = pageHeight - 15;
    pdf.setFontSize(10);
    pdf.setTextColor(150, 150, 150);
    pdf.text(`Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, margin, footerY);

    pdf.save(`Company-Settings-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-600 mt-1">Configure company information for checks and payments</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Company Information */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
            <CardDescription>Your business details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={settings.companyName}
                onChange={(e) => handleChange("companyName", e.target.value)}
                className="border-slate-300"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyAddress">Street Address</Label>
              <Input
                id="companyAddress"
                value={settings.companyAddress}
                onChange={(e) => handleChange("companyAddress", e.target.value)}
                className="border-slate-300"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-2">
                <Label htmlFor="companyCity">City</Label>
                <Input
                  id="companyCity"
                  value={settings.companyCity}
                  onChange={(e) => handleChange("companyCity", e.target.value)}
                  className="border-slate-300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyState">State</Label>
                <Input
                  id="companyState"
                  maxLength={2}
                  value={settings.companyState}
                  onChange={(e) => handleChange("companyState", e.target.value.toUpperCase())}
                  className="border-slate-300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyZip">ZIP</Label>
                <Input
                  id="companyZip"
                  value={settings.companyZip}
                  onChange={(e) => handleChange("companyZip", e.target.value)}
                  className="border-slate-300"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyPhone">Phone Number</Label>
              <Input
                id="companyPhone"
                value={settings.companyPhone}
                onChange={(e) => handleChange("companyPhone", e.target.value)}
                className="border-slate-300"
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
              <Label htmlFor="bankName">Bank Name</Label>
              <Input
                id="bankName"
                value={settings.bankName}
                onChange={(e) => handleChange("bankName", e.target.value)}
                className="border-slate-300"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="routingNumber">Routing Number</Label>
              <Input
                id="routingNumber"
                value={settings.routingNumber}
                onChange={(e) => handleChange("routingNumber", e.target.value)}
                className="border-slate-300"
                placeholder="9-digit routing number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountNumber">Account Number</Label>
              <Input
                id="accountNumber"
                type="password"
                value={settings.accountNumber}
                onChange={(e) => handleChange("accountNumber", e.target.value)}
                className="border-slate-300"
                placeholder="Account number (masked)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="checkStartNumber">Starting Check Number</Label>
              <Input
                id="checkStartNumber"
                type="number"
                value={settings.checkStartNumber}
                onChange={(e) => handleChange("checkStartNumber", parseInt(e.target.value))}
                className="border-slate-300"
                min="1"
              />
            </div>

            {isSaved && (
              <div className="p-3 bg-green-50 border border-green-200 rounded text-sm text-green-800">
                ✓ Settings saved automatically
              </div>
            )}
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
            <div className="font-bold">{settings.companyName}</div>
            <div>{settings.companyAddress}</div>
            <div>{settings.companyCity}, {settings.companyState} {settings.companyZip}</div>
            <div>{settings.companyPhone}</div>
            <div className="mt-3 pt-3 border-t border-slate-300">
              Bank: {settings.bankName}
            </div>
            <div>Routing: {settings.routingNumber}</div>
            <div>Account: •••••••••••{settings.accountNumber.slice(-4)}</div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle>Export Settings</CardTitle>
          <CardDescription>Download company settings as PDF</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={generateSettingsPDF}
            className="bg-slate-600 hover:bg-slate-700"
          >
            Export Settings PDF
          </Button>
        </CardContent>
      </Card>

      <Card className="border-red-300 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-900">Danger Zone</CardTitle>
          <CardDescription className="text-red-700">Permanently delete all data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-red-800">
            Clearing all data will delete all employees, payments, absence records, and other transaction data. This action cannot be undone.
          </p>
          <Button
            onClick={handleClearAllData}
            className="bg-red-600 hover:bg-red-700 w-full"
          >
            Clear All Data
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
