import { render, screen, waitFor } from '@testing-library/react';
import Config from 'route/config/Config';
import * as configUtil from 'util/configUtil';

jest.mock('util/configUtil', () => ({
  getValidationResults: jest.fn(),
}));

jest.mock('route/config/ConfigItems', () => ({
  loadingComponent: () => <div data-testid="loading-component">Loading...</div>,
  ConfigItem: ({ label, value }: { label: string; value: string }) => (
    <div data-testid="config-item">
      {label}: {value}
    </div>
  ),
}));

describe('Config', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Only the keys these tests read. The cast says the rest of the
    // environment is deliberately absent.
    globalThis.env = {
      API_URL: 'http://localhost', // NOSONAR
      AUTH_URL: 'http://auth', // NOSONAR
    } as unknown as typeof globalThis.env;
  });

  it('renders loading component when data is being fetched', () => {
    (configUtil.getValidationResults as jest.Mock).mockReturnValueOnce(
      new Promise(() => {}), // Never resolves
    );

    render(<Config role="user" />);
    expect(screen.getByTestId('loading-component')).toBeInTheDocument();
  });

  it('renders user config when validation succeeds', async () => {
    (configUtil.getValidationResults as jest.Mock).mockResolvedValueOnce({
      API_URL: { value: 'http://localhost', status: 200 }, // NOSONAR
      AUTH_URL: { value: 'http://auth', status: 200 }, // NOSONAR
    });

    render(<Config role="user" />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-component')).not.toBeInTheDocument();
    });
  });

  it('renders developer config when role is developer', async () => {
    (configUtil.getValidationResults as jest.Mock).mockResolvedValueOnce({
      API_URL: { value: 'http://localhost', status: 200 }, // NOSONAR
      AUTH_URL: { value: 'http://auth', status: 200 }, // NOSONAR
    });

    render(<Config role="developer" />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-component')).not.toBeInTheDocument();
    });
  });

  it('says the check failed when the validation fetch fails', async () => {
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    (configUtil.getValidationResults as jest.Mock).mockRejectedValueOnce(
      new Error('Network error'),
    );

    render(<Config role="user" />);

    // An empty result must not read as a valid configuration.
    expect(
      await screen.findByText(/The configuration could not be checked/),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Configuration appears to be valid.'),
    ).not.toBeInTheDocument();
    expect(consoleError).toHaveBeenCalledWith(
      'The configuration check failed.',
      expect.any(Error),
    );
    consoleError.mockRestore();
  });

  it('says the check failed in the developer view too', async () => {
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    (configUtil.getValidationResults as jest.Mock).mockRejectedValueOnce(
      new Error('Network error'),
    );

    render(<Config role="developer" variant="embedded" />);

    expect(
      await screen.findByText(/The configuration could not be checked/),
    ).toBeInTheDocument();
    consoleError.mockRestore();
  });
});
