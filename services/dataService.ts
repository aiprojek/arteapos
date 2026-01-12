
import type { AppData, Product, RawMaterial, Transaction as TransactionType, Expense, Purchase, Customer, StockAdjustment, Addon, CartItem, ProductVariant, ReceiptSettings } from '../types';
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

// Exported for external use (Dropbox/Supabase logging)
// UPDATED: Now includes Store ID in CSV
export const generateTransactionsCSVString = (transactions: TransactionType[]) => {
    const headers = 'id,createdAt,customerName,userName,total,amountPaid,paymentStatus,storeId,items';
    const rows = transactions.map(t => {
        const items = (t.items || []).map(i => {
            const variantStr = i.selectedVariant ? ` [${i.selectedVariant.name}]` : '';
            return `${i.name}${variantStr} (qty: ${i.quantity}, price: ${i.price})`
        }).join('; ');
        // Escape quotes in items string and others
        const escapedItems = items.replace(/"/g, '""');
        const escapedCustomer = (t.customerName || '').replace(/"/g, '""');
        const storeId = t.storeId || '';
        
        return `${t.id},"${new Date(t.createdAt).toLocaleString('id-ID')}","${escapedCustomer}","${t.userName}",${t.total},${t.amountPaid},${t.paymentStatus},"${storeId}","${escapedItems}"`;
    });
    return [headers, ...rows].join('\n');
};

const exportTransactionsCSV = (transactions: TransactionType[]) => {
    const csvContent = generateTransactionsCSVString(transactions);
    downloadCSV(csvContent, 'transactions_report.csv');
};

// IMPROVED CSV PARSER: Handles quotes correctly
const parseCSVLine = (line: string): string[] => {
    const values: string[] = [];
    let current = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuote && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuote = !inQuote;
            }
        } else if (char === ',' && !inQuote) {
            values.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    values.push(current.trim());
    return values;
};

const parseTransactionsCSV = (csvText: string): TransactionType[] => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const transactions: TransactionType[] = [];

    // Mapping index based on standard header: id,createdAt,customerName,userName,total,amountPaid,paymentStatus,storeId,items
    const idIdx = headers.findIndex(h => h.includes('id'));
    const dateIdx = headers.findIndex(h => h.includes('createdAt') || h.includes('Date')); // flexible check
    const custIdx = headers.findIndex(h => h.includes('customerName'));
    const userIdx = headers.findIndex(h => h.includes('userName') || h.includes('Cashier'));
    const totalIdx = headers.findIndex(h => h.includes('total'));
    const paidIdx = headers.findIndex(h => h.includes('amountPaid'));
    const statusIdx = headers.findIndex(h => h.includes('paymentStatus'));
    const storeIdx = headers.findIndex(h => h.includes('storeId')); // New
    const itemsIdx = headers.findIndex(h => h.includes('items'));

    if (idIdx === -1 || totalIdx === -1) {
        throw new Error('Format CSV tidak valid. Kolom ID atau Total hilang.');
    }

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const vals = parseCSVLine(lines[i]);
        
        // Basic validation
        if (vals.length < headers.length) continue;

        try {
            // Reconstruct Items
            const itemsStr = vals[itemsIdx] || '';
            const items: CartItem[] = itemsStr.split(';').filter(Boolean).map((s, idx) => {
                // Regex to match "Name [Variant] (qty: 1, price: 1000)" or "Name (qty: 1, price: 1000)"
                const match = s.trim().match(/(.+?) (?:\[(.+?)\] )?\(qty: (\d+), price: (\d+)\)/);
                if (match) {
                    return {
                        id: `imported-item-${Date.now()}-${idx}`,
                        cartItemId: `imported-cart-${Date.now()}-${idx}`,
                        name: match[1],
                        quantity: parseInt(match[3]),
                        price: parseFloat(match[4]),
                        category: ['Imported'],
                        // Note: Variant details beyond name are lost in simple CSV, but structure is kept
                        selectedVariant: match[2] ? { id: 'imp', name: match[2], price: parseFloat(match[4]) } : undefined 
                    } as CartItem;
                }
                return null;
            }).filter((item): item is CartItem => item !== null);

            const createdAtStr = vals[dateIdx]?.replace(/"/g, ''); // Remove quotes if any
            // Try to parse date, fallback to now if fail
            let createdAt = new Date().toISOString();
            if (createdAtStr) {
                 // Try parsing standard locale string or ISO
                 const parsed = Date.parse(createdAtStr);
                 if (!isNaN(parsed)) {
                     createdAt = new Date(parsed).toISOString();
                 }
            }

            const rawId = vals[idIdx] || `imported-${Date.now()}-${i}`;
            const importedStoreId = (storeIdx > -1 ? vals[storeIdx] : '') || 'EXTERNAL';
            
            // KEY CHANGE: Prefix ID with StoreID to avoid collisions
            // If ID already contains storeID (re-import), keep it.
            const finalId = rawId.startsWith(importedStoreId) ? rawId : `${importedStoreId}-${rawId}`;

            const transaction: TransactionType = {
                id: finalId,
                createdAt: createdAt,
                customerName: vals[custIdx],
                userName: vals[userIdx] || 'Imported',
                userId: 'imported',
                total: parseFloat(vals[totalIdx]) || 0,
                amountPaid: parseFloat(vals[paidIdx]) || 0,
                paymentStatus: (vals[statusIdx] as any) || 'paid',
                items: items,
                subtotal: parseFloat(vals[totalIdx]) || 0, // Assume no discount for simplicity in import
                payments: [], // Cannot reconstruct exact payment history easily
                tax: 0,
                serviceCharge: 0,
                orderType: 'dine-in',
                storeId: importedStoreId // Store the ID for filtering later
            };
            
            transactions.push(transaction);
        } catch (e) {
            console.error(`Skipping row ${i}:`, e);
        }
    }

    return transactions;
}

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

