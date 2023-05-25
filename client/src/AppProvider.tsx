import { CssBaseline } from '@mui/material';
import { ThemeProvider, createTheme, Theme } from '@mui/material/styles';
import AuthProvider from 'route/auth/AuthProvider';
import * as React from 'react';
import { Provider } from 'react-redux';
import { setupStore } from 'store/Redux/store';
import { persistStore } from 'redux-persist';
import {PersistGate } from 'redux-persist/integration/react';

const mdTheme: Theme = createTheme({
  palette: {
    mode: 'light',
  },
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const store = setupStore();
  const persistor = persistStore(store);

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
      <ThemeProvider theme={mdTheme}>
        <AuthProvider>
          <CssBaseline />
          {children}
        </AuthProvider>
      </ThemeProvider>
      </PersistGate>
    </Provider>
  );
}

export default AppProvider;
