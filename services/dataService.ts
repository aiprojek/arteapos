import type { AppData, Product, RawMaterial, Transaction as TransactionType, Expense, Purchase, Customer, StockAdjustment, Addon } from '../types';
import { db } from './db';

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

const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

const exportTransactionsCSV = (transactions: TransactionType[]) => {
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

const exportPurchasesCSV = (purchases: Purchase[], rawMaterials: RawMaterial[], products: Product[]) => {
    const materialMap = new Map(rawMaterials.map(m => [m.id, m.name]));
    const productMap = new Map(products.map(p => [p.id, p.name]));
    const headers = 'id,date,supplierName,totalAmount,amountPaid,status,items';
    const rows = purchases.map(p => {
        const items = p.items.map(i => {
            const itemName = i.itemType === 'product'
                ? productMap.get(i.productId || '') || 'Produk Tidak Dikenal'
                : materialMap.get(i.rawMaterialId || '') || 'Bahan Baku Tidak Dikenal';
            return `${itemName} (qty: ${i.quantity}, price: ${i.price})`;
        }).join('; ');
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
  exportData: async () => {
    const data: Partial<AppData> = {};
    
    await db.transaction('r', db.tables.map(t => t.name), async () => {
      const [
        products, categoriesObj, rawMaterials, transactionRecords, users, settings,
        expenses, suppliers, purchases, stockAdjustments, customers, discountDefinitions, heldCarts
      ] = await Promise.all([
        db.products.toArray(),
        db.appState.get('categories'),
        db.rawMaterials.toArray(),
        db.transactionRecords.toArray(),
        db.users.toArray(),
        db.settings.toArray(),
        db.expenses.toArray(),
        db.suppliers.toArray(),
        db.purchases.toArray(),
        db.stockAdjustments.toArray(),
        db.customers.toArray(),
        db.discountDefinitions.toArray(),
        db.heldCarts.toArray()
      ]);

      const productsForExport = await Promise.all(
        products.map(async p => {
          if (p.image instanceof Blob) {
            const base64 = await blobToBase64(p.image);
            const { image, ...rest } = p;
            return { ...rest, imageUrl: base64 };
          }
          return p;
        })
      );
      
      data.products = productsForExport as Product[];
      data.categories = categoriesObj?.value || [];
      data.rawMaterials = rawMaterials;
      data.transactionRecords = transactionRecords;
      data.users = users;
      data.expenses = expenses;
      data.suppliers = suppliers;
      data.purchases = purchases;
      data.stockAdjustments = stockAdjustments;
      data.customers = customers;
      data.discountDefinitions = discountDefinitions;
      data.heldCarts = heldCarts;

      data.receiptSettings = settings.find(s => s.key === 'receiptSettings')?.value;
      data.inventorySettings = settings.find(s => s.key === 'inventorySettings')?.value;
      data.authSettings = settings.find(s => s.key === 'authSettings')?.value;
      data.sessionSettings = settings.find(s => s.key === 'sessionSettings')?.value;
      data.membershipSettings = settings.find(s => s.key === 'membershipSettings')?.value;
    });

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
          if ('products' in parsedData && 'transactionRecords' in parsedData) {
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

  exportProductsCSV: async (products: Product[]) => {
    const headers = 'id,name,price,category,barcode,costPrice,stock,trackStock,isFavorite,imageUrl,addons';
    const rows = await Promise.all(products.map(async p => {
        const category = Array.isArray(p.category) ? p.category.join(';') : '';
        const addonsString = (p.addons || [])
            .map(a => `${a.name}:${a.price}:${a.costPrice || 0}`)
            .join('|');
        let imageUrl = p.imageUrl || '';
        if (p.image instanceof Blob) {
            imageUrl = await blobToBase64(p.image);
        }
        return `${p.id},"${p.name}",${p.price},"${category}",${p.barcode || ''},${p.costPrice || 0},${p.stock || 0},${p.trackStock || false},${p.isFavorite || false},"${imageUrl}","${addonsString}"`;
    }));
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
                const key = header as keyof Product | 'addons';
                let value: any = values[index]?.replace(/"/g, '').trim();

                if (key === 'price' || key === 'costPrice' || key === 'stock') {
                    value = parseFloat(value) || 0;
                } else if (key === 'trackStock' || key === 'isFavorite') {
                    value = value.toLowerCase() === 'true';
                } else if (key === 'category') {
                    value = typeof value === 'string' ? value.split(';').filter(Boolean) : [];
                } else if (key === 'addons') {
                    value = (value || '').split('|').filter(Boolean).map((addonStr: string, idx: number) => {
                        const parts = addonStr.split(':');
                        if (parts.length >= 2) {
                            return {
                                id: `${Date.now()}-${idx}`,
                                name: parts[0] || '',
                                price: parseFloat(parts[1]) || 0,
                                costPrice: parseFloat(parts[2]) || 0,
                            };
                        }
                        return null;
                    }).filter((a: Addon | null): a is Addon => a !== null);
                }
                
                product[key] = value;
            });
            
            // If ID is empty, it's a new product. Generate a unique ID.
            if (!product.id) {
                product.id = `${Date.now()}-${i}`;
            }

            if(product.name && product.price !== undefined) {
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
    // FIX: Use 'transactionRecords' from AppData.
    if (data.transactionRecords.length > 0) exportTransactionsCSV(data.transactionRecords);
    if (data.expenses.length > 0) exportExpensesCSV(data.expenses);
    if (data.purchases.length > 0) exportPurchasesCSV(data.purchases, data.rawMaterials, data.products);
    if (data.customers.length > 0) exportCustomersCSV(data.customers);
    if (data.stockAdjustments.length > 0) exportStockAdjustmentsCSV(data.stockAdjustments);
  }
};