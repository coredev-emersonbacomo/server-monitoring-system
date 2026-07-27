import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface PdfField {
    label: string;
    value: string;
}

interface PdfSection {
    title: string;
    fields: PdfField[];
}

export function generateReportPdf(
    title: string,
    sections: PdfSection[],
    filename: string,
) {
    const doc = new jsPDF();
    let y = 20;

    doc.setFontSize(18);
    doc.text(title, 14, y);
    y += 6;
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(`Generated ${new Date().toLocaleString()}`, 14, y);
    doc.setTextColor(0);
    y += 10;

    sections.forEach((section) => {
        doc.setFontSize(13);
        doc.text(section.title, 14, y);
        y += 4;

        autoTable(doc, {
            startY: y,
            body: section.fields.map((f) => [f.label, f.value]),
            theme: "plain",
            styles: { fontSize: 10, cellPadding: 2 },
            columnStyles: { 0: { fontStyle: "bold", cellWidth: 50 } },
        });

        // @ts-expect-error jspdf-autotable attaches this at runtime
        y = doc.lastAutoTable.finalY + 10;
    });

    doc.save(filename);
}
