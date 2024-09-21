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

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the LogDialog with logs available', () => {
    // Caso in cui ci sono log disponibili
    (useSelector as jest.Mock).mockReturnValue({
      jobLogs: [{ jobName: 'job', log: 'testLog' }],
    });

    render(
      <Provider store={store}>
        <LogDialog name={name} showLog={true} setShowLog={setShowLog} />,
      </Provider>,
    );

    expect(screen.getByText(/TestName log/i)).toBeInTheDocument(); // Controlla se il log è visualizzato
    expect(screen.getByText(/job/i)).toBeInTheDocument(); // Controlla se il nome del job è visualizzato
    expect(screen.getByText(/testLog/i)).toBeInTheDocument(); // Controlla se il nome del job è visualizzato
  });

  it('renders the LogDialog with no logs available', () => {
    // Caso in cui non ci sono log disponibili
    (useSelector as jest.Mock).mockReturnValue({
      jobLogs: [],
    });

    render(
      <Provider store={store}>
        <LogDialog name={name} showLog={true} setShowLog={setShowLog} />,
      </Provider>,
    );

    expect(screen.getByText(/No logs available/i)).toBeInTheDocument(); // Verifica che venga mostrato il messaggio "No logs available"
  });

  it('handles button click', async () => {
    (useSelector as jest.Mock).mockReturnValue({
      jobLogs: [{ jobName: 'create', log: 'create log' }],
    });

    render(
      <Provider store={store}>
        <LogDialog name={name} showLog={true} setShowLog={setShowLog} />,
      </Provider>,
    );

    const closeButton = screen.getByRole('button', { name: /Close/i });
    fireEvent.click(closeButton);

    expect(setShowLog).toHaveBeenCalled(); // Verifica che la funzione setShowLog sia chiamata
  });
});
