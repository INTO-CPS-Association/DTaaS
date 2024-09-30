import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import LogDialog from 'preview/route/digitaltwins/execute/LogDialog';
import { Provider, useSelector } from 'react-redux';
import store from 'store/store';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

describe('LogDialog', () => {
  const name = 'testName';
  const setShowLog = jest.fn();

  const renderLogDialog = () => {
    return render(
      <Provider store={store}>
        <LogDialog name={name} showLog={true} setShowLog={setShowLog} />,
      </Provider>,
    );
  }

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the LogDialog with logs available', () => {
    (useSelector as jest.Mock).mockReturnValue({
      jobLogs: [{ jobName: 'job', log: 'testLog' }],
    });

    renderLogDialog();

    expect(screen.getByText(/TestName log/i)).toBeInTheDocument();
    expect(screen.getByText(/job/i)).toBeInTheDocument();
    expect(screen.getByText(/testLog/i)).toBeInTheDocument();
  });

  it('renders the LogDialog with no logs available', () => {
    (useSelector as jest.Mock).mockReturnValue({
      jobLogs: [],
    });

    renderLogDialog();

    expect(screen.getByText(/No logs available/i)).toBeInTheDocument();
  });

  it('handles button click', async () => {
    (useSelector as jest.Mock).mockReturnValue({
      jobLogs: [{ jobName: 'create', log: 'create log' }],
    });

    renderLogDialog();

    const closeButton = screen.getByRole('button', { name: /Close/i });
    fireEvent.click(closeButton);

    expect(setShowLog).toHaveBeenCalled();
  });
});
