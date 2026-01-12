
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
 * Logic Update: Support Tax per Product Override.
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
            // Tax is calculated on the price AFTER item discount
            // Note: In this logic, cart-level discount reduces tax base proportionally later, 
            // but simple POS often taxes the item price directly. 
            // Let's assume tax is on the item's selling price after item discount.
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
    cartDiscountAmount = Math.min(cartDiscountAmount, subtotalAfterItemDiscounts);
    
    // 3. Taxable Amount & Service Charge
    // If cart discount exists, we need to adjust the Tax Amount proportionally if using the per-item tax logic above?
    // COMPLEXITY: If we calculated tax per item, a global discount complicates things.
    // SIMPLIFICATION: If Cart Discount is applied, we reduce the totalTaxAmount proportionally.
    
    if (cartDiscountAmount > 0 && subtotalAfterItemDiscounts > 0) {
        const discountRatio = 1 - (cartDiscountAmount / subtotalAfterItemDiscounts);
        totalTaxAmount = Math.round(totalTaxAmount * discountRatio);
    }

    const taxableAmount = subtotalAfterItemDiscounts - cartDiscountAmount;
    
    // 4. Hitung Service Charge (biasanya sebelum pajak, dan kena pajak lagi? atau terpisah?)
    // Di Indonesia biasanya SC kena pajak. Tapi untuk simplifikasi aplikasi UMKM ini:
    // Service Charge dihitung dari subtotal akhir, dan Pajak adalah akumulasi pajak item.
    
    const serviceChargeRate = settings.serviceChargeRate || 0;
    const serviceChargeAmount = Math.round(taxableAmount * (serviceChargeRate / 100));
    
    // If service charge is taxable, we add tax on SC here using global rate? 
    // Let's keep it simple: SC is separate. Tax is sum of item taxes.
    
    // 6. Final Total
    const finalTotal = taxableAmount + serviceChargeAmount + totalTaxAmount;
    
    return { 
        subtotal, 
        itemDiscountAmount, 
        cartDiscountAmount, 
        taxAmount: totalTaxAmount, 
        serviceChargeAmount, 
        finalTotal 
    };
};
