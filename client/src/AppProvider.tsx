import { CssBaseline } from '@mui/material';
import { ThemeProvider, createTheme, Theme } from '@mui/material/styles';
import AuthProvider from 'route/auth/AuthProvider';

import { Provider } from 'react-redux';
import store from 'store/store';

const mdTheme: Theme = createTheme({
  palette: {
    mode: 'light',
  },
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <ThemeProvider theme={mdTheme}>
        <AuthProvider>
          <CssBaseline />
          {children}
        </AuthProvider>
      </ThemeProvider>
    </Provider>
  );
}

export default AppProvider;
