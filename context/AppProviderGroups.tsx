import React from 'react';

import { DataProvider } from './DataContext';
import { CloudSyncProvider } from './CloudSyncContext';
import { AuditProvider } from './AuditContext';
import { UIProvider } from './UIContext';
import { CustomerDisplayProvider } from './CustomerDisplayContext';
import { AuthProvider } from './AuthContext';
import { ProductProvider } from './ProductContext';
import { SettingsProvider } from './SettingsContext';
import { SessionProvider } from './SessionContext';
import { FinanceProvider } from './FinanceContext';
import { DiscountProvider } from './DiscountContext';
import { CustomerProvider } from './CustomerContext';
import { CartProvider } from './CartContext';
import ProviderComposer from './ProviderComposer';

type ProviderComponent = React.ComponentType<{ children: React.ReactNode }>;

const platformProviders: ProviderComponent[] = [DataProvider];

const crossCuttingProviders: ProviderComponent[] = [
  CloudSyncProvider,
  AuditProvider,
  UIProvider,
  CustomerDisplayProvider,
];

const domainProviders: ProviderComponent[] = [
  AuthProvider,
  ProductProvider,
  SettingsProvider,
  SessionProvider,
  FinanceProvider,
  DiscountProvider,
  CustomerProvider,
  CartProvider,
];

export const PlatformProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProviderComposer providers={platformProviders}>{children}</ProviderComposer>
);

export const CrossCuttingProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProviderComposer providers={crossCuttingProviders}>{children}</ProviderComposer>
);

export const DomainProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProviderComposer providers={domainProviders}>{children}</ProviderComposer>
);
