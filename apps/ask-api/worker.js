import { handle } from "./handle.js";
import { fromD1, seed } from "./store.js";

let seeded;

export default {
  async fetch(request, env) {
    const db = fromD1(env.ASK_DB);
    // A failed seed retries on the next request. Meanwhile handle answers 503 if a table is missing.
    seeded ??= seed(db).catch(() => {
      seeded = undefined;
    });
    await seeded;
    return handle(request, env, db);
  }
};
