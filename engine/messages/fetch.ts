export const FETCH_USAGE = `usage: git fetch [<options>] [<repository> [<refspec>...]]
   or: git fetch [<options>] <group>
   or: git fetch --multiple [<options>] [(<repository> | <group>)...]
   or: git fetch --all [<options>]`;

export const fetchMessages = {
  from: (url: string) => `From ${url}\n`,
  fetching: (remote: string) => `Fetching ${remote}\n`,
  noRemoteRef: (name: string) => `fatal: couldn't find remote ref ${name}\n`,
  allTakesNoRepository: () =>
    "fatal: fetch --all does not take a repository argument\n",
};

/** The URL as Git names it in output and `FETCH_HEAD`: no final `/` or `.git`. */
export const displayUrl = (url: string) =>
  url.replace(/\/+$/, "").replace(/\.git$/, "");
