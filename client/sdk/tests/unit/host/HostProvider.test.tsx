import { render, screen } from '@testing-library/react';
import { HostProvider, useHost } from 'src/host/HostProvider';
import type { HostServices } from 'src/index';

function Greeting() {
  const user = useHost().auth.useUser();
  return <p>Hello {user?.username}</p>;
}

const services = {
  auth: { useUser: () => ({ username: 'ada' }) },
} as unknown as HostServices;

describe('HostProvider', () => {
  it('gives components the host services', () => {
    render(
      <HostProvider services={services}>
        <Greeting />
      </HostProvider>,
    );
    expect(screen.getByText('Hello ada')).toBeInTheDocument();
  });

  it('makes useHost fail loudly outside a provider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<Greeting />)).toThrow(
      'useHost() must be used inside <HostProvider>',
    );
  });
});
