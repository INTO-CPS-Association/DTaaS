import '@testing-library/jest-dom';
import { lazy, type ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type {
  AssetPreviewProps,
  DtaasExtension,
} from '@into-cps-association/dtaas-sdk';
import AssetPreviewPage, { previewFor } from 'extension/AssetPreviewPage';

jest.mock('page/Layout', () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

const InpPreview = lazy(async () => ({
  default: ({ url, name }: AssetPreviewProps) => (
    <p>
      Network {name} from {url}
    </p>
  ),
}));

const mockPreview = { id: 'inp', extensions: ['.INP'], element: InpPreview };
const mockPump = { id: 'pump' } as DtaasExtension;

jest.mock('extension/extensionHost', () => {
  const { fakeHostServices } = jest.requireActual(
    '@into-cps-association/dtaas-sdk/testing',
  );
  const services = fakeHostServices({ baseUrl: 'https://lib.example' });
  return {
    __esModule: true,
    sharedServices: services,
    hostFor: () => services,
    get default() {
      return { assetPreviews: [{ extension: mockPump, preview: mockPreview }] };
    },
  };
});

const renderAt = (address: string) =>
  render(
    <MemoryRouter initialEntries={[address]}>
      <AssetPreviewPage />
    </MemoryRouter>,
  );

describe('the preview of a library file', () => {
  it('finds the previewer by the suffix of the file, in any case', () => {
    const mounted = [{ extension: mockPump, preview: mockPreview }];

    expect(previewFor(mounted, 'common/net.inp')).toBe(mounted[0]);
    expect(previewFor(mounted, 'common/readme')).toBeUndefined();
  });

  it('shows the file with the extension that previews its type', async () => {
    renderAt('/library/preview?file=common/models/net.inp');

    expect(
      await screen.findByText(
        'Network net.inp from https://lib.example/common/models/net.inp',
      ),
    ).toBeInTheDocument();
  });

  it('says when no extension previews the file', () => {
    renderAt('/library/preview?file=common/notes.txt');

    expect(
      screen.getByText('No extension previews common/notes.txt.'),
    ).toBeInTheDocument();
  });
});
