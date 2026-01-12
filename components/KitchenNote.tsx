
import React from 'react';
import type { Transaction as TransactionType, ReceiptSettings } from '../types';

interface KitchenNoteProps {
    transaction: TransactionType;
    settings: ReceiptSettings;
}

const KitchenNote = React.forwardRef<HTMLDivElement, KitchenNoteProps>(({ transaction, settings }, ref) => {
    return (
        <div ref={ref} id="kitchen-note-to-print" className="bg-white text-black font-mono text-sm p-3 w-full">
            <div className="text-center mb-2">
                <h1 className="font-bold text-lg uppercase">PESANAN BARU</h1>
            </div>
            <div className="border-b border-dashed border-black"></div>
            <div className="my-2">
                <div className="flex justify-between font-semibold">
                    <span>{transaction.customerName || `Pesanan #${transaction.id.slice(-4)}`}</span>
                    <span>{new Date(transaction.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
            </div>
            <div className="border-b border-dashed border-black"></div>
            <div className="my-3 space-y-3">
                {(transaction.items || []).filter(item => !item.isReward).map(item => (
                    <div key={item.cartItemId} className="flex">
                        <div className="w-8 font-bold text-lg">{item.quantity}x</div>
                        <div className="flex-1">
                            <p className="font-bold uppercase text-base">{item.name}</p>
                            {item.selectedAddons && item.selectedAddons.length > 0 && (
                                <div className="pl-3 text-sm">
                                    {item.selectedAddons.map(addon => (
                                        <p key={addon.id}>+ {addon.name}</p>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
             <div className="border-t border-dashed border-black pt-1 mt-2 text-center text-xs">
                <p>{settings.shopName}</p>
            </div>
        </div>
    );
});

export default KitchenNote;
