/**
 * How a provider names the groups that grant a project of the DTaaS group.
 * Keycloak carries the levels of the access plan: '<owner>_viewer',
 * '<owner>_member' and '<owner>_admin', with or without the leading '/' of
 * its full group path. The GitLab connector of Dex adds the role to the full
 * group path: '<group>/<owner>:developer'. Each provider uses one format
 * only, so a group a user may create in one place cannot pass as the other.
 */
export type GroupsFormat = 'access-plan' | 'dex-gitlab';

const ACCESS_PLAN_LEVEL = /^\/?([^/]+)_(viewer|member|admin)$/;
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

function ownerOfGroup(
  name: string,
  format: GroupsFormat,
  gitlabGroup: string,
): string | undefined {
  if (format === 'access-plan') return ACCESS_PLAN_LEVEL.exec(name)?.[1];
  const role = DEX_ROLE.exec(name);
  return role === null ? undefined : ownerOfDexGroup(role[1], gitlabGroup);
}

/** The owners whose projects the groups of a token let the user read. */
export default function ownersOfGroups(
  groups: readonly string[],
  format: GroupsFormat,
  gitlabGroup: string,
): string[] {
  const owners = groups.flatMap((name) => {
    const owner = ownerOfGroup(name, format, gitlabGroup);
    return owner !== undefined && OWNER_NAME.test(owner) ? [owner] : [];
  });
  return [...new Set(owners)];
}
