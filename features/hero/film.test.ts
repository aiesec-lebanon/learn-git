import { describe, expect, it } from "vitest";
import { voiceProblems } from "@/content/guide/voice";
import { heroFilm } from "./film";

describe("hero film", () => {
  const film = heroFilm();

  it("rests, then runs seven shots in the guide's voice", () => {
    expect(film.map((f) => f.command)).toEqual([
      "git status",
      "edit index.html",
      "git add index.html",
      'git commit -m "Open until 15:00"',
      "git push",
      "git fetch",
      "git merge origin/main",
      "git push",
    ]);
    for (const frame of film) expect(voiceProblems(frame.say)).toEqual([]);
  });

  it("shows every shot's effects, Sam's push on origin, and ends merged", () => {
    for (const frame of film.slice(1))
      expect(frame.stage.effects.length).toBeGreaterThan(0);
    expect(film[4]?.who).toMatch(/Sam's laptop/);
    const end = film.at(-1)?.stage;
    const merge = end?.view?.commits.find((c) => c.parents.length === 2);
    expect(merge).toBeDefined();
    expect(end?.panels.length).toBeGreaterThan(0);
  });

  it("is plain data the server can hand to the page", () => {
    expect(JSON.parse(JSON.stringify(film))).toEqual(film);
  });
});
