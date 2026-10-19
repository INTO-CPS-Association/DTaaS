import { act, fireEvent, render, screen, within } from '@testing-library/react';
import VisualiseTab from 'route/digitaltwins/visualise/VisualiseTab';

jest.mock('extension/extensionHost', () => {
  const { fakeHostServices } = jest.requireActual(
    '@into-cps-association/dtaas-sdk/testing',
  );
  const asset = {
    schemaVersion: '1.0',
    name: 'junction-7',
    layout: { type: 'single', panes: ['photo'] },
    substrates: {
      photo: { adapter: 'embed', source: 'https://grafana.example/d/1' },
    },
  };
  const host = fakeHostServices({
    files: {
      'digital_twins/junction7/visualisation.json': JSON.stringify(asset),
      'digital_twins/mass-spring/main.sh': 'echo run',
    },
  });
  const { viz } = jest
    .requireActual('viz/createCore')
    .default({}, host.contents, [], () => host);
  return { sharedServices: { ...host, viz } };
});

async function choose(twin: string) {
  await act(async () => {
    fireEvent.mouseDown(screen.getByRole('combobox'));
  });
  await act(async () => {
    fireEvent.click(within(screen.getByRole('listbox')).getByText(twin));
  });
}

describe('the Visualise tab', () => {
  it('lists the twins in the library', async () => {
    await act(async () => {
      render(<VisualiseTab />);
    });
    await act(async () => {
      fireEvent.mouseDown(screen.getByRole('combobox'));
    });

    const options = within(screen.getByRole('listbox')).getAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual([
      'junction7',
      'mass-spring',
    ]);
  });

  it('draws a twin from the visualisation.json in its folder', async () => {
    await act(async () => {
      render(<VisualiseTab />);
    });
    await choose('junction7');

    expect(await screen.findByLabelText('photo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Live' })).toBeInTheDocument();
  });

  it('says so when a twin has no visualisation yet', async () => {
    await act(async () => {
      render(<VisualiseTab />);
    });
    await choose('mass-spring');

    expect(
      await screen.findByText(/has no visualisation.json/),
    ).toBeInTheDocument();
  });
});
