
export type View = 'dashboard' | 'pos' | 'products' | 'raw-materials' | 'finance' | 'reports' | 'settings' | 'help' | 'customer-display';

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
  unit: string; // Base usage unit e.g., 'ml', 'pcs'
  costPerUnit?: number; // Cost per base unit
  validStoreIds?: string[]; 
  // Multi-Unit Support
  purchaseUnit?: string; // e.g. 'Karton', 'Pack'
  conversionRate?: number; // How many base units in 1 purchase unit (e.g. 12 pcs per Pack)
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
  taxRate?: number; // NEW: Override global tax rate (e.g., 0 for non-taxable, 11 for specific items)
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
  role: 'admin' | 'manager' | 'staff' | 'viewer'; // Added 'viewer'
  assignedBranch?: string; // NEW: 'all' or specific Branch ID
}

export type PaymentMethod = 'cash' | 'non-cash' | 'member-balance'; // Added member-balance

export interface Payment {
  id: string;
  method: PaymentMethod;
  amount: number;
  createdAt: string; // ISO string
  evidenceImageUrl?: string; // NEW: Bukti Pembayaran untuk Piutang/Cicilan
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
  // Snapshot data for Receipt
  customerBalanceSnapshot?: number; // Saldo akhir saat transaksi
  customerPointsSnapshot?: number; // Poin akhir saat transaksi
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
    preventNegativeStock?: boolean; // NEW: Prevent adding to cart if stock is low
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
  evidenceImageUrl?: string; // NEW: Bukti Foto (Base64)
  paymentMethod?: PaymentMethod; // NEW: Cara Bayar
}

// New Type for Non-Sales Income
export interface OtherIncome {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string; // ISO string
  evidenceImageUrl?: string; // NEW
  paymentMethod?: PaymentMethod; // NEW
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
    price: number; // price per unit (either purchase unit or base unit depending on entry)
    conversionApplied?: boolean; // Track if we used conversion
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
    evidenceImageUrl?: string; // NEW
    paymentMethod?: PaymentMethod; // NEW
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
  balance: number; // NEW: Wallet Balance
  createdAt: string; // ISO string
}

export interface BalanceLog {
    id: string;
    customerId: string;
    type: 'topup' | 'payment' | 'refund' | 'correction' | 'change_deposit';
    amount: number;
    description: string;
    timestamp: string;
    transactionId?: string; // Linked transaction
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

// --- CLOUD TRANSFER TYPES ---
export interface StockTransferPayload {
    id: string; // Transfer ID
    fromStoreId: string;
    toStoreId: string;
    timestamp: string;
    items: {
        id: string; // Product/Material ID
        type: 'product' | 'raw_material';
        name: string;
        qty: number;
    }[];
    notes?: string;
}

// Global App Data State
export interface AppData {
  products: Product[];
  categories: string[];
  rawMaterials: RawMaterial[];
  transactionRecords: Transaction[];
  users: User[];
  expenses: Expense[];
  otherIncomes: OtherIncome[];
  suppliers: Supplier[];
  purchases: Purchase[];
  stockAdjustments: StockAdjustment[];
  customers: Customer[];
  discountDefinitions: DiscountDefinition[];
  heldCarts: HeldCart[];
  sessionHistory: SessionHistory[];
  auditLogs: AuditLog[];
  balanceLogs: BalanceLog[]; // NEW
  
  receiptSettings: ReceiptSettings;
  inventorySettings: InventorySettings;
  authSettings: AuthSettings;
  sessionSettings: SessionSettings;
  membershipSettings: MembershipSettings;
}

// --- AUDIT LOG ---
export type AuditAction = 
    | 'LOGIN' 
    | 'LOGOUT' 
    | 'DELETE_PRODUCT' 
    | 'UPDATE_PRICE' 
    | 'REFUND_TRANSACTION' 
    | 'DELETE_TRANSACTION' 
    | 'STOCK_OPNAME'
    | 'STOCK_TRANSFER_IN' 
    | 'STOCK_TRANSFER_OUT'
    | 'BALANCE_TOPUP'
    | 'OTHER';

export interface AuditLog {
    id: string;
    timestamp: string;
    userId: string;
    userName: string;
    action: AuditAction;
    details: string;
    targetId?: string; // optional ID of the object affected
}

// --- CUSTOMER DISPLAY PAYLOAD (P2P) ---
export interface CustomerDisplayPayload {
    type: 'CART_UPDATE' | 'PAYMENT_SUCCESS' | 'WELCOME' | 'REFUND_ALERT' | 'REQUEST_CAMERA';
    cartItems?: CartItem[];
    subtotal?: number;
    discount?: number;
    tax?: number;
    total?: number;
    change?: number; // Only for Payment Success
    shopName?: string;
    refundReason?: string; // Only for REFUND_ALERT
    cameraImage?: string; // Only for CAMERA_RESULT (Base64)
}
