"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import AgentPanel from "@/components/AgentPanel";
import CareBoard, { Avatar } from "@/components/CareBoard";
import * as C from "@/lib/care";
import { careTools } from "@/lib/tools";
import { registerTools } from "@/lib/webmcp";

function systemFor(viewer: C.MemberId) {
  const m = C.member(viewer)!;
  const who = viewer === "mom" ? "Margaret herself (78). Speak simply and warmly, short sentences, no jargon." : `${m.name}, Margaret's ${m.relation.toLowerCase()}, who helps coordinate her care.`;
  return `You are Hearthkeeper's care agent for Margaret, 78, who lives alone. Her family (Alex, daughter; Sam, son) share one care plan with her. You are talking with ${who}
Today is ${C.today()} (${new Date().toLocaleDateString(undefined, { weekday: "long" })}). Use the tools; they edit the same plan the family sees.
How to act:
- Always call get_care_plan first so you know the medications, schedule and who is doing what.
- When a symptom is reported, run this checklist, in order, in one go, without asking permission for each step:
  1. log_symptom.
  2. check_interactions (always; it tells you whether a medication is the likely cause).
  3. If a medication is implicated: update_medication to add a short note on that medication card (e.g. "Dizziness reported since start. Stand up slowly; pharmacist call booked."). Never change a dose yourself.
  4. add_appointment for a phone call with the pharmacist within 1-2 days (location "Phone", with "Pharmacist").
  5. assign_task to a family member for a concrete check tonight (e.g. blood pressure sitting and standing).
  6. notify_family with urgency 'urgent' if it needs attention today, summarising what you found and did.
- Red flags (chest pain, fainting, face drooping, slurred speech, severe shortness of breath): tell them to call emergency services now, then notify_family urgently.
- For questions ("did Mom take her pills?"), read the plan and answer directly.
- Reply in 2-4 short sentences in plain language. Say what you did and what happens next. Never print JSON. You are not a doctor; don't diagnose, but be genuinely helpful and calm.`;
}

const SUGGESTIONS: Record<C.MemberId, string[]> = {
  mom: ["I've been dizzy since I started the new blood pressure pill", "I took my evening pills", "When is my next appointment?"],
  alex: ["Did Mom take her morning pills today?", "Move the physio to Friday morning", "Remind Sam to bring the walker on Saturday"],
  sam: ["What's on this week?", "I'll do the pharmacy run tomorrow", "How has Mom been feeling?"],
};

export default function Home() {
  const s = useSyncExternalStore(C.subscribe, C.getState, C.getState);
  useEffect(() => registerTools(careTools), []);
  const system = useMemo(() => systemFor(s.viewer), [s.viewer]);
  const viewer = C.member(s.viewer)!;

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#fbf7f1] text-[#2b2320]">
      <header className="flex items-center gap-4 border-b border-[#eadfd2] bg-white/70 px-5 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#c2603d] text-xl text-white shadow-inner">🕯</span>
          <div>
            <div className="font-serif text-lg font-semibold leading-tight">Hearthkeeper</div>
            <div className="text-[12px] text-neutral-500">
              Margaret&apos;s care circle · {s.person.conditions.join(" · ")}
            </div>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="mr-1 text-xs text-neutral-500">Viewing as</span>
          {s.members.map((m) => (
            <button
              key={m.id}
              data-testid={`viewer-${m.id}`}
              onClick={() => C.setViewer(m.id)}
              className={`flex items-center gap-2 rounded-full border px-2 py-1 pr-3 text-sm transition ${s.viewer === m.id ? "border-[#2b2320] bg-white shadow" : "border-transparent hover:bg-white/60"}`}
            >
              <Avatar id={m.id} size={24} />
              {m.name}
              <span className="text-[11px] text-neutral-500">{m.relation}</span>
            </button>
          ))}
          <button onClick={() => confirm("Reset the demo data?") && C.resetDemo()} className="ml-2 rounded-md border border-[#eadfd2] px-2 py-1 text-xs text-neutral-500 hover:bg-white">
            Reset demo
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <main className="min-w-0 flex-1 overflow-y-auto">
          <CareBoard />
        </main>
        <aside className="flex w-[400px] shrink-0 flex-col border-l border-[#eadfd2] bg-white/70">
          <AgentPanel
            key={s.viewer}
            title={`Care agent · talking with ${viewer.name}`}
            systemPrompt={system}
            suggestions={SUGGESTIONS[s.viewer]}
            placeholder={s.viewer === "mom" ? "Tell me how you're feeling, or tap the mic…" : "Ask about Mom or change the plan…"}
            speakReplies={s.viewer === "mom"}
            intro={s.viewer === "mom" ? "Hello Margaret. How are you feeling today? You can talk to me or type." : `Hi ${viewer.name}. I can read and update Mom's plan for you.`}
          />
        </aside>
      </div>
    </div>
  );
}
