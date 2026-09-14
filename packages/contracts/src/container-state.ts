/**
 * The one value the server sends the browser — over `GET /api/container/state`
 * for the first paint and over SSE for every change after it.
 *
 * It is a schema first and a type second. The type is inferred from the schema
 * (`z.infer`), so there is exactly one declaration of the union in the
 * repository and a payload that crosses HTTP is *parsed*, not cast. A phase
 * the browser does not know about fails `safeParse` instead of rendering as
 * `undefined`.
 *
 * The shape itself is the parent change's design §6; the reasoning for why
 * `deployment.status` alone cannot answer "is it up" lives next to
 * `deriveContainerState` in `@repo/container-core`.
 */

import { z } from 'zod';
import { deploymentStatusSchema } from './railway-enums';

export const downReasonSchema = z.enum(['never-deployed', 'stopped', 'removed']);

export type DownReason = z.infer<typeof downReasonSchema>;

export const containerStateSchema = z.discriminatedUnion('phase', [
  z.object({ phase: z.literal('down'), reason: downReasonSchema }),
  z.object({
    phase: z.literal('starting'),
    deploymentId: z.string(),
    status: deploymentStatusSchema,
  }),
  z.object({
    phase: z.literal('up'),
    deploymentId: z.string(),
    url: z.string().optional(),
    replicas: z.number().int().nonnegative(),
  }),
  z.object({ phase: z.literal('stopping'), deploymentId: z.string() }),
  z.object({
    phase: z.literal('failed'),
    deploymentId: z.string(),
    status: z.enum(['FAILED', 'CRASHED']),
  }),
  z.object({ phase: z.literal('sleeping'), deploymentId: z.string() }),
  /** Shown, never hidden — D-UI-1. */
  z.object({ phase: z.literal('unknown'), observed: z.string() }),
]);

export type ContainerState = z.infer<typeof containerStateSchema>;
