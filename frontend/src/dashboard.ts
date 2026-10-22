import type {
  StudyData,
  StudyTaskDefinition,
} from "./types/study";

export type Progress = Record<string, boolean>;
export type ChapterStatus = "complete" | "in-progress" | "pending";

export interface TaskCount {
  id: string;
  label: string;
  completed: number;
  total: number;
}

export interface ChapterAnalytics {
  subjectIndex: number;
  chapterIndex: number;
  subjectName: string;
  chapterTitle: string;
  status: ChapterStatus;
  completedTasks: number;
  totalTasks: number;
}

export interface SubjectAnalytics {
  subjectIndex: number;
  id: string;
  name: string;
  code?: string;
  totalChapters: number;
  completedChapters: number;
  inProgressChapters: number;
  pendingChapters: number;
  completion: number;
  questionsCompleted: number;
  questionsTotal: number;
  nextAction?: string;
  taskCounts: TaskCount[];
}

export interface DashboardAnalytics {
  subjects: SubjectAnalytics[];
  chapters: ChapterAnalytics[];
  totalChapters: number;
  completedChapters: number;
  inProgressChapters: number;
  pendingChapters: number;
  totalTasks: number;
  completedTasks: number;
  taskCompletion: number;
  questionsTotal: number;
  questionsCompleted: number;
  questionCategories: TaskCount[];
  revisionTasks: TaskCount[];
  assignmentTasks: TaskCount[];
  examTasks: TaskCount[];
}

export function chapterTaskKey(
  subjectIndex: number,
  chapterIndex: number,
  taskId: string,
): string {
  return `${subjectIndex}-${chapterIndex}::${taskId}`;
}

function countTasks(
  tasks: StudyTaskDefinition[],
  subjectIndex: number,
  chapterIndexes: number[],
  progress: Progress,
): TaskCount[] {
  return tasks.map((task) => {
    let completed = 0;
    for (const chapterIndex of chapterIndexes) {
      if (progress[chapterTaskKey(subjectIndex, chapterIndex, task.id)]) {
        completed += 1;
      }
    }
    return {
      id: task.id,
      label: task.label,
      completed,
      total: chapterIndexes.length,
    };
  });
}

function completionPercent(completed: number, total: number): number {
  return total === 0 ? 0 : Math.round((completed / total) * 100);
}

function categoryLabel(task: StudyTaskDefinition): string {
  const normalized = `${task.id} ${task.label}`.toLowerCase();
  if (/very[\s_-]*short|vsq/.test(normalized)) return "Very short questions";
  if (/compositional|composition/.test(normalized)) return "Compositional questions";
  if (/\bshort\b|(?:^|\W)sq(?:\W|$)/.test(normalized)) return "Short questions";
  return task.label;
}

function summarizeQuestionTasks(
  tasks: StudyTaskDefinition[],
  chapters: ChapterAnalytics[],
  progress: Progress,
): TaskCount[] {
  const categories = new Map<string, TaskCount>();
  for (const task of tasks) {
    const label = categoryLabel(task);
    const category = categories.get(label) ?? {
      id: label,
      label,
      completed: 0,
      total: 0,
    };
    for (const chapter of chapters) {
      category.total += 1;
      if (progress[chapterTaskKey(
        chapter.subjectIndex,
        chapter.chapterIndex,
        task.id,
      )]) {
        category.completed += 1;
      }
    }
    categories.set(label, category);
  }
  return [...categories.values()];
}

function matchingTaskCounts(
  tasks: StudyTaskDefinition[],
  chapters: ChapterAnalytics[],
  progress: Progress,
  pattern: RegExp,
): TaskCount[] {
  const matching = tasks.filter((task) => pattern.test(`${task.id} ${task.label}`));
  return summarizeQuestionTasks(matching, chapters, progress);
}

