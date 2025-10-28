import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import type { Product, Transaction, CartItem, AppData, ReceiptSettings, InventorySettings, RawMaterial, User, AuthSettings, SessionState, SessionSettings, Payment, PaymentMethod, PaymentStatus, Expense, Supplier, Purchase, PurchaseStatus, PurchaseItem, StockAdjustment, ExpenseStatus, Customer, MembershipSettings, Reward, HeldCart, Discount, Addon, DiscountDefinition } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { INITIAL_PRODUCTS } from '../constants';
import type { AlertType, AlertVariant } from '../components/AlertModal';

const SYSTEM_USER: User = { id: 'system', name: 'Admin Sistem', pin: '', role: 'admin' };

interface AlertState {
  isOpen: boolean;
  title: string;
  message: string | React.ReactNode;
  type: AlertType;
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: AlertVariant;
}

interface AppContextType {
  // Data
  products: Product[];
  categories: string[];
  rawMaterials: RawMaterial[];
  transactions: Transaction[];
  users: User[];
  cart: CartItem[];
  cartDiscount: Discount | null;
  receiptSettings: ReceiptSettings;
  inventorySettings: InventorySettings;
  authSettings: AuthSettings;
  session: SessionState | null;
  sessionSettings: SessionSettings;
  expenses: Expense[];
  suppliers: Supplier[];
  purchases: Purchase[];
  stockAdjustments: StockAdjustment[];
  customers: Customer[];
  membershipSettings: MembershipSettings;
  appliedReward: { reward: Reward, cartItem: CartItem } | null;
  heldCarts: HeldCart[];
  activeHeldCartId: string | null;
  discountDefinitions: DiscountDefinition[];


  // Alert/Confirmation System
  alertState: AlertState;
  showAlert: (config: Omit<AlertState, 'isOpen'>) => void;
  hideAlert: () => void;

  // Auth
  currentUser: User | null;
  login: (user: User, pin: string) => boolean;
  logout: () => void;
  resetDefaultAdminPin: () => string | null;
  
  // User Management
  addUser: (user: Omit<User, 'id'>) => void;
  updateUser: (user: User) => void;
  deleteUser: (userId: string) => void;
  resetUserPin: (userId: string) => string | null;

  // Customer Management
  addCustomer: (customer: Omit<Customer, 'id' | 'memberId' | 'points' | 'createdAt'>) => void;
  updateCustomer: (customer: Customer) => void;
  deleteCustomer: (customerId: string) => void;

  // Membership & Reward Management
  updateMembershipSettings: (settings: MembershipSettings) => void;
  applyRewardToCart: (reward: Reward, customer: Customer) => void;
  removeRewardFromCart: () => void;

  // Discount Management
  addDiscountDefinition: (discount: Omit<DiscountDefinition, 'id'>) => void;
  updateDiscountDefinition: (discount: DiscountDefinition) => void;
  deleteDiscountDefinition: (discountId: string) => void;

  // Product & Category Management
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (productId: string) => void;
  addCategory: (category: string) => void;
  deleteCategory: (category: string) => void;
  findProductByBarcode: (barcode: string) => Product | undefined;

  // Raw Material Management
  addRawMaterial: (material: Omit<RawMaterial, 'id'>) => void;
  updateRawMaterial: (material: RawMaterial) => void;
  deleteRawMaterial: (materialId: string) => void;
  
  // Cart & Transaction
  addToCart: (product: Product) => void;
  addConfiguredItemToCart: (product: Product, addons: Addon[]) => void;
  updateCartQuantity: (cartItemId: string, quantity: number) => void;
  removeFromCart: (cartItemId: string) => void;
  clearCart: () => void;
  saveTransaction: (details: {
    payments: Array<Omit<Payment, 'id' | 'createdAt'>>;
    customerName?: string;
    customerContact?: string;
    customerId?: string;
  }) => Transaction;
  addPaymentToTransaction: (transactionId: string, payments: Array<Omit<Payment, 'id' | 'createdAt'>>) => void;
  getCartTotals: () => { subtotal: number; itemDiscountAmount: number; cartDiscountAmount: number; finalTotal: number };
  isProductAvailable: (product: Product) => { available: boolean, reason: string };
  applyItemDiscount: (cartItemId: string, discount: Discount) => void;
  removeItemDiscount: (cartItemId: string) => void;
  applyCartDiscount: (discount: Discount) => void;
  removeCartDiscount: () => void;

  // Held Carts (Order Tabs)
  holdActiveCart: (name: string) => void;
  switchActiveCart: (cartId: string | null) => void;
  deleteHeldCart: (cartId: string) => void;
  updateHeldCartName: (cartId: string, newName: string) => void;

  // Stock Management
  addStockAdjustment: (productId: string, quantity: number, notes?: string) => void;

  // Finance Management
  addExpense: (expense: Omit<Expense, 'id' | 'status'>) => void;
  updateExpense: (expense: Expense) => void;
  deleteExpense: (expenseId: string) => void;
  addPaymentToExpense: (expenseId: string, amount: number) => void;
  addSupplier: (supplier: Omit<Supplier, 'id'>) => void;
  updateSupplier: (supplier: Supplier) => void;
  deleteSupplier: (supplierId: string) => void;
  addPurchase: (purchase: Omit<Purchase, 'id' | 'status' | 'supplierName' | 'totalAmount'>) => void;
  addPaymentToPurchase: (purchaseId: string, amount: number) => void;
  
  // Session Management
  startSession: (startingCash: number) => void;
  endSession: () => void;

