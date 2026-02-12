
const SOLUTION = "LEMON";

const ROWS = 6;
const COLS = 5;

const boardEl = document.getElementById("board");
const kbEl = document.getElementById("keyboard");
const toastEl = document.getElementById("toast");

const modalEl = document.getElementById("modal");
const modalMsgEl = document.getElementById("modalMsg");
const closeModalBtn = document.getElementById("closeModal");
const copyBtn = document.getElementById("copyBtn");
const playAgainBtn = document.getElementById("playAgainBtn");
const helpBtn = document.getElementById("helpBtn");


const WRONG_MESSAGES = [
  "die die die", 
  "LOCK IN.", 
  "OMDDDD.", 
  "no way chat.", 
];

let lastWrongMessage = "";

// ✅ Put a gif/photo in your project folder and set the filename here
// Example: add a file named "lemon.gif" next to index.html
const WIN_MEDIA_SRC = "double-thumbs-up-emoji-blue.png"; // or "lemon.jpg" / "valentine.png"

// State
let grid = Array.from({ length: ROWS }, () => Array(COLS).fill(""));
let marks = Array.from({ length: ROWS }, () => Array(COLS).fill("")); // "", "correct", "present", "absent"
let row = 0;
let col = 0;
let done = false;

// Track keyboard coloring priority: correct > present > absent
const keyState = new Map(); // letter -> "correct" | "present" | "absent"

init();

function init() {
  renderBoard();
  renderKeyboard();
  setToast("Guess the word Gabe.");

  window.addEventListener("keydown", onKeyDown);

  closeModalBtn.addEventListener("click", hideModal);
  modalEl.addEventListener("click", (e) => {
    if (e.target === modalEl) hideModal();
  });

  copyBtn.addEventListener("click", copyResult);
  playAgainBtn.addEventListener("click", resetGame);

  helpBtn.addEventListener("click", () => {
    showModal(
      "How to play",
      "Guess the 5-letter word in 6 tries.\n\n no hints thats cheating >:( "
    );
  });
}

function renderBoard() {
  boardEl.innerHTML = "";
  for (let r = 0; r < ROWS; r++) {
    const rowEl = document.createElement("div");
    rowEl.className = "row";

    for (let c = 0; c < COLS; c++) {
      const tile = document.createElement("div");
      tile.className = "tile";

      const ch = grid[r][c];
      if (ch) tile.classList.add("filled");
      tile.textContent = ch;

      // Keep for accessibility
      tile.setAttribute("aria-label", `Row ${r + 1} Column ${c + 1}`);

      // ✅ Persist colors like real Wordle
      const m = marks[r][c];
      if (m) {
        tile.classList.add("reveal");
        tile.classList.add(m); // correct/present/absent
      }

      rowEl.appendChild(tile);
    }

    boardEl.appendChild(rowEl);
  }
}

function renderKeyboard() {
  kbEl.innerHTML = "";

  const rows = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "←"],
  ];

  rows.forEach((letters) => {
    const rowEl = document.createElement("div");
    rowEl.className = "kbRow";

    letters.forEach((label) => {
      const btn = document.createElement("button");
      btn.className = "key";
      btn.type = "button";
      btn.textContent = label === "←" ? "⌫" : label;

      if (label === "ENTER" || label === "←") btn.classList.add("wide");

      btn.addEventListener("click", () => handleInput(label));
      rowEl.appendChild(btn);
    });

    kbEl.appendChild(rowEl);
  });

  paintKeyboard();
}

function paintKeyboard() {
  const buttons = kbEl.querySelectorAll("button.key");
  buttons.forEach((b) => {
    const raw = b.textContent;
    const label = raw === "⌫" ? "←" : raw === "ENTER" ? "ENTER" : raw;

    b.classList.remove("correct", "present", "absent");

    if (label.length === 1 && /[A-Z]/.test(label)) {
      const s = keyState.get(label);
      if (s) b.classList.add(s);
    }
  });
}

function onKeyDown(e) {
  const k = e.key;

  if (k === "Enter") return handleInput("ENTER");
  if (k === "Backspace") return handleInput("←");

  if (/^[a-zA-Z]$/.test(k)) {
    handleInput(k.toUpperCase());
  }
}

function handleInput(label) {
  if (done) return;

  if (label === "ENTER") return submitGuess();
  if (label === "←") return backspace();

  if (label.length === 1 && /[A-Z]/.test(label)) {
    addLetter(label);
  }
}

function addLetter(letter) {
  if (col >= COLS || row >= ROWS) return;
  grid[row][col] = letter;
  col++;
  renderBoard();
}

function backspace() {
  if (col <= 0) return;
  col--;
  grid[row][col] = "";
  renderBoard();
}

