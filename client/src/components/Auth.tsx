import { useState } from 'react';

export default function useFakeAuth() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(
    localStorage.getItem('isLoggedIn') === 'true'
  );

  const logIn = () => {
    localStorage.setItem('isLoggedIn', 'true');
    setIsLoggedIn(true);
  };

  const logOut = () => {
    localStorage.removeItem('isLoggedIn');
    setIsLoggedIn(false);
  };

  return { isLoggedIn, logIn, logOut };
}
