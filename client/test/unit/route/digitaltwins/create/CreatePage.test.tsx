import { act, fireEvent, render, screen } from '@testing-library/react';
import { useSelector } from 'react-redux';
import CreatePage from 'route/digitaltwins/create/CreatePage';
import { FileType } from 'model/backend/interfaces/sharedInterfaces';

jest.mock('route/digitaltwins/editor/Editor', () => ({
  __esModule: true,
  default: () => <div data-testid="editor" />,
}));

jest.mock('route/digitaltwins/create/CreateDialogs', () => ({
  __esModule: true,
  default: () => <div data-testid="create-dialogs" />,
}));

jest.mock('components/route/Snackbar', () => ({
  __esModule: true,
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

describe('CreatePage asset log context', () => {
  it('includes the names of new asset files in the action button log context', () => {
    (useSelector as unknown as jest.Mock).mockReturnValue([
      {
        name: 'model-description.md',
        content: '',
        isNew: true,
        isModified: false,
        type: FileType.DESCRIPTION,
      },
      {
        name: 'existing.md',
        content: '',
        isNew: false,
        isModified: false,
        type: FileType.DESCRIPTION,
      },
    ]);

    render(
      <CreatePage
        newDigitalTwinName={'DTName'}
        setNewDigitalTwinName={jest.fn()}
      />,
    );

    const cancelButton = screen.getByText('Cancel');
    const context = JSON.parse(
      cancelButton.getAttribute('data-logger-context') ?? '{}',
    );

    expect(context).toEqual({
      dt: {
        name: 'DTName',
        button: 'cancel',
        assets: {
          description: ['model-description.md'],
          configuration: [],
          lifecycle: [],
        },
      },
    });
  });
});
