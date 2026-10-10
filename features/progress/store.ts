import type { StorageLike } from "@/lib/storage";
import {
  EMPTY_DOC,
  parseProgress,
  STORAGE_KEY,
  type Prefs,
  type ProgressDoc,
  type RegistryIds,
  type ResumePointer,
} from "./schema";

export type ProgressStore = {
  subscribe(listener: () => void): () => void;
  /** The same object until something changes. */
  getSnapshot(): ProgressDoc;
  setResume(pointer: ResumePointer): void;
  finishChapter(id: string): void;
  setPrefs(change: Partial<Prefs>): void;
  /** Forgets everything stored ("Reset progress"). */
  reset(): void;
  /** Another tab wrote the key (a `storage` event); validated like a read. */
  receive(raw: string | null): void;
};

/**
 * Progress and preferences in one versioned document. Storage errors are
 * ignored; the in-memory copy keeps the site working without storage.
 */
export function createProgressStore(
  storage: StorageLike | null,
  ids: RegistryIds,
): ProgressStore {
  const read = () => {
    try {
      return parseProgress(storage?.getItem(STORAGE_KEY) ?? null, ids);
    } catch {
      return { doc: EMPTY_DOC, writable: true };
    }
  };
  let { doc, writable } = read();
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());

  const write = (next: ProgressDoc) => {
    if (JSON.stringify(next) === JSON.stringify(doc)) return;
    doc = next;
    if (writable) {
      try {
        storage?.setItem(STORAGE_KEY, JSON.stringify(doc));
      } catch {
        // Quota or security error: the in-memory copy still works.
      }
    }
    notify();
  };

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => doc,
    setResume: (resume) => write({ ...doc, resume }),
    finishChapter: (id) =>
      write({
        ...doc,
        finished: doc.finished.includes(id)
          ? doc.finished
          : [...doc.finished, id],
      }),
    setPrefs: (change) => write({ ...doc, prefs: { ...doc.prefs, ...change } }),
    reset() {
      try {
        storage?.removeItem(STORAGE_KEY);
      } catch {
        // Nothing stored to clear.
      }
      writable = true;
      doc = EMPTY_DOC;
      notify();
    },
    receive(raw) {
      ({ doc, writable } = parseProgress(raw, ids));
      notify();
    },
  };
}
