
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { db } from './db';
import type { ReceiptSettings, Product, Customer, Supplier, BranchPrice, DiscountDefinition, MembershipSettings, PointRule } from '../types';

let supabase: SupabaseClient | null = null;

// Nama Tabel di Supabase
const TABLE_TRANSACTIONS = 'transactions';
const TABLE_INVENTORY = 'branch_inventory';
const TABLE_STOCK_ADJUSTMENTS = 'stock_adjustments'; // NEW TABLE
const TABLE_EXPENSES = 'expenses';
const TABLE_OTHER_INCOMES = 'other_incomes';
const TABLE_PURCHASES = 'purchases';
const TABLE_PRODUCTS = 'master_products';
const TABLE_BRANCH_PRICES = 'branch_product_prices';
const TABLE_CUSTOMERS = 'master_customers';
const TABLE_SUPPLIERS = 'master_suppliers';
const TABLE_DISCOUNTS = 'master_discounts';
const TABLE_POINT_RULES = 'master_point_rules';
const TABLE_AUDIT_LOGS = 'audit_logs'; // NEW

// SQL Script Updated
export const SETUP_SQL_SCRIPT = `
-- 1. Transaksi (Penjualan & Piutang)
create table if not exists transactions (
  id text primary key,
  store_id text not null default 'MAIN',
  created_at timestamp with time zone,
  total numeric,
  amount_paid numeric,
  payment_status text,
  customer_name text,
  items jsonb,
  user_name text
);

-- 2. Stok Cabang (Monitoring Realtime - Snapshot)
create table if not exists branch_inventory (
  id uuid default gen_random_uuid() primary key,
  store_id text not null,
  item_id text not null,
  item_name text,
  stock numeric,
  last_updated timestamp with time zone default now(),
  unique (store_id, item_id)
);

-- 3. Riwayat Mutasi Stok (Restock & Waste) - NEW
create table if not exists stock_adjustments (
  id text primary key,
  store_id text not null default 'MAIN',
  created_at timestamp with time zone,
  product_id text,
  product_name text,
  change numeric,
  new_stock numeric,
  notes text
);

-- 4. Pengeluaran
create table if not exists expenses (
  id text primary key,
  store_id text not null default 'MAIN',
  date timestamp with time zone,
  description text,
  category text,
  amount numeric,
  status text
);

-- 5. Pemasukan Lain
create table if not exists other_incomes (
  id text primary key,
  store_id text not null default 'MAIN',
  date timestamp with time zone,
  description text,
  category text,
  amount numeric
);

-- 6. Pembelian / Utang Dagang
create table if not exists purchases (
  id text primary key,
  store_id text not null default 'MAIN',
  date timestamp with time zone,
  supplier_name text,
  total_amount numeric,
  amount_paid numeric,
  status text,
  items jsonb
);

-- 7. Master Produk (Default)
create table if not exists master_products (
  id text primary key,
  name text,
  price numeric,
  cost_price numeric,
  category jsonb,
  barcode text,
  variants jsonb,
  addons jsonb,
  recipe jsonb,
  image_url text,
  track_stock boolean,
  updated_at timestamp with time zone default now()
);

-- 8. Harga Khusus Cabang
create table if not exists branch_product_prices (
  id uuid default gen_random_uuid() primary key,
  store_id text not null,
  product_id text not null,
  price numeric not null,
  unique (store_id, product_id)
);

-- 9. Master Pelanggan
create table if not exists master_customers (
  id text primary key,
  member_id text,
  name text,
  contact text,
  points numeric,
  updated_at timestamp with time zone default now()
);

-- 10. Master Supplier
create table if not exists master_suppliers (
  id text primary key,
  name text,
  contact text
);

-- 11. Master Diskon
create table if not exists master_discounts (
  id text primary key,
  name text,
  type text,
  value numeric,
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  is_active boolean,
  valid_store_ids jsonb
);

-- 12. Master Aturan Poin
create table if not exists master_point_rules (
  id text primary key,
  type text,
  description text,
  spend_amount numeric,
  points_earned numeric,
  target_id text,
  points_per_item numeric,
  valid_store_ids jsonb
);

-- 13. Audit Logs (Keamanan)
create table if not exists audit_logs (
  id text primary key,
  store_id text not null default 'MAIN',
  timestamp timestamp with time zone,
  user_id text,
  user_name text,
  action text,
  target_id text,
  details text
);

-- Policies (Allow Anon Access for BYOB)
alter table transactions enable row level security; create policy "Public" on transactions for all using (true);
alter table branch_inventory enable row level security; create policy "Public" on branch_inventory for all using (true);
alter table stock_adjustments enable row level security; create policy "Public" on stock_adjustments for all using (true);
alter table expenses enable row level security; create policy "Public" on expenses for all using (true);
alter table other_incomes enable row level security; create policy "Public" on other_incomes for all using (true);
alter table purchases enable row level security; create policy "Public" on purchases for all using (true);
alter table master_products enable row level security; create policy "Public" on master_products for all using (true);
alter table branch_product_prices enable row level security; create policy "Public" on branch_product_prices for all using (true);
alter table master_customers enable row level security; create policy "Public" on master_customers for all using (true);
alter table master_suppliers enable row level security; create policy "Public" on master_suppliers for all using (true);
alter table master_discounts enable row level security; create policy "Public" on master_discounts for all using (true);
alter table master_point_rules enable row level security; create policy "Public" on master_point_rules for all using (true);
alter table audit_logs enable row level security; create policy "Public" on audit_logs for all using (true);
`;

