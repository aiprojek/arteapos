
import Dexie, { Table } from 'dexie';
import type { 
    Product, 
    RawMaterial, 
    Transaction, 
    User, 
    Expense, 
    OtherIncome, 
    Supplier, 
    Purchase, 
    StockAdjustment, 
    Customer, 
    DiscountDefinition, 
    HeldCart, 
    SessionHistory, 
    AuditLog,
    BalanceLog,
    AppData
} from '../types';
import { INITIAL_PRODUCTS } from '../constants'; // Import Data Sampel

class ArteaPOSDB extends Dexie {
    products!: Table<Product, string>;
    rawMaterials!: Table<RawMaterial, string>;
    transactionRecords!: Table<Transaction, string>;
    users!: Table<User, string>;
    expenses!: Table<Expense, string>;
    otherIncomes!: Table<OtherIncome, string>;
    suppliers!: Table<Supplier, string>;
    purchases!: Table<Purchase, string>;
    stockAdjustments!: Table<StockAdjustment, string>;
    customers!: Table<Customer, string>;
    discountDefinitions!: Table<DiscountDefinition, string>;
    heldCarts!: Table<HeldCart, string>;
    sessionHistory!: Table<SessionHistory, string>;
    auditLogs!: Table<AuditLog, string>;
    balanceLogs!: Table<BalanceLog, string>;
    
    // Key-Value stores for settings and app state
    settings!: Table<{ key: string, value: any }, string>;
    appState!: Table<{ key: string, value: any }, string>;
    session!: Table<{ key: string, value: any }, string>; // For active session

    constructor() {
        super('ArteaPOSDB');
        (this as any).version(4).stores({
            products: 'id, name, barcode, category',
            rawMaterials: 'id, name',
            transactionRecords: 'id, createdAt, paymentStatus, customerName',
            users: 'id, name, role',
            expenses: 'id, date, category',
            otherIncomes: 'id, date, category',
            suppliers: 'id, name',
            purchases: 'id, date, supplierName',
            stockAdjustments: 'id, productId, createdAt',
            customers: 'id, memberId, name, contact',
            discountDefinitions: 'id',
            heldCarts: 'id, name',
            sessionHistory: 'id, startTime, endTime',
            auditLogs: 'id, timestamp, action, userId',
            balanceLogs: 'id, customerId, timestamp',
            settings: 'key',
            appState: 'key',
            session: 'key'
        });
    }
}

export const db = new ArteaPOSDB();

export const initialData: AppData = {
    products: INITIAL_PRODUCTS, // Masukkan Sample Produk disini
    categories: ['Umum', 'Makanan', 'Minuman', 'Kopi', 'Non-Kopi'], // Update Kategori default
    rawMaterials: [],
    transactionRecords: [],
    users: [],
    expenses: [],
    otherIncomes: [],
    suppliers: [],
    purchases: [],
    stockAdjustments: [],
    customers: [],
    discountDefinitions: [],
    heldCarts: [],
    sessionHistory: [],
    auditLogs: [],
    balanceLogs: [],
    
    receiptSettings: {
        shopName: 'Toko Saya',
        address: 'Alamat Toko',
        footerMessage: 'Terima kasih telah berbelanja!',
        taxRate: 0,
        serviceChargeRate: 0
    },
    inventorySettings: {
        enabled: true,
        preventNegativeStock: false,
        trackIngredients: false
    },
    authSettings: {
        enabled: false
    },
    sessionSettings: {
        enabled: false,
        enableCartHolding: false,
        enableBlindAudit: false,
        enableTableManagement: false // DEFAULT OFF
    },
    membershipSettings: {
        enabled: false,
        pointRules: [],
        rewards: []
    }
};
