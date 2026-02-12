// Fixed solution (your inside joke 🍋)
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

// State
let grid = Array.from({ length: ROWS }, () => Array(COLS).fill(""));
let marks = Array.from({ length: ROWS }, () => Array(COLS).fill("")); 
// each cell will be "", "correct", "present", or "absent"
let row = 0;
let col = 0;
let done = false;

// Track keyboard coloring priority: correct > present > absent
const keyState = new Map(); // letter -> "correct" | "present" | "absent"

init();

function init() {
  renderBoard();
  renderKeyboard();
  setToast("Guess the word.");

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
      "Guess the 5-letter word in 6 tries.\n\n(Yes, the first guess could totally be lemon…)"
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

      const m = marks[r][c];
      if (m) {
        tile.classList.add("reveal");
        tile.classList.add(m); // correct/present/absent
      }

      tile.setAttribute("aria-label", `Row ${r + 1} Column ${c + 1}`);
      rowEl.appendChild(tile);
    }
    boardEl.appendChild(rowEl);
  }
}

function renderKeyboard() {
  kbEl.innerHTML = "";

  const rows = [
    ["Q","W","E","R","T","Y","U","I","O","P"],
    ["A","S","D","F","G","H","J","K","L"],
    ["ENTER","Z","X","C","V","B","N","M","←"]
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
    const label =
      raw === "⌫" ? "←" :
      raw === "ENTER" ? "ENTER" :
      raw;

    // Clear color classes
    b.classList.remove("correct","present","absent");

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
    setToast("Not enough letters.");
    return;
  }

  const guess = grid[row].join("");
  // Optional: You can enforce a word list check here. For “easiest,” we accept any 5 letters.
  revealRow(row, guess);

  if (guess === SOLUTION) {
    done = true;
    setToast("Nice 😌");
    // Your appreciative, not-too-serious message
    showModal(
      "🍋 You got it!",
      "Thanks for being my Valentine this year 💛\n\n(Our first guess finally wins.)"
    );
    return;
  }

  row++;
  col = 0;

  if (row >= ROWS) {
    done = true;
    setToast(`Answer: ${SOLUTION}`);
    showModal("So close!", `The word was ${SOLUTION} 🍋`);
  } else {
    setToast("Keep going.");
  }
}

function revealRow(r, guess) {
  const rowEl = boardEl.children[r];
  const tiles = Array.from(rowEl.children);

  // Wordle-style marking with duplicate handling
  const sol = SOLUTION.split("");
  const g = guess.split("");
  const marks = Array(COLS).fill("absent");

  // First pass: correct
  for (let i = 0; i < COLS; i++) {
    if (g[i] === sol[i]) {
      marks[i] = "correct";
      sol[i] = null; // consume
      g[i] = null;
    }
  }

  // Second pass: present
  for (let i = 0; i < COLS; i++) {
    if (g[i] == null) continue;
    const idx = sol.indexOf(g[i]);
    if (idx !== -1) {
      marks[i] = "present";
      sol[idx] = null; // consume
    }
  }

  // Animate + color tiles
  tiles.forEach((tile, i) => {
    tile.classList.add("reveal");
    tile.classList.remove("correct","present","absent");
    tile.classList.add(marks[i]);

    // update keyboard state priority
    const letter = guess[i];
    promoteKeyState(letter, marks[i]);
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
  // force reflow
  void rowEl.offsetWidth;
  rowEl.classList.add("shake");
}

function setToast(msg) {
  toastEl.textContent = msg;
}

function showModal(title, msg) {
  document.getElementById("modalTitle").textContent = title;
  modalMsgEl.textContent = msg;
  modalEl.classList.remove("hidden");
}

function hideModal() {
  modalEl.classList.add("hidden");
}

function copyResult() {
  // A cute “share” style result (Wordle-like squares)
  // We'll approximate using your final marked row if solved; otherwise generic.
  const lines = [];
  for (let r = 0; r < ROWS; r++) {
    const rowEl = boardEl.children[r];
    const tiles = Array.from(rowEl.children);
    const hasLetters = tiles.some(t => t.textContent.trim() !== "");
    if (!hasLetters) break;

    let line = "";
    tiles.forEach(t => {
      if (t.classList.contains("correct")) line += "🟩";
      else if (t.classList.contains("present")) line += "🟨";
      else if (t.classList.contains("absent")) line += "⬛";
      else line += "⬛";
    });
    lines.push(line);
    // stop after the winning row
    if (grid[r].join("") === SOLUTION) break;
  }

  const share = `Wordle 🍋\n${lines.join("\n")}\n`;
  navigator.clipboard.writeText(share).then(() => {
    setToast("Copied!");
  }).catch(() => {
    setToast("Couldn’t copy (browser blocked).");
  });
}

function resetGame() {
  grid = Array.from({ length: ROWS }, () => Array(COLS).fill(""));
  row = 0;
  col = 0;
  done = false;
  keyState.clear();
  renderBoard();
  renderKeyboard();
  setToast("Guess the word.");
  hideModal();
}
