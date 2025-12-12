
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { db } from './db';
import type { Transaction } from '../types';

let supabase: SupabaseClient | null = null;

const TABLE_NAME = 'transactions';

// SQL Script yang harus dijalankan user di SQL Editor Supabase mereka
export const SETUP_SQL_SCRIPT = `
-- Buat tabel transaksi
create table if not exists transactions (
  id text primary key,
  created_at timestamp with time zone,
  total numeric,
  payment_status text,
  items jsonb,
  user_name text,
  synced_at timestamp with time zone default now()
);

-- Aktifkan RLS (Row Level Security) agar aman (Opsional, tapi disarankan)
alter table transactions enable row level security;

-- Buat policy agar siapa saja dengan Anon Key bisa membaca/menulis (Untuk mode BYOB ini paling simpel)
-- Catatan: Karena ini database pribadi user, policy 'true' tidak masalah selama key dijaga.
create policy "Enable all access for anon" on transactions
as permissive for all
to anon
using (true)
with check (true);
`;

export const supabaseService = {
    // Inisialisasi client dengan kredensial user
    init: (url: string, key: string) => {
        if (!url || !key) return false;
        try {
            supabase = createClient(url, key);
            return true;
        } catch (e) {
            console.error("Supabase init error:", e);
            return false;
        }
    },

    // Tes koneksi apakah tabel 'transactions' sudah ada
    testConnection: async (): Promise<{ success: boolean; message: string }> => {
        if (!supabase) return { success: false, message: 'Supabase belum diinisialisasi.' };

        try {
            // Coba ambil 1 data, jika error berarti tabel belum ada atau permission salah
            const { error } = await supabase.from(TABLE_NAME).select('id').limit(1);
            
            if (error) {
                // Error 404/PGRST204 biasanya berarti tabel tidak ditemukan
                if (error.code === 'PGRST204' || error.message.includes('relation "transactions" does not exist')) {
                    return { success: false, message: 'Tabel "transactions" belum dibuat. Jalankan SQL Script.' };
                }
                return { success: false, message: `Koneksi gagal: ${error.message}` };
            }

            return { success: true, message: 'Koneksi Berhasil!' };
        } catch (e: any) {
            return { success: false, message: e.message };
        }
    },

    // Sinkronisasi SATU ARAH (Lokal -> Cloud) untuk backup/monitoring transaksi
    // Ini akan mengupload semua transaksi yang ada di lokal ke Supabase
    syncTransactionsUp: async (): Promise<{ success: boolean; count: number; message?: string }> => {
        if (!supabase) return { success: false, count: 0, message: 'Client not ready' };

        try {
            const localTransactions = await db.transactionRecords.toArray();
            if (localTransactions.length === 0) return { success: true, count: 0 };

            // Format data sesuai struktur tabel SQL yang sederhana
            const payload = localTransactions.map(t => ({
                id: t.id,
                created_at: t.createdAt, // Supabase pakai snake_case biasanya
                total: t.total,
                payment_status: t.paymentStatus,
                items: t.items, // JSONB
                user_name: t.userName
            }));

            // Upsert (Insert or Update)
            const { error } = await supabase
                .from(TABLE_NAME)
                .upsert(payload, { onConflict: 'id' });

            if (error) throw error;

            return { success: true, count: payload.length };
        } catch (e: any) {
            console.error("Sync Up Error:", e);
            return { success: false, count: 0, message: e.message };
        }
    }
};
