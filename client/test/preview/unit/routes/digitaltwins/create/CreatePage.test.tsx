import { act, fireEvent, render, screen } from '@testing-library/react';
import CreatePage from 'preview/route/digitaltwins/create/CreatePage';

jest.mock('preview/route/digitaltwins/editor/Editor', () => ({
  _esModule: true,
  default: () => <div data-testid="editor" />,
}));

jest.mock('preview/route/digitaltwins/create/CreateDialogs', () => ({
  _esModule: true,
  default: () => <div data-testid="create-dialogs" />,
}));

jest.mock('components/route/Snackbar', () => ({
  _esModule: true,
  default: () => <div data-testid="snackbar" />,
}));

describe('CreatePage', () => {
  const setNewDigitalTwinName = jest.fn();
  beforeEach(() => {
    render(
      <CreatePage
        newDigitalTwinName={'DTName'}
        setNewDigitalTwinName={setNewDigitalTwinName}
      />,
    );
  });

  it('renders the CreatePage component', () => {
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByTestId('editor')).toBeInTheDocument();
    expect(screen.getByTestId('create-dialogs')).toBeInTheDocument();
  });

  it('handles confirm cancel', () => {
    const cancelButton = screen.getByText('Cancel');
    expect(cancelButton).toBeInTheDocument();
    act(() => {
      fireEvent.click(cancelButton);
    });
  });

  it('handles confirm save', () => {
    const saveButton = screen.getByText('Save');
    expect(saveButton).toBeInTheDocument();
    act(() => {
      fireEvent.click(saveButton);
    });
  });

  it('renders the input with the correct label and value', () => {
    const inputElement = screen.getByLabelText(/Digital twin name/i);
    expect(inputElement).toBeInTheDocument();
    expect(inputElement).toHaveValue('DTName');
  });

  it('calls setNewDigitalTwinName on input change', () => {
    const inputElement = screen.getByLabelText(/Digital twin name/i);
    fireEvent.change(inputElement, { target: { value: 'UpdatedDTName' } });

    expect(setNewDigitalTwinName).toHaveBeenCalledWith('UpdatedDTName');
  });
});
