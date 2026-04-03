
import React from 'react';
import {
  CrossCuttingProviders,
  DomainProviders,
  PlatformProviders,
} from './AppProviderGroups';

const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <PlatformProviders>
      <CrossCuttingProviders>
        <DomainProviders>{children}</DomainProviders>
      </CrossCuttingProviders>
    </PlatformProviders>
  );
};

export default AppProviders;
