import { z } from 'zod';

// Every field is optional: the required ones are checked after the file and
// the environment are merged.
export const gitlabSettingsSchema = z
  .object({
    url: z.string().trim().min(1).optional(),
    username: z.string().trim().min(1).optional(),
    token: z.string().trim().min(1).optional(),
    group: z.string().trim().min(1).optional(),
    'dt-directory': z.string().trim().min(1).optional(),
    'common-library-project': z.string().trim().min(1).optional(),
    branch: z.string().trim().min(1).optional(),
    'runner-tag': z.string().trim().min(1).optional(),
  })
  .strict();

export type GitlabSection = z.infer<typeof gitlabSettingsSchema>;

type RequiredSetting = 'url' | 'username' | 'token';

export type GitlabSettings = GitlabSection & Record<RequiredSetting, string>;

export const GITLAB_ENV_VARIABLES = {
  url: 'EXECUTION_MANAGER_GITLAB_URL',
  username: 'EXECUTION_MANAGER_GITLAB_USERNAME',
  token: 'EXECUTION_MANAGER_GITLAB_TOKEN',
  group: 'EXECUTION_MANAGER_GITLAB_GROUP',
  'dt-directory': 'EXECUTION_MANAGER_GITLAB_DT_DIRECTORY',
  'common-library-project': 'EXECUTION_MANAGER_GITLAB_COMMON_LIBRARY_PROJECT',
  branch: 'EXECUTION_MANAGER_GITLAB_BRANCH',
  'runner-tag': 'EXECUTION_MANAGER_GITLAB_RUNNER_TAG',
} as const satisfies Record<keyof GitlabSection, string>;

function required(section: GitlabSection, name: RequiredSetting): string {
  const value = section[name];
  if (value === undefined) {
    throw new Error(
      `gitlab.${name} is not set: set it in the configuration file or with ${GITLAB_ENV_VARIABLES[name]}`,
    );
  }
  return value;
}

export function requireGitlabSettings(section: GitlabSection): GitlabSettings {
  return {
    ...section,
    url: required(section, 'url'),
    username: required(section, 'username'),
    token: required(section, 'token'),
  };
}
