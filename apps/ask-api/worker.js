import { demoFailure, handle } from "./handle.js";
import { fromD1, seed } from "./store.js";

let seeded;

export default {
  async fetch(request, env) {
    const db = fromD1(env.ASK_DB);
    try {
      await (seeded ??= seed(db));
    } catch {
      seeded = undefined;
      return demoFailure(503);
    }
    return handle(request, env, db);
  }
};