// Exported for external use
export const generateStockAdjustmentsCSVString = (stockAdjustments: StockAdjustment[]) => {
    const headers = 'id,createdAt,productName,change,newStock,notes';
    const rows = stockAdjustments.map(sa => `${sa.id},"${new Date(sa.createdAt).toLocaleString('id-ID')}","${sa.productName}",${sa.change},${sa.newStock},"${sa.notes || ''}"`);
    return [headers, ...rows].join('\n');
};

const exportStockAdjustmentsCSV = (stockAdjustments: StockAdjustment[]) => {
    const csvContent = generateStockAdjustmentsCSVString(stockAdjustments);
    downloadCSV(csvContent, 'stock_adjustments_report.csv');
};

// Helper for image conversion
function base64ToBlob(base64: string): Blob {
    const [meta, data] = base64.split(',');
    if (!meta || !data) return new Blob();
    const mime = meta.match(/:(.*?);/)?.[1];
    const bstr = atob(data);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
}

// Extracted internal function to get data object without downloading
const getExportData = async (): Promise<Partial<AppData>> => {
    const data: Partial<AppData> = {};
    
    await db.transaction('r', db.tables.map(t => t.name), async () => {
      const [
        products, categoriesObj, rawMaterials, transactionRecords, users, settings,
        expenses, otherIncomes, suppliers, purchases, stockAdjustments, customers, discountDefinitions, heldCarts, sessionHistory, auditLogs
      ] = await Promise.all([
        db.products.toArray(),
        db.appState.get('categories'),
        db.rawMaterials.toArray(),
        db.transactionRecords.toArray(),
        db.users.toArray(),
        db.settings.toArray(),
        db.expenses.toArray(),
        db.otherIncomes.toArray(),
        db.suppliers.toArray(),
        db.purchases.toArray(),
        db.stockAdjustments.toArray(),
        db.customers.toArray(),
        db.discountDefinitions.toArray(),
        db.heldCarts.toArray(),
        db.sessionHistory.toArray(),
        db.auditLogs.toArray(),
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
      data.otherIncomes = otherIncomes;
      data.suppliers = suppliers;
      data.purchases = purchases;
      data.stockAdjustments = stockAdjustments;
      data.customers = customers;
      data.discountDefinitions = discountDefinitions;
      data.heldCarts = heldCarts;
      data.sessionHistory = sessionHistory;
      data.auditLogs = auditLogs; // INCLUDE AUDIT LOGS IN EXPORT

      data.receiptSettings = settings.find(s => s.key === 'receiptSettings')?.value;
      data.inventorySettings = settings.find(s => s.key === 'inventorySettings')?.value;
      data.authSettings = settings.find(s => s.key === 'authSettings')?.value;
      data.sessionSettings = settings.find(s => s.key === 'sessionSettings')?.value;
      data.membershipSettings = settings.find(s => s.key === 'membershipSettings')?.value;
    });
    
    return data;
};

// NEW: Function to merge master data (Products, Discounts, Rules) into local DB
// Used by Dropbox 'Pull Master Data'
const mergeMasterData = async (masterData: AppData) => {
    // 1. Get current Store ID
    const settings = await db.settings.get('receiptSettings');
    const receiptSettings = settings?.value as ReceiptSettings;
    const myStoreId = receiptSettings?.storeId || 'UNKNOWN';

    await db.transaction('rw', db.products, db.customers, db.discountDefinitions, db.settings, db.appState, db.suppliers, async () => {
        // A. Products: Smart Merge with Price Override
        if (masterData.products && masterData.products.length > 0) {
            const masterProducts = await Promise.all(masterData.products.map(async (mp) => {
                // Restore image blob if needed
                const prod: any = { ...mp };
                if (prod.imageUrl && prod.imageUrl.startsWith('data:')) {
                    prod.image = base64ToBlob(prod.imageUrl);
                    delete prod.imageUrl;
                }

                // --- KEY LOGIC: Check for Branch Specific Price ---
                if (prod.branchPrices && Array.isArray(prod.branchPrices)) {
                    const branchPrice = prod.branchPrices.find((bp: any) => bp.storeId === myStoreId);
                    if (branchPrice) {
                        prod.price = branchPrice.price; // OVERRIDE LOCAL PRICE
                    }
                }
                
                // Keep local stock if tracking is enabled (don't overwrite with master's 0 stock)
                const localProd = await db.products.get(mp.id);
                if (localProd && localProd.trackStock) {
                    prod.stock = localProd.stock;
                }

                return prod;
            }));
            
            // Put all Master Products (Overwriting definitions, keeping stock logic above)
            await db.products.bulkPut(masterProducts);
        }

        // B. Categories
        if (masterData.categories) {
            await db.appState.put({ key: 'categories', value: masterData.categories });
        }

        // C. Discounts
        if (masterData.discountDefinitions) {
            await db.discountDefinitions.clear(); // Replace old rules with new master rules
            await db.discountDefinitions.bulkPut(masterData.discountDefinitions);
        }

        // D. Membership Rules (Inside Settings)
        if (masterData.membershipSettings) {
            const currentMemSettings = await db.settings.get('membershipSettings');
            const mergedMemSettings = {
                ...(currentMemSettings?.value || {}),
                enabled: masterData.membershipSettings.enabled,
                pointRules: masterData.membershipSettings.pointRules,
                rewards: masterData.membershipSettings.rewards
            };
            await db.settings.put({ key: 'membershipSettings', value: mergedMemSettings });
        }

        // E. Customers (Merge, don't delete local ones)
        if (masterData.customers && masterData.customers.length > 0) {
            await db.customers.bulkPut(masterData.customers);
        }
        
        // F. Suppliers
        if(masterData.suppliers) {
            await db.suppliers.bulkPut(masterData.suppliers);
        }
    });
};

export const dataService = {
  getExportData, // Exposed for Dropbox service
  mergeMasterData, // Exposed for Dropbox service
  
  exportData: async () => {
    const data = await getExportData();
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    link.download = `artea-pos-backup-${timestamp}.json`;
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
          // Simple validation check
          if (parsedData && typeof parsedData === 'object') {
            resolve(parsedData);
          } else {
            reject(new Error('Format file backup tidak valid.'));
          }
        } catch (error) {
          reject(new Error('Gagal mem-parsing file backup.'));
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsText(file);
    });
  },

  exportProductsCSV: async (products: Product[]) => {
    const headers = 'id,name,price,category,barcode,costPrice,stock,trackStock,isFavorite,imageUrl,addons,variants';
    const rows = await Promise.all(products.map(async p => {
        const category = Array.isArray(p.category) ? p.category.join(';') : '';
        const addonsString = (p.addons || [])
            .map(a => `${a.name}:${a.price}:${a.costPrice || 0}`)
            .join('|');
        const variantsString = (p.variants || [])
            .map(v => `${v.name}:${v.price}:${v.costPrice || 0}`)
            .join('|');
        let imageUrl = p.imageUrl || '';
        if (p.image instanceof Blob) {
            imageUrl = await blobToBase64(p.image);
        }
        return `${p.id},"${p.name}",${p.price},"${category}",${p.barcode || ''},${p.costPrice || 0},${p.stock || 0},${p.trackStock || false},${p.isFavorite || false},"${imageUrl}","${addonsString}","${variantsString}"`;
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
            
            // Use improved CSV parser
            const values = parseCSVLine(lines[i]);
            
            const productData = headers.reduce((acc, header, index) => {
                const key = header as keyof Product;
                let value: any = values[index]?.replace(/"/g, '').trim();

                switch (key) {
                    case 'price':
                    case 'costPrice':
                    case 'stock':
                        value = parseFloat(value) || 0;
                        break;
                    case 'trackStock':
                    case 'isFavorite':
                        value = value.toLowerCase() === 'true';
                        break;
                    case 'category':
                        value = typeof value === 'string' ? value.split(';').filter(Boolean) : [];
                        break;
                    case 'addons':
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
                        break;
                    case 'variants':
                        value = (value || '').split('|').filter(Boolean).map((varStr: string, idx: number) => {
                            const parts = varStr.split(':');
                            if (parts.length >= 2) {
                                return {
                                    id: `${Date.now()}-var-${idx}`,
                                    name: parts[0] || '',
                                    price: parseFloat(parts[1]) || 0,
                                    costPrice: parseFloat(parts[2]) || 0,
                                };
                            }
                            return null;
                        }).filter((v: ProductVariant | null): v is ProductVariant => v !== null);
                        break;
                    default:
                        break;
                }
                
                (acc as any)[key] = value;
                return acc;

            }, {} as Partial<Product>);
            
            // If ID is empty, it's a new product. Generate a unique ID.
            if (!productData.id) {
                productData.id = `${Date.now()}-${i}`;
            }

            if(productData.name && productData.price !== undefined) {
                products.push(productData as Product);
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

  importTransactionsCSV: (file: File): Promise<TransactionType[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const csvText = event.target?.result as string;
                const transactions = parseTransactionsCSV(csvText);
                resolve(transactions);
            } catch (error) {
                reject(new Error('Gagal membaca file CSV transaksi.'));
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
            const values = parseCSVLine(lines[i]);

            const materialData = headers.reduce((acc, header, index) => {
              const key = header as keyof RawMaterial;
              let value: string | number = values[index]?.replace(/"/g, '').trim();
              if (key === 'stock') {
                value = parseFloat(value) || 0;
              }
              (acc as any)[key] = value;
              return acc;
            }, {} as Partial<RawMaterial>);


            if (materialData.id && materialData.name && materialData.stock !== undefined && materialData.unit) {
              materials.push(materialData as RawMaterial);
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
    if (data.transactionRecords.length > 0) exportTransactionsCSV(data.transactionRecords);
    if (data.expenses.length > 0) exportExpensesCSV(data.expenses);
    if (data.purchases.length > 0) exportPurchasesCSV(data.purchases, data.rawMaterials, data.products);
    if (data.customers.length > 0) exportCustomersCSV(data.customers);
    if (data.stockAdjustments.length > 0) exportStockAdjustmentsCSV(data.stockAdjustments);
  },

  generateTransactionsCSVString, 
  generateStockAdjustmentsCSVString, // NEW Export
  parseTransactionsCSV
};
