import type { ComponentType, ReactNode } from 'react';

export interface User {
  readonly username: string;
}

export interface AuthService {
  user(): Promise<User>;
  /** React hook; `null` until the session is known. */
  useUser(): User | null;
}

export interface LibraryConventions {
  readonly modelsDirectory: string;
  readonly digitalTwinsDirectory: string;
  readonly visualisationsDirectory: string;
}

export interface LibraryService {
  baseUrl(): Promise<string>;
  /** React hook; `null` until the library URL is known. */
  useBaseUrl(): string | null;
  readonly conventions: LibraryConventions;
  /** Resolve `lib://` and `ws://` (workspace) URLs to fetchable URLs. */
  resolve(url: string): Promise<string>;
}

export type SnackbarSeverity = 'success' | 'info' | 'warning' | 'error';

export interface PageProps {
  readonly title: string;
  readonly description?: string;
  readonly children: ReactNode;
}

export interface UiService {
  snackbar(message: string, severity: SnackbarSeverity): void;
  /** The host's page shell, so kit pages match the rest of the client. */
  readonly Page: ComponentType<PageProps>;
}

export interface Logger {
  debug(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
}

export interface SettingsService {
  get<T>(key: string): T | undefined;
}
