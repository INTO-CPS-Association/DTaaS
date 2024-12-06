import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PrivacySelector from '../../../../../../src/preview/route/digitaltwins/create/PrivacySelector';

describe('PrivacySelector', () => {
  it('should render "Private" when isPrivate is true', () => {
    render(<PrivacySelector isPrivate={true} onChange={jest.fn()} />);
    expect(screen.getByLabelText('Private')).toBeInTheDocument();
  });

  it('should render "Common" when isPrivate is false', () => {
    render(<PrivacySelector isPrivate={false} onChange={jest.fn()} />);
    expect(screen.getByLabelText('Common')).toBeInTheDocument();
  });

  it('should call onChange when the switch is toggled', () => {
    const handleChange = jest.fn();
    render(<PrivacySelector isPrivate={true} onChange={handleChange} />);
    const switchElement = screen.getByRole('checkbox');
    fireEvent.click(switchElement);
    expect(handleChange).toHaveBeenCalledTimes(1);
  });
});
