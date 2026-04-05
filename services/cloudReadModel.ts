import type { AuditLog, Expense, OtherIncome, Purchase, StockAdjustment, Transaction } from '../types';
import { dropboxService } from './dropboxService';
import { mockDataService } from './mockData';

type CloudBranchPayload = {
    storeId: string;
    transactionRecords?: Transaction[];
    stockAdjustments?: StockAdjustment[];
    currentStock?: Array<{ id: string; name: string; stock: number }>;
    expenses?: Expense[];
    otherIncomes?: OtherIncome[];
    auditLogs?: AuditLog[];
};

type InventorySnapshot = { id: string; name: string; stock: number; storeId: string };
type BranchAware = { storeId?: string; store_id?: string };
type CloudMode = 'live' | 'demo';

export type CloudLoadResult<T> = {
    data: T;
    mode: CloudMode;
    lastUpdated: Date;
    availableBranches: string[];
};

const withStoreId = <T extends object>(items: T[] | undefined, storeId: string): Array<T & { storeId: string }> =>
    (items || []).map(item => ({ ...item, storeId }));

const readStoreId = (item: BranchAware | undefined | null): string | undefined => item?.storeId || item?.store_id;

export function getAvailableBranchesFromItems(...groups: BranchAware[][]): string[] {
    const branches = new Set<string>();

    groups.forEach(group => {
        group.forEach(item => {
            const storeId = readStoreId(item);
            if (storeId) branches.add(storeId);
        });
    });

    return Array.from(branches).sort();
}

export function filterItemsByBranch<T extends BranchAware>(items: T[], selectedBranch: string): T[] {
    if (selectedBranch === 'ALL') return items;
    return items.filter(item => readStoreId(item) === selectedBranch);
}

export async function fetchCloudBranchPayloads(): Promise<CloudBranchPayload[]> {
    return dropboxService.fetchAllBranchData();
}

export async function fetchDashboardCloudData(): Promise<{
    transactions: Array<Transaction & { storeId: string }>;
    inventory: InventorySnapshot[];
    stockLogs: Array<StockAdjustment & { storeId: string }>;
    expenses: Array<Expense & { storeId: string }>;
}> {
    const allBranches = await fetchCloudBranchPayloads();

    let transactions: Array<Transaction & { storeId: string }> = [];
    let inventory: InventorySnapshot[] = [];
    let stockLogs: Array<StockAdjustment & { storeId: string }> = [];
    let expenses: Array<Expense & { storeId: string }> = [];

    allBranches.forEach(branch => {
        transactions = [...transactions, ...withStoreId(branch.transactionRecords, branch.storeId)];
        stockLogs = [...stockLogs, ...withStoreId(branch.stockAdjustments, branch.storeId)];
        expenses = [...expenses, ...withStoreId(branch.expenses, branch.storeId)];
        inventory = [
            ...inventory,
            ...(branch.currentStock || []).map(item => ({ ...item, storeId: branch.storeId })),
        ];
    });

    return { transactions, inventory, stockLogs, expenses };
}

export async function fetchFinanceCloudData(): Promise<{
    transactions: Array<Transaction & { storeId: string }>;
    expenses: Array<Expense & { storeId: string }>;
    otherIncomes: Array<OtherIncome & { storeId: string }>;
    purchases: Purchase[];
}> {
    const allBranches = await fetchCloudBranchPayloads();

    let transactions: Array<Transaction & { storeId: string }> = [];
    let expenses: Array<Expense & { storeId: string }> = [];
    let otherIncomes: Array<OtherIncome & { storeId: string }> = [];

    allBranches.forEach(branch => {
        transactions = [...transactions, ...withStoreId(branch.transactionRecords, branch.storeId)];
        expenses = [...expenses, ...withStoreId(branch.expenses, branch.storeId)];
        otherIncomes = [...otherIncomes, ...withStoreId(branch.otherIncomes, branch.storeId)];
    });

    return { transactions, expenses, otherIncomes, purchases: [] };
}

export async function fetchReportsCloudData(): Promise<{
    transactions: Array<Transaction & { storeId: string }>;
    stockAdjustments: Array<StockAdjustment & { storeId: string }>;
    inventory: InventorySnapshot[];
    expenses: Array<Expense & { storeId: string }>;
}> {
    const allBranches = await fetchCloudBranchPayloads();

    let transactions: Array<Transaction & { storeId: string }> = [];
    let stockAdjustments: Array<StockAdjustment & { storeId: string }> = [];
    let inventory: InventorySnapshot[] = [];
    let expenses: Array<Expense & { storeId: string }> = [];

    allBranches.forEach(branch => {
        transactions = [...transactions, ...withStoreId(branch.transactionRecords, branch.storeId)];
        stockAdjustments = [...stockAdjustments, ...withStoreId(branch.stockAdjustments, branch.storeId)];
        expenses = [...expenses, ...withStoreId(branch.expenses, branch.storeId)];
        inventory = [
            ...inventory,
            ...(branch.currentStock || []).map(item => ({ ...item, storeId: branch.storeId })),
        ];
    });

    return { transactions, stockAdjustments, inventory, expenses };
}