export const supabaseService = {
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

    testConnection: async (): Promise<{ success: boolean; message: string }> => {
        if (!supabase) return { success: false, message: 'Supabase belum diinisialisasi.' };
        try {
            const { error } = await supabase.from(TABLE_TRANSACTIONS).select('id').limit(1);
            if (error && (error.code === 'PGRST204' || error.message.includes('does not exist'))) {
                return { success: false, message: 'Tabel belum siap. Jalankan SQL Script baru.' };
            }
            return { success: true, message: 'Koneksi Berhasil!' };
        } catch (e: any) {
            return { success: false, message: e.message };
        }
    },

    // --- TRANSACTIONAL SYNC (Cabang -> Cloud) ---
    syncOperationalDataUp: async (): Promise<{ success: boolean; message: string }> => {
        if (!supabase) return { success: false, message: 'Client not ready' };

        try {
            const settings = await db.settings.get('receiptSettings');
            const receiptSettings = settings?.value as ReceiptSettings;
            const storeId = receiptSettings?.storeId || 'UNKNOWN';

            // 1. Transactions
            const localTxns = await db.transactionRecords.toArray();
            if (localTxns.length > 0) {
                const payloadTxn = localTxns.map(t => ({
                    id: t.id,
                    store_id: storeId,
                    created_at: t.createdAt,
                    total: t.total,
                    amount_paid: t.amountPaid,
                    payment_status: t.paymentStatus,
                    customer_name: t.customerName,
                    items: t.items,
                    user_name: t.userName
                }));
                await supabase.from(TABLE_TRANSACTIONS).upsert(payloadTxn);
            }

            // 2. Expenses
            const localExpenses = await db.expenses.toArray();
            if (localExpenses.length > 0) {
                const payloadExp = localExpenses.map(e => ({
                    id: e.id,
                    store_id: storeId,
                    date: e.date,
                    description: e.description,
                    category: e.category,
                    amount: e.amount,
                    status: e.status
                }));
                await supabase.from(TABLE_EXPENSES).upsert(payloadExp);
            }

            // 3. Other Incomes
            const localIncomes = await db.otherIncomes.toArray();
            if (localIncomes.length > 0) {
                const payloadInc = localIncomes.map(i => ({
                    id: i.id,
                    store_id: storeId,
                    date: i.date,
                    description: i.description,
                    category: i.category,
                    amount: i.amount
                }));
                await supabase.from(TABLE_OTHER_INCOMES).upsert(payloadInc);
            }

            // 4. Purchases
            const localPurchases = await db.purchases.toArray();
            if (localPurchases.length > 0) {
                const payloadPurchases = localPurchases.map(p => ({
                    id: p.id,
                    store_id: storeId,
                    date: p.date,
                    supplier_name: p.supplierName,
                    total_amount: p.totalAmount,
                    amount_paid: p.amountPaid,
                    status: p.status,
                    items: p.items
                }));
                await supabase.from(TABLE_PURCHASES).upsert(payloadPurchases);
            }

            // 5. Stock Adjustments (Restock & Waste Logs) - NEW
            const localAdjustments = await db.stockAdjustments.toArray();
            if (localAdjustments.length > 0) {
                const payloadAdj = localAdjustments.map(a => ({
                    id: a.id,
                    store_id: storeId,
                    created_at: a.createdAt,
                    product_id: a.productId,
                    product_name: a.productName,
                    change: a.change,
                    new_stock: a.newStock,
                    notes: a.notes
                }));
                await supabase.from(TABLE_STOCK_ADJUSTMENTS).upsert(payloadAdj);
            }

            // 6. Audit Logs - NEW (Send security logs to cloud)
            const localLogs = await db.auditLogs.toArray();
            if (localLogs.length > 0) {
                const payloadLogs = localLogs.map(l => ({
                    id: l.id,
                    store_id: storeId,
                    timestamp: l.timestamp,
                    user_id: l.userId,
                    user_name: l.userName,
                    action: l.action,
                    target_id: l.targetId,
                    details: l.details
                }));
                await supabase.from(TABLE_AUDIT_LOGS).upsert(payloadLogs);
            }

            // 7. Inventory Monitoring (Current Snapshot)
            const products = await db.products.toArray();
            const rawMaterials = await db.rawMaterials.toArray();
            const invPayload = [];
            
            for (const p of products) {
                if (p.trackStock) invPayload.push({ store_id: storeId, item_id: p.id, item_name: p.name, stock: p.stock || 0 });
            }
            for (const m of rawMaterials) {
                invPayload.push({ store_id: storeId, item_id: m.id, item_name: m.name, stock: m.stock || 0 });
            }
            
            if (invPayload.length > 0) {
                await supabase.from(TABLE_INVENTORY).upsert(invPayload, { onConflict: 'store_id,item_id' });
            }

            return { success: true, message: `Sync Operasional Sukses (Termasuk Stok & Audit Log).` };

        } catch (e: any) {
            console.error("Sync Up Error:", e);
            // Detect Quota/Full Error
            if (e.message && (e.message.includes('quota') || e.message.includes('full') || e.message.includes('exceeded'))) {
                throw new Error("QUOTA_EXCEEDED: Penyimpanan Cloud Penuh.");
            }
            return { success: false, message: e.message };
        }
    },

    // --- MASTER DATA SYNC (Admin Pusat -> Cloud -> Cabang) ---
    
    // Admin: PUSH Master Data & Branch Prices
    pushMasterData: async (): Promise<{ success: boolean; message: string }> => {
        if (!supabase) return { success: false, message: 'Client not ready' };
        try {
            // 1. Products & Branch Prices
            const products = await db.products.toArray();
            const prodPayload = products.map(p => ({
                id: p.id,
                name: p.name,
                price: p.price,
                cost_price: p.costPrice,
                category: p.category,
                barcode: p.barcode,
                variants: p.variants,
                addons: p.addons,
                recipe: p.recipe,
                image_url: p.imageUrl,
                track_stock: p.trackStock,
                updated_at: new Date().toISOString()
            }));
            if (prodPayload.length > 0) await supabase.from(TABLE_PRODUCTS).upsert(prodPayload);

            const branchPricePayload: any[] = [];
            products.forEach(p => {
                if (p.branchPrices && p.branchPrices.length > 0) {
                    p.branchPrices.forEach(bp => {
                        branchPricePayload.push({ store_id: bp.storeId, product_id: p.id, price: bp.price });
                    });
                }
            });
            if (branchPricePayload.length > 0) await supabase.from(TABLE_BRANCH_PRICES).upsert(branchPricePayload, { onConflict: 'store_id,product_id' });

            // 2. Customers & Suppliers
            const customers = await db.customers.toArray();
            if (customers.length > 0) {
                 const mappedCust = customers.map(c => ({
                    id: c.id, member_id: c.member_id || c.memberId, name: c.name, contact: c.contact, points: c.points, updated_at: new Date().toISOString()
                 }));
                 await supabase.from(TABLE_CUSTOMERS).upsert(mappedCust);
            }
            const suppliers = await db.suppliers.toArray();
            if (suppliers.length > 0) await supabase.from(TABLE_SUPPLIERS).upsert(suppliers);

            // 3. Discounts
            const discountDefinitions = await db.discountDefinitions.toArray();
            if (discountDefinitions.length > 0) {
                const discPayload = discountDefinitions.map(d => ({
                    id: d.id, name: d.name, type: d.type, value: d.value,
                    start_date: d.startDate, end_date: d.endDate, is_active: d.isActive,
                    valid_store_ids: d.validStoreIds || []
                }));
                await supabase.from(TABLE_DISCOUNTS).upsert(discPayload);
            }

            // 4. Point Rules
            const settings = await db.settings.get('membershipSettings');
            const membershipSettings = settings?.value as MembershipSettings;
            if (membershipSettings && membershipSettings.pointRules) {
                const rulePayload = membershipSettings.pointRules.map(r => ({
                    id: r.id, type: r.type, description: r.description,
                    spend_amount: r.spendAmount, points_earned: r.pointsEarned,
                    target_id: r.targetId, points_per_item: r.pointsPerItem,
                    valid_store_ids: r.validStoreIds || []
                }));
                if (rulePayload.length > 0) await supabase.from(TABLE_POINT_RULES).upsert(rulePayload);
            }

            return { success: true, message: "Master Data, Harga, Promo, & Poin berhasil di-PUSH ke Cloud." };
        } catch (e: any) {
            return { success: false, message: e.message };
        }
    },

    // Cabang: PULL Master Data
    pullMasterData: async (): Promise<{ success: boolean; message: string }> => {
        if (!supabase) return { success: false, message: 'Client not ready' };
        try {
            const settings = await db.settings.get('receiptSettings');
            const receiptSettings = settings?.value as ReceiptSettings;
            const myStoreId = receiptSettings?.storeId || 'UNKNOWN';

            // 1. Pull Products & Prices
            const { data: remoteProducts } = await supabase.from(TABLE_PRODUCTS).select('*');
            const { data: myPrices } = await supabase.from(TABLE_BRANCH_PRICES).select('product_id, price').eq('store_id', myStoreId);
            
            const priceMap = new Map<string, number>();
            if (myPrices) myPrices.forEach((mp: any) => priceMap.set(mp.product_id, mp.price));

            if (remoteProducts && remoteProducts.length > 0) {
                await db.transaction('rw', db.products, async () => {
                    for (const rp of remoteProducts) {
                        const localP = await db.products.get(rp.id);
                        const overridePrice = priceMap.get(rp.id);
                        const finalPrice = overridePrice !== undefined ? overridePrice : rp.price;
                        
                        const updatedP: Product = {
                            id: rp.id, name: rp.name, price: finalPrice,
                            costPrice: rp.cost_price, category: rp.category, barcode: rp.barcode,
                            variants: rp.variants, addons: rp.addons, recipe: rp.recipe,
                            imageUrl: rp.image_url, trackStock: rp.track_stock,
                            stock: localP ? localP.stock : 0, image: localP ? localP.image : undefined
                        };
                        await db.products.put(updatedP);
                    }
                });
            }

            // 2. Pull Customers & Suppliers
            const { data: remoteCustomers } = await supabase.from(TABLE_CUSTOMERS).select('*');
            if (remoteCustomers) await db.customers.bulkPut(remoteCustomers.map((rc: any) => ({
                id: rc.id, memberId: rc.member_id, name: rc.name, contact: rc.contact, points: rc.points, createdAt: rc.updated_at
            })));
            
            const { data: remoteSuppliers } = await supabase.from(TABLE_SUPPLIERS).select('*');
            if (remoteSuppliers) await db.suppliers.bulkPut(remoteSuppliers as Supplier[]);

            // 3. Pull Discounts
            const { data: remoteDiscounts } = await supabase.from(TABLE_DISCOUNTS).select('*');
            if (remoteDiscounts) {
                const discounts: DiscountDefinition[] = remoteDiscounts.map((d: any) => ({
                    id: d.id, name: d.name, type: d.type, value: d.value,
                    startDate: d.start_date, endDate: d.end_date, isActive: d.is_active,
                    valid_store_ids: d.valid_store_ids
                }));
                await db.discountDefinitions.bulkPut(discounts);
            }

            // 4. Pull Point Rules
            const { data: remoteRules } = await supabase.from(TABLE_POINT_RULES).select('*');
            if (remoteRules) {
                const rules: PointRule[] = remoteRules.map((r: any) => ({
                    id: r.id, type: r.type, description: r.description,
                    spendAmount: r.spend_amount, points_earned: r.points_earned,
                    targetId: r.target_id, pointsPerItem: r.points_per_item,
                    validStoreIds: r.valid_store_ids
                }));
                // Update membership settings
                const memSettings = await db.settings.get('membershipSettings');
                const currentSettings = memSettings?.value as MembershipSettings || { enabled: false, pointRules: [], rewards: [] };
                await db.settings.put({
                    key: 'membershipSettings',
                    value: { ...currentSettings, pointRules: rules }
                });
            }

            return { success: true, message: "Sync Data (Produk, Harga, Promo, Poin) Berhasil." };

        } catch (e: any) {
            return { success: false, message: e.message };
        }
    },

    // --- DASHBOARD REPORTING ---
    fetchDashboardData: async (startDate: Date, endDate: Date) => {
        if (!supabase) return { transactions: [], inventory: [] };
        const { data: transactions } = await supabase
            .from(TABLE_TRANSACTIONS)
            .select('*')
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString());
        const { data: inventory } = await supabase.from(TABLE_INVENTORY).select('*');
        return { transactions: transactions || [], inventory: inventory || [] };
    },
    
    fetchReportData: async (startDate: Date, endDate: Date) => {
        if (!supabase) return [];
        const { data } = await supabase.from(TABLE_TRANSACTIONS)
            .select('*')
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString());
        return data || [];
    },

    fetchStockAdjustments: async (startDate: Date, endDate: Date) => {
        if (!supabase) return [];
        const { data } = await supabase.from(TABLE_STOCK_ADJUSTMENTS)
            .select('*')
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString())
            .order('created_at', { ascending: false });
        return data || [];
    },

    fetchFinanceData: async (startDate: Date, endDate: Date) => {
        if (!supabase) return { expenses: [], otherIncomes: [], transactions: [], purchases: [] };
        const { data: expenses } = await supabase.from(TABLE_EXPENSES).select('*').gte('date', startDate.toISOString()).lte('date', endDate.toISOString());
        const { data: incomes } = await supabase.from(TABLE_OTHER_INCOMES).select('*').gte('date', startDate.toISOString()).lte('date', endDate.toISOString());
        const { data: transactions } = await supabase.from(TABLE_TRANSACTIONS).select('*').gte('created_at', startDate.toISOString()).lte('created_at', endDate.toISOString());
        const { data: purchases } = await supabase.from(TABLE_PURCHASES).select('*').gte('date', startDate.toISOString()).lte('date', endDate.toISOString());
        return { expenses: expenses || [], otherIncomes: incomes || [], transactions: transactions || [], purchases: purchases || [] };
    },

    // --- NEW: Fetch Audit Logs ---
    fetchAuditLogs: async (limit: number = 100) => {
        if (!supabase) return [];
        const { data } = await supabase.from(TABLE_AUDIT_LOGS)
            .select('*')
            .order('timestamp', { ascending: false })
            .limit(limit);
        
        // Map back to internal type
        return (data || []).map((l: any) => ({
            id: l.id,
            timestamp: l.timestamp,
            userId: l.user_id,
            userName: l.user_name,
            action: l.action,
            targetId: l.target_id,
            details: l.details,
            storeId: l.store_id // Add store info
        }));
    },

    // --- MAINTENANCE: Clear Operational Data (Quota Management) ---
    clearOperationalData: async (): Promise<{ success: boolean; message: string }> => {
        if (!supabase) return { success: false, message: 'Supabase belum diinisialisasi.' };
        try {
            // Delete all records from high-volume tables. 
            // Note: We leave Master Data (Products, Customers) intact.
            await supabase.from(TABLE_TRANSACTIONS).delete().neq('id', '0');
            await supabase.from(TABLE_STOCK_ADJUSTMENTS).delete().neq('id', '0');
            await supabase.from(TABLE_AUDIT_LOGS).delete().neq('id', '0');
            await supabase.from(TABLE_INVENTORY).delete().neq('id', '00000000-0000-0000-0000-000000000000');
            
            return { success: true, message: "Data Transaksi & Log berhasil dihapus dari Cloud." };
        } catch (e: any) {
            return { success: false, message: e.message };
        }
    }
};
