import {
  parseScopedThreadKey,
  scopedThreadKey,
  scopeThreadRef,
} from "@t3tools/client-runtime/environment";
import type { ScopedThreadRef } from "@t3tools/contracts";
import type { EnvironmentThreadShell } from "@t3tools/client-runtime/state/models";
import {
  CircleAlertIcon,
  CircleDashedIcon,
  CircleDotDashedIcon,
  CircleIcon,
  MessageCircleQuestionIcon,
  ShieldQuestionIcon,
  UserRoundIcon,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { cn } from "~/lib/utils";
import { appAtomRegistry } from "../../rpc/atomRegistry";
import { threadFamilies } from "../../state/threads";
import { resolveSidebarThreadStatus, type SidebarThreadStatus } from "../Sidebar.logic";

const MAX_DEPTH = 3;

const STATUS_ICON: Record<SidebarThreadStatus, { icon: typeof CircleIcon; className: string }> = {
  approval: { icon: ShieldQuestionIcon, className: "text-warning-foreground" },
  input: { icon: MessageCircleQuestionIcon, className: "text-indigo-600 dark:text-indigo-300" },
  request: { icon: UserRoundIcon, className: "text-guest-foreground" },
  preparing: { icon: CircleDashedIcon, className: "text-info-foreground" },
  working: { icon: CircleDashedIcon, className: "text-info-foreground" },
  waiting: { icon: CircleDotDashedIcon, className: "text-muted-foreground" },
  failed: { icon: CircleAlertIcon, className: "text-error-foreground" },
  limited: { icon: CircleAlertIcon, className: "text-warning-foreground" },
  ready: { icon: CircleIcon, className: "text-muted-foreground/50" },
};

/**
 * Reads the thread families of the listed rows so their finished subagents, which the shell leaves
 * out, merge into the shell rows. Mounts are diffed so a reordered list keeps its reads.
 */
export function useSidebarChildFamilies(threadKeys: ReadonlyArray<string>, enabled: boolean) {
  const wantedKey = enabled ? threadKeys.toSorted().join("\n") : "";
  const mounted = useRef(new Map<string, () => void>());
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- holds the listed rows' families in the thread family registry
  useEffect(() => {
    const wanted = new Set(wantedKey === "" ? [] : wantedKey.split("\n"));
    for (const [key, release] of mounted.current) {
      if (wanted.has(key)) continue;
      release();
      mounted.current.delete(key);
    }
    for (const key of wanted) {
      if (mounted.current.has(key)) continue;
      const ref = parseScopedThreadKey(key);
      if (ref === null) continue;
      mounted.current.set(
        key,
        threadFamilies.mount(appAtomRegistry, ref.environmentId, ref.threadId),
      );
    }
  }, [wantedKey]);
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- releases every family read on unmount
  useEffect(() => {
    const mounts = mounted.current;
    return () => {
      for (const release of mounts.values()) release();
      mounts.clear();
    };
  }, []);
}

export function SidebarChildThreads(props: {
  parentKey: string;
  childrenByParent: ReadonlyMap<string, ReadonlyArray<EnvironmentThreadShell>>;
  routeThreadKey: string | null;
  onOpen: (ref: ScopedThreadRef) => void;
  depth?: number;
}) {
  const depth = props.depth ?? 1;
  const children = props.childrenByParent.get(props.parentKey);
  if (children === undefined || children.length === 0) return null;
  return (
    <ul
      role="group"
      className="ml-4 flex flex-col gap-px border-l border-border/60 pl-1.5"
      data-sidebar-child-threads=""
    >
      {children.map((child) => {
        const ref = scopeThreadRef(child.environmentId, child.id);
        const key = scopedThreadKey(ref);
        const status = STATUS_ICON[resolveSidebarThreadStatus(child)];
        const Icon = status.icon;
        const isActive = props.routeThreadKey === key;
        return (
          <li key={key}>
            <button
              type="button"
              onClick={() => props.onOpen(ref)}
              className={cn(
                "flex h-6 w-full min-w-0 items-center gap-1.5 rounded-md px-1.5 text-left text-xs text-muted-foreground hover:bg-accent hover:text-foreground",
                isActive && "bg-accent text-foreground",
              )}
            >
              <Icon aria-hidden className={cn("size-3 shrink-0", status.className)} />
              <span className="min-w-0 flex-1 truncate">{child.title}</span>
            </button>
            {depth < MAX_DEPTH ? (
              <SidebarChildThreads {...props} parentKey={key} depth={depth + 1} />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
