"use client";

import { useEffect, useRef, useState } from "react";
import { useMotion } from "@/features/motion/policy";
import { StageView } from "@/features/stage/stage-view";
import { Hero } from "@/themes/active";
import { Button } from "@/ui/button";
import type { HeroFrame } from "./film";

const REST_MS = 3000;
const SHOT_MS = 2700;

/** Whether the film is on screen in a visible tab; it never plays otherwise. */
function useOnScreen(root: React.RefObject<HTMLElement | null>): boolean {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let intersecting = false;
    const update = () => setSeen(intersecting && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      intersecting = entry?.isIntersecting ?? false;
      update();
    });
    observer.observe(el);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, [root]);
  return seen;
}

/**
 * Plays the precomputed home film. It loops only while on screen, with
 * motion allowed, until paused; otherwise it holds the last frame still.
 */
export function HeroPlayer({ frames }: { frames: readonly HeroFrame[] }) {
  const root = useRef<HTMLDivElement>(null);
  const motion = useMotion();
  const onScreen = useOnScreen(root);
  const [at, setAt] = useState(frames.length - 1);
  const [paused, setPaused] = useState(false);
  const [forced, setForced] = useState(false);
  const playing = onScreen && !paused && (motion === "full" || forced);

  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(
      () => setAt((i) => (i + 1) % frames.length),
      at === frames.length - 1 ? REST_MS : SHOT_MS,
    );
    return () => clearTimeout(timer);
  }, [playing, at, frames.length]);

  const frame = frames[at];
  if (!frame) return null;
  const toggle = () => {
    if (playing) {
      setPaused(true);
      setForced(false);
    } else {
      setPaused(false);
      setForced(motion === "reduce");
    }
  };
  return (
    <div ref={root}>
      <Hero
        shot={frame}
        commands={frames.map((f) => f.command)}
        at={at}
        playing={playing}
        animate={motion === "full"}
        stage={<StageView frame={frame.stage} animate={playing} />}
        controls={
          <Button onClick={toggle}>
            {playing ? "Pause the example" : "Play the example"}
          </Button>
        }
      />
    </div>
  );
}
