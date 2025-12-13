import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { wait } from 'util/auth/Authentication';

// Extracted for testability, can be mocked in tests
export const reloadPage = () => {
  globalThis.location.reload();
};

/* WaitNavigateAndReload was made in case of an auth.error to show the
error for 5 seconds and then redirect the user back to the Signin page */
const WaitNavigateAndReload = () => {
  const [shouldNavigate, setShouldNavigate] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const waitForFiveSecondsAndNavigate = async () => {
      await wait(5000);
      setShouldNavigate(true);
    };

    waitForFiveSecondsAndNavigate();
  }, []);

  useEffect(() => {
    if (shouldNavigate) {
      navigate('/', { replace: true });
      sessionStorage.clear();
      reloadPage();
    }
  }, [shouldNavigate, navigate]);

  return <div>Waiting for 5 seconds...</div>;
};

export default WaitNavigateAndReload;
