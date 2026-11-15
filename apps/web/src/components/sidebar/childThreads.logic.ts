import { scopedThreadKey, scopeThreadRef } from "@t3tools/client-runtime/environment";
import type { EnvironmentThreadShell } from "@t3tools/client-runtime/state/models";

type ChildThreadInput = Pick<
  EnvironmentThreadShell,
  "archivedAt" | "createdAt" | "delegatedFrom" | "environmentId" | "id" | "lineage"
>;

/**
 * Each thread's subagents and delegated tasks by its thread key, oldest first. A task a linked
 * environment runs for a thread counts only while `delegatedUnderParent` holds it, as Lineage does.
 */
export function groupChildThreadsByParent<T extends ChildThreadInput>(
  threads: ReadonlyArray<T>,
  delegatedUnderParent: ReadonlySet<string>,
): ReadonlyMap<string, ReadonlyArray<T>> {
  const byParent = new Map<string, T[]>();
  for (const thread of threads) {
    if (thread.archivedAt !== null) continue;
    const parentKey = childParentKey(thread, delegatedUnderParent);
    if (parentKey === null) continue;
    const siblings = byParent.get(parentKey);
    if (siblings === undefined) byParent.set(parentKey, [thread]);
    else siblings.push(thread);
  }
  for (const siblings of byParent.values()) {
    siblings.sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }
  return byParent;
}

function childParentKey(
  thread: ChildThreadInput,
  delegatedUnderParent: ReadonlySet<string>,
): string | null {
  const { lineage } = thread;
  if (lineage.relationshipToParent === "subagent" && lineage.parentThreadId !== null) {
    return scopedThreadKey(scopeThreadRef(thread.environmentId, lineage.parentThreadId));
  }
  const parent = thread.delegatedFrom;
  if (
    parent != null &&
    delegatedUnderParent.has(scopedThreadKey(scopeThreadRef(thread.environmentId, thread.id)))
  ) {
    return scopedThreadKey(scopeThreadRef(parent.environmentId, parent.threadId));
  }
  return null;
}
