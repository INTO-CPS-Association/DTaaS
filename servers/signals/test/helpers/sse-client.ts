/** A stream opened with fetch, read until its text holds what a test waits for. */
export type OpenStream = {
  status: number;
  readUntil: (needle: string, timeoutMs?: number) => Promise<string>;
  close: () => void;
};

export async function openStream(
  url: string,
  token: string,
  paths: string[],
): Promise<OpenStream> {
  const controller = new AbortController();
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ paths }),
    signal: controller.signal,
  });
  return {
    status: response.status,
    readUntil: textReader(response),
    close: () => controller.abort(),
  };
}

function textReader(response: Response) {
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let text = '';
  // Reads chunk after chunk by recursion, since each read waits for the last.
  return (needle: string, timeoutMs = 3000): Promise<string> => {
    const deadline = Date.now() + timeoutMs;
    const readMore = async (): Promise<string> => {
      if (text.includes(needle)) return text;
      if (reader === undefined || Date.now() > deadline)
        throw new Error(`No ${needle} in ${text}`);
      const { value, done } = await reader.read();
      if (done) throw new Error(`Stream ended without ${needle}: ${text}`);
      text += decoder.decode(value, { stream: true });
      return readMore();
    };
    return readMore();
  };
}

export function waitFor(check: () => boolean, timeoutMs = 3000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  const poll = async (): Promise<void> => {
    if (check()) return;
    if (Date.now() > deadline) throw new Error('Timed out waiting');
    await new Promise((resolve) => setTimeout(resolve, 10));
    return poll();
  };
  return poll();
}
