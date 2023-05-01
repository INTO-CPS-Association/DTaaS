import { User } from "oidc-client-ts";

export function generateNonce() {
    const randomBytes = crypto.getRandomValues(new Uint8Array(32));
    return Array.from(randomBytes)
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
}

export function generateCodeVerifier() {
  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  const codeVerifier = Array.from(randomBytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  sessionStorage.setItem("codeVerifier", codeVerifier);
  return codeVerifier;
}

export function getCodeVerifier() {
  return sessionStorage.getItem("codeVerifier");
}
  
export async function generateCodeChallenge(verifier: string) {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest("SHA-256", data);
  
    const base64UrlEncoded = btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace("+", "-")
      .replace("/", "_")
      .replace(/=+$/, "");
  
    return base64UrlEncoded;
}

export interface CustomAuthContext {
  signoutRedirect: () => Promise<void>;
  user?: User | null | undefined;
}

export async function signOut(auth: CustomAuthContext) {
  localStorage.clear();
  await auth.signoutRedirect();
}

export function wait(milliseconds: number): Promise<void> {
  return new Promise<void>((resolve) => {
    const onTimeout = () => {
      resolve();
    };
    setTimeout(onTimeout, milliseconds);
  });
}

