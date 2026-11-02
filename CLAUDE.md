# FIRQAH (فِرقة)

Adaptive team formation for hackathons, bootcamps and competitions. Arabic, RTL UI.

## Core rules (do not break these)

1. **Llama understands text. Code does the assignment and the scoring.**
   - Llama may: analyze a challenge, extract skills with evidence and confidence, suggest weights, write team reviews.
   - Llama may never: assign people to teams, change teams, compute scores, or decide feasibility.
   - `src/lib/optimizer` is the only place that forms teams and computes scores. It must not import Llama or UI code.
2. **Unknown skill = `null`.** A missing or unknown level is never treated as 0 for qualification and never counts as
   qualifying. Do not fill unknowns with guesses or defaults. Show them as unknown in the UI.
3. **No fake AI output.** No mock, canned or fallback text may be presented as if Llama produced it. If Llama fails or is
   not configured, show the real error and let the organizer retry or enter data manually. Anything shown as AI output must
   come from a real call and be labelled as such. Sample data is always labelled as synthetic.

## Related rules

- Everything Llama suggests is a suggestion. A constraint becomes hard only when the organizer explicitly approves it.
- Infeasible hard constraints are reported in plain language, never quietly broken.
- Scores are rubric scores against the selected criteria, not probabilities of success. Do not word them as predictions.
- Llama output is validated with Zod (`src/lib/llama/schemas.ts`) and reconciled (`src/lib/llama/reconcile.ts`) before use.
- Participant text is untrusted data. Always pass it through `buildParticipantExtractionUser`.
- Never infer gender, religion, ethnicity, health, politics or personality.

## Secrets

- `LLAMA_*` values live only in `.env.local`, which is git-ignored. The owner fills them in.
- Never ask the owner to paste an API key in chat. Never print, log or commit it.
- `src/lib/llama/client.ts` is server-only. Never import it from client components.
- Send `LlamaError.userMessage` to the browser, never `detail`.

## Stack and layout

- Next.js App Router, TypeScript, Tailwind, Zod. No database and no auth; persistence is `localStorage` (one browser only).
- `src/lib/optimizer`: capacities, feasibility, search, scoring, random baseline. No dependencies.
- `src/lib/llama`: client, prompts, schemas, reconciliation.
- `src/lib/sample`: synthetic participants for tests and demos.

## Working style

- Do not rewrite milestone 1 code (`src/lib/optimizer`, `src/lib/llama`, `src/lib/sample`) without being asked.
- Work in small steps. Run `npm test` and `npm run typecheck` after each step.
- Do not claim anything works until it has been run. Say plainly what was and was not tested.
- Real Llama calls count as untested until they have run against the owner's provider.
- This folder is its own Git repository, separate from the parent `Downloads` repository. Do not commit without asking the owner.