  // Settings & Data
  restoreData: (data: AppData) => void;
  bulkAddProducts: (newProducts: Product[]) => void;
  bulkAddRawMaterials: (newRawMaterials: RawMaterial[]) => void;
  updateReceiptSettings: (settings: ReceiptSettings) => void;
  updateInventorySettings: (settings: InventorySettings) => void;
  updateAuthSettings: (settings: AuthSettings) => void;
  updateSessionSettings: (settings: SessionSettings) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const initialData: AppData = {
    products: INITIAL_PRODUCTS,
    categories: ['Kopi', 'Non-Kopi', 'Makanan'],
    rawMaterials: [],
    transactions: [],
    users: [],
    receiptSettings: {
        shopName: 'Artea POS',
        address: 'Jalan Teknologi No. 1',
        footerMessage: 'Terima kasih telah berbelanja!',
        enableKitchenPrinter: false,
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
}

// FIX: Changed the 'data' parameter type from AppData to 'any' to allow for migration of old data formats from localStorage.
// This resolves type errors where the compiler would incorrectly infer types for legacy data structures.
const migrateData = (data: any): AppData => {
    // Migrate product categories from string to string[]
    const migratedProducts = (data.products || []).map((p: any) => {
        if (typeof p.category === 'string') {
            return { ...p, category: [p.category].filter(Boolean) };
        }
        return p;
    });

    // Create initial categories from migrated products if none exist
    let migratedCategories = data.categories || [];
    if (migratedCategories.length === 0) {
        const categoriesFromProducts = new Set(migratedProducts.flatMap((p: any) => p.category || []));
        migratedCategories = Array.from(categoriesFromProducts);
    }
    
    // Migrate old expenses to include payment status
    const migratedExpenses = (data.expenses || []).map((e: any) => {
        if ('status' in e) return e;
        // If status doesn't exist, assume it was fully paid
        return {
            ...e,
            amountPaid: e.amount,
            status: 'lunas' as ExpenseStatus,
        };
    });

    // Add costPerUnit to old raw materials
    const migratedRawMaterials = (data.rawMaterials || []).map((rm: any) => {
        if ('costPerUnit' in rm) return rm;
        return { ...rm, costPerUnit: 0 };
    });

    const migrated = { 
        ...data, 
        products: migratedProducts, 
        categories: migratedCategories, 
        expenses: migratedExpenses,
        rawMaterials: migratedRawMaterials
    };

    if (!migrated.customers) migrated.customers = [];
    if (!migrated.membershipSettings) migrated.membershipSettings = { enabled: false, pointRules: [], rewards: [] };
    if (!migrated.stockAdjustments) migrated.stockAdjustments = [];
    if (!migrated.heldCarts) migrated.heldCarts = [];
    if (migrated.sessionSettings && typeof migrated.sessionSettings.enableCartHolding === 'undefined') {
        migrated.sessionSettings.enableCartHolding = false;
    }
    if (migrated.receiptSettings && typeof migrated.receiptSettings.enableKitchenPrinter === 'undefined') {
        migrated.receiptSettings.enableKitchenPrinter = false;
    }
    if (!migrated.discountDefinitions) migrated.discountDefinitions = [];


    return migrated;
}


export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [data, setData] = useLocalStorage<AppData>('ai-projek-pos-data', initialData, migrateData);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartDiscount, setCartDiscount] = useState<Discount | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [session, setSession] = useLocalStorage<SessionState | null>('ai-projek-pos-session', null);
  const [alertState, setAlertState] = useState<AlertState>({
    isOpen: false,
    title: '',
    message: '',
    type: 'alert',
    onConfirm: () => {},
  });
  const [appliedReward, setAppliedReward] = useState<{ reward: Reward, cartItem: CartItem } | null>(null);
  const [activeHeldCartId, setActiveHeldCartId] = useState<string | null>(null);

  
  const { products, transactions, receiptSettings, inventorySettings, rawMaterials, users, authSettings, sessionSettings, expenses, suppliers, purchases, stockAdjustments, categories, customers, membershipSettings, discountDefinitions = [], heldCarts = [] } = data;

  useEffect(() => {
    if (authSettings?.enabled) {
        setCurrentUser(null);
    } else {
        setCurrentUser(SYSTEM_USER);
    }
  }, [authSettings?.enabled]);
  
  const showAlert = useCallback((config: Omit<AlertState, 'isOpen'>) => {
    setAlertState({ ...config, isOpen: true });
  }, []);

  const hideAlert = useCallback(() => {
    setAlertState(prev => ({ ...prev, isOpen: false }));
  }, []);


  // Initialize with a default admin user if none exist
  useState(() => {
      if (!data.users || data.users.length === 0) {
          const defaultAdmin: User = {
              id: 'admin_default',
              name: 'Admin',
              pin: '1111',
              role: 'admin'
          };
          setData(prev => ({...prev, users: [defaultAdmin]}));
      }
  });

  const login = useCallback((user: User, pin: string): boolean => {
    if (!authSettings.enabled) return false;
    
    if (user && user.pin === pin) {
      setCurrentUser(user);
      return true;
    }
    return false;
  }, [authSettings.enabled]);

  const logout = useCallback(() => {
    if (authSettings.enabled) {
        setCurrentUser(null);
    }
  }, [authSettings.enabled]);

  const resetDefaultAdminPin = useCallback(() => {
    let adminName: string | null = null;
    setData(prev => {
        const adminIndex = prev.users.findIndex(u => u.role === 'admin');
        if (adminIndex > -1) {
            adminName = prev.users[adminIndex].name;
            const updatedUsers = [...prev.users];
            updatedUsers[adminIndex] = { ...updatedUsers[adminIndex], pin: '1111' };
            return { ...prev, users: updatedUsers };
        }
        return prev;
    });
    return adminName;
  }, [setData]);

  const addUser = useCallback((user: Omit<User, 'id'>) => {
    const newUser = { ...user, id: Date.now().toString() };
    setData(prev => ({ ...prev, users: [...prev.users, newUser]}));
  }, [setData]);

  const updateUser = useCallback((updatedUser: User) => {
    setData(prev => ({...prev, users: prev.users.map(u => u.id === updatedUser.id ? updatedUser : u)}));
  }, [setData]);

