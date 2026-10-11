import { useSyncExternalStore } from "react";
import type { Session } from "@/engine";

/** A page of the Hub; navigation is sandbox state, never a site route. */
export type HubLocation =
  | { readonly page: "home" }
  | { readonly page: "new" }
  | {
      readonly page: "code";
      readonly repo: string;
      /** A branch name or a commit ID; the default branch when absent. */
      readonly ref?: string;
      /** A folder ("" = the root) or, with `file`, a file. */
      readonly path?: string;
      readonly file?: boolean;
    }
  | { readonly page: "branches"; readonly repo: string }
  | { readonly page: "commits"; readonly repo: string; readonly ref?: string }
  | { readonly page: "commit"; readonly repo: string; readonly oid: string }
  | { readonly page: "pulls"; readonly repo: string }
  | {
      readonly page: "compare";
      readonly repo: string;
      readonly base?: string;
      readonly head?: string;
    }
  | {
      readonly page: "pull";
      readonly repo: string;
      readonly number: number;
      readonly tab?: "conversation" | "files";
    }
  | { readonly page: "issues"; readonly repo: string }
  | { readonly page: "new-issue"; readonly repo: string }
  | { readonly page: "issue"; readonly repo: string; readonly number: number };

/** What the address bar shows, e.g. `hub.test/sam/shop/pull/1/files`. */
export function addressOf(at: HubLocation): string {
  const base = "hub.test";
  switch (at.page) {
    case "home":
      return base;
    case "new":
      return `${base}/new`;
    case "code":
      return at.ref || at.path
        ? `${base}/${at.repo}/${at.file ? "blob" : "tree"}/${at.ref ?? "main"}${at.path ? `/${at.path}` : ""}`
        : `${base}/${at.repo}`;
    case "branches":
      return `${base}/${at.repo}/branches`;
    case "commits":
      return `${base}/${at.repo}/commits${at.ref ? `/${at.ref}` : ""}`;
    case "commit":
      return `${base}/${at.repo}/commit/${at.oid.slice(0, 7)}`;
    case "pulls":
      return `${base}/${at.repo}/pulls`;
    case "compare":
      return `${base}/${at.repo}/compare${at.head ? `/${at.base ?? ""}...${at.head}` : ""}`;
    case "pull":
      return `${base}/${at.repo}/pull/${at.number}${at.tab === "files" ? "/files" : ""}`;
    case "issues":
      return `${base}/${at.repo}/issues`;
    case "new-issue":
      return `${base}/${at.repo}/issues/new`;
    case "issue":
      return `${base}/${at.repo}/issues/${at.number}`;
  }
}

export type HubNavState = {
  readonly at: HubLocation;
  readonly canBack: boolean;
  readonly canForward: boolean;
};

/** The Hub's own back and forward history for one sandbox. */
export class HubNavigator {
  private back: HubLocation[] = [];
  private forward: HubLocation[] = [];
  private state: HubNavState;
  private readonly listeners = new Set<() => void>();

  constructor(start: HubLocation) {
    this.state = { at: start, canBack: false, canForward: false };
  }

  go(at: HubLocation): void {
    this.back.push(this.state.at);
    this.forward = [];
    this.set(at);
  }

  goBack(): void {
    const at = this.back.pop();
    if (!at) return;
    this.forward.push(this.state.at);
    this.set(at);
  }

  goForward(): void {
    const at = this.forward.pop();
    if (!at) return;
    this.back.push(this.state.at);
    this.set(at);
  }

  private set(at: HubLocation): void {
    this.state = {
      at,
      canBack: this.back.length > 0,
      canForward: this.forward.length > 0,
    };
    for (const listener of this.listeners) listener();
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.state;
}

const navigators = new WeakMap<Session, HubNavigator>();

/** The sandbox's Hub navigator (kept while the session lives). */
export function navigatorFor(
  session: Session,
  start: HubLocation,
): HubNavigator {
  let nav = navigators.get(session);
  if (!nav) {
    nav = new HubNavigator(start);
    navigators.set(session, nav);
  }
  return nav;
}

export function useHubNav(nav: HubNavigator): HubNavState {
  return useSyncExternalStore(nav.subscribe, nav.getSnapshot, nav.getSnapshot);
}
