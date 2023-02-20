import React from 'react';

interface IFrameProps {
  data?: {
    label: string;
  };
  url: string;
}

function Iframe({ data, url }: IFrameProps) {
  return (
    <>
      <iframe src={url} width="100%" height="500px"></iframe>
      {
        // Display the selected tab title. Will be used for the URL in iframe.
        <h1 style={{ textAlign: 'center' }}>{data?.label}</h1>
      }
    </>
  );
}

export default Iframe;
