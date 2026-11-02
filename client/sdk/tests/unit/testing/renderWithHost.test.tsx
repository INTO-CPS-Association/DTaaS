import { lazy } from 'react';
import { screen } from '@testing-library/react';
import { useLocation } from 'react-router-dom';
import renderWithHost from 'src/testing/renderWithHost';
import fakeHostServices from 'src/testing/fakeHostServices';
import { useHost } from 'src/host/HostProvider';

function WhoAmI() {
  const host = useHost();
  const location = useLocation();
  return (
    <p>
      {host.auth.useUser()?.username} at {location.pathname}
    </p>
  );
}

describe('renderWithHost', () => {
  it('renders inside a host and a router at the given route', () => {
    renderWithHost(<WhoAmI />, { route: '/wind/farm' });
    expect(screen.getByText('user at /wind/farm')).toBeInTheDocument();
  });

  it('returns the host it created', () => {
    const { host } = renderWithHost(<WhoAmI />);
    host.ui.snackbar('hi', 'info');
    expect(host.recorded.snackbars).toHaveLength(1);
  });

  it('uses a host the test provides', () => {
    const host = fakeHostServices({ user: { username: 'ada' } });
    renderWithHost(<WhoAmI />, { host });
    expect(screen.getByText('ada at /')).toBeInTheDocument();
  });

  it('resolves lazy components behind a Suspense boundary', async () => {
    const Lazy = lazy(async () => ({ default: () => <p>loaded</p> }));
    renderWithHost(<Lazy />, { fallback: <p>loading</p> });
    expect(screen.getByText('loading')).toBeInTheDocument();
    expect(await screen.findByText('loaded')).toBeInTheDocument();
  });
});
