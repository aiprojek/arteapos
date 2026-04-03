import type {
  AppData,
  Purchase,
  PurchaseStatus,
  StockAdjustment,
  StockTransferPayload,
} from '../types';

interface OpnameItem {
  id: string;
  type: 'product' | 'raw_material';
  systemStock: number;
  actualStock: number;
  name: string;
}

interface AddStockAdjustmentInput {
  prevData: AppData;
  productId: string;
  quantity: number;
  notes?: string;
  now?: Date;
}

interface PerformStockOpnameInput {
  prevData: AppData;
  items: OpnameItem[];
  notes?: string;
  now?: Date;
}

interface ProcessIncomingTransfersInput {
  prevData: AppData;
  transfers: StockTransferPayload[];
  now?: Date;
}

interface ProcessOutgoingTransferInput {
  prevData: AppData;
  targetStoreId: string;
  items: StockTransferPayload['items'];
  notes: string;
  now?: Date;
}

interface ValidationFailure {
  title: string;
  message: string;
}

interface CreatePurchaseInput {
  prevData: AppData;
  purchaseData: Omit<Purchase, 'id' | 'status' | 'supplierName' | 'totalAmount'>;
  purchaseId: string;
  now?: Date;
}

interface CreatePurchaseResult {
  nextData: AppData;
  purchase: Purchase | null;
}

export const applyStockAdjustmentToData = ({
  prevData,
  productId,
  quantity,
  notes,
  now = new Date(),
}: AddStockAdjustmentInput): AppData => {
  const createdAt = now.toISOString();
  const productIndex = prevData.products.findIndex(product => product.id === productId);
  if (productIndex > -1) {
    const product = prevData.products[productIndex];
    const newStock = (product.stock || 0) + quantity;
    const updatedProducts = [...prevData.products];
    updatedProducts[productIndex] = { ...product, stock: newStock };

    const newAdjustment: StockAdjustment = {
      id: now.getTime().toString(),
      productId: product.id,
      productName: product.name,
      change: quantity,
      newStock,
      notes,
      createdAt,
    };

    return {
      ...prevData,
      products: updatedProducts,
      stockAdjustments: [newAdjustment, ...(prevData.stockAdjustments || [])],
    };
  }

  const materialIndex = prevData.rawMaterials.findIndex(material => material.id === productId);
  if (materialIndex > -1) {
    const material = prevData.rawMaterials[materialIndex];
    const newStock = (material.stock || 0) + quantity;
    const updatedMaterials = [...prevData.rawMaterials];
    updatedMaterials[materialIndex] = { ...material, stock: newStock };

    const newAdjustment: StockAdjustment = {
      id: now.getTime().toString(),
      productId: material.id,
      productName: material.name,
      change: quantity,
      newStock,
      notes,
      createdAt,
    };

    return {
      ...prevData,
      rawMaterials: updatedMaterials,
      stockAdjustments: [newAdjustment, ...(prevData.stockAdjustments || [])],
    };
  }

  return prevData;
};

export const performStockOpnameToData = ({
  prevData,
  items,
  notes = '',
  now = new Date(),
}: PerformStockOpnameInput): AppData => {
  const createdAt = now.toISOString();
  let updatedProducts = [...prevData.products];
  let updatedMaterials = [...prevData.rawMaterials];
  const newAdjustments: StockAdjustment[] = [];

  items.forEach((item, index) => {
    const diff = item.actualStock - item.systemStock;
    if (diff === 0) return;

    if (item.type === 'product') {
      const productIndex = updatedProducts.findIndex(product => product.id === item.id);
      if (productIndex > -1) {
        updatedProducts[productIndex] = { ...updatedProducts[productIndex], stock: item.actualStock };
      }
    } else {
      const materialIndex = updatedMaterials.findIndex(material => material.id === item.id);
      if (materialIndex > -1) {
        updatedMaterials[materialIndex] = { ...updatedMaterials[materialIndex], stock: item.actualStock };
      }
    }

    newAdjustments.push({
      id: `${now.getTime()}-${index}`,
      productId: item.id,
      productName: item.name,
      change: diff,
      newStock: item.actualStock,
      notes: `[Stock Opname] ${notes}`,
      createdAt,
    });
  });

  return {
    ...prevData,
    products: updatedProducts,
    rawMaterials: updatedMaterials,
    stockAdjustments: [...newAdjustments, ...(prevData.stockAdjustments || [])],
  };
};

