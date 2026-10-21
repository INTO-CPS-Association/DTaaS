import { BadRequestException, PipeTransform } from '@nestjs/common';
import { ZodType, core } from 'zod';

// Zod issue messages name the field and the rule. They repeat an unknown key
// of the request and no submitted value, so they are safe to return to the
// caller.
function describeIssue(issue: core.$ZodIssue): string {
  if (issue.path.length === 0) return issue.message;
  return `${issue.path.join('.')}: ${issue.message}`;
}

export default class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException(result.error.issues.map(describeIssue));
    }
    return result.data;
  }
}