  const deleteUser = useCallback((userId: string) => {
    setData(prev => ({...prev, users: prev.users.filter(u => u.id !== userId)}));
  }, [setData]);

  const resetUserPin = useCallback((userId: string) => {
    let userName: string | null = null;
    setData(prev => {
        const userIndex = prev.users.findIndex(u => u.id === userId);
        if (userIndex > -1) {
            userName = prev.users[userIndex].name;
            const updatedUsers = [...prev.users];
            updatedUsers[userIndex] = { ...updatedUsers[userIndex], pin: '0000' };
            return { ...prev, users: updatedUsers };
        }
        return prev;
    });
    return userName;
  }, [setData]);

  const addCustomer = useCallback((customerData: Omit<Customer, 'id' | 'memberId' | 'points' | 'createdAt'>) => {
    setData(prev => {
        const sortedCustomers = [...prev.customers].sort((a,b) => parseInt(a.memberId.split('-')[1]) - parseInt(b.memberId.split('-')[1]));
        const lastMemberId = sortedCustomers.length > 0 ? sortedCustomers[sortedCustomers.length - 1].memberId.split('-')[1] : '0';
        const newIdNumber = parseInt(lastMemberId, 10) + 1;
        const newMemberId = `CUST-${String(newIdNumber).padStart(4, '0')}`;
        const newCustomer: Customer = {
            ...customerData,
            id: Date.now().toString(),
            memberId: newMemberId,
            points: 0,
            createdAt: new Date().toISOString(),
        };
        return { ...prev, customers: [newCustomer, ...prev.customers] };
    });
  }, [setData]);

  const updateCustomer = useCallback((updatedCustomer: Customer) => {
    setData(prev => ({...prev, customers: prev.customers.map(c => c.id === updatedCustomer.id ? updatedCustomer : c)}));
  }, [setData]);

  const deleteCustomer = useCallback((customerId: string) => {
      showAlert({
        type: 'confirm',
        title: 'Hapus Pelanggan?',
        message: 'Apakah Anda yakin ingin menghapus pelanggan ini? Riwayat transaksi mereka akan tetap ada.',
        onConfirm: () => {
             setData(prev => ({...prev, customers: prev.customers.filter(c => c.id !== customerId)}));
        },
        confirmVariant: 'danger',
        confirmText: 'Ya, Hapus'
    });
  }, [setData, showAlert]);

  const updateMembershipSettings = useCallback((settings: MembershipSettings) => {
    setData(prev => ({ ...prev, membershipSettings: settings }));
  }, [setData]);
  
  const addDiscountDefinition = useCallback((discountData: Omit<DiscountDefinition, 'id'>) => {
    const newDiscount = { ...discountData, id: Date.now().toString() };
    setData(prev => ({ ...prev, discountDefinitions: [...(prev.discountDefinitions || []), newDiscount] }));
  }, [setData]);

  const updateDiscountDefinition = useCallback((updatedDiscount: DiscountDefinition) => {
      setData(prev => ({
          ...prev,
          discountDefinitions: (prev.discountDefinitions || []).map(d => d.id === updatedDiscount.id ? updatedDiscount : d)
      }));
  }, [setData]);

  const deleteDiscountDefinition = useCallback((discountId: string) => {
      setData(prev => ({
          ...prev,
          discountDefinitions: (prev.discountDefinitions || []).filter(d => d.id !== discountId)
      }));
  }, [setData]);

  const removeRewardFromCart = useCallback(() => {
    setCart(prev => prev.filter(item => !item.isReward));
    setAppliedReward(null);
  }, [setCart, setAppliedReward]);

  const applyRewardToCart = useCallback((reward: Reward, customer: Customer) => {
    if (customer.points < reward.pointsCost) {
        showAlert({ type: 'alert', title: 'Poin Tidak Cukup', message: 'Poin pelanggan tidak cukup untuk menukarkan reward ini.' });
        return;
    }

    let rewardCartItem: CartItem | null = null;
    if (reward.type === 'discount_amount' && reward.discountValue) {
        rewardCartItem = {
            id: `reward-${reward.id}`,
            cartItemId: `reward-${Date.now()}`,
            name: `Reward: ${reward.name}`,
            price: -reward.discountValue,
            quantity: 1,
            isReward: true,
            rewardId: reward.id,
            category: [],
        };
    } else if (reward.type === 'free_product' && reward.freeProductId) {
        const product = products.find(p => p.id === reward.freeProductId);
        if (product) {
            rewardCartItem = {
                ...product,
                cartItemId: `reward-${Date.now()}`,
                price: 0,
                quantity: 1,
                isReward: true,
                rewardId: reward.id,
                name: `${product.name} (Reward)`,
            };
        } else {
             showAlert({ type: 'alert', title: 'Produk Tidak Ditemukan', message: 'Produk untuk reward ini tidak dapat ditemukan.' });
             return;
        }
    }

    if (rewardCartItem) {
        removeRewardFromCart(); // Hapus reward lama jika ada
        setCart(prev => [...prev, rewardCartItem!]);
        setAppliedReward({ reward, cartItem: rewardCartItem });
    }
    // FIX: Add removeRewardFromCart to dependency array.
  }, [products, showAlert, removeRewardFromCart]);


  const addProduct = useCallback((product: Omit<Product, 'id'>) => {
    const newProduct = { ...product, id: Date.now().toString() };
    setData(prev => ({ ...prev, products: [...prev.products, newProduct] }));
  }, [setData]);

  const updateProduct = useCallback((updatedProduct: Product) => {
    setData(prev => ({
      ...prev,
      products: prev.products.map(p => p.id === updatedProduct.id ? updatedProduct : p)
    }));
  }, [setData]);
  
