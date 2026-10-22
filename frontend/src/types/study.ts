export type SyllabusScope = "all" | "mid" | "extra";

export interface StudyTaskDefinition {
  id: string;
  label: string;
}

export interface Chapter {
  id: string;
  title: string;
  mid: boolean;
}

export interface Subject {
  id: string;
  name: string;
  code?: string;
  chapters: Chapter[];
}

export interface StudyConfig {
  eyebrow: string;
  title: string;
  desc: string;
  target: string;
  note: string;
  goal: number;
  noticeHead: string;
  notice: string;
  footer: string;
}

export interface StudyData {
  cfg: StudyConfig;
  subjects: Subject[];
  q: StudyTaskDefinition[];
  s: StudyTaskDefinition[];
}

export type ChapterProgress = Record<string, boolean>;

export interface StudyStateResponse {
  states: Record<string, unknown>;
  updated_at: Record<string, string>;
}

export interface ApiError {
  error: string;
}
