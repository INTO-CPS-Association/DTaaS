import { act, fireEvent, render, screen, within } from '@testing-library/react';
import VisualiseTab from 'route/digitaltwins/visualise/VisualiseTab';

let mockListFails = false;

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
      'digital_twins/broken/visualisation.json': '{"name": 3}',
      'digital_twins/slow/main.sh': 'echo run',
    },
  });
  const { viz } = jest
    .requireActual('viz/createCore')
    .default({}, host.contents, [], () => host);
  // A listing that fails on demand, and a twin whose file never arrives.
  const contents = {
    ...host.contents,
    list: (path: string) =>
      mockListFails
        ? Promise.reject(new Error('HTTP 500 at /secret/server/path'))
        : host.contents.list(path),
  };
  const slowViz = {
    ...viz,
    load: (dt: { name: string }) =>
      dt.name === 'slow' ? new Promise(jest.fn()) : viz.load(dt),
  };
  return { sharedServices: { ...host, contents, viz: slowViz } };
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
      'broken',
      'junction7',
      'mass-spring',
      'slow',
    ]);
  });

  it('draws a twin from the visualisation.json in its folder', async () => {
    await act(async () => {
      render(<VisualiseTab />);
    });
    await choose('junction7');

    expect(
      await screen.findByRole('region', { name: 'photo' }),
    ).toBeInTheDocument();
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

  it('shows a plain sentence when the visualisation cannot be read', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await act(async () => {
      render(<VisualiseTab />);
    });
    await choose('broken');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The visualisation could not be read.',
    );
    expect(warn).toHaveBeenCalledWith(
      'The visualisation could not be read.',
      expect.any(Error),
    );
    warn.mockRestore();
  });

  it('shows a spinner while the visualisation is on its way', async () => {
    await act(async () => {
      render(<VisualiseTab />);
    });
    await choose('slow');

    expect(screen.getByTestId('circular-progress')).toBeInTheDocument();
  });

  it('keeps the detail of a failed listing out of the page', async () => {
    mockListFails = true;
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await act(async () => {
      render(<VisualiseTab />);
    });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'The digital twins could not be listed.',
    );
    expect(screen.queryByText(/secret/)).toBeNull();
    expect(warn).toHaveBeenCalledWith(
      'The digital twins could not be listed.',
      expect.any(Error),
    );
    warn.mockRestore();
    mockListFails = false;
  });
});
