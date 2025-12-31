
import React from 'react';
import type { Transaction as TransactionType, ReceiptSettings } from '../types';
import { CURRENCY_FORMATTER } from '../constants';

interface ReceiptProps {
    transaction: TransactionType;
    settings: ReceiptSettings;
}

const Receipt = React.forwardRef<HTMLDivElement, ReceiptProps>(({ transaction, settings }, ref) => {
    return (
        <div ref={ref} id="receipt-to-print" className="bg-white text-black font-mono text-xs p-2 w-full relative overflow-hidden min-h-[300px]">
            {/* --- WATERMARK START --- */}
            <div className="absolute inset-0 flex flex-col items-center justify-center z-0 opacity-[0.08] pointer-events-none select-none overflow-hidden">
                <svg width="200" height="200" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" className="mb-2">
                    <g transform="translate(-0.124 1.605) scale(0.152)">
                        <path fill="currentColor" d="m 7.4847131,91.696532 c -0.955144,-0.31127 -1.786142,-1.04943 -2.217636,-1.9699 -0.5244,-1.27971 -0.201199,-2.56329 0.320849,-3.78483 2.92093,-6.8857 7.5750739,-13.99307 12.5551279,-19.17303 l 0.8951,-0.93103 -0.374563,-0.86353 c -0.817115,-1.8838 -1.564511,-4.49971 -1.914401,-6.700471 -0.931168,-5.856932 -0.146411,-11.971369 2.259228,-17.602768 1.751824,-4.100873 4.65858,-8.172087 7.426644,-10.401778 3.829489,-3.084682 9.410329,-5.302874 17.423863,-6.925388 3.208572,-0.649646 6.113868,-1.103179 13.236547,-2.066298 11.861019,-1.60383 13.889087,-2.119176 19.622446,-4.986191 3.794758,-1.897599 8.038728,-4.471472 11.686488,-7.0502559 1.123567,-0.794305 1.437252,-1.099775 2.692918,-1.040227 1.106158,0.05246 1.626677,0.214442 2.282939,0.710446 1.397637,1.056332 1.620188,2.0795349 1.619736,7.4467289 0,5.012825 -0.430316,9.286155 -1.424047,14.155752 -3.759068,18.420658 -14.018944,33.38204 -29.862207,43.54632 -11.656738,7.47841 -22.215344,9.28013 -31.155349,5.31635 -3.090786,-1.37038 -6.610519,-3.96906 -8.830055,-6.51939 l -0.689401,-0.79215 -0.395196,0.43508 c -4.138252,4.55593 -8.208031,10.91526 -10.400194,16.25105 -0.26874,0.65413 -0.607554,1.3625 -0.75292,1.57417 -0.336855,0.49049 -0.934208,0.98021 -1.5117179,1.23933 -0.56543,0.2537 -1.903471,0.32452 -2.494199,0.13201 z M 45.697333,73.953352 c 4.817561,-0.83524 10.079178,-3.17356 15.58052,-6.92414 6.712109,-4.57604 12.27551,-10.147212 16.453811,-16.47679 5.26884,-7.981602 8.579877,-17.326002 9.689732,-27.346338 0.179451,-1.62017 0.407421,-4.732627 0.350786,-4.789261 -0.01574,-0.01574 -0.585379,0.306649 -1.265859,0.716426 -4.663051,2.80803 -9.366207,5.128742 -12.773249,6.302796 -3.385158,1.166512 -6.503876,1.757108 -16.132042,3.054954 -9.799571,1.320948 -13.978162,2.099813 -18.338131,3.418113 -2.740288,0.82857 -5.510822,2.051662 -7.232963,3.1931 -2.18741,1.449819 -4.207481,3.956831 -5.820324,7.223329 -1.801237,3.648051 -2.601621,7.073235 -2.599033,11.122374 0.0017,2.42687 0.298351,4.518529 0.940886,6.630763 l 0.199535,0.655931 0.798535,-0.59857 c 1.214664,-0.91049 3.895134,-2.663599 5.096129,-3.333024 l 1.071924,-0.597486 0.229524,-0.689402 c 0.126241,-0.379173 1.310571,-4.122632 2.631853,-8.318801 1.388215,-4.408746 2.522145,-7.855268 2.686167,-8.164461 0.33336,-0.628406 0.898296,-1.15505 1.618687,-1.508973 1.032628,-0.39398 2.200053,-0.374984 3.056357,0.04397 0.728868,0.358818 1.374353,1.016275 1.718354,1.750223 0.261396,0.945558 0.376727,1.444412 0.231257,2.455938 -0.271321,1.699149 -1.56917,4.917745 -1.56917,4.917745 -0.86304,2.704758 -1.557451,4.930023 -1.543131,4.945031 0.05731,0.06006 4.263391,-2.22212 7.376336,-4.002321 l 1.859005,-1.063114 0.133141,-0.468341 c 0.07322,-0.257588 0.803496,-2.846781 1.622828,-5.753766 0.819328,-2.906986 1.59121,-5.487313 1.71529,-5.734065 0.307025,-0.610559 0.973469,-1.253741 1.636269,-1.579165 1.041783,-0.379729 2.19612,-0.45714 3.104634,-6.95e-4 1.394524,0.706144 2.240947,2.281522 2.003603,3.729135 -0.06484,0.395456 -0.580452,2.300254 -1.078042,3.982518 -0.14729,0.497969 9.43229,-6.331835 13.393123,-9.548681 1.901956,-1.544697 2.679702,-1.847255 4.026619,-1.566411 1.132496,0.236132 1.974334,0.88122 2.525495,1.935249 0.416785,1.047452 0.474258,2.195561 0.02018,3.127938 -0.33305,0.678337 -0.74125,1.086877 -2.441441,2.443463 -3.31606,2.645895 -7.895731,5.982926 -11.857735,8.640275 l -1.42477,0.955606 1.186248,0.113956 c 0.652436,0.06267 1.38275,0.179225 1.622918,0.258995 0.999231,0.33189 1.90311,1.26574 2.249164,2.323743 0.243681,0.745013 0.15995,1.938126 -0.185579,2.644363 -0.323427,0.66106 -0.965622,1.321994 -1.593812,1.640324 -0.969631,0.491347 -1.122699,0.48911 -7.586038,-0.110968 l -5.869748,-0.544963 -1.807643,1.029768 c -0.994211,0.566375 -2.634018,1.47805 -3.644025,2.025949 -2.723673,1.477515 -2.7629,1.500802 -2.61358,1.551751 0.07357,0.02512 1.705605,0.298107 3.626739,0.606675 1.92114,0.308564 3.67739,0.602322 3.902779,0.652791 1.705906,0.381997 3.001139,2.334096 2.68366,4.044664 -0.221186,1.19174 -1.012391,2.23144 -2.062883,2.71078 -1.043411,0.4761 -0.987804,0.48172 -10.472423,-1.05965 -4.687454,-0.76177 -8.611641,-1.38504 -8.720417,-1.38504 -0.344182,0 -3.104088,1.79145 -4.889712,3.1739 l -0.899147,0.69613 0.208279,0.29406 c 0.329399,0.46505 2.161309,2.25841 2.968822,2.90634 2.514777,2.0178 5.209789,3.23167 8.275363,3.72735 1.118301,0.18082 4.696292,0.13139 5.926347,-0.0819 z" />
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
                </div>
                <div className="border-b border-dashed border-black my-2"></div>
                <div className="text-center mt-2">
                    <p>{settings.footerMessage}</p>
                </div>
            </div>
        </div>
    );
});

export default Receipt;
