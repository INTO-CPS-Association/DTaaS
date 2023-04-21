import * as React from 'react';

jest.mock('page/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

jest.mock('@mui/material/Toolbar', () => ({
  __esModule: true,
  default: () => <div data-testid="toolbar" />,
}));

jest.mock('page/Footer', () => ({
  __esModule: true,
  default: () => <div data-testid="footer" />,
}));

jest.mock('page/Menu', () => ({
  __esModule: true,
  default: () => <div data-testid="menu" />,
}));
