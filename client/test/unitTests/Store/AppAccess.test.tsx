import { act, renderHook } from '@testing-library/react';
import useApp from 'store/AppAccess';
import { wrapWithInitialState } from '../testUtils';

describe('AppAccess', () => {
  const defaultRender = wrapWithInitialState();

  it('menu should be closed initially', () => {
    const { result } = renderHook(() => useApp(), { wrapper: defaultRender });

    expect(result.current.state.isOpen).toBeFalsy();
  });

  it('menu should open correctly', () => {
    const { result } = renderHook(() => useApp(), { wrapper: defaultRender });

    act(() => {
      result.current.actions.open();
    });

    expect(result.current.state.isOpen).toBeTruthy();
  });

  it('menu should close correctly', () => {
    const initialState = wrapWithInitialState({
      menu: {
        isOpen: true,
      },
    });
    const { result } = renderHook(() => useApp(), { wrapper: initialState });

    act(() => {
      result.current.actions.close();
    });

    expect(result.current.state.isOpen).toBeFalsy();
  });
});
