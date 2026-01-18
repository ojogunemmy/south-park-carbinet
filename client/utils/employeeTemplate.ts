import jsPDF from "jspdf";

export const generateEmployeeTemplate = () => {
  try {
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let yPosition = 10;
    const margin = 12;
    const contentWidth = pageWidth - 2 * margin;
    const fieldHeight = 7;

    // Helper function to draw a text field box
    const drawTextField = (x: number, y: number, width: number, label: string) => {
      pdf.setFontSize(9);
      pdf.setFont(undefined, "normal");
      pdf.text(label, x, y);
      pdf.rect(x, y + 1.5, width, fieldHeight);
    };

    // Header with company name
    pdf.setFontSize(18);
    pdf.setFont(undefined, "bold");
    pdf.text("EMPLOYEE INFORMATION FORM", margin, yPosition);
    yPosition += 8;

    pdf.setFontSize(10);
    pdf.setFont(undefined, "normal");
    pdf.text("South Park Cabinets", margin, yPosition);
    yPosition += 5;

    // Horizontal line
    pdf.setDrawColor(100);
    pdf.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 6;

    // Date field
    pdf.setFontSize(9);
    pdf.text("Date Completed:", margin, yPosition);
    pdf.rect(margin + 40, yPosition - 2, 40, fieldHeight);
    yPosition += 10;

    // SECTION 1: Basic Information
    pdf.setFontSize(11);
    pdf.setFont(undefined, "bold");
    pdf.setFillColor(220, 230, 245);
    pdf.rect(margin, yPosition - 4, contentWidth, 5, "F");
    pdf.text("SECTION 1: BASIC INFORMATION", margin + 2, yPosition);
    yPosition += 7;

    pdf.setFont(undefined, "normal");

    // Full Name
    drawTextField(margin, yPosition, contentWidth, "Full Legal Name *");
    yPosition += 11;

    // Phone and Email (two columns)
    const colWidth = (contentWidth - 3) / 2;
    drawTextField(margin, yPosition, colWidth, "Phone Number *");
    drawTextField(margin + colWidth + 3, yPosition, colWidth, "Email Address");
    yPosition += 11;

    // Home Address
    drawTextField(margin, yPosition, contentWidth, "Home Address (Street, City, State, ZIP) *");
    yPosition += 11;

    // Position and Start Date
    drawTextField(margin, yPosition, colWidth, "Position/Job Title *");
    drawTextField(margin + colWidth + 3, yPosition, colWidth, "Start Date *");
    yPosition += 11;

    // Date of Birth
    drawTextField(margin, yPosition, colWidth, "Date of Birth");
    yPosition += 11;

    yPosition += 2;

    // SECTION 2: Tax Information
    pdf.setFontSize(11);
    pdf.setFont(undefined, "bold");
    pdf.setFillColor(220, 230, 245);
    pdf.rect(margin, yPosition - 4, contentWidth, 5, "F");
    pdf.text("SECTION 2: TAX IDENTIFICATION", margin + 2, yPosition);
    yPosition += 7;

    pdf.setFontSize(9);
    pdf.setFont(undefined, "normal");
    pdf.text("(Required for payroll processing - provide at least one)", margin, yPosition);
    yPosition += 5;

    // SSN
    pdf.text("Social Security Number (SSN):", margin, yPosition);
    pdf.text("___  -  __  -  ____", margin + 75, yPosition);
    yPosition += 8;

    // ITIN
    pdf.text("Individual Tax ID Number (ITIN):", margin, yPosition);
    pdf.text("___  -  __  -  ____", margin + 75, yPosition);
    yPosition += 10;

    // SECTION 3: Payment Information
    pdf.setFontSize(11);
    pdf.setFont(undefined, "bold");
    pdf.setFillColor(220, 230, 245);
    pdf.rect(margin, yPosition - 4, contentWidth, 5, "F");
    pdf.text("SECTION 3: PAYMENT INFORMATION", margin + 2, yPosition);
    yPosition += 7;

    pdf.setFont(undefined, "normal");
    pdf.setFontSize(9);

    // Weekly Rate
    pdf.text("Weekly Rate: $", margin, yPosition);
    pdf.rect(margin + 40, yPosition - 2, 35, fieldHeight);
    yPosition += 10;

    // Payment Method
    pdf.text("Preferred Payment Method:", margin, yPosition);
    yPosition += 6;

    const checkboxSize = 3.5;
    const checkboxY = yPosition - 1;
    pdf.rect(margin, checkboxY, checkboxSize, checkboxSize);
    pdf.text("Cash", margin + 5, yPosition);

    pdf.rect(margin + 35, checkboxY, checkboxSize, checkboxSize);
    pdf.text("Check", margin + 40, yPosition);

    pdf.rect(margin + 65, checkboxY, checkboxSize, checkboxSize);
    pdf.text("Direct Deposit", margin + 70, yPosition);

    pdf.rect(margin + 110, checkboxY, checkboxSize, checkboxSize);
    pdf.text("Bank Transfer", margin + 115, yPosition);

    yPosition += 8;

    // Bank Information
    pdf.text("Bank Name:", margin, yPosition);
    pdf.rect(margin + 35, yPosition - 2, contentWidth - 35, fieldHeight);
    yPosition += 10;

    // Routing Number and Account Type (two columns)
    pdf.text("Routing Number:", margin, yPosition);
    pdf.rect(margin + 35, yPosition - 2, colWidth - 35, fieldHeight);

    pdf.text("Account Type:", margin + colWidth + 3, yPosition);
    pdf.rect(margin + colWidth + 38, yPosition - 2, colWidth - 38, fieldHeight);
    yPosition += 10;

    // Account Number
    pdf.text("Account Number:", margin, yPosition);
    pdf.rect(margin + 35, yPosition - 2, contentWidth - 35, fieldHeight);
    yPosition += 10;

    // Account Holder Name
    pdf.text("Account Holder Name:", margin, yPosition);
    pdf.rect(margin + 35, yPosition - 2, contentWidth - 35, fieldHeight);
    yPosition += 12;

    // Check if we need a new page
    if (yPosition > pageHeight - 40) {
      pdf.addPage();
      yPosition = 15;
    }

    // SECTION 4: Authorization
    pdf.setFontSize(11);
    pdf.setFont(undefined, "bold");
    pdf.setFillColor(220, 230, 245);
    pdf.rect(margin, yPosition - 4, contentWidth, 5, "F");
    pdf.text("SECTION 4: AUTHORIZATION & ACKNOWLEDGMENT", margin + 2, yPosition);
    yPosition += 7;

    pdf.setFontSize(8);
    pdf.setFont(undefined, "normal");
    const authText = "I certify that the information provided in this form is true and accurate. I understand that falsifying information may result in termination of employment. I authorize South Park Cabinets to verify employment eligibility and conduct background checks as permitted by law.";
    const splitText = pdf.splitTextToSize(authText, contentWidth);
    pdf.text(splitText, margin, yPosition);
    yPosition += splitText.length * 3.5 + 4;

    // Signature line
    pdf.setFontSize(9);
    pdf.line(margin, yPosition, margin + 50, yPosition);
    pdf.text("Employee Signature", margin, yPosition + 3);

    pdf.line(margin + 70, yPosition, margin + 120, yPosition);
    pdf.text("Date", margin + 75, yPosition + 3);

    yPosition += 10;

    // Print date footer
    pdf.setFontSize(7);
    pdf.setFont(undefined, "normal");
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Generated: ${new Date().toLocaleDateString()} | South Park Cabinets Employee Information Form`, margin, pageHeight - 5);

    pdf.save("Employee-Information-Template.pdf");
  } catch (error) {
    console.error("Error generating employee template:", error);
    alert(`Error generating template: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
};
