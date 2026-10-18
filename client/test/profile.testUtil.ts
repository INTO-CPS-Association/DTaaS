/**
 * Runs every test of the enclosing `describe` with `REACT_APP_PROFILE` set
 * to `profile`, and puts the previous value back after each one, so a
 * profile never leaks into the next suite.
 */
export default function runWithProfile(profile: string): void {
  const original = globalThis.env.REACT_APP_PROFILE;

  beforeEach(() => {
    globalThis.env.REACT_APP_PROFILE = profile;
  });

  afterEach(() => {
    globalThis.env.REACT_APP_PROFILE = original;
  });
}
