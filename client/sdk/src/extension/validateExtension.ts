import { RESERVED_EXTENSION_IDS, SDK_VERSION } from './constants';
import { checkIdentity, checkShapes } from './validation/identityRules';
import checkRequiredFields from './validation/fieldRules';
import checkLaziness from './validation/lazinessRules';
import {
  checkDetect,
  checkSubstrates,
  checkUniqueness,
} from './validation/contributionRules';
import checkNavigation from './validation/navigationRules';
import { describe, isObject, type Loose } from './validation/validationUtils';

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: string[];
}

export interface ValidateOptions {
  /** Ids the host already uses; defaults to the DTaaS core routes. */
  readonly reservedIds?: readonly string[];
  /** The API version the host implements; defaults to `SDK_VERSION`. */
  readonly hostApiVersion?: string;
}

const runRules = (ext: Loose, options: ValidateOptions): string[] => [
  ...checkIdentity(
    ext,
    options.reservedIds ?? RESERVED_EXTENSION_IDS,
    options.hostApiVersion ?? SDK_VERSION,
  ),
  ...checkShapes(ext),
  ...checkRequiredFields(ext),
  ...checkLaziness(ext),
  ...checkUniqueness(ext),
  ...checkNavigation(ext),
  ...checkSubstrates(ext),
  ...checkDetect(ext),
];

/**
 * Checks one extension against the contract. Never throws, so the host can
 * disable a broken extension instead of failing to start. Rules that span
 * several extensions (duplicate ids across kits) belong to the host.
 */
const validateExtension = (
  ext: unknown,
  options: ValidateOptions = {},
): ValidationResult => {
  if (!isObject(ext)) {
    return { valid: false, errors: ['extension must be an object'] };
  }
  try {
    const errors = runRules(ext, options);
    return { valid: errors.length === 0, errors };
  } catch (error) {
    // Getters and proxies can throw; the host must still get a result.
    const reason = error instanceof Error ? error.message : describe(error);
    return { valid: false, errors: [`extension could not be read: ${reason}`] };
  }
};

export default validateExtension;
