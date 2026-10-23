// @ts-nocheck
export function initializeStudyMatrix() {
  if (window.__cstStudyMatrixInitialized) return;

  const RAW = [
    {
      name: "Social Science",
      chapters: [
        "Basic Concepts of Social Science",
        "Society and Citizenship",
        "State, Government, Law and Good Governance",
        "United Nations and World Peace",
        "Socialization, Social Control and Social Change",
        "Culture and Civilization of Bangladesh and Ethnic Communities",
        "Basic Concepts of Economics",
        "Demand, Supply, Utility and National Income",
        "Economic and Sustainable Development of Bangladesh",
        "Partition of the Subcontinent and Political Events Following Independence",
      ],
      midCount: 6,
    },
    {
      name: "Physics-II",
      chapters: [
        "Thermometry",
        "Effects of Heat on Matter",
        "Nature of Heat and Mechanical Equivalent of Heat",
        "Static Electricity",
        "Magnetism",
        "Reflection of Light",
        "Refraction of Light",
        "Physical Optics",
        "Photoelectric Effect",
        "Atomic Structure",
        "Nuclear Physics",
        "Modern Physics",
        "Relativity and Astrophysics",
      ],
      midCount: 8,
    },
    {
      name: "Mathematics-III",
      chapters: [
        "Partial Fractions",
        "Exponential Series",
        "Binomial Theorem",
        "Circle",
        "Conics and Conic Sections",
        "Area of Triangles",
        "Areas of Quadrilaterals, Parallelograms, Rhombuses and Trapeziums",
        "Area of Regular Polygons",
        "Areas of Circles, Sectors and Segments",
        "Surface Area and Volume of Rectangular Solids",
        "Surface Area and Volume of Prisms",
        "Surface Area and Volume of Parallelepipeds and Cylinders",
        "Surface Area and Volume of Pyramids",
        "Surface Area and Volume of Cones and Spheres",
      ],
      midIndexes: [0, 1, 2, 4, 5, 6, 7, 9, 10],
    },
    {
      name: "Application Development Using Python",
      chapters: [
        "Python Functions",
        "File Handling in Python",
        "Modules, Packages and Application Software",
        "Fundamentals of Object-Oriented Programming",
        "Four Core Principles of OOP",
        "Python Iterators, Generators and Decorators",
        "Exception and Error Handling",
        "Logging in Python",
        "Unit Testing",
        "Regular Expressions (RegEx)",
        "Application Software",
      ],
      midCount: 7,
    },
    {
      name: "IT Support Services",
      chapters: [
        "Evolution and Generations of Computers",
        "Types of Modern Digital Computers",
        "Basic Organization of Digital Computer Systems",
        "Computer Memory",
        "Functions of Input Devices",
        "Functions of Output Devices",
        "Personal Protective Equipment (PPE)",
        "Concepts of Hardware",
        "Concepts of Software",
        "Features of Application Software Packages",
        "Internet and Its Resources",
        "Concepts of Networking",
      ],
      midCount: 7,
    },
    {
      name: "Digital Electronics-I",
      chapters: [
        "Fundamentals of Digital Electronics",
        "Number Systems and Codes",
        "Logic Gates",
        "Simplification of Logic Circuits",
        "Digital ICs and Logic Families",
        "Combinational Logic Circuits",
        "Arithmetic Logic Circuit",
        "Multiplexers and Demultiplexers",
        "Encoders and Decoders",
        "Sequential Logic Circuits",
      ],
      midCount: 6,
    },
  ];
  const DQ = [
    { id: "veryShort", label: "Very Short Questions" },
    { id: "short", label: "Short Questions" },
    { id: "composition", label: "Compositional Questions" },
    { id: "examples", label: "Example Questions" },
  ];
  const DS = [
    { id: "study", label: "Study complete" },
    { id: "practice", label: "Practice" },
    { id: "revision", label: "Revision" },
    { id: "selfTest", label: "Self-exam" },
  ];
  const DATA_KEY = "cst-study-data-v2";
  const STORAGE_KEY = "cst-study-matrix-v1";
  const studyPersistence = (() => {
    let loading;
    let csrfToken;
    let writeQueue = Promise.resolve();
    const load = () => {
      if (!loading) {
        loading = fetch("/api/study/state", { credentials: "same-origin" }).then(
          async (response) => {
            if (!response.ok) throw new Error("Could not load saved study data.");
            const body = await response.json();
            if (!body.states || typeof body.states !== "object" || Array.isArray(body.states))
              throw new Error("The saved study data response is invalid.");
            return body.states;
          },
        );
      }
      return loading;
    };
    const get = async (key) => (await load())[key];
    const save = (key, value) => {
      const snapshot = JSON.parse(JSON.stringify(value));
      const operation = writeQueue
        .catch(() => {})
        .then(async () => {
          if (!csrfToken) {
            const response = await fetch("/api/csrf", { credentials: "same-origin" });
            if (!response.ok) throw new Error("Could not prepare a secure database save.");
            const body = await response.json();
            if (typeof body.csrf_token !== "string")
              throw new Error("The security token response is invalid.");
            csrfToken = body.csrf_token;
          }
          const response = await fetch(`/api/study/state/${encodeURIComponent(key)}`, {
            method: "PUT",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
            body: JSON.stringify({ value: snapshot }),
          });
          if (!response.ok) throw new Error(`Database save failed (HTTP ${response.status}).`);
          const states = await load();
          states[key] = snapshot;
        });
      writeQueue = operation;
      return operation;
    };
    return { get, save };
  })();
  window.cstStudyPersistence = studyPersistence;
  const readyParts = new Set();
  window.cstStudyPartReady = (part) => {
    readyParts.add(part);
    if (readyParts.size === 3) $("databaseGate")?.remove();
  };
  window.cstStudyPartFailed = (error) => {
    const gate = $("databaseGate");
    if (gate)
      gate.textContent = `Study data could not be loaded or saved. Please refresh and try again. ${error?.message || ""}`;
  };
  const uid = () => "x" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  function defaults() {
    return {
      cfg: {
        eyebrow: "Personal learning dashboard · 2026",
        title: "CST Semester\nStudy Matrix",
        desc: "A practical chapter-by-chapter tracker for your Mid-Term and Semester Final. Track question types, study tasks, revisions, and self-tests in one place.",
        target: "01 Dec 2026",
        note: "Graphics Design excluded",
        goal: 80,
        noticeHead: "How completion works:",
        notice:
          "Every chapter has 4 question-preparation tasks and 4 study-workflow tasks. A chapter counts as complete only when all 8 are checked. The Mid-Term ranges for subjects other than Mathematics-III are estimates—confirm them against your college syllabus.",
        footer: "Your syllabus and progress are saved to your study database.",
      },
      subjects: RAW.map((s, si) => ({
        id: "s" + si,
        name: s.name,
        chapters: s.chapters.map((t, ci) => ({
          id: si + "-" + ci,
          title: t,
          mid: s.midIndexes ? s.midIndexes.includes(ci) : ci < s.midCount,
        })),
      })),
      q: DQ.map((x) => ({ ...x })),
      s: DS.map((x) => ({ ...x })),
    };
  }
  let D = defaults();
  D.cfg = { ...defaults().cfg, ...D.cfg };
  let subjects, questionTasks, studyTasks, allChapters;
  function sync() {
    subjects = D.subjects;
    questionTasks = D.q;
    studyTasks = D.s;
    allChapters = [];
    D.subjects.forEach((s) =>
      s.chapters.forEach((c, i) =>
        allChapters.push({
          id: c.id,
          subject: s.name,
          title: c.title,
          index: i + 1,
          isMid: c.mid,
        }),
      ),
    );
  }
  function saveD() {
    studyPersistence.save(DATA_KEY, D).catch((error) => {
      window.cstStudyPartFailed(error);
      showToast("Could not save syllabus changes to the database.");
    });
  }
  const T = () => questionTasks.length + studyTasks.length;
  sync();
  let state = {};
  let scope = "all";
  const $ = (id) => document.getElementById(id);
  function taskKey(chapterId, taskId) {
    return chapterId + "::" + taskId;
  }
  function isChecked(chapterId, taskId) {
    return state[taskKey(chapterId, taskId)] === true;
  }
  function chapterTaskCount(c) {
    return [...questionTasks, ...studyTasks].filter((t) => isChecked(c.id, t.id)).length;
  }
  function chapterComplete(c) {
    return T() > 0 && chapterTaskCount(c) === T();
  }
  function save() {
    studyPersistence.save(STORAGE_KEY, state).catch((error) => {
      window.cstStudyPartFailed(error);
      showToast("Could not save study progress to the database.");
    });
  }
  function renderStats() {
    const done = allChapters.reduce((n, c) => n + chapterTaskCount(c), 0);
    const completed = allChapters.filter(chapterComplete).length;
    const total = allChapters.length * T() || 1;
    $("totalChapters").textContent = allChapters.length;
    $("completedChapters").textContent = completed;
    $("taskProgress").textContent = Math.round((done / total) * 100) + "%";
    $("taskCount").textContent = `${done} of ${total} tasks`;
    $("overallBar").style.width = (done / total) * 100 + "%";
    if (window.FX) FX.refresh();
  }
  function render() {
    const query = $("search").value.trim().toLowerCase();
    const subject = $("subjectFilter").value;
    const filtered = allChapters.filter((c) => {
      const scopeMatch =
        scope === "all" || (scope === "mid" && c.isMid) || (scope === "extra" && !c.isMid);
      const subjectMatch = subject === "all" || c.subject === subject;
      const searchMatch = !query || (c.subject + " " + c.title).toLowerCase().includes(query);
      return scopeMatch && subjectMatch && searchMatch;
    });
    const root = $("matrix");
    root.innerHTML = "";
    if (!filtered.length) {
      root.innerHTML =
        '<div class="empty"><strong>No chapters found</strong><br>Try a different search or filter.</div>';
      renderStats();
      return;
    }
    const groups = subjects
      .map((s) => ({
        subject: s.name,
        chapters: filtered.filter((c) => c.subject === s.name),
      }))
      .filter((g) => g.chapters.length);
    groups.forEach((group) => {
      const heading = document.createElement("div");
      heading.className = "subject-heading";
      const left = document.createElement("div");
      const h = document.createElement("h2");
      h.textContent = group.subject;
      const p = document.createElement("p");
      p.textContent = "Chapter-by-chapter learning and question tracker";
      left.append(h, p);
      const count = document.createElement("span");
      count.className = "subject-count";
      const completed = group.chapters.filter(chapterComplete).length;
      count.textContent = `${completed}/${group.chapters.length} complete`;
      heading.append(left, count);
      root.append(heading);
      const grid = document.createElement("div");
      grid.className = "chapters";
      group.chapters.forEach((c) => {
        const card = document.createElement("article");
        card.className = "chapter" + (chapterComplete(c) ? " complete" : "");
        const top = document.createElement("div");
        top.className = "chapter-top";
        const num = document.createElement("div");
        num.className = "chapter-num";
        num.textContent = String(c.index).padStart(2, "0");
        const titleWrap = document.createElement("div");
        titleWrap.style.flex = "1";
        const title = document.createElement("div");
        title.className = "chapter-title";
        title.textContent = c.title;
        const sub = document.createElement("div");
        sub.className = "chapter-sub";
        sub.textContent = c.isMid ? "Mid-Term syllabus (estimated)" : "Final extra syllabus";
        titleWrap.append(title, sub);
        const status = document.createElement("span");
        status.className = "status" + (chapterComplete(c) ? " done" : "");
        status.textContent = chapterComplete(c) ? "✓ Complete" : `${chapterTaskCount(c)}/${T()}`;
        top.append(num, titleWrap, status);
        card.append(top);
        const mini = document.createElement("div");
        mini.className = "mini-progress";
        const bar = document.createElement("div");
        bar.style.width = (chapterTaskCount(c) / (T() || 1)) * 100 + "%";
        mini.append(bar);
        card.append(mini);
        const qlabel = document.createElement("div");
        qlabel.className = "section-label";
        qlabel.textContent = "01 · Question preparation";
        card.append(qlabel);
        const qgrid = document.createElement("div");
        qgrid.className = "checks";
        questionTasks.forEach((t) => qgrid.append(makeCheck(c, t)));
        card.append(qgrid);
        const slabel = document.createElement("div");
        slabel.className = "section-label";
        slabel.textContent = "02 · Study workflow";
        card.append(slabel);
        const sgrid = document.createElement("div");
        sgrid.className = "checks";
        studyTasks.forEach((t) => sgrid.append(makeCheck(c, t)));
        card.append(sgrid);
        grid.append(card);
      });
      root.append(grid);
    });
    renderStats();
  }
  function makeCheck(chapter, task) {
    const label = document.createElement("label");
    label.className = "check";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = isChecked(chapter.id, task.id);
    input.setAttribute("aria-label", chapter.title + ": " + task.label);
    input.addEventListener("change", () => {
      state[taskKey(chapter.id, task.id)] = input.checked;
      save();
      render();
      showToast(input.checked ? "Progress updated" : "Task unchecked");
    });
    const span = document.createElement("span");
    span.textContent = task.label;
    label.append(input, span);
    return label;
  }
  function showToast(message) {
    const toast = $("toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 1900);
  }
  function exportData() {
    const lines = [
      D.cfg.title.replace(/\n/g, " ").toUpperCase(),
      "Mid-Term target: " + D.cfg.target,
      "",
    ];
    subjects.forEach((s) => {
      lines.push(s.name);
      allChapters
        .filter((c) => c.subject === s.name)
        .forEach((c) => {
          lines.push(
            `${chapterComplete(c) ? "[x]" : "[ ]"} ${c.index}. ${c.title} (${c.isMid ? "Mid-Term" : "Final extra"})`,
          );
          [...questionTasks, ...studyTasks].forEach((t) =>
            lines.push(`   ${isChecked(c.id, t.id) ? "[x]" : "[ ]"} ${t.label}`),
          );
        });
      lines.push("");
    });
    return lines.join("\n");
  }
  const select = $("subjectFilter");
  function fillSel() {
    const cur = select.value;
    select.innerHTML = '<option value="all">All subjects</option>';
    subjects.forEach((s) => {
      const o = document.createElement("option");
      o.value = s.name;
      o.textContent = s.name;
      select.append(o);
    });
    select.value = subjects.some((s) => s.name === cur) ? cur : "all";
  }
  fillSel();
  $("search").addEventListener("input", render);
  select.addEventListener("change", render);
  document.querySelectorAll("[data-scope]").forEach((btn) =>
    btn.addEventListener("click", () => {
      scope = btn.dataset.scope;
      document.querySelectorAll("[data-scope]").forEach((b) => {
        const active = b === btn;
        b.classList.toggle("active", active);
        b.setAttribute("aria-selected", String(active));
      });
      render();
    }),
  );
  $("exportBtn").addEventListener("click", () => {
    $("exportText").value = exportData();
    $("exportModal").classList.add("open");
  });
  $("closeExport").addEventListener("click", () => $("exportModal").classList.remove("open"));
  $("exportModal").addEventListener("click", (e) => {
    if (e.target === $("exportModal")) $("exportModal").classList.remove("open");
  });
  $("copyExport").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText($("exportText").value);
      showToast("Checklist copied to clipboard");
    } catch (e) {
      $("exportText").select();
      document.execCommand("copy");
      showToast("Checklist copy attempted");
    }
  });
  $("printBtn").addEventListener("click", () => window.print());
  $("resetBtn").addEventListener("click", () => {
    if (confirm("Reset every checked task? This cannot be undone.")) {
      state = {};
      save();
      render();
      showToast("Progress reset");
    }
  });
  function applyCfg() {
    const g = D.cfg;
    $("eb").textContent = g.eyebrow;
    $("ttl").textContent = g.title;
    $("dsc").textContent = g.desc;
    document.title = g.title.replace(/\n/g, " ");
    const hm = $("heroMeta");
    hm.innerHTML = "";
    [
      "Mid-Term target · " + g.target,
      subjects.length + " subjects",
      g.note,
      "Goal · " + g.goal + "% coverage",
    ].forEach((t, i) => {
      if (!t) return;
      const p = document.createElement("span");
      p.className = "pill";
      if (i === 0) {
        const d = document.createElement("span");
        d.className = "dot";
        p.append(d);
      }
      p.append(t);
      hm.append(p);
    });
    const nb = $("noticeBox");
    nb.innerHTML = "";
    const st = document.createElement("strong");
    st.textContent = g.noticeHead + " ";
    nb.append(st, g.notice);
    $("goalVal").textContent = g.goal + "%";
    $("allFoot").textContent = `All ${T()} tasks checked`;
    $("subFoot").textContent = "Across " + subjects.length + " subjects";
    $("ftxt").textContent = g.footer;
  }
  const esc = (s) =>
    String(s).replace(
      /[&<>"]/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
    );
  const fS = (id) => D.subjects.find((s) => s.id === id);
  const fC = (k) => {
    const [a, b] = k.split("|");
    return fS(a).chapters.find((c) => c.id === b);
  };
  const mv = (a, i, d) => {
    const j = i + d;
    if (i < 0 || j < 0 || j >= a.length) return;
    [a[i], a[j]] = [a[j], a[i]];
  };
  let aTab = "general";
  const btns = (act, attrs) =>
    `<button class="btn sm" data-act="${act}up" ${attrs}>↑</button><button class="btn sm" data-act="${act}down" ${attrs}>↓</button><button class="btn sm danger" data-act="${act}del" ${attrs}>🗑</button>`;
  function renderAdmin() {
    document
      .querySelectorAll("[data-atab]")
      .forEach((b) => b.classList.toggle("active", b.dataset.atab === aTab));
    let h = "";
    if (aTab === "general") {
      const F = [
        ["eyebrow", "Eyebrow text"],
        ["title", "Title (Enter = new line)", "t"],
        ["desc", "Description", "t"],
        ["target", "Mid-Term target date"],
        ["note", "Extra pill (blank = hide)"],
        ["goal", "Goal coverage %", "n"],
        ["noticeHead", "Notice heading"],
        ["notice", "Notice text", "t"],
        ["footer", "Footer text"],
      ];
      h =
        '<div class="panel pad">' +
        F.map(
          ([k, l, ty]) =>
            `<label class="fld"><span>${l}</span>${ty === "t" ? `<textarea data-cfg="${k}" rows="${k === "title" ? 2 : 3}">${esc(D.cfg[k])}</textarea>` : `<input ${ty === "n" ? 'type="number" min="0" max="100"' : 'type="text"'} data-cfg="${k}" value="${esc(D.cfg[k])}">`}</label>`,
        ).join("") +
        "</div>";
    } else if (aTab === "subjects") {
      h =
        D.subjects
          .map(
            (s) =>
              `<div class="panel acard"><div class="arow"><input type="text" class="grow" data-sn="${s.id}" value="${esc(s.name)}" aria-label="Subject name">${btns("s", `data-s="${s.id}"`)}</div>` +
              s.chapters
                .map(
                  (c, i) =>
                    `<div class="arow ch"><span class="n">${i + 1}</span><input type="text" class="grow" data-ct="${s.id}|${c.id}" value="${esc(c.title)}" aria-label="Chapter title"><label class="mid"><input type="checkbox" data-cm="${s.id}|${c.id}" ${c.mid ? "checked" : ""}> Mid</label>${btns("c", `data-s="${s.id}" data-c="${c.id}"`)}</div>`,
                )
                .join("") +
              `<div class="arow addrow"><input type="text" class="grow" data-newc="${s.id}" placeholder="New chapter title…"><button class="btn sm primary" data-act="cadd" data-s="${s.id}">+ Add chapter</button></div></div>`,
          )
          .join("") +
        '<div class="panel acard"><div class="arow addrow" style="border:0;margin:0;padding:0"><input type="text" class="grow" id="newSub" placeholder="New subject name…"><button class="btn sm primary" data-act="sadd">+ Add subject</button></div></div>';
    } else if (aTab === "tasks") {
      h =
        '<p class="hint">Chapter complete হবে যখন নিচের সব task (দুই group মিলিয়ে) checked থাকবে।</p><div class="dgrid">' +
        [
          ["q", "01 · Question preparation"],
          ["s", "02 · Study workflow"],
        ]
          .map(
            ([g, l]) =>
              `<div class="panel acard"><div class="section-label" style="margin-top:0">${l}</div>` +
              D[g]
                .map(
                  (t) =>
                    `<div class="arow"><input type="text" class="grow" data-tl="${g}|${t.id}" value="${esc(t.label)}" aria-label="Task label"><button class="btn sm danger" data-act="tdel" data-g="${g}" data-t="${t.id}">🗑</button></div>`,
                )
                .join("") +
              `<div class="arow addrow"><input type="text" class="grow" data-newt="${g}" placeholder="New task…"><button class="btn sm primary" data-act="tadd" data-g="${g}">+ Add</button></div></div>`,
          )
          .join("") +
        "</div>";
    } else {
      h =
        '<div class="panel pad"><p class="hint">Backup-এ content + progress দুটোই থাকে। Copy করে রাখো, দরকারে paste করে Restore দাও।</p><textarea id="bk" placeholder="Backup JSON এখানে আসবে / paste করো"></textarea><div class="arow"><button class="btn" data-act="backup">Generate backup</button><button class="btn" data-act="copybk">Copy</button><button class="btn primary" data-act="restore">Restore from text</button></div><div class="arow addrow"><button class="btn danger" data-act="resetData">Reset content to default</button><button class="btn danger" data-act="resetProg">Reset progress only</button></div></div>';
    }
    $("adminBody").innerHTML = h;
  }
  function upd() {
    sync();
    saveD();
    applyCfg();
    fillSel();
    render();
  }
  const A = $("adminBody");
  A.addEventListener("input", (e) => {
    const t = e.target,
      d = t.dataset;
    if (d.cfg !== undefined)
      D.cfg[d.cfg] = d.cfg === "goal" ? Math.max(0, Math.min(100, +t.value || 0)) : t.value;
    else if (d.sn) fS(d.sn).name = t.value;
    else if (d.ct) fC(d.ct).title = t.value;
    else if (d.cm) fC(d.cm).mid = t.checked;
    else if (d.tl) {
      const [g, id] = d.tl.split("|");
      D[g].find((x) => x.id === id).label = t.value;
    } else return;
    upd();
  });
  A.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.matches(".addrow input")) e.target.nextElementSibling.click();
  });
  A.addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const d = b.dataset,
      a = d.act,
      s = d.s && fS(d.s);
    if (a === "sup" || a === "sdown") mv(D.subjects, D.subjects.indexOf(s), a === "sup" ? -1 : 1);
    else if (a === "sdel") {
      if (!confirm(`Delete "${s.name}" and all its chapters?`)) return;
      D.subjects.splice(D.subjects.indexOf(s), 1);
    } else if (a === "cup" || a === "cdown")
      mv(
        s.chapters,
        s.chapters.findIndex((c) => c.id === d.c),
        a === "cup" ? -1 : 1,
      );
    else if (a === "cdel") {
      if (!confirm("Delete this chapter?")) return;
      s.chapters = s.chapters.filter((c) => c.id !== d.c);
      Object.keys(state)
        .filter((k) => k.startsWith(d.c + "::"))
        .forEach((k) => delete state[k]);
      save();
    } else if (a === "cadd") {
      const i = A.querySelector(`[data-newc="${d.s}"]`);
      if (!i.value.trim()) return;
      s.chapters.push({ id: uid(), title: i.value.trim(), mid: true });
    } else if (a === "sadd") {
      const i = $("newSub");
      if (!i.value.trim()) return;
      D.subjects.push({ id: uid(), name: i.value.trim(), chapters: [] });
    } else if (a === "tadd") {
      const i = A.querySelector(`[data-newt="${d.g}"]`);
      if (!i.value.trim()) return;
      D[d.g].push({ id: uid(), label: i.value.trim() });
    } else if (a === "tdel") {
      if (T() < 2) {
        showToast("At least 1 task must remain");
        return;
      }
      D[d.g] = D[d.g].filter((x) => x.id !== d.t);
    } else if (a === "backup") {
      $("bk").value = JSON.stringify({ data: D, progress: state }, null, 1);
      return;
    } else if (a === "copybk") {
      $("bk").select();
      document.execCommand("copy");
      showToast("Copied");
      return;
    } else if (a === "restore") {
      try {
        const o = JSON.parse($("bk").value);
        if (
          !o.data ||
          !Array.isArray(o.data.subjects) ||
          !Array.isArray(o.data.q) ||
          !Array.isArray(o.data.s)
        )
          throw 0;
        D = o.data;
        D.cfg = { ...defaults().cfg, ...D.cfg };
        state = o.progress || {};
        save();
        showToast("Restored");
      } catch (x) {
        showToast("Invalid backup text");
        return;
      }
    } else if (a === "resetData") {
      if (
        !confirm("Subjects, chapters, tasks, text — সব default-এ ফিরবে। Progress থাকবে। Continue?")
      )
        return;
      D = defaults();
    } else if (a === "resetProg") {
      if (!confirm("সব checked task মুছে যাবে. Continue?")) return;
      state = {};
      save();
      showToast("Progress reset");
    }
    upd();
    renderAdmin();
  });
  document.querySelectorAll("[data-atab]").forEach((b) =>
    b.addEventListener("click", () => {
      aTab = b.dataset.atab;
      renderAdmin();
    }),
  );
  function showView(admin) {
    $("dashView").hidden = admin;
    $("adminView").hidden = !admin;
    if (admin) renderAdmin();
    else render();
    window.scrollTo(0, 0);
  }
  $("adminBtn").addEventListener("click", () => showView(true));
  $("backBtn").addEventListener("click", () => showView(false));
  window.cstStudyReady = (async () => {
    try {
      const savedData = await studyPersistence.get(DATA_KEY);
      if (
        savedData &&
        Array.isArray(savedData.subjects) &&
        Array.isArray(savedData.q) &&
        Array.isArray(savedData.s)
      ) {
        D = savedData;
      } else {
        D = defaults();
        await studyPersistence.save(DATA_KEY, D);
      }
      D.cfg = { ...defaults().cfg, ...D.cfg };
      const savedProgress = await studyPersistence.get(STORAGE_KEY);
      state =
        savedProgress && typeof savedProgress === "object" && !Array.isArray(savedProgress)
          ? savedProgress
          : {};
      if (savedProgress === undefined) await studyPersistence.save(STORAGE_KEY, state);
      sync();
      applyCfg();
      render();
      window.cstStudyPartReady("core");
    } catch (error) {
      window.cstStudyPartFailed(error);
      throw error;
    }
  })();

  (async () => {
    "use strict";
    const $$ = (s, r = document) => [...r.querySelectorAll(s)];
    const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const SK = "cst-fx-v1";
    await window.cstStudyReady;
    const S = Object.assign(
      {
        accent: "cyan",
        days: {},
        ach: [],
        achInit: false,
        focus: {},
        focusDone: 0,
        lite: null,
      },
      (await window.cstStudyPersistence.get(SK)) || {},
    );
    if (S.lite === null) S.lite = (navigator.hardwareConcurrency || 8) <= 2;
    const saveS = () =>
      window.cstStudyPersistence.save(SK, S).catch((error) => {
        window.cstStudyPartFailed(error);
        showToast("Could not save study settings to the database.");
      });
    const root = document.documentElement;
    const LITE = () => !!S.lite || RM;
    const pad = (n) => String(n).padStart(2, "0");
    const dayKey = (d = new Date()) =>
      d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
    const RANKS = [
      "Rookie",
      "Cadet",
      "Scout",
      "Analyst",
      "Operator",
      "Specialist",
      "Strategist",
      "Veteran",
      "Elite",
      "Master",
      "Grandmaster",
      "Architect",
      "Legend",
    ];
    const rank = (l) => RANKS[Math.min(l - 1, RANKS.length - 1)];
    const COLORS = ["#22e4ff", "#8b5cf6", "#ff3d9a", "#3dffb0", "#ffd24a"];

    /* ---------- settings: accent + lite mode ---------- */
    function setAccent(n) {
      root.dataset.accent = n;
      S.accent = n;
      saveS();
      $$(".sw button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.acc === n)));
    }
    function setLite(v) {
      S.lite = v;
      saveS();
      root.classList.toggle("lite", v);
      $("sbLite").setAttribute("aria-checked", String(v));
      showToast(v ? "Lite effects on" : "Full effects on");
    }

    /* ---------- metrics ---------- */
    function metrics() {
      const done = allChapters.reduce((n, c) => n + chapterTaskCount(c), 0);
      const total = allChapters.length * T() || 1;
      const completed = allChapters.filter(chapterComplete).length;
      const xp = done * 10 + completed * 50 + (S.focusDone || 0) * 25;
      const level = Math.floor(Math.sqrt(xp / 60)) + 1;
      const base = 60 * (level - 1) ** 2,
        next = 60 * level ** 2;
      return {
        done,
        total,
        completed,
        pct: (done / total) * 100,
        xp,
        level,
        into: xp - base,
        span: next - base,
      };
    }
    function streak() {
      let n = 0;
      const d = new Date();
      if (!(S.days[dayKey(d)] > 0)) d.setDate(d.getDate() - 1);
      while (S.days[dayKey(d)] > 0) {
        n++;
        d.setDate(d.getDate() - 1);
      }
      return n;
    }
    function nextUp() {
      const open = allChapters.filter((c) => !chapterComplete(c));
      if (!open.length) return null;
      const mid = open.filter((c) => c.isMid),
        pool = mid.length ? mid : open;
      return pool.slice().sort((a, b) => chapterTaskCount(b) - chapterTaskCount(a))[0];
    }

    /* ---------- small helpers ---------- */
    function countTo(el, to, fmt = (v) => Math.round(v), dur = 1000) {
      const from = +el._v || 0;
      el._v = to;
      cancelAnimationFrame(el._r);
      if (LITE() || from === to) {
        el.textContent = fmt(to);
        return;
      }
      const t0 = performance.now();
      el.textContent = fmt(from);
      const step = (t) => {
        const k = Math.min(1, (t - t0) / dur),
          e = 1 - Math.pow(1 - k, 4);
        el.textContent = fmt(from + (to - from) * e);
        if (k < 1) el._r = requestAnimationFrame(step);
      };
      el._r = requestAnimationFrame(step);
    }
    let qAt = 0;
    function later(msg) {
      const now = Date.now();
      qAt = Math.max(now + 700, qAt + 2000);
      setTimeout(() => showToast(msg), qAt - now);
    }
    function burst(x, y, n = 10, kind = "spark") {
      if (LITE()) return;
      const f = document.createDocumentFragment(),
        big = kind === "confetti";
      for (let i = 0; i < n; i++) {
        const p = document.createElement("i");
        p.className = "fxp" + (big ? " confetti" : "");
        const a = Math.random() * Math.PI * 2;
        const dx = big
          ? (Math.random() * 2 - 1) * (120 + Math.random() * 240)
          : Math.cos(a) * (26 + Math.random() * 46);
        const dy = big ? -(110 + Math.random() * 250) : Math.sin(a) * (26 + Math.random() * 46);
        p.style.cssText = `left:${x}px;top:${y}px;--dx:${dx}px;--dy:${dy}px;--fall:${280 + Math.random() * 320}px;--rot:${Math.random() * 900 - 450}deg;--c:${COLORS[i % COLORS.length]};--d:${big ? 1500 + Math.random() * 900 : 480 + Math.random() * 320}ms`;
        p.addEventListener("animationend", () => p.remove(), {
          once: true,
        });
        f.append(p);
      }
      document.body.append(f);
    }
    function findCard(c) {
      return $$(".chapter").find((card) => {
        const t = card.querySelector(".chapter-title"),
          h =
            card.parentElement &&
            card.parentElement.previousElementSibling &&
            card.parentElement.previousElementSibling.querySelector("h2");
        return t && h && t.textContent === c.title && h.textContent === c.subject;
      });
    }
    function jumpTo(c) {
      if ($("dashView").hidden) showView(false);
      let card = findCard(c);
      if (!card) {
        $("search").value = "";
        $("subjectFilter").value = "all";
        document.querySelector('[data-scope="all"]').click();
        card = findCard(c);
      }
      if (!card) return;
      card.scrollIntoView({
        behavior: RM ? "auto" : "smooth",
        block: "center",
      });
      card.classList.remove("flash");
      void card.offsetWidth;
      card.classList.add("flash");
    }

    /* ---------- achievements ---------- */
    const ACH = [
      {
        id: "first",
        t: "First step",
        d: "Check your first task",
        ok: (m) => m.done >= 1,
      },
      {
        id: "t25",
        t: "Warm-up",
        d: "Check 25 tasks",
        ok: (m) => m.done >= 25,
      },
      {
        id: "t100",
        t: "Momentum",
        d: "Check 100 tasks",
        ok: (m) => m.done >= 100,
      },
      {
        id: "ch1",
        t: "Chapter closed",
        d: "Fully complete one chapter",
        ok: (m) => m.completed >= 1,
      },
      {
        id: "ch5",
        t: "Five down",
        d: "Fully complete five chapters",
        ok: (m) => m.completed >= 5,
      },
      {
        id: "sub",
        t: "Subject cleared",
        d: "Complete every chapter of a subject",
        ok: () => {
          const ids = new Set(allChapters.filter(chapterComplete).map((c) => c.id));
          return subjects.some((s) => s.chapters.length && s.chapters.every((c) => ids.has(c.id)));
        },
      },
      {
        id: "half",
        t: "Halfway there",
        d: "Reach 50% coverage",
        ok: (m) => m.pct >= 50,
      },
      {
        id: "goal",
        t: "Goal locked",
        d: "Reach your coverage goal",
        ok: (m) => m.pct >= D.cfg.goal,
      },
      {
        id: "str3",
        t: "On a roll",
        d: "Study 3 days in a row",
        ok: () => streak() >= 3,
      },
      {
        id: "focus",
        t: "Deep work",
        d: "Finish a focus session",
        ok: () => (S.focusDone || 0) >= 1,
      },
    ];
    function hallRender() {
      const m = metrics(),
        fm = Object.values(S.focus).reduce((a, b) => a + b, 0);
      $("hallStats").innerHTML = [
        ["Level", m.level + " " + rank(m.level)],
        ["XP", m.xp],
        ["Streak", streak() + " days"],
        ["Focus", fm + " min"],
      ]
        .map(([k, v]) => `<div><b>${v}</b><small>${k}</small></div>`)
        .join("");
      $("hallGrid").innerHTML = ACH.map((a) => {
        const on = S.ach.includes(a.id);
        return `<div class="bd${on ? " on" : ""}"><span class="hex">${on ? "✦" : "•"}</span><div><b>${a.t}</b><small>${a.d}</small></div></div>`;
      }).join("");
    }

    /* ---------- main refresh (called from renderStats) ---------- */
    let prevComplete = null,
      lastToggleAt = 0;
    const bars = [];
    function buildBars() {
      const box = $("msBars");
      for (let i = 0; i < 14; i++) {
        const b = document.createElement("i");
        box.append(b);
        bars.push(b);
      }
    }
    function drawBars() {
      const vals = [];
      const d = new Date();
      d.setDate(d.getDate() - 13);
      for (let i = 0; i < 14; i++) {
        const k = dayKey(d);
        vals.push([k, S.days[k] || 0]);
        d.setDate(d.getDate() + 1);
      }
      const max = Math.max(5, ...vals.map((v) => v[1]));
      vals.forEach(([k, n], i) => {
        const b = bars[i];
        b.style.setProperty("--h", (n ? 18 + (n / max) * 82 : 10) + "%");
        b.className = n ? (i === 13 ? "t" : "") : "z";
        b.title = `${k}: ${n} task${n === 1 ? "" : "s"}`;
      });
      const s = streak();
      $("msStreak").textContent = s
        ? `${s} day streak, keep it going`
        : "No streak yet. Check a task today to start one.";
      $("hudStreak").textContent = "🔥 " + s;
    }
    function refresh() {
      const m = metrics(),
        per = T() || 1;
      /* numbers */
      countTo($("totalChapters"), allChapters.length);
      countTo($("completedChapters"), m.completed);
      countTo($("taskProgress"), Math.round(m.pct), (v) => Math.round(v) + "%");
      countTo($("rxPct"), Math.round(m.pct), (v) => Math.round(v) + "%");
      $("overallBar").parentElement.style.setProperty("--goal", D.cfg.goal + "%");
      /* reactor */
      $("rxArc").style.strokeDashoffset = 527.8 * (1 - Math.min(1, m.pct / 100));
      $("rxArc2").style.strokeDashoffset =
        414.7 * (1 - (allChapters.length ? m.completed / allChapters.length : 0));
      $("rxGoal").style.setProperty("--goal", D.cfg.goal);
      $("rxLbl").textContent = `Level ${m.level}, ${rank(m.level)}`;
      $("reactor").setAttribute(
        "aria-label",
        `Overall coverage ${Math.round(m.pct)} percent, goal ${D.cfg.goal} percent`,
      );
      /* HUD */
      $("hudLv").textContent = "Lv " + m.level + " " + rank(m.level);
      $("mbLv").textContent = "Lv " + m.level;
      $("hudXp").style.width = (m.into / m.span) * 100 + "%";
      $("hudXpn").textContent = `${m.into}/${m.span} xp`;
      /* mission */
      const n = nextUp();
      if (n) {
        const c = chapterTaskCount(n),
          all = [...questionTasks, ...studyTasks],
          nt = all.find((t) => !isChecked(n.id, t.id));
        $("msTitle").textContent = n.title;
        $("msSub").textContent =
          `${n.subject}. ${c} of ${per} tasks done${nt ? ", next: " + nt.label : ""}`;
        $("msRing").style.setProperty("--p", (c / per) * 100);
        $("msRingN").textContent = `${c}/${per}`;
        $("msGo").disabled = false;
      } else {
        $("msTitle").textContent = "Every chapter is complete";
        $("msSub").textContent =
          "Nothing left to do. Use revision tasks or reset progress to go again.";
        $("msRing").style.setProperty("--p", 100);
        $("msRingN").textContent = "100%";
        $("msGo").disabled = true;
      }
      drawBars();
      /* celebrate new chapter completions caused by a real click */
      const ids = new Set(allChapters.filter(chapterComplete).map((c) => c.id));
      if (prevComplete && Date.now() - lastToggleAt < 900) {
        allChapters
          .filter((c) => ids.has(c.id) && !prevComplete.has(c.id))
          .forEach((c) => {
            const card = findCard(c),
              r = card && card.getBoundingClientRect();
            burst(
              r ? r.left + r.width / 2 : innerWidth / 2,
              r ? r.top + r.height / 2 : innerHeight / 3,
              70,
              "confetti",
            );
            later("Chapter complete: " + c.title);
          });
      }
      prevComplete = ids;
      /* achievements */
      const fresh = ACH.filter((a) => !S.ach.includes(a.id) && a.ok(m));
      if (fresh.length) {
        fresh.forEach((a) => S.ach.push(a.id));
        if (S.achInit) fresh.forEach((a) => later("Achievement unlocked: " + a.t));
      }
      if (!S.achInit || fresh.length) {
        S.achInit = true;
        saveS();
      }
      $("sbHallN").textContent = S.ach.length + "/" + ACH.length;
      if ($("hallModal").classList.contains("show")) hallRender();
    }
    window.FX = { refresh };

    /* ---------- decorate re-rendered DOM ---------- */
    let pending = null;
    function decorate() {
      $$(".subject-heading").forEach((h) => {
        if (h.querySelector(".sring")) return;
        const name = h.querySelector("h2")?.textContent,
          cs = allChapters.filter((c) => c.subject === name);
        const tot = cs.length * (T() || 1) || 1,
          p = Math.round((cs.reduce((n, c) => n + chapterTaskCount(c), 0) / tot) * 100);
        const right = document.createElement("div");
        right.className = "sh-right";
        const ring = document.createElement("span");
        ring.className = "sring";
        ring.style.setProperty("--p", p);
        ring.title = p + "% of tasks done in this subject";
        const b = document.createElement("b");
        b.textContent = p;
        ring.append(b);
        right.append(ring);
        const cnt = h.querySelector(".subject-count");
        if (cnt) right.append(cnt);
        h.append(right);
      });
      if (pending && Date.now() - pending.t < 1500) {
        const inp = $$(".check input").find((i) => i.getAttribute("aria-label") === pending.label);
        if (inp) {
          inp.parentElement.classList.add("pop");
          if (pending.focus) inp.focus({ preventScroll: true });
        }
        pending = null;
      }
    }
    $("matrix").addEventListener(
      "change",
      (e) => {
        const t = e.target;
        if (!t.matches(".check input")) return;
        lastToggleAt = Date.now();
        pending = {
          label: t.getAttribute("aria-label"),
          focus: document.activeElement === t,
          t: lastToggleAt,
        };
        const k = dayKey();
        S.days[k] = Math.max(0, (S.days[k] || 0) + (t.checked ? 1 : -1));
        saveS();
        if (t.checked) {
          const r = t.getBoundingClientRect();
          burst(r.left + r.width / 2, r.top + r.height / 2, 12, "spark");
        }
      },
      true,
    );

    /* ---------- pointer: spotlight, tilt, cursor glow ---------- */
    const glow = $("cglow");
    let pe = null,
      ticking = false,
      cur = null;
    function onMove() {
      ticking = false;
      if (!pe) return;
      const e = pe,
        t = e.target.closest ? e.target.closest(".stat,.chapter,.mission,.reactor") : null;
      if (t !== cur) {
        if (cur) cur.style.transform = "";
        cur = t;
      }
      if (t) {
        const r = t.getBoundingClientRect(),
          x = e.clientX - r.left,
          y = e.clientY - r.top;
        t.style.setProperty("--mx", x + "px");
        t.style.setProperty("--my", y + "px");
        if (!LITE() && t.matches(".stat,.reactor"))
          t.style.transform = `perspective(800px) rotateX(${(y / r.height - 0.5) * -10}deg) rotateY(${(x / r.width - 0.5) * 10}deg)`;
      }
      if (!LITE())
        glow.style.transform = `translate3d(${e.clientX - 260}px,${e.clientY - 260}px,0)`;
    }
    document.addEventListener(
      "pointermove",
      (e) => {
        if (e.pointerType === "touch") return;
        pe = e;
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(onMove);
        }
      },
      { passive: true },
    );
    document.addEventListener("pointerleave", () => {
      if (cur) {
        cur.style.transform = "";
        cur = null;
      }
    });

    /* ---------- overlays ---------- */
    let lastFocus = null;
    function openOv(el, focusEl) {
      lastFocus = document.activeElement;
      el.classList.add("show");
      el.setAttribute("aria-hidden", "false");
      setTimeout(() => focusEl && focusEl.focus(), 40);
    }
    function closeOv(el) {
      el.classList.remove("show");
      el.setAttribute("aria-hidden", "true");
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
      lastFocus = null;
    }
    ["palette", "hallModal"].forEach((id) =>
      $(id).addEventListener("pointerdown", (e) => {
        if (e.target.id === id) closeOv($(id));
      }),
    );
    $("hallClose").addEventListener("click", () => closeOv($("hallModal")));
    const openHall = () => {
      hallRender();
      openOv($("hallModal"), $("hallClose"));
    };

    /* ---------- command palette ---------- */
    const pal = $("palette"),
      palIn = $("palIn"),
      palList = $("palList");
    let items = [],
      idx = 0;
    const tab = (s) => document.querySelector(`[data-scope="${s}"]`).click();
    function commands() {
      return [
        {
          t: "Jump to next up chapter",
          s: "Open the chapter we suggest",
          ic: "▸",
          run: () => {
            const n = nextUp();
            if (n) jumpTo(n);
          },
        },
        {
          t: "Start focus timer",
          s: "25 minutes, no distractions",
          ic: "◔",
          run: () => {
            dockOpen(true);
            dkSet(25);
            dkStart();
          },
        },
        {
          t: "Show achievements",
          s: "Badges, level and streak",
          ic: "✦",
          run: openHall,
        },
        { t: "Show all chapters", ic: "≡", run: () => tab("all") },
        {
          t: "Show Mid-Term chapters only",
          ic: "≡",
          run: () => tab("mid"),
        },
        {
          t: "Show Final Extra chapters only",
          ic: "≡",
          run: () => tab("extra"),
        },
        {
          t: "Open admin panel",
          s: "Edit subjects, chapters and tasks",
          ic: "⚙",
          run: () => $("adminBtn").click(),
        },
        {
          t: "Export checklist",
          ic: "⇪",
          run: () => $("exportBtn").click(),
        },
        { t: "Print checklist", ic: "⎙", run: () => $("printBtn").click() },
        { t: "Accent: cyan", ic: "●", run: () => setAccent("cyan") },
        { t: "Accent: violet", ic: "●", run: () => setAccent("violet") },
        { t: "Accent: magenta", ic: "●", run: () => setAccent("magenta") },
        { t: "Accent: lime", ic: "●", run: () => setAccent("lime") },
        {
          t: S.lite ? "Turn on full effects" : "Turn on lite effects",
          s: "Lite mode switches off heavy animation and blur",
          ic: "⚡",
          run: () => setLite(!S.lite),
        },
        {
          t: "Back to top",
          ic: "↑",
          run: () => scrollTo({ top: 0, behavior: RM ? "auto" : "smooth" }),
        },
      ];
    }
    function build(q) {
      q = q.trim().toLowerCase();
      const toks = q.split(/\s+/).filter(Boolean),
        ok = (t) => toks.every((k) => t.includes(k));
      const cm = commands().filter((x) => ok((x.t + " " + (x.s || "")).toLowerCase()));
      let ch = [];
      if (toks.length)
        ch = allChapters
          .filter((x) => ok((x.title + " " + x.subject).toLowerCase()))
          .sort(
            (a, b) =>
              (b.title.toLowerCase().startsWith(q) ? 1 : 0) -
              (a.title.toLowerCase().startsWith(q) ? 1 : 0),
          )
          .slice(0, 30)
          .map((x) => ({
            t: x.title,
            s: x.subject,
            ic: "#",
            tag: x.isMid ? "Mid-Term" : "Final extra",
            run: () => jumpTo(x),
          }));
      items = [...ch, ...cm];
      idx = 0;
      draw();
    }
    function draw() {
      palList.textContent = "";
      if (!items.length) {
        const li = document.createElement("li");
        li.className = "none";
        li.textContent = "No match. Try a chapter name, or a command such as focus or export.";
        palList.append(li);
        return;
      }
      items.forEach((it, i) => {
        const li = document.createElement("li");
        li.setAttribute("role", "option");
        li.setAttribute("aria-selected", String(i === idx));
        li.dataset.i = i;
        const ic = document.createElement("span");
        ic.className = "pi-ic";
        ic.textContent = it.ic;
        const tx = document.createElement("span");
        tx.className = "pi-tx";
        const b = document.createElement("b");
        b.textContent = it.t;
        tx.append(b);
        if (it.s) {
          const s = document.createElement("small");
          s.textContent = it.s;
          tx.append(s);
        }
        li.append(ic, tx);
        if (it.tag) {
          const g = document.createElement("em");
          g.textContent = it.tag;
          li.append(g);
        }
        palList.append(li);
      });
    }
    function setIdx(i) {
      idx = (i + items.length) % items.length;
      [...palList.children].forEach((li, j) => li.setAttribute("aria-selected", String(j === idx)));
      const el = palList.children[idx];
      if (el) el.scrollIntoView({ block: "nearest" });
    }
    function runItem(i) {
      const it = items[i];
      if (!it) return;
      closeOv(pal);
      setTimeout(it.run, 60);
    }
    function palOpen() {
      palIn.value = "";
      build("");
      openOv(pal, palIn);
    }
    palIn.addEventListener("input", () => build(palIn.value));
    palIn.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (items.length) setIdx(idx + 1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (items.length) setIdx(idx - 1);
      } else if (e.key === "Enter") {
        e.preventDefault();
        runItem(idx);
      } else if (e.key === "Tab") e.preventDefault();
    });
    palList.addEventListener("pointermove", (e) => {
      const li = e.target.closest("li[data-i]");
      if (li && +li.dataset.i !== idx) setIdx(+li.dataset.i);
    });
    palList.addEventListener("click", (e) => {
      const li = e.target.closest("li[data-i]");
      if (li) runItem(+li.dataset.i);
    });

    /* ---------- focus timer ---------- */
    const DK = {
      mins: 25,
      total: 25 * 6e4,
      left: 25 * 6e4,
      run: false,
      end: 0,
      timer: 0,
    };
    const fmtT = (ms) => {
      const s = Math.max(0, Math.ceil(ms / 1000));
      return pad(Math.floor(s / 60)) + ":" + pad(s % 60);
    };
    function dkDraw() {
      const f = DK.left / DK.total;
      $("dkTime").textContent = $("dkMini").textContent = fmtT(DK.left);
      $("dkArc").style.strokeDashoffset = 326.7 * (1 - f);
      $("dkMiniArc").style.strokeDashoffset = 119.4 * (1 - f);
      $("dkGo").textContent = DK.run ? "Pause" : DK.left < DK.total ? "Resume" : "Start";
      $("dock").classList.toggle("running", DK.run);
      $$("[data-m]").forEach((b) =>
        b.setAttribute("aria-pressed", String(+b.dataset.m === DK.mins)),
      );
      $("dkNote").textContent = `Today: ${S.focus[dayKey()] || 0} min focused`;
    }
    function dkStop() {
      DK.run = false;
      clearInterval(DK.timer);
      DK.timer = 0;
    }
    function dkStart() {
      if (DK.run) return;
      DK.end = Date.now() + DK.left;
      DK.run = true;
      DK.timer = setInterval(dkTick, 250);
      dkDraw();
    }
    function dkSet(m) {
      dkStop();
      DK.mins = m;
      DK.total = DK.left = m * 6e4;
      dkDraw();
    }
    function beep() {
      try {
        const a = new (window.AudioContext || window.webkitAudioContext)();
        [660, 880, 1100].forEach((f, i) => {
          const o = a.createOscillator(),
            g = a.createGain(),
            t = a.currentTime + i * 0.18;
          o.type = "sine";
          o.frequency.value = f;
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(0.16, t + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
          o.connect(g);
          g.connect(a.destination);
          o.start(t);
          o.stop(t + 0.2);
        });
      } catch (e) {}
    }
    function dkTick() {
      DK.left = DK.end - Date.now();
      if (DK.left <= 0) {
        dkStop();
        DK.left = 0;
        dkDraw();
        if (DK.mins >= 10) {
          const k = dayKey();
          S.focus[k] = (S.focus[k] || 0) + DK.mins;
          S.focusDone = (S.focusDone || 0) + 1;
          saveS();
          showToast(`Focus session done: ${DK.mins} min, +25 xp`);
          burst(innerWidth - 70, innerHeight - 70, 40, "confetti");
        } else showToast("Break over. Ready for the next session?");
        beep();
        DK.left = DK.total;
        dkDraw();
        refresh();
        return;
      }
      dkDraw();
    }
    function dockOpen(v) {
      $("dock").classList.toggle("open", v);
      $("dkFab").setAttribute("aria-expanded", String(v));
    }
    $("dkFab").addEventListener("click", () => dockOpen(!$("dock").classList.contains("open")));
    $("dkGo").addEventListener("click", () => (DK.run ? (dkStop(), dkDraw()) : dkStart()));
    $("dkReset").addEventListener("click", () => dkSet(DK.mins));
    $$("[data-m]").forEach((b) => b.addEventListener("click", () => dkSet(+b.dataset.m)));
    document.addEventListener("pointerdown", (e) => {
      if (!e.target.closest("#dock")) dockOpen(false);
    });

    /* ---------- countdown to Mid-Term target ---------- */
    function parseT(s) {
      let t = Date.parse(s);
      if (!isNaN(t)) return t;
      const m = /(\d{1,2})\s+([A-Za-z]{3})[a-z]*\.?,?\s+(\d{4})/.exec(s || "");
      if (m) {
        const i = [
          "jan",
          "feb",
          "mar",
          "apr",
          "may",
          "jun",
          "jul",
          "aug",
          "sep",
          "oct",
          "nov",
          "dec",
        ].indexOf(m[2].toLowerCase());
        if (i >= 0) return new Date(+m[3], i, +m[1]).getTime();
      }
      return NaN;
    }
    function setU(id, v) {
      const el = $(id),
        s = pad(v);
      if (el.textContent !== s) {
        el.textContent = s;
        if (!LITE()) {
          el.classList.remove("flip");
          void el.offsetWidth;
          el.classList.add("flip");
        }
      }
    }
    function countdown() {
      if (document.hidden) return;
      const t = parseT(D.cfg.target),
        box = $("count");
      if (isNaN(t)) {
        box.hidden = true;
        return;
      }
      box.hidden = false;
      let ms = t - Date.now();
      const past = ms < 0;
      ms = Math.abs(ms);
      setU("cD", Math.floor(ms / 864e5));
      setU("cH", Math.floor(ms / 36e5) % 24);
      setU("cM", Math.floor(ms / 6e4) % 60);
      setU("cS", Math.floor(ms / 1e3) % 60);
      $("cNote").textContent = past ? "since the Mid-Term target" : "until the Mid-Term target";
    }

    /* ---------- keyboard ---------- */
    const anyOv = () =>
      pal.classList.contains("show") ||
      $("hallModal").classList.contains("show") ||
      $("exportModal").classList.contains("open");
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        pal.classList.contains("show") ? closeOv(pal) : palOpen();
        return;
      }
      if (e.key === "Escape") {
        if (pal.classList.contains("show")) closeOv(pal);
        else if ($("hallModal").classList.contains("show")) closeOv($("hallModal"));
        else if ($("exportModal").classList.contains("open"))
          $("exportModal").classList.remove("open");
        else if (root.classList.contains("sb-open")) closeSb();
        else dockOpen(false);
        return;
      }
      if (
        e.key === "/" &&
        !anyOv() &&
        !/^(input|textarea|select)$/i.test(document.activeElement.tagName) &&
        !$("dashView").hidden
      ) {
        e.preventDefault();
        $("search").focus();
      }
    });

    /* ---------- sidebar / drawer ---------- */
    const sb = $("sb");
    let sbOpener = null;
    function openSb(from) {
      sbOpener = from || document.activeElement;
      root.classList.add("sb-open");
      setTimeout(() => $("sbClose").focus({ preventScroll: true }), 80);
    }
    function closeSb(restore = true) {
      if (!root.classList.contains("sb-open")) return;
      root.classList.remove("sb-open");
      if (restore && sbOpener && sbOpener.focus) sbOpener.focus({ preventScroll: true });
      sbOpener = null;
    }
    const NAV = {
      dash: () => {
        if ($("dashView").hidden) showView(false);
        else scrollTo({ top: 0, behavior: RM ? "auto" : "smooth" });
      },
      next: () => {
        const n = nextUp();
        if (n) jumpTo(n);
        else showToast("Every chapter is complete");
      },
      hall: openHall,
      focus: () => dockOpen(true),
      admin: () => showView(true),
      export: () => $("exportBtn").click(),
      print: () => $("printBtn").click(),
    };
    sb.addEventListener("click", (e) => {
      const b = e.target.closest(".sb-i");
      if (!b) return;
      if (b.dataset.nav) NAV[b.dataset.nav]();
      closeSb(false);
    });
    $("sbFab").addEventListener("click", (e) => openSb(e.currentTarget));
    $("mbMenu").addEventListener("click", (e) => openSb(e.currentTarget));
    $("sbClose").addEventListener("click", () => closeSb());
    $("sbBack").addEventListener("click", () => closeSb());
    $("sbLite").addEventListener("click", () => setLite(!S.lite));
    addEventListener("resize", () => {
      if (innerWidth > 1000) closeSb(false);
    });
    /* swipe: from the left edge opens, swipe left closes */
    let tx = 0,
      ty = 0;
    document.addEventListener(
      "touchstart",
      (e) => {
        const t = e.touches[0];
        tx = t.clientX;
        ty = t.clientY;
      },
      { passive: true },
    );
    document.addEventListener(
      "touchend",
      (e) => {
        if (innerWidth > 1000) return;
        const t = e.changedTouches[0],
          dx = t.clientX - tx,
          dy = Math.abs(t.clientY - ty);
        if (dy > 60 || Math.abs(dx) < 70) return;
        const open = root.classList.contains("sb-open");
        if (dx > 0 && tx < 26 && !open && !anyOv()) openSb(document.body);
        else if (dx < 0 && open) closeSb();
      },
      { passive: true },
    );
    /* active states follow the app */
    function syncNav() {
      const admin = $("dashView").hidden;
      const d = sb.querySelector('[data-nav="dash"]'),
        a = sb.querySelector('[data-nav="admin"]');
      admin
        ? (d.removeAttribute("aria-current"), a.setAttribute("aria-current", "page"))
        : (a.removeAttribute("aria-current"), d.setAttribute("aria-current", "page"));
    }
    function syncSeg() {
      $$("[data-sf]").forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.sf === scope)),
      );
    }
    const _showView = showView;
    showView = function (a) {
      _showView(a);
      syncNav();
    };
    $$("[data-scope]").forEach((b) => b.addEventListener("click", syncSeg));
    $$("[data-sf]").forEach((b) => b.addEventListener("click", () => tab(b.dataset.sf)));

    /* ---------- wiring + boot ---------- */
    $$(".sw button").forEach((b) => b.addEventListener("click", () => setAccent(b.dataset.acc)));
    $("hudK").addEventListener("click", palOpen);
    $("msGo").addEventListener("click", () => {
      const n = nextUp();
      if (n) jumpTo(n);
    });
    $("msFocus").addEventListener("click", () => {
      dockOpen(true);
      dkSet(25);
      dkStart();
    });
    $("hudK").querySelector("kbd").textContent = /Mac|iPhone|iPad/.test(navigator.platform)
      ? "⌘K"
      : "Ctrl K";
    setAccent(S.accent);
    root.classList.toggle("lite", !!S.lite);
    $("sbLite").setAttribute("aria-checked", String(!!S.lite));
    syncNav();
    syncSeg();
    buildBars();
    dkDraw();
    decorate();
    countdown();
    setInterval(countdown, 1000);
    new MutationObserver(decorate).observe($("matrix"), {
      childList: true,
    });
    requestAnimationFrame(() => requestAnimationFrame(refresh));
    window.cstStudyPartReady("fx");
  })().catch((error) => window.cstStudyPartFailed(error));

  (async () => {
    "use strict";
    /* ===== DataStore (schema v1) ===== */
    const KEY = "cst-hub-v1",
      DAY = 864e5,
      blank = () => ({ schema: 1, exams: [], cards: [], reviews: [] });
    await window.cstStudyReady;
    let H = (await window.cstStudyPersistence.get(KEY)) || blank();
    if (
      H.schema !== 1 ||
      !Array.isArray(H.cards) ||
      !Array.isArray(H.exams) ||
      !Array.isArray(H.reviews)
    )
      H = blank();
    if ((await window.cstStudyPersistence.get(KEY)) === undefined)
      await window.cstStudyPersistence.save(KEY, H);
    const save = () => {
      return window.cstStudyPersistence.save(KEY, H).then(
        () => true,
        (error) => {
          window.cstStudyPartFailed(error);
          showToast("Could not save study tools to the database.");
          return false;
        },
      );
    };
    const uid = () => "h" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const today = () => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    };
    const el = (t, a = {}, ...k) => {
      const e = document.createElement(t);
      for (const [n, v] of Object.entries(a)) {
        if (n === "class") e.className = v;
        else if (n.startsWith("on")) e.addEventListener(n.slice(2), v);
        else if (v !== false && v != null) e.setAttribute(n, v === true ? "" : v);
      }
      e.append(...k.filter((x) => x != null));
      return e;
    };
    const chap = (id) => allChapters.find((c) => c.id === id);

    /* ===== ReviewEngine: SM-2 (Again=1, Hard=3, Good=4, Easy=5) ===== */
    function sm2(c, q) {
      let { ef, int, rep } = c;
      if (q < 3) {
        rep = 0;
        int = 1;
      } else {
        int = rep === 0 ? 1 : rep === 1 ? 6 : Math.round(int * ef);
        if (q === 5) int += 1;
        rep++;
      }
      ef = Math.max(1.3, ef + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
      return { ef, int, rep };
    }
    const dueCards = () => H.cards.filter((c) => c.due <= Date.now()).sort((a, b) => a.due - b.due);
    function rate(c, q) {
      const r = sm2(c, q);
      H.reviews.push({
        id: uid(),
        cardId: c.id,
        t: Date.now(),
        q,
        prev: c.int,
        next: r.int,
      });
      if (H.reviews.length > 20000) H.reviews.splice(0, H.reviews.length - 20000);
      Object.assign(c, r, { due: today() + r.int * DAY });
      save();
      badge();
    }

    /* ===== Exams: readiness from syllabus completion + recall (kept separate) ===== */
    function readiness(x) {
      const sids = D.subjects.filter((s) => x.subs.includes(s.id));
      const ids = new Set(
        sids.flatMap((s) => s.chapters.filter((c) => !x.midOnly || c.mid).map((c) => c.id)),
      );
      const cs = allChapters.filter((c) => ids.has(c.id)),
        tot = cs.length * T();
      const done = cs.reduce((n, c) => n + chapterTaskCount(c), 0);
      const cardIds = new Set(H.cards.filter((c) => ids.has(c.cid)).map((c) => c.id));
      const rv = H.reviews.filter((r) => cardIds.has(r.cardId) && r.t > Date.now() - 60 * DAY);
      return {
        pct: tot ? Math.round((done / tot) * 100) : null,
        n: cs.length,
        rv: rv.length,
        recall:
          rv.length >= 5 ? Math.round((rv.filter((r) => r.q >= 3).length / rv.length) * 100) : null,
      };
    }

    /* ===== ExportService: escaped CSV (formula-injection safe, UTF-8 BOM) + validated JSON ===== */
    const cell = (v) => {
      let s = v == null ? "" : String(v);
      if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
      return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const csv = (head, rows) =>
      "\ufeff" + [head, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
    function dl(name, text, type) {
      const u = URL.createObjectURL(new Blob([text], { type }));
      const a = el("a", { href: u, download: name });
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(u), 2e3);
    }
    const iso = (t) => new Date(t).toISOString();
    const EXPORTS = {
      cards: () =>
        csv(
          ["id", "chapter", "front", "back", "interval_days", "ease", "due"],
          H.cards.map((c) => [
            c.id,
            (chap(c.cid) || {}).title || "",
            c.front,
            c.back,
            c.int,
            c.ef.toFixed(2),
            iso(c.due),
          ]),
        ),
      reviews: () =>
        csv(
          ["id", "card_id", "time", "rating", "prev_interval", "next_interval"],
          H.reviews.map((r) => [r.id, r.cardId, iso(r.t), r.q, r.prev, r.next]),
        ),
      exams: () =>
        csv(
          [
            "name",
            "type",
            "date",
            "priority",
            "target_percent",
            "syllabus_completion",
            "recall_percent",
          ],
          H.exams.map((x) => {
            const r = readiness(x);
            return [
              x.name,
              x.type,
              x.date,
              x.priority,
              x.target,
              r.pct == null ? "" : r.pct,
              r.recall == null ? "insufficient data" : r.recall,
            ];
          }),
        ),
    };
    function validate(o) {
      if (!o || o.schema !== 1) throw new Error("Not a Study hub backup (schema 1).");
      const s = (v, m) => typeof v === "string" && v.length <= m,
        n = Number.isFinite;
      return {
        cards: (o.cards || [])
          .filter(
            (c) =>
              c &&
              s(c.id, 40) &&
              s(c.front, 2e3) &&
              s(c.back, 2e3) &&
              n(c.due) &&
              n(c.ef) &&
              n(c.int),
          )
          .map((c) => ({
            id: c.id,
            cid: s(c.cid, 80) ? c.cid : "",
            front: c.front,
            back: c.back,
            ef: Math.max(1.3, c.ef),
            int: Math.max(0, c.int),
            rep: +c.rep || 0,
            due: c.due,
            created: +c.created || Date.now(),
            updated: +c.updated || Date.now(),
          })),
        reviews: (o.reviews || [])
          .filter(
            (r) => r && s(r.id, 40) && s(r.cardId, 40) && n(r.t) && [1, 3, 4, 5].includes(r.q),
          )
          .map((r) => ({
            id: r.id,
            cardId: r.cardId,
            t: r.t,
            q: r.q,
            prev: +r.prev || 0,
            next: +r.next || 0,
          })),
        exams: (o.exams || [])
          .filter((x) => x && s(x.id, 40) && s(x.name, 120) && /^\d{4}-\d{2}-\d{2}$/.test(x.date))
          .map((x) => ({
            id: x.id,
            name: x.name,
            type: s(x.type, 30) ? x.type : "Custom",
            date: x.date,
            priority: ["Low", "Normal", "High"].includes(x.priority) ? x.priority : "Normal",
            target: Math.min(100, Math.max(0, +x.target || 80)),
            midOnly: !!x.midOnly,
            subs: Array.isArray(x.subs) ? x.subs.filter((v) => s(v, 80)) : [],
          })),
      };
    }
    function importJSON(text) {
      const v = validate(JSON.parse(text));
      let add = 0,
        skip = 0;
      for (const k of ["cards", "reviews", "exams"]) {
        const have = new Set(H[k].map((x) => x.id));
        v[k].forEach((x) => {
          if (have.has(x.id)) skip++;
          else {
            H[k].push(x);
            add++;
          }
        });
      }
      if (save()) showToast(`Imported ${add}, skipped ${skip} duplicates`);
      badge();
    }

    /* ===== UI: overlay panel (reuses the existing overlay/dialog styles) ===== */
    const ov = el("div", { class: "ov", id: "hub", "aria-hidden": "true" }),
      box = el("div", {
        class: "hall",
        role: "dialog",
        "aria-modal": "true",
        "aria-label": "Study hub",
      });
    ov.append(box);
    document.body.append(ov);
    let tab = "review",
      isOpen = false,
      prev = null,
      flip = false,
      editId = null,
      qf = "";
    function show(t) {
      if (t) tab = t;
      prev = document.activeElement;
      ov.classList.add("show");
      ov.setAttribute("aria-hidden", "false");
      isOpen = true;
      draw();
      setTimeout(() => {
        const b = box.querySelector("button");
        b && b.focus();
      }, 50);
    }
    function hide() {
      ov.classList.remove("show");
      ov.setAttribute("aria-hidden", "true");
      isOpen = false;
      if (prev && prev.focus) prev.focus();
    }
    ov.addEventListener("pointerdown", (e) => {
      if (e.target === ov) hide();
    });
    addEventListener(
      "keydown",
      (e) => {
        if (isOpen && e.key === "Escape") {
          e.stopImmediatePropagation();
          hide();
        }
      },
      true,
    );
    function draw() {
      box.textContent = "";
      const tabs = el(
        "div",
        { class: "tabs", role: "tablist" },
        ...[
          ["review", "Review"],
          ["cards", "Cards"],
          ["exams", "Exams"],
          ["data", "Data"],
        ].map(([k, l]) =>
          el(
            "button",
            {
              class: "tab" + (k === tab ? " active" : ""),
              role: "tab",
              "aria-selected": String(k === tab),
              onclick: () => {
                tab = k;
                flip = false;
                draw();
              },
            },
            l,
          ),
        ),
      );
      box.append(
        el(
          "div",
          { class: "hall-top" },
          el("h2", {}, "Study hub"),
          el("button", { class: "btn sm", onclick: hide }, "Close"),
        ),
        tabs,
        el("div", { style: "margin-top:14px" }, VIEWS[tab]()),
      );
    }
    const field = (label, node) => el("label", { class: "fld" }, el("span", {}, label), node);

    function reviewView() {
      const w = el("div"),
        q = dueCards(),
        mastered = H.cards.filter((c) => c.int >= 21).length;
      w.append(
        el(
          "p",
          { class: "hint" },
          `${q.length} due, ${H.cards.length} cards, ${mastered} mastered (interval 21 days or more). Method: SM-2.`,
        ),
      );
      if (!H.cards.length) {
        w.append(
          el("div", { class: "empty" }, "No cards yet. Add one from a chapter in the Cards tab."),
        );
        return w;
      }
      if (!q.length) {
        w.append(
          el(
            "div",
            { class: "empty" },
            "All caught up. Next card is due " +
              new Date(Math.min(...H.cards.map((c) => c.due))).toLocaleDateString() +
              ".",
          ),
        );
        return w;
      }
      const c = q[0],
        ch = chap(c.cid);
      w.append(
        el(
          "button",
          {
            class: "fc",
            "aria-label": flip
              ? "Answer shown. Press to hide it."
              : "Question. Press to show the answer.",
            onclick: () => {
              flip = !flip;
              draw();
            },
          },
          el("small", {}, ch ? ch.title : "No chapter linked"),
          el("b", {}, flip ? c.back : c.front),
        ),
      );
      if (flip)
        w.append(
          el(
            "div",
            { class: "row" },
            ...[
              ["Again", 1],
              ["Hard", 3],
              ["Good", 4],
              ["Easy", 5],
            ].map(([l, v]) =>
              el(
                "button",
                {
                  class: "btn" + (v === 4 ? " primary" : ""),
                  onclick: () => {
                    rate(c, v);
                    flip = false;
                    draw();
                  },
                },
                `${l}, ${sm2(c, v).int}d`,
              ),
            ),
          ),
        );
      else
        w.append(el("p", { class: "hint" }, "Try to recall the answer first, then flip the card."));
      return w;
    }

    function cardsView() {
      const w = el("div"),
        ed = H.cards.find((c) => c.id === editId);
      const sel = el(
        "select",
        {},
        el("option", { value: "" }, "No chapter"),
        ...allChapters.map((c) =>
          el(
            "option",
            { value: c.id, selected: !!ed && ed.cid === c.id },
            c.subject + ": " + c.title,
          ),
        ),
      );
      const f = el("textarea", { rows: 2, maxlength: 2000 }, ed ? ed.front : ""),
        b = el("textarea", { rows: 3, maxlength: 2000 }, ed ? ed.back : "");
      w.append(
        field("Chapter", sel),
        field("Front (question, term or formula)", f),
        field("Back (answer)", b),
        el(
          "div",
          { class: "row" },
          el(
            "button",
            {
              class: "btn primary",
              onclick: () => {
                const fv = f.value.trim(),
                  bv = b.value.trim();
                if (!fv || !bv) {
                  showToast("Write both sides of the card");
                  return;
                }
                if (ed)
                  Object.assign(ed, {
                    front: fv,
                    back: bv,
                    cid: sel.value,
                    updated: Date.now(),
                  });
                else
                  H.cards.push({
                    id: uid(),
                    cid: sel.value,
                    front: fv,
                    back: bv,
                    ef: 2.5,
                    int: 0,
                    rep: 0,
                    due: Date.now(),
                    created: Date.now(),
                    updated: Date.now(),
                  });
                showToast(ed ? "Card updated, review history kept" : "Card added");
                editId = null;
                save();
                badge();
                draw();
              },
            },
            ed ? "Save changes" : "Add card",
          ),
          ed
            ? el(
                "button",
                {
                  class: "btn",
                  onclick: () => {
                    editId = null;
                    draw();
                  },
                },
                "Cancel edit",
              )
            : null,
        ),
      );
      const list = el("div", { style: "margin-top:14px" }),
        inp = el("input", {
          type: "search",
          placeholder: "Filter cards",
          value: qf,
          "aria-label": "Filter cards",
        });
      const fill = () => {
        list.textContent = "";
        const k = qf.toLowerCase(),
          m = H.cards.filter((c) => !k || (c.front + " " + c.back).toLowerCase().includes(k));
        if (!m.length) {
          list.append(el("div", { class: "empty" }, "No matching cards."));
          return;
        }
        m.slice(0, 80).forEach((c) =>
          list.append(
            el(
              "div",
              { class: "li" },
              el(
                "div",
                { class: "grow" },
                el("b", {}, c.front.slice(0, 90)),
                el(
                  "small",
                  {},
                  (chap(c.cid) || {}).title || "No chapter",
                  ", due ",
                  new Date(c.due).toLocaleDateString(),
                ),
              ),
              el(
                "button",
                {
                  class: "btn sm",
                  onclick: () => {
                    editId = c.id;
                    draw();
                  },
                },
                "Edit",
              ),
              el(
                "button",
                {
                  class: "btn sm danger",
                  onclick: () => {
                    if (confirm("Delete this card? Its review history stays in your data.")) {
                      H.cards = H.cards.filter((x) => x.id !== c.id);
                      save();
                      badge();
                      draw();
                    }
                  },
                },
                "Delete",
              ),
            ),
          ),
        );
      };
      inp.addEventListener("input", () => {
        qf = inp.value;
        fill();
      });
      fill();
      w.append(inp, list);
      return w;
    }

    function examsView() {
      const w = el("div"),
        name = el("input", {
          type: "text",
          maxlength: 120,
          placeholder: "Exam name",
        }),
        date = el("input", { type: "date" });
      const type = el(
        "select",
        {},
        ...["Mid-term", "Final", "Class test", "Practical", "Assignment", "Custom"].map((t) =>
          el("option", {}, t),
        ),
      );
      const pri = el("select", {}, ...["Normal", "High", "Low"].map((t) => el("option", {}, t)));
      const tgt = el("input", {
          type: "number",
          min: 0,
          max: 100,
          value: 80,
        }),
        mid = el("input", { type: "checkbox" });
      const subs = D.subjects.map((s) => ({
        s,
        cb: el("input", { type: "checkbox" }),
      }));
      w.append(
        field("Name", name),
        field("Date", date),
        field("Type", type),
        field("Priority", pri),
        field("Target syllabus completion %", tgt),
        el("label", { class: "check" }, mid, el("span", {}, "Mid-Term chapters only")),
        el("div", { class: "section-label" }, "Included subjects"),
        el(
          "div",
          { class: "checks" },
          ...subs.map(({ s, cb }) => el("label", { class: "check" }, cb, el("span", {}, s.name))),
        ),
        el(
          "div",
          { class: "row", style: "margin-top:12px" },
          el(
            "button",
            {
              class: "btn primary",
              onclick: () => {
                if (!name.value.trim() || !date.value) {
                  showToast("Add a name and date");
                  return;
                }
                const ids = subs.filter((x) => x.cb.checked).map((x) => x.s.id);
                if (!ids.length) {
                  showToast("Pick at least one subject");
                  return;
                }
                H.exams.push({
                  id: uid(),
                  name: name.value.trim(),
                  type: type.value,
                  date: date.value,
                  priority: pri.value,
                  target: Math.min(100, Math.max(0, +tgt.value || 80)),
                  midOnly: mid.checked,
                  subs: ids,
                });
                save();
                draw();
              },
            },
            "Add exam",
          ),
        ),
      );
      const list = el("div", { style: "margin-top:16px" });
      [...H.exams]
        .sort((a, b) => a.date.localeCompare(b.date))
        .forEach((x) => {
          const left = Math.ceil((new Date(x.date + "T00:00:00").getTime() - today()) / DAY),
            r = readiness(x);
          list.append(
            el(
              "div",
              { class: "li" },
              el(
                "div",
                { class: "grow" },
                el("b", {}, x.name),
                el(
                  "small",
                  {},
                  `${x.type}, ${x.priority} priority, ${left < 0 ? "passed " + -left + " days ago" : left === 0 ? "today" : left + " days left"}`,
                ),
                el(
                  "small",
                  {},
                  `Syllabus completion ${r.pct == null ? "n/a" : r.pct + "%"} of ${x.target}% target (${r.n} chapters). Recall: ${r.recall == null ? "insufficient data (" + r.rv + " of 5 reviews)" : r.recall + "%"}`,
                ),
              ),
              el(
                "button",
                {
                  class: "btn sm danger",
                  onclick: () => {
                    if (confirm("Delete this exam?")) {
                      H.exams = H.exams.filter((e) => e.id !== x.id);
                      save();
                      draw();
                    }
                  },
                },
                "Delete",
              ),
            ),
          );
        });
      if (!H.exams.length)
        list.append(
          el("div", { class: "empty" }, "No exams yet. Each exam can cover different subjects."),
        );
      w.append(
        list,
        el(
          "p",
          { class: "hint" },
          "Syllabus completion counts checked tasks. It is not proof of mastery. Recall comes from flashcard reviews in the last 60 days.",
        ),
      );
      return w;
    }

    function dataView() {
      const w = el("div"),
        file = el("input", {
          type: "file",
          accept: "application/json,.json",
          "aria-label": "Backup file",
        });
      file.addEventListener("change", async () => {
        try {
          importJSON(await file.files[0].text());
          draw();
        } catch (e) {
          showToast("Import failed: " + (e.message || "invalid file"));
        }
      });
      w.append(
        el(
          "p",
          { class: "hint" },
          "CSV files open in Excel or Sheets. Text starting with = + - or @ is neutralised so it cannot run as a formula.",
        ),
        el(
          "div",
          { class: "row" },
          ...[
            ["cards", "Cards CSV"],
            ["reviews", "Reviews CSV"],
            ["exams", "Exams CSV"],
          ].map(([k, l]) =>
            el(
              "button",
              {
                class: "btn",
                onclick: () => dl(`cst-${k}.csv`, EXPORTS[k](), "text/csv;charset=utf-8"),
              },
              l,
            ),
          ),
          el(
            "button",
            {
              class: "btn primary",
              onclick: () =>
                dl("cst-hub-backup.json", JSON.stringify(H, null, 1), "application/json"),
            },
            "Backup JSON",
          ),
        ),
        field("Restore from backup (merges, never overwrites)", file),
        el(
          "p",
          { class: "hint" },
          `Stored: ${H.cards.length} cards, ${H.reviews.length} reviews, ${H.exams.length} exams. Schema version ${H.schema}. Your chapter progress and the Admin backup are separate and unchanged.`,
        ),
      );
      return w;
    }
    const VIEWS = {
      review: reviewView,
      cards: cardsView,
      exams: examsView,
      data: dataView,
    };

    /* ===== sidebar entries ===== */
    const nav = document.querySelector(".sb-nav");
    let dueEm;
    function addNav(x, ic, label) {
      const b = el(
        "button",
        { class: "sb-i", "data-x": x },
        el("span", { class: "ic", "aria-hidden": "true" }, ic),
        label,
      );
      return b;
    }
    const bc = addNav("review", "▤", "Flashcards"),
      be = addNav("exams", "◷", "Exams");
    dueEm = el("em", {});
    bc.append(dueEm);
    nav.insertBefore(bc, nav.children[2]);
    nav.insertBefore(be, nav.children[3]);
    nav.addEventListener("click", (e) => {
      const b = e.target.closest("[data-x]");
      if (b) show(b.dataset.x);
    });
    function badge() {
      const n = dueCards().length;
      dueEm.textContent = n ? n + " due" : "";
    }
    badge();
    window.StudyHub = { show };
    window.cstStudyPartReady("hub");
  })().catch((error) => window.cstStudyPartFailed(error));
}
