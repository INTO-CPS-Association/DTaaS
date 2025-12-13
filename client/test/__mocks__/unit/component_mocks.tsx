jest.mock('components/LinkButtons', () => ({
  default: () => <div role="button">Button</div>,
}));

jest.mock('@mui/material/CircularProgress', () => ({
  __esModule: true,
  default: () => <div data-testid="circular-progress" />,
}));

jest.mock('@mui/material/Backdrop', () => ({
  __esModule: true,
  default: () => <div data-testid="backdrop" />,
}));

jest.mock('components/tab/TabComponent', () => ({
  __esModule: true,
  default: () => <div data-testid="tab-component" />,
}));

jest.mock('@mui/material/Backdrop', () => ({
  __esModule: true,
  default: () => <div data-testid="backdrop" />,
}));
