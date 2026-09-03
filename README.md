# Hearthkeeper

**One care plan for an aging parent, shared by the family and their agents.**

Margaret is 78 and lives alone. Her daughter Alex and son Sam help look after her. Hearthkeeper is the single plan they all see: medications and doses taken, appointments, who is doing what, a symptom journal, and a family feed. Margaret talks to the care agent (by voice or text). The agent edits the plan through WebMCP, and the family's screens update.

Built for [The WebMCP Challenge](https://webmcp.devpost.com/).

## Why WebMCP

Caregiving is coordination: a dozen small facts scattered across text threads, pill bottles and fridge notes. An agent can only help if it can act on the *real* plan, not a screenshot of it. Hearthkeeper exposes the plan as twelve structured tools so any WebMCP-capable agent (ChatGPT's browser, Chrome with WebMCP enabled, or the built-in Gemini care agent) reads and updates exactly what the family sees.

| Tool | What it does |
| --- | --- |
| `get_care_plan` | Read medications (with today's taken doses), appointments, tasks, symptoms, feed |
| `log_symptom` | Add to the symptom journal with a 1–5 severity |
| `check_interactions` | Check active medications against a reference table of interactions and side effects |
| `add_medication` / `update_medication` | Add a medication; change its times, notes or active flag (never doses on its own) |
| `mark_dose_taken` | Tick off a dose |
| `add_appointment` / `reschedule_appointment` / `cancel_appointment` | Manage doctor, pharmacist and physio visits or calls |
| `assign_task` / `complete_task` | Give a family member a concrete job on a date |
| `notify_family` | Post to the feed and send to family members, with an urgency level |

All tools are registered with `document.modelContext.registerTool` (see `lib/webmcp.ts`) and unregistered on unmount.

## The moment it is built for

Margaret says: *"I've been dizzy since I started the new blood pressure pill."*

The agent reads the plan, logs the symptom, checks Amlodipine against Metoprolol (an additive blood-pressure effect), adds a note to the medication card, books a phone call with the pharmacist, asks Alex to check Mom's blood pressure tonight, and sends the family an urgent update. Switch to *Viewing as Alex* and it is all there.

## How to try it

1. Open the live URL in **ChatGPT's in-app browser** or **Chrome 149+** with `chrome://flags/#enable-webmcp-testing`. DevTools → Application → WebMCP lists the tools.
2. Or use the built-in care agent on the right. Tap the mic to speak. Switch *Viewing as* to see the same plan from each family member's side.

## Run locally

```bash
pnpm install
echo "GEMINI_API_KEY=your_key" > .env.local   # only for the in-page agent
pnpm dev
```

## Stack

Next.js 16 · Tailwind 4 · Web Speech API (voice in/out) · Gemini function calling · WebMCP (`document.modelContext`)

Demo data only; this is not medical advice.

## License

MIT
