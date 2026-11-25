import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import WorkBench from 'route/workbench/Workbench';
import {
  PLATFORM_SERVICES_KEY,
  platformServices,
} from 'route/workbench/platformServices';

jest.mock('react-oidc-context', () => ({
  ...jest.requireActual('react-oidc-context'),
  useAuth: jest.fn(),
}));

describe('platformServices', () => {
  it('reads name=url entries and names the known services', () => {
    const services = platformServices(
      'grafana=https://foo.com/grafana, RabbitMQ=https://foo.com/rabbitmq',
    );
    expect(services.map((s) => [s.name, s.link])).toEqual([
      ['Grafana', 'https://foo.com/grafana'],
      ['RabbitMQ', 'https://foo.com/rabbitmq'],
    ]);
    expect(services[0].description).toMatch(/Dashboards/);
  });

  it('keeps an unknown service under the name it was given', () => {
    const [service] = platformServices('mlflow=https://foo.com/mlflow');
    expect(service.name).toBe('mlflow');
    expect(service.description).toBeUndefined();
  });

  it('keeps an equals sign inside the address', () => {
    const [service] = platformServices('grafana=https://foo.com/d?orgId=1');
    expect(service.link).toBe('https://foo.com/d?orgId=1');
  });

  it('skips entries without a name, without an address or with an unsafe one', () => {
    expect(
      platformServices(
        'grafana,=https://foo.com,influxdb=javascript:alert(1),,thingsboard=',
      ),
    ).toEqual([]);
  });

  it('lists nothing when the key is not a string', () => {
    expect(platformServices(undefined)).toEqual([]);
    expect(platformServices(42)).toEqual([]);
  });
});

describe('the Platform Services section of the workbench', () => {
  const original = globalThis.env[PLATFORM_SERVICES_KEY];

  beforeEach(() => {
    jest.mocked(useDispatch).mockReturnValue(jest.fn());
    jest
      .mocked(useSelector)
      .mockImplementation((selector: (state: object) => unknown) =>
        selector({
          auth: { userName: 'username' },
          workbench: { status: 'succeeded', services: {} },
        }),
      );
  });

  afterEach(() => {
    globalThis.env[PLATFORM_SERVICES_KEY] = original;
  });

  function renderPage() {
    render(
      <MemoryRouter>
        <WorkBench />
      </MemoryRouter>,
    );
  }

  it('shows one card per listed service, opening in a new tab', () => {
    globalThis.env[PLATFORM_SERVICES_KEY] =
      'grafana=https://foo.com/grafana,thingsboard=https://foo.com/tb';
    renderPage();

    expect(
      screen.getByRole('heading', { level: 2, name: 'Platform Services' }),
    ).toBeInTheDocument();
    const grafana = screen.getByRole('link', { name: /Grafana/ });
    expect(grafana).toHaveAttribute('href', 'https://foo.com/grafana');
    expect(grafana).toHaveAttribute('target', '_blank');
    expect(
      within(screen.getByRole('link', { name: /ThingsBoard/ })).getByText(
        /Devices, rules and dashboards/,
      ),
    ).toBeInTheDocument();
  });

  it('shows no section when the deployment lists no service', () => {
    delete globalThis.env[PLATFORM_SERVICES_KEY];
    renderPage();
    expect(
      screen.queryByRole('heading', { name: 'Platform Services' }),
    ).not.toBeInTheDocument();
  });
});
