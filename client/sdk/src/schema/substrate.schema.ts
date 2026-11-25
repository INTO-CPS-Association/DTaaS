import { z } from 'zod';
import { listOf, nonEmpty, pointSchema } from './common.schema';
import { urlSchema } from './url.schema';

const MIN_HOMOGRAPHY_POINTS = 4;

/**
 * What a pane loads. `lib://` and `git://` name a twin's library or repository
 * files and the host resolves them, `blob:` is a file the user opened in the
 * browser, and a relative path is resolved against the twin.
 */
const sourceUrl = urlSchema({
  schemes: ['lib', 'git', 'http', 'https', 'blob'],
  relative: true,
});

/** Maps image coordinates onto world coordinates for image substrates. */
export const calibrationSchema = z
  .object({
    type: z.literal('homography'),
    id: nonEmpty,
    imagePoints: listOf(pointSchema).min(MIN_HOMOGRAPHY_POINTS),
    worldPoints: listOf(pointSchema).min(MIN_HOMOGRAPHY_POINTS),
    units: z.enum(['m', 'cm', 'mm', 'px']).optional(),
    reprojectionError: z.number().nonnegative().optional(),
  })
  .refine((c) => c.imagePoints.length === c.worldPoints.length, {
    path: ['worldPoints'],
    message: 'imagePoints and worldPoints must have the same length',
  });

/** One pane's substrate: which adapter renders what source. */
export const substrateDescriptorSchema = z.object({
  adapter: nonEmpty,
  source: sourceUrl.optional(),
  calibration: calibrationSchema.optional(),
  latencyHintMs: z.number().nonnegative().optional(),
  timeParams: z.tuple([nonEmpty, nonEmpty]).optional(),
  independent: z.boolean().optional(),
  options: z.record(z.string(), z.unknown()).optional(),
});
