
import Dexie, { type EntityTable } from 'dexie';
// FIX: The imported type 'Transaction' conflicts with Dexie's 'transaction' method. It is aliased to 'TransactionType' to resolve this.
import type { 
    Product, RawMaterial, Transaction as TransactionType, User, Expense, Supplier, Purchase, 
    StockAdjustment, Customer, DiscountDefinition, HeldCart, ReceiptSettings, 
    InventorySettings, AuthSettings, SessionSettings, MembershipSettings, AppData, SessionState, OtherIncome
} from '../types';
import { INITIAL_PRODUCTS } from '../constants';

// Define the shape for key-value stores
interface KeyValueStore<T> {
    key: string;
    value: T;
}

// Helper function to hash PINs using SHA-256
async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  // convert bytes to hex string
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

function base64ToBlob(base64: string): Blob {
    const [meta, data] = base64.split(',');
    if (!meta || !data) {
        return new Blob();
    }
    const mime = meta.match(/:(.*?);/)?.[1];
    const bstr = atob(data);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
}


export const initialData: AppData = {
    products: INITIAL_PRODUCTS,
    categories: ['Kopi', 'Non-Kopi', 'Makanan'],
    rawMaterials: [],
    // FIX: Renamed 'transactions' to 'transactionRecords' to match the updated AppData interface.
    transactionRecords: [],
    users: [],
    receiptSettings: {
        shopName: 'Artea POS',
        address: 'Jalan Teknologi No. 1',
        footerMessage: 'Terima kasih telah berbelanja!',
        enableKitchenPrinter: false,
        adminWhatsapp: '',
        adminTelegram: '',
    },
    inventorySettings: {
        enabled: false,
        trackIngredients: false,
    },
    authSettings: {
        enabled: false,
    },
    sessionSettings: {
        enabled: false,
        enableCartHolding: false,
    },
    expenses: [],
    otherIncomes: [],
    suppliers: [],
    purchases: [],
    stockAdjustments: [],
    customers: [],
    membershipSettings: {
        enabled: false,
        pointRules: [],
        rewards: [],
    },
    discountDefinitions: [],
    heldCarts: [],
};


// FIX: Refactored the database definition to use an intersection type (`Dexie & { ... }`).
// The previous `interface ArteaPosDB extends Dexie` was incorrectly hiding the base Dexie methods,
// causing errors like "Property 'transaction' does not exist". This change ensures the `db` object
// has both the standard Dexie methods and the typed table properties, resolving all related errors.
export const db = new Dexie('ArteaPosDB') as Dexie & {
    products: EntityTable<Product, 'id'>;
    rawMaterials: EntityTable<RawMaterial, 'id'>;
    // The table's entity type is updated to use the aliased 'TransactionType' to avoid a naming conflict with Dexie's internal 'transaction' method.
    transactionRecords: EntityTable<TransactionType, 'id'>;
    users: EntityTable<User, 'id'>;
    expenses: EntityTable<Expense, 'id'>;
    otherIncomes: EntityTable<OtherIncome, 'id'>; // New Table
    suppliers: EntityTable<Supplier, 'id'>;
    purchases: EntityTable<Purchase, 'id'>;
    stockAdjustments: EntityTable<StockAdjustment, 'id'>;
    customers: EntityTable<Customer, 'id'>;
    discountDefinitions: EntityTable<DiscountDefinition, 'id'>;
    heldCarts: EntityTable<HeldCart, 'id'>;

    // Key-value stores
    settings: EntityTable<KeyValueStore<ReceiptSettings | InventorySettings | AuthSettings | SessionSettings | MembershipSettings>, 'key'>;
    appState: EntityTable<KeyValueStore<string[]>, 'key'>;
    session: EntityTable<KeyValueStore<SessionState>, 'key'>;
};

db.version(1).stores({
    products: 'id, name, *category',
    rawMaterials: 'id, name',
    // FIX: Renamed 'transactions' table to 'transactionRecords' in the schema definition.
    transactionRecords: 'id, createdAt',
    users: 'id',
    expenses: 'id, date',
    suppliers: 'id, name',
    purchases: 'id, date, supplierId',
    stockAdjustments: 'id, createdAt, productId',
    customers: 'id, memberId, name',
    discountDefinitions: 'id',
    heldCarts: 'id',
    settings: 'key',
    appState: 'key',
    session: 'key'
});

db.version(2).upgrade(async (tx) => {
    await tx.table('products').toCollection().modify(product => {
        if (product.imageUrl && product.imageUrl.startsWith('data:')) {
            product.image = base64ToBlob(product.imageUrl);
            // Keep http URLs, delete base64 data URLs
            delete product.imageUrl;
        }
    });
});

db.version(3).stores({
    otherIncomes: 'id, date'
});


const populate = async () => {
    const hashedPin = await hashPin('1111');
    const defaultAdmin: User = { id: 'admin_default', name: 'Admin', pin: hashedPin, role: 'admin' };

    await db.products.bulkAdd(initialData.products);
    await db.users.add(defaultAdmin);
    await db.appState.put({ key: 'categories', value: initialData.categories });
    await db.settings.bulkAdd([
        { key: 'receiptSettings', value: initialData.receiptSettings },
        { key: 'inventorySettings', value: initialData.inventorySettings },
        { key: 'authSettings', value: initialData.authSettings },
        { key: 'sessionSettings', value: initialData.sessionSettings },
        { key: 'membershipSettings', value: initialData.membershipSettings },
    ]);
};

db.on('populate', populate);
