
export type View = 'dashboard' | 'pos' | 'products' | 'raw-materials' | 'finance' | 'reports' | 'settings' | 'help' | 'customer-display' | 'kitchen-display';

export type PaymentMethod = 'cash' | 'non-cash' | 'member-balance';
export type PaymentStatus = 'paid' | 'unpaid' | 'partial' | 'refunded';
export type OrderType = string;

export interface Payment {
  id: string;
  method: PaymentMethod;
  amount: number;
  createdAt: string;
  evidenceImageUrl?: string;
}

export interface Discount {
  name?: string;
  type: 'percentage' | 'amount';
  value: number;
}

export interface Branch {
  id: string;
  name: string;
  address?: string;
}

export interface BranchPrice {
  storeId: string;
  price: number;
}

export interface ModifierOption {
  id: string;
  name: string;
  price: number;
  costPrice?: number;
}

export interface ModifierGroup {
  id: string;
  name: string;
  minSelection: number;
  maxSelection: number;
  options: ModifierOption[];
}

export interface SelectedModifier {
  groupId: string;
  groupName: string;
  optionId: string;
  name: string;
  price: number;
}

export interface ProductVariant {
  id: string;
  name: string;
  price: number;
  costPrice?: number;
}

export interface Addon {
  id: string;
  name: string;
  price: number;
  costPrice?: number;
}

export interface RecipeItem {
  itemType: 'product' | 'raw_material';
  productId?: string;
  rawMaterialId?: string;
  quantity: number;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  costPrice?: number;
  category: string[];
  stock?: number;
  trackStock?: boolean;
  barcode?: string;
  image?: Blob;
  imageUrl?: string;
  isFavorite?: boolean;
  variants?: ProductVariant[];
  addons?: Addon[];
  modifierGroups?: ModifierGroup[];
  recipe?: RecipeItem[];
  validStoreIds?: string[];
  branchPrices?: BranchPrice[];
  taxRate?: number;
}

export interface RawMaterial {
  id: string;
  name: string;
  stock: number;
  unit: string;
  costPerUnit?: number;
  purchaseUnit?: string;
  conversionRate?: number;
  validStoreIds?: string[];
}

export interface CartItem extends Product {
  cartItemId: string;
  quantity: number;
  selectedVariant?: ProductVariant;
  selectedAddons?: Addon[];
  selectedModifiers?: SelectedModifier[];
  discount?: Discount;
  isReward?: boolean;
  rewardId?: string;
  note?: string;
}

export interface Transaction {
  id: string;
  items: CartItem[];
  subtotal: number;
  cartDiscount?: Discount | null;
  total: number;
  amountPaid: number;
  tax?: number;
  serviceCharge?: number;
  orderType?: OrderType;
  tableNumber?: string; // NEW
  paxCount?: number;    // NEW
  paymentStatus: PaymentStatus;
  payments: Payment[];
  createdAt: string;
  userId: string;
  userName: string;
  customerName?: string;
  customerContact?: string;
  customerId?: string;
  storeId?: string;
  customerPointsSnapshot?: number;
  customerBalanceSnapshot?: number;
  pointsEarned?: number;
  rewardRedeemed?: {
      rewardId: string;
      pointsSpent: number;
      description: string;
  };
}

export interface User {
  id: string;
  name: string;
  pin: string;
  role: 'admin' | 'manager' | 'staff' | 'viewer';
  assignedBranch?: string;
}

export interface ReceiptSettings {
  shopName: string;
  address: string;
  footerMessage: string;
  storeId?: string;
  taxRate?: number;
  serviceChargeRate?: number;
  enableKitchenPrinter?: boolean;
  adminWhatsapp?: string;
  adminTelegram?: string;
  branches?: Branch[];
  orderTypes?: string[];
}

export interface InventorySettings {
  enabled: boolean;
  preventNegativeStock?: boolean;
  trackIngredients?: boolean;
}

export interface AuthSettings {
  enabled: boolean;
  securityQuestion?: string;
  securityAnswer?: string;
}

export interface SessionSettings {
  enabled: boolean;
  enableCartHolding?: boolean; 
  enableBlindAudit?: boolean; 
  enableTableManagement?: boolean; 
  requireTableInfo?: boolean; // NEW: Mandatory Table/Pax check
}

