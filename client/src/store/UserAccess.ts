import { useAppDispatch, useAppSelector } from './Redux/hooks';
import * as auth from './Redux/slices/auth.slice';

function useUserData() {
  const dispatch = useAppDispatch();
  const state = useAppSelector((store) => store.auth);
  const actions = {
    setUser: (name: string) => dispatch(auth.setUserName(name)),
  };
  return { state, actions };
}

export default useUserData;
