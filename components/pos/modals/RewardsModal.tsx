import React, { useState } from 'react';
import Modal from '../../Modal';
import Button from '../../Button';
import Icon from '../../Icon';
import { CURRENCY_FORMATTER } from '../../../constants';
import { useCustomer } from '../../../context/CustomerContext';
import { useCart } from '../../../context/CartContext';
import type { Customer, Reward } from '../../../types';

export const RewardsModal: React.FC<{ isOpen: boolean, onClose: () => void, customer: Customer }> = ({ isOpen, onClose, customer }) => {
    const { membershipSettings } = useCustomer();
    const { applyRewardToCart, appliedRewards, applyManualReward } = useCart();
    
    const [manualPoints, setManualPoints] = useState('');

    const usedPoints = appliedRewards.reduce((sum, ar) => sum + ar.reward.pointsCost, 0);
    const remainingPoints = customer.points - usedPoints;
    const manualDiscount = (parseFloat(manualPoints) || 0) * (membershipSettings.redemptionRate || 0);

    const handleRedeem = (reward: Reward) => {
        applyRewardToCart(reward, customer);
    };

    const handleManualRedeem = () => {
        const pts = parseFloat(manualPoints);
        if (pts > 0 && pts <= remainingPoints) {
            applyManualReward(pts, manualDiscount, customer);
            setManualPoints('');
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Tukar Poin: ${customer.name}`}
            mobileLayout="fullscreen"
            size="lg"
        >
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                    <div className="text-center p-2 bg-slate-900 border border-slate-700 rounded-lg">
                        <p className="text-slate-500 text-[10px] uppercase font-bold">Total Poin</p>
                        <p className="text-xl font-bold text-white">{customer.points}</p>
                    </div>
                    <div className="text-center p-2 bg-yellow-900/20 border border-yellow-700 rounded-lg">
                        <p className="text-yellow-600 text-[10px] uppercase font-bold">Sisa Poin</p>
                        <p className="text-xl font-bold text-yellow-400">{remainingPoints}</p>
                    </div>
                </div>

                <div className="p-3 bg-slate-900 border border-slate-700 rounded-lg space-y-2">
                    <p className="text-slate-400 font-bold text-xs uppercase flex items-center gap-1">
                        <Icon name="tag" className="w-3 h-3"/> Penukaran Fleksibel
                    </p>
                    {membershipSettings.redemptionRate && membershipSettings.redemptionRate > 0 ? (
                        <>
                            <div className="flex gap-2">
                                <input 
                                    type="number"
                                    placeholder="Masukkan poin..."
                                    value={manualPoints}
                                    onChange={e => setManualPoints(e.target.value)}
                                    className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:border-[#347758] outline-none"
                                />
                                <Button size="sm" onClick={handleManualRedeem} disabled={!manualPoints || parseFloat(manualPoints) <= 0 || parseFloat(manualPoints) > remainingPoints}>
                                    Pakai
                                </Button>
                            </div>
                            {manualPoints && parseFloat(manualPoints) > 0 && (
                                <p className="text-xs text-yellow-500 italic">
                                    {manualPoints} Poin = {CURRENCY_FORMATTER.format(manualDiscount)} diskon
                                </p>
                            )}
                        </>
                    ) : (
                        <p className="text-[10px] text-slate-500 italic">
                            Belum ada nilai tukar poin. Atur di <span className="text-sky-400">Settings &gt; Features</span> untuk mengaktifkan penukaran manual.
                        </p>
                    )}
                </div>
                
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {membershipSettings.rewards.map((reward) => {
                        const isApplied = appliedRewards.some(ar => ar.reward.id === reward.id);
                        const canAfford = remainingPoints >= reward.pointsCost;
                        
                        return (
                            <div key={reward.id} className={`p-3 rounded-lg border flex justify-between items-center transition-all ${isApplied ? 'bg-[#347758]/10 border-[#347758]' : canAfford ? 'bg-slate-800 border-slate-700' : 'bg-slate-800/50 border-slate-800 opacity-60'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${isApplied ? 'bg-[#347758] text-white' : 'bg-slate-700 text-slate-400'}`}>
                                        <Icon name={reward.type === 'free_product' ? 'plus' : 'tag'} className="w-4 h-4"/>
                                    </div>
                                    <div>
                                        <p className={`font-bold text-sm ${isApplied ? 'text-white' : 'text-slate-200'}`}>{reward.name}</p>
                                        <p className="text-xs text-slate-500">{reward.pointsCost} Poin</p>
                                    </div>
                                </div>
                                
                                {isApplied ? (
                                    <div className="flex items-center gap-1 text-[#52a37c] font-bold text-xs bg-[#347758]/20 px-2 py-1 rounded">
                                        <Icon name="check-circle-fill" className="w-3 h-3"/> Terpasang
                                    </div>
                                ) : (
                                    <Button size="sm" onClick={() => handleRedeem(reward)} disabled={!canAfford} variant={canAfford ? 'primary' : 'utility'}>
                                        Tukar
                                    </Button>
                                )}
                            </div>
                        );
                    })}
                    {membershipSettings.rewards.length === 0 && (
                        <div className="text-center py-8 text-slate-500">
                             <Icon name="award" className="w-12 h-12 mx-auto mb-2 opacity-20"/>
                             <p>Belum ada reward yang tersedia.</p>
                        </div>
                    )}
                </div>

                <div className="pt-2">
                    <Button onClick={onClose} variant="utility" className="w-full">Selesai</Button>
                </div>
            </div>
        </Modal>
    );
};
