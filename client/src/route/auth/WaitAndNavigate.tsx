import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as React from 'react';
import { wait } from '../../util/auth/Authentication';

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
      window.location.reload();
    }
  }, [shouldNavigate, navigate]);

  return <div>Waiting for 5 seconds...</div>;
};

export default WaitNavigateAndReload;
