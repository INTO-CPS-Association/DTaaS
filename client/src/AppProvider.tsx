import { CssBaseline } from '@mui/material';
import { ThemeProvider, Theme } from '@mui/material/styles';
import AuthProvider from 'route/auth/AuthProvider';
import CustomSnackbar from 'components/route/Snackbar';
import { useAuth } from 'react-oidc-context';

import { Provider } from 'react-redux';
import store from 'store/store';
import createAppTheme from 'theme/appTheme';

// Built once, at module load.
const mdTheme: Theme = createAppTheme();

function AuthenticatedSnackbar() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <CustomSnackbar /> : null;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <ThemeProvider theme={mdTheme}>
        <AuthProvider>
          <CssBaseline />
          {children}
          <AuthenticatedSnackbar />
        </AuthProvider>
      </ThemeProvider>
    </Provider>
  );
}

export default AppProvider;
