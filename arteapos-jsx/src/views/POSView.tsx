import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import type { Product, CartItem as CartItemType, Transaction, Customer, Reward, Payment, PaymentMethod, HeldCart } from '../types';
import ProductCard from '../components/ProductCard';
import CartItemComponent from '../components/CartItem';
import Button from '../components/Button';
import Icon from '../components/Icon';
import Modal from '../components/Modal';
import ReceiptModal from '../components/ReceiptModal';
import { CURRENCY_FORMATTER } from '../constants';
import BarcodeScannerModal from '../components/BarcodeScannerModal';
import { useCameraAvailability } from '../hooks/useCameraAvailability';

// --- New Components for Held Carts Feature ---

const NameCartModal: React.FC<{
    isOpen: boolean,
    onClose: () => void,
    onSave: (name: string) => void,
    currentName?: string
}> = ({ isOpen, onClose, onSave, currentName = '' }) => {
    const [name, setName] = useState('');
    useEffect(() => {
        if (isOpen) setName(currentName);
    }, [isOpen, currentName]);

    const handleSave = () => {
        if (name.trim()) {
            onSave(name.trim());
        }
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSave();
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={currentName ? "Ganti Nama Pesanan" : "Simpan Pesanan"}>
            <div className="space-y-4">
                <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={