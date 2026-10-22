import type { Progress } from "./dashboard";
import type {
  Chapter,
  StudyData,
  StudyTaskDefinition,
  Subject,
} from "./types/study";

export const DATA_KEY = "cst-study-data-v2";
export const PROGRESS_KEY = "cst-study-matrix-v1";

export interface RecoveryBundle {
  data: StudyData;
  progress?: Progress;
}

export function serializeRecoveryBundle(
  data: StudyData,
  progress: Progress,
): string {
  return JSON.stringify({
    [DATA_KEY]: data,
    [PROGRESS_KEY]: progress,
  }, null, 2);
}

const DEFAULT_CONFIG: StudyData["cfg"] = {
  eyebrow: "CST • SEMESTER PLANNER",
  title: "Study Matrix",
  desc: "Your semester study plan.",
  target: "Consistent progress",
  note: "",
  goal: 100,
  noticeHead: "",
  notice: "",
  footer: "Built for consistent learning.",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isTask(value: unknown): value is StudyTaskDefinition {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.label === "string"
  );
}

function isChapter(value: unknown): value is Chapter {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.mid === "boolean"
  );
}

function isSubject(value: unknown): value is Subject {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    (value.code === undefined || typeof value.code === "string") &&
    Array.isArray(value.chapters) &&
    value.chapters.every(isChapter)
  );
}

function parseConfig(value: unknown): StudyData["cfg"] {
  if (!isRecord(value)) return DEFAULT_CONFIG;

  return {
    eyebrow: typeof value.eyebrow === "string" ? value.eyebrow : DEFAULT_CONFIG.eyebrow,
    title: typeof value.title === "string" ? value.title : DEFAULT_CONFIG.title,
    desc: typeof value.desc === "string" ? value.desc : DEFAULT_CONFIG.desc,
    target: typeof value.target === "string" ? value.target : DEFAULT_CONFIG.target,
    note: typeof value.note === "string" ? value.note : DEFAULT_CONFIG.note,
    goal: typeof value.goal === "number" ? value.goal : DEFAULT_CONFIG.goal,
    noticeHead: typeof value.noticeHead === "string" ? value.noticeHead : DEFAULT_CONFIG.noticeHead,
    notice: typeof value.notice === "string" ? value.notice : DEFAULT_CONFIG.notice,
    footer: typeof value.footer === "string" ? value.footer : DEFAULT_CONFIG.footer,
  };
}

export function parseStudyData(value: unknown): StudyData | null {
  if (!isRecord(value) || !Array.isArray(value.subjects)) return null;
  if (!value.subjects.every(isSubject)) return null;

  const questions = value.q === undefined ? [] : value.q;
  const studyTasks = value.s === undefined ? [] : value.s;
  if (
    !Array.isArray(questions) ||
    !questions.every(isTask) ||
    !Array.isArray(studyTasks) ||
    !studyTasks.every(isTask)
  ) {
    return null;
  }

  return {
    cfg: parseConfig(value.cfg),
    subjects: value.subjects,
    q: questions,
    s: studyTasks,
  };
}

function parseProgress(value: unknown): Progress | null {
  if (!isRecord(value)) return null;
  const entries = Object.entries(value);
  if (
    !entries.every(
      (entry): entry is [string, boolean] => typeof entry[1] === "boolean",
    )
  ) {
    return null;
  }
  return Object.fromEntries(entries);
}

export function parseRecoveryBundle(value: unknown): RecoveryBundle | null {
  if (!isRecord(value)) return null;

  const dataValue = Object.hasOwn(value, DATA_KEY)
    ? value[DATA_KEY]
    : Object.hasOwn(value, "studyData")
      ? value.studyData
      : value;
  const data = parseStudyData(dataValue);
  if (!data) return null;

  const progressValue = Object.hasOwn(value, PROGRESS_KEY)
    ? value[PROGRESS_KEY]
    : value.progress;
  if (progressValue === undefined) return { data };

  const progress = parseProgress(progressValue);
  return progress ? { data, progress } : null;
}

export function canRestorePlan(serverPlanPresent: boolean): boolean {
  return !serverPlanPresent;
}
