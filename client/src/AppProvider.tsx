import { CssBaseline } from '@mui/material';
import { ThemeProvider, createTheme, Theme } from '@mui/material/styles';
import AuthProvider from 'route/auth/AuthProvider';
import * as React from 'react';
import { Provider } from 'react-redux';
import { setupStore } from 'store/Redux/store';

const mdTheme: Theme = createTheme({
  palette: {
    mode: 'light',
  },
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const store = setupStore();

  return (
    <Provider store={store}>
      <ThemeProvider theme={mdTheme}>
        <AuthProvider>
          <CssBaseline />
        </AuthProvider>
        {children}
      </ThemeProvider>
    </Provider>
  );
}

export default AppProvider;
