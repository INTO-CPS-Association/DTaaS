import Config from 'src/config/config.service.js';

/** The GitLab settings of the tests, as environment variables. */
export const gitlabEnv = {
  EXECUTION_MANAGER_GITLAB_URL: 'https://gitlab.example.org',
  EXECUTION_MANAGER_GITLAB_USERNAME: 'user1',
  EXECUTION_MANAGER_GITLAB_TOKEN: 'secret',
};

// Sets the variables that are not set yet and returns a function that removes
// them again.
function setEnv(variables: Record<string, string>): () => void {
  const added = Object.keys(variables).filter(
    (name) => process.env[name] === undefined,
  );
  for (const name of added) process.env[name] = variables[name];
  return () => {
    for (const name of added) delete process.env[name];
  };
}

/** Runs a function while the environment holds the GitLab settings. */
export async function withGitlabEnv<T>(run: () => Promise<T>): Promise<T> {
  const restore = setEnv(gitlabEnv);
  try {
    return await run();
  } finally {
    restore();
  }
}

/** A Config that holds the GitLab settings of the tests. */
export function gitlabConfig(extra: Record<string, string> = {}): Config {
  const restore = setEnv({ ...gitlabEnv, ...extra });
  try {
    return new Config();
  } finally {
    restore();
  }
}
