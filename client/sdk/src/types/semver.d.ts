// The three functions of `semver` this package calls, typed here so that the
// package needs no `@types/semver`. Each module exports one function.
declare module 'semver/functions/satisfies.js' {
  export default function satisfies(version: string, range: string): boolean;
}

declare module 'semver/functions/valid.js' {
  export default function valid(version: string): string | null;
}

declare module 'semver/ranges/valid.js' {
  export default function validRange(range: string): string | null;
}
