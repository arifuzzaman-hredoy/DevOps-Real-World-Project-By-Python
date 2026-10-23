import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("./dashboard.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
});
const dashboardModule = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);
const { buildDashboardAnalytics } = dashboardModule;

const recoverySource = readFileSync(new URL("./recovery.ts", import.meta.url), "utf8");
const { outputText: recoveryOutput } = ts.transpileModule(recoverySource, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
});
const recoveryModule = await import(
  `data:text/javascript;base64,${Buffer.from(recoveryOutput).toString("base64")}`
);
const { canRestorePlan, parseRecoveryBundle, serializeRecoveryBundle } = recoveryModule;

const studyData = {
  cfg: {
    eyebrow: "",
    title: "",
    desc: "",
    target: "",
    note: "",
    goal: 0,
    noticeHead: "",
    notice: "",
    footer: "",
  },
  subjects: [
    {
      id: "networks",
      code: "NET-1",
      name: "Computer Networks",
      chapters: [
        { id: "c1", title: "Network models", mid: true },
        { id: "c2", title: "Routing", mid: false },
      ],
    },
    {
      id: "database",
      name: "Database Systems",
      chapters: [{ id: "c1", title: "Relational model", mid: true }],
    },
  ],
  s: [
    { id: "study", label: "Study chapter" },
    { id: "revision", label: "Revision" },
    { id: "assignment", label: "Assignment" },
  ],
  q: [
    { id: "very-short", label: "Very Short Questions" },
    { id: "short", label: "Short Questions" },
    { id: "compositional", label: "Compositional Questions" },
  ],
};

test("derives subject, chapter, question, and task totals from saved progress", () => {
  const analytics = buildDashboardAnalytics(studyData, {
    "0-0::study": true,
    "0-0::revision": true,
    "0-0::very-short": true,
    "0-0::short": true,
  });

  assert.equal(analytics.totalChapters, 3);
  assert.equal(analytics.completedChapters, 0);
  assert.equal(analytics.inProgressChapters, 1);
  assert.equal(analytics.pendingChapters, 2);
  assert.equal(analytics.totalTasks, 18);
  assert.equal(analytics.completedTasks, 4);
  assert.equal(analytics.taskCompletion, 22);
  assert.equal(analytics.questionsTotal, 9);
  assert.equal(analytics.questionsCompleted, 2);
  assert.equal(analytics.subjects[0].code, "NET-1");
  assert.equal(analytics.subjects[0].completion, 0);
  assert.equal(analytics.subjects[0].inProgressChapters, 1);
  assert.equal(analytics.subjects[0].questionsCompleted, 2);
  assert.equal(analytics.subjects[0].nextAction, "Network models · Assignment");
  assert.deepEqual(
    analytics.questionCategories.map(({ label }) => label),
    ["Very short questions", "Short questions", "Compositional questions"],
  );
  assert.equal(analytics.revisionTasks[0].completed, 1);
  assert.equal(analytics.assignmentTasks[0].completed, 0);
});

test("exports a portable backup with the saved plan and question progress", () => {
  const progress = {
    "0-0::very-short": true,
    "0-0::short": false,
    "0-0::compositional": true,
  };
  const backup = JSON.parse(serializeRecoveryBundle(studyData, progress));
  const restored = parseRecoveryBundle(backup);

  assert.deepEqual(restored.data, studyData);
  assert.deepEqual(restored.progress, progress);
});

test("reports zero progress and no fabricated categories for an empty plan", () => {
  const emptyPlan = { ...studyData, subjects: [], s: [], q: [] };
  const analytics = buildDashboardAnalytics(emptyPlan, {});

  assert.equal(analytics.totalChapters, 0);
  assert.equal(analytics.totalTasks, 0);
  assert.equal(analytics.taskCompletion, 0);
  assert.equal(analytics.questionsTotal, 0);
  assert.deepEqual(analytics.questionCategories, []);
  assert.deepEqual(analytics.revisionTasks, []);
  assert.deepEqual(analytics.assignmentTasks, []);
  assert.deepEqual(analytics.examTasks, []);
});

test("restores a verified legacy browser plan and its saved progress", () => {
  const bundle = parseRecoveryBundle({
    "cst-study-data-v2": studyData,
    "cst-study-matrix-v1": { "0-0::study": true },
  });

  assert.equal(bundle.data.subjects.length, 2);
  assert.equal(bundle.progress["0-0::study"], true);
});

test("accepts a standalone plan and rejects malformed recovery data", () => {
  assert.equal(parseRecoveryBundle(studyData).data.subjects.length, 2);
  assert.equal(parseRecoveryBundle({ subjects: [{ id: "broken" }] }), null);
  assert.equal(
    parseRecoveryBundle({
      "cst-study-data-v2": studyData,
      "cst-study-matrix-v1": { "0-0::study": "done" },
    }),
    null,
  );
});

test("never offers an automatic restore over an existing server plan", () => {
  assert.equal(canRestorePlan(false), true);
  assert.equal(canRestorePlan(true), false);
});