  const deleteProduct = useCallback((productId: string) => {
    showAlert({
      type: 'confirm',
      title: 'Hapus Produk?',
      message: 'Apakah Anda yakin ingin menghapus produk ini? Tindakan ini tidak dapat diurungkan.',
      onConfirm: () => {
        setData(prev => ({ ...prev, products: prev.products.filter(p => p.id !== productId) }));
      },
      confirmVariant: 'danger',
      confirmText: 'Ya, Hapus'
    });
  }, [setData, showAlert]);
  
  const findProductByBarcode = useCallback((barcode: string) => {
    return products.find(p => p.barcode === barcode);
  }, [products]);

  const addCategory = useCallback((category: string) => {
    setData(prev => {
        const lowerCaseCategories = prev.categories.map(c => c.toLowerCase());
        if (!lowerCaseCategories.includes(category.toLowerCase())) {
            return { ...prev, categories: [...prev.categories, category].sort() };
        }
        return prev;
    });
  }, [setData]);

  const deleteCategory = useCallback((categoryToDelete: string) => {
    setData(prev => ({ ...prev, categories: prev.categories.filter(c => c !== categoryToDelete) }));
  }, [setData]);

  const addRawMaterial = useCallback((material: Omit<RawMaterial, 'id'>) => {
    const newMaterial = { ...material, id: Date.now().toString() };
    setData(prev => ({ ...prev, rawMaterials: [...prev.rawMaterials, newMaterial] }));
  }, [setData]);

  const updateRawMaterial = useCallback((updatedMaterial: RawMaterial) => {
    setData(prev => ({
      ...prev,
      rawMaterials: prev.rawMaterials.map(m => m.id === updatedMaterial.id ? updatedMaterial : m)
    }));
  }, [setData]);

  const deleteRawMaterial = useCallback((materialId: string) => {
    showAlert({
        type: 'confirm',
        title: 'Hapus Bahan Baku?',
        message: 'Apakah Anda yakin ingin menghapus bahan baku ini? Ini mungkin mempengaruhi resep produk.',
        onConfirm: () => {
            setData(prev => ({ ...prev, rawMaterials: prev.rawMaterials.filter(m => m.id !== materialId) }));
        },
        confirmVariant: 'danger',
        confirmText: 'Ya, Hapus'
    });
  }, [setData, showAlert]);

  const addStockAdjustment = useCallback((productId: string, quantity: number, notes?: string) => {
    setData(prev => {
        const productIndex = prev.products.findIndex(p => p.id === productId);
        if (productIndex === -1) return prev;

        const product = prev.products[productIndex];
        const newStock = (product.stock || 0) + quantity;
        
        const updatedProduct: Product = { ...product, stock: newStock };
        const updatedProducts = [...prev.products];
        updatedProducts[productIndex] = updatedProduct;

        const newAdjustment: StockAdjustment = {
            id: Date.now().toString(),
            productId: product.id,
            productName: product.name,
            change: quantity,
            newStock,
            notes,
            createdAt: new Date().toISOString(),
        };

        const currentAdjustments = prev.stockAdjustments || [];

        return {
            ...prev,
            products: updatedProducts,
            stockAdjustments: [newAdjustment, ...currentAdjustments],
        };
    });
  }, [setData]);


    // --- Finance Management ---
    const addExpense = useCallback((expenseData: Omit<Expense, 'id' | 'status'>) => {
        const status: ExpenseStatus = expenseData.amountPaid >= expenseData.amount ? 'lunas' : 'belum-lunas';
        const newExpense = { ...expenseData, id: Date.now().toString(), status };
        setData(prev => ({ ...prev, expenses: [newExpense, ...prev.expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) }));
    }, [setData]);

