import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createWorld } from "@/engine";
import { scenarioById, scenarioCode, trackById } from "@/content/registry";
import { trackHref } from "@/content/routes";
import { SCENARIO_SCENES } from "@/content/scenarios";
import { Checkpoint } from "@/features/checkpoint/checkpoint";
import { stageFrame } from "@/features/stage/frame";
import { NAV_BACK } from "@/features/site/page-transition";
import { AppLink } from "@/ui/link";

export function generateStaticParams() {
  return Object.keys(SCENARIO_SCENES).map((scenarioId) => ({ scenarioId }));
}

function find(id: string) {
  const scenario = scenarioById(id);
  const scene = scenario?.ready ? SCENARIO_SCENES[scenario.id] : undefined;
  return scenario && scene ? { scenario, scene } : null;
}

export async function generateMetadata({
  params,
}: PageProps<"/scenarios/[scenarioId]">): Promise<Metadata> {
  const found = find((await params).scenarioId);
  return found
    ? {
        title: `${scenarioCode(found.scenario.id)} ${found.scenario.title}`,
        description: found.scene.goal,
      }
    : {};
}

export default async function ScenarioPage({
  params,
}: PageProps<"/scenarios/[scenarioId]">) {
  const found = find((await params).scenarioId);
  if (!found) notFound();
  const { scenario, scene } = found;
  const track = trackById(scenario.track);
  return (
    <article className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 grid max-w-prose gap-3">
        <p className="m-0 font-display text-sm font-semibold text-fg-muted">
          {track ? (
            <AppLink href={trackHref(track.id)} transitionTypes={NAV_BACK}>
              {track.title}
            </AppLink>
          ) : null}{" "}
          · Scenario · {scenario.minutes} min
        </p>
        <h1 className="m-0 text-3xl font-bold">
          {scenarioCode(scenario.id)} {scenario.title}
        </h1>
        <figure className="m-0 rounded-sm border border-line bg-surface p-4 shadow-2">
          <blockquote className="m-0">
            <p className="m-0">{scene.brief.message}</p>
          </blockquote>
          <figcaption className="mt-2 text-sm text-fg-muted">
            Message from {scene.brief.from}
          </figcaption>
        </figure>
        <p className="m-0 font-display text-xl">{scene.goal}</p>
        <p className="m-0 text-fg-muted">
          No steps and no single right answer. The guide stays quiet until you
          ask for a hint, and the debrief compares your path with others.
        </p>
      </header>
      <Checkpoint
        sessionKey={`scenario:${scenario.id}`}
        reached={{}}
        world={scene.world}
        scenario={scene}
        start={stageFrame(createWorld(scene.world), [])}
      />
      {track ? (
        <nav aria-label="Course" className="border-t border-line py-6">
          <AppLink href={trackHref(track.id)} transitionTypes={NAV_BACK}>
            All chapters
          </AppLink>
        </nav>
      ) : null}
    </article>
  );
}
