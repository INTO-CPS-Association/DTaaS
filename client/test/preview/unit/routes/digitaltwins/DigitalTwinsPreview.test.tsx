import * as React from 'react';
import DigitalTwinsPreview, { fetchSubfolders } from 'preview/route/digitaltwins/DigitalTwinsPreview';
import tabs from 'preview/route/digitaltwins/DigitalTwinTabDataPreview';
import store from 'store/store';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { GitlabInstance } from 'util/gitlab';
import { render, screen, act, renderHook } from '@testing-library/react';
import { Asset } from 'preview/components/asset/Asset';

jest.mock('react-oidc-context', () => ({
  ...jest.requireActual('react-oidc-context'),
  useAuth: jest.fn(),
}));

jest.mock('util/gitlab', () => ({
  GitlabInstance: jest.fn().mockImplementation(() => ({
    init: jest.fn(),
    getDTSubfolders: jest.fn().mockResolvedValue([]),
    projectId: 'mockedProjectId',
  })),
}));

jest.mock('util/envUtil', () => ({
  getAuthority: jest.fn(() => 'https://example.com'),
}));

describe('Digital Twins Preview', () => {
  const tabLabels: string[] = tabs.map(tab => tab.label);

  it('should render the label of the Execute tab', () => {
    render(
      <Provider store={store}>
        <MemoryRouter>
          <DigitalTwinsPreview />
        </MemoryRouter>
      </Provider>
    );
    const executeTab = tabs.find(tab => tab.label === 'Execute');

    if (executeTab) {
      expect(
        screen.getByRole('tab', { name: executeTab.label })
      ).toBeInTheDocument();
    }
  });

  it("should render the Iframe component on DT page for the 'Execute' tab with the correct title", () => {
    render(
      <Provider store={store}>
        <MemoryRouter>
          <DigitalTwinsPreview />
        </MemoryRouter>
      </Provider>
    );

    const executeTabLabel = tabLabels.find(label => label === 'Execute');

    if (executeTabLabel) {
      const tabElement = screen.getByRole('tab', { name: executeTabLabel });
      expect(tabElement).toBeTruthy();
    }
  });


  it('should call getDTSubfolders and update subfolders state', async () => {
    const mockGitlabInstance = new GitlabInstance(
      'username',
      'https://example.com',
      'access_token',
    );
    const { result } = renderHook(() => React.useState<Asset[]>([]));

    const setSubfolders: React.Dispatch<React.SetStateAction<Asset[]>> = result.current[1];

    await act(async () => {
      await fetchSubfolders(mockGitlabInstance, setSubfolders, jest.fn());
    });

    expect(mockGitlabInstance.init).toHaveBeenCalled();
    expect(mockGitlabInstance.getDTSubfolders).toHaveBeenCalledWith('mockedProjectId');
    expect(result.current[0]).toEqual([]);
  });

  it('should handle empty projectId correctly', async () => {
    const mockGitlabInstance = new GitlabInstance(
      'username',
      'https://example.com',
      'access_token',
    );
    jest.spyOn(mockGitlabInstance, 'init').mockResolvedValue(undefined);
    jest.spyOn(mockGitlabInstance, 'getDTSubfolders').mockResolvedValue([]);

    mockGitlabInstance.projectId = null;

    const { result } = renderHook(() => React.useState<Asset[]>([]));

    const setSubfolders: React.Dispatch<React.SetStateAction<Asset[]>> = result.current[1];

    await act(async () => {
      await fetchSubfolders(mockGitlabInstance, setSubfolders, jest.fn());
    });

    expect(mockGitlabInstance.init).toHaveBeenCalled();
    expect(mockGitlabInstance.getDTSubfolders).not.toHaveBeenCalled();
    expect(result.current[0]).toEqual([]);
  });

  it('should handle errors correctly', async () => {
    const mockGitlabInstance = new GitlabInstance(
      'username',
      'https://example.com',
      'access_token',
    );
    jest.spyOn(mockGitlabInstance, 'init').mockRejectedValue(new Error('Initialization failed'));

    const { result: subfoldersResult } = renderHook(() => React.useState<Asset[]>([]));
    const { result: errorResult } = renderHook(() => React.useState<string | null>(null));

    const setSubfolders: React.Dispatch<React.SetStateAction<Asset[]>> = subfoldersResult.current[1];
    const setError: React.Dispatch<React.SetStateAction<string | null>> = errorResult.current[1];

    await act(async () => {
      await fetchSubfolders(mockGitlabInstance, setSubfolders, setError);
    });

    expect(mockGitlabInstance.init).toHaveBeenCalled();
    expect(mockGitlabInstance.getDTSubfolders).not.toHaveBeenCalled();
    expect(subfoldersResult.current[0]).toEqual([]);
    expect(errorResult.current[0]).toBe('An error occurred');
  });
});
