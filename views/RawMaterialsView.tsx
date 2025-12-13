
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useProduct } from '../context/ProductContext';
import { useUI } from '../context/UIContext';
import type { RawMaterial } from '../types';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Icon from '../components/Icon';
import { dataService } from '../services/dataService';
import { CURRENCY_FORMATTER } from '../constants';
import VirtualizedTable from '../components/VirtualizedTable';
import StockOpnameModal from '../components/StockOpnameModal';

const InputField: React.FC<{
    name: string;
    label: string;
    value: string | number;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    type?: string;
    required?: boolean;
    min?: string;
}> = ({ name, label, value, onChange, type = 'text', required = false, min }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
        <input
            type={type}
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            required={required}
            min={min}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white"
        />
    </div>
);


const RawMaterialForm: React.FC<{ 
    material?: RawMaterial | null, 
    onSave: (material: Omit<RawMaterial, 'id'> | RawMaterial) => void, 
    onCancel: () => void 
}> = ({ material, onSave, onCancel }) => {
    const [formData, setFormData] = useState({ name: '', stock: '', unit: '', costPerUnit: '' });

    useEffect(() => {
        if (material) {
            setFormData({
                name: material.name,
                stock: material.stock.toString(),
                unit: material.unit,
                costPerUnit: material.costPerUnit?.toString() || ''
            });
        } else {
            setFormData({ name: '', stock: '', unit: '', costPerUnit: '' });
        }
    }, [material]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const materialData = {
            ...formData,
            stock: parseFloat(formData.stock) || 0,
            costPerUnit: parseFloat(formData.costPerUnit) || 0,
        };
        if (material && 'id' in material) {
            onSave({ ...materialData, id: material.id });
        } else {
            onSave(materialData);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <InputField name="name" label="Nama Bahan Baku" required value={formData.name} onChange={handleChange} />
            <InputField name="stock" label="Jumlah Stok" type="number" required value={formData.stock} onChange={handleChange} min="0"/>
            <InputField name="unit" label="Satuan (cth: gram, ml, pcs)" required value={formData.unit} onChange={handleChange} />
            <InputField name="costPerUnit" label="Biaya per Satuan (IDR, Opsional)" type="number" value={formData.costPerUnit} onChange={handleChange} min="0"/>

            <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="secondary" onClick={onCancel}>Batal</Button>
                <Button type="submit" variant="primary">Simpan</Button>
            </div>
        </form>
    );
};


const RawMaterialsView: React.FC = () => {
    const { rawMaterials, addRawMaterial, updateRawMaterial, deleteRawMaterial, bulkAddRawMaterials } = useProduct();
    const { showAlert } = useUI();
    const [isModalOpen, setModalOpen] = useState(false);
    const [editingMaterial, setEditingMaterial] = useState<RawMaterial | null>(null);
    const [isOpnameOpen, setIsOpnameOpen] = useState(false); // NEW
    const importInputRef = useRef<HTMLInputElement>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredMaterials = useMemo(() => {
        return rawMaterials.filter(material =>
            material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            material.unit.toLowerCase().includes(searchTerm.toLowerCase())
        ).sort((a,b) => a.name.localeCompare(b.name));
    }, [rawMaterials, searchTerm]);


    const handleOpenModal = (material: RawMaterial | null = null) => {
        setEditingMaterial(material);
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingMaterial(null);
        setModalOpen(false);
    };

    const handleSaveMaterial = (materialData: Omit<RawMaterial, 'id'> | RawMaterial) => {
        if ('id' in materialData) {
            updateRawMaterial(materialData);
        } else {
            addRawMaterial(materialData);
        }
        handleCloseModal();
    };
    
    const handleExport = () => {
        dataService.exportRawMaterialsCSV(rawMaterials);
        showAlert({
            type: 'alert',
            title: 'Ekspor Berhasil',
            message: 'Data bahan baku (CSV) berhasil diunduh. Anda dapat menggunakan file ini sebagai template untuk impor.'
        });
    };

    const handleImportChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            try {
                const newMaterials = await dataService.importRawMaterialsCSV(file);
                bulkAddRawMaterials(newMaterials);
                 showAlert({
                    type: 'alert',
                    title: 'Impor Berhasil',
                    message: `${newMaterials.length} bahan baku berhasil diimpor atau diperbarui.`
                 });
            } catch (error) {
                 showAlert({
                    type: 'alert',
                    title: 'Impor Gagal',
                    message: (error as Error).message
                 });
            } finally {
                if(importInputRef.current) importInputRef.current.value = "";
            }
        }
    };
    
    const columns = useMemo(() => [
        { label: 'Nama Bahan', width: '2fr', render: (m: RawMaterial) => <span className="font-medium">{m.name}</span> },
        { label: 'Biaya per Satuan', width: '1.5fr', render: (m: RawMaterial) => m.costPerUnit ? CURRENCY_FORMATTER.format(m.costPerUnit) : '-' },
        { label: 'Stok', width: '1fr', render: (m: RawMaterial) => m.stock },
        { label: 'Satuan', width: '1fr', render: (m: RawMaterial) => m.unit },
        { label: 'Aksi', width: '1fr', render: (m: RawMaterial) => (
            <div className="flex gap-2">
                <button onClick={() => handleOpenModal(m)} className="text-sky-400 hover:text-sky-300">
                    <Icon name="edit" className="w-5 h-5" />
                </button>
                <button onClick={() => deleteRawMaterial(m.id)} className="text-red-500 hover:text-red-400">
                    <Icon name="trash" className="w-5 h-5" />
                </button>
            </div>
        )}
    ], [deleteRawMaterial]);

    return (
        <div className="flex flex-col h-full">
             <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-2xl font-bold text-white self-start sm:self-center">Bahan Baku</h1>
                <div className="flex gap-2 flex-wrap justify-end self-stretch sm:self-center">
                    <div className="relative flex-grow sm:flex-grow-0">
                         <input
                            type="text"
                            placeholder="Cari bahan baku..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white focus:ring-[#347758] focus:border-[#347758]"
                        />
                         <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    </div>
                    <Button variant="secondary" onClick={() => setIsOpnameOpen(true)} className="flex-shrink-0">
                        <Icon name="database" className="w-5 h-5"/>
                        <span className="hidden lg:inline">Stock Opname</span>
                    </Button>
                    <Button variant="secondary" onClick={handleExport} className="flex-shrink-0">
                        <Icon name="download" className="w-5 h-5"/>
                        <span className="hidden sm:inline">Export</span>
                    </Button>
                    <Button variant="secondary" onClick={() => importInputRef.current?.click()} className="flex-shrink-0">
                        <Icon name="upload" className="w-5 h-5"/>
                        <span className="hidden sm:inline">Import</span>
                    </Button>
                     <input type="file" ref={importInputRef} onChange={handleImportChange} className="hidden" accept=".csv" />
                    <Button variant="primary" onClick={() => handleOpenModal()} className="flex-shrink-0">
                        <Icon name="plus" className="w-5 h-5"/>
                        <span className="hidden sm:inline">Tambah Bahan</span>
                    </Button>
                </div>
            </div>
            
            <div className="flex-1 min-h-0 bg-slate-800 rounded-lg shadow-md flex flex-col">
                 {filteredMaterials.length > 0 ? (
                    <VirtualizedTable
                        data={filteredMaterials}
                        columns={columns}
                        rowHeight={60}
                    />
                 ) : (
                    <div className="flex-1 flex items-center justify-center text-center p-8 text-slate-500">
                        {searchTerm ? `Tidak ada bahan baku yang cocok dengan "${searchTerm}".` : 'Belum ada bahan baku. Klik "Tambah Bahan Baku" untuk memulai, atau gunakan fitur Impor.'}
                    </div>
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingMaterial ? 'Edit Bahan Baku' : 'Tambah Bahan Baku'}>
                <RawMaterialForm material={editingMaterial} onSave={handleSaveMaterial} onCancel={handleCloseModal} />
            </Modal>

            <StockOpnameModal 
                isOpen={isOpnameOpen} 
                onClose={() => setIsOpnameOpen(false)} 
                initialTab="raw_material"
            />
        </div>
    );
};

export default RawMaterialsView;
