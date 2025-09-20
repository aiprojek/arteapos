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
                {transaction.items.map(item => (
                    <div key={item.id} className="mb-1">
                        <p className="uppercase">{item.name}</p>
                        <div className="flex justify-between">
                            <span>{item.quantity}&nbsp;x&nbsp;{CURRENCY_FORMATTER.format(item.price).replace('Rp', '')}</span>
                            <span className="font-bold">{CURRENCY_FORMATTER.format(item.price * item.quantity).replace('Rp', '')}</span>
                        </div>
                    </div>
                ))}
            </div>
            <div className="border-b border-dashed border-black"></div>
            <div className="mt-2">
                <div className="flex justify-between font-bold text-sm">
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
