
export interface Addon {
  id: string;
  name: string;
  price: number;
  costPrice?: number;
}

export interface ProductVariant {
  id: string;
  name: string; // e.g. "Regular", "Large"
  price: number;
  costPrice?: number;
}

// --- NEW MODIFIER SYSTEM ---
export interface ModifierOption {
    id: string;
    name: string;
    price: number; // Price adjustment (can be 0)
    costPrice?: number;
}

export interface ModifierGroup {
    id: string;
    name: string; // e.g., "Sugar Level", "Toppings"
    minSelection: number; // 0 = Optional, 1 = Mandatory
    maxSelection: number; // 1 = Single choice (Radio), >1 = Multi (Checkbox)
    options: ModifierOption[];
}

export interface SelectedModifier {
    groupId: string;
    groupName: string;
    optionId: string;
    name: string;
    price: number;
}
// ---------------------------

export interface RawMaterial {
  id: string;
  name: string;
  stock: number;
  unit: string; // e.g., 'gram', 'ml', 'pcs'
  costPerUnit?: number; // Cost per single unit (e.g., cost per gram)
  validStoreIds?: string[]; // NEW: Restriction
}

export interface RecipeItem {
  itemType: 'raw_material' | 'product'; // New discriminator
  rawMaterialId?: string; // Optional now
  productId?: string; // New for bundling
  quantity: number;
}

export interface Discount {
  type: 'percentage' | 'amount';
  value: number;
  name?: string; // Optional: "Promo Lebaran"
  discountId?: string; // Link to the definition
}

export interface DiscountDefinition {
  id: string;
  name: string;
  type: 'percentage' | 'amount';
  value: number;
  startDate?: string; // ISO string
  endDate?: string; // ISO string
  isActive: boolean;
  validStoreIds?: string[]; // NEW: Empty = Global, otherwise specific Store IDs
}

// NEW: Interface for Branch Specific Pricing
export interface BranchPrice {
    storeId: string; // The target store ID (e.g., "BDG-01")
    price: number;
}

// NEW: Branch Definition
export interface Branch {
    id: string;
    name: string;
    address?: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string[];
  image?: Blob; // For uploaded/captured images stored as Blobs
  imageUrl?: string; // For external image URLs
  costPrice?: number;
  stock?: number;
  trackStock?: boolean;
  recipe?: RecipeItem[];
  isFavorite?: boolean;
  barcode?: string;
  addons?: Addon[]; // Deprecated but kept for backward compat
  variants?: ProductVariant[]; // Deprecated but kept for backward compat
  modifierGroups?: ModifierGroup[]; // NEW: Advanced Modifiers
  branchPrices?: BranchPrice[]; // NEW: Remote pricing configuration
  validStoreIds?: string[]; // NEW: Branch Restriction (e.g. ['SPARE-01'] only)
}

export interface CartItem extends Product {
  cartItemId: string; // Unique identifier for this specific item in the cart
  quantity: number;
  isReward?: boolean; // To identify reward items
  rewardId?: string; // To link to the reward definition
  discount?: Discount;
  selectedAddons?: Addon[]; // Deprecated
  selectedVariant?: ProductVariant; // Deprecated
  selectedModifiers?: SelectedModifier[]; // NEW
}

// New Type for Held Carts Feature
export interface HeldCart {
  id: string;
  name: string;
  items: CartItem[];
  orderType?: OrderType; // Save order type in held cart
}

export interface User {
  id: string;
  name: string;
  pin: string; // 4-digit PIN
  role: 'admin' | 'manager' | 'staff'; // Added 'manager'
  assignedBranch?: string; // NEW: 'all' or specific Branch ID
}

export type PaymentMethod = 'cash' | 'non-cash';

export interface Payment {
  id: string;
  method: PaymentMethod;
  amount: number;
  createdAt: string; // ISO string
}

export type PaymentStatus = 'paid' | 'unpaid' | 'partial' | 'refunded';
export type OrderType = string;

export interface Transaction {
  id: string;
  storeId?: string; // NEW: Identification for Multi-Branch Import
  items: CartItem[];
  subtotal: number;
  cartDiscount?: Discount;
  tax: number; // New: Tax amount
  serviceCharge: number; // New: Service charge amount
  total: number;
  amountPaid: number;
  paymentStatus: PaymentStatus;
  orderType: OrderType; // New: Order Type
  payments: Payment[];
  createdAt: string; // ISO string
  userId: string;
  userName: string;
  customerName?: string;
  customerContact?: string;
  customerId?: string;
  pointsEarned?: number;
  rewardRedeemed?: {
    rewardId: string;
    pointsSpent: number;
    description: string;
  };
}

export interface ReceiptSettings {
    shopName: string;
    address: string;
    footerMessage: string;
    enableKitchenPrinter?: boolean;
    adminWhatsapp?: string;
    adminTelegram?: string;
    taxRate?: number; // New: Percentage (e.g., 10 for 10%)
    serviceChargeRate?: number; // New: Percentage (e.g., 5 for 5%)
    storeId?: string; // NEW: Identifier for Multi-Branch
    orderTypes?: string[]; // NEW: Customizable order types
    branches?: Branch[]; // NEW: List of available branches
}

