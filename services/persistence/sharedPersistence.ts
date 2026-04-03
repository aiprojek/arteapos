import { db } from '../db.ts';

export async function runAppDataTransaction<T>(work: () => Promise<T>): Promise<T> {
  return (db as any).transaction('rw', (db as any).tables.map((t: any) => t.name), work);
}

export async function syncTableById(tableName: string, rows: unknown[]) {
  const table = (db as any).table(tableName);
  const nextRows = Array.isArray(rows) ? rows : [];
  const nextIds = new Set(
    nextRows
      .map((row: any) => row?.id)
      .filter((id: any) => id !== undefined && id !== null)
  );

  await table.bulkPut(nextRows);

  const existingIds = await table.toCollection().primaryKeys();
  const staleIds = existingIds.filter((id: any) => !nextIds.has(id));
  if (staleIds.length > 0) {
    await table.bulkDelete(staleIds);
  }
}

export function base64ToBlob(base64: string): Blob {
  const [meta, data] = base64.split(',');
  if (!meta || !data) {
    return new Blob();
  }

  const mime = meta.match(/:(.*?);/)?.[1];
  const bstr = atob(data);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  return new Blob([u8arr], { type: mime });
}
