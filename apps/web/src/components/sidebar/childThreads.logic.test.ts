import { scopedThreadKey, scopeThreadRef } from "@t3tools/client-runtime/environment";
import { EnvironmentId, ThreadId } from "@t3tools/contracts";
import { describe, expect, it } from "vite-plus/test";
import { groupChildThreadsByParent } from "./childThreads.logic";

const local = EnvironmentId.make("environment-local");
const remote = EnvironmentId.make("environment-remote");

function shell(
  id: string,
  options: {
    environmentId?: EnvironmentId;
    parent?: string;
    relationship?: "fork" | "subagent";
    delegatedFrom?: { environmentId: EnvironmentId; threadId: string };
    createdAt?: string;
    archived?: boolean;
  } = {},
) {
  return {
    id: ThreadId.make(id),
    environmentId: options.environmentId ?? local,
    archivedAt: options.archived === true ? "2026-11-15T00:00:00.000Z" : null,
    createdAt: options.createdAt ?? "2026-11-15T00:00:00.000Z",
    delegatedFrom:
      options.delegatedFrom === undefined
        ? null
        : {
            environmentId: options.delegatedFrom.environmentId,
            threadId: ThreadId.make(options.delegatedFrom.threadId),
            title: "Parent",
          },
    lineage: {
      parentThreadId: options.parent === undefined ? null : ThreadId.make(options.parent),
      relationshipToParent:
        options.relationship ?? (options.parent === undefined ? null : "subagent"),
      rootThreadId: ThreadId.make(options.parent ?? id),
    },
  };
}

const key = (environmentId: EnvironmentId, id: string) =>
  scopedThreadKey(scopeThreadRef(environmentId, ThreadId.make(id)));

describe("groupChildThreadsByParent", () => {
  it("groups subagents and delegated tasks under their parent, oldest first", () => {
    const later = shell("child-later", { parent: "root", createdAt: "2026-11-15T02:00:00.000Z" });
    const earlier = shell("child-earlier", {
      parent: "root",
      createdAt: "2026-11-15T01:00:00.000Z",
    });
    const grandchild = shell("grandchild", { parent: "child-earlier" });
    const delegated = shell("delegated", {
      environmentId: remote,
      delegatedFrom: { environmentId: local, threadId: "root" },
    });
    const unclaimedDelegated = shell("unclaimed", {
      environmentId: remote,
      delegatedFrom: { environmentId: local, threadId: "root" },
    });
    const fork = shell("fork", { parent: "root", relationship: "fork" });
    const archived = shell("archived", { parent: "root", archived: true });

    const grouped = groupChildThreadsByParent(
      [shell("root"), later, earlier, grandchild, delegated, unclaimedDelegated, fork, archived],
      new Set([key(remote, "delegated")]),
    );

    expect(grouped.get(key(local, "root"))?.map((thread) => thread.id)).toEqual([
      "delegated",
      "child-earlier",
      "child-later",
    ]);
    expect(grouped.get(key(local, "child-earlier"))?.map((thread) => thread.id)).toEqual([
      "grandchild",
    ]);
    expect(grouped.size).toBe(2);
  });
});
