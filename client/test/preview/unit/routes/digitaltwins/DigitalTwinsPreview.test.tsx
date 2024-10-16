import * as React from 'react';
import DigitalTwinsPreview, * as functions from 'preview/route/digitaltwins/DigitalTwinsPreview';
import store from 'store/store';
import { act, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import {
  mockDigitalTwin,
  mockGitlabInstance,
} from 'test/preview/__mocks__/global_mocks';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
}));

jest.mock('react-oidc-context', () => ({
  ...jest.requireActual('react-oidc-context'),
  useAuth: jest.fn(),
}));

jest.mock('preview/util/gitlab', () => ({
  default: jest.fn().mockImplementation(() => mockGitlabInstance),
}));
jest.mock('preview/util/gitlabDigitalTwin', () => ({
  DigitalTwin: jest.fn().mockImplementation(() => mockDigitalTwin),
}));

describe('Digital Twins', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('displays content of tabs', async () => {
    await act(async () => {
      render(
        <Provider store={store}>
          <MemoryRouter>
            <DigitalTwinsPreview />
          </MemoryRouter>
        </Provider>,
      );
    });

    const tabComponent = screen.getByTestId('tab-component');
    expect(tabComponent).toBeInTheDocument();
  });

  it('fetches subfolders with project id', async () => {
    const gitlabInstance = mockGitlabInstance;
    const dispatch = jest.fn();
    const setError = jest.fn();

    const init = jest.spyOn(mockGitlabInstance, 'init');
    gitlabInstance.projectId = 1;
    const getDTSubfolders = jest.spyOn(mockGitlabInstance, 'getDTSubfolders');

    await functions.fetchSubfolders(gitlabInstance, dispatch, setError);

    expect(init).toHaveBeenCalled();
    expect(getDTSubfolders).toHaveBeenCalledWith(1);
    expect(dispatch).toHaveBeenCalled();
  });

  it('fetches subfolders without project id', async () => {
    const gitlabInstance = mockGitlabInstance;
    const dispatch = jest.fn();
    const setError = jest.fn();

    const init = jest.spyOn(mockGitlabInstance, 'init');
    gitlabInstance.projectId = null;
    const getDTSubfolders = jest.spyOn(mockGitlabInstance, 'getDTSubfolders');

    await functions.fetchSubfolders(gitlabInstance, dispatch, setError);

    expect(init).toHaveBeenCalled();
    expect(getDTSubfolders).not.toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalled();
  });

  it('fetches subfolders with error', async () => {
    const gitlabInstance = mockGitlabInstance;
    const dispatch = jest.fn();
    const setError = jest.fn();

    const init = jest.spyOn(mockGitlabInstance, 'init');
    gitlabInstance.projectId = 1;
    const getDTSubfolders = jest
      .spyOn(mockGitlabInstance, 'getDTSubfolders')
      .mockRejectedValue(new Error('error'));

    await functions.fetchSubfolders(gitlabInstance, dispatch, setError);

    expect(init).toHaveBeenCalled();
    expect(getDTSubfolders).toHaveBeenCalledWith(1);
    expect(dispatch).not.toHaveBeenCalled();
    expect(setError).toHaveBeenCalledWith('An error occurred. Error: error');
  });
});
