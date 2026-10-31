# Deploy the Valley Freight Ask API

The Ask demo page answers from a mock in the browser until `ask.apiBase` in `js/config.js` points at a deployed API. This guide deploys the API in `apps/ask-api` to Cloudflare Workers with a D1 database, both on the free plan.

There is no preview URL yet. A `workers.dev` URL exists only after the owner of the Cloudflare account runs the steps in this guide.

## Before you start

You need the following:

- Node 22.13 or later. Earlier Node 22 releases need the `--experimental-sqlite` flag for the tests and the local server.
- The Cloudflare account that should own the demo.
- An OpenAI account, only if you want a model to pick the query for each question.

Wrangler runs through `npx`, so there is nothing else to install.

## Test and preview locally

From the repo root, run the tests:

```sh
node --test apps/ask-api/test/api.test.js apps/ask-demo/test/ask.test.cjs
```

Start the local API and site server:

```sh
node apps/ask-api/dev.js
```

Then open `http://127.0.0.1:8787/apps/ask-demo/?askApi=same`. The local server keeps the sample rows and the hourly limit in memory, so a restart resets the limit.

## Check the cost before you deploy

At demo traffic of about 1,000 questions a month, the API costs nothing unless you set a model key.

| Service | Monthly | One-time |
| --- | --- | --- |
| Cloudflare Workers Free | $0 | $0 |
| Cloudflare D1 Free | $0 | $0 |
| OpenAI gpt-4.1-mini, only if `ASK_LLM_KEY` is set | under $1 | about $5 prepaid credit |
| Total | $0 to $1 | $0 to $5 |

The Cloudflare rows come from Cloudflare's pricing pages as of 2026-10-30. The Free plan allows commercial use. 1,000 questions a month is far below the free daily limits of 100,000 Worker requests, 5 million D1 rows read, and 100,000 D1 rows written.

The model row uses $0.40 per million input tokens and $1.60 per million output tokens. Each question sends about 300 input tokens and gets about 20 back, so 1,000 questions cost about $0.16.

Workers Free allows 10 ms of CPU time per request. If a request goes over, the free plan rejects it. Time spent waiting on D1 or on the model does not count toward that limit. Workers Paid costs $5 a month and is not needed for this demo.

## Deploy the Worker

Run every command in this section from `apps/ask-api`.

1. Sign in with the Cloudflare account that should own the demo.

```sh
cd apps/ask-api
npx wrangler@4 login
```

2. Create the database.

```sh
npx wrangler@4 d1 create valley-freight-ask
```

Copy the `database_id` that Wrangler prints into `wrangler.toml`, in place of `paste-the-id-from-wrangler-d1-create`. If Wrangler offers to update the config for you, answer no, because `wrangler.toml` already declares the `ASK_DB` binding.

3. Deploy the Worker.

```sh
npx wrangler@4 deploy
```

Copy the `workers.dev` URL that Wrangler prints. The Worker creates its tables and loads the 96 sample rows on its first request.

4. Optional: turn on model routing. Before you create the OpenAI key, set a monthly spend limit of $10 on the OpenAI project. Then store the key as a Worker secret.

```sh
npx wrangler@4 secret put ASK_LLM_KEY
```

Wrangler prompts for the value, so the key stays out of your shell history. Never commit the key or put it in `wrangler.toml`.

5. Set `ask.apiBase` in `js/config.js` to the `workers.dev` URL, then publish the site as usual. To keep the browser mock, leave `apiBase` empty.

To try the deployed Worker before you change `js/config.js`, serve the site from the repo root:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000/apps/ask-demo/?askApi=` followed by the `workers.dev` URL. The page reads `askApi` only when it runs on `localhost` or `127.0.0.1`.

## Change the settings

The Worker reads two optional settings.

- `ASK_LLM_KEY` is a Worker secret. When it is set, `gpt-4.1-mini` picks one of the five preapproved queries for each question. When it is unset, or when the model call fails, a keyword planner picks the query instead.
- `ALLOWED_ORIGINS` is a comma-separated list of sites that may call the API. A request from any other site gets a 403. The default list is `https://nimblytica.com`, `https://www.nimblytica.com`, and `localhost` and `127.0.0.1` on ports 8000 and 8787.

To change the site list, add a `[vars]` block to `wrangler.toml` and deploy again. The list you set replaces the default list.

```toml
[vars]
ALLOWED_ORIGINS = "https://nimblytica.com,https://www.nimblytica.com"
```

## Delete stored network addresses

The `ask_hits` table keeps a network key and a timestamp for each question, so the Worker can count 10 questions an hour. A network key is a full IPv4 address or the first four groups of an IPv6 address. The Worker never stores question text.

To delete every stored address, run this command from `apps/ask-api`. It also resets every network's hourly count.

```sh
npx wrangler@4 d1 execute valley-freight-ask --remote --command "DELETE FROM ask_hits"
```