export interface InventorySettings {
    enabled: boolean;
    trackIngredients: boolean;
}

export interface AuthSettings {
    enabled: boolean;
    securityQuestion?: string; // NEW
    securityAnswer?: string;   // NEW
}

export interface SessionSettings {
  enabled: boolean;
  enableCartHolding?: boolean; // New setting for held carts
}

// Updated Session Types for Shift Management
export interface CashMovement {
  id: string;
  type: 'in' | 'out';
  amount: number;
  description: string;
  timestamp: string; // ISO String
  userId: string;
  userName: string;
}

export interface SessionState {
  id: string; // Session ID
  startingCash: number;
  startTime: string; // ISO string
  userId: string; // User who started the shift
  userName: string;
  cashMovements: CashMovement[]; // Log of cash in/out during shift
}

// NEW: Session History to archive closed sessions
export interface SessionHistory extends SessionState {
    endTime: string;
    totalSales: number; // Cash sales specifically
    cashInTotal: number;
    cashOutTotal: number;
    expectedCash: number;
    actualCash: number;
    variance: number; // Selisih
}

// --- New Finance Types ---

export type ExpenseStatus = 'lunas' | 'belum-lunas';

export interface Expense {
  id: string;
  description: string;
  amount: number;
  amountPaid: number;
  status: ExpenseStatus;
  category: string;
  date: string; // ISO string
}

// New Type for Non-Sales Income
export interface OtherIncome {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string; // ISO string
}

export interface Supplier {
  id:string;
  name: string;
  contact?: string;
}

export interface PurchaseItem {
    itemType: 'raw_material' | 'product';
    rawMaterialId?: string;
    productId?: string;
    quantity: number;
    price: number; // price per unit
}

export type PurchaseStatus = 'lunas' | 'belum-lunas';

export interface Purchase {
    id: string;
    supplierId: string;
    supplierName: string;
    items: PurchaseItem[];
    totalAmount: number;
    amountPaid: number;
    status: PurchaseStatus;
    date: string; // ISO string
}

// --- New Inventory Management Types ---
export interface StockAdjustment {
    id: string;
    productId: string;
    productName: string;
    change: number; // The amount added (positive number)
    newStock: number;
    notes?: string;
    createdAt: string; // ISO string
}

// --- New Membership & Reward Types ---
export interface Customer {
  id: string;
  memberId: string; // e.g., CUST-0001
  name: string;
  contact?: string; // phone or email
  points: number;
  createdAt: string; // ISO string
}

export type PointRuleType = 'spend' | 'product' | 'category';

export interface PointRule {
  id: string;
  type: PointRuleType;
  description: string;
  // for 'spend'
  spendAmount?: number;
  pointsEarned?: number;
  // for 'product' or 'category'
  targetId?: string; // productId or categoryName
  pointsPerItem?: number;
  validStoreIds?: string[]; // NEW: Specific store rule
}

export type RewardType = 'discount_amount' | 'free_product';

export interface Reward {
  id: string;
  name: string;
  type: RewardType;
  pointsCost: number;
  // for 'discount_amount'
  discountValue?: number;
  // for 'free_product'
  freeProductId?: string;
}

export interface MembershipSettings {
  enabled: boolean;
  pointRules: PointRule[];
  rewards: Reward[];
}

// --- AUDIT LOG ---
export type AuditAction = 'DELETE_PRODUCT' | 'UPDATE_PRICE' | 'STOCK_OPNAME' | 'REFUND_TRANSACTION' | 'LOGIN_ATTEMPT' | 'OTHER';

export interface AuditLog {
    id: string;
    timestamp: string;
    userId: string;
    userName: string;
    action: AuditAction;
    targetId?: string; // ID produk atau transaksi terkait
    details: string; // Deskripsi detail (misal: "Harga berubah dari 10k ke 12k")
}

export interface AppData {
  products: Product[];
  categories: string[];
  rawMaterials: RawMaterial[];
  transactionRecords: Transaction[];
  users: User[];
  receiptSettings: ReceiptSettings;
  inventorySettings: InventorySettings;
  authSettings: AuthSettings;
  sessionSettings: SessionSettings;
  expenses: Expense[];
  otherIncomes: OtherIncome[]; // New field
  suppliers: Supplier[];
  purchases: Purchase[];
  stockAdjustments: StockAdjustment[];
  customers: Customer[];
  membershipSettings: MembershipSettings;
  discountDefinitions: DiscountDefinition[];
  heldCarts?: HeldCart[];
  sessionHistory: SessionHistory[];
  auditLogs?: AuditLog[]; // NEW: Audit Trail
}

export type View = 'dashboard' | 'pos' | 'products' | 'raw-materials' | 'reports' | 'settings' | 'finance' | 'help';
