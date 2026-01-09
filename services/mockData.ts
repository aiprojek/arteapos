
import type { Transaction, Expense, OtherIncome, StockAdjustment, ExpenseStatus } from '../types';

// Helper to get date relative to today
const getDate = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString();
};

export const mockDataService = {
    getMockDashboardData: () => {
        const branches = ['CABANG-JKT', 'CABANG-BDG', 'CABANG-SBY'];
        
        // 1. Mock Transactions (50 transactions spread over 7 days)
        const transactions: any[] = [];
        for (let i = 0; i < 50; i++) {
            const branch = branches[Math.floor(Math.random() * branches.length)];
            const daysAgo = Math.floor(Math.random() * 7);
            const total = (Math.floor(Math.random() * 20) + 1) * 15000; // Random amount
            
            transactions.push({
                id: `MOCK-${Date.now()}-${i}`,
                storeId: branch,
                store_id: branch, // Compatibility
                createdAt: getDate(daysAgo),
                created_at: getDate(daysAgo),
                total: total,
                amountPaid: total,
                amount_paid: total,
                paymentStatus: 'paid',
                payment_status: 'paid',
                items: [
                    { name: 'Kopi Susu Gula Aren', quantity: 1, price: 18000 },
                    { name: 'Croissant Butter', quantity: 2, price: 25000 }
                ],
                customerName: i % 5 === 0 ? 'Budi Santoso' : null,
                userName: 'Staff Demo'
            });
        }

        // Add some unpaid/partial transactions for debt demo
        transactions.push({
            id: `MOCK-DEBT-1`, storeId: 'CABANG-JKT', createdAt: getDate(1), 
            total: 150000, amountPaid: 50000, paymentStatus: 'partial', customerName: 'Pak Eko (Langganan)'
        });

        // 2. Mock Inventory
        const inventory = [
            { id: 'm1', name: 'Biji Kopi Arabica', stock: 1200, store_id: 'CABANG-JKT' },
            { id: 'm2', name: 'Susu UHT Full Cream', stock: 3, store_id: 'CABANG-JKT' }, // Low stock warning
            { id: 'm3', name: 'Sirup Hazelnut', stock: 0, store_id: 'CABANG-BDG' }, // Out of stock
            { id: 'm4', name: 'Cup Plastic 16oz', stock: 500, store_id: 'CABANG-SBY' },
        ];

        // 3. Mock Expenses
        const expenses: Expense[] = [
            { id: 'e1', description: 'Listrik Token', amount: 500000, amountPaid: 50000, date: getDate(2), category: 'Operasional', status: 'lunas' as ExpenseStatus },
            { id: 'e2', description: 'Beli Galon', amount: 30000, amountPaid: 30000, date: getDate(0), category: 'Dapur', status: 'lunas' as ExpenseStatus },
        ].map(e => ({...e, storeId: 'CABANG-JKT'}));

        // 4. Mock Incomes
        const otherIncomes: OtherIncome[] = [
            { id: 'i1', description: 'Sewa Lahan Parkir', amount: 200000, date: getDate(3), category: 'Sewa' }
        ].map(i => ({...i, storeId: 'CABANG-BDG'}));

        // 5. Mock Stock Adjustments (Audit Logs)
        const stockAdjustments: StockAdjustment[] = [
            { id: 'sa1', productId: 'p1', productName: 'Susu UHT', change: -2, newStock: 3, notes: 'Pecah saat loading', createdAt: getDate(0) }
        ].map(s => ({...s, storeId: 'CABANG-JKT'}));

        return {
            transactions,
            inventory,
            expenses,
            otherIncomes,
            stockAdjustments,
            auditLogs: []
        };
    }
};
