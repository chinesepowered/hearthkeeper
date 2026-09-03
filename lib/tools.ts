import type { ToolDef } from "@/lib/webmcp";
import * as C from "@/lib/care";

const memberEnum = { type: "string", enum: ["mom", "alex", "sam"], description: "Family member id: mom (Margaret), alex (daughter), sam (son)." };

/** Hearthkeeper's WebMCP tools: one shared care plan, editable by people and agents. */
export const careTools: ToolDef[] = [
  {
    name: "get_care_plan",
    description:
      "Read the whole care plan: who is being cared for, family members, medications with today's taken doses, upcoming appointments, family tasks, recent symptoms and the family feed. Always call this before changing anything.",
    inputSchema: { type: "object", properties: {} },
    annotations: { readOnlyHint: true },
    execute: () => C.summary(),
  },
  {
    name: "log_symptom",
    description: "Record a symptom or how the person is feeling in the symptom journal. Severity 1 (mild) to 5 (severe).",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "What was reported, in the person's words where possible." },
        severity: { type: "integer", minimum: 1, maximum: 5 },
      },
      required: ["text", "severity"],
    },
    execute: (a) => {
      const s = C.logSymptom(String(a.text), Number(a.severity ?? 2), C.getState().viewer);
      return `Logged symptom (severity ${s.severity}): ${s.text}`;
    },
  },
  {
    name: "check_interactions",
    description:
      "Check the active medications (or a given list) against a reference table of known interactions and common side effects. Returns plain-language findings. Not a diagnosis; use it to decide whether to involve a pharmacist or prescriber.",
    inputSchema: {
      type: "object",
      properties: { medications: { type: "array", items: { type: "string" }, description: "Optional list of medication names. Defaults to all active medications." } },
    },
    annotations: { readOnlyHint: true },
    execute: (a) => {
      const f = C.checkInteractions(a.medications as string[] | undefined);
      return f.length ? f.join("\n") : "No known interactions or notable side effects in the reference table.";
    },
  },
  {
    name: "add_medication",
    description: "Add a medication to the plan with its dose and the times of day it is taken (24h HH:MM).",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        dose: { type: "string", description: "e.g. '5 mg'" },
        times: { type: "array", items: { type: "string" }, description: "Times of day, e.g. ['08:00','20:00']" },
        notes: { type: "string" },
      },
      required: ["name", "dose", "times"],
    },
    execute: (a) => {
      const m = C.addMed({ name: String(a.name), dose: String(a.dose), times: (a.times as string[]) ?? ["08:00"], notes: a.notes ? String(a.notes) : undefined });
      C.post(`Added ${m.name} ${m.dose} at ${m.times.map(C.fmtTime).join(" & ")}.`, "agent");
      return `Added ${m.name} (id ${m.id})`;
    },
  },
  {
    name: "update_medication",
    description:
      "Change a medication's schedule times, notes, or active flag. Never change a dose on your own initiative; dose changes must come from the prescriber (you may record one the user reports).",
    inputSchema: {
      type: "object",
      properties: {
        medication: { type: "string", description: "Medication id or name." },
        times: { type: "array", items: { type: "string" }, description: "New times of day (24h HH:MM)." },
        dose: { type: "string" },
        notes: { type: "string", description: "Note shown on the medication card, e.g. 'Take at bedtime; watch for dizziness'." },
        active: { type: "boolean" },
      },
      required: ["medication"],
    },
    execute: (a) => {
      const patch: Partial<C.Med> = {};
      if (a.times) patch.times = a.times as string[];
      if (a.dose) patch.dose = String(a.dose);
      if (a.notes) patch.notes = String(a.notes);
      if (typeof a.active === "boolean") patch.active = a.active;
      const m = C.updateMed(String(a.medication), patch);
      if (!m) throw new Error(`No medication matching "${a.medication}"`);
      C.post(`${m.name}: ${Object.entries(patch).map(([k, v]) => `${k} → ${Array.isArray(v) ? v.map(C.fmtTime).join(" & ") : String(v)}`).join(", ")}`, "agent");
      return `Updated ${m.name}: ${JSON.stringify(patch)}`;
    },
  },
  {
    name: "mark_dose_taken",
    description: "Tick off a dose as taken today. If no time is given, the next untaken slot is used.",
    inputSchema: {
      type: "object",
      properties: { medication: { type: "string" }, time: { type: "string", description: "HH:MM slot, optional." } },
      required: ["medication"],
    },
    execute: (a) => {
      const r = C.markTaken(String(a.medication), a.time ? String(a.time) : undefined);
      if (!r) throw new Error(`No medication matching "${a.medication}"`);
      return `Marked ${r.med.name} ${C.fmtTime(r.slot)} as taken`;
    },
  },
  {
    name: "add_appointment",
    description: "Schedule an appointment or a call (doctor, pharmacist, physio, lab).",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        date: { type: "string", description: "YYYY-MM-DD" },
        time: { type: "string", description: "HH:MM (24h)" },
        with: { type: "string", description: "Who it is with." },
        location: { type: "string", description: "Place, or 'Phone'." },
        notes: { type: "string" },
      },
      required: ["title", "date", "time"],
    },
    execute: (a) => {
      const ap = C.addAppt({ title: String(a.title), date: String(a.date), time: String(a.time), with: a.with ? String(a.with) : undefined, location: a.location ? String(a.location) : undefined, notes: a.notes ? String(a.notes) : undefined });
      C.post(`Scheduled: ${ap.title}, ${C.fmtDate(ap.date)} ${C.fmtTime(ap.time)}${ap.with ? ` with ${ap.with}` : ""}.`, "agent");
      return `Scheduled ${ap.title} (id ${ap.id}) on ${ap.date} ${ap.time}`;
    },
  },
  {
    name: "reschedule_appointment",
    description: "Move an existing appointment to a new date and/or time.",
    inputSchema: {
      type: "object",
      properties: { appointment: { type: "string", description: "Appointment id or title." }, date: { type: "string" }, time: { type: "string" } },
      required: ["appointment", "date"],
    },
    execute: (a) => {
      const ap = C.rescheduleAppt(String(a.appointment), String(a.date), a.time ? String(a.time) : undefined);
      if (!ap) throw new Error(`No appointment matching "${a.appointment}"`);
      C.post(`Moved ${ap.title} to ${C.fmtDate(ap.date)} ${C.fmtTime(ap.time)}.`, "agent");
      return `Rescheduled ${ap.title} to ${ap.date} ${ap.time}`;
    },
  },
  {
    name: "cancel_appointment",
    description: "Cancel an appointment.",
    inputSchema: { type: "object", properties: { appointment: { type: "string" } }, required: ["appointment"] },
    annotations: { destructiveHint: true },
    execute: (a) => {
      const ap = C.cancelAppt(String(a.appointment));
      if (!ap) throw new Error(`No appointment matching "${a.appointment}"`);
      C.post(`Cancelled ${ap.title}.`, "agent");
      return `Cancelled ${ap.title}`;
    },
  },
  {
    name: "assign_task",
    description: "Give a family member a task on a date (e.g. 'Check Mom's blood pressure tonight' → alex, today).",
    inputSchema: {
      type: "object",
      properties: { title: { type: "string" }, assignee: memberEnum, date: { type: "string", description: "YYYY-MM-DD" } },
      required: ["title", "assignee", "date"],
    },
    execute: (a) => {
      const who = C.member(String(a.assignee));
      if (!who) throw new Error(`Unknown family member "${a.assignee}"`);
      const t = C.addTask(String(a.title), who.id, String(a.date), "agent");
      C.post(`Asked ${who.name}: ${t.title} (${C.fmtDate(t.date)}).`, "agent");
      return `Task "${t.title}" assigned to ${who.name} for ${t.date} (id ${t.id})`;
    },
  },
  {
    name: "complete_task",
    description: "Mark a family task as done.",
    inputSchema: { type: "object", properties: { task: { type: "string", description: "Task id or title." } }, required: ["task"] },
    execute: (a) => {
      const t = C.completeTask(String(a.task));
      if (!t) throw new Error(`No task matching "${a.task}"`);
      C.post(`Done: ${t.title}`, C.getState().viewer, "done");
      return `Completed "${t.title}"`;
    },
  },
  {
    name: "notify_family",
    description:
      "Post an update to the family feed and send it to family members' phones. Use urgency 'urgent' only for things that need attention today.",
    inputSchema: {
      type: "object",
      properties: {
        message: { type: "string" },
        urgency: { type: "string", enum: ["low", "normal", "urgent"] },
        to: { type: "array", items: memberEnum, description: "Who to send to. Defaults to everyone except the person who reported." },
      },
      required: ["message"],
    },
    execute: (a) => {
      const st = C.getState();
      const to = ((a.to as string[]) ?? st.members.filter((m) => m.id !== st.viewer).map((m) => m.id)).map((x) => C.member(x)?.name ?? x);
      C.post(String(a.message), "agent", a.urgency === "urgent" ? "alert" : "info", to);
      return `Sent to ${to.join(", ")}: ${a.message}`;
    },
  },
];
