import type { AppData, Product, User } from '../../types.ts';

export const baseUser: User = {
  id: 'user-123',
  name: 'Kasir',
  pin: 'hashed',
  role: 'admin',
};

export const baseProduct: Product = {
  id: 'prod-1',
  name: 'Es Teh',
  price: 10000,
  costPrice: 4000,
  category: ['Minuman'],
  stock: 10,
  trackStock: true,
};

export const createBaseData = (): AppData => ({
  products: [baseProduct],
  categories: ['Minuman'],
  rawMaterials: [],
  transactionRecords: [],
  users: [baseUser],
  expenses: [],
  otherIncomes: [],
  suppliers: [{ id: 'sup-1', name: 'Pemasok' }],
  purchases: [],
  stockAdjustments: [],
  customers: [
    {
      id: 'cust-1',
      memberId: 'M-1',
      name: 'Pelanggan',
      points: 10,
      balance: 0,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  discountDefinitions: [],
  heldCarts: [],
  sessionHistory: [],
  auditLogs: [],
  balanceLogs: [],
  receiptSettings: {
    shopName: 'Artea',
    address: 'Jl. Test',
    footerMessage: 'Terima kasih',
    storeId: 'STORE-1',
    taxRate: 0,
    serviceChargeRate: 0,
    orderTypes: ['Dine In'],
  },
  inventorySettings: {
    enabled: true,
    preventNegativeStock: true,
    trackIngredients: false,
  },
  authSettings: {
    enabled: true,
  },
  sessionSettings: {
    enabled: false,
  },
  membershipSettings: {
    enabled: true,
    pointRules: [
      {
        id: 'rule-1',
        type: 'spend',
        description: '10k = 1 poin',
        spendAmount: 10000,
        pointsEarned: 1,
      },
    ],
    rewards: [],
  },
});

export const createRecipeData = (): AppData => ({
  ...createBaseData(),
  products: [
    {
      id: 'drink-1',
      name: 'Matcha Latte',
      price: 18000,
      costPrice: 7000,
      category: ['Minuman'],
      stock: 5,
      trackStock: true,
      recipe: [{ itemType: 'raw_material', rawMaterialId: 'rm-1', quantity: 2 }],
    },
  ],
  rawMaterials: [
    {
      id: 'rm-1',
      name: 'Susu',
      stock: 20,
      unit: 'ml',
    },
  ],
});
