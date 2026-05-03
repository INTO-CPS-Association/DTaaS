import snackbarSlice, {
  hideSnackbar,
  showSnackbar,
  SnackbarState,
} from 'store/snackbar.slice';

describe('snackbar reducer', () => {
  const initialSnackbarState: SnackbarState = {
    items: [],
    nextId: 0,
  };

  it('should handle showSnackbar', () => {
    const message = 'message';
    const severity = 'error';
    const newState = snackbarSlice(
      initialSnackbarState,
      showSnackbar({ message, severity }),
    );
    expect(newState.items).toHaveLength(1);
    expect(newState.items[0].message).toBe(message);
    expect(newState.items[0].severity).toBe(severity);
  });

  it('should handle hideSnackbar by id', () => {
    const stateWithItem: SnackbarState = {
      items: [{ id: 0, message: 'message', severity: 'error' }],
      nextId: 1,
    };
    const newState = snackbarSlice(stateWithItem, hideSnackbar(0));
    expect(newState.items).toHaveLength(0);
  });

  it('should stack up to 3 snackbars', () => {
    let state = initialSnackbarState;
    state = snackbarSlice(
      state,
      showSnackbar({ message: 'a', severity: 'info' }),
    );
    state = snackbarSlice(
      state,
      showSnackbar({ message: 'b', severity: 'info' }),
    );
    state = snackbarSlice(
      state,
      showSnackbar({ message: 'c', severity: 'info' }),
    );
    expect(state.items).toHaveLength(3);
  });

  it('should drop oldest when exceeding 3', () => {
    let state = initialSnackbarState;
    state = snackbarSlice(
      state,
      showSnackbar({ message: 'a', severity: 'info' }),
    );
    state = snackbarSlice(
      state,
      showSnackbar({ message: 'b', severity: 'info' }),
    );
    state = snackbarSlice(
      state,
      showSnackbar({ message: 'c', severity: 'info' }),
    );
    state = snackbarSlice(
      state,
      showSnackbar({ message: 'd', severity: 'info' }),
    );
    expect(state.items).toHaveLength(3);
    expect(state.items[0].message).toBe('b');
    expect(state.items[2].message).toBe('d');
  });
});
