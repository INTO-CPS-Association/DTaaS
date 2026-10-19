import { act, fireEvent, render, screen } from '@testing-library/react';
import { createFakeSignals } from '@into-cps-association/dtaas-sdk/testing';
import Timeline, { localTime } from 'viz/components/Timeline';

describe('the timeline', () => {
  it('shows whether the signals on screen are arriving', () => {
    const signals = createFakeSignals();
    render(<Timeline signals={signals} paths={['j7/queue']} />);

    act(() => signals.setConnection('down'));

    expect(screen.getByText('No live data')).toBeInTheDocument();
    act(() => signals.setConnection('live'));
    expect(screen.getByText('Live data')).toBeInTheDocument();
  });

  it('goes back to live from a moved playhead', () => {
    const signals = createFakeSignals();
    render(<Timeline signals={signals} paths={[]} />);

    act(() => signals.playhead.set(Date.now() - 600_000));
    expect(screen.getByRole('button', { name: 'Live' })).toHaveClass(
      'MuiButton-outlined',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Live' }));

    expect(screen.getByRole('button', { name: 'Live' })).toHaveClass(
      'MuiButton-contained',
    );
  });

  it('reads the slider position aloud as the local time', () => {
    const signals = createFakeSignals();
    const t = Date.now() - 600_000;
    render(<Timeline signals={signals} paths={[]} />);

    act(() => signals.playhead.set(t));

    const slider = screen.getByRole('slider', { name: 'Time' });
    expect(slider).toHaveAttribute('aria-valuetext', localTime(t));
    expect(slider).toHaveAttribute('step', '1000');
  });
});
