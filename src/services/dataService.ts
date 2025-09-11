import type { AppData, Product, RawMaterial, Transaction, Expense, Purchase, Customer, StockAdjustment } from '../types';

const downloadCSV = (csvContent: string, filename: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

const exportTransactionsCSV = (transactions: Transaction[]) => {
    const headers = 'id,createdAt,customerName,userName,total,amountPaid,paymentStatus,items';
    const rows = transactions.map(t => {
        const items = t.items.map(i => `${i.name} (qty: ${i.quantity}, price: ${i.price})`).join('; ');
        return `${t.id},"${new Date(t.createdAt).toLocaleString('id-ID')}","${t.customerName || ''}","${t.userName}",${t.total},${t.amountPaid},${t.paymentStatus},"${items}"`;
    });
    const csvContent = [headers, ...rows].join('\n');
    downloadCSV(csvContent, 'transactions_report.csv');
};

const exportExpensesCSV = (expenses: Expense[]) => {
    const headers = 'id,date,description,category,amount,amountPaid,status';
    const rows = expenses.map(e => `${e.id},"${new Date(e.date).toLocaleDateString('id-ID')}","${e.description}",${e.category},${e.amount},${e.amountPaid},${e.status}`);
    const csvContent = [headers, ...rows].join('\n');
    downloadCSV(csvContent, 'expenses_report.csv');
};

const exportPurchasesCSV = (purchases: Purchase[], rawMaterials: RawMaterial[]) => {
    const materialMap = new Map(rawMaterials.map(m => [m.id, m.name]));
    const headers = 'id,date,supplierName,totalAmount,amountPaid,status,items';
    const rows = purchases.map(p => {
        const items = p.items.map(i => `${materialMap.get(i.rawMaterialId) || 'Unknown'} (qty: ${i.quantity}, price: ${i.price})`).join('; ');
        return `${p.id},"${new Date(p.date).toLocaleDateString('id-ID')}","${p.supplierName}",${p.totalAmount},${p.amountPaid},${p.status},"${items}"`;
    });
    const csvContent = [headers, ...rows].join('\n');
    downloadCSV(csvContent, 'purchases_report.csv');
};

const exportCustomersCSV = (customers: Customer[]) => {
    const headers = 'id,memberId,name,contact,points,createdAt';
    const rows = customers.map(c => `${c.id},${c.memberId},"${c.name}","${c.contact || ''}",${c.points},"${new Date(c.createdAt).toLocaleString('id-ID')}"`);
    const csvContent = [headers, ...rows].join('\n');
    downloadCSV(csvContent, 'customers_report.csv');
};

const exportStockAdjustmentsCSV = (stockAdjustments: StockAdjustment[]) => {
    const headers = 'id,createdAt,productName,change,newStock,notes';
    const rows = stockAdjustments.map(sa => `${sa.id},"${new Date(sa.createdAt).toLocaleString('id-ID')}","${sa.productName}",${sa.change},${sa.newStock},"${sa.notes || ''}"`);
    const csvContent = [headers, ...rows].join('\n');
    downloadCSV(csvContent, 'stock_adjustments_report.csv');
};


export const dataService = {
  exportData: (data: AppData) => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    link.download = `ai-projek-pos-backup-${timestamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  importData: (file: File): Promise<AppData> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const result = event.target?.result as string;
          const parsedData = JSON.parse(result) as AppData;
          // Basic validation
          if ('products' in parsedData && 'transactions' in parsedData) {
            resolve(parsedData);
          } else {
            reject(new Error('Invalid backup file format.'));
          }
        } catch (error) {
          reject(new Error('Failed to parse backup file.'));
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsText(file);
    });
  },

  exportProductsCSV: (products: Product[]) => {
    const headers = 'id,name,price,category,barcode,costPrice,stock,trackStock,isFavorite,imageUrl';
    const rows = products.map(p => {
        const category = Array.isArray(p.category) ? p.category.join(';') : '';
        return `${p.id},"${p.name}",${p.price},"${category}",${p.barcode || ''},${p.costPrice || 0},${p.stock || 0},${p.trackStock || false},${p.isFavorite || false},"${p.imageUrl || ''}"`;
    });
    const csvContent = [headers, ...rows].join('\n');
    downloadCSV(csvContent, 'products_export.csv');
  },

  importProductsCSV: (file: File): Promise<Product[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const csv = event.target?.result as string;
          const lines = csv.split('\n');
          if (lines.length < 2) {
             resolve([]);
             return;
          }
          const headers = lines[0].split(',').map(h => h.trim());
          const products: Product[] = [];
          
          for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            // A simple CSV parser, not robust for complex cases with commas in values
            const values = lines[i].split(',');
            const product: any = {};
            
            headers.forEach((header, index) => {
                const key = header as keyof Product;
                let value: any = values[index]?.replace(/"/g, '').trim();

                if (key === 'price' || key === 'costPrice' || key === 'stock') {
                    value = parseFloat(value) || 0;
                } else if (key === 'trackStock' || key === 'isFavorite') {
                    value = value.toLowerCase() === 'true';
                } else if (key === 'category') {
                    value = typeof value === 'string' ? value.split(';').filter(Boolean) : [];
                }
                
                product[key] = value;
            });

            if(product.id && product.name && product.price !== undefined) {
                products.push(product as Product);
            }
          }
          resolve(products);
        } catch (error) {
          reject(new Error('Gagal mem-parsing file CSV. Pastikan formatnya benar.'));
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsText(file);
    });
  },

  exportRawMaterialsCSV: (rawMaterials: RawMaterial[]) => {
    const headers = 'id,name,stock,unit';
    const rows = rawMaterials.map(rm => `${rm.id},"${rm.name}",${rm.stock},"${rm.unit}"`);
    const csvContent = [headers, ...rows].join('\n');
    downloadCSV(csvContent, 'raw_materials_export.csv');
  },

  importRawMaterialsCSV: (file: File): Promise<RawMaterial[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const csv = event.target?.result as string;
          const lines = csv.split('\n');
          if (lines.length < 2) {
            resolve([]);
            return;
          }
          const headers = lines[0].split(',').map(h => h.trim());
          const materials: RawMaterial[] = [];

          for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            const values = lines[i].split(',');
            const material: any = {};

            headers.forEach((header, index) => {
              const key = header as keyof RawMaterial;
              let value: string | number = values[index]?.replace(/"/g, '').trim();
              if (key === 'stock') {
                value = parseFloat(value) || 0;
              }
              material[key] = value;
            });

            if (material.id && material.name && material.stock !== undefined && material.unit) {
              materials.push(material as RawMaterial);
            }
          }
          resolve(materials);
        } catch (error) {
          reject(new Error('Gagal mem-parsing file CSV untuk bahan baku.'));
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsText(file);
    });
  },

  exportAllReportsCSV: (data: AppData) => {
    // Browser will download these files sequentially
    if (data.transactions.length > 0) exportTransactionsCSV(data.transactions);
    if (data.expenses.length > 0) exportExpensesCSV(data.expenses);
    if (data.purchases.length > 0) exportPurchasesCSV(data.purchases, data.rawMaterials);
    if (data.customers.length > 0) exportCustomersCSV(data.customers);
    if (data.stockAdjustments.length > 0) exportStockAdjustmentsCSV(data.stockAdjustments);
  }
};