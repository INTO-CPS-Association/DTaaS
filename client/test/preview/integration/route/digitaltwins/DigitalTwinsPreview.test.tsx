import * as React from 'react';
import DigitalTwinsPreview from 'preview/route/digitaltwins/DigitalTwinsPreview';
import store from 'store/store';
import { act, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
}));

jest.mock('react-oidc-context', () => ({
  ...jest.requireActual('react-oidc-context'),
  useAuth: jest.fn(),
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

    expect(
      screen.getByText('The Digital Twin as a Service'),
    ).toBeInTheDocument();
  });
  
  /*
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
    expect(setError).toHaveBeenCalledWith('An error occurred');
  });
  */
});
