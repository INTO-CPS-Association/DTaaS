/**
 * How a provider names the groups that grant a project of the DTaaS group.
 * Keycloak carries the levels of the access plan: '<owner>_viewer',
 * '<owner>_member' and '<owner>_admin', with or without the leading '/' of
 * its full group path. The GitLab connector of Dex adds the role to the full
 * group path: '<group>/<owner>:developer'. Each provider uses one format
 * only, so a group a user may create in one place cannot pass as the other.
 */
export type GroupsFormat = 'access-plan' | 'dex-gitlab';

/** The owners a token's groups let the user read, and those it may write. */
export type Grants = { readers: string[]; writers: string[] };

type Grant = { owner: string; canWrite: boolean };

const ACCESS_PLAN_LEVEL = /^\/?([^/]+)_(viewer|member|admin)$/;
// Dex has no Reporter role, so every role it adds lets the user write.
const DEX_ROLE = /^(.+):(developer|maintainer|owner)$/;
// The characters GitLab allows in a project path.
const OWNER_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

function ownerOfDexGroup(
  path: string,
  gitlabGroup: string,
): string | undefined {
  const prefix = `${gitlabGroup}/`.toLowerCase();
  if (!path.toLowerCase().startsWith(prefix)) return undefined;
  return path.slice(prefix.length);
}

function grantOfAccessPlan(name: string): Grant | undefined {
  const level = ACCESS_PLAN_LEVEL.exec(name);
  if (level === null) return undefined;
  return { owner: level[1], canWrite: level[2] !== 'viewer' };
}

function grantOfDex(name: string, gitlabGroup: string): Grant | undefined {
  const role = DEX_ROLE.exec(name);
  if (role === null) return undefined;
  const owner = ownerOfDexGroup(role[1], gitlabGroup);
  return owner === undefined ? undefined : { owner, canWrite: true };
}

function grantOfGroup(
  name: string,
  format: GroupsFormat,
  gitlabGroup: string,
): Grant | undefined {
  return format === 'access-plan'
    ? grantOfAccessPlan(name)
    : grantOfDex(name, gitlabGroup);
}

export default function grantsOfGroups(
  groups: readonly string[],
  format: GroupsFormat,
  gitlabGroup: string,
): Grants {
  const grants = groups.flatMap((name) => {
    const grant = grantOfGroup(name, format, gitlabGroup);
    return grant !== undefined && OWNER_NAME.test(grant.owner) ? [grant] : [];
  });
  const owners = (list: Grant[]) => [...new Set(list.map((g) => g.owner))];
  return {
    readers: owners(grants),
    writers: owners(grants.filter((grant) => grant.canWrite)),
  };
}
