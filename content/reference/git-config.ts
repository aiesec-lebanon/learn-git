import { defineReferenceEntry } from "../define";
import { PRESETS } from "./presets";

export default defineReferenceEntry({
  id: "config",
  title: "git config",
  summary:
    "Reads and writes settings such as your name and email. --global settings apply to every repository you use; --local ones only to this repository.",
  presets: [PRESETS.noIdentity, PRESETS.clean],
  variants: [
    {
      id: "set-global",
      command: 'git config set --global user.name "Sam Lee"',
      after: { config: { "user.name": "Sam Lee" } },
    },
    {
      id: "set-local",
      command: 'git config set --local user.name "Sam at work"',
      after: { config: { "user.name": "Sam at work" } },
    },
    {
      id: "get",
      command: "git config get init.defaultBranch",
      shows: "main",
    },
    {
      id: "list",
      command: "git config list",
      shows: "init.defaultbranch=main",
    },
    {
      id: "unset",
      command: "git config unset --global init.defaultBranch",
      after: { config: { "init.defaultBranch": null } },
    },
  ],
  gotchas: [
    "When a setting exists in both scopes, the --local value in this repository wins over --global.",
    'Quote values that contain spaces, like "Sam Lee", or the shell splits them into separate words.',
    "A new name or email applies to future commits only; commits you already made keep the old one.",
  ],
  legacy: [
    {
      older: 'git config --global user.name "Sam Lee"',
      today: 'git config set --global user.name "Sam Lee"',
    },
    { older: "git config --get user.name", today: "git config get user.name" },
    { older: "git config --list", today: "git config list" },
    {
      older: "git config --unset user.name",
      today: "git config unset user.name",
    },
  ],
  lessons: ["b1-1"],
});
