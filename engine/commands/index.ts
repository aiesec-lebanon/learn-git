import { add } from "./add";
import { commit } from "./commit";
import { config } from "./config";
import { init } from "./init";
import { createRegistry } from "./registry";
import { status } from "./status";

/** Every simulated Git command; adding one means adding it here. */
export const GIT_REGISTRY = createRegistry([init, config, add, status, commit]);
