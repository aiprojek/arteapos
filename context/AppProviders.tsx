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

// FIX: Change to React.FC to fix children prop type error
const AppProviders: React.FC = ({ children }) => {
  return (
    <DataProvider>
      <UIProvider>
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
      </UIProvider>
    </DataProvider>
  );
};

export default AppProviders;