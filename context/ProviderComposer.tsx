import React from 'react';

type ProviderComponent = React.ComponentType<{ children: React.ReactNode }>;

interface ProviderComposerProps {
  providers: ProviderComponent[];
  children: React.ReactNode;
}

const ProviderComposer: React.FC<ProviderComposerProps> = ({ providers, children }) =>
  providers.reduceRight(
    (acc, Provider) => <Provider>{acc}</Provider>,
    children
  );

export default ProviderComposer;
