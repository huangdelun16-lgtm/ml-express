import React, { createContext, PropsWithChildren, useCallback, useMemo, useState } from 'react';
import { Snackbar } from 'react-native-paper';

type SnackbarContextType = {
  showMessage: (message: string) => void;
};

export const SnackbarContext = createContext<SnackbarContextType>({ showMessage: () => {} });

export function useSnackbar() {
  const ctx = React.useContext(SnackbarContext);
  return ctx;
}

export function SnackbarProvider({ children }: PropsWithChildren<{}>) {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');

  const showMessage = useCallback((msg: string) => {
    setMessage(msg);
    setVisible(true);
  }, []);

  const value = useMemo(() => ({ showMessage }), [showMessage]);

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      <Snackbar visible={visible} onDismiss={() => setVisible(false)} duration={2500}>
        {message}
      </Snackbar>
    </SnackbarContext.Provider>
  );
}


