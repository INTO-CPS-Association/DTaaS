import '@testing-library/jest-dom';
import { lazy, type ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useHost, type DtaasExtension } from '@into-cps-association/dtaas-sdk';

const WindPage = lazy(async () => ({
  default: function WindHome() {
    const host = useHost();
    return <p>Models in {host.library.conventions.modelsDirectory}</p>;
  },
}));

const wind: DtaasExtension = {
  id: 'wind',
  name: 'Wind kit',
  version: '0.1.0',
  sdk: 1,
  routes: [{ path: '', element: WindPage }],
  navigation: [{ label: 'Wind Farms', path: '/wind' }],
};

jest.mock('@gitbeaker/rest', () => ({ Gitlab: jest.fn() }));
jest.mock('page/Layout', () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
jest.mock('extension/extensionHost', () => {
  const { createPlatformServices } = jest.requireActual(
    'extension/hostServices',
  );
  const { default: createSignals } = jest.requireActual('viz/signals');
  const platform = createPlatformServices({
    getState: () => ({ auth: { userName: 'user1' }, settings: {} }),
    notify: jest.fn(),
  });
  const services = { ...platform, signals: createSignals([]), viz: {} };
  return {
    __esModule: true,
    env: {},
    sharedServices: services,
    default: {
      routes: [{ extension: wind, path: 'wind/*', element: WindPage }],
      navigation: wind.navigation,
    },
  };
});

describe('an extension in the client', () => {
  it('renders its page with the services of its own extension', async () => {
    const { default: ExtensionPage } = await import('extension/ExtensionPage');

    render(<ExtensionPage extension={wind} page={WindPage} />);

    expect(
      await screen.findByText('Models in common/models'),
    ).toBeInTheDocument();
  });

  it('adds its navigation after the core items of the menu', async () => {
    const { default: MenuItems } = await import('page/MenuItems');

    render(
      <MemoryRouter>
        <MenuItems open />
      </MemoryRouter>,
    );

    const links = screen.getAllByRole('link');
    const last = links[links.length - 1];
    expect(last).toHaveTextContent('Wind Farms');
    expect(last).toHaveAttribute('href', '/wind');
  });

  it('mounts its routes before the catch-all route', async () => {
    const { routes } = await import('routes');

    const paths = routes.map((route) => route.path);
    expect(paths.indexOf('wind/*')).toBe(paths.length - 2);
    expect(paths[paths.length - 1]).toBe('*');
  });
});
