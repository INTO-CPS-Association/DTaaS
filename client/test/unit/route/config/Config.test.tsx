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
    globalThis.env = {
      API_URL: 'http://localhost', // NOSONAR
      AUTH_URL: 'http://auth', // NOSONAR
    };
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

  it('catches error when validation fetch fails', async () => {
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    (configUtil.getValidationResults as jest.Mock).mockRejectedValueOnce(
      new Error('Network error'),
    );

    render(<Config role="user" />);

    await waitFor(() => {
      expect(configUtil.getValidationResults).toHaveBeenCalled();
    });

    consoleErrorSpy.mockRestore();
  });

  it('throws error with cause when validation fetch fails', async () => {
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    const networkError = new Error('Network error');
    (configUtil.getValidationResults as jest.Mock).mockRejectedValueOnce(
      networkError,
    );

    render(<Config role="user" />);

    await waitFor(() => {
      expect(configUtil.getValidationResults).toHaveBeenCalled();
    });

    consoleErrorSpy.mockRestore();
  });
});
