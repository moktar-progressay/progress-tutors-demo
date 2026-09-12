export type PaymentDocumentType = "childcare" | "invoice";

export interface PaymentDocumentData {
  type: PaymentDocumentType;
  parentName: string;
  parentEmail: string;
  studentName: string;
  documentDate: string;
  reference: string;
  service: string;
  hours: string;
  fromDate: string;
  untilDate: string;
  rate: string;
  total: string;
  dueDate: string;
  paymentLink: string;
  notes: string;
}

const pdfText = (value: string) =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/£/g, "\\243")
    .replace(/[^\x20-\x7e\\]/g, "");

const displayDate = (value: string) => {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
};

function makeContent(data: PaymentDocumentData) {
  const commands: string[] = [];
  const text = (value: string, x: number, y: number, size = 10, bold = false) => {
    commands.push(`BT /${bold ? "F2" : "F1"} ${size} Tf ${x} ${y} Td (${pdfText(value)}) Tj ET`);
  };
  const line = (x1: number, y1: number, x2: number, y2: number, width = 1) =>
    commands.push(`${width} w ${x1} ${y1} m ${x2} ${y2} l S`);
  const box = (x: number, y: number, width: number, height: number, fill = false) =>
    commands.push(`${x} ${y} ${width} ${height} re ${fill ? "f" : "S"}`);
  const wrap = (value: string, x: number, y: number, max = 82, size = 10, gap = 15) => {
    const words = value.split(/\s+/);
    let row = "";
    let offset = 0;
    for (const word of words) {
      if (`${row} ${word}`.trim().length > max) {
        text(row, x, y - offset, size);
        row = word;
        offset += gap;
      } else row = `${row} ${word}`.trim();
    }
    if (row) text(row, x, y - offset, size);
    return y - offset;
  };

  commands.push("0.94 0.18 0.45 rg 0 790 595 52 re f");
  commands.push("1 1 1 rg");
  text(data.type === "invoice" ? "INVOICE" : "CHILDCARE PAYMENT CONFIRMATION", 42, 807, 20, true);
  commands.push("0 0 0 rg");
  text("Progressay Impact CIC", 42, 758, 10, true);
  text("196 Freston Road", 42, 744);
  text("London, W10 6TT", 42, 730);
  text("info@progresay.com  |  07498 945898", 42, 716);
  text(data.parentName || "Parent name", 370, 758, 11, true);
  text(data.parentEmail || "Parent email", 370, 743);
  text(`Date: ${displayDate(data.documentDate)}`, 370, 721);

  if (data.type === "invoice") {
    text(`Invoice: ${data.reference || "Draft"}`, 42, 675, 13, true);
    text(`Due: ${displayDate(data.dueDate)}`, 370, 675, 11, true);
    text("Bill to", 42, 642, 10, true);
    text(data.parentName || "Parent name", 42, 626);
    text(data.studentName ? `For: ${data.studentName}` : "", 42, 611);
    commands.push("0.96 0.96 0.97 rg");
    box(42, 535, 511, 48, true);
    commands.push("0 0 0 rg");
    text("Service", 52, 564, 9, true);
    text("Period", 235, 564, 9, true);
    text("Amount", 485, 564, 9, true);
    text(data.service || "Tuition", 52, 544, 10);
    text(`${displayDate(data.fromDate)} - ${displayDate(data.untilDate)}`, 235, 544, 10);
    text(data.total || "£0", 485, 544, 10, true);
    line(380, 500, 553, 500);
    text("Total", 400, 476, 12, true);
    text(data.total || "£0", 495, 476, 14, true);
    if (data.paymentLink) {
      commands.push("0.94 0.18 0.45 rg");
      box(350, 417, 203, 36, true);
      commands.push("1 1 1 rg");
      text("PAY ONLINE", 414, 430, 12, true);
      commands.push("0 0 0 rg");
      wrap(`Payment link: ${data.paymentLink}`, 350, 397, 42, 8, 11);
    }
    if (data.notes) {
      text("Notes", 42, 450, 10, true);
      wrap(data.notes, 42, 433, 78, 9, 13);
    }
  } else {
    text(`Reference: ${data.reference || "URN: 2801807"}`, 330, 674, 11, true);
    text(`Dear ${data.parentName || "Parent"},`, 42, 674, 11);
    text("Re: CHILDCARE CONFIRMATION FOR UNIVERSAL CREDIT", 42, 632, 12, true);
    let y = wrap(
      "We confirm that the child named below attends our OFSTED registered childcare provision and that the charges shown relate to their childcare.",
      42,
      607,
    );
    box(42, y - 54, 511, 42);
    text(data.studentName || "Student name", 54, y - 38, 11, true);
    y -= 86;
    text("Payment details", 42, y, 11, true);
    commands.push("0.96 0.96 0.97 rg");
    box(42, y - 68, 511, 48, true);
    commands.push("0 0 0 rg");
    text("Service", 52, y - 39, 8, true);
    text("Hours", 180, y - 39, 8, true);
    text("From", 235, y - 39, 8, true);
    text("Until", 325, y - 39, 8, true);
    text("Rate", 415, y - 39, 8, true);
    text("Total", 500, y - 39, 8, true);
    text(data.service || "Childcare", 52, y - 59, 9);
    text(data.hours || "-", 180, y - 59, 9);
    text(displayDate(data.fromDate), 235, y - 59, 9);
    text(displayDate(data.untilDate), 325, y - 59, 9);
    text(data.rate || "-", 415, y - 59, 9);
    text(data.total || "£0", 500, y - 59, 9, true);
    text("Yours sincerely,", 42, y - 118, 10);
    text("Moktar Alqaderi (PGCE, QTS)", 42, y - 151, 10, true);
    text("CEO, Progressay", 42, y - 167, 10);
  }

  line(42, 78, 553, 78, 0.5);
  text("Progressay Impact CIC | Company number 12294686 | www.progressayimpact.co.uk", 72, 58, 8);
  return commands.join("\n");
}

export function buildPaymentPdf(data: PaymentDocumentData) {
  const content = makeContent(data);
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= objects.length; index += 1)
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Uint8Array(Array.from(pdf, (character) => character.charCodeAt(0) & 0xff));
}

export function downloadPaymentDocument(data: PaymentDocumentData) {
  const bytes = buildPaymentPdf(data);
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${data.type === "invoice" ? "invoice" : "childcare-confirmation"}-${(data.reference || "draft").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