export function buildDashboardAnalytics(
  data: StudyData,
  progress: Progress,
): DashboardAnalytics {
  const questionTasks = data.q;
  const studyTasks = data.s;
  const tasks = [...studyTasks, ...questionTasks];
  const effectiveTasks = tasks.length > 0
    ? tasks
    : [{ id: "study", label: "Study chapter" }];

  const chapters: ChapterAnalytics[] = data.subjects.flatMap(
    (subject, subjectIndex) => subject.chapters.map((chapter, chapterIndex) => {
      const completedTasks = effectiveTasks.reduce(
        (total, task) =>
          total + Number(Boolean(progress[chapterTaskKey(
            subjectIndex,
            chapterIndex,
            task.id,
          )])),
        0,
      );
      const status: ChapterStatus = completedTasks === effectiveTasks.length
        ? "complete"
        : completedTasks > 0
          ? "in-progress"
          : "pending";

      return {
        subjectIndex,
        chapterIndex,
        subjectName: subject.name,
        chapterTitle: chapter.title,
        status,
        completedTasks,
        totalTasks: effectiveTasks.length,
      };
    }),
  );

  const subjects = data.subjects.map((subject, subjectIndex) => {
    const subjectChapters = chapters.filter(
      (chapter) => chapter.subjectIndex === subjectIndex,
    );
    const chapterIndexes = subjectChapters.map((chapter) => chapter.chapterIndex);
    const subjectQuestionCounts = countTasks(
      questionTasks,
      subjectIndex,
      chapterIndexes,
      progress,
    );
    const nextChapter = subjectChapters.find(
      (chapter) => chapter.status !== "complete",
    );
    const nextTask = nextChapter && effectiveTasks.find(
      (task) =>
        !progress[chapterTaskKey(
          subjectIndex,
          nextChapter.chapterIndex,
          task.id,
        )],
    );

    return {
      subjectIndex,
      id: subject.id,
      name: subject.name,
      ...(typeof subject.code === "string" ? { code: subject.code } : {}),
      totalChapters: subjectChapters.length,
      completedChapters: subjectChapters.filter(
        (chapter) => chapter.status === "complete",
      ).length,
      inProgressChapters: subjectChapters.filter(
        (chapter) => chapter.status === "in-progress",
      ).length,
      pendingChapters: subjectChapters.filter(
        (chapter) => chapter.status === "pending",
      ).length,
      completion: completionPercent(
        subjectChapters.filter((chapter) => chapter.status === "complete").length,
        subjectChapters.length,
      ),
      questionsCompleted: subjectQuestionCounts.reduce(
        (total, task) => total + task.completed,
        0,
      ),
      questionsTotal: subjectQuestionCounts.reduce(
        (total, task) => total + task.total,
        0,
      ),
      ...(nextChapter && nextTask
        ? { nextAction: `${nextChapter.chapterTitle} · ${nextTask.label}` }
        : {}),
      taskCounts: countTasks(
        effectiveTasks,
        subjectIndex,
        chapterIndexes,
        progress,
      ),
    };
  });

  const completedTasks = chapters.reduce(
    (total, chapter) => total + chapter.completedTasks,
    0,
  );
  const totalTasks = chapters.reduce(
    (total, chapter) => total + chapter.totalTasks,
    0,
  );
  const questionCategories = summarizeQuestionTasks(
    questionTasks,
    chapters,
    progress,
  );

  return {
    subjects,
    chapters,
    totalChapters: chapters.length,
    completedChapters: chapters.filter(
      (chapter) => chapter.status === "complete",
    ).length,
    inProgressChapters: chapters.filter(
      (chapter) => chapter.status === "in-progress",
    ).length,
    pendingChapters: chapters.filter(
      (chapter) => chapter.status === "pending",
    ).length,
    totalTasks,
    completedTasks,
    taskCompletion: completionPercent(completedTasks, totalTasks),
    questionsTotal: questionCategories.reduce(
      (total, category) => total + category.total,
      0,
    ),
    questionsCompleted: questionCategories.reduce(
      (total, category) => total + category.completed,
      0,
    ),
    questionCategories,
    revisionTasks: matchingTaskCounts(
      tasks,
      chapters,
      progress,
      /revis|review/i,
    ),
    assignmentTasks: matchingTaskCounts(
      tasks,
      chapters,
      progress,
      /assign|practical/i,
    ),
    examTasks: matchingTaskCounts(
      tasks,
      chapters,
      progress,
      /exam|mock[\s_-]*test/i,
    ),
  };
}
