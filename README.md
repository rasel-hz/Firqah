# FIRQAH (فِرقة)

كوّن فرقًا تناسب المهمة، لا مجرد مجموعات متساوية العدد.

Team formation for organizers of hackathons, bootcamps and university competitions in Saudi Arabia. Arabic, RTL.
Llama understands the challenge and the participants; a deterministic TypeScript optimizer forms the teams, enforces
hard constraints, and computes the scores. Llama never assigns people.

## Status

| Part | State |
|---|---|
| Optimizer, scoring, feasibility, random baseline | Done, tested |
| API routes, CSV import and export, profile rules | Done, tested (Llama replies mocked in tests) |
| Four screens: home, challenge setup, participants, results | Done, driven in a browser with real Llama |
| Manual mode when Llama is not configured | Done, driven in a browser |
| Real Llama (Cloudflare Workers AI, `@cf/meta/llama-3.3-70b-instruct-fp8-fast`) | Tested end to end on the 24-person sample |
| Deployment | Live at https://firqah.vercel.app/ |

## Run the project

Needs Node 22.18 or newer.

    npm install
    cp .env.example .env.local     # then fill the LLAMA_* values
    npm run dev                    # http://localhost:3000

Other commands: `npm test`, `npm run typecheck`, `npm run build`.

## Environment variables

Any OpenAI-compatible provider that hosts Llama works. Copy the values from your provider's official docs. This project
was tested on Cloudflare Workers AI, whose base URL is
`https://api.cloudflare.com/client/v4/accounts/<account-id>/ai/v1`. Groq shut down its Llama chat models in August 2026.

| Variable | Meaning |
|---|---|
| `LLAMA_API_BASE_URL` | Base URL, usually ending in `/v1` or `/openai/v1` |
| `LLAMA_API_KEY` | Secret key. Server-side only. Never commit it. |
| `LLAMA_MODEL` | Exact Llama model id from the provider's list |
| `LLAMA_JSON_MODE` | Optional. Set to `off` if the provider rejects JSON mode. |

Restart the server after changing these. Without them the app shows a clear message and works in manual mode, and
manual values are labeled as manual.

## Deployment

Any host that runs Next.js works. On Vercel: push this repository to GitHub, import it in Vercel, add `LLAMA_API_BASE_URL`,
`LLAMA_API_KEY` and `LLAMA_MODEL` under Environment Variables, and deploy. There is no database to set up. Vercel's free
Hobby plan is for personal, non-commercial use and allows 300 seconds per request. Participant analysis sends one short
request per 5 people, so a slow run does not hit that limit.

## Design rules

- Llama: understands text, extracts skills (with evidence and confidence), suggests weights, reviews teams.
- Code: assigns teams, enforces constraints, computes scores, detects infeasibility.
- Unknown skill levels are `null`; they are never treated as a confirmed 0 and never count as qualifying.
- A low-confidence Llama guess stays unknown until the organizer confirms or corrects it.
- A requirement is hard only when the organizer ticks it. Impossible rules are reported, never quietly relaxed.
- Scores are rubric scores against the selected criteria, not probabilities of success. The result is "the best valid
  solution found", not a proven optimum.

## Limitations

- Data lives in `localStorage`: one browser only, with no accounts and no sync. Clearing browser data deletes it.
- The score rewards even spread. If nearly all skill levels are unknown, balance is trivially high, so read the score
  together with the unknown-data warning shown beside it.
- The review sends participant names, levels and evidence to your Llama provider, and analysis sends descriptions.
- Unknown levels depend on how much people write. On the current sample about 40% stay unknown before any manual
  confirmation; short descriptions gave about 80%.
- Llama's levels are a first reading, not a measurement, and it can rate a small mention too highly. That is why the
  organizer can correct every level. Review wording can also flatter a modest level, so the computed numbers are the
  reference.
- Measured for 25 participants and 6 teams on Cloudflare: participant analysis took 100 to 130 seconds in total, review
  20 to 50 seconds, and a full run about 2,000 Neurons (the free plan allows 10,000 per day).
- Larger events are not measured yet. A very large review could exceed the model's 24,000-token context window.

## Measured scenarios

Real optimizer runs with 24 synthetic participants, 6 teams, seed 1. Random means 200 random assignments scored by the
same function.

| Scenario | Result | Score | Random mean / best |
|---|---|---|---|
| A: balanced | Valid, no gaps | 96.98 | 83.27 / 91.29 |
| B: imbalanced | Valid, with honest gaps in AI/ML and UI/UX across 5 of 6 teams | 83.96 | 70.93 / 78.18 |
| C: impossible hard rule (AI/ML 4+ per team, 3 qualify) | Infeasible, explained in Arabic, no teams returned | none | none |

## Sample data

`public/firqah-sample-participants.csv` holds 24 fictional Arabic participants, for testing and demos only.
