declare module 'peerjs' {
  export default class Peer {
    disconnected: boolean;
    constructor(...args: any[]);
    connect(id: string): any;
    on(event: string, callback: (...args: any[]) => void): void;
    destroy(): void;
  }
}

declare module 'tesseract.js' {
  export function createWorker(lang?: string): Promise<any>;
}

declare module '@supabase/supabase-js' {
  export type SupabaseClient = any;
  export function createClient(url: string, key: string): SupabaseClient;
}
