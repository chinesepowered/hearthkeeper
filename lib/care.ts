/** Hearthkeeper shared care-plan store. One model, edited by the family and by agents. */

export type MemberId = "mom" | "alex" | "sam";
export type Member = { id: MemberId; name: string; relation: string; color: string; initial: string };

export type Med = {
  id: string;
  name: string;
  dose: string;
  times: string[]; // "HH:MM"
  notes?: string;
  active: boolean;
  startedOn?: string; // YYYY-MM-DD
  taken: Record<string, string[]>; // date -> times taken
};
export type Appt = { id: string; title: string; date: string; time: string; with?: string; location?: string; notes?: string };
export type Task = { id: string; title: string; assignee: MemberId; date: string; done: boolean; by: "agent" | MemberId };
export type Symptom = { id: string; ts: number; text: string; severity: number; by: MemberId | "agent" };
export type Update = { id: string; ts: number; text: string; by: "agent" | MemberId; kind: "info" | "alert" | "done"; sentTo?: string[] };

export type State = {
  person: { name: string; age: number; conditions: string[] };
  members: Member[];
  meds: Med[];
  appts: Appt[];
  tasks: Task[];
  symptoms: Symptom[];
  feed: Update[];
  viewer: MemberId;
  pulse: number; // bumps to flash recently-changed cards
};

const KEY = "hearthkeeper:v3";
const listeners = new Set<() => void>();
let state: State = seed();

export function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
export const getState = () => state;

function emit(save = true) {
  for (const l of listeners) l();
  if (save && typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {}
  }
}
function set(patch: Partial<State>) {
  state = { ...state, ...patch, pulse: state.pulse + 1 };
  emit();
}

export function hydrate() {
  if (typeof localStorage === "undefined") return;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      state = { ...seed(), ...(JSON.parse(raw) as State) };
      emit(false);
    }
  } catch {}
}
export function resetDemo() {
  state = seed();
  emit();
}

