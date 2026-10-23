"use client";

import { useEffect } from "react";
import type { CSSProperties } from "react";
import { LogoutButton, RequireAuth } from "../../components/auth";
import { initializeStudyMatrix } from "./study-matrix-runtime";

function StudyMatrixContent() {
  useEffect(() => {
    initializeStudyMatrix();
  }, []);

  return (
    <div className="studyApp">
      {" "}
      <div
        id={"databaseGate"}
        role={"status"}
        aria-live={"polite"}
        style={
          {
            position: "fixed",
            inset: "0",
            zIndex: "99999",
            display: "grid",
            placeItems: "center",
            padding: "24px",
            background: "#060913",
            color: "#fff",
            textAlign: "center",
            font: "600 16px/1.5 system-ui",
          } as CSSProperties
        }
      >
        {" Loading your study matrix from the database… "}
      </div>{" "}
      <div className={"fx-bg"} aria-hidden={"true"}>
        {" "}
        <div className={"fx-aurora a1"} /> <div className={"fx-aurora a2"} />{" "}
        <div className={"fx-aurora a3"} /> <div className={"fx-grid"} />{" "}
        <div className={"fx-vignette"} />{" "}
      </div>{" "}
      <div className={"fx-scroll"} aria-hidden={"true"} />{" "}
      <div className={"fx-cursor"} id={"cglow"} aria-hidden={"true"} />{" "}
      <aside className={"sb"} id={"sb"} aria-label={"Main menu"}>
        {" "}
        <div className={"sb-brand"}>
          {" "}
          <span className={"hud-logo"} aria-hidden={"true"} />{" "}
          <div>
            {" "}
            <b>{"CST Matrix"}</b>
            <small>
              <i className={"live"} aria-hidden={"true"} />
              {"Study system online"}
            </small>{" "}
          </div>{" "}
          <button className={"sb-x"} id={"sbClose"} aria-label={"Close menu"}>
            {"✕"}
          </button>{" "}
        </div>{" "}
        <div
          className={"sb-card"}
          title={"Experience: 10 xp per task, 50 per chapter, 25 per focus session"}
        >
          {" "}
          <div className={"sb-row"}>
            {" "}
            <span className={"lv"} id={"hudLv"}>
              {"Lv 1"}
            </span>
            <span className={"chip"} id={"hudStreak"} title={"Days in a row with a checked task"}>
              {"🔥 0"}
            </span>{" "}
          </div>{" "}
          <div className={"xp"}>
            <i id={"hudXp"} />
          </div>{" "}
          <span className={"xpn"} id={"hudXpn"}>
            {"0/60 xp"}
          </span>{" "}
        </div>{" "}
        <nav className={"sb-nav"} aria-label={"Sections"}>
          {" "}
          <button className={"sb-i"} data-nav={"dash"} aria-current={"page"}>
            {" "}
            <span className={"ic"} aria-hidden={"true"}>
              {"▦"}
            </span>
            {"Dashboard "}
          </button>{" "}
          <button className={"sb-i"} data-nav={"next"}>
            {" "}
            <span className={"ic"} aria-hidden={"true"}>
              {"▸"}
            </span>
            {"Next up "}
          </button>{" "}
          <button className={"sb-i"} data-nav={"hall"}>
            {" "}
            <span className={"ic"} aria-hidden={"true"}>
              {"✦"}
            </span>
            {"Achievements"}
            <em id={"sbHallN"}>{"0/10"}</em>{" "}
          </button>{" "}
          <button className={"sb-i"} data-nav={"focus"}>
            {" "}
            <span className={"ic"} aria-hidden={"true"}>
              {"◔"}
            </span>
            {"Focus timer "}
          </button>{" "}
          <button className={"sb-i"} id={"hudK"}>
            {" "}
            <span className={"ic"} aria-hidden={"true"}>
              {"⌕"}
            </span>
            {"Search"}
            <kbd>{"Ctrl K"}</kbd>{" "}
          </button>{" "}
          <button className={"sb-i"} data-nav={"admin"}>
            {" "}
            <span className={"ic"} aria-hidden={"true"}>
              {"⚙"}
            </span>
            {"Admin panel "}
          </button>{" "}
        </nav>{" "}
        <div className={"sb-sec"}>
          {" "}
          <small>{"Syllabus"}</small>{" "}
          <div className={"sb-seg"} role={"group"} aria-label={"Syllabus filter"}>
            {" "}
            <button data-sf={"all"} aria-pressed={"true"}>
              {"All"}
            </button>
            <button data-sf={"mid"} aria-pressed={"false"}>
              {"Mid-Term"}
            </button>
            <button data-sf={"extra"} aria-pressed={"false"}>
              {"Final extra"}
            </button>{" "}
          </div>{" "}
        </div>{" "}
        <div className={"sb-sec"}>
          {" "}
          <small>{"Tools"}</small>{" "}
          <button className={"sb-i"} data-nav={"export"}>
            {" "}
            <span className={"ic"} aria-hidden={"true"}>
              {"⇪"}
            </span>
            {"Export checklist "}
          </button>{" "}
          <button className={"sb-i"} data-nav={"print"}>
            {" "}
            <span className={"ic"} aria-hidden={"true"}>
              {"⎙"}
            </span>
            {"Print "}
          </button>{" "}
        </div>{" "}
        <div className={"sb-foot"}>
          {" "}
          <div className={"sw"} role={"group"} aria-label={"Accent colour"}>
            {" "}
            <button
              style={{ "--c": "#22e4ff" } as CSSProperties}
              data-acc={"cyan"}
              aria-label={"Cyan accent"}
              aria-pressed={"true"}
            />
            <button
              style={{ "--c": "#a78bfa" } as CSSProperties}
              data-acc={"violet"}
              aria-label={"Violet accent"}
              aria-pressed={"false"}
            />
            <button
              style={{ "--c": "#ff4fa3" } as CSSProperties}
              data-acc={"magenta"}
              aria-label={"Magenta accent"}
              aria-pressed={"false"}
            />
            <button
              style={{ "--c": "#b6ff3d" } as CSSProperties}
              data-acc={"lime"}
              aria-label={"Lime accent"}
              aria-pressed={"false"}
            />{" "}
          </div>{" "}
          <button className={"sb-sw"} id={"sbLite"} role={"switch"} aria-checked={"false"}>
            {" "}
            <span>{"Lite effects"}</span>
            <i aria-hidden={"true"} />{" "}
          </button>{" "}
        </div>{" "}
        <LogoutButton />
      </aside>{" "}
      <div className={"sb-back"} id={"sbBack"} aria-hidden={"true"} />{" "}
      <button className={"sb-fab"} id={"sbFab"} aria-label={"Open menu"} aria-controls={"sb"}>
        {" "}
        <span aria-hidden={"true"}>{"☰"}</span>{" "}
      </button>{" "}
      <div className={"shell"}>
        {" "}
        <div className={"mbar"}>
          {" "}
          <button className={"btn"} id={"mbMenu"} aria-label={"Open menu"} aria-controls={"sb"}>
            {"☰"}
          </button>
          <b>{"CST Matrix"}</b>
          <span className={"lvchip"} id={"mbLv"}>
            {"Lv 1"}
          </span>{" "}
        </div>{" "}
        <div id={"dashView"}>
          {" "}
          <header className={"hero"}>
            {" "}
            <div className={"hero-copy"}>
              {" "}
              <div className={"eyebrow"} id={"eb"}>
                {"Personal learning dashboard · 2026"}
              </div>{" "}
              <h1 id={"ttl"}>{"CST Semester Study Matrix"}</h1>{" "}
              <p id={"dsc"}>
                {
                  " A practical chapter-by-chapter tracker for your Mid-Term and Semester Final. Track question types, study tasks, revisions, and self-tests in one place. "
                }
              </p>{" "}
              <div className={"hero-meta"} id={"heroMeta"}>
                {" "}
                <span className={"pill"}>
                  <span className={"dot"} />
                  {" Mid-Term target · 01 Dec 2026"}
                </span>{" "}
                <span className={"pill"}>{"6 subjects"}</span>{" "}
                <span className={"pill"}>{"Graphics Design excluded"}</span>{" "}
                <span className={"pill"}>{"Goal · 80% coverage"}</span>{" "}
              </div>{" "}
              <div
                className={"count"}
                id={"count"}
                aria-label={"Time left until the Mid-Term target"}
              >
                {" "}
                <div className={"cu"}>
                  <b id={"cD"}>{"00"}</b>
                  <small>{"days"}</small>
                </div>{" "}
                <div className={"cu"}>
                  <b id={"cH"}>{"00"}</b>
                  <small>{"hours"}</small>
                </div>{" "}
                <div className={"cu"}>
                  <b id={"cM"}>{"00"}</b>
                  <small>{"min"}</small>
                </div>{" "}
                <div className={"cu"}>
                  <b id={"cS"}>{"00"}</b>
                  <small>{"sec"}</small>
                </div>{" "}
                <span className={"count-note"} id={"cNote"}>
                  {"until the Mid-Term target"}
                </span>{" "}
              </div>{" "}
            </div>{" "}
            <div className={"reactor"} id={"reactor"} role={"img"} aria-label={"Overall coverage"}>
              {" "}
              <svg viewBox={"0 0 220 220"} aria-hidden={"true"}>
                {" "}
                <defs>
                  {" "}
                  <linearGradient id={"rg"} x1={"0"} y1={"0"} x2={"1"} y2={"1"}>
                    {" "}
                    <stop offset={"0"} style={{ stopColor: "var(--a1)" } as CSSProperties} />{" "}
                    <stop offset={"1"} style={{ stopColor: "var(--a3)" } as CSSProperties} />{" "}
                  </linearGradient>{" "}
                </defs>{" "}
                <g className={"rx-spin1"}>
                  {" "}
                  <circle cx={"110"} cy={"110"} r={"106"} className={"rx-dash"} />{" "}
                </g>{" "}
                <g className={"rx-spin2"}>
                  {" "}
                  <circle cx={"110"} cy={"110"} r={"97"} className={"rx-ticks"} />{" "}
                </g>{" "}
                <circle cx={"110"} cy={"110"} r={"84"} className={"rx-track"} />{" "}
                <circle
                  cx={"110"}
                  cy={"110"}
                  r={"84"}
                  className={"rx-arc"}
                  id={"rxArc"}
                  stroke={"url(#rg)"}
                />{" "}
                <circle cx={"110"} cy={"110"} r={"66"} className={"rx-track2"} />{" "}
                <circle cx={"110"} cy={"110"} r={"66"} className={"rx-arc2"} id={"rxArc2"} />{" "}
                <g className={"rx-goal"} id={"rxGoal"}>
                  {" "}
                  <rect
                    x={"108.5"}
                    y={"17"}
                    width={"3"}
                    height={"18"}
                    rx={"1.5"}
                    fill={"#ffd24a"}
                  />{" "}
                </g>{" "}
              </svg>{" "}
              <div className={"rx-core"}>
                <b id={"rxPct"}>{"0%"}</b>
                <span id={"rxLbl"}>{"Level 1, Rookie"}</span>
              </div>{" "}
            </div>{" "}
          </header>{" "}
          <section className={"stats"} aria-label={"Progress summary"}>
            {" "}
            <div className={"stat"}>
              {" "}
              <div className={"stat-label"}>{"CHAPTERS / UNITS"}</div>{" "}
              <div className={"stat-value"} id={"totalChapters"}>
                {"69"}
              </div>{" "}
              <div className={"stat-foot"} id={"subFoot"}>
                {"Across 6 subjects"}
              </div>{" "}
            </div>{" "}
            <div className={"stat"}>
              {" "}
              <div className={"stat-label"}>{"FULLY COMPLETED"}</div>{" "}
              <div className={"stat-value"} id={"completedChapters"}>
                {"0"}
              </div>{" "}
              <div className={"stat-foot"} id={"allFoot"}>
                {"All 8 tasks checked"}
              </div>{" "}
            </div>{" "}
            <div className={"stat"}>
              {" "}
              <div className={"stat-label"}>{"TASKS COMPLETED"}</div>{" "}
              <div className={"stat-value"} id={"taskProgress"}>
                {"0%"}
              </div>{" "}
              <div className={"stat-foot"} id={"taskCount"}>
                {"0 of 552 tasks"}
              </div>{" "}
            </div>{" "}
            <div className={"stat"}>
              {" "}
              <div className={"stat-label"}>{"TARGET COVERAGE"}</div>{" "}
              <div className={"stat-value"} id={"goalVal"}>
                {"80%"}
              </div>{" "}
              <div className={"stat-foot"}>{"Aim before Mid-Term"}</div>{" "}
              <div className={"progress-track"}>
                {" "}
                <div className={"progress-fill"} id={"overallBar"} />{" "}
              </div>{" "}
            </div>{" "}
          </section>{" "}
          <section className={"mission"} id={"mission"} aria-label={"Next up"}>
            {" "}
            <div className={"ms-main"}>
              {" "}
              <span className={"sring lg"} id={"msRing"}>
                <b id={"msRingN"}>{"0/8"}</b>
              </span>{" "}
              <div className={"ms-txt"}>
                {" "}
                <small>{"Next up"}</small> <h3 id={"msTitle"}>{"Loading"}</h3>{" "}
                <p id={"msSub"} />{" "}
              </div>{" "}
            </div>{" "}
            <div className={"ms-act"}>
              {" "}
              <button className={"btn primary"} id={"msGo"}>
                {"Open chapter"}
              </button>
              <button className={"btn"} id={"msFocus"}>
                {"Focus 25 min"}
              </button>{" "}
            </div>{" "}
            <div className={"ms-heat"}>
              {" "}
              <div
                className={"bars"}
                id={"msBars"}
                role={"img"}
                aria-label={"Tasks checked per day over the last 14 days"}
              />{" "}
              <small id={"msStreak"} />{" "}
            </div>{" "}
          </section>{" "}
          <div className={"toolbar"}>
            {" "}
            <label className={"search"}>
              <span>{"⌕"}</span>
              <input
                id={"search"}
                type={"search"}
                placeholder={"Search subject or chapter…"}
                aria-label={"Search chapters"}
              />
            </label>{" "}
            <select id={"subjectFilter"} aria-label={"Filter by subject"}>
              {" "}
              <option value={"all"}>{"All subjects"}</option>{" "}
            </select>{" "}
            <div className={"tabs"} role={"tablist"} aria-label={"Syllabus filter"}>
              {" "}
              <button
                className={"tab active"}
                data-scope={"all"}
                role={"tab"}
                aria-selected={"true"}
              >
                {"All"}
              </button>{" "}
              <button className={"tab"} data-scope={"mid"} role={"tab"} aria-selected={"false"}>
                {"Mid-Term"}
              </button>{" "}
              <button className={"tab"} data-scope={"extra"} role={"tab"} aria-selected={"false"}>
                {" Final Extra "}
              </button>{" "}
            </div>{" "}
            <button className={"btn primary"} id={"adminBtn"}>
              {"⚙ Admin"}
            </button>{" "}
            <button className={"btn"} id={"exportBtn"}>
              {"Export checklist"}
            </button>{" "}
            <button className={"btn"} id={"printBtn"}>
              {"Print"}
            </button>{" "}
          </div>{" "}
          <div className={"notice"} id={"noticeBox"}>
            {" "}
            <strong>{"How completion works:"}</strong>
            {
              " Every chapter has 4 question-preparation tasks and 4 study-workflow tasks. A chapter counts as complete only when all 8 are checked. The Mid-Term ranges for subjects other than Mathematics-III are estimates—confirm them against your college syllabus. "
            }
          </div>{" "}
          <main id={"matrix"} />{" "}
          <div className={"footer"}>
            {" "}
            <span id={"ftxt"}>
              {"Your syllabus and progress are saved to your study database."}
            </span>{" "}
            <button className={"btn ghost"} id={"resetBtn"}>
              {"Reset all progress"}
            </button>{" "}
          </div>{" "}
        </div>{" "}
        <section id={"adminView"} hidden={true}>
          {" "}
          <div className={"admin-top"}>
            {" "}
            <div>
              {" "}
              <h1>{"Admin panel"}</h1>{" "}
              <p>
                {
                  " Subject, chapter, task, text — সব এখান থেকে add / edit / delete করো। Auto-save হয়। "
                }
              </p>{" "}
            </div>{" "}
            <button className={"btn primary"} id={"backBtn"}>
              {"← Back to dashboard"}
            </button>{" "}
          </div>{" "}
          <div className={"tabs atabs"} role={"tablist"}>
            {" "}
            <button className={"tab active"} data-atab={"general"}>
              {"General"}
            </button>
            <button className={"tab"} data-atab={"subjects"}>
              {"Subjects & Chapters"}
            </button>
            <button className={"tab"} data-atab={"tasks"}>
              {"Tasks"}
            </button>
            <button className={"tab"} data-atab={"data"}>
              {"Backup / Reset"}
            </button>{" "}
          </div>{" "}
          <div id={"adminBody"} />{" "}
        </section>{" "}
      </div>{" "}
      <div className={"ov"} id={"palette"} aria-hidden={"true"}>
        {" "}
        <div className={"pal"} role={"dialog"} aria-modal={"true"} aria-label={"Command palette"}>
          {" "}
          <div className={"pal-in"}>
            {" "}
            <span aria-hidden={"true"}>{"⌕"}</span>
            <input
              id={"palIn"}
              type={"text"}
              placeholder={"Jump to a chapter or run a command"}
              autoComplete={"off"}
              spellCheck={"false"}
              aria-label={"Search chapters and commands"}
            />{" "}
          </div>{" "}
          <ul id={"palList"} role={"listbox"} />{" "}
          <div className={"pal-foot"}>
            {" "}
            <span>{"↑ ↓ to move"}</span>
            <span>{"Enter to run"}</span>
            <span>{"Esc to close"}</span>{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
      <div className={"ov"} id={"hallModal"} aria-hidden={"true"}>
        {" "}
        <div className={"hall"} role={"dialog"} aria-modal={"true"} aria-labelledby={"hallTitle"}>
          {" "}
          <div className={"hall-top"}>
            {" "}
            <h2 id={"hallTitle"}>{"Achievements"}</h2>{" "}
            <button className={"btn sm"} id={"hallClose"}>
              {"Close"}
            </button>{" "}
          </div>{" "}
          <div className={"hall-stats"} id={"hallStats"} />{" "}
          <div className={"hall-grid"} id={"hallGrid"} />{" "}
        </div>{" "}
      </div>{" "}
      <div className={"dock"} id={"dock"}>
        {" "}
        <div className={"dock-panel"} id={"dkPanel"}>
          {" "}
          <div className={"dk-ring"}>
            {" "}
            <svg viewBox={"0 0 120 120"} aria-hidden={"true"}>
              {" "}
              <circle className={"tr"} cx={"60"} cy={"60"} r={"52"} />{" "}
              <circle
                className={"ar"}
                id={"dkArc"}
                cx={"60"}
                cy={"60"}
                r={"52"}
                strokeDasharray={"326.7"}
                strokeDashoffset={"0"}
              />
            </svg>
            <b id={"dkTime"}>{"25:00"}</b>{" "}
          </div>{" "}
          <div className={"dk-modes"} role={"group"} aria-label={"Timer length"}>
            {" "}
            <button data-m={"25"} aria-pressed={"true"}>
              {"Focus 25"}
            </button>
            <button data-m={"50"} aria-pressed={"false"}>
              {"Deep 50"}
            </button>
            <button data-m={"5"} aria-pressed={"false"}>
              {"Break 5"}
            </button>{" "}
          </div>{" "}
          <div className={"dk-act"}>
            {" "}
            <button className={"btn primary sm"} id={"dkGo"}>
              {"Start"}
            </button>
            <button className={"btn sm"} id={"dkReset"}>
              {"Reset"}
            </button>{" "}
          </div>{" "}
          <p className={"dk-note"} id={"dkNote"} />{" "}
        </div>{" "}
        <button
          className={"dock-fab"}
          id={"dkFab"}
          aria-expanded={"false"}
          aria-label={"Focus timer"}
        >
          {" "}
          <svg viewBox={"0 0 44 44"} aria-hidden={"true"}>
            {" "}
            <circle className={"tr"} cx={"22"} cy={"22"} r={"19"} />{" "}
            <circle
              className={"ar"}
              id={"dkMiniArc"}
              cx={"22"}
              cy={"22"}
              r={"19"}
              strokeDasharray={"119.4"}
              strokeDashoffset={"0"}
            />
          </svg>
          <span id={"dkMini"}>{"25:00"}</span>{" "}
        </button>{" "}
      </div>{" "}
      <div className={"toast"} id={"toast"} role={"status"} aria-live={"polite"} />{" "}
      <div
        className={"modal-backdrop"}
        id={"exportModal"}
        role={"dialog"}
        aria-modal={"true"}
        aria-labelledby={"exportTitle"}
      >
        {" "}
        <div className={"modal"}>
          {" "}
          <h2 id={"exportTitle"}>{"Export your checklist"}</h2>{" "}
          <p>{"Copy this text into your notes or keep a backup of your current progress."}</p>{" "}
          <textarea id={"exportText"} readOnly={true} />{" "}
          <div className={"modal-actions"}>
            {" "}
            <button className={"btn"} id={"closeExport"}>
              {"Close"}
            </button>
            <button className={"btn primary"} id={"copyExport"}>
              {"Copy text"}
            </button>{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
}

export default function StudyMatrix() {
  return (
    <RequireAuth>
      <StudyMatrixContent />
    </RequireAuth>
  );
}
