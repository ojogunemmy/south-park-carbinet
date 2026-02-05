import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Edit } from "lucide-react";
import jsPDF from "jspdf";
import { useState, useEffect } from "react";
import { useYear } from "@/contexts/YearContext";
import { getYearData, shouldUseExampleData } from "@/utils/yearStorage";
import { Badge } from "@/components/ui/badge";
import { employeesService, settingsService } from "@/lib/supabase-service";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface Employee {
  id: string;
  name: string;
  position: string;
  weeklyRate: number;
  startDate: string;
  ssn?: string;
  address?: string;
  telephone?: string;
  email?: string;
  paymentStatus?: "active" | "paused" | "leaving";
}

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

const exampleEmployees: Employee[] = [
  {
    id: "EMP-001",
    name: "John Smith",
    position: "Cabinet Maker",
    weeklyRate: 850,
    startDate: "2025-01-15",
    ssn: "123-45-6789",
    address: "123 Main St, Denver, CO 80202",
    telephone: "(303) 555-0123",
    email: "john.smith@example.com",
    paymentStatus: "active",
  },
  {
    id: "EMP-002",
    name: "Maria Garcia",
    position: "Lead Designer",
    weeklyRate: 950,
    startDate: "2025-02-01",
    ssn: "987-65-4321",
    address: "456 Oak Ave, Denver, CO 80203",
    telephone: "(303) 555-0456",
    email: "maria.garcia@example.com",
    paymentStatus: "active",
  },
  {
    id: "EMP-003",
    name: "Robert Johnson",
    position: "Installation Specialist",
    weeklyRate: 900,
    startDate: "2025-03-10",
    ssn: "456-78-9012",
    address: "789 Elm St, Denver, CO 80204",
    telephone: "(303) 555-0789",
    email: "robert.johnson@example.com",
    paymentStatus: "active",
  },
];

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

