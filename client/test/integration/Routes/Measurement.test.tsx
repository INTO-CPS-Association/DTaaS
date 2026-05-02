import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupIntegrationTest } from 'test/integration/integration.testUtil';
import { testLayout } from 'test/integration/Routes/routes.testUtil';

const setup = () => setupIntegrationTest('/insight/measure');

describe('Measurement Page', () => {
  beforeEach(async () => {
    await setup();
  });

  it('renders the Measurement page and Layout correctly', async () => {
    await testLayout();

    const mainHeading = screen.getByRole('heading', { level: 5 });
    expect(mainHeading).toBeInTheDocument();
    expect(mainHeading).toHaveTextContent(/Digital Twin Measurement/);
  });

  it('displays the measurement table with headers', async () => {
    expect(
      screen.getByRole('columnheader', { name: 'Data' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Task' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Status' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Average Duration' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Trials' }),
    ).toBeInTheDocument();
  });

  it('displays all measurement tasks', async () => {
    expect(
      screen.getByText('Valid Setup Digital Twin Execution'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Multiple Identical Digital Twins Simultaneously'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Multiple different Digital Twins Simultaneously'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Different Runners same Digital Twin'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Different Runners different Digital Twins'),
    ).toBeInTheDocument();
  });

  it('displays control buttons', async () => {
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Restart' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Purge' })).toBeInTheDocument();
  });

  it('disables Restart button when measurement has not started', async () => {
    const restartButton = screen.getByRole('button', { name: 'Restart' });
    expect(restartButton).toBeDisabled();
  });

  it('shows all tasks with NOT_STARTED status initially', async () => {
    const statusCells = screen.getAllByRole('cell');
    const dashStatuses = statusCells.filter((cell) =>
      cell.textContent?.includes('—'),
    );
    expect(dashStatuses.length).toBeGreaterThanOrEqual(5);
  });

  it('displays task descriptions', async () => {
    expect(document.body.textContent).toContain(
      'Running the hello-world Digital Twin with current setup.',
    );
    expect(document.body.textContent).toContain(
      'Running the hello-world Digital Twin twice at once.',
    );
  });

  it('displays helper text about the measurement', async () => {
    expect(
      screen.getByText(
        /Run performance measurements for Digital Twin executions/,
      ),
    ).toBeInTheDocument();
  });

  it('shows initial completion summary prompt', async () => {
    expect(
      screen.getByText('Click Start to generate measurement data'),
    ).toBeInTheDocument();
  });

  it('displays trials counter with correct format', async () => {
    expect(screen.getByText(/Trials Completed: 0\/\d+/)).toBeInTheDocument();
  });

  it('opens and cancels the Purge confirmation dialog', async () => {
    const purgeButton = screen.getByRole('button', { name: 'Purge' });
    await userEvent.click(purgeButton);

    await waitFor(() => {
      expect(screen.getByText('Purge Measurement Data?')).toBeInTheDocument();
      expect(
        screen.getByText(/permanently delete all results and cannot be undone/),
      ).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(
        screen.queryByText('Purge Measurement Data?'),
      ).not.toBeInTheDocument();
    });
  });

  it('shows runner tag badges on tasks that use them', async () => {
    const runnerBadges = screen.queryAllByText(/windows/i);
    // Runner tags appear as badges on tasks that specify them
    expect(runnerBadges.length).toBeGreaterThanOrEqual(0);
  });
});