function submitGuess() {
  if (col < COLS) {
    shakeRow(row);
    setToast("OMD not enough letters.");
    return;
  }

  const guess = grid[row].join("");
  revealRow(row, guess);

  if (guess === SOLUTION) {
    done = true;

    
    document.body.classList.add("lemonWin");

    setToast("go lemon");

    showModal(
      "YIPPIE lemon finally wins!",
      "Thanks for being my Valentine this year chat! ",
      WIN_MEDIA_SRC 
    );
    return;
  }

  row++;
  col = 0;

  if (row >= ROWS) {
    done = true;
    setToast(`Answer: ${SOLUTION}`);
    showModal("BOOOOO!", `The word was ${SOLUTION} . die die die `);
  } else {
    // ✅ rotating wrong guess text
    setToast(getRandomWrongMessage());
  }
}

function revealRow(r, guess) {
  const rowEl = boardEl.children[r];
  const tiles = Array.from(rowEl.children);

  // Wordle-style marking with duplicate handling
  const sol = SOLUTION.split("");
  const g = guess.split("");
  const rowMarks = Array(COLS).fill("absent");

  // First pass: correct
  for (let i = 0; i < COLS; i++) {
    if (g[i] === sol[i]) {
      rowMarks[i] = "correct";
      sol[i] = null; // consume
      g[i] = null;
    }
  }

  // Second pass: present
  for (let i = 0; i < COLS; i++) {
    if (g[i] == null) continue;
    const idx = sol.indexOf(g[i]);
    if (idx !== -1) {
      rowMarks[i] = "present";
      sol[idx] = null; // consume
    }
  }

  // ✅ Save marks so they persist on re-render
  for (let i = 0; i < COLS; i++) {
    marks[r][i] = rowMarks[i];
  }

  // ✅ Flip reveal animation (staggered like Wordle)
  tiles.forEach((tile, i) => {
    // clear any previous
    tile.classList.remove("flip", "correct", "present", "absent");

    // stagger timing
    tile.style.animationDelay = `${i * 120}ms`;

    // add flip
    tile.classList.add("flip");

    // apply final color class
    tile.classList.add("reveal");
    tile.classList.add(rowMarks[i]);

    promoteKeyState(guess[i], rowMarks[i]);
  });

  paintKeyboard();
}

function promoteKeyState(letter, next) {
  // Priority: correct > present > absent
  const prev = keyState.get(letter);
  const rank = { absent: 1, present: 2, correct: 3 };
  if (!prev || rank[next] > rank[prev]) keyState.set(letter, next);
}

function shakeRow(r) {
  const rowEl = boardEl.children[r];
  rowEl.classList.remove("shake");
  void rowEl.offsetWidth; // force reflow
  rowEl.classList.add("shake");
}

function setToast(msg) {
  toastEl.textContent = msg;
}

function getRandomWrongMessage() {
  const usable = WRONG_MESSAGES.filter((m) => m && m.trim().length > 0);
  if (usable.length === 0) return "OMD.";

  let msg;
  do {
    msg = usable[Math.floor(Math.random() * usable.length)];
  } while (usable.length > 1 && msg === lastWrongMessage);

  lastWrongMessage = msg;
  return msg;
}

// ✅ showModal now supports optional media
function showModal(title, msg, mediaSrc) {
  document.getElementById("modalTitle").textContent = title;
  modalMsgEl.textContent = msg;

  const mediaEl = document.getElementById("winMedia");
  if (mediaEl) {
    if (mediaSrc) {
      mediaEl.src = mediaSrc;
      mediaEl.classList.remove("hidden");
    } else {
      mediaEl.removeAttribute("src");
      mediaEl.classList.add("hidden");
    }
  }

  modalEl.classList.remove("hidden");
}

function hideModal() {
  modalEl.classList.add("hidden");
}

function copyResult() {
  const lines = [];
  for (let r = 0; r < ROWS; r++) {
    if (grid[r].every((x) => x === "")) break;

    let line = "";
    for (let c = 0; c < COLS; c++) {
      const m = marks[r][c];
      if (m === "correct") line += "🟩";
      else if (m === "present") line += "🟨";
      else if (m === "absent") line += "⬛";
      else line += "⬛";
    }
    lines.push(line);

    if (grid[r].join("") === SOLUTION) break;
  }

  const share = `Gabe's wordle attempt \n${lines.join("\n")}\n`;
  navigator.clipboard
    .writeText(share)
    .then(() => setToast("Copied!"))
    .catch(() => setToast("Couldn’t copy (browser blocked)."));
}

function resetGame() {
  grid = Array.from({ length: ROWS }, () => Array(COLS).fill(""));
  marks = Array.from({ length: ROWS }, () => Array(COLS).fill(""));
  row = 0;
  col = 0;
  done = false;
  keyState.clear();

  // ✅ remove lemon tint if replaying
  document.body.classList.remove("lemonWin");

  renderBoard();
  renderKeyboard();
  setToast("Guess the word Gabe.");
  hideModal();
}

