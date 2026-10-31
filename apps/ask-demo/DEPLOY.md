# Deploy the Valley Freight Ask demo

One Cloudflare Worker serves the demo page and answers `POST /ask`. The page at `/apps/ask-demo/` on that Worker calls the same host, so the `workers.dev` URL is the preview. GitHub Pages keeps the browser mock until `ask.apiBase` in `js/config.js` is set.

There is no preview URL until the Cloudflare account that should own the demo runs the commands below. This repo does not deploy it.

## Before you start

You need Node 22.13 or later, and a Cloudflare API token with Workers Scripts edit and D1 edit on the account that should own the demo. You also need that account id. Wrangler runs through `npx`.

Set both values in the shell you use for every command below. Wrangler reads them and does not open a browser.

```sh
export CLOUDFLARE_API_TOKEN="paste the token"
export CLOUDFLARE_ACCOUNT_ID="paste the account id"
```

## Test and preview locally

From the repo root:

```sh
node --test apps/ask-api/test/api.test.js apps/ask-demo/test/ask.test.cjs
node apps/ask-api/dev.js
```

Then open `http://127.0.0.1:8787/apps/ask-demo/?askApi=same`. Local Node has no Workers AI binding, so the keyword planner picks the query and the SQL still runs. A restart clears the in-memory hourly limit.

`?askApi=` is honored only on `localhost` and `127.0.0.1`. `askApi=same` calls the page's own origin.

## Check the cost before you deploy

At about 1,000 questions a month, the demo stays on the free allocation.

| Service | Monthly | One-time |
| --- | --- | --- |
| Cloudflare Workers Free | $0 | $0 |
| Cloudflare D1 Free | $0 | $0 |
| Workers AI `@cf/meta/llama-3.1-8b-instruct` | $0 | $0 |
| Total | $0 | $0 |

The figures come from Cloudflare's pricing pages as of 2026-10-20. The Workers Free plan allows commercial use. Workers AI includes 10,000 neurons a day on that plan. This model is listed at 25,608 neurons per million input tokens and 75,147 neurons per million output tokens. A routing call is a few hundred tokens, so demo traffic stays far under the daily allocation. If that allocation is used up, the Worker keeps answering with the keyword planner.

Workers Free allows 10 ms of CPU time per request. Time spent waiting on D1 or on Workers AI does not count. Workers Paid is $5 a month and is not needed for this demo.

## Deploy the Worker

Run these commands in order from `apps/ask-api`, with `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` still set.

1. Create the database.

```sh
cd apps/ask-api
npx wrangler@4 d1 create valley-freight-ask
```

2. Copy the `database_id` Wrangler prints into `wrangler.toml`, replacing `paste-the-id-from-wrangler-d1-create`. Leave the binding name `ASK_DB`. Leave the `[ai]` binding named `AI`.

3. Deploy.

```sh
npx wrangler@4 deploy
```

Wrangler prints a `workers.dev` URL. Open that URL plus `/apps/ask-demo/`. The first `POST /ask` creates the tables and loads the 96 sample rows. The page on that host calls `/ask` on the same host.

The Worker serves the static site from the repo. Requests to `/ask` run the Worker. Other paths are static files.

## Change who may call the API

The built-in allowlist is `https://nimblytica.com`, `https://www.nimblytica.com`, and `localhost` and `127.0.0.1` on ports 8000 and 8787. The browser origin of the request itself is also allowed, which is why the `workers.dev` page can call `/ask` without being listed first.

`ALLOWED_ORIGINS` in `wrangler.toml` adds origins. It does not remove the built-in list. Put a comma-separated list in the `[vars]` block, including a `workers.dev` preview origin when you want that host to call the API from another site.

```toml
[vars]
ALLOWED_ORIGINS = "https://valley-freight-ask.example.workers.dev"
```

Deploy again after you change the list. A request from any other site gets a 403 before a question is counted.

## What the model is allowed to do

The `[ai]` binding calls `@cf/meta/llama-3.1-8b-instruct`. The model may return one of the five query names and a month. It does not write SQL. If the binding is missing, or the call fails, the keyword planner picks the query and the same allowlist still runs.

There is no model API key in this deploy.

## Delete stored network addresses

`ask_hits` keeps a network key and a timestamp for each question so the Worker can count 10 questions an hour. It does not store question text. This command also resets every network's hourly count. Run it from `apps/ask-api`.

```sh
npx wrangler@4 d1 execute valley-freight-ask --remote --command "DELETE FROM ask_hits"
```
