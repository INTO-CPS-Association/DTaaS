/** Text or bytes as bytes; the fakes store everything as `Uint8Array`. */
const toBytes = (content: Uint8Array | string): Uint8Array =>
  typeof content === 'string' ? new TextEncoder().encode(content) : content;

export default toBytes;
