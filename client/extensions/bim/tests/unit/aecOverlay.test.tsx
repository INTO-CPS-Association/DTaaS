import type { ReactNode } from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { Encoding } from '@into-cps-association/dtaas-sdk';
import { initialState } from 'src/aec/aecAppearance';
import { MarkerColours } from 'src/aec/aecColours';
import { ClassLegend, HeatLegend, HelpPanel } from 'src/aec/aecLegend';
import ObjectPanel, { sizeText } from 'src/aec/aecObjectPanel';
import { changes, mountOverlay } from 'src/aec/aecOverlay';
import { OPTIONS, type OptionContext } from 'src/aec/aecShortcuts';
import { FloorPicker, stepFloor, Toolbar } from 'src/aec/aecToolbar';

// The appearance module imports three, which jest cannot load; the overlay
// needs none of its drawing.
jest.mock('three', () => ({}));

const contextWith = (): OptionContext => ({
  state: initialState(),
  hidden: [],
  colours: new MarkerColours(),
  refresh: jest.fn(),
  look: jest.fn(),
  reset: jest.fn(),
  toggleHelp: jest.fn(),
  toggleFullscreen: jest.fn(),
});

describe('the toolbar of the aec substrate', () => {
  it('has one button per option, in order, each printing its key', () => {
    render(<Toolbar context={contextWith()} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual(
      OPTIONS.map((o) => o.label),
    );
    expect(buttons.map((b) => b.textContent)).toEqual(
      OPTIONS.map((o) => o.key),
    );
  });

  it('draws a toggle that is on as selected and runs it on a click', () => {
    const context = contextWith();
    render(<Toolbar context={context} />);
    const hover = screen.getByRole('button', { name: 'Hover Highlight' });
    expect(hover).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Transparency' }));
    expect(context.state.transparent).toBe(true);
    expect(context.refresh).toHaveBeenCalled();
  });

  it('shows what the heatmap is set to once it colours something', () => {
    const context = contextWith();
    context.colours.record('a', { type: 'attention' } as Encoding, '#f00');
    render(<Toolbar context={context} />);
    expect(screen.getByRole('button', { name: 'Heatmap' })).toHaveTextContent(
      'mAll',
    );
  });
});

describe('the floor picker of the aec substrate', () => {
  it('is absent for a model with one floor', () => {
    const { container } = render(
      <FloorPicker storeys={['L1']} current={null} onChange={jest.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('steps through the floors with its arrows', () => {
    const onChange = jest.fn();
    render(
      <FloorPicker storeys={['L1', 'L2']} current="L1" onChange={onChange} />,
    );
    expect(
      screen.getByRole('button', { name: 'The floor below' }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'The floor above' }));
    expect(onChange).toHaveBeenCalledWith('L2');
  });

  it('starts from the lowest going up and the highest going down', () => {
    expect(stepFloor(-1, 1, 3)).toBe(0);
    expect(stepFloor(-1, -1, 3)).toBe(2);
    expect(stepFloor(2, 1, 3)).toBeNull();
  });
});

describe('the object panel of the aec substrate', () => {
  it('asks for a click until an object is picked', () => {
    render(<ObjectPanel picked={null} />);
    expect(screen.getByText('Click an object to see what it is.')).toBeTruthy();
  });

  it('lists the facts, the sensor and the property sets of an object', () => {
    const facts = {
      name: 'Probe',
      ifcClass: 'IfcSensor',
      predefinedType: 'NOTDEFINED',
      properties: { Pset_Common: { Reference: 'P-1' } },
    };
    const sensor = { name: 'Probe 1', signal: 'a/b' };
    render(<ObjectPanel picked={{ globalId: 'g1', facts, sensor }} />);
    expect(screen.getByText('IfcSensor')).toBeTruthy();
    expect(screen.queryByText('Predefined Type')).toBeNull();
    expect(screen.getByText('a/b')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Properties' }));
    expect(screen.getByText('P-1')).toBeTruthy();
  });

  it('writes a size in metres, or in millimetres for a small object', () => {
    expect(sizeText({ x: 1, y: 2.5, z: 0.2 })).toBe('1.00 × 2.50 × 0.20 m');
    expect(sizeText({ x: 0.04, y: 0.1, z: 0.02 })).toBe('40 × 100 × 20 mm');
  });
});

describe('the legends of the aec substrate', () => {
  const scale = { type: 'colorScale', scheme: 'heat', domain: [18, 30] };

  it('states the ends of each colour scale in use, and nothing when off', () => {
    const colours = new MarkerColours();
    const { rerender } = render(<HeatLegend colours={colours} />);
    expect(screen.getByText('No current reading to colour by.')).toBeTruthy();
    colours.record('a', scale as Encoding, '#f00');
    rerender(<HeatLegend colours={colours} />);
    expect(screen.getByText('18')).toBeTruthy();
    expect(screen.getByText('1 sensors, heat 18 to 30')).toBeTruthy();
    colours.cycle();
    rerender(<HeatLegend colours={colours} />);
    expect(screen.queryByText('18')).toBeNull();
  });

  it('lights a class from its row', () => {
    const onPick = jest.fn();
    const classes = [{ ifcClass: 'IfcWall', colour: '#aaa', count: 2 }];
    render(
      <ClassLegend classes={classes} highlighted={null} onPick={onPick} />,
    );
    fireEvent.click(screen.getByText('Wall'));
    expect(onPick).toHaveBeenCalledWith('IfcWall');
  });

  it('lists every key in the help', () => {
    render(<HelpPanel open onClose={jest.fn()} />);
    const help = screen.getByRole('dialog');
    OPTIONS.forEach((o) =>
      expect(within(help).getAllByText(o.label)[0]).toBeTruthy(),
    );
  });
});

describe('the overlay of the aec substrate', () => {
  it('puts the toolbar above the canvas and the panels below it', async () => {
    const [above, below] = [
      document.createElement('div'),
      document.createElement('div'),
    ];
    document.body.append(above, below);
    const counter = changes();
    const model = {
      ...counter,
      context: contextWith(),
      storeys: [],
      ui: { helpOpen: false, missing: ['Lost sensor'] },
      picked: () => null,
      classes: () => [],
      showFloor: jest.fn(),
      pickClass: jest.fn(),
      closeHelp: jest.fn(),
    };
    let unmount = () => undefined as void;
    act(() => {
      unmount = mountOverlay(above, below, model);
    });
    expect(within(above).getByRole('button', { name: 'Heatmap' })).toBeTruthy();
    expect(within(below).getByText(/Lost sensor/)).toBeTruthy();
    await act(async () => {
      unmount();
      await Promise.resolve();
    });
    expect(above).toBeEmptyDOMElement();
  });

  it('draws the overlay inside the theme the host gives', async () => {
    const above = document.createElement('div');
    const below = document.createElement('div');
    document.body.append(above, below);
    const model = {
      ...changes(),
      context: contextWith(),
      storeys: [],
      ui: { helpOpen: false, missing: [] },
      picked: () => null,
      classes: () => [],
      showFloor: jest.fn(),
      pickClass: jest.fn(),
      closeHelp: jest.fn(),
    };
    const Theme = ({ children }: { readonly children: ReactNode }) => (
      <section aria-label="Host theme">{children}</section>
    );
    let unmount = () => undefined as void;
    act(() => {
      unmount = mountOverlay(above, below, model, Theme);
    });
    const themed = within(above).getByRole('region', { name: 'Host theme' });
    expect(
      within(themed).getByRole('button', { name: 'Heatmap' }),
    ).toBeTruthy();
    await act(async () => {
      unmount();
      await Promise.resolve();
    });
  });
});
