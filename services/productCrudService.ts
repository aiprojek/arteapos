import type { AppData, InventorySettings, Product, RawMaterial } from '../types';

interface DependencyCheckResult {
  canDelete: boolean;
  message?: string;
}

const sortCategories = (categories: string[]) => categories.slice().sort();

export const addProductToData = (
  prevData: AppData,
  product: Omit<Product, 'id'>,
  productId: string
): AppData => ({
  ...prevData,
  products: [...prevData.products, { ...product, id: productId }],
});

export const updateProductInData = (prevData: AppData, updatedProduct: Product): AppData => ({
  ...prevData,
  products: prevData.products.map(product =>
    product.id === updatedProduct.id ? updatedProduct : product
  ),
});

export const deleteProductFromData = (prevData: AppData, productId: string): AppData => ({
  ...prevData,
  products: prevData.products.filter(product => product.id !== productId),
});

export const deleteProductsFromData = (prevData: AppData, productIds: string[]): AppData => {
  const idSet = new Set(productIds);
  return {
    ...prevData,
    products: prevData.products.filter(product => !idSet.has(product.id)),
  };
};

export const addCategoryToData = (prevData: AppData, category: string): AppData => {
  const lowerCaseCategories = prevData.categories.map(entry => entry.toLowerCase());
  if (lowerCaseCategories.includes(category.toLowerCase())) {
    return prevData;
  }

  return {
    ...prevData,
    categories: sortCategories([...prevData.categories, category]),
  };
};

export const deleteCategoryFromData = (prevData: AppData, categoryToDelete: string): AppData => ({
  ...prevData,
  categories: prevData.categories.filter(category => category !== categoryToDelete),
});

export const addRawMaterialToData = (
  prevData: AppData,
  material: Omit<RawMaterial, 'id'>,
  materialId: string
): AppData => ({
  ...prevData,
  rawMaterials: [...prevData.rawMaterials, { ...material, id: materialId }],
});

export const updateRawMaterialInData = (
  prevData: AppData,
  updatedMaterial: RawMaterial
): AppData => ({
  ...prevData,
  rawMaterials: prevData.rawMaterials.map(material =>
    material.id === updatedMaterial.id ? updatedMaterial : material
  ),
});

export const deleteRawMaterialFromData = (prevData: AppData, materialId: string): AppData => ({
  ...prevData,
  rawMaterials: prevData.rawMaterials.filter(material => material.id !== materialId),
});

export const canDeleteRawMaterial = (
  products: Product[],
  materialId: string
): DependencyCheckResult => {
  const usedInProducts = products.filter(
    product => product.recipe && product.recipe.some(recipe => recipe.rawMaterialId === materialId)
  );

  if (usedInProducts.length === 0) {
    return { canDelete: true };
  }

  const productNames = usedInProducts.map(product => product.name).slice(0, 3).join(', ');
  const moreCount =
    usedInProducts.length > 3 ? ` dan ${usedInProducts.length - 3} lainnya` : '';

  return {
    canDelete: false,
    message: `Bahan baku ini sedang digunakan dalam resep produk: ${productNames}${moreCount}. Hapus resep produk tersebut terlebih dahulu.`,
  };
};

export const updateInventorySettingsInData = (
  prevData: AppData,
  settings: InventorySettings
): AppData => ({
  ...prevData,
  inventorySettings: settings,
});
