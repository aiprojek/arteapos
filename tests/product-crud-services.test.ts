import test from 'node:test';
import assert from 'node:assert/strict';

import {
  addCategoryToData,
  addProductToData,
  addRawMaterialToData,
  canDeleteRawMaterial,
  deleteCategoryFromData,
  deleteProductFromData,
  deleteRawMaterialFromData,
  updateInventorySettingsInData,
  updateProductInData,
  updateRawMaterialInData,
} from '../services/productCrudService.ts';
import { createBaseData, createRecipeData } from './helpers/testData.ts';

test('product CRUD adds, updates, and deletes products', () => {
  const prevData = createBaseData();

  const withProduct = addProductToData(
    prevData,
    {
      name: 'Americano',
      price: 15000,
      costPrice: 6000,
      category: ['Minuman'],
      stock: 6,
      trackStock: true,
    },
    'prod-2'
  );

  assert.equal(withProduct.products.length, 2);
  assert.equal(withProduct.products[1].id, 'prod-2');

  const updated = updateProductInData(withProduct, {
    ...withProduct.products[1],
    price: 17000,
  });
  assert.equal(updated.products[1].price, 17000);

  const deleted = deleteProductFromData(updated, 'prod-2');
  assert.equal(deleted.products.length, 1);
  assert.equal(deleted.products[0].id, 'prod-1');
});

test('category CRUD keeps sorted unique values', () => {
  const prevData = createBaseData();

  const withNewCategory = addCategoryToData(prevData, 'Makanan');
  assert.deepEqual(withNewCategory.categories, ['Makanan', 'Minuman']);

  const unchanged = addCategoryToData(withNewCategory, 'makanan');
  assert.equal(unchanged, withNewCategory);

  const deleted = deleteCategoryFromData(withNewCategory, 'Minuman');
  assert.deepEqual(deleted.categories, ['Makanan']);
});

test('raw material CRUD and dependency checks behave correctly', () => {
  const prevData = createRecipeData();

  const blocked = canDeleteRawMaterial(prevData.products, 'rm-1');
  assert.equal(blocked.canDelete, false);
  assert.match(blocked.message || '', /Matcha Latte/);

  const allowed = canDeleteRawMaterial(prevData.products, 'rm-999');
  assert.deepEqual(allowed, { canDelete: true });

  const withMaterial = addRawMaterialToData(
    prevData,
    {
      name: 'Gula Aren',
      stock: 10,
      unit: 'gram',
    },
    'rm-2'
  );
  assert.equal(withMaterial.rawMaterials.length, 2);

  const updated = updateRawMaterialInData(withMaterial, {
    ...withMaterial.rawMaterials[1],
    stock: 15,
  });
  assert.equal(updated.rawMaterials[1].stock, 15);

  const deleted = deleteRawMaterialFromData(updated, 'rm-2');
  assert.deepEqual(deleted.rawMaterials.map(material => material.id), ['rm-1']);
});

test('inventory settings update replaces settings slice only', () => {
  const prevData = createBaseData();
  const next = updateInventorySettingsInData(prevData, {
    enabled: true,
    preventNegativeStock: false,
    trackIngredients: true,
  });

  assert.deepEqual(next.inventorySettings, {
    enabled: true,
    preventNegativeStock: false,
    trackIngredients: true,
  });
  assert.equal(next.products, prevData.products);
});
