import React from 'react';

interface IFrameProps {
  url: string;
  fullsize?: boolean;
  title: string;
}

function Iframe({ url, fullsize, title }: IFrameProps) {
  // Make iframe responsive. Grow to fit the parent container.
  // Parent container max height is to fill screen .
  return (
    <iframe
      title={title}
      src={url}
      width="100%"
      style={fullsize ? { flexGrow: 1 } : { height: '100%' }}
    ></iframe>
  );
}

export default Iframe;