    const updateExpense = useCallback((updatedExpenseData: Expense) => {
        const status: ExpenseStatus = updatedExpenseData.amountPaid >= updatedExpenseData.amount ? 'lunas' : 'belum-lunas';
        const updatedExpense = { ...updatedExpenseData, status };
        setData(prev => ({ ...prev, expenses: prev.expenses.map(e => e.id === updatedExpense.id ? updatedExpense : e).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) }));
    }, [setData]);

    const deleteExpense = useCallback((expenseId: string) => {
        setData(prev => ({ ...prev, expenses: prev.expenses.filter(e => e.id !== expenseId) }));
    }, [setData]);

    const addPaymentToExpense = useCallback((expenseId: string, amount: number) => {
        setData(prev => {
            const updatedExpenses = prev.expenses.map(e => {
                if (e.id === expenseId) {
                    const newAmountPaid = e.amountPaid + amount;
                    const newStatus: ExpenseStatus = newAmountPaid >= e.amount ? 'lunas' : 'belum-lunas';
                    return { ...e, amountPaid: newAmountPaid, status: newStatus };
                }
                return e;
            });
            return { ...prev, expenses: updatedExpenses };
        });
    }, [setData]);
    
    const addSupplier = useCallback((supplier: Omit<Supplier, 'id'>) => {
        const newSupplier = { ...supplier, id: Date.now().toString() };
        setData(prev => ({ ...prev, suppliers: [newSupplier, ...prev.suppliers].sort((a,b) => a.name.localeCompare(b.name)) }));
    }, [setData]);

    const updateSupplier = useCallback((updatedSupplier: Supplier) => {
        setData(prev => ({ ...prev, suppliers: prev.suppliers.map(s => s.id === updatedSupplier.id ? updatedSupplier : s).sort((a,b) => a.name.localeCompare(b.name)) }));
    }, [setData]);

    const deleteSupplier = useCallback((supplierId: string) => {
        setData(prev => ({ ...prev, suppliers: prev.suppliers.filter(s => s.id !== supplierId) }));
    }, [setData]);

    const addPurchase = useCallback((purchaseData: Omit<Purchase, 'id' | 'status' | 'supplierName' | 'totalAmount'>) => {
        setData(prev => {
            const supplier = prev.suppliers.find(s => s.id === purchaseData.supplierId);
            if (!supplier) {
                console.error("Supplier not found for purchase");
                return prev;
            }

            const totalAmount = purchaseData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const status: PurchaseStatus = purchaseData.amountPaid >= totalAmount ? 'lunas' : 'belum-lunas';

            const newPurchase: Purchase = {
                ...purchaseData,
                id: Date.now().toString(),
                supplierName: supplier.name,
                totalAmount,
                status,
            };
            
            let updatedRawMaterials = [...prev.rawMaterials];
            let updatedProducts = [...prev.products];
            let updatedStockAdjustments = [...(prev.stockAdjustments || [])];

            newPurchase.items.forEach(item => {
                if (item.itemType === 'raw_material' && item.rawMaterialId) {
                    const materialIndex = updatedRawMaterials.findIndex(m => m.id === item.rawMaterialId);
                    if (materialIndex > -1) {
                        updatedRawMaterials[materialIndex].stock += item.quantity;
                    }
                } else if (item.itemType === 'product' && item.productId) {
                    const productIndex = updatedProducts.findIndex(p => p.id === item.productId);
                    if (productIndex > -1) {
                        const product = updatedProducts[productIndex];
                        if (product.trackStock) {
                            const newStock = (product.stock || 0) + item.quantity;
                            updatedProducts[productIndex] = { ...product, stock: newStock };

                            const newAdjustment: StockAdjustment = {
                                id: `${Date.now().toString()}-${item.productId}`,
                                productId: product.id,
                                productName: product.name,
                                change: item.quantity,
                                newStock,
                                notes: `Pembelian dari ${supplier.name} (ID: ${newPurchase.id})`,
                                createdAt: new Date().toISOString(),
                            };
                            updatedStockAdjustments.unshift(newAdjustment);
                        }
                    }
                }
            });


            return {
                ...prev,
                purchases: [newPurchase, ...prev.purchases].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
                rawMaterials: updatedRawMaterials,
                products: updatedProducts,
                stockAdjustments: updatedStockAdjustments,
            };
        });
    }, [setData]);

    const addPaymentToPurchase = useCallback((purchaseId: string, amount: number) => {
        setData(prev => {
            const updatedPurchases = prev.purchases.map(p => {
                if (p.id === purchaseId) {
                    const newAmountPaid = p.amountPaid + amount;
                    const newStatus: PurchaseStatus = newAmountPaid >= p.totalAmount ? 'lunas' : 'belum-lunas';
                    return { ...p, amountPaid: newAmountPaid, status: newStatus };
                }
                return p;
            });
            return { ...prev, purchases: updatedPurchases };
        });
    }, [setData]);
  
  const isProductAvailable = useCallback((product: Product): { available: boolean, reason: string } => {
    if (!inventorySettings.enabled) return { available: true, reason: '' };

    if (inventorySettings.trackIngredients && product.recipe && product.recipe.length > 0) {
      for (const recipeItem of product.recipe) {
        const material = rawMaterials.find(m => m.id === recipeItem.rawMaterialId);
        if (!material || material.stock < recipeItem.quantity) {
          return { available: false, reason: 'Bahan Habis' };
        }
      }
      return { available: true, reason: '' };
    }

    if (product.trackStock) {
      if ((product.stock ?? 0) <= 0) {
        return { available: false, reason: 'Stok Habis' };
      }
    }
    
    return { available: true, reason: '' };
  }, [inventorySettings, rawMaterials]);


  const addToCart = useCallback((product: Product) => {
    setCart(prevCart => {
      const { available, reason } = isProductAvailable(product);
      if (!available) {
        showAlert({
            type: 'alert',
            title: 'Gagal Menambahkan Produk',
            message: `Tidak dapat menambahkan ${product.name}. ${reason}.`
        });
        return prevCart;
      }
      
      const existingItem = prevCart.find(item => item.id === product.id && !item.isReward && !item.selectedAddons);
      if (existingItem) {
        return prevCart.map(item =>
          item.cartItemId === existingItem.cartItemId ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { ...product, quantity: 1, cartItemId: Date.now().toString() }];
    });
  }, [isProductAvailable, showAlert]);

  const addConfiguredItemToCart = useCallback((product: Product, addons: Addon[]) => {
      setCart(prevCart => {
         const { available, reason } = isProductAvailable(product);
         if (!available) {
            showAlert({ type: 'alert', title: 'Gagal Menambahkan Produk', message: `Tidak dapat menambahkan ${product.name}. ${reason}.`});
            return prevCart;
         }
         const newItem: CartItem = {
             ...product,
             quantity: 1,
             cartItemId: Date.now().toString(),
             selectedAddons: addons,
         };
         return [...prevCart, newItem];
      });
  }, [isProductAvailable, showAlert]);


  const updateCartQuantity = useCallback((cartItemId: string, quantity: number) => {
    setCart(prevCart => {
      if (quantity <= 0) {
        return prevCart.filter(item => item.cartItemId !== cartItemId || item.isReward);
      }
      return prevCart.map(item =>
        item.cartItemId === cartItemId && !item.isReward ? { ...item, quantity } : item
      );
    });
  }, []);

  const removeFromCart = useCallback((cartItemId: string) => {
    setCart(prevCart => prevCart.filter(item => item.cartItemId !== cartItemId || item.isReward));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setAppliedReward(null);
    setCartDiscount(null);
  }, []);

  const getCartTotals = useCallback(() => {
    let subtotal = 0;
    let itemDiscountAmount = 0;

    cart.forEach(item => {
        const addonsTotal = item.selectedAddons?.reduce((sum, addon) => sum + addon.price, 0) || 0;
        const itemOriginalTotal = (item.price + addonsTotal) * item.quantity;
        
        let currentItemDiscount = 0;
        
        if (item.discount) {
            if (item.discount.type === 'amount') {
                currentItemDiscount = item.discount.value * item.quantity;
            } else { // percentage
                currentItemDiscount = itemOriginalTotal * (item.discount.value / 100);
            }
        }
        
        currentItemDiscount = Math.min(currentItemDiscount, itemOriginalTotal);
        
        subtotal += itemOriginalTotal;
        itemDiscountAmount += currentItemDiscount;
    });

    const subtotalAfterItemDiscounts = subtotal - itemDiscountAmount;
    let cartDiscountAmount = 0;

    if (cartDiscount) {
        if (cartDiscount.type === 'amount') {
            cartDiscountAmount = cartDiscount.value;
        } else { // percentage
            cartDiscountAmount = subtotalAfterItemDiscounts * (cartDiscount.value / 100);
        }
    }
    
    cartDiscountAmount = Math.min(cartDiscountAmount, subtotalAfterItemDiscounts);
    
    const finalTotal = subtotalAfterItemDiscounts - cartDiscountAmount;

    return { subtotal, itemDiscountAmount, cartDiscountAmount, finalTotal };
  }, [cart, cartDiscount]);

    const applyItemDiscount = useCallback((cartItemId: string, discount: Discount) => {
        setCart(prev => prev.map(item => item.cartItemId === cartItemId ? { ...item, discount } : item));
    }, []);

    const removeItemDiscount = useCallback((cartItemId: string) => {
        setCart(prev => prev.map(item => {
            if (item.cartItemId === cartItemId) {
                const { discount, ...rest } = item;
                return rest;
            }
            return item;
        }));
    }, []);

    const applyCartDiscount = useCallback((discount: Discount) => {
        setCartDiscount(discount);
    }, []);

    const removeCartDiscount = useCallback(() => {
        setCartDiscount(null);
    }, []);


  // --- Held Carts (Order Tabs) Logic ---
  const saveCurrentCartState = useCallback(() => {
    if (activeHeldCartId) {
        setData(prev => {
            const currentCartInState = prev.heldCarts?.find(c => c.id === activeHeldCartId);
            if (currentCartInState && JSON.stringify(currentCartInState.items) !== JSON.stringify(cart)) {
                return {
                    ...prev,
                    heldCarts: (prev.heldCarts || []).map(hc =>
                        hc.id === activeHeldCartId ? { ...hc, items: cart } : hc
                    )
                };
            }
            return prev;
        });
    }
  }, [activeHeldCartId, cart, setData]);

  const switchActiveCart = useCallback((newCartId: string | null) => {
      saveCurrentCartState();
      removeRewardFromCart();
      removeCartDiscount();
      
      if (newCartId === null) {
          setCart([]);
          setActiveHeldCartId(null);
      } else {
          const targetCart = heldCarts.find(c => c.id === newCartId);
          if (targetCart) {
              setCart(targetCart.items);
              setActiveHeldCartId(newCartId);
          }
      }
  }, [saveCurrentCartState, removeRewardFromCart, heldCarts, removeCartDiscount]);
  
  const holdActiveCart = useCallback((name: string) => {
      if (cart.length === 0) {
          showAlert({ type: 'alert', title: 'Keranjang Kosong', message: 'Tidak dapat menyimpan keranjang yang kosong.' });
          return;
      }
      saveCurrentCartState();
      const newHeldCart: HeldCart = { id: Date.now().toString(), name, items: cart };
      setData(prev => ({ ...prev, heldCarts: [...(prev.heldCarts || []), newHeldCart] }));
      
      switchActiveCart(newHeldCart.id);
      showAlert({ type: 'alert', title: 'Tersimpan', message: `Pesanan "${name}" berhasil disimpan.` });
  }, [cart, saveCurrentCartState, setData, switchActiveCart, showAlert]);

  const deleteHeldCart = useCallback((cartId: string) => {
      showAlert({
          type: 'confirm',
          title: 'Hapus Pesanan?',
          message: 'Anda yakin ingin menghapus pesanan yang disimpan ini secara permanen?',
          confirmVariant: 'danger',
          onConfirm: () => {
              if (cartId === activeHeldCartId) {
                  switchActiveCart(null);
              }
              setData(prev => {
                const newHeldCarts = (prev.heldCarts || []).filter(c => c.id !== cartId);
                return { ...prev, heldCarts: newHeldCarts };
            });
          }
      });
  }, [activeHeldCartId, setData, switchActiveCart, showAlert]);

  const updateHeldCartName = useCallback((cartId: string, newName: string) => {
      setData(prev => ({
          ...prev,
          heldCarts: (prev.heldCarts || []).map(c => c.id === cartId ? { ...c, name: newName } : c)
      }));
  }, [setData]);


  const saveTransaction = useCallback(({ payments, customerName, customerContact, customerId }: {
    payments: Array<Omit<Payment, 'id' | 'createdAt'>>;
    customerName?: string;
    customerContact?: string;
    customerId?: string;
  }) => {
    if (cart.length === 0) throw new Error("Cart is empty");
    if (!currentUser) throw new Error("No user is logged in");

    const { subtotal, finalTotal } = getCartTotals();
    const amountPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    
    let paymentStatus: PaymentStatus;
    if (amountPaid >= finalTotal) {
        paymentStatus = 'paid';
    } else if (amountPaid > 0) {
        paymentStatus = 'partial';
    } else {
        paymentStatus = 'unpaid';
    }
    
    const now = new Date();
    const fullPayments: Payment[] = payments.map((p, index) => ({
        ...p,
        id: `${now.getTime()}-${index}`,
        createdAt: now.toISOString(),
    }));

    const cartWithCost = cart.map(item => {
        const product = products.find(p => p.id === item.id);
        if (inventorySettings.enabled && inventorySettings.trackIngredients && product?.recipe) {
             const recipeCost = product.recipe.reduce((sum, recipeItem) => {
                const material = rawMaterials.find(rm => rm.id === recipeItem.rawMaterialId);
                return sum + ((material?.costPerUnit || 0) * recipeItem.quantity);
            }, 0);
            return { ...item, costPrice: recipeCost };
        }
        return { ...item, costPrice: product?.costPrice };
    });

    const newTransaction: Transaction = {
      id: now.getTime().toString(),
      items: cartWithCost,
      subtotal,
      cartDiscount,
      total: finalTotal,
      amountPaid,
      paymentStatus,
      payments: fullPayments,
      createdAt: now.toISOString(),
      userId: currentUser.id,
      userName: currentUser.name,
      customerName: customerName,
      customerContact: customerContact,
      customerId,
    };

    setData(prev => {
        let updatedCustomers = prev.customers;
        let updatedProducts = prev.products;
        let updatedRawMaterials = prev.rawMaterials;
        let updatedHeldCarts = prev.heldCarts || [];


        // Membership Point Calculation
        if (prev.membershipSettings.enabled && customerId) {
            const customer = prev.customers.find(c => c.id === customerId);
            if(customer) {
                let pointsEarned = 0;
                const cartWithoutRewards = cart.filter(item => !item.isReward);
                const spendTotal = cartWithoutRewards.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                
                prev.membershipSettings.pointRules.forEach(rule => {
                    if(rule.type === 'spend' && rule.spendAmount && rule.spendAmount > 0 && rule.pointsEarned) {
                        pointsEarned += Math.floor(spendTotal / rule.spendAmount) * rule.pointsEarned;
                    } else if ((rule.type === 'product' || rule.type === 'category') && rule.targetId && rule.pointsPerItem) {
                        cartWithoutRewards.forEach(item => {
                            const isMatch = (rule.type === 'product' && item.id === rule.targetId) || 
                                            (rule.type === 'category' && item.category.includes(rule.targetId));
                            if(isMatch) {
                                pointsEarned += (item.quantity * rule.pointsPerItem);
                            }
                        });
                    }
                });
                
                newTransaction.pointsEarned = pointsEarned;
                
                let pointsSpent = 0;
                if (appliedReward) {
                    pointsSpent = appliedReward.reward.pointsCost;
                    newTransaction.rewardRedeemed = {
                        rewardId: appliedReward.reward.id,
                        pointsSpent: pointsSpent,
                        description: appliedReward.reward.name,
                    };
                }
                
                const finalPoints = customer.points + pointsEarned - pointsSpent;

                updatedCustomers = prev.customers.map(c => c.id === customerId ? {...c, points: finalPoints} : c);
            }
        }

        // Held Cart Update
        if (activeHeldCartId) {
            updatedHeldCarts = updatedHeldCarts.filter(c => c.id !== activeHeldCartId);
        }
        
        // Inventory Reduction
        if (prev.inventorySettings.enabled) {
            const rawMaterialUpdates = new Map<string, number>();
            const cartWithoutFreeRewards = cart.filter(item => !(item.isReward && item.price === 0));

            cartWithoutFreeRewards.forEach(item => {
                const product = prev.products.find(p => p.id === item.id);
                if (!product) return;

                if (prev.inventorySettings.trackIngredients && product.recipe && product.recipe.length > 0) {
                    product.recipe.forEach(recipeItem => {
                        const totalQuantityToDecrement = recipeItem.quantity * item.quantity;
                        const current = rawMaterialUpdates.get(recipeItem.rawMaterialId) || 0;
                        rawMaterialUpdates.set(recipeItem.rawMaterialId, current + totalQuantityToDecrement);
                    });
                } 
                else if (product.trackStock) {
                    updatedProducts = updatedProducts.map(p => 
                        p.id === item.id 
                        ? { ...p, stock: (p.stock || 0) - item.quantity }
                        : p
                    );
                }
            });

            if (rawMaterialUpdates.size > 0) {
                updatedRawMaterials = prev.rawMaterials.map(m => {
                    if (rawMaterialUpdates.has(m.id)) {
                        return { ...m, stock: m.stock - (rawMaterialUpdates.get(m.id) || 0) };
                    }
                    return m;
                });
            }
        }
        
        // Return single, combined state update
        return { 
            ...prev,
            transactions: [newTransaction, ...prev.transactions],
            products: updatedProducts,
            rawMaterials: updatedRawMaterials,
            customers: updatedCustomers,
            heldCarts: updatedHeldCarts,
        };
    });
    
    // Switch to a new empty cart after transaction
    switchActiveCart(null);
    return newTransaction;
  }, [cart, getCartTotals, setData, clearCart, products, currentUser, appliedReward, activeHeldCartId, switchActiveCart, cartDiscount, inventorySettings, rawMaterials]);
  
  const addPaymentToTransaction = useCallback((transactionId: string, payments: Array<Omit<Payment, 'id' | 'createdAt'>>) => {
    setData(prev => {
        const targetTransaction = prev.transactions.find(t => t.id === transactionId);
        if (!targetTransaction) {
            console.error("Transaction not found for payment update");
            return prev;
        }

        const now = new Date();
        const fullNewPayments: Payment[] = payments.map((p, index) => ({
            ...p,
            id: `${now.getTime()}-${index}`,
            createdAt: now.toISOString(),
        }));

        const updatedPayments = [...targetTransaction.payments, ...fullNewPayments];
        const newAmountPaid = updatedPayments.reduce((sum, p) => sum + p.amount, 0);

        let newPaymentStatus: PaymentStatus;
        if (newAmountPaid >= targetTransaction.total) {
            newPaymentStatus = 'paid';
        } else if (newAmountPaid > 0) {
            newPaymentStatus = 'partial';
        } else {
            newPaymentStatus = 'unpaid';
        }
        
        const updatedTransaction: Transaction = {
            ...targetTransaction,
            payments: updatedPayments,
            amountPaid: newAmountPaid,
            paymentStatus: newPaymentStatus,
        };

        const updatedTransactions = prev.transactions.map(t => 
            t.id === transactionId ? updatedTransaction : t
        );

        return { ...prev, transactions: updatedTransactions };
    });
  }, [setData]);

  const restoreData = useCallback((backupData: AppData) => {
      let dataToRestore = { ...initialData, ...backupData };
      if (!dataToRestore.rawMaterials) dataToRestore.rawMaterials = [];
      if (!dataToRestore.users) dataToRestore.users = [];
      if (!dataToRestore.authSettings) dataToRestore.authSettings = { enabled: false };
      if (!dataToRestore.sessionSettings) dataToRestore.sessionSettings = { enabled: false };
      if (!dataToRestore.expenses) dataToRestore.expenses = [];
      if (!dataToRestore.suppliers) dataToRestore.suppliers = [];
      if (!dataToRestore.purchases) dataToRestore.purchases = [];
      if (!dataToRestore.stockAdjustments) dataToRestore.stockAdjustments = [];
      if (!dataToRestore.categories) dataToRestore.categories = [];
      if (!dataToRestore.customers) dataToRestore.customers = [];
      if (!dataToRestore.membershipSettings) dataToRestore.membershipSettings = { enabled: false, pointRules: [], rewards: [] };
      if (!dataToRestore.heldCarts) dataToRestore.heldCarts = [];
      if (!dataToRestore.discountDefinitions) dataToRestore.discountDefinitions = [];


      if (typeof dataToRestore.inventorySettings.trackIngredients === 'undefined') {
          dataToRestore.inventorySettings.trackIngredients = false;
      }
      
      dataToRestore = migrateData(dataToRestore);

      // Data migration for old transactions before paymentStatus was introduced
      dataToRestore.transactions = dataToRestore.transactions.map((t: any) => {
          if ('paymentStatus' in t) {
              return t;
          }
          // Old transaction, assume it was fully paid by cash
          return {
              ...t,
              amountPaid: t.total,
              paymentStatus: 'paid',
              payments: [{
                  id: `${new Date(t.createdAt).getTime()}-migrated`,
                  amount: t.total,
                  method: 'cash',
                  createdAt: t.createdAt,
              }]
          };
      });
      setData(dataToRestore);
  }, [setData]);

  const bulkAddProducts = useCallback((newProducts: Product[]) => {
    setData(prev => {
        const productMap = new Map(prev.products.map(p => [p.id, p]));
        newProducts.forEach(p => productMap.set(p.id, p));
        return { ...prev, products: Array.from(productMap.values()) };
    });
  }, [setData]);

  const bulkAddRawMaterials = useCallback((newRawMaterials: RawMaterial[]) => {
    setData(prev => {
        const materialMap = new Map(prev.rawMaterials.map(m => [m.id, m]));
        newRawMaterials.forEach(m => materialMap.set(m.id, m));
        return { ...prev, rawMaterials: Array.from(materialMap.values()) };
    });
  }, [setData]);
  
  const updateReceiptSettings = useCallback((settings: ReceiptSettings) => {
    setData(prev => ({ ...prev, receiptSettings: settings }));
  }, [setData]);
  
  const updateInventorySettings = useCallback((settings: InventorySettings) => {
    setData(prev => ({ ...prev, inventorySettings: settings }));
  }, [setData]);

  const updateAuthSettings = useCallback((settings: AuthSettings) => {
    setData(prev => ({ ...prev, authSettings: settings }));
  }, [setData]);

  const updateSessionSettings = useCallback((settings: SessionSettings) => {
    setData(prev => ({ ...prev, sessionSettings: settings }));
  }, [setData]);

  const startSession = useCallback((startingCash: number) => {
    setSession({ startingCash, startTime: new Date().toISOString() });
  }, [setSession]);

  const endSession = useCallback(() => {
    setSession(null);
  }, [setSession]);

  return (
    <AppContext.Provider
      value={{
        products,
        categories,
        rawMaterials,
        transactions,
        users,
        cart,
        cartDiscount,
        receiptSettings,
        inventorySettings,
        authSettings: authSettings || { enabled: false }, // Fallback for safety
        session,
        sessionSettings: sessionSettings || { enabled: false }, // Fallback for safety
        expenses,
        suppliers,
        purchases,
        stockAdjustments: stockAdjustments || [],
        customers,
        membershipSettings,
        appliedReward,
        heldCarts,
        activeHeldCartId,
        discountDefinitions,
        alertState,
        showAlert,
        hideAlert,
        currentUser,
        login,
        logout,
        resetDefaultAdminPin,
        addUser,
        updateUser,
        deleteUser,
        resetUserPin,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        updateMembershipSettings,
        applyRewardToCart,
        removeRewardFromCart,
        addDiscountDefinition,
        updateDiscountDefinition,
        deleteDiscountDefinition,
        addProduct,
        updateProduct,
        deleteProduct,
        addCategory,
        deleteCategory,
        findProductByBarcode,
        addRawMaterial,
        updateRawMaterial,
        deleteRawMaterial,
        addToCart,
        addConfiguredItemToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        saveTransaction,
        addPaymentToTransaction,
        getCartTotals,
        applyItemDiscount,
        removeItemDiscount,
        applyCartDiscount,
        removeCartDiscount,
        holdActiveCart,
        switchActiveCart,
        deleteHeldCart,
        updateHeldCartName,
        startSession,
        endSession,
        restoreData,
        bulkAddProducts,
        bulkAddRawMaterials,
        updateReceiptSettings,
        updateInventorySettings,
        updateAuthSettings,
        updateSessionSettings,
        isProductAvailable,
        addStockAdjustment,
        addExpense,
        updateExpense,
        deleteExpense,
        addPaymentToExpense,
        addSupplier,
        updateSupplier,
        deleteSupplier,
        addPurchase,
        addPaymentToPurchase,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};