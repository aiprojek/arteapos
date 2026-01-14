
import React from 'react';
import Icon from '../Icon';
import { APP_LICENSE_ID } from '../../constants';
import { renderMarkdown } from './SharedHelpComponents';

const LicenseTab: React.FC = () => {
    return (
        <div className="animate-fade-in max-w-3xl mx-auto space-y-6">
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                <div className="text-center mb-6">
                    {/* Increased size class for font icon */}
                    <Icon name="lock" className="w-16 h-16 text-[#52a37c] mx-auto mb-2 text-6xl" />
                    <h2 className="text-2xl font-bold text-white">Lisensi Perangkat Lunak</h2>
                    <p className="text-slate-400 text-sm">Hak dan kewajiban Anda sebagai pengguna.</p>
                </div>
                <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-700 max-h-[60vh] overflow-y-auto">
                    {renderMarkdown(APP_LICENSE_ID)}
                </div>
            </div>
        </div>
    );
};

export default LicenseTab;
