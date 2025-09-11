
import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import type { RawMaterial } from '../types';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Icon from '../components/Icon';
import { dataService } from '../services/dataService';

const InputField: React.FC<{
    name: string;
    label: string;
    value: string | number;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    type?: string;
    required?: boolean;
}> = ({ name, label, value, onChange, type = 'text', required = false }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
        <input
            type={type}
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            required={required}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white"
        />
    </div>
);


const RawMaterialForm: React.FC<{ 
    material?: RawMaterial | null, 
    onSave: (material: Omit<RawMaterial, 'id'> | RawMaterial) => void, 
    onCancel: () => void 
}> = ({ material, onSave, onCancel }) => {
    const [formData, setFormData] = useState({ name: '', stock: '', unit: '' });

    useEffect(() => {
        if (material) {
            setFormData({
                name: material.name,
                stock: material.stock.toString(),
                unit: material.unit,
            });
        } else {
            setFormData({ name: '', stock: '', unit: '' });
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
            <InputField name="stock" label="Jumlah Stok" type="number" required value={formData.stock} onChange={handleChange} />
            <InputField name="unit" label="Satuan (cth: gram, ml, pcs)" required value={formData.unit} onChange={handleChange} />
            <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="secondary" onClick={onCancel}>Batal</Button>
                <Button type="submit" variant="primary">Simpan</Button>
            </div>
        </form>
    );
};


const RawMaterialsView: React.FC = () => {
    const { rawMaterials, addRawMaterial, updateRawMaterial, deleteRawMaterial, bulkAddRawMaterials, showAlert } = useAppContext();
    const [isModalOpen, setModalOpen] = useState(false);
    const [editingMaterial, setEditingMaterial] = useState<RawMaterial | null>(null);
    const importInputRef = useRef<HTMLInputElement>(null);

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

    return (
        <div>
             <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-2xl font-bold text-white self-start sm:self-center">Bahan Baku</h1>
                <div className="flex gap-2 flex-wrap justify-end self-end sm:self-center">
                    <Button variant="secondary" onClick={handleExport}>
                        <Icon name="download" className="w-5 h-5"/>
                        <span className="hidden sm:inline">Export (CSV)</span>
                    </Button>
                    <Button variant="secondary" onClick={() => importInputRef.current?.click()}>
                        <Icon name="upload" className="w-5 h-5"/>
                        <span className="hidden sm:inline">Import (CSV)</span>
                    </Button>
                     <input type="file" ref={importInputRef} onChange={handleImportChange} className="hidden" accept=".csv" />
                    <Button variant="primary" onClick={() => handleOpenModal()}>
                        <Icon name="plus" className="w-5 h-5"/>
                        <span>Tambah Bahan Baku</span>
                    </Button>
                </div>
            </div>
            
            <div className="bg-slate-800 rounded-lg shadow-md overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-700">
                        <tr>
                            <th className="p-3">Nama Bahan</th>
                            <th className="p-3">Stok</th>
                            <th className="p-3">Satuan</th>
                            <th className="p-3">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rawMaterials.map(material => (
                            <tr key={material.id} className="border-b border-slate-700 last:border-b-0 hover:bg-slate-700/50">
                                <td className="p-3 font-medium">{material.name}</td>
                                <td className="p-3 text-slate-300">{material.stock}</td>
                                <td className="p-3 text-slate-400">{material.unit}</td>
                                <td className="p-3">
                                    <div className="flex gap-2">
                                        <button onClick={() => handleOpenModal(material)} className="text-sky-400 hover:text-sky-300">
                                            <Icon name="edit" className="w-5 h-5" />
                                        </button>
                                        <button onClick={() => deleteRawMaterial(material.id)} className="text-red-500 hover:text-red-400">
                                            <Icon name="trash" className="w-5 h-5" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {rawMaterials.length === 0 && (
                    <div className="text-center p-8 text-slate-500">
                        Belum ada bahan baku. Klik "Tambah Bahan Baku" untuk memulai, atau gunakan fitur Impor.
                    </div>
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingMaterial ? 'Edit Bahan Baku' : 'Tambah Bahan Baku'}>
                <RawMaterialForm material={editingMaterial} onSave={handleSaveMaterial} onCancel={handleCloseModal} />
            </Modal>
        </div>
    );
};

export default RawMaterialsView;
