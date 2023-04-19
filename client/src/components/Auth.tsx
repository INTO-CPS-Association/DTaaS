import { useState } from 'react';

export default function useFakeAuth() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  const logIn = () => {
    setIsLoggedIn(true);
  };

  const logOut = () => {
    setIsLoggedIn(false);
  };

  return { isLoggedIn, logIn, logOut };
}