export const processIncomingTransfersToData = ({
  prevData,
  transfers,
  now = new Date(),
}: ProcessIncomingTransfersInput): { nextData: AppData; totalAdded: number } => {
  let totalAdded = 0;
  const createdAt = now.toISOString();
  let updatedProducts = [...prevData.products];
  let updatedMaterials = [...prevData.rawMaterials];
  const newAdjustments: StockAdjustment[] = [];

  transfers.forEach(transfer => {
    const transferNote = `Transfer dari ${transfer.fromStoreId} (${new Date(transfer.timestamp).toLocaleDateString()})`;

    transfer.items.forEach((item, idx) => {
      if (item.type === 'product') {
        const productIndex = updatedProducts.findIndex(product => product.id === item.id);
        if (productIndex > -1 && updatedProducts[productIndex].trackStock) {
          const oldStock = updatedProducts[productIndex].stock || 0;
          const newStock = oldStock + item.qty;
          updatedProducts[productIndex] = { ...updatedProducts[productIndex], stock: newStock };

          newAdjustments.push({
            id: `TRANS-IN-${transfer.id}-${idx}`,
            productId: item.id,
            productName: item.name,
            change: item.qty,
            newStock,
            notes: `${transferNote} - ${transfer.notes || ''}`,
            createdAt,
          });
          totalAdded++;
        }
      } else {
        const materialIndex = updatedMaterials.findIndex(material => material.id === item.id);
        if (materialIndex > -1) {
          const oldStock = updatedMaterials[materialIndex].stock || 0;
          const newStock = oldStock + item.qty;
          updatedMaterials[materialIndex] = { ...updatedMaterials[materialIndex], stock: newStock };

          newAdjustments.push({
            id: `TRANS-IN-${transfer.id}-${idx}`,
            productId: item.id,
            productName: item.name,
            change: item.qty,
            newStock,
            notes: `${transferNote} - ${transfer.notes || ''}`,
            createdAt,
          });
          totalAdded++;
        }
      }
    });
  });

  return {
    totalAdded,
    nextData: {
      ...prevData,
      products: updatedProducts,
      rawMaterials: updatedMaterials,
      stockAdjustments: [...newAdjustments, ...(prevData.stockAdjustments || [])],
    },
  };
};

