import { act, render, screen } from '@testing-library/react';
import createFakeSignals from 'src/testing/fakeSignals';

const Status = ({ paths }: { paths?: string[] }) => {
  const signals = useSignals();
  return <p>{signals.connection.use(paths)}</p>;
};
let current = createFakeSignals();
const useSignals = () => current;

describe('fake connection status', () => {
  beforeEach(() => {
    current = createFakeSignals();
  });

  it('starts live for every path', () => {
    expect(current.connection.get()).toBe('live');
    expect(current.connection.get(['a'])).toBe('live');
  });

  it('sets the state of all paths and clears overrides', () => {
    current.setConnection('connecting', ['a']);
    current.setConnection('down');
    expect(current.connection.get(['a', 'b'])).toBe('down');
    current.setConnection('live');
    expect(current.connection.get(['a'])).toBe('live');
  });

  it('overrides named paths only', () => {
    current.setConnection('down', ['mqtt/a']);
    expect(current.connection.get(['mqtt/b'])).toBe('live');
    expect(current.connection.get(['mqtt/a', 'mqtt/b'])).toBe('down');
    expect(current.connection.get()).toBe('down');
  });

  it('reports live for an empty path list', () => {
    current.setConnection('down');
    expect(current.connection.get([])).toBe('live');
  });

  it('re-renders use() consumers on change', () => {
    render(<Status paths={['a']} />);
    expect(screen.getByText('live')).toBeInTheDocument();
    act(() => current.setConnection('down', ['a']));
    expect(screen.getByText('down')).toBeInTheDocument();
  });
});
