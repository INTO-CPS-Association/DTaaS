// eslint-disable-next-line import/prefer-default-export
export async function hashUsername(username: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(username);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
