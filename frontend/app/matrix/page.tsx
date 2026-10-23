import { AppShell } from "../../components/app-shell";
export default function Matrix() {
  return (
    <AppShell>
      <div className="pageHead">
        <div>
          <p className="eyebrow">Syllabus workspace</p>
          <h1>Study Matrix</h1>
          <p>
            Use the original full interactive matrix below. Your checklist, focus timer, flashcards,
            exports, and admin tools are retained.
          </p>
        </div>
        <a className="primary" href="/legacy-matrix.html">
          Open full-screen ↗
        </a>
      </div>
      <iframe className="matrixFrame" title="CST study matrix" src="/legacy-matrix.html" />
    </AppShell>
  );
}
