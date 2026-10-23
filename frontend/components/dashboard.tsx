"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "./app-shell";

type Task = { id: string };
type Chapter = { id: string; title: string };
type Subject = { id: string; name: string; chapters: Chapter[] };
type StudyData = {
  subjects: Subject[];
  q: Task[];
  s: Task[];
  cfg?: { goal?: number };
};
type Overview = {
  chapters: number;
  subjects: number;
  completedChapters: number;
  completedTasks: number;
  totalTasks: number;
  focusSessions: number;
  goal: number;
  completion: number;
  nextSubject: string;
  nextChapter: string;
  dailyActivity: number[];
};

const DEFAULT_SUBJECTS = 6;
const DEFAULT_CHAPTERS = 70;
const DEFAULT_TASKS_PER_CHAPTER = 8;
const FIRST_CHAPTER = "Basic Concepts of Social Science";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isTask(value: unknown): value is Task {
  return isRecord(value) && typeof value.id === "string";
}

function isChapter(value: unknown): value is Chapter {
  return isRecord(value) && typeof value.id === "string" && typeof value.title === "string";
}

function isSubject(value: unknown): value is Subject {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    Array.isArray(value.chapters) &&
    value.chapters.every(isChapter)
  );
}

function isStudyData(value: unknown): value is StudyData {
  return (
    isRecord(value) &&
    Array.isArray(value.subjects) &&
    value.subjects.every(isSubject) &&
    Array.isArray(value.q) &&
    value.q.every(isTask) &&
    Array.isArray(value.s) &&
    value.s.every(isTask)
  );
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function calculateOverview(states: Record<string, unknown>): Overview {
  const data = isStudyData(states["cst-study-data-v2"]) ? states["cst-study-data-v2"] : null;
  const progressValue = states["cst-study-matrix-v1"];
  const progress = isRecord(progressValue) ? progressValue : {};
  const subjects = data?.subjects ?? [];
  const chapters = subjects.flatMap((subject) =>
    subject.chapters.map((chapter) => ({ ...chapter, subject: subject.name })),
  );
  const taskIds = data ? [...data.q, ...data.s].map((task) => task.id) : [];
  const chapterCount = data ? chapters.length : DEFAULT_CHAPTERS;
  const subjectCount = data ? subjects.length : DEFAULT_SUBJECTS;
  const taskCount = data ? taskIds.length : DEFAULT_TASKS_PER_CHAPTER;
  const isComplete = (chapterId: string) =>
    taskCount > 0 && taskIds.every((taskId) => progress[`${chapterId}::${taskId}`] === true);
  const completedTasks = data
    ? chapters.reduce(
        (count, chapter) =>
          count + taskIds.filter((taskId) => progress[`${chapter.id}::${taskId}`] === true).length,
        0,
      )
    : 0;
  const completedChapters = data ? chapters.filter((chapter) => isComplete(chapter.id)).length : 0;
  const totalTasks = chapterCount * taskCount;
  const completion = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const config = data?.cfg;
  const goal = config && typeof config.goal === "number" ? config.goal : 80;
  const next = chapters.find((chapter) => !isComplete(chapter.id));
  const focusState = states["cst-fx-v1"];
  const focusSessions =
    isRecord(focusState) && typeof focusState.focusDone === "number" ? focusState.focusDone : 0;
  const days =
    isRecord(focusState) && isRecord(focusState.days) ? focusState.days : {};
  const dailyActivity = Array.from({ length: 24 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (23 - index));
    const value = days[dayKey(date)];
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
  });

  return {
    chapters: chapterCount,
    subjects: subjectCount,
    completedChapters,
    completedTasks,
    totalTasks,
    focusSessions,
    goal,
    completion,
    nextSubject: next?.subject ?? (completedChapters === chapterCount ? "All subjects complete" : "Social Science"),
    nextChapter: next?.title ?? (completedChapters === chapterCount ? "Your syllabus is complete" : FIRST_CHAPTER),
    dailyActivity,
  };
}

export function DashboardOverview() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/study/state", { credentials: "same-origin", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Could not load study progress (HTTP ${response.status}).`);
        const body: unknown = await response.json();
        if (!isRecord(body) || !isRecord(body.states)) throw new Error("Study progress response is invalid.");
        setOverview(calculateOverview(body.states));
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : "Could not load study progress.");
        }
      });
    return () => controller.abort();
  }, []);

  const progress = overview?.completion ?? 0;
  const chartMaximum = Math.max(1, ...(overview?.dailyActivity ?? []));

  return (
    <AppShell>
      <header className="heroDash">
        <div>
          <p className="eyebrow">Personal learning dashboard · 2026</p>
          <h1>Your study<br /><em>command centre.</em></h1>
          <p className="intro">A Grafana-inspired overview of syllabus coverage, study activity and your next best task.</p>
          <div className="heroActions">
            <Link className="primary" href="/matrix">Open study matrix →</Link>
            <Link className="secondary" href="/admin">Manage syllabus</Link>
          </div>
        </div>
        <div
          className="orb"
          role="img"
          aria-label={`${progress}% syllabus coverage`}
          style={{ background: `conic-gradient(var(--cyan) ${progress * 3.6}deg, #ffffff11 ${progress * 3.6}deg 360deg)` }}
        >
          <b>{overview ? `${progress}%` : "…"}</b><span>coverage</span>
        </div>
      </header>
      {error && <p className="error" role="alert">{error}</p>}
      <section className="metricGrid">
        <article><small>CHAPTERS / UNITS</small><b>{overview?.chapters ?? "…"}</b><span>{overview?.subjects ?? "…"} subjects · {overview?.completedChapters ?? 0} complete</span></article>
        <article><small>TASKS COMPLETED</small><b>{overview ? `${overview.completion}%` : "…"}</b><span>{overview?.completedTasks ?? 0} of {overview?.totalTasks ?? "…"} tasks</span></article>
        <article><small>TARGET COVERAGE</small><b>{overview ? `${overview.goal}%` : "…"}</b><span className="progress"><i style={{ width: `${overview?.goal ?? 0}%` }} /></span></article>
        <article><small>FOCUS SESSIONS</small><b>{overview?.focusSessions ?? "…"}</b><span>Completed focus blocks</span></article>
      </section>
      <section className="dashGrid">
        <article className="monitor large">
          <div><p className="eyebrow">Coverage telemetry</p><h2>Study activity</h2></div>
          <div className="chart" role="img" aria-label="Daily study activity over the last 24 days">
            {(overview?.dailyActivity ?? Array(24).fill(0)).map((count, index) => (
              <i key={index} title={`${count} tasks completed`} style={{ height: `${Math.max(4, (count / chartMaximum) * 100)}%` }} />
            ))}
          </div>
          <small>{overview ? "Daily completed tasks from your saved study progress." : "Loading study activity…"}</small>
        </article>
        <article className="monitor">
          <p className="eyebrow">Next up</p>
          <h2>{overview?.nextChapter ?? "Loading your next chapter…"}</h2>
          <p>{overview?.nextSubject ?? "Reading saved syllabus"} · Continue with the first unfinished chapter.</p>
          <Link className="primary compact" href="/matrix">Go to Matrix</Link>
        </article>
        <article className="monitor">
          <p className="eyebrow">System status</p>
          {["Daily completion", "Study velocity", "Focus load", "Target confidence"].map((signal) => (
            <div className="signal" key={signal}><span />{signal}<b>{overview ? "Live" : "Loading"}</b></div>
          ))}
        </article>
      </section>
    </AppShell>
  );
}
