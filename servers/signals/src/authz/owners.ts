import { Injectable } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import Config from '../config/config.service.js';

// The characters GitLab allows in a project path, and the snake_case of the
// group names of the naming convention.
const ownerSchema = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/);
const groupSchema = z.string().regex(/^[a-z][a-z0-9_]*$/);
// A prefix is the start of a topic up to a '/', with no wildcard.
const prefixSchema = z.string().regex(/^[^+#*\s]+\/$/);
const fileSchema = z.record(
  ownerSchema,
  z.object({ group: groupSchema, topics: z.array(prefixSchema) }).strict(),
);

/** The group an owner's twins belong to, and the topics that group uses. */
export type OwnerGroup = z.infer<typeof fileSchema>[string];

/**
 * Each owner's group and topic prefixes, as dtaas-services gives the group's
 * broker accounts and database. A twin's declaration names topics, and
 * without this map a twin could declare a topic of another group and read
 * or command it. Read on each decision, so a change needs no restart.
 */
@Injectable()
export default class Owners {
  // eslint-disable-next-line no-useless-constructor, no-empty-function
  constructor(private readonly config: Config) {}

  async groups(): Promise<Map<string, OwnerGroup>> {
    const file = this.config.get('owners-file');
    if (file === '') throw new Error('owners-file is not configured');
    const parsed = fileSchema.safeParse(
      JSON.parse(await readFile(file, 'utf8')),
    );
    if (!parsed.success) {
      throw new Error('owners-file must map each owner to a group and topics');
    }
    return new Map(Object.entries(parsed.data));
  }
}

/** True when the topic starts with one of the group's prefixes. */
export function ownsTopic(
  group: OwnerGroup | undefined,
  topic: string,
): boolean {
  return (group?.topics ?? []).some((prefix) => topic.startsWith(prefix));
}
