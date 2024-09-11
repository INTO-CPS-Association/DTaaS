import * as React from 'react';
import DigitalTwinsPreview, {
  fetchSubfolders,
} from 'route/digitaltwins/DigitalTwinsPreview';
import tabs from 'route/digitaltwins/DigitalTwinTabData';
import {
  InitRouteTests,
  itDisplaysContentOfExecuteTab,
  itHasCorrectExecuteTabNameInDTIframe,
} from 'test/unit/unit.testUtil';
import store from 'store/store';
import { Provider, useDispatch } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { GitlabInstance } from 'util/gitlab';
import { setAssets } from 'store/assets.slice';

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

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: jest.fn(),
}));

describe('Digital Twins Preview', () => {
  const tabLabels: string[] = [];
  tabs.forEach((tab) => tabLabels.push(tab.label));

  InitRouteTests(
    <Provider store={store}>
      <MemoryRouter>
        <DigitalTwinsPreview />
      </MemoryRouter>
    </Provider>,
  );

  itDisplaysContentOfExecuteTab(tabs);

  itHasCorrectExecuteTabNameInDTIframe(tabLabels);

  it('should call getDTSubfolders and dispatch setAssets', async () => {
    const mockGitlabInstance = new GitlabInstance(
      'username',
      'https://example.com',
      'access_token',
    );

    const mockDispatch = jest.fn();
    (useDispatch as jest.Mock).mockReturnValue(mockDispatch);

    jest.spyOn(mockGitlabInstance, 'init').mockResolvedValue(undefined);
    jest.spyOn(mockGitlabInstance, 'getDTSubfolders').mockResolvedValue([]);

    await fetchSubfolders(mockGitlabInstance, mockDispatch, jest.fn());

    expect(mockGitlabInstance.init).toHaveBeenCalled();
    expect(mockGitlabInstance.getDTSubfolders).toHaveBeenCalledWith(
      'mockedProjectId',
    );
    expect(mockDispatch).toHaveBeenCalledWith(setAssets([]));
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

    const mockDispatch = jest.fn();
    (useDispatch as jest.Mock).mockReturnValue(mockDispatch);

    await fetchSubfolders(mockGitlabInstance, mockDispatch, jest.fn());

    expect(mockGitlabInstance.init).toHaveBeenCalled();
    expect(mockGitlabInstance.getDTSubfolders).not.toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith(setAssets([]));
  });

  it('should handle errors correctly', async () => {
    const mockGitlabInstance = new GitlabInstance(
      'username',
      'https://example.com',
      'access_token',
    );

    jest
      .spyOn(mockGitlabInstance, 'init')
      .mockRejectedValue(new Error('Initialization failed'));

    const mockDispatch = jest.fn();
    (useDispatch as jest.Mock).mockReturnValue(mockDispatch);

    const setError = jest.fn();

    await fetchSubfolders(mockGitlabInstance, mockDispatch, setError);

    expect(mockGitlabInstance.init).toHaveBeenCalled();
    expect(mockGitlabInstance.getDTSubfolders).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(setError).toHaveBeenCalledWith('An error occurred');
  });
});
