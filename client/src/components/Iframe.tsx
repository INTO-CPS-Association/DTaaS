import React from 'react';

interface IFrameProps {
  data?: {
    label: string;
  };
  url: string;
}

function Iframe({ data, url }: IFrameProps) {
  // Make iframe responsive. Grow to fit the parent container.
  // Parent container max height is to fill screen .
  return (
    <>
      <iframe src={url} width="100%" height="100%"></iframe>
      {
        // Display the selected tab title. Will be used for the URL in iframe.
        <h1 style={{ textAlign: 'center' }}>{data?.label}</h1>
      }
    </>
  );
}

export default Iframe;
