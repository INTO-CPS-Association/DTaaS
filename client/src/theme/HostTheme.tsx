import type { ReactNode } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import createAppTheme from 'theme/appTheme';

const THEME = createAppTheme();

/**
 * The client's theme, which the host gives an extension for what it draws
 * into a React root of its own, such as the controls of a substrate.
 */
export default function HostTheme({
  children,
}: {
  readonly children: ReactNode;
}) {
  return <ThemeProvider theme={THEME}>{children}</ThemeProvider>;
}
