
import React from 'react';
import type { Transaction as TransactionType, ReceiptSettings } from '../types';
import { CURRENCY_FORMATTER } from '../constants';

interface ReceiptProps {
    transaction: TransactionType;
    settings: ReceiptSettings;
}

const WATERMARK_PATH = `m 7.4847131,91.696532 c -0.955144,-0.31127 -1.786142,-1.04943 -2.217636,-1.9699 -0.5244,-1.27971 -0.201199,-2.56329 0.320849,-3.78483 2.92093,-6.8857 7.5750739,-13.99307 12.5551279,-19.17303 l 0.8951,-0.93103 -0.374563,-0.86353 c -0.817115,-1.8838 -1.564511,-4.49971 -1.914401,-6.700471 -0.931168,-5.856932 -0.146411,-11.971369 2.259228,-17.602768 1.751824,-4.100873 4.65858,-8.172087 7.426644,-10.401778 3.829489,-3.084682 9.410329,-5.302874 17.423863,-6.925388 3.208572,-0.649646 6.113868,-1.103179 13.236547,-2.066298 11.861019,-1.60383 13.889087,-2.119176 19.622446,-4.986191 3.794758,-1.897599 8.038728,-4.471472 11.686488,-7.0502559 1.123567,-0.794305 1.437252,-1.099775 2.692918,-1.040227 1.106158,0.05246 1.626677,0.214442 2.282939,0.710446 1.397637,1.056332 1.620188,2.0795349 1.619736,7.4467289 0,5.012825 -0.430316,9.286155 -1.424047,14.155752 -3.759068,18.420658 -14.018944,33.38204 -29.862207,43.54632 -11.656738,7.47841 -22.215344,9.28013 -31.155349,5.31635 -3.090786,-1.37038 -6.610519,-3.96906 -8.830055,-6.51939 l -0.689401,-0.79215 -0.395196,0.43508 c -4.138252,4.55593 -8.208031,10.91526 -10.400194,16.25105 -0.26874,0.65413 -0.607554,1.3625 -0.75292,1.57417 -0.336855,0.49049 -0.934208,0.98021 -1.5117179,1.23933 -0.56543,0.2537 -1.903471,0.32452 -2.494199,0.13201 z`;

const Receipt = React.forwardRef<HTMLDivElement, ReceiptProps>(({ transaction, settings }, ref) => {
    
    return (
        <div ref={ref} id="receipt-to-print" className="bg-white text-black font-mono text-xs p-2 w-full relative overflow-hidden min-h-[300px]">
            {/* --- WATERMARK START --- */}
            <div className="absolute inset-0 flex flex-col items-center justify-center z-0 opacity-[0.08] pointer-events-none select-none overflow-hidden">
                <svg width="200" height="200" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" className="mb-2">
                    <g transform="translate(-0.124 1.605) scale(0.152)">
                        <path fill="currentColor" d={WATERMARK_PATH} />
                    </g>
                </svg>
                <h1 className="text-xl font-black uppercase tracking-widest text-center leading-none">ARTEA POS</h1>
                <p className="text-[8px] font-bold text-center mt-1">oleh AI Projek | aiprojek01.my.id</p>
            </div>
            {/* --- WATERMARK END --- */}

            {/* Content Wrapper - Must be relative and higher z-index to sit on top of watermark */}
            <div className="relative z-10">
                <div className="text-center mb-2">
                    <h1 className="font-bold text-sm uppercase">{settings.shopName}</h1>
                    <p>{settings.address}</p>
                </div>
                <div className="border-b border-dashed border-black"></div>
                <div className="my-1 text-[10px]">
                    <div className="flex justify-between">
                        <span>ID Transaksi:</span>
                        <span>{transaction.id.slice(-8)}</span>
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
                    {transaction.orderType && (
                        <div className="flex justify-between">
                            <span>Tipe:</span>
                            <span className="capitalize">{transaction.orderType.replace('-', ' ')}</span>
                        </div>
                    )}
                    
                    {/* NEW: Table Info */}
                    {(transaction.tableNumber || transaction.paxCount) && (
                        <div className="flex justify-between border-t border-dashed border-gray-300 mt-1 pt-1 font-bold">
                            <span>MEJA: {transaction.tableNumber || '-'}</span>
                            <span>PAX: {transaction.paxCount || '-'}</span>
                        </div>
                    )}
                </div>
                <div className="border-b border-dashed border-black"></div>
                <div className="my-2">
                    {(transaction.items || []).map(item => {
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
                            <span>- {CURRENCY_FORMATTER.format(transaction.subtotal - (transaction.total - (transaction.tax || 0) - (transaction.serviceCharge || 0)))}</span>
                        </div>
                    )}
                    {transaction.rewardRedeemed && (
                        <div className="flex justify-between">
                            <span>Reward</span>
                            <span>- {CURRENCY_FORMATTER.format(transaction.rewardRedeemed.pointsSpent > 0 ? (transaction.items.find(i => i.rewardId === transaction.rewardRedeemed?.rewardId)?.price || 0) * -1 : 0)}</span>
                        </div>
                    )}
                    {transaction.serviceCharge > 0 && (
                        <div className="flex justify-between">
                            <span>Service Charge</span>
                            <span>{CURRENCY_FORMATTER.format(transaction.serviceCharge)}</span>
                        </div>
                    )}
                    {transaction.tax > 0 && (
                        <div className="flex justify-between">
                            <span>Pajak (PB1/PPN)</span>
                            <span>{CURRENCY_FORMATTER.format(transaction.tax)}</span>
                        </div>
                    )}

                    <div className="flex justify-between font-bold text-sm mt-1">
                        <span>TOTAL</span>
                        <span>{CURRENCY_FORMATTER.format(transaction.total)}</span>
                    </div>
                    <div className="flex justify-between mt-1">
                        <span>Bayar</span>
                        <span>{CURRENCY_FORMATTER.format(transaction.amountPaid)}</span>
                    </div>
                    {transaction.amountPaid >= transaction.total && (
                        <div className="flex justify-between">
                            <span>Kembali</span>
                            <span>{CURRENCY_FORMATTER.format(transaction.amountPaid - transaction.total)}</span>
                        </div>
                    )}
                    {transaction.amountPaid < transaction.total && (
                        <div className="flex justify-between">
                            <span>Kurang</span>
                            <span>{CURRENCY_FORMATTER.format(transaction.total - transaction.amountPaid)}</span>
                        </div>
                    )}
                </div>

                {/* --- MEMBER INFO SECTION (Saldo & Poin) --- */}
                {transaction.customerId && (
                    <div className="border-t border-dashed border-black my-2 pt-1 text-[10px]">
                        {transaction.customerBalanceSnapshot !== undefined && (
                            <div className="flex justify-between">
                                <span>Sisa Saldo:</span>
                                <span>{CURRENCY_FORMATTER.format(transaction.customerBalanceSnapshot)}</span>
                            </div>
                        )}
                        {transaction.customerPointsSnapshot !== undefined && (
                            <div className="flex justify-between">
                                <span>Sisa Poin:</span>
                                <span>{transaction.customerPointsSnapshot} pts</span>
                            </div>
                        )}
                        {transaction.pointsEarned ? (
                            <div className="flex justify-between">
                                <span>Poin Didapat:</span>
                                <span>+ {transaction.pointsEarned} pts</span>
                            </div>
                        ) : null}
                    </div>
                )}
                
                <div className="border-b border-dashed border-black my-2"></div>
                <div className="text-center mt-2">
                    <p>{settings.footerMessage}</p>
                </div>
            </div>
        </div>
    );
});

export default Receipt;
