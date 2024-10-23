import { render, screen } from '@testing-library/react';
import DetailsDialog from 'preview/route/digitaltwins/manage/DetailsDialog';
import * as React from 'react';
import { useSelector } from 'react-redux';

describe('DetailsDialog', () => {
  const setShowDialog = jest.fn();

  beforeEach(() => {
    (useSelector as jest.Mock).mockImplementation(() => ({
      fullDescription: 'fullDescription',
    }));
  });

  it('renders DetailsDialog', () => {
    render(
      <DetailsDialog
        showDialog={true}
        setShowDialog={setShowDialog}
        name="name"
      />,
    );

    expect(screen.getByText('fullDescription')).toBeInTheDocument();
  });

  it('closes the dialog when the "Close" button is clicked', () => {
    render(
      <DetailsDialog
        showDialog={true}
        setShowDialog={setShowDialog}
        name="name"
      />,
    );

    screen.getByText('Close').click();

    expect(setShowDialog).toHaveBeenCalledWith(false);
  });
});
