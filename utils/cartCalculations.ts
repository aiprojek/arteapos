
import type { CartItem, Discount, ReceiptSettings } from '../types';

interface CartTotals {
    subtotal: number;
    itemDiscountAmount: number;
    cartDiscountAmount: number;
    taxAmount: number;
    serviceChargeAmount: number;
    finalTotal: number;
}

/**
 * Menghitung total keranjang belanja termasuk diskon, pajak, dan service charge.
 * Logic Update: Support Tax per Product Override & Math.round for currency precision.
 */
export const calculateCartTotals = (
    cart: CartItem[], 
    cartDiscount: Discount | null, 
    settings: ReceiptSettings
): CartTotals => {
    let subtotal = 0;
    let itemDiscountAmount = 0;
    let totalTaxAmount = 0;

    // 1. Hitung Subtotal, Diskon per Item, dan Pajak per Item
    cart.forEach(item => {
        if(item.isReward) {
            // Reward items typically have 0 or negative price
            subtotal += item.price * item.quantity;
            return;
        }
        
        // Harga dasar + Addons + Modifiers
        const addonsTotal = item.selectedAddons?.reduce((sum, addon) => sum + addon.price, 0) || 0;
        const modifiersTotal = item.selectedModifiers?.reduce((sum, mod) => sum + mod.price, 0) || 0;

        const itemOriginalTotal = (item.price + addonsTotal + modifiersTotal) * item.quantity;
        
        let currentItemDiscount = 0;
        if (item.discount) {
            if (item.discount.type === 'amount') {
                currentItemDiscount = item.discount.value * item.quantity;
            } else {
                currentItemDiscount = itemOriginalTotal * (item.discount.value / 100);
            }
        }
        
        // Diskon tidak boleh melebihi harga item
        currentItemDiscount = Math.min(currentItemDiscount, itemOriginalTotal);
        
        const itemTotalAfterDiscount = itemOriginalTotal - currentItemDiscount;

        subtotal += itemOriginalTotal;
        itemDiscountAmount += currentItemDiscount;

        // CALCULATE TAX PER ITEM
        // Prioritize Product Specific Tax, otherwise fallback to Global Settings
        const applicableTaxRate = item.taxRate !== undefined ? item.taxRate : (settings.taxRate || 0);
        
        if (applicableTaxRate > 0) {
            // Calculate tax and ROUND immediately to avoid cumulative float errors
            const itemTax = Math.round(itemTotalAfterDiscount * (applicableTaxRate / 100));
            totalTaxAmount += itemTax;
        }
    });

    // 2. Hitung Diskon Keranjang (Global)
    const subtotalAfterItemDiscounts = subtotal - itemDiscountAmount;
    let cartDiscountAmount = 0;
    
    if (cartDiscount) {
        if (cartDiscount.type === 'amount') {
            cartDiscountAmount = cartDiscount.value;
        } else {
            cartDiscountAmount = subtotalAfterItemDiscounts * (cartDiscount.value / 100);
        }
    }
    // Diskon keranjang tidak boleh melebihi subtotal tersisa
    cartDiscountAmount = Math.round(Math.min(cartDiscountAmount, subtotalAfterItemDiscounts));
    
    // 3. Taxable Amount & Service Charge
    // If cart discount exists, we need to adjust the Tax Amount proportionally?
    // SIMPLIFICATION: We reduce the accumulated tax by the ratio of Cart Discount.
    // This is an approximation to keep things simple in a mixed-tax environment.
    
    if (cartDiscountAmount > 0 && subtotalAfterItemDiscounts > 0) {
        const discountRatio = 1 - (cartDiscountAmount / subtotalAfterItemDiscounts);
        totalTaxAmount = Math.round(totalTaxAmount * discountRatio);
    }

    const taxableAmount = subtotalAfterItemDiscounts - cartDiscountAmount;
    
    // 4. Hitung Service Charge
    const serviceChargeRate = settings.serviceChargeRate || 0;
    const serviceChargeAmount = Math.round(taxableAmount * (serviceChargeRate / 100));
    
    // 6. Final Total
    const finalTotal = Math.round(taxableAmount + serviceChargeAmount + totalTaxAmount);
    
    return { 
        subtotal: Math.round(subtotal), 
        itemDiscountAmount: Math.round(itemDiscountAmount), 
        cartDiscountAmount, 
        taxAmount: totalTaxAmount, 
        serviceChargeAmount, 
        finalTotal 
    };
};