export default function WorkLetters() {
  const { selectedYear } = useYear();

  const [employees, setEmployees] = useState<Employee[]>(() =>
    shouldUseExampleData(selectedYear) ? exampleEmployees : [],
  );
  const [companySettings, setCompanySettings] =
    useState<CompanySettings>(defaultSettings);
  const [filterStatus, setFilterStatus] = useState<
    "all" | "active" | "paused" | "leaving"
  >("active");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedEmployeeForPreview, setSelectedEmployeeForPreview] =
    useState<Employee | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedEmployeeForEdit, setSelectedEmployeeForEdit] =
    useState<Employee | null>(null);
  const [customLetterContent, setCustomLetterContent] = useState<string>("");
  const [employeeCustomContent, setEmployeeCustomContent] = useState<Record<string, string>>({});

  // Map DB employee shape to UI Employee
  const mapDbEmployee = (dbEmp: any): Employee => {
    return {
      id: dbEmp.id,
      name: dbEmp.name || dbEmp.client_name || "",
      position: dbEmp.position || dbEmp.project_name || "",
      weeklyRate: (dbEmp.weekly_rate ?? dbEmp.weeklyRate ?? 0) as number,
      startDate:
        dbEmp.hire_date || dbEmp.payment_start_date || dbEmp.start_date || "",
      ssn: dbEmp.ssn ?? undefined,
      address: dbEmp.address ?? dbEmp.client_address ?? undefined,
      telephone: dbEmp.telephone ?? dbEmp.client_phone ?? undefined,
      email: dbEmp.email ?? undefined,
      paymentStatus: (dbEmp.payment_status as any) ?? undefined,
    };
  };

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const dbEmployees = await employeesService.getAll();
        if (!mounted) return;
        if (Array.isArray(dbEmployees) && dbEmployees.length > 0) {
          setEmployees(dbEmployees.map(mapDbEmployee));
        } else if (shouldUseExampleData(selectedYear)) {
          setEmployees(exampleEmployees);
        } else {
          setEmployees([]);
        }
      } catch (e) {
        console.error("Failed to load employees:", e);
        if (shouldUseExampleData(selectedYear)) {
          setEmployees(exampleEmployees);
        }
      }

      try {
        const dbSettings = await settingsService.get();
        if (!mounted) return;
        if (dbSettings) {
          setCompanySettings({
            companyName: dbSettings.company_name ?? defaultSettings.companyName,
            companyAddress:
              dbSettings.company_address ?? defaultSettings.companyAddress,
            companyCity: "",
            companyState: "",
            companyZip: "",
            companyPhone:
              dbSettings.company_phone ?? defaultSettings.companyPhone,
            bankName: dbSettings.bank_name ?? defaultSettings.bankName,
            routingNumber:
              dbSettings.routing_number ?? defaultSettings.routingNumber,
            accountNumber:
              dbSettings.account_number ?? defaultSettings.accountNumber,
            checkStartNumber:
              dbSettings.check_start_number ?? defaultSettings.checkStartNumber,
          });
        }
      } catch (e) {
        console.error("Failed to load company settings:", e);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [selectedYear]);

  const filteredEmployees = employees.filter((emp) => {
    return filterStatus === "all" || emp.paymentStatus === filterStatus;
  });

  const formatDateLocal = (dateString: string): string => {
    // Parse the date string manually to avoid timezone shifts
    const [year, month, day] = dateString.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const generateWorkLetter = (employee: Employee) => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const marginX = 20;
    const marginY = 20;
    let currentY = marginY;

    // Company header with logo
    const logoUrl =
      "https://cdn.builder.io/api/v1/image/assets%2F3547a9037a984aba998732807b68708a%2F7f430a7dbbc44354874eceaa0ea0936c?format=webp&width=200";
    try {
      doc.addImage(logoUrl, "WEBP", pageWidth / 2 - 25, currentY, 50, 25);
      currentY += 30;
    } catch (e) {
      // If image fails to load, skip it
      currentY += 5;
    }

    // Company name
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.setFont(undefined, "bold");
    doc.text("South Park Cabinets INC", pageWidth / 2, currentY, {
      align: "center",
    });
    currentY += 6;

    // Address and phone
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.setFont(undefined, "normal");
    doc.text("511 Scholtz Road, Charlotte NC 28217", pageWidth / 2, currentY, {
      align: "center",
    });
    currentY += 4;
    doc.text("Tel: 704 649 8265", pageWidth / 2, currentY, { align: "center" });
    currentY += 8;

    // Horizontal line separator
    doc.setDrawColor(100, 100, 100);
    doc.line(marginX, currentY, pageWidth - marginX, currentY);
    currentY += 8;

    // Date
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    const today = new Date();
    const formattedDate = today.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    doc.text(`Date: ${formattedDate}`, marginX, currentY);
    currentY += 12;

    // Employee address
    if (employee.address) {
      doc.text(employee.name, marginX, currentY);
      currentY += 6;
      doc.text(employee.address, marginX, currentY);
      currentY += 12;
    } else {
      doc.text(employee.name, marginX, currentY);
      currentY += 12;
    }

    // Salutation
    doc.setFontSize(11);
    doc.text("To Whom It May Concern,", marginX, currentY);
    currentY += 10;

    // Body of letter
    doc.setFontSize(10);
    const customContent = employeeCustomContent[employee.id];
    const bodyText = customContent 
      ? customContent.split('\n')
      : [
          `This letter is to certify that ${employee.name} has been employed as a ${employee.position}.`,
          "",
          `Employment Status: Full-time Employee`,
          `Start Date: ${formatDateLocal(employee.startDate)}`,
          `Current Position: ${employee.position}`,
          `Annual Compensation: $${(employee.weeklyRate * 52).toLocaleString("en-US", { maximumFractionDigits: 2 })}`,
          "",
          `${employee.name} has been a valuable and responsible member of our team. The information provided in this letter is accurate to the best of our knowledge.`,
          "",
          `This letter is issued for ${employee.name}'s use in personal matters and is valid for official purposes. Please feel free to contact us should you require any additional information.`,
        ];

    bodyText.forEach((line) => {
      if (line === "") {
        currentY += 4;
      } else {
        const splitText = doc.splitTextToSize(line, pageWidth - 2 * marginX);
        splitText.forEach((text: string) => {
          doc.text(text, marginX, currentY);
          currentY += 5;
        });
      }
    });

    currentY += 8;

    // Signature section
    doc.text("Sincerely,", marginX, currentY);
    currentY += 15;

    doc.text("_________________________________", marginX, currentY);
    currentY += 6;

    doc.setFontSize(9);
    doc.text("Authorized Signature", marginX, currentY);
    currentY += 6;

    doc.setFontSize(10);
    doc.text("South Park Cabinets", marginX, currentY);

    // Download the PDF
    const fileName = `${employee.name.replace(/\s+/g, "_")}_Work_Letter.pdf`;
    doc.save(fileName);
  };

  const handlePreviewLetter = (employee: Employee) => {
    setSelectedEmployeeForPreview(employee);
    setIsPreviewOpen(true);
  };

  const handleEditLetter = (employee: Employee) => {
    setSelectedEmployeeForEdit(employee);
    setCustomLetterContent(employeeCustomContent[employee.id] || getDefaultLetterContent(employee));
    setIsEditOpen(true);
  };

  const getDefaultLetterContent = (employee: Employee): string => {
    return `This letter is to certify that ${employee.name} has been employed as a ${employee.position}.

Employment Status: Full-time Employee
Start Date: ${formatDateLocal(employee.startDate)}
Current Position: ${employee.position}
Annual Compensation: $${(employee.weeklyRate * 52).toLocaleString("en-US", { maximumFractionDigits: 2 })}

${employee.name} has been a valuable and responsible member of our team. The information provided in this letter is accurate to the best of our knowledge.

This letter is issued for ${employee.name}'s use in personal matters and is valid for official purposes. Please feel free to contact us should you require any additional information.`;
  };

  const handleSaveCustomContent = () => {
    if (selectedEmployeeForEdit) {
      const defaultContent = getDefaultLetterContent(selectedEmployeeForEdit);
      const isDefaultOrEmpty = !customLetterContent.trim() || customLetterContent.trim() === defaultContent.trim();

      setEmployeeCustomContent(prev => {
        const newContent = { ...prev };
        if (isDefaultOrEmpty) {
          delete newContent[selectedEmployeeForEdit.id];
        } else {
          newContent[selectedEmployeeForEdit.id] = customLetterContent;
        }
        return newContent;
      });
      setIsEditOpen(false);
      setSelectedEmployeeForEdit(null);
    }
  };

  const handleRemoveCustomContent = () => {
    if (selectedEmployeeForEdit) {
      setEmployeeCustomContent(prev => {
        const newContent = { ...prev };
        delete newContent[selectedEmployeeForEdit.id];
        return newContent;
      });
      setCustomLetterContent("");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Work Letters</h1>
        <p className="text-slate-600 mt-1">
          Generate and download employment verification letters for employees
        </p>
      </div>

      {/* Filter Section */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg">Filter Employees</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="min-w-48">
              <label className="text-sm font-medium text-slate-700 block mb-2">
                Employment Status
              </label>
              <Select
                value={filterStatus}
                onValueChange={(value: any) => setFilterStatus(value)}
              >
                <SelectTrigger className="border-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="leaving">Leaving</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Work Letters List */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg">Available Employees</CardTitle>
          <CardDescription>
            {filteredEmployees.length} employee
            {filteredEmployees.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredEmployees.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600">
                No employees found matching the selected filters.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
              {filteredEmployees.map((employee) => (
                <Card
                  key={employee.id}
                  className="border-slate-200 hover:border-slate-300 transition-colors"
                >
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div>
                        <h3 className="font-semibold text-slate-900">
                          {employee.name}
                        </h3>
                        <p className="text-sm text-slate-600">
                          {employee.position}
                        </p>
                      </div>

                      <div className="text-sm text-slate-600 space-y-1">
                        <p>
                          <span className="font-medium">Employee ID:</span>{" "}
                          {employee.id}
                        </p>
                        <p>
                          <span className="font-medium">Start Date:</span>{" "}
                          {(() => {
                            const [year, month, day] = employee.startDate
                              .split("-")
                              .map(Number);
                            const date = new Date(year, month - 1, day);
                            return date.toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            });
                          })()}
                        </p>
                        {employee.email && (
                          <p>
                            <span className="font-medium">Email:</span>{" "}
                            {employee.email}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Badge
                          variant={
                            employee.paymentStatus === "active"
                              ? "default"
                              : employee.paymentStatus === "paused"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {employee.paymentStatus || "active"}
                        </Badge>
                        {employeeCustomContent[employee.id] && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            Custom Letter
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-slate-300 w-full justify-center"
                          onClick={() => handlePreviewLetter(employee)}
                        >
                          <FileText className="w-3.5 h-3.5 mr-1.5" />
                          Preview
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-slate-300 w-full justify-center"
                          onClick={() => handleEditLetter(employee)}
                        >
                          <Edit className="w-3.5 h-3.5 mr-1.5" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white w-full justify-center"
                          onClick={() => generateWorkLetter(employee)}
                        >
                          <Download className="w-3.5 h-3.5 mr-1.5" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Work Letter Preview</DialogTitle>
            <DialogDescription>
              {selectedEmployeeForPreview &&
                `Preview for ${selectedEmployeeForPreview.name}`}
            </DialogDescription>
          </DialogHeader>

          {selectedEmployeeForPreview && (
            <div className="bg-white p-8 border border-slate-200 rounded-lg">
              <div className="text-center mb-8 pb-6 border-b border-slate-300">
                <div className="mb-4 flex items-center justify-center">
                  <img
                    src="https://cdn.builder.io/api/v1/image/assets%2F3547a9037a984aba998732807b68708a%2F7f430a7dbbc44354874eceaa0ea0936c?format=webp&width=200"
                    alt="South Park Cabinets Logo"
                    className="h-24 object-contain"
                  />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">
                  South Park Cabinets INC
                </h2>
                <p className="text-slate-600 text-sm font-semibold">
                  511 Scholtz Road, Charlotte NC 28217
                </p>
                <p className="text-slate-600 text-sm">Tel: 704 649 8265</p>
              </div>

              <div className="mb-8">
                <p className="text-sm">
                  <span className="font-semibold">Date:</span>{" "}
                  {new Date().toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>

              <div className="mb-8">
                <p className="font-semibold">
                  {selectedEmployeeForPreview.name}
                </p>
                {selectedEmployeeForPreview.address && (
                  <p className="text-sm text-slate-600">
                    {selectedEmployeeForPreview.address}
                  </p>
                )}
              </div>

              <p className="mb-6">To Whom It May Concern,</p>

              <div className="space-y-4 text-sm leading-relaxed">
                {employeeCustomContent[selectedEmployeeForPreview.id] ? (
                  <div className="whitespace-pre-line">
                    {employeeCustomContent[selectedEmployeeForPreview.id]}
                  </div>
                ) : (
                  <>
                    <p>
                      This letter is to certify that{" "}
                      {selectedEmployeeForPreview.name} has been employed as a{" "}
                      {selectedEmployeeForPreview.position}.
                    </p>

                    <div className="bg-slate-50 p-4 rounded">
                      <p>
                        <span className="font-semibold">Employment Status:</span>{" "}
                        Full-time Employee
                      </p>
                      <p>
                        <span className="font-semibold">Start Date:</span>{" "}
                        {formatDateLocal(selectedEmployeeForPreview.startDate)}
                      </p>
                      <p>
                        <span className="font-semibold">Current Position:</span>{" "}
                        {selectedEmployeeForPreview.position}
                      </p>
                      <p>
                        <span className="font-semibold">Annual Compensation:</span>{" "}
                        $
                        {(
                          selectedEmployeeForPreview.weeklyRate * 52
                        ).toLocaleString("en-US", {
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>

                    <p>
                      {selectedEmployeeForPreview.name} has been a valuable and
                      responsible member of our team. The information provided in
                      this letter is accurate to the best of our knowledge.
                    </p>

                    <p>
                      This letter is issued for {selectedEmployeeForPreview.name}'s
                      use in personal matters and is valid for official purposes.
                      Please feel free to contact us should you require any
                      additional information.
                    </p>
                  </>
                )}
              </div>

              <div className="mt-8">
                <p className="mb-6">Sincerely,</p>
                <div className="mb-2">
                  <div className="border-t border-slate-400 w-32 mb-1" />
                  <p className="text-xs font-semibold">Authorized Signature</p>
                </div>
                <p className="font-semibold">South Park Cabinets</p>
              </div>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <Button
              variant="outline"
              className="flex-1 border-slate-300"
              onClick={() => setIsPreviewOpen(false)}
            >
              Close
            </Button>
            {selectedEmployeeForPreview && (
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => {
                  generateWorkLetter(selectedEmployeeForPreview);
                  setIsPreviewOpen(false);
                }}
              >
                <Download className="w-3.5 h-3.5 mr-2" />
                Download PDF
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Letter Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Work Letter</DialogTitle>
            <DialogDescription>
              {selectedEmployeeForEdit &&
                `Customize the letter content for ${selectedEmployeeForEdit.name}`}
            </DialogDescription>
          </DialogHeader>

          {selectedEmployeeForEdit && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">
                  Letter Content
                </label>
                <Textarea
                  value={customLetterContent}
                  onChange={(e) => setCustomLetterContent(e.target.value)}
                  placeholder="Enter custom letter content..."
                  className="min-h-[300px] font-mono text-sm"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Use line breaks for paragraphs. The content will be formatted in the PDF.
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCustomLetterContent(getDefaultLetterContent(selectedEmployeeForEdit))}
                >
                  Reset to Default
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveCustomContent}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  Remove Custom Content
                </Button>
              </div>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <Button
              variant="outline"
              className="flex-1 border-slate-300"
              onClick={() => setIsEditOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleSaveCustomContent}
            >
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
