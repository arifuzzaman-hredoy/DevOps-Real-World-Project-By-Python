import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type FormEvent,
} from "react";
import "./App.css";
import {
  buildDashboardAnalytics,
  chapterTaskKey,
  type Progress,
} from "./dashboard";
import {
  studyApi,
  type StudyStateKey,
} from "./services/api";
import {
  canRestorePlan,
  DATA_KEY,
  parseRecoveryBundle,
  parseStudyData,
  PROGRESS_KEY,
  serializeRecoveryBundle,
  type RecoveryBundle,
} from "./recovery";
import type {
  Chapter,
  StudyData,
  StudyStateResponse,
  StudyTaskDefinition,
} from "./types/study";

function parseProgress(value: unknown): Progress {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, boolean] =>
      typeof entry[1] === "boolean",
    ),
  );
}

function readLocalState(key: StudyStateKey): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? undefined : JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function getTasks(data: StudyData): StudyTaskDefinition[] {
  const tasks = [...data.s, ...data.q];
  return tasks.length > 0 ? tasks : [{ id: "study", label: "Study chapter" }];
}

function safeNextPath(): string {
  const next = new URLSearchParams(window.location.search).get("next");
  return next?.startsWith("/") && !next.startsWith("//") ? next : "/";
}

function LoginPage() {
  const [csrf, setCsrf] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    void studyApi.getLoginCsrf()
      .then(({ csrf_token }) => {
        if (active) setCsrf(csrf_token);
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(caught instanceof Error ? caught.message : "Could not start a secure sign-in session.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await studyApi.login(password, csrf);
      window.location.assign(safeNextPath());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <a className="login-brand" href="/" aria-label="TaskFlow home">
          <span className="brand-mark">T</span>
          <span>TaskFlow <small>ACADEMIC WORKSPACE</small></span>
        </a>
        <p className="eyebrow">YOUR SEMESTER, IN FOCUS</p>
        <h1 id="login-title">Welcome back.</h1>
        <p className="login-copy">Sign in to continue with your subjects, study plan, and saved progress.</p>
        {error && <div className="notice error-notice" role="alert">{error}</div>}
        <form className="login-form" onSubmit={(event) => void submit(event)}>
          <label htmlFor="study-password">Study app password</label>
          <input
            id="study-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            autoFocus
          />
          <button className="primary-button login-submit" type="submit" disabled={loading || submitting || !csrf}>
            {loading ? "Preparing secure sign-in…" : submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="login-security">Your session is protected with a server-verified CSRF token.</p>
      </section>
    </main>
  );
}

function LoadingScreen() {
  return (
    <main className="loading-screen">
      <div className="loader" aria-hidden="true" />
      <p>Loading your study workspace…</p>
    </main>
  );
}

function percent(completed: number, total: number): number {
  return total === 0 ? 0 : Math.round((completed / total) * 100);
}

function countTaskProgress(tasks: { completed: number; total: number }[]) {
  return tasks.reduce(
    (result, task) => ({
      completed: result.completed + task.completed,
      total: result.total + task.total,
    }),
    { completed: 0, total: 0 },
  );
}

function formatTimestamp(value?: string): string {
  if (!value) return "No saved progress timestamp yet";
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) return "Saved timestamp unavailable";
  return timestamp.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function DashboardApp() {
  const [csrf, setCsrf] = useState("");
  const [studyData, setStudyData] = useState<StudyData | null>(null);
  const [progress, setProgress] = useState<Progress>({});
  const [localRecovery, setLocalRecovery] = useState<RecoveryBundle | null>(null);
  const [stateUpdatedAt, setStateUpdatedAt] = useState<string>();
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState<"all" | "mid" | "extra">("all");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [activeSection, setActiveSection] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverPlanPresent, setServerPlanPresent] = useState(false);
  const [serverProgressPresent, setServerProgressPresent] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const csrfResponse = await studyApi.getCsrf();
      setCsrf(csrfResponse.csrf_token);

      const remote: StudyStateResponse = await studyApi.getState();
      const serverHasPlan = Object.hasOwn(remote.states, DATA_KEY);
      const serverHasProgress = Object.hasOwn(remote.states, PROGRESS_KEY);
      const data = parseStudyData(remote.states[DATA_KEY]);
      const savedProgress = parseProgress(remote.states[PROGRESS_KEY]);
      const localData = readLocalState(DATA_KEY);
      const localProgress = readLocalState(PROGRESS_KEY);
      const localBundle = parseRecoveryBundle({
        [DATA_KEY]: localData,
        ...(localProgress === undefined ? {} : { [PROGRESS_KEY]: localProgress }),
      });

      setServerPlanPresent(serverHasPlan);
      setServerProgressPresent(serverHasProgress);
      setLocalRecovery(localBundle);
      setStateUpdatedAt(
        remote.updated_at[PROGRESS_KEY] ?? remote.updated_at[DATA_KEY],
      );
      setStudyData(data);
      setProgress(savedProgress);
      setMessage(data ? "Your saved study plan is up to date." : "");
      setError(
        serverHasPlan && !data
          ? "A saved server-side study plan exists but could not be read. It has not been changed; importing is disabled to protect it."
          : "",
      );
      setHasLoaded(true);
    } catch (caught) {
      if (!(caught instanceof Error && caught.message === "Authentication required")) {
        setError(caught instanceof Error ? caught.message : "Could not load study data.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const analytics = useMemo(
    () => studyData ? buildDashboardAnalytics(studyData, progress) : null,
    [studyData, progress],
  );
  const tasks = useMemo(
    () => studyData ? getTasks(studyData) : [],
    [studyData],
  );

  const filteredSubjects = useMemo(() => {
    if (!studyData) return [];

    const query = search.trim().toLowerCase();

    return studyData.subjects
      .map((subject, subjectIndex) => ({
        ...subject,
        subjectIndex,
        chapters: subject.chapters
          .map((chapter, chapterIndex) => ({ chapter, chapterIndex }))
          .filter(({ chapter }) => {
            const matchesSearch =
              !query ||
              subject.name.toLowerCase().includes(query) ||
              chapter.title.toLowerCase().includes(query);
            const matchesScope =
              scope === "all" ||
              (scope === "mid" && chapter.mid) ||
              (scope === "extra" && !chapter.mid);
            const matchesSubject =
              !subjectFilter || subject.id === subjectFilter;
            return matchesSearch && matchesScope && matchesSubject;
          }),
      }))
      .filter((subject) => subject.chapters.length > 0);
  }, [studyData, search, scope, subjectFilter]);

  async function toggleTask(
    subjectIndex: number,
    chapterIndex: number,
    taskId: string,
  ) {
    if (!csrf || saving) return;

    const key = chapterTaskKey(subjectIndex, chapterIndex, taskId);
    const next = { ...progress, [key]: !progress[key] };
    setProgress(next);
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const saved = await studyApi.saveState(PROGRESS_KEY, next, csrf);
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(next));
      setStateUpdatedAt(saved.updated_at ?? undefined);
      setMessage("Progress saved to your account.");
    } catch (caught) {
      setProgress(progress);
      setError(caught instanceof Error ? caught.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function restorePlan(bundle: RecoveryBundle) {
    if (!csrf || saving || !canRestorePlan(serverPlanPresent)) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      let nextProgress = progress;
      if (!serverProgressPresent && bundle.progress) {
        await studyApi.saveState(PROGRESS_KEY, bundle.progress, csrf);
        nextProgress = bundle.progress;
        setServerProgressPresent(true);
      }

      const saved = await studyApi.saveState(DATA_KEY, bundle.data, csrf);
      setStudyData(bundle.data);
      setProgress(nextProgress);
      setServerPlanPresent(true);
      setStateUpdatedAt(saved.updated_at ?? undefined);
      setMessage(
        serverProgressPresent && bundle.progress
          ? "Study plan restored. Existing server-side progress was preserved."
          : "Study plan restored to your account.",
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not restore the study plan.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRecoveryFile(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      setError("The recovery file is larger than the 4 MiB limit.");
      return;
    }

    try {
      const bundle = parseRecoveryBundle(JSON.parse(await file.text()));
      if (!bundle) {
        throw new Error("This file is not a supported Study Matrix backup.");
      }
      setLocalRecovery(bundle);
      await restorePlan(bundle);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not read the recovery file.");
    }
  }

  async function logout() {
    if (!csrf) return;
    setError("");
    try {
      await studyApi.logout(csrf);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Logout failed.");
    }
  }

  function downloadBackup() {
    if (!studyData) return;
    try {
      const backup = serializeRecoveryBundle(studyData, progress);
      const url = URL.createObjectURL(
        new Blob([backup], { type: "application/json" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = "taskflow-study-backup.json";
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage("A JSON backup of your saved plan and progress was downloaded.");
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not export your study backup.");
    }
  }

  function openSubject(subjectId: string) {
    setSubjectFilter(subjectId);
    setActiveSection("matrix");
    document.getElementById("matrix")?.scrollIntoView({ behavior: "smooth" });
  }

  function navLink(id: string, label: string, icon: string) {
    return (
      <a
        className={activeSection === id ? "nav-link active" : "nav-link"}
        href={`#${id}`}
        key={id}
        onClick={() => setActiveSection(id)}
      >
        <span className="nav-icon" aria-hidden="true">{icon}</span>
        <span>{label}</span>
      </a>
    );
  }

  if (loading) return <LoadingScreen />;

  if (!hasLoaded) {
    return (
      <main className="empty-app">
        <section className="empty-state" aria-labelledby="load-error-title">
          <p className="eyebrow">ACADEMIC WORKSPACE</p>
          <h1 id="load-error-title">Study data could not be loaded.</h1>
          <p>Check your connection and try again. No saved data was changed.</p>
          {error && <div className="notice error-notice" role="alert">{error}</div>}
          <button className="primary-button" onClick={() => void load()}>Retry loading</button>
        </section>
      </main>
    );
  }

  if (!studyData || !analytics) {
    return (
      <main className="empty-app">
        <section className="empty-state" aria-labelledby="empty-title">
          <div className="empty-icon" aria-hidden="true">◈</div>
          <p className="eyebrow">ACADEMIC WORKSPACE</p>
          <h1 id="empty-title">{serverPlanPresent ? "Your saved plan needs attention." : "Your study plan is waiting."}</h1>
          <p>{serverPlanPresent
            ? "The account contains saved plan data that this version cannot read. It has been preserved."
            : "No study plan is saved in your account. Restore a verified browser copy or choose a Study Matrix JSON backup."}</p>
          {error && <div className="notice error-notice" role="alert">{error}</div>}
          {message && <div className="notice" role="status">{message}</div>}
          {!serverPlanPresent && localRecovery && (
            <button
              className="primary-button"
              disabled={saving}
              onClick={() => void restorePlan(localRecovery)}
            >
              {saving ? "Restoring…" : "Restore this browser’s saved plan"}
            </button>
          )}
          {!serverPlanPresent && (
            <div className="recovery-upload">
              <label htmlFor="study-plan-file">Choose a Study Matrix JSON backup</label>
              <input
                id="study-plan-file"
                type="file"
                accept="application/json,.json"
                disabled={saving}
                onChange={(event) => void handleRecoveryFile(event)}
              />
              <p>Supported formats: a saved Study Matrix plan, or an object containing “cst-study-data-v2” and optionally “cst-study-matrix-v1”.</p>
            </div>
          )}
          <button className="secondary-button" disabled={loading || saving} onClick={() => void load()}>
            Reload saved data
          </button>
        </section>
      </main>
    );
  }

  const chapterCompletion = percent(
    analytics.completedChapters,
    analytics.totalChapters,
  );
  const questionCompletion = percent(
    analytics.questionsCompleted,
    analytics.questionsTotal,
  );
  const chapterStatuses = [
    { label: "Complete", count: analytics.completedChapters, className: "complete" },
    { label: "In progress", count: analytics.inProgressChapters, className: "in-progress" },
    { label: "Pending", count: analytics.pendingChapters, className: "pending" },
  ];
  const revisionProgress = countTaskProgress(analytics.revisionTasks);
  const assignmentProgress = countTaskProgress(analytics.assignmentTasks);
  const examProgress = countTaskProgress(analytics.examTasks);

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Main navigation">
        <a className="brand" href="#dashboard" aria-label="TaskFlow dashboard">
          <span className="brand-mark">T</span>
          <span><strong>TaskFlow</strong><small>ACADEMIC WORKSPACE</small></span>
        </a>
        <div className="sidebar-label">YOUR SEMESTER</div>
        <nav className="navigation">
          {navLink("dashboard", "Master dashboard", "▦")}
          {navLink("subjects", "Subjects", "◫")}
          {navLink("matrix", "Study Matrix", "▤")}
          {navLink("chapters", "Chapter analytics", "◷")}
          {navLink("questions", "Questions & practice", "◇")}
          {navLink("revision", "Revision planner", "↻")}
          {navLink("exams", "Exam preparation", "⌑")}
          {navLink("assignments", "Assignments & practicals", "✓")}
          {navLink("activity", "Study analytics", "⌁")}
          {navLink("goals", "Goals & achievements", "✧")}
          {navLink("settings", "Settings", "⚙")}
        </nav>
        <div className="sidebar-bottom">
          <span className="connection-indicator" aria-hidden="true" />
          <span>Private study workspace</span>
          <button className="logout-button" onClick={() => void logout()}>Log out</button>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">{studyData.cfg.eyebrow || "SEMESTER OVERVIEW"}</p>
            <h1>{studyData.cfg.title || "Your academic dashboard"}</h1>
            <p className="subtitle">
              {studyData.cfg.desc || "A clear view of your saved study progress."}
            </p>
          </div>
          <div className="topbar-actions">
            <div className="user-chip">
              <span aria-hidden="true">S</span>
              <div><strong>Student</strong><small>Personal workspace</small></div>
            </div>
            <button className="icon-button" onClick={() => void load()} aria-label="Reload study data" title="Reload study data">↻</button>
          </div>
        </header>

        {error && <div className="notice error-notice" role="alert">{error}</div>}
        <div className="status-line" role="status" aria-live="polite">
          <span className={saving ? "connection-indicator saving" : "connection-indicator"} />
          {saving ? "Saving your changes…" : message || "Progress is stored in your account."}
        </div>

        <section id="dashboard" className="dashboard-section hero-section">
          <div className="hero-copy">
            <p className="eyebrow">MASTER DASHBOARD</p>
            <h2>Your semester,<br /><span>in focus.</span></h2>
            <p>See what is complete, what needs attention, and where to make your next move.</p>
            <a className="text-link" href="#matrix" onClick={() => setActiveSection("matrix")}>
              Continue studying <span aria-hidden="true">→</span>
            </a>
          </div>
          <div className="hero-progress" aria-label={`${chapterCompletion}% of chapters complete`}>
            <div className="progress-ring" style={{ "--progress": `${chapterCompletion}%` } as CSSProperties}>
              <div><strong>{chapterCompletion}%</strong><span>chapters done</span></div>
            </div>
            <p>{analytics.completedChapters} of {analytics.totalChapters} chapters complete</p>
          </div>
          <div className="hero-decoration" aria-hidden="true">✳</div>
        </section>

        <section className="metric-grid" aria-label="Academic overview">
          <article className="metric-card">
            <span className="metric-icon violet" aria-hidden="true">◫</span>
            <span className="metric-label">SUBJECTS</span>
            <strong>{analytics.subjects.length}</strong>
            <small>In your saved plan</small>
          </article>
          <article className="metric-card">
            <span className="metric-icon mint" aria-hidden="true">✓</span>
            <span className="metric-label">COMPLETED CHAPTERS</span>
            <strong>{analytics.completedChapters}<small> / {analytics.totalChapters}</small></strong>
            <small>{analytics.inProgressChapters} currently in progress</small>
          </article>
          <article className="metric-card">
            <span className="metric-icon amber" aria-hidden="true">◇</span>
            <span className="metric-label">QUESTION PRACTICE</span>
            <strong>{analytics.questionsCompleted}<small> / {analytics.questionsTotal}</small></strong>
            <small>{questionCompletion}% of saved question tasks</small>
          </article>
          <article className="metric-card">
            <span className="metric-icon blue" aria-hidden="true">↗</span>
            <span className="metric-label">STUDY TASKS</span>
            <strong>{analytics.completedTasks}<small> / {analytics.totalTasks}</small></strong>
            <small>{analytics.taskCompletion}% complete across the plan</small>
          </article>
        </section>

        <section className="dashboard-grid">
          <article id="chapters" className="panel chapter-overview">
            <div className="panel-heading">
              <div><p className="eyebrow">CHAPTER BREAKDOWN</p><h2>Progress at a glance</h2></div>
              <a href="#matrix" onClick={() => setActiveSection("matrix")}>View matrix <span aria-hidden="true">→</span></a>
            </div>
            <div className="status-total">
              <strong>{analytics.totalChapters}</strong><span>chapters in your plan</span>
            </div>
            <div className="stacked-bar" role="img" aria-label={`${analytics.completedChapters} complete, ${analytics.inProgressChapters} in progress, ${analytics.pendingChapters} pending`}>
              {chapterStatuses.map((status) => (
                <span
                  className={`stack-segment ${status.className}`}
                  key={status.label}
                  style={{ width: `${percent(status.count, analytics.totalChapters)}%` }}
                />
              ))}
            </div>
            <div className="legend-list">
              {chapterStatuses.map((status) => (
                <div className="legend-item" key={status.label}>
                  <span className={`legend-dot ${status.className}`} />
                  <span>{status.label}</span><strong>{status.count}</strong>
                </div>
              ))}
            </div>
            <div className="plan-sync">
              <span className="sync-icon" aria-hidden="true">↻</span>
              <div><strong>Saved progress</strong><small>Last recorded update: {formatTimestamp(stateUpdatedAt)}</small></div>
            </div>
          </article>

          <article id="questions" className="panel question-overview">
            <div className="panel-heading">
              <div><p className="eyebrow">PRACTICE</p><h2>Question preparation</h2></div>
              <span className="panel-badge">{questionCompletion}%</span>
            </div>
            {analytics.questionCategories.length ? (
              <div className="category-list">
                {analytics.questionCategories.map((category) => (
                  <div className="category-row" key={category.id}>
                    <div className="category-copy"><strong>{category.label}</strong><span>{category.completed} of {category.total} saved tasks</span></div>
                    <div className="category-progress" role="progressbar" aria-label={category.label} aria-valuemin={0} aria-valuemax={category.total} aria-valuenow={category.completed}>
                      <span style={{ width: `${percent(category.completed, category.total)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="compact-empty"><span aria-hidden="true">◇</span><p>Question tasks are not configured in this study plan yet.</p></div>
            )}
            <p className="data-note">Counts reflect the question tasks and completion marks saved in your Study Matrix.</p>
          </article>
        </section>

        <section id="subjects" className="panel subjects-panel dashboard-section">
          <div className="panel-heading">
            <div><p className="eyebrow">SUBJECT PERFORMANCE</p><h2>Your subjects</h2><p className="panel-description">Chapter completion is calculated from saved task marks, not estimates.</p></div>
            <span className="subject-count">{analytics.subjects.length} subjects</span>
          </div>
          {analytics.subjects.length === 0 ? (
            <div className="compact-empty"><span aria-hidden="true">◫</span><p>No subjects are included in the saved study plan.</p></div>
          ) : (
            <div className="subject-grid">
              {analytics.subjects.map((subject) => (
                <article className="subject-tile" key={subject.id}>
                  <div className="subject-tile-heading">
                    <span className="subject-monogram">{String(subject.subjectIndex + 1).padStart(2, "0")}</span>
                    <div><h3>{subject.name}</h3><small>{subject.code || `Subject ${String(subject.subjectIndex + 1).padStart(2, "0")}`}</small></div>
                    <strong className="subject-percent">{subject.completion}%</strong>
                  </div>
                  <div className="progress-track" role="progressbar" aria-label={`${subject.name} chapter completion`} aria-valuemin={0} aria-valuemax={subject.totalChapters} aria-valuenow={subject.completedChapters}>
                    <span style={{ width: `${subject.completion}%` }} />
                  </div>
                  <div className="subject-breakdown">
                    <span><i className="legend-dot complete" />{subject.completedChapters} done</span>
                    <span><i className="legend-dot in-progress" />{subject.inProgressChapters} active</span>
                    <span><i className="legend-dot pending" />{subject.pendingChapters} pending</span>
                  </div>
                  <div className="subject-meta">
                    <span>{subject.totalChapters} chapters</span>
                    {subject.questionsTotal > 0 && <span>{subject.questionsCompleted}/{subject.questionsTotal} questions</span>}
                  </div>
                  {subject.nextAction && <p className="next-action"><span aria-hidden="true">↳</span> Next: {subject.nextAction}</p>}
                  <button className="subject-action" onClick={() => openSubject(subject.id)}>
                    Open subject in matrix <span aria-hidden="true">→</span>
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="dashboard-grid tracking-grid">
          <article id="revision" className="panel tracking-panel dashboard-section">
            <div className="panel-heading"><div><p className="eyebrow">RECALL & RETENTION</p><h2>Revision planner</h2></div><span className="metric-icon violet" aria-hidden="true">↻</span></div>
            {revisionProgress.total > 0 ? (
              <TrackingSummary label="Revision tasks" progress={revisionProgress} />
            ) : (
              <UnavailableState text="Revision schedules and due dates are not stored in the current study data." />
            )}
          </article>
          <article id="exams" className="panel tracking-panel dashboard-section">
            <div className="panel-heading"><div><p className="eyebrow">ASSESSMENT</p><h2>Exam preparation</h2></div><span className="metric-icon amber" aria-hidden="true">⌑</span></div>
            {examProgress.total > 0 ? (
              <TrackingSummary label="Exam preparation tasks" progress={examProgress} />
            ) : (
              <UnavailableState text="No exam dates or preparation results are recorded in the current data model." />
            )}
          </article>
          <article id="assignments" className="panel tracking-panel dashboard-section">
            <div className="panel-heading"><div><p className="eyebrow">COURSEWORK</p><h2>Assignments & practicals</h2></div><span className="metric-icon mint" aria-hidden="true">✓</span></div>
            {assignmentProgress.total > 0 ? (
              <TrackingSummary label="Assignment and practical tasks" progress={assignmentProgress} />
            ) : (
              <UnavailableState text="Assignment and practical completion is not configured in the saved matrix tasks." />
            )}
          </article>
          <article id="goals" className="panel tracking-panel dashboard-section">
            <div className="panel-heading"><div><p className="eyebrow">MILESTONES</p><h2>Goals & achievements</h2></div><span className="metric-icon blue" aria-hidden="true">✧</span></div>
            <UnavailableState text="The current project does not persist goal targets or achievement history, so none are inferred here." />
          </article>
        </section>

        <section id="activity" className="panel activity-panel dashboard-section">
          <div className="panel-heading"><div><p className="eyebrow">CONSISTENCY</p><h2>Study activity</h2></div><span className="metric-icon blue" aria-hidden="true">⌁</span></div>
          <div className="activity-empty">
            <span className="activity-mark" aria-hidden="true">⌁</span>
            <div><strong>Activity history is not available yet.</strong><p>The app stores the latest study-state update, but not dated task events. Streaks and daily/weekly charts would otherwise be guesses.</p></div>
            <div className="last-saved"><small>LAST SAVED</small><strong>{formatTimestamp(stateUpdatedAt)}</strong></div>
          </div>
        </section>

        {studyData.cfg.notice && (
          <section className="notice study-note">
            <strong>{studyData.cfg.noticeHead || "Study note"}</strong>
            <p>{studyData.cfg.notice}</p>
          </section>
        )}

        <section id="matrix" className="panel matrix-panel dashboard-section">
          <div className="panel-heading matrix-heading">
            <div><p className="eyebrow">YOUR SOURCE OF TRUTH</p><h2>Study Matrix</h2><p className="panel-description">Mark a task complete to update the dashboard after the save succeeds.</p></div>
            <span className="matrix-save-state">{saving ? "Saving…" : "Synced to account"}</span>
          </div>
          <div className="matrix-controls">
            <label className="search-control">
              <span className="visually-hidden">Search subjects and chapters</span>
              <input
                className="search-input"
                type="search"
                placeholder="Search subjects or chapters…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <select
              className="subject-select"
              value={subjectFilter}
              onChange={(event) => setSubjectFilter(event.target.value)}
              aria-label="Filter by subject"
            >
              <option value="">All subjects</option>
              {studyData.subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>{subject.name}</option>
              ))}
            </select>
          </div>
          <div className="filters" aria-label="Syllabus filter">
            {(["all", "mid", "extra"] as const).map((item) => (
              <button
                key={item}
                type="button"
                className={scope === item ? "filter active-filter" : "filter"}
                onClick={() => setScope(item)}
              >
                {item === "all" ? "All chapters" : item === "mid" ? "Midterm" : "Extra"}
              </button>
            ))}
          </div>

          {filteredSubjects.length === 0 ? (
            <div className="empty-filter">No matching chapters found.</div>
          ) : (
            <div className="subject-list">
              {filteredSubjects.map((subject) => (
                <article className="matrix-subject" key={subject.id}>
                  <div className="subject-heading">
                    <span className="subject-number">{String(subject.subjectIndex + 1).padStart(2, "0")}</span>
                    <div><h3>{subject.name}</h3><p>{subject.chapters.length} chapters shown</p></div>
                  </div>
                  <div className="chapter-list">
                    {subject.chapters.map(({ chapter, chapterIndex }) => (
                      <ChapterRow
                        key={`${chapter.id}-${chapterIndex}`}
                        chapter={chapter}
                        subjectIndex={subject.subjectIndex}
                        chapterIndex={chapterIndex}
                        tasks={tasks}
                        progress={progress}
                        onToggle={toggleTask}
                        disabled={saving || !csrf}
                      />
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section id="settings" className="panel settings-panel dashboard-section">
          <div className="panel-heading"><div><p className="eyebrow">PREFERENCES</p><h2>Workspace settings</h2></div></div>
          <p>Authentication and session settings are managed by the server. Academic preferences will appear here when they are persisted by the application.</p>
          <div className="settings-actions">
            <button className="secondary-button" onClick={downloadBackup}>Download study backup</button>
            <a className="text-link" href="/legacy">Open the classic Study Matrix for focus timer, admin, achievements, and print/export tools</a>
          </div>
          <button className="secondary-button" onClick={() => void logout()}>Log out of this workspace</button>
        </section>

        <footer className="footer">
          <span>{studyData.cfg.footer || "TaskFlow · Academic workspace"}</span>
          <a href="#dashboard">Back to dashboard ↑</a>
        </footer>
      </main>
    </div>
  );
}

function TrackingSummary({
  label,
  progress,
}: {
  label: string;
  progress: { completed: number; total: number };
}) {
  return (
    <div className="tracking-summary">
      <strong>{progress.completed}<small> / {progress.total}</small></strong>
      <span>{label} completed</span>
      <div className="progress-track"><span style={{ width: `${percent(progress.completed, progress.total)}%` }} /></div>
      <small>{percent(progress.completed, progress.total)}% of matching Study Matrix tasks</small>
    </div>
  );
}

function UnavailableState({ text }: { text: string }) {
  return (
    <div className="unavailable-state">
      <span aria-hidden="true">＋</span>
      <p>{text}</p>
    </div>
  );
}

function ChapterRow({
  chapter,
  subjectIndex,
  chapterIndex,
  tasks,
  progress,
  onToggle,
  disabled,
}: {
  chapter: Chapter;
  subjectIndex: number;
  chapterIndex: number;
  tasks: StudyTaskDefinition[];
  progress: Progress;
  onToggle: (subjectIndex: number, chapterIndex: number, taskId: string) => void;
  disabled: boolean;
}) {
  const completed = tasks.filter(
    (task) => progress[chapterTaskKey(subjectIndex, chapterIndex, task.id)],
  ).length;
  const state = completed === tasks.length
    ? "Complete"
    : completed > 0
      ? "In progress"
      : "Pending";

  return (
    <div className="chapter-row">
      <div className="chapter-info">
        <span className="chapter-title">{chapter.title}</span>
        <span className={chapter.mid ? "tag mid-tag" : "tag extra-tag"}>
          {chapter.mid ? "MIDTERM" : "EXTRA"}
        </span>
      </div>
      <div className="task-checks">
        {tasks.map((task) => {
          const taskKey = chapterTaskKey(subjectIndex, chapterIndex, task.id);
          return (
            <label className="task-check" key={task.id} title={task.label}>
              <input
                type="checkbox"
                aria-label={`${chapter.title}: ${task.label}`}
                checked={Boolean(progress[taskKey])}
                disabled={disabled}
                onChange={() => onToggle(subjectIndex, chapterIndex, task.id)}
              />
              <span>{task.label}</span>
            </label>
          );
        })}
      </div>
      <span className={`chapter-status ${state.toLowerCase().replace(" ", "-")}`}>{state}</span>
    </div>
  );
}

export default function App() {
  return window.location.pathname === "/login"
    ? <LoginPage />
    : <DashboardApp />;
}
