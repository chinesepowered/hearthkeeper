"use client";

import { useEffect, useSyncExternalStore } from "react";
import * as C from "@/lib/care";

function Avatar({ id, size = 28 }: { id: string; size?: number }) {
  const m = C.member(id);
  if (!m) return <span className="grid place-items-center rounded-full bg-neutral-300 text-[11px] font-bold text-white" style={{ width: size, height: size }}>🤖</span>;
  return (
    <span className="grid place-items-center rounded-full font-bold text-white" style={{ width: size, height: size, background: m.color, fontSize: size * 0.42 }} title={m.name}>
      {m.initial}
    </span>
  );
}

function Card({ title, children, className = "", badge }: { title: string; children: React.ReactNode; className?: string; badge?: React.ReactNode }) {
  return (
    <section className={`rounded-2xl border border-[#eadfd2] bg-white/80 p-4 shadow-[0_1px_0_#eadfd2] ${className}`}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-serif text-[17px] font-semibold text-[#3b2f2a]">{title}</h2>
        {badge}
      </div>
      {children}
    </section>
  );
}

export default function CareBoard() {
  const s = useSyncExternalStore(C.subscribe, C.getState, C.getState);
  useEffect(() => {
    C.hydrate();
  }, []);
  const t = C.today();

  const slots = s.meds
    .filter((m) => m.active)
    .flatMap((m) => m.times.map((time) => ({ m, time, taken: (m.taken[t] ?? []).includes(time) })))
    .sort((a, b) => a.time.localeCompare(b.time));
  const todayAppts = s.appts.filter((a) => a.date === t);
  const upcoming = s.appts.filter((a) => a.date >= t).slice(0, 5);
  const openTasks = s.tasks.filter((x) => !x.done).slice(0, 8);

  return (
    <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-2 xl:grid-cols-3">
      <Card title="Today" badge={<span className="text-xs text-neutral-500">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</span>}>
        <ul className="space-y-1.5">
          {slots.map(({ m, time, taken }) => (
            <li key={m.id + time} data-testid="dose" className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-[#fbf3ea]">
              <button
                onClick={() => C.toggleTaken(m.id, time)}
                className={`grid h-6 w-6 place-items-center rounded-full border-2 text-xs ${taken ? "border-[#2f6f5e] bg-[#2f6f5e] text-white" : "border-[#c9b8a8]"}`}
                aria-label="toggle taken"
              >
                {taken ? "✓" : ""}
              </button>
              <span className="w-16 text-sm tabular-nums text-neutral-500">{C.fmtTime(time)}</span>
              <span className={`text-sm ${taken ? "text-neutral-400 line-through" : "font-medium"}`}>
                {m.name} <span className="text-neutral-500">{m.dose}</span>
              </span>
            </li>
          ))}
          {todayAppts.map((a) => (
            <li key={a.id} className="flex items-center gap-3 rounded-lg bg-[#fff4e8] px-2 py-1.5">
              <span className="grid h-6 w-6 place-items-center">📅</span>
              <span className="w-16 text-sm tabular-nums text-neutral-500">{C.fmtTime(a.time)}</span>
              <span className="text-sm font-medium">{a.title}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Medications" badge={<span className="text-xs text-neutral-500">{s.meds.filter((m) => m.active).length} active</span>}>
        <ul className="space-y-2">
          {s.meds.map((m) => (
            <li key={m.id} data-testid="med" className={`rounded-xl border px-3 py-2 ${m.active ? "border-[#eadfd2]" : "border-dashed border-neutral-300 opacity-60"}`}>
              <div className="flex items-center justify-between">
                <div className="font-medium">
                  {m.name} <span className="text-neutral-500">{m.dose}</span>
                </div>
                <div className="flex gap-1">
                  {m.times.map((x) => (
                    <span key={x} className="rounded-full bg-[#f3e9dd] px-2 py-0.5 text-[11px] tabular-nums">
                      {C.fmtTime(x)}
                    </span>
                  ))}
                </div>
              </div>
              {(m.notes || m.startedOn) && (
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-neutral-600">
                  {m.startedOn && C.addDays(m.startedOn, 14) >= t && <span className="rounded bg-[#c2603d]/10 px-1.5 py-0.5 font-medium text-[#c2603d]">new · started {C.fmtDate(m.startedOn)}</span>}
                  {m.notes && <span>{m.notes}</span>}
                </div>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Upcoming">
        <ul className="space-y-2">
          {upcoming.map((a) => (
            <li key={a.id} data-testid="appt" className="flex gap-3 rounded-xl border border-[#eadfd2] px-3 py-2">
              <div className="w-20 shrink-0 text-sm">
                <div className="font-medium">{C.fmtDate(a.date)}</div>
                <div className="tabular-nums text-neutral-500">{C.fmtTime(a.time)}</div>
              </div>
              <div className="min-w-0 text-sm">
                <div className="font-medium">{a.title}</div>
                <div className="truncate text-neutral-500">
                  {a.with}
                  {a.location ? ` · ${a.location}` : ""}
                </div>
                {a.notes && <div className="text-[12px] text-neutral-600">{a.notes}</div>}
              </div>
            </li>
          ))}
          {upcoming.length === 0 && <li className="text-sm text-neutral-500">Nothing scheduled.</li>}
        </ul>
      </Card>

      <Card title="Family tasks">
        <ul className="space-y-1.5">
          {openTasks.map((x) => (
            <li key={x.id} data-testid="task" className={`flex items-center gap-3 rounded-lg px-2 py-1.5 ${x.assignee === s.viewer ? "bg-[#fbf3ea]" : ""}`}>
              <button onClick={() => { C.completeTask(x.id); C.post(`Done: ${x.title}`, s.viewer, "done"); }} className="grid h-6 w-6 place-items-center rounded-full border-2 border-[#c9b8a8] text-xs" aria-label="complete" />
              <Avatar id={x.assignee} size={24} />
              <span className="flex-1 text-sm">{x.title}</span>
              <span className="text-xs text-neutral-500">{C.fmtDate(x.date)}</span>
              {x.by === "agent" && <span className="text-[10px] text-violet-500">🤖</span>}
            </li>
          ))}
          {s.tasks.filter((x) => x.done).slice(-2).map((x) => (
            <li key={x.id} className="flex items-center gap-3 px-2 py-1 text-sm text-neutral-400 line-through">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-[#2f6f5e] text-xs text-white">✓</span>
              <Avatar id={x.assignee} size={24} />
              {x.title}
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Symptom journal">
        <ul className="space-y-2">
          {s.symptoms.slice(0, 5).map((x) => (
            <li key={x.id} data-testid="symptom" className="flex gap-3 text-sm">
              <span className="mt-1 flex gap-0.5" title={`severity ${x.severity}`}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <span key={i} className={`h-2 w-2 rounded-full ${i <= x.severity ? (x.severity >= 4 ? "bg-red-500" : "bg-[#c2603d]") : "bg-neutral-200"}`} />
                ))}
              </span>
              <div>
                <div>{x.text}</div>
                <div className="text-[11px] text-neutral-500">
                  {new Date(x.ts).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })} · {C.member(x.by)?.name ?? "agent"}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Family feed" badge={<span className="text-xs text-neutral-500">shared with everyone</span>}>
        <ul className="space-y-2">
          {s.feed.slice(0, 7).map((u) => (
            <li key={u.id} data-testid="feed" className={`flex gap-2 rounded-xl px-2 py-1.5 text-sm ${u.kind === "alert" ? "bg-red-50 ring-1 ring-red-200" : ""}`}>
              <Avatar id={u.by} size={24} />
              <div className="min-w-0">
                <div className={u.kind === "alert" ? "font-medium text-red-800" : ""}>{u.text}</div>
                <div className="text-[11px] text-neutral-500">
                  {u.by === "agent" ? "Care agent" : C.member(u.by)?.name} · {new Date(u.ts).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })}
                  {u.sentTo && u.sentTo.length > 0 && <span className="ml-1 rounded bg-neutral-100 px-1">📲 sent to {u.sentTo.join(", ")}</span>}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

export { Avatar };
