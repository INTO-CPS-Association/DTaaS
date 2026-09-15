import { useEffect } from 'react';
import IframeReact from 'react-iframe';
import { log } from 'util/logger/logger';
import { grey, radius, white } from 'theme/tokens';

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

/**
 * An embedded workspace page: the file browser on the library page, and the
 * digital twins preview.
 *
 * The minimum height used to be 25rem, which left a file browser about ten
 * rows tall on a laptop with the rest of the window empty below it. It is a
 * share of the viewport now, so the embedded page gets the space the window
 * actually has, and it keeps a floor for a short window.
 */
function Iframe({ url, title }: IFrameProps) {
  useIframeFocusLogger(title);
  // Be aware sandbox is not supported by current JupyterLight implementation.
  return (
    <IframeReact
      title={title}
      url={url}
      width="100%"
      styles={{
        flexGrow: '1',
        minHeight: 'max(25rem, 62vh)',
        border: `1px solid ${grey[200]}`,
        borderRadius: `${radius}px`,
        // Without this the iframe's own white corners sit over the radius.
        overflow: 'hidden',
        backgroundColor: white,
      }}
    />
  );
}

export default Iframe;
