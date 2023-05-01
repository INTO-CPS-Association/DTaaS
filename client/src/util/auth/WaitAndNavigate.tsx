import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as React from 'react';

export function wait(milliseconds: number): Promise<void> {
  return new Promise<void>((resolve) => {
    const onTimeout = () => {
      resolve();
    };
    setTimeout(onTimeout, milliseconds);
  });
}

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
