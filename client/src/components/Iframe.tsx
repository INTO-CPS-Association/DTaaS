import IframeReact from 'react-iframe';

interface IFrameProps {
  url: string;
  title: string;
}

function Iframe({ url, title }: IFrameProps) {
  // Be aware sandbox is not supported by current JupyterLight implementation.
  return (
    <IframeReact
      title={title}
      url={url}
      width="100%"
      styles={{ flexGrow: '1', minHeight: '25rem' }}
    />
  );
}

export default Iframe;
