customElements.define(
  "sun-moon-toggle",
  class extends HTMLElement {
    constructor() { super(); }

    connectedCallback() {
      const shadowRoot = this.attachShadow({ mode: "open" });
      const template = document.querySelector("#toggle-radio-template");
      shadowRoot.appendChild(template.content.cloneNode(true));

      // Größe wie bisher
      const sizes = { small: { width: 250/4, height: 100/4 } };
      const s = sizes[this.getAttribute("size")] || sizes.large;
      this.shadowRoot.querySelector("svg").style.width = `${s.width}px`;
      this.shadowRoot.querySelector("svg").style.height = `${s.height}px`;
      this.shadowRoot.querySelector(".toggle__input").style.height = `${s.height}px`;
      this.shadowRoot.querySelector(".toggle-radio").style.height = `${s.height}px`;

      // --- Toggle-Input finden und Event registrieren ---
      this.input = this.shadowRoot.querySelector(".toggle__input");
      this.input.addEventListener("change", () => {
        this.dispatchEvent(new CustomEvent("darkmode-toggle", {
          detail: { checked: this.input.checked }
        }));
      });
    }

    // Methode, um von außen den Zustand zu setzen:
    set checked(val) {
      if (!this.input) return;
      this.input.checked = val;
    }

    get checked() {
      return this.input ? this.input.checked : false;
    }
  }
);

window.addEventListener("DOMContentLoaded", () => {
  const htmlElement = document.documentElement;
  const toggle = document.querySelector("#darkmode-toggle");
  const darkModeEnabled = localStorage.getItem("darkMode") === "true";

  // Setze initialen Zustand
  if (darkModeEnabled) htmlElement.classList.add("dark");

  // Warte bis Custom Element fertig ist (meistens direkt)
  toggle.checked = darkModeEnabled;

  // Event-Listener auf das Toggle-Element (nicht Shadow DOM!)
  toggle.addEventListener("darkmode-toggle", (e) => {
    const isChecked = e.detail.checked;
    htmlElement.classList.toggle("dark", isChecked);
    localStorage.setItem("darkMode", isChecked);
  });
});

// --- Kapitel-Organizer & Editor ---

const defaultChapter = () => ({
  title: "Neues Kapitel",
  content: ""
});

let chapters = JSON.parse(localStorage.getItem("chapters")) || [
  { title: "Kapitel 1", content: "" }
];
let activeChapterIndex = 0;

let quill;
window.addEventListener('DOMContentLoaded', function() {
  if (document.getElementById("editor-container")) {
    // Quill initialisieren
    quill = new Quill("#editor-container", {
      theme: "snow",
      placeholder: "Hier kommt dein Text ...",
      modules: {
        toolbar: [
          [{ 'header': [1, 2, false] }],
          ['bold', 'italic', 'underline'],
          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
          ['clean']
        ]
      }
    });

    // Kapitel-Liste rendern
    function renderChapterList() {
      const chapterList = document.getElementById("chapterList");
      chapterList.innerHTML = "";
      chapters.forEach((chapter, idx) => {
        const li = document.createElement("li");
        li.className = "p-2 rounded cursor-pointer flex items-center gap-2 " 
  + (idx === activeChapterIndex 
      ? " chapter-active font-bold" 
      : " hover:bg-gray-200 dark:hover:bg-gray-600");
        li.draggable = true;
        li.innerHTML = `
          <span class="flex-1 truncate">${chapter.title}</span>
          <span class="drag-handle cursor-move" title="Verschieben">&#9776;</span>
        `;
        li.onclick = () => selectChapter(idx);
        chapterList.appendChild(li);
      });
    }

    // Kapitel auswählen
    function selectChapter(idx) {
      // Text des aktuellen Kapitels speichern
      chapters[activeChapterIndex].content = quill.getContents();
      chapters[activeChapterIndex].title = document.getElementById("chapterTitleInput").value;

      activeChapterIndex = idx;
      document.getElementById("chapterTitleInput").value = chapters[activeChapterIndex].title;
      quill.setContents(chapters[activeChapterIndex].content || "");
      renderChapterList();
    }

    // Kapitel hinzufügen
    document.getElementById("addChapterBtn").onclick = function() {
      chapters.push(defaultChapter());
      selectChapter(chapters.length - 1);
      saveChapters();
    };

    // Kapitel löschen
    document.getElementById("removeChapterBtn").onclick = function() {
      if (chapters.length <= 1) return alert("Mindestens ein Kapitel muss bestehen bleiben.");
      chapters.splice(activeChapterIndex, 1);
      activeChapterIndex = Math.max(0, activeChapterIndex - 1);
      selectChapter(activeChapterIndex);
      saveChapters();
    };

    // Kapitel umbenennen
    document.getElementById("chapterTitleInput").addEventListener("input", (e) => {
      chapters[activeChapterIndex].title = e.target.value;
      renderChapterList();
      saveChapters();
    });

    // Speichern
    document.getElementById("saveBtn").onclick = function() {
      chapters[activeChapterIndex].content = quill.getContents();
      saveChapters();
      document.getElementById("status").innerText = "Gespeichert!";
      setTimeout(() => document.getElementById("status").innerText = "", 1200);
    };

    // Drag & Drop mit Dragula
    dragula([document.getElementById("chapterList")], {
      moves: (el, container, handle) => handle.classList.contains("drag-handle")
    }).on("drop", function(el, target, source, sibling) {
      // Reihenfolge im Kapitel-Array aktualisieren
      const items = Array.from(target.children);
      const newOrder = items.map(li => Array.from(target.children).indexOf(li));
      const reordered = [];
      items.forEach((li) => {
        const text = li.querySelector('span').innerText;
        const ch = chapters.find(c => c.title === text);
        reordered.push(ch);
      });
      chapters = reordered;
      activeChapterIndex = items.indexOf(el);
      saveChapters();
      renderChapterList();
      selectChapter(activeChapterIndex);
    });

    // Editor-Inhalt laden beim Start
    function saveChapters() {
      localStorage.setItem("chapters", JSON.stringify(chapters));
    }

    function loadInitial() {
      document.getElementById("chapterTitleInput").value = chapters[activeChapterIndex].title;
      quill.setContents(chapters[activeChapterIndex].content || "");
      renderChapterList();
    }
    loadInitial();
  }
});
