import React from 'react';

interface IFrameProps {
  url: string;
}

function Iframe({ url }: IFrameProps) {
  // Make iframe responsive. Grow to fit the parent container.
  // Parent container max height is to fill screen .
  return <iframe src={url} width="100%" height="100%"></iframe>;
}

export default Iframe;
