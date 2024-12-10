import { render, screen } from '@testing-library/react';
import DetailsDialog from 'preview/route/digitaltwins/manage/DetailsDialog';
import * as React from 'react';
import { useSelector } from 'react-redux';

describe('DetailsDialog', () => {
  const setShowDialog = jest.fn();

  beforeEach(() => {
    (useSelector as jest.MockedFunction<typeof useSelector>).mockImplementation(
      () => ({
        fullDescription: 'fullDescription',
      }),
    );
  });

  it('renders DetailsDialog', () => {
    render(
      <DetailsDialog
        showDialog={true}
        setShowDialog={setShowDialog}
        name="name"
        isPrivate={true}
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
        isPrivate={true}
      />,
    );

    screen.getByText('Close').click();

    expect(setShowDialog).toHaveBeenCalledWith(false);
  });
});
