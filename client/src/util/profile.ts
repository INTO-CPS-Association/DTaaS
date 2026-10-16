/**
 * Which pages the website offers, chosen in `env.js` by `REACT_APP_PROFILE`.
 *
 * `full` offers every page. `workbench` offers only the Workbench, for
 * installations that run user workspaces without a GitLab instance, where
 * every other page would be empty. The routes, the drawer, the toolbar and
 * the private route all ask this module, so a profile is defined once here.
 *
 * This is not part of `util/envUtil` because the test setup replaces that
 * module for every suite, and the profile must be real in the tests that
 * check it.
 */

export type Profile = 'full' | 'workbench';

export type Feature =
  | 'library'
  | 'digitaltwins'
  | 'automation'
  | 'bim'
  | 'workbench'
  | 'insights'
  | 'account';

interface ProfileDefinition {
  readonly features: readonly Feature[];
  /** Whether the pages talk to GitLab through dt-automation. */
  readonly dtAutomation: boolean;
}

const PROFILES: Record<Profile, ProfileDefinition> = {
  full: {
    features: [
      'library',
      'digitaltwins',
      'automation',
      'bim',
      'workbench',
      'insights',
      'account',
    ],
    dtAutomation: true,
  },
  workbench: { features: ['workbench'], dtAutomation: false },
};

export const PROFILE_NAMES = Object.keys(PROFILES) as Profile[];

let warned = false;

function isProfile(value: string): value is Profile {
  return (PROFILE_NAMES as string[]).includes(value);
}

/**
 * The configured profile. A missing or empty key is `full`, which keeps
 * every installation that predates the key as it was. Any other unknown
 * value is `full` as well, with one warning, so a typo shows every page
 * rather than none.
 */
export function getProfile(): Profile {
  const value = globalThis.env?.REACT_APP_PROFILE ?? '';
  if (value === '') return 'full';
  if (isProfile(value)) return value;
  if (!warned) {
    warned = true;
    // The page renders either way, so the console is the only place an
    // administrator who mistyped the value would see why every page is shown.
    // eslint-disable-next-line no-console
    console.warn(
      `REACT_APP_PROFILE '${value}' is not one of ${PROFILE_NAMES.join(', ')}; using 'full'.`,
    );
  }
  return 'full';
}

export function isFeatureEnabled(
  feature: Feature,
  profile: Profile = getProfile(),
): boolean {
  return PROFILES[profile].features.includes(feature);
}

export function usesDtAutomation(profile: Profile = getProfile()): boolean {
  return PROFILES[profile].dtAutomation;
}

/** For tests: lets the next unknown value warn again. */
export function resetProfileWarning(): void {
  warned = false;
}
