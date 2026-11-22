import { describe, expect, it } from '@jest/globals';
import {
  DigitalTwinNotFoundError,
  ExecutionNotFoundError,
  GitlabFailureError,
} from 'src/digital-twins/digital-twins.errors.js';

describe('digital twin errors', () => {
  it('carry the code their callers act on', () => {
    expect(new DigitalTwinNotFoundError('hello-world')).toMatchObject({
      code: 'digital-twin-not-found',
      message: 'Digital twin hello-world not found',
    });
    expect(new ExecutionNotFoundError('hello-world', 'e-1')).toMatchObject({
      code: 'execution-not-found',
      message: 'Execution e-1 of hello-world not found',
    });
    expect(new GitlabFailureError('GitLab said no')).toMatchObject({
      code: 'gitlab-failure',
      message: 'GitLab said no',
    });
  });
});
