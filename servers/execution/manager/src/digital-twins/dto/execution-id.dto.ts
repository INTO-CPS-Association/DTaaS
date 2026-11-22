import { z } from 'zod';

export const executionIdSchema = z.string().trim().min(1);