export interface CashMovement {
  id: string;
  type: 'in' | 'out';
  amount: number;
  description: string;
  timestamp: string; 
  userId: string;
  userName: string;
}

export interface SessionState {
  id: string; 
  startingCash: number;
  startTime: string; 
  userId: string; 
  userName: string;
  cashMovements: CashMovement[]; 
}

export interface SessionHistory extends SessionState {
    endTime: string;
    totalSales: number; 
    cashInTotal: number;
    cashOutTotal: number;
    expectedCash: number;
    actualCash: number;
    variance: number; 
}

export type ExpenseStatus = 'lunas' | 'belum-lunas';

export interface Expense {
  id: string;
  description: string;
  amount: number;
  amountPaid: number;
  status: ExpenseStatus;
  category: string;
  date: string; 
  evidenceImageUrl?: string; 
  paymentMethod?: PaymentMethod; 
  storeId?: string;
}

export interface OtherIncome {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string; 
  evidenceImageUrl?: string; 
  paymentMethod?: PaymentMethod; 
  storeId?: string;
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
    price: number; 
    conversionApplied?: boolean; 
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
    date: string; 
    evidenceImageUrl?: string; 
    paymentMethod?: PaymentMethod; 
    storeId?: string;
}

export interface StockAdjustment {
    id: string;
    productId: string;
    productName: string;
    change: number; 
    newStock: number;
    notes?: string;
    createdAt: string; 
    storeId?: string;
}

export interface Customer {
  id: string;
  memberId: string; 
  name: string;
  contact?: string; 
  points: number;
  balance: number; 
  createdAt: string; 
}

export interface BalanceLog {
    id: string;
    customerId: string;
    type: 'topup' | 'payment' | 'refund' | 'correction' | 'change_deposit';
    amount: number;
    description: string;
    timestamp: string;
    transactionId?: string; 
}

export type PointRuleType = 'spend' | 'product' | 'category';

export interface PointRule {
  id: string;
  type: PointRuleType;
  description: string;
  spendAmount?: number;
  pointsEarned?: number;
  targetId?: string; 
  pointsPerItem?: number;
  validStoreIds?: string[]; 
}

export type RewardType = 'discount_amount' | 'free_product';

export interface Reward {
  id: string;
  name: string;
  type: RewardType;
  pointsCost: number;
  discountValue?: number;
  freeProductId?: string;
}

export interface MembershipSettings {
  enabled: boolean;
  pointRules: PointRule[];
  rewards: Reward[];
}

export interface DiscountDefinition {
    id: string;
    name: string;
    type: 'percentage' | 'amount';
    value: number;
    isActive: boolean;
    startDate?: string;
    endDate?: string;
    validStoreIds?: string[];
}

export interface HeldCart {
    id: string;
    name: string;
    items: CartItem[];
    orderType?: OrderType;
    tableNumber?: string; // NEW
    paxCount?: number;    // NEW
}

export interface StockTransferPayload {
    id: string; 
    fromStoreId: string;
    toStoreId: string;
    timestamp: string;
    items: {
        id: string; 
        type: 'product' | 'raw_material';
        name: string;
        qty: number;
    }[];
    notes?: string;
}

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
    targetId?: string; 
    storeId?: string;
}

export interface CustomerDisplayPayload {
    type: 'CART_UPDATE' | 'PAYMENT_SUCCESS' | 'WELCOME' | 'REFUND_ALERT' | 'REQUEST_CAMERA';
    cartItems?: CartItem[];
    subtotal?: number;
    discount?: number;
    tax?: number;
    total?: number;
    change?: number; 
    shopName?: string;
    refundReason?: string; 
    cameraImage?: string; 
}

export interface KitchenDisplayPayload {
    type: 'NEW_ORDER';
    orderId: string;
    orderType: string;
    customerName: string;
    items: CartItem[];
    timestamp: string;
    isPaid: boolean;
    tableNumber?: string; // NEW
    paxCount?: number;    // NEW
}

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
  balanceLogs: BalanceLog[]; 
  
  receiptSettings: ReceiptSettings;
  inventorySettings: InventorySettings;
  authSettings: AuthSettings;
  sessionSettings: SessionSettings;
  membershipSettings: MembershipSettings;
}
