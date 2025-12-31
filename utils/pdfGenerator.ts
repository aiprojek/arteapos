
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import { CURRENCY_FORMATTER } from "../constants";
import type { Transaction, ReceiptSettings } from "../types";

export const generateSalesReportPDF = (
    transactions: Transaction[], 
    settings: ReceiptSettings, 
    periodLabel: string,
    summary: { totalSales: number; totalProfit: number; totalTransactions: number }
) => {
    // 1. Init Doc
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // 2. Header Section
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(settings.shopName.toUpperCase(), pageWidth / 2, 15, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(settings.address, pageWidth / 2, 22, { align: "center" });

    doc.line(10, 28, pageWidth - 10, 28);

    // 3. Report Info
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Laporan Penjualan", 14, 40);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Periode: ${periodLabel}`, 14, 46);
    doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 14, 52);

    // 4. Summary Box
    const summaryY = 60;
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(14, summaryY, pageWidth - 28, 25, 2, 2, 'F');
    
    doc.setFont("helvetica", "bold");
    doc.text("Total Omzet", 25, summaryY + 10);
    doc.text("Total Transaksi", pageWidth / 2, summaryY + 10, { align: 'center' });
    doc.text("Profit (Est.)", pageWidth - 25, summaryY + 10, { align: 'right' });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text(CURRENCY_FORMATTER.format(summary.totalSales), 25, summaryY + 18);
    doc.text(summary.totalTransactions.toString(), pageWidth / 2, summaryY + 18, { align: 'center' });
    doc.text(CURRENCY_FORMATTER.format(summary.totalProfit), pageWidth - 25, summaryY + 18, { align: 'right' });

    // 5. Transaction Table
    const tableColumn = ["Waktu", "ID Transaksi", "Pelanggan", "Item", "Status", "Total"];
    const tableRows: any[] = [];

    transactions.forEach(t => {
        const date = new Date(t.createdAt).toLocaleDateString('id-ID');
        const time = new Date(t.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        const itemsSummary = t.items.map(i => `${i.name} (${i.quantity})`).join(', ');
        
        const rowData = [
            `${date} ${time}`,
            t.id.slice(-6),
            t.customerName || 'Umum',
            itemsSummary,
            t.paymentStatus === 'paid' ? 'Lunas' : t.paymentStatus,
            CURRENCY_FORMATTER.format(t.total)
        ];
        tableRows.push(rowData);
    });

    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: summaryY + 35,
        theme: 'striped',
        headStyles: { fillColor: [52, 119, 88] }, // #347758 (Artea Brand Color)
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
            0: { cellWidth: 30 }, // Waktu
            1: { cellWidth: 20 }, // ID
            2: { cellWidth: 30 }, // Pelanggan
            3: { cellWidth: 'auto' }, // Items
            4: { cellWidth: 20 }, // Status
            5: { cellWidth: 30, halign: 'right' }, // Total
        },
    });

    // 6. Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    doc.setFontSize(8);
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.text(`Halaman ${i} dari ${pageCount} - Dibuat oleh Artea POS`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: "center" });
    }

    // 7. Save
    const fileName = `Laporan_Penjualan_${periodLabel.replace(/\s/g, '_')}_${new Date().getTime()}.pdf`;
    doc.save(fileName);
};

// --- NEW: Generic Generator for Finance Tables ---
export const generateTablePDF = (
    title: string,
    headers: string[],
    rows: (string | number)[][],
    settings: ReceiptSettings,
    orientation: 'p' | 'l' = 'p' // Portrait or Landscape
) => {
    const doc = new jsPDF({ orientation });
    const pageWidth = doc.internal.pageSize.width;

    // Header
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(settings.shopName.toUpperCase(), pageWidth / 2, 15, { align: "center" });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(settings.address, pageWidth / 2, 20, { align: "center" });
    doc.line(10, 25, pageWidth - 10, 25);

    // Title & Info
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(title, 14, 35);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 14, 41);

    // Table
    autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 45,
        theme: 'striped',
        headStyles: { fillColor: [52, 119, 88] },
        styles: { fontSize: 9, cellPadding: 2 },
    });

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    doc.setFontSize(8);
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.text(`Halaman ${i} dari ${pageCount} - Dibuat oleh Artea POS`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: "center" });
    }

    const fileName = `${title.replace(/\s/g, '_')}_${new Date().getTime()}.pdf`;
    doc.save(fileName);
};
