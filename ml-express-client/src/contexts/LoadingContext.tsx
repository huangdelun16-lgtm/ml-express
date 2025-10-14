import React, { createContext, useContext, useState, ReactNode } from 'react';
import DeliveryLoadingAnimation from '../components/DeliveryLoadingAnimation';
import PackageLoadingAnimation from '../components/PackageLoadingAnimation';

type AnimationType = 'delivery' | 'package';

interface LoadingContextType {
  showLoading: (message?: string, animationType?: AnimationType) => void;
  hideLoading: () => void;
  isLoading: boolean;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

interface LoadingProviderProps {
  children: ReactNode;
}

export function LoadingProvider({ children }: LoadingProviderProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('加载中...');
  const [animationType, setAnimationType] = useState<AnimationType>('package');

  const showLoading = (msg?: string, type: AnimationType = 'package') => {
    setMessage(msg || '加载中...');
    setAnimationType(type);
    setIsLoading(true);
  };

  const hideLoading = () => {
    setIsLoading(false);
  };

  return (
    <LoadingContext.Provider value={{ showLoading, hideLoading, isLoading }}>
      {children}
      {isLoading && animationType === 'delivery' && (
        <DeliveryLoadingAnimation message={message} showOverlay={true} />
      )}
      {isLoading && animationType === 'package' && (
        <PackageLoadingAnimation message={message} showOverlay={true} />
      )}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}