export const processOutgoingTransferToData = ({
  prevData,
  targetStoreId,
  items,
  notes,
  now = new Date(),
}: ProcessOutgoingTransferInput): { nextData: AppData; error?: ValidationFailure } => {
  for (const item of items) {
    if (item.qty <= 0) {
      return {
        nextData: prevData,
        error: {
          title: 'Jumlah Tidak Valid',
          message: `Jumlah transfer untuk "${item.name}" harus lebih dari 0.`,
        },
      };
    }

    if (item.type === 'product') {
      const product = prevData.products.find(entry => entry.id === item.id);
      if (product?.trackStock && (product.stock || 0) < item.qty) {
        return {
          nextData: prevData,
          error: {
            title: 'Stok Tidak Cukup',
            message: `Produk "${item.name}" hanya tersedia ${(product.stock || 0)}.`,
          },
        };
      }
    } else {
      const material = prevData.rawMaterials.find(entry => entry.id === item.id);
      if (material && (material.stock || 0) < item.qty) {
        return {
          nextData: prevData,
          error: {
            title: 'Stok Tidak Cukup',
            message: `Bahan "${item.name}" hanya tersedia ${(material.stock || 0)}.`,
          },
        };
      }
    }
  }

  const createdAt = now.toISOString();
  const notePrefix = `Transfer Keluar ke ${targetStoreId}`;
  let updatedProducts = [...prevData.products];
  let updatedMaterials = [...prevData.rawMaterials];
  const newAdjustments: StockAdjustment[] = [];

  items.forEach((item, idx) => {
    if (item.type === 'product') {
      const productIndex = updatedProducts.findIndex(product => product.id === item.id);
      if (productIndex > -1 && updatedProducts[productIndex].trackStock) {
        const oldStock = updatedProducts[productIndex].stock || 0;
        const newStock = oldStock - item.qty;
        updatedProducts[productIndex] = { ...updatedProducts[productIndex], stock: newStock };

        newAdjustments.push({
          id: `TRANS-OUT-${now.getTime()}-${idx}`,
          productId: item.id,
          productName: item.name,
          change: -item.qty,
          newStock,
          notes: `${notePrefix} - ${notes}`,
          createdAt,
        });
      }
    } else {
      const materialIndex = updatedMaterials.findIndex(material => material.id === item.id);
      if (materialIndex > -1) {
        const oldStock = updatedMaterials[materialIndex].stock || 0;
        const newStock = oldStock - item.qty;
        updatedMaterials[materialIndex] = { ...updatedMaterials[materialIndex], stock: newStock };

        newAdjustments.push({
          id: `TRANS-OUT-${now.getTime()}-${idx}`,
          productId: item.id,
          productName: item.name,
          change: -item.qty,
          newStock,
          notes: `${notePrefix} - ${notes}`,
          createdAt,
        });
      }
    }
  });

  return {
    nextData: {
      ...prevData,
      products: updatedProducts,
      rawMaterials: updatedMaterials,
      stockAdjustments: [...newAdjustments, ...(prevData.stockAdjustments || [])],
    },
  };
};

export const createPurchaseInData = ({
  prevData,
  purchaseData,
  purchaseId,
  now = new Date(),
}: CreatePurchaseInput): CreatePurchaseResult => {
  const supplier = prevData.suppliers.find(entry => entry.id === purchaseData.supplierId);
  if (!supplier) {
    return { nextData: prevData, purchase: null };
  }

  const totalAmount = purchaseData.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const status: PurchaseStatus =
    purchaseData.amountPaid >= totalAmount ? 'lunas' : 'belum-lunas';

  const purchase: Purchase = {
    ...purchaseData,
    id: purchaseId,
    supplierName: supplier.name,
    totalAmount,
    status,
  };

  let updatedRawMaterials = [...prevData.rawMaterials];
  let updatedProducts = [...prevData.products];
  let updatedStockAdjustments = [...(prevData.stockAdjustments || [])];

  purchase.items.forEach(item => {
    if (item.itemType === 'raw_material' && item.rawMaterialId) {
      const materialIndex = updatedRawMaterials.findIndex(material => material.id === item.rawMaterialId);
      if (materialIndex > -1) {
        updatedRawMaterials[materialIndex] = {
          ...updatedRawMaterials[materialIndex],
          stock: updatedRawMaterials[materialIndex].stock + item.quantity,
        };
      }
    } else if (item.itemType === 'product' && item.productId) {
      const productIndex = updatedProducts.findIndex(product => product.id === item.productId);
      if (productIndex > -1) {
        const product = updatedProducts[productIndex];
        if (product.trackStock) {
          const newStock = (product.stock || 0) + item.quantity;
          updatedProducts[productIndex] = { ...product, stock: newStock };

          updatedStockAdjustments.unshift({
            id: `${purchaseId}-${item.productId}`,
            productId: product.id,
            productName: product.name,
            change: item.quantity,
            newStock,
            notes: `Pembelian dari ${supplier.name} (ID: ${purchase.id})`,
            createdAt: now.toISOString(),
          });
        }
      }
    }
  });

  return {
    purchase,
    nextData: {
      ...prevData,
      purchases: [purchase, ...prevData.purchases].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
      rawMaterials: updatedRawMaterials,
      products: updatedProducts,
      stockAdjustments: updatedStockAdjustments,
    },
  };
};
