
import React from 'react';
import { DataProvider } from './DataContext';
import { UIProvider } from './UIContext';
import { AuthProvider } from './AuthContext';
import { ProductProvider } from './ProductContext';
import { SettingsProvider } from './SettingsContext';
import { SessionProvider } from './SessionContext';
import { FinanceProvider } from './FinanceContext';
import { DiscountProvider } from './DiscountContext';
import { CustomerProvider } from './CustomerContext';
import { CartProvider } from './CartContext';
import { AuditProvider } from './AuditContext'; 
import { CloudSyncProvider } from './CloudSyncContext';
import { CustomerDisplayProvider } from './CustomerDisplayContext'; // NEW

const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <DataProvider>
      <CloudSyncProvider>
        <AuditProvider>
          <UIProvider>
            <CustomerDisplayProvider>
              <AuthProvider>
                <ProductProvider>
                  <SettingsProvider>
                    <SessionProvider>
                      <FinanceProvider>
                        <DiscountProvider>
                          <CustomerProvider>
                            <CartProvider>
                              {children}
                            </CartProvider>
                          </CustomerProvider>
                        </DiscountProvider>
                      </FinanceProvider>
                    </SessionProvider>
                  </SettingsProvider>
                </ProductProvider>
              </AuthProvider>
            </CustomerDisplayProvider>
          </UIProvider>
        </AuditProvider>
      </CloudSyncProvider>
    </DataProvider>
  );
};

export default AppProviders;
