import menuReducer, { openMenu, closeMenu } from 'store/menu.slice';
import authReducer, { setUserName } from 'store/auth.slice';

describe('reducers', () => {
  let initialState: {
    menu: {
      isOpen: boolean;
    };
    auth: {
      userName: string | undefined;
    };
  };

  beforeEach(() => {
    initialState = {
      menu: {
        isOpen: false,
      },
      auth: {
        userName: undefined,
      },
    };
  });

  describe('menu reducer', () => {
    const itShouldHandleMenuActions = (
      actionCreator: () => { type: string },
      expectedValue: boolean
    ) => {
      const newState = menuReducer(initialState.menu, actionCreator());
      expect(newState.isOpen).toBe(expectedValue);
    };

    it('menuReducer should return the initial menu state when an unknown action type is passed with an undefined state', () => {
      expect(menuReducer(undefined, { type: 'unknown' })).toEqual(
        initialState.menu
      );
    });

    it('should handle openMenu', () => {
      itShouldHandleMenuActions(openMenu, true);
    });

    it('should handle closeMenu', () => {
      initialState.menu.isOpen = true;
      itShouldHandleMenuActions(closeMenu, false);
    });
  });

  describe('auth reducer', () => {
    it('authReducer should return the initial menu state when an unknown action type is passed with an undefined state', () => {
      expect(authReducer(undefined, { type: 'unknown' })).toEqual(
        initialState.auth
      );
    });

    it('should handle setUserName', () => {
      const newState = authReducer(initialState.auth, setUserName('user1'));
      expect(newState.userName).toBe('user1');
    });
  });
});
