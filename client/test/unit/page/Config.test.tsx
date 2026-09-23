import Config from 'route/config/Config';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as configUtil from 'util/configUtil';

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

  test('renders invalid UserConfig when a required URL is missing', async () => {
    const envWithoutRedirect: Partial<NodeJS.ProcessEnv> = {
      ...globalThis.env,
    };
    delete envWithoutRedirect.REACT_APP_REDIRECT_URI;
    globalThis.env = envWithoutRedirect as NodeJS.ProcessEnv;
    render(
      <MemoryRouter>
        <Config role="user" />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Invalid Application Configuration/i),
      ).toBeInTheDocument();
    });
    expect(
      screen.queryByText(/Configuration appears to be valid./i),
    ).not.toBeInTheDocument();
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

describe('Config variants', () => {
  const valid = {
    REACT_APP_URL: { value: 'http://localhost', status: 200 }, // NOSONAR
  };
  const invalid = {
    REACT_APP_URL: { value: 'http://localhost', error: 'unreachable' }, // NOSONAR
  };

  const renderUserConfig = (
    results: Record<string, configUtil.ValidationType>,
    variant?: 'page' | 'embedded',
  ) => {
    jest
      .spyOn(configUtil, 'getValidationResults')
      .mockResolvedValueOnce(results);
    render(
      <MemoryRouter basename="/au" initialEntries={['/au/insights/config']}>
        <Config role="user" variant={variant} />
      </MemoryRouter>,
    );
  };

  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
  });

  test('Offers the way back to sign in on the public page', async () => {
    renderUserConfig(valid);

    expect(
      await screen.findByRole('link', { name: 'Return to login' }),
    ).toHaveAttribute('href', '/');
  });

  test('Offers no sign-in link to a person who is signed in', async () => {
    renderUserConfig(valid, 'embedded');

    expect(
      await screen.findByText('Configuration appears to be valid.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Return to login' }),
    ).not.toBeInTheDocument();
  });

  test('Links to the developer page relative to itself on the public page', async () => {
    renderUserConfig(invalid);

    expect(
      await screen.findByRole('link', { name: 'Inspect configuration' }),
    ).toHaveAttribute('href', './developer');
  });

  test('Links to the developer page through the router when embedded', async () => {
    renderUserConfig(invalid, 'embedded');

    // A relative link would resolve to /au/insights/developer, which does not
    // exist. The router adds the base path to the named page instead.
    expect(
      await screen.findByRole('link', { name: 'Inspect configuration' }),
    ).toHaveAttribute('href', '/au/config/developer');
  });
});
