import React from 'react';
import type { Transaction, ReceiptSettings } from '../types';
import { CURRENCY_FORMATTER } from '../constants';

interface ReceiptProps {
    transaction: Transaction;
    settings: ReceiptSettings;
}

const Receipt = React.forwardRef<HTMLDivElement, ReceiptProps>(({ transaction, settings }, ref) => {
    return (
        <div ref={ref} id="receipt-to-print" className="bg-white text-black font-mono text-xs p-2 w-full">
            <div className="text-center mb-2">
                <h1 className="font-bold text-sm uppercase">{settings.shopName}</h1>
                <p>{settings.address}</p>
            </div>
            <div className="border-b border-dashed border-black"></div>
            <div className="my-1 text-[10px]">
                <div className="flex justify-between">
                    <span>ID Transaksi:</span>
                    <span>{transaction.id}</span>
                </div>
                <div className="flex justify-between">
                    <span>Tanggal:</span>
                    <span>{new Date(transaction.createdAt).toLocaleString('id-ID')}</span>
                </div>
                 <div className="flex justify-between">
                    <span>Kasir:</span>
                    <span>{transaction.userName}</span>
                </div>
                {transaction.customerName && (
                    <div className="flex justify-between">
                        <span>Pelanggan:</span>
                        <span>{transaction.customerName}</span>
                    </div>
                )}
            </div>
            <div className="border-b border-dashed border-black"></div>
            <div className="my-2">
                {transaction.items.map(item => {
                    const addonsTotal = item.selectedAddons?.reduce((sum, addon) => sum + addon.price, 0) || 0;
                    const pricePerItem = item.price + addonsTotal;
                    const originalTotal = pricePerItem * item.quantity;

                    let itemDiscountAmount = 0;
                    if (item.discount) {
                        if (item.discount.type === 'amount') {
                            itemDiscountAmount = item.discount.value * item.quantity;
                        } else {
                            itemDiscountAmount = originalTotal * (item.discount.value / 100);
                        }
                    }

                    return (
                        <div key={item.cartItemId} className="mb-1">
                            <p className="uppercase">{item.name}</p>
                            {item.selectedAddons && item.selectedAddons.length > 0 && (
                                <div className="pl-2 text-[10px]">
                                    {item.selectedAddons.map(addon => (
                                        <div key={addon.id} className="flex justify-between">
                                            <span>+ {addon.name}</span>
                                            <span>{CURRENCY_FORMATTER.format(addon.price).replace('Rp', '')}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span>{item.quantity}&nbsp;x&nbsp;{CURRENCY_FORMATTER.format(pricePerItem).replace('Rp', '')}</span>
                                <span className="font-bold">{CURRENCY_FORMATTER.format(originalTotal).replace('Rp', '')}</span>
                            </div>
                            {itemDiscountAmount > 0 && (
                                <div className="flex justify-between pl-4 text-[10px]">
                                    <span>Diskon</span>
                                    <span>- {CURRENCY_FORMATTER.format(itemDiscountAmount).replace('Rp', '')}</span>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
            <div className="border-b border-dashed border-black"></div>
            <div className="mt-2 text-xs">
                <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{CURRENCY_FORMATTER.format(transaction.subtotal)}</span>
                </div>
                {transaction.cartDiscount && (
                    <div className="flex justify-between">
                        <span>Diskon ({transaction.cartDiscount.name || (transaction.cartDiscount.type === 'percentage' ? `${transaction.cartDiscount.value}%` : 'Rp')})</span>
                        <span>- {CURRENCY_FORMATTER.format(transaction.subtotal - transaction.total)}</span>
                    </div>
                )}
                 {transaction.rewardRedeemed && (
                     <div className="flex justify-between">
                        <span>Reward</span>
                        <span>- {CURRENCY_FORMATTER.format(transaction.rewardRedeemed.pointsSpent > 0 ? (transaction.items.find(i => i.rewardId === transaction.rewardRedeemed?.rewardId)?.price || 0) * -1 : 0)}</span>
                    </div>
                 )}

                <div className="flex justify-between font-bold text-sm mt-1">
                    <span>TOTAL</span>
                    <span>{CURRENCY_FORMATTER.format(transaction.total)}</span>
                </div>
            </div>
            <div className="border-b border-dashed border-black my-2"></div>
            <div className="text-center mt-2">
                <p>{settings.footerMessage}</p>
            </div>
        </div>
    );
});

export default Receipt;