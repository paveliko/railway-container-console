/**
 * What the console is doing to the container right now, as the browser is told
 * it.
 *
 * This exists because `ContainerState` cannot answer the question. A press is
 * finished when *this operation* reaches its target, and a bare state carries
 * no way to tell a satisfying reading from a stale one: no sequence, no epoch,
 * no notion of which deployment the press was aimed at. The server has all
 * three, so the server decides and says so, and the browser renders the answer
 * instead of inferring one.
 *
 * Carried on the SSE stream as a named `operation` event, alongside — never
 * inside — the unnamed event that carries `ContainerState`. That keeps the
 * promise that every state event replaces the whole state.
 */

import { z } from 'zod';

export const operationTransitionSchema = z.enum(['up', 'down']);

export type OperationTransition = z.infer<typeof operationTransitionSchema>;

/**
 * Five outcomes, and the distinctions between them are load-bearing.
 *
 * `failed` is not `succeeded`: a start that ran and crashed is finished, but it
 * did not work, and reporting it as success would be a lie about the only thing
 * this console exists to say.
 *
 * `indeterminate` is not `refused`: a refusal is Railway saying no, which is
 * knowledge. An indeterminate result is the request failing in a way that does
 * not say whether it took effect — and because the mutations are not
 * idempotent, that is precisely the case that must never be retried
 * automatically (`V-12`).
 *
 * There is no `unknown` outcome. An `unknown` *phase* means the console could
 * not establish the result; treating it as completion would release the guard
 * while the first press may still be running. It is shown at once and the guard
 * is held until the deadline.
 */
export const operationStatusSchema = z.enum([
  'in-flight',
  'succeeded',
  'failed',
  'refused',
  'indeterminate',
  'timed-out',
]);

export type OperationStatus = z.infer<typeof operationStatusSchema>;

export const operationSchema = z.object({
  id: z.string(),
  transition: operationTransitionSchema,
  status: operationStatusSchema,
  /** Epoch milliseconds at which the operation was claimed. */
  since: z.number().int().nonnegative(),
  /**
   * Which deployment a `up` is waiting for, once the verb has reported it.
   * Absent until then, and absent for `down`, which has no target to name.
   * Without it the *previous* deployment's reading resolves the new press.
   */
  target: z.string().optional(),
});

export type Operation = z.infer<typeof operationSchema>;

/** The payload of the `operation` event: an operation, or nothing in flight. */
export const operationEventSchema = operationSchema.nullable();

/** True while the operation still holds the guard. */
export function isOperationInFlight(operation: Operation | null | undefined): boolean {
  return operation?.status === 'in-flight';
}
