export {};

declare global {
  var env:
    | {
        REACT_APP_AUTH_AUTHORITY?: string;
      }
    | undefined;
}
