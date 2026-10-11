import { hubActionText, type ActorScript, type World } from "@/engine";
import { clockTime } from "@/features/graph/view-model";

export type TimelineItem = {
  readonly id: string;
  readonly name: string;
  /** What they do: the script's sentence, else its first line. */
  readonly what: string;
  /** When: done, next (Step runs it) or the trigger in words. */
  readonly when: string;
  readonly state: "done" | "next" | "waiting";
};

const stepText = (step: ActorScript["run"][number] | undefined) =>
  step === undefined
    ? ""
    : typeof step === "string"
      ? step
      : hubActionText(step);

const ORDINALS = ["first", "second", "third", "fourth", "fifth"];

/** A trigger in words, unless the script says it itself. */
export function triggerText(script: ActorScript): string {
  if (script.when) return script.when;
  const { trigger } = script;
  switch (trigger.kind) {
    case "after-step":
      return `after your ${ORDINALS[trigger.step - 1] ?? `${trigger.step}th`} command`;
    case "after-command":
      return "after a matching command of yours";
    case "at-time":
      return `at ${clockTime(trigger.time)}`;
  }
}

/** The teammates' schedule as the timeline lists it, in order. */
export function timelineItems(world: World): readonly TimelineItem[] {
  const fired = world.actors?.fired ?? [];
  let next = true;
  return (world.actors?.scripts ?? []).map((script) => {
    const done = fired.includes(script.id);
    const state = done ? "done" : next ? "next" : "waiting";
    if (!done) next = false;
    return {
      id: script.id,
      name: script.name,
      what: script.says ?? stepText(script.run[0]),
      when: done ? "done" : triggerText(script),
      state,
    };
  });
}