/* ---------- dates ---------- */
export function today() {
  return toDate(new Date());
}
export function toDate(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
export function addDays(date: string, n: number) {
  const d = new Date(date + "T12:00:00");
  d.setDate(d.getDate() + n);
  return toDate(d);
}
export function fmtDate(date: string) {
  const d = new Date(date + "T12:00:00");
  const t = today();
  if (date === t) return "Today";
  if (date === addDays(t, 1)) return "Tomorrow";
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
export function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "pm" : "am";
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${ampm}`;
}
function uid() {
  return Math.random().toString(36).slice(2, 9);
}
/** Accept YYYY-MM-DD, 'today', 'tomorrow', or anything Date can parse; fall back to today. */
export function normDate(input: string | undefined): string {
  const t = today();
  if (!input) return t;
  const s = String(input).trim().toLowerCase();
  if (s === "today") return t;
  if (s === "tomorrow") return addDays(t, 1);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  const d = new Date(input);
  return isNaN(d.getTime()) ? t : toDate(d);
}
export function normTime(input: string | undefined): string {
  if (!input) return "09:00";
  const s = String(input).trim().toLowerCase();
  const m = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!m) return "09:00";
  let h = Number(m[1]);
  const min = m[2] ?? "00";
  if (m[3] === "pm" && h < 12) h += 12;
  if (m[3] === "am" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${min}`;
}

/* ---------- seed ---------- */
function seed(): State {
  const t = today();
  const monday = (() => {
    const d = new Date(t + "T12:00:00");
    const day = d.getDay();
    d.setDate(d.getDate() - ((day + 6) % 7));
    return toDate(d);
  })();
  return {
    person: { name: "Margaret", age: 78, conditions: ["High blood pressure", "Type 2 diabetes", "Mild arthritis"] },
    members: [
      { id: "mom", name: "Margaret", relation: "Mom", color: "#c2603d", initial: "M" },
      { id: "alex", name: "Alex", relation: "Daughter", color: "#2f6f5e", initial: "A" },
      { id: "sam", name: "Sam", relation: "Son", color: "#4a5b9c", initial: "S" },
    ],
    meds: [
      { id: "metoprolol", name: "Metoprolol", dose: "50 mg", times: ["08:00", "20:00"], notes: "Blood pressure / heart rate", active: true, taken: { [t]: ["08:00"] } },
      { id: "amlodipine", name: "Amlodipine", dose: "5 mg", times: ["08:00"], notes: "Blood pressure. New from Dr. Osei.", active: true, startedOn: monday, taken: { [t]: ["08:00"] } },
      { id: "metformin", name: "Metformin", dose: "500 mg", times: ["08:00", "18:00"], notes: "With food", active: true, taken: { [t]: ["08:00"] } },
      { id: "vitamin_d", name: "Vitamin D", dose: "1000 IU", times: ["08:00"], active: true, taken: { [t]: ["08:00"] } },
    ],
    appts: [
      { id: "osei", title: "Follow-up with Dr. Osei", date: addDays(t, 5), time: "14:30", with: "Dr. Osei (GP)", location: "Riverside Family Clinic" },
      { id: "physio", title: "Physiotherapy", date: addDays(t, 7), time: "11:00", with: "Priya, physiotherapist", location: "Lakeshore Physio" },
    ],
    tasks: [
      { id: "t1", title: "Call insurance about the new walker", assignee: "alex", date: addDays(t, 1), done: false, by: "alex" },
      { id: "t2", title: "Groceries + refill Metformin", assignee: "sam", date: addDays(t, 2), done: false, by: "sam" },
      { id: "t3", title: "Drive Mom to physio", assignee: "alex", date: addDays(t, 7), done: false, by: "alex" },
    ],
    symptoms: [{ id: "s0", ts: Date.now() - 86400000 * 3, text: "Knee stiff in the morning, better after walking", severity: 2, by: "mom" }],
    feed: [
      { id: "f1", ts: Date.now() - 86400000 * 2, text: "Picked up Metoprolol refill. 90 days.", by: "sam", kind: "done" },
      { id: "f2", ts: Date.now() - 86400000 * 3, text: "Dr. Osei added Amlodipine 5 mg each morning for blood pressure. Started Monday.", by: "alex", kind: "info" },
      { id: "f3", ts: Date.now() - 86400000 * 4, text: "BP at Sunday visit: 138 / 84.", by: "alex", kind: "info" },
    ],
    viewer: "mom",
    pulse: 0,
  };
}

/* ---------- lookups ---------- */
export function member(id: string): Member | undefined {
  const r = id.trim().toLowerCase();
  return state.members.find((m) => m.id === r || m.name.toLowerCase() === r || m.relation.toLowerCase() === r);
}
export function findMed(ref: string) {
  const r = ref.trim().toLowerCase();
  return state.meds.find((m) => m.id === r) ?? state.meds.find((m) => m.name.toLowerCase() === r) ?? state.meds.find((m) => m.name.toLowerCase().includes(r));
}
export function findAppt(ref: string) {
  const r = ref.trim().toLowerCase();
  return state.appts.find((a) => a.id === r) ?? state.appts.find((a) => a.title.toLowerCase().includes(r) || (a.with ?? "").toLowerCase().includes(r));
}
export function findTask(ref: string) {
  const r = ref.trim().toLowerCase();
  return state.tasks.find((t) => t.id === r) ?? state.tasks.find((t) => t.title.toLowerCase().includes(r));
}

/* ---------- actions ---------- */
export function setViewer(v: MemberId) {
  set({ viewer: v });
}

export function post(text: string, by: Update["by"], kind: Update["kind"] = "info", sentTo?: string[]) {
  const u: Update = { id: uid(), ts: Date.now(), text, by, kind, sentTo };
  set({ feed: [u, ...state.feed].slice(0, 100) });
  return u;
}

export function logSymptom(text: string, severity: number, by: Symptom["by"]) {
  const s: Symptom = { id: uid(), ts: Date.now(), text, severity: Math.min(5, Math.max(1, Math.round(severity))), by };
  set({ symptoms: [s, ...state.symptoms] });
  return s;
}

export function addMed(input: { name: string; dose: string; times: string[]; notes?: string }) {
  const m: Med = { id: uid(), name: input.name, dose: input.dose, times: input.times, notes: input.notes, active: true, startedOn: today(), taken: {} };
  set({ meds: [...state.meds, m] });
  return m;
}
export function updateMed(ref: string, patch: Partial<Pick<Med, "dose" | "times" | "notes" | "active">>) {
  const m = findMed(ref);
  if (!m) return null;
  set({ meds: state.meds.map((x) => (x.id === m.id ? { ...x, ...patch } : x)) });
  return findMed(m.id)!;
}
export function markTaken(ref: string, time?: string, date = today()) {
  const m = findMed(ref);
  if (!m) return null;
  const slot = time ?? m.times.find((t) => !(m.taken[date] ?? []).includes(t)) ?? m.times[0];
  const taken = { ...m.taken, [date]: Array.from(new Set([...(m.taken[date] ?? []), slot])) };
  set({ meds: state.meds.map((x) => (x.id === m.id ? { ...x, taken } : x)) });
  return { med: m, slot };
}
export function toggleTaken(ref: string, time: string, date = today()) {
  const m = findMed(ref);
  if (!m) return;
  const cur = m.taken[date] ?? [];
  const next = cur.includes(time) ? cur.filter((t) => t !== time) : [...cur, time];
  set({ meds: state.meds.map((x) => (x.id === m.id ? { ...x, taken: { ...x.taken, [date]: next } } : x)) });
}

export function addAppt(input: Omit<Appt, "id">) {
  const a: Appt = { id: uid(), ...input, date: normDate(input.date), time: normTime(input.time) };
  set({ appts: [...state.appts, a].sort((x, y) => (x.date + x.time).localeCompare(y.date + y.time)) });
  return a;
}
export function rescheduleAppt(ref: string, date: string, time?: string) {
  const a = findAppt(ref);
  if (!a) return null;
  set({ appts: state.appts.map((x) => (x.id === a.id ? { ...x, date: normDate(date), time: time ? normTime(time) : x.time } : x)).sort((x, y) => (x.date + x.time).localeCompare(y.date + y.time)) });
  return findAppt(a.id)!;
}
export function cancelAppt(ref: string) {
  const a = findAppt(ref);
  if (!a) return null;
  set({ appts: state.appts.filter((x) => x.id !== a.id) });
  return a;
}

export function addTask(title: string, assignee: MemberId, date: string, by: Task["by"]) {
  const t: Task = { id: uid(), title, assignee, date: normDate(date), done: false, by };
  set({ tasks: [...state.tasks, t].sort((x, y) => x.date.localeCompare(y.date)) });
  return t;
}
export function completeTask(ref: string, done = true) {
  const t = findTask(ref);
  if (!t) return null;
  set({ tasks: state.tasks.map((x) => (x.id === t.id ? { ...x, done } : x)) });
  return t;
}

/* ---------- knowledge: a small interaction / side-effect table ---------- */
const PAIRS: { a: string; b: string; note: string }[] = [
  { a: "amlodipine", b: "metoprolol", note: "Both lower blood pressure. Taken together, dizziness or light-headedness when standing up is a common additive effect, especially in the first one to two weeks of a new dose. Typical advice: check blood pressure sitting and standing, stand up slowly, and ask the prescriber whether the doses should be taken at different times of day." },
  { a: "warfarin", b: "ibuprofen", note: "NSAIDs with warfarin raise bleeding risk. Avoid unless the prescriber approves." },
  { a: "warfarin", b: "aspirin", note: "Aspirin with warfarin raises bleeding risk." },
  { a: "lisinopril", b: "potassium", note: "ACE inhibitors with potassium supplements can push potassium too high." },
  { a: "simvastatin", b: "amlodipine", note: "Amlodipine raises simvastatin levels; simvastatin is usually capped at 20 mg alongside it." },
  { a: "metformin", b: "alcohol", note: "Alcohol with metformin raises the risk of low blood sugar and lactic acidosis." },
];
const SINGLES: Record<string, string> = {
  amlodipine: "Common early side effects: dizziness, flushing, headache, swollen ankles. Usually settles in a couple of weeks.",
  metoprolol: "Common side effects: tiredness, dizziness, slow pulse, cold hands.",
  metformin: "Common side effects: stomach upset, especially without food.",
  lisinopril: "Common side effects: dry cough, dizziness on standing.",
};

export function checkInteractions(names?: string[]) {
  const list = (names && names.length ? names : state.meds.filter((m) => m.active).map((m) => m.name)).map((n) => n.toLowerCase());
  const findings: string[] = [];
  for (const p of PAIRS) {
    if (list.some((n) => n.includes(p.a)) && list.some((n) => n.includes(p.b))) findings.push(`${cap(p.a)} + ${cap(p.b)}: ${p.note}`);
  }
  for (const n of list) {
    const k = Object.keys(SINGLES).find((s) => n.includes(s));
    if (k) findings.push(`${cap(k)}: ${SINGLES[k]}`);
  }
  return findings;
}
function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function summary() {
  const t = today();
  return {
    today: t,
    person: state.person,
    family: state.members.map((m) => ({ id: m.id, name: m.name, relation: m.relation })),
    viewer: state.viewer,
    medications: state.meds.map((m) => ({ id: m.id, name: m.name, dose: m.dose, times: m.times, notes: m.notes, active: m.active, startedOn: m.startedOn, takenToday: m.taken[t] ?? [] })),
    appointments: state.appts.map((a) => ({ id: a.id, title: a.title, date: a.date, time: a.time, with: a.with, location: a.location, notes: a.notes })),
    tasks: state.tasks.map((x) => ({ id: x.id, title: x.title, assignee: x.assignee, date: x.date, done: x.done })),
    recentSymptoms: state.symptoms.slice(0, 8).map((s) => ({ when: new Date(s.ts).toISOString().slice(0, 16), text: s.text, severity: s.severity, by: s.by })),
    recentUpdates: state.feed.slice(0, 6).map((u) => ({ when: new Date(u.ts).toISOString().slice(0, 16), by: u.by, text: u.text })),
  };
}
