import '@testing-library/jest-dom';
import { lazy, type ReactNode } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  useHost,
  type DigitalTwinTabProps,
  type DtaasExtension,
} from '@into-cps-association/dtaas-sdk';

// Hoisted by ts-jest above the imports, so the page loads the real tabs.
jest.unmock('components/tab/TabComponent');
jest.mock('page/Layout', () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

const PidPage = lazy(async () => ({
  default: function Pid({ dt }: DigitalTwinTabProps) {
    const host = useHost();
    return (
      <p>
        P&amp;ID of {dt.name} with {dt.files.join(', ')} in{' '}
        {host.library.conventions.modelsDirectory}
      </p>
    );
  },
}));

const mockPump: DtaasExtension = {
  id: 'pump',
  name: 'Pump kit',
  version: '0.1.0',
  sdk: 1,
  digitalTwinTabs: [
    {
      id: 'pid',
      label: 'P&ID',
      applies: (dt) => dt.files.some((file) => file.endsWith('.inp')),
      element: PidPage,
    },
  ],
};

jest.mock('extension/extensionHost', () => {
  const { fakeHostServices } = jest.requireActual(
    '@into-cps-association/dtaas-sdk/testing',
  );
  const services = fakeHostServices({
    extensionId: 'pump',
    files: {
      'digital_twins/pump1/network.inp': '[JUNCTIONS]',
      'digital_twins/office/readme.md': '# Office',
    },
  });
  return {
    __esModule: true,
    sharedServices: services,
    hostFor: () => services,
    get default() {
      return {
        routes: [],
        navigation: [],
        assetPreviews: [],
        digitalTwinTabs: [
          { extension: mockPump, tab: mockPump.digitalTwinTabs?.[0] },
        ],
      };
    },
  };
});

async function openTab(twin: string) {
  // Imported here, after the mock above has its extension.
  const { default: DigitalTwins } =
    await import('route/digitaltwins/DigitalTwins');
  render(<DigitalTwins />);
  await userEvent.click(screen.getByRole('tab', { name: 'P&ID' }));
  await userEvent.click(screen.getByRole('combobox'));
  await userEvent.click(
    within(screen.getByRole('listbox')).getByRole('option', { name: twin }),
  );
}

describe('a tab an extension adds to the Digital Twins page', () => {
  it('appears after the core tabs and shows the chosen twin', async () => {
    await openTab('pump1');

    expect(
      await screen.findByText(
        'P&ID of pump1 with network.inp in common/models',
      ),
    ).toBeInTheDocument();
  });

  it('says so when it has nothing to show for a twin', async () => {
    await openTab('office');

    expect(
      await screen.findByText(
        'P&ID has nothing to show for this digital twin.',
      ),
    ).toBeInTheDocument();
  });
});
