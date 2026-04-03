import type { AuditAction, CustomerDisplayPayload, KitchenDisplayPayload, User } from '../types';

interface AuditEventPayload {
  user: User | null;
  action: AuditAction;
  details: string;
  targetId?: string;
  evidenceImageUrl?: string;
}

interface AutoSyncEventPayload {
  staffName?: string;
}

type AuditListener = (payload: AuditEventPayload) => void | Promise<void>;
type AutoSyncListener = (payload: AutoSyncEventPayload) => void | Promise<void>;
type CustomerDisplayListener = (payload: CustomerDisplayPayload) => void | Promise<void>;
type KitchenDisplayListener = (payload: KitchenDisplayPayload) => void | Promise<void>;

const auditListeners = new Set<AuditListener>();
const autoSyncListeners = new Set<AutoSyncListener>();
const customerDisplayListeners = new Set<CustomerDisplayListener>();
const kitchenDisplayListeners = new Set<KitchenDisplayListener>();

export function emitAuditEvent(payload: AuditEventPayload) {
  return Promise.all(
    Array.from(auditListeners, listener => Promise.resolve(listener(payload)))
  ).then(() => undefined);
}

export function subscribeAuditEvents(listener: AuditListener) {
  auditListeners.add(listener);
  return () => {
    auditListeners.delete(listener);
  };
}

export function requestAutoSync(payload: AutoSyncEventPayload = {}) {
  return Promise.all(
    Array.from(autoSyncListeners, listener => Promise.resolve(listener(payload)))
  ).then(() => undefined);
}

export function subscribeAutoSyncEvents(listener: AutoSyncListener) {
  autoSyncListeners.add(listener);
  return () => {
    autoSyncListeners.delete(listener);
  };
}

export function sendCustomerDisplayEvent(payload: CustomerDisplayPayload) {
  return Promise.all(
    Array.from(customerDisplayListeners, listener => Promise.resolve(listener(payload)))
  ).then(() => undefined);
}

export function subscribeCustomerDisplayEvents(listener: CustomerDisplayListener) {
  customerDisplayListeners.add(listener);
  return () => {
    customerDisplayListeners.delete(listener);
  };
}

export function requestCustomerCameraCapture() {
  return sendCustomerDisplayEvent({ type: 'REQUEST_CAMERA' });
}

export function sendKitchenDisplayEvent(payload: KitchenDisplayPayload) {
  return Promise.all(
    Array.from(kitchenDisplayListeners, listener => Promise.resolve(listener(payload)))
  ).then(() => undefined);
}

export function subscribeKitchenDisplayEvents(listener: KitchenDisplayListener) {
  kitchenDisplayListeners.add(listener);
  return () => {
    kitchenDisplayListeners.delete(listener);
  };
}
