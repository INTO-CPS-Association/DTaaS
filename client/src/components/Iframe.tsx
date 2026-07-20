import { useEffect } from 'react';
import IframeReact from 'react-iframe';
import { log } from 'util/logger/logger';

interface IFrameProps {
  readonly url: string;
  readonly title: string;
}

// Clicks inside an iframe never reach the parent document, so the DOM
// logger cannot see them. Clicking into an iframe moves focus to it and
// blurs the parent window; log that transition once per entry.
function isFocusedIframe(active: Element | null, title: string): boolean {
  return (
    document.visibilityState === 'visible' &&
    document.hasFocus() &&
    active instanceof HTMLIFrameElement &&
    active.title === title
  );
}

function isTargetIframeFocused(
  active: Element | null,
  title: string,
  focusLogged: boolean,
): boolean {
  return !focusLogged && isFocusedIframe(active, title);
}

function registerIframeFocusLogger(title: string): () => void {
  let focusLogged = false;
  const pendingChecks = new Set<ReturnType<typeof globalThis.setTimeout>>();
  const logFocusedIframe = () => {
    if (isTargetIframeFocused(document.activeElement, title, focusLogged)) {
      focusLogged = true;
      log({
        event: 'click',
        page: globalThis.location.pathname,
        element: 'iframe',
        label: title,
      });
    }
  };
  const handleWindowBlur = () => {
    const timer = globalThis.setTimeout(() => {
      pendingChecks.delete(timer);
      logFocusedIframe();
    }, 0);
    pendingChecks.add(timer);
  };
  // A click on the parent page means focus left the iframe; the next
  // focus into it is a new interaction.
  const handleParentClick = () => {
    focusLogged = false;
  };
  globalThis.addEventListener('blur', handleWindowBlur);
  document.addEventListener('click', handleParentClick, true);
  return () => {
    globalThis.removeEventListener('blur', handleWindowBlur);
    document.removeEventListener('click', handleParentClick, true);
    pendingChecks.forEach((timer) => globalThis.clearTimeout(timer));
    pendingChecks.clear();
  };
}

function useIframeFocusLogger(title: string): void {
  useEffect(() => registerIframeFocusLogger(title), [title]);
}

function Iframe({ url, title }: IFrameProps) {
  useIframeFocusLogger(title);
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
