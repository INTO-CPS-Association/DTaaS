import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import MeasurementPageHeader from 'route/measurement/MeasurementPageHeader';

describe('MeasurementPageHeader', () => {
  it('expands the description when the toggle button is clicked', () => {
    const { container } = render(<MeasurementPageHeader />);

    expect(container.querySelector('.MuiCollapse-hidden')).not.toBeNull();

    fireEvent.click(screen.getByLabelText('Toggle measurement description'));

    expect(container.querySelector('.MuiCollapse-hidden')).toBeNull();
    expect(container.textContent).toContain(
      'Run performance measurements for Digital Twin executions',
    );
  });
});