export async function fetchAuditCloudLogs(): Promise<Array<AuditLog & { storeId: string }>> {
    const allBranches = await fetchCloudBranchPayloads();

    const logs = allBranches.flatMap(branch => withStoreId(branch.auditLogs, branch.storeId));
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return logs;
}

export async function loadDashboardCloudSource(): Promise<CloudLoadResult<{
    transactions: Array<Transaction & { storeId: string }>;
    inventory: InventorySnapshot[];
    stockLogs: Array<StockAdjustment & { storeId: string }>;
    expenses: Array<Expense & { storeId: string }>;
}>> {
    if (!dropboxService.isConfigured()) {
        const mock = mockDataService.getMockDashboardData();
        const data = {
            transactions: mock.transactions as Array<Transaction & { storeId: string }>,
            inventory: mock.inventory.map(item => ({
                id: item.id,
                name: item.name,
                stock: item.stock,
                storeId: readStoreId(item)!,
            })),
            stockLogs: mock.stockAdjustments as Array<StockAdjustment & { storeId: string }>,
            expenses: mock.expenses as Array<Expense & { storeId: string }>,
        };

        return {
            data,
            mode: 'demo',
            lastUpdated: new Date(),
            availableBranches: getAvailableBranchesFromItems(data.transactions, data.inventory, data.stockLogs, data.expenses),
        };
    }

    const data = await fetchDashboardCloudData();
    return {
        data,
        mode: 'live',
        lastUpdated: new Date(),
        availableBranches: getAvailableBranchesFromItems(data.transactions, data.inventory, data.stockLogs, data.expenses),
    };
}

export async function loadFinanceCloudSource(): Promise<CloudLoadResult<{
    transactions: Array<Transaction & { storeId: string }>;
    expenses: Array<Expense & { storeId: string }>;
    otherIncomes: Array<OtherIncome & { storeId: string }>;
    purchases: Purchase[];
}>> {
    if (!dropboxService.isConfigured()) {
        const mock = mockDataService.getMockDashboardData();
        const data = {
            transactions: mock.transactions as Array<Transaction & { storeId: string }>,
            expenses: mock.expenses as Array<Expense & { storeId: string }>,
            otherIncomes: mock.otherIncomes as Array<OtherIncome & { storeId: string }>,
            purchases: [] as Purchase[],
        };

        return {
            data,
            mode: 'demo',
            lastUpdated: new Date(),
            availableBranches: getAvailableBranchesFromItems(data.transactions, data.expenses, data.otherIncomes),
        };
    }

    const data = await fetchFinanceCloudData();
    return {
        data,
        mode: 'live',
        lastUpdated: new Date(),
        availableBranches: getAvailableBranchesFromItems(data.transactions, data.expenses, data.otherIncomes),
    };
}

export async function loadReportsCloudSource(): Promise<CloudLoadResult<{
    transactions: Array<Transaction & { storeId: string }>;
    stockAdjustments: Array<StockAdjustment & { storeId: string }>;
    inventory: InventorySnapshot[];
    expenses: Array<Expense & { storeId: string }>;
}>> {
    if (!dropboxService.isConfigured()) {
        const mock = mockDataService.getMockDashboardData();
        const data = {
            transactions: mock.transactions as Array<Transaction & { storeId: string }>,
            stockAdjustments: mock.stockAdjustments as Array<StockAdjustment & { storeId: string }>,
            inventory: mock.inventory.map(item => ({
                id: item.id,
                name: item.name,
                stock: item.stock,
                storeId: readStoreId(item)!,
            })),
            expenses: mock.expenses as Array<Expense & { storeId: string }>,
        };

        return {
            data,
            mode: 'demo',
            lastUpdated: new Date(),
            availableBranches: getAvailableBranchesFromItems(data.transactions, data.stockAdjustments, data.inventory, data.expenses),
        };
    }

    const data = await fetchReportsCloudData();
    return {
        data,
        mode: 'live',
        lastUpdated: new Date(),
        availableBranches: getAvailableBranchesFromItems(data.transactions, data.stockAdjustments, data.inventory, data.expenses),
    };
}

export async function loadAuditCloudSource(): Promise<{
    logs: Array<AuditLog & { storeId: string }>;
    mode: 'live';
    lastUpdated: Date;
}> {
    const logs = await fetchAuditCloudLogs();

    return {
        logs,
        mode: 'live',
        lastUpdated: new Date(),
    };
}
