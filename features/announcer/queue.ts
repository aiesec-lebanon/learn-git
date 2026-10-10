/** Room for the region to clear before the next message, so a repeat is spoken again. */
const CLEAR_MS = 50;
/** How long a message stays before the next one replaces it. */
const HOLD_MS = 600;
/** Older messages are dropped when commands outpace speech. */
const MAX_QUEUED = 3;

export type AnnouncerQueue = {
  say: (message: string) => void;
  dispose: () => void;
};

/** Feeds one live region: clear, then set, one message at a time. */
export function createAnnouncerQueue(
  write: (text: string) => void,
): AnnouncerQueue {
  const queue: string[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;
  let busy = false;

  const next = () => {
    const message = queue.shift();
    if (message === undefined) {
      busy = false;
      return;
    }
    busy = true;
    write("");
    timer = setTimeout(() => {
      write(message);
      timer = setTimeout(next, HOLD_MS);
    }, CLEAR_MS);
  };

  return {
    say(message) {
      if (!message.trim()) return;
      queue.push(message);
      if (queue.length > MAX_QUEUED) queue.shift();
      if (!busy) next();
    },
    dispose() {
      clearTimeout(timer);
      queue.length = 0;
      busy = false;
    },
  };
}
