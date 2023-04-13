import { useEffect } from 'react';

export const callOncePerRender = (callback: () => void) => {
  useEffect(() => {
    callback();
  }, []);
};

export const logoutClearLocalStorage = (): void => {
  if (localStorage.getItem('expiresIn')) {
    localStorage.removeItem('expiresIn');
  }
  if (localStorage.getItem('refreshToken')) {
    localStorage.removeItem('refreshToken');
  }
  if (localStorage.getItem('accessToken')) {
    localStorage.removeItem('accessToken');
  }
};