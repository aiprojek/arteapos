
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import { CURRENCY_FORMATTER } from "../constants";
import type { Transaction, ReceiptSettings } from "../types";
import { Capacitor } from '@capacitor/core';
import { saveBinaryFileNative, shareFileNative } from './nativeHelper';

export const generateSalesReportPDF = async (
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
    // UPDATED: Added "Kasir" column
    const tableColumn = ["Waktu", "ID", "Kasir", "Pelanggan", "Item", "Status", "Bukti", "Total"];
    const tableRows: any[] = [];

    transactions.forEach(t => {
        const date = new Date(t.createdAt).toLocaleDateString('id-ID');
        const time = new Date(t.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        
        const itemsSummary = (t.items || []).map(i => `${i.name} (${i.quantity})`).join(', ');
        
        // Cari gambar bukti di dalam array payments
        const evidenceImg = (t.payments || []).find(p => p.evidenceImageUrl)?.evidenceImageUrl || '';

        const rowData = [
            `${date}\n${time}`, // Waktu (Multiline)
            t.id.slice(-4),     // ID (Short)
            t.userName || '-',  // Kasir
            t.customerName || 'Umum',
            itemsSummary,
            t.paymentStatus === 'paid' ? 'Lunas' : t.paymentStatus,
            evidenceImg, // Kolom Bukti (Raw Base64 string) - Akan dirender jadi gambar
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
        styles: { fontSize: 8, cellPadding: 2, valign: 'middle' },
        columnStyles: {
            0: { cellWidth: 20 }, // Waktu
            1: { cellWidth: 15 }, // ID
            2: { cellWidth: 20 }, // Kasir (NEW)
            3: { cellWidth: 20 }, // Pelanggan
            4: { cellWidth: 'auto' }, // Items
            5: { cellWidth: 15 }, // Status
            6: { cellWidth: 15, halign: 'center' }, // Bukti (Image Slot)
            7: { cellWidth: 25, halign: 'right' }, // Total
        },
        didDrawCell: (data) => {
            // Hook untuk menggambar gambar di kolom ke-6 (index 6 = 'Bukti')
            if (data.column.index === 6 && data.cell.section === 'body') {
                const base64Img = data.cell.raw as string;
                if (base64Img && base64Img.startsWith('data:image')) {
                    // Dimensi Cell
                    const dim = data.cell.height - 2; // Padding 1px
                    const x = data.cell.x + (data.cell.width - dim) / 2;
                    const y = data.cell.y + 1;
                    
                    try {
                        doc.addImage(base64Img, 'JPEG', x, y, dim, dim);
                    } catch (e) {
                        // Ignore image error
                    }
                }
            }
        },
        didParseCell: (data) => {
            // Kosongkan teks di kolom bukti agar tidak menumpuk dengan gambar
            if (data.column.index === 6 && data.cell.section === 'body') {
                if (data.cell.raw && (data.cell.raw as string).startsWith('data:image')) {
                    data.cell.text = []; // Clear text content
                } else {
                    data.cell.text = ['-'];
                }
            }
        }
    });

    // 6. Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    doc.setFontSize(8);
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.text(`Halaman ${i} dari ${pageCount} - Dibuat oleh Artea POS`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: "center" });
    }

    // 7. Save / Share (Native Support)
    const fileName = `Laporan_Penjualan_${periodLabel.replace(/\s/g, '_')}_${new Date().getTime()}.pdf`;
    
    if (Capacitor.isNativePlatform()) {
        try {
            const base64PDF = doc.output('datauristring').split(',')[1];
            await saveBinaryFileNative(fileName, base64PDF);
            await shareFileNative(fileName, base64PDF, 'Laporan Penjualan');
        } catch (e: any) {
            alert(`Gagal menyimpan PDF: ${e.message}`);
        }
    } else {
        doc.save(fileName);
    }
};

// --- Generic Generator for Finance Tables (Updated to support Images) ---
export const generateTablePDF = async (
    title: string,
    headers: string[],
    rows: (string | number)[][],
    settings: ReceiptSettings,
    orientation: 'p' | 'l' = 'p', // Portrait or Landscape
    imageColumnIndex: number = -1 // New Parameter: If >= 0, this column contains base64 images
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
        styles: { fontSize: 9, cellPadding: 2, valign: 'middle' },
        didDrawCell: (data) => {
            // Draw image if column matches and content is base64
            if (imageColumnIndex >= 0 && data.column.index === imageColumnIndex && data.cell.section === 'body') {
                const base64Img = data.cell.raw as string;
                if (base64Img && base64Img.startsWith('data:image')) {
                    const dim = data.cell.height - 2; 
                    const x = data.cell.x + (data.cell.width - dim) / 2;
                    const y = data.cell.y + 1;
                    try {
                        doc.addImage(base64Img, 'JPEG', x, y, dim, dim);
                    } catch (e) {}
                }
            }
        },
        didParseCell: (data) => {
            if (imageColumnIndex >= 0 && data.column.index === imageColumnIndex && data.cell.section === 'body') {
                if (data.cell.raw && (data.cell.raw as string).startsWith('data:image')) {
                    data.cell.text = []; // Clear text
                } else {
                    data.cell.text = ['-'];
                }
            }
        }
    });

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    doc.setFontSize(8);
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.text(`Halaman ${i} dari ${pageCount} - Dibuat oleh Artea POS`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: "center" });
    }

    const fileName = `${title.replace(/\s/g, '_')}_${new Date().getTime()}.pdf`;
    
    if (Capacitor.isNativePlatform()) {
        try {
            const base64PDF = doc.output('datauristring').split(',')[1];
            await saveBinaryFileNative(fileName, base64PDF);
            await shareFileNative(fileName, base64PDF, title);
        } catch (e: any) {
            alert(`Gagal menyimpan PDF: ${e.message}`);
        }
    } else {
        doc.save(fileName);
    }
};
