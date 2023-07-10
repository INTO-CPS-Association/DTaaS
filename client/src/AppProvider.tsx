import { CssBaseline } from '@mui/material';
import { ThemeProvider, createTheme, Theme } from '@mui/material/styles';
import AuthProvider from 'route/auth/AuthProvider';
import RelayEnvironment from 'RelayEnvironment';
import * as React from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { RelayEnvironmentProvider } from 'react-relay';
import { setupStore } from 'store/Redux/store';

const mdTheme: Theme = createTheme({
  palette: {
    mode: 'light',
  },
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const store = setupStore();

  return (
    <ReduxProvider store={store}>
      <RelayEnvironmentProvider environment={RelayEnvironment}>
        <React.Suspense fallback={<div>Loading...</div>}>
          <ThemeProvider theme={mdTheme}>
            <AuthProvider>
              <CssBaseline />
              {children}
            </AuthProvider>
          </ThemeProvider>
        </React.Suspense>
      </RelayEnvironmentProvider>
    </ReduxProvider>
  );
}

export default AppProvider;
