import Config from 'route/config/Config';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

jest.mock('@mui/material/CircularProgress', () => ({
  __esModule: true,
  default: jest.requireActual('@mui/material/CircularProgress').default,
}));

jest.mock('components/LinkButtons', () => ({
  __esModule: true,
  ...jest.requireActual('components/LinkButtons'),
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

Object.defineProperty(AbortSignal, 'timeout', {
  value: jest.fn(),
  writable: false,
});

const initialEnv = { ...globalThis.env };

describe('Config', () => {
  const mockResponse = {
    ok: true,
    status: 200,
    json: async () => ({ data: 'success' }),
  };
  beforeEach(() => {
    globalThis.env = { ...initialEnv };
    globalThis.fetch = jest.fn().mockResolvedValue(mockResponse);
  });

  afterEach(() => {
    cleanup();
    jest.resetAllMocks();
  });

  test('renders DeveloperConfig correctly', async () => {
    render(
      <MemoryRouter>
        <Config role="developer" />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Verifying configuration/i)).toBeInTheDocument();
    expect(screen.getByTestId('loading-icon')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/Config verification/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/REACT_APP_URL_BASENAME/i)).toBeInTheDocument();
    expect(
      screen.getByText(/REACT_APP_WORKBENCHLINK_JUPYTERLAB/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/REACT_APP_LOGOUT_REDIRECT_URI/i),
    ).toBeInTheDocument();
  });

  test('renders invalid UserConfig correctly', async () => {
    // Invalidate one config field to show user config
    globalThis.env.REACT_APP_GITLAB_SCOPES = 'invalid';
    render(
      <MemoryRouter>
        <Config role="user" />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Verifying configuration/i)).toBeInTheDocument();
    expect(screen.getByTestId('loading-icon')).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.getByText(/Invalid Application Configuration/i),
      ).toBeInTheDocument();
    });
    const linkToDeveloperConfig = screen.getByRole('link', {
      name: /Inspect configuration/i,
    });
    expect(linkToDeveloperConfig).toBeInTheDocument();
    expect(linkToDeveloperConfig).toHaveAttribute('href', './developer');
  });

  test('renders valid UserConfig correctly', async () => {
    render(
      <MemoryRouter>
        <Config role="user" />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Verifying configuration/i)).toBeInTheDocument();
    expect(screen.getByTestId('loading-icon')).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.getByText(/Configuration appears to be valid./i),
      ).toBeInTheDocument();
    });
    const linkToDeveloperConfig = screen.getByRole('link', {
      name: /Return to login/i,
    });
    expect(linkToDeveloperConfig).toBeInTheDocument();
    expect(linkToDeveloperConfig).toHaveAttribute('href', '/');
  });
});
