import React from 'react';

interface IFrameProps {
  url: string;
  fullsize?: boolean;
  title: string;
}

function Iframe({ url, fullsize, title }: IFrameProps) {
  // Be aware sandbox is not supported by current JupyterLight implementation.
  return (
    <iframe
      title={title}
      src={url}
      width="100%"
      referrerPolicy="no-referrer"
      style={fullsize ? { flexGrow: 1 } : { height: '100%' }}
    ></iframe>
  );
}

export default Iframe;
