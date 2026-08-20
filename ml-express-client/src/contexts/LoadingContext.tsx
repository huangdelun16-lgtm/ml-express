import React, { createContext, useContext, useState, ReactNode } from 'react';
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

  const showLoading = (msg?: string, _type: AnimationType = 'package') => {
    setMessage(msg || '加载中...');
    setIsLoading(true);
  };

  const hideLoading = () => {
    setIsLoading(false);
  };

  return (
    <LoadingContext.Provider value={{ showLoading, hideLoading, isLoading }}>
      {children}
      {isLoading && (
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

