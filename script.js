
"use strict";

// GAME HUB - MAIN JAVASCRIPT

const $ = id => document.getElementById(id);

let player = sessionStorage.getItem("gamehub_player") || "";
let score = 0;
let authMode = "signin";

const savedScores = JSON.parse(localStorage.getItem("gamehub_scores") || "{}");

function updateProfile() {
  $("playerName").textContent = player || "Guest";
  score = player ? (savedScores[player] || 0) : 0;
  $("score").textContent = score;
  $("authBtn").textContent = player || "Sign In";
  $("logoutBtn").hidden = !player;
}

function addPoints(points) {
  if (!player) {
    setMessage("Sign in to save your points!");
    return;
  }

  score += points;
  savedScores[player] = score;
  localStorage.setItem("gamehub_scores", JSON.stringify(savedScores));
  updateProfile();
}

function setMessage(message) {
  $("gameMessage").textContent = message;
}

// AUTHENTICATION (LOCAL DEMO)

function openAuth() {
  if (player) return;
  $("authModal").hidden = false;
}

function closeAuth() {
  $("authModal").hidden = true;
  $("authError").textContent = "";
}

function toggleAuth(event) {
  event.preventDefault();

  authMode = authMode === "signin" ? "signup" : "signin";

  $("authTitle").textContent =
    authMode === "signin" ? "Welcome Back" : "Create Account";

  $("submitAuth").textContent =
    authMode === "signin" ? "Sign In" : "Sign Up";

  $("switchText").textContent =
    authMode === "signin"
      ? "Don't have an account?"
      : "Already have an account?";

  $("switchAuth").textContent =
    authMode === "signin" ? "Sign Up" : "Sign In";

  $("authError").textContent = "";
}

async function hashPassword(password, salt) {
  const data = new TextEncoder().encode(salt + ":" + password);
  const hash = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(hash))
    .map(x => x.toString(16).padStart(2, "0"))
    .join("");
}

async function handleAuth(event) {
  event.preventDefault();

  const username = $("username").value.trim();
  const password = $("password").value;

  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    $("authError").textContent =
      "Use 3-20 letters, numbers or underscores.";
    return;
  }

  const key = "gamehub_account_" + username.toLowerCase();
  const account = JSON.parse(localStorage.getItem(key) || "null");

  if (authMode === "signup") {
    if (account) {
      $("authError").textContent = "Username already exists.";
      return;
    }

    const salt = crypto.randomUUID();
    const hash = await hashPassword(password, salt);

    localStorage.setItem(key, JSON.stringify({
      username,
      salt,
      hash
    }));

  } else {
    if (!account) {
      $("authError").textContent = "Account not found.";
      return;
    }

    const hash = await hashPassword(password, account.salt);

    if (hash !== account.hash) {
      $("authError").textContent = "Incorrect password.";
      return;
    }
  }

  player = authMode === "signup" ? username : account.username;

  sessionStorage.setItem("gamehub_player", player);

  $("password").value = "";
  closeAuth();
  updateProfile();
}

function logout() {
  sessionStorage.removeItem("gamehub_player");
  player = "";
  updateProfile();
}

// GAME NAVIGATION

let currentGame = "";
let gameToken = 0;

const gameNames = {
  number: "🔢 Number Guess",
  memory: "🃏 Memory Match",
  math: "➕ Math Challenge",
  word: "🔤 Word Scramble",
  tic: "⭕ Tic Tac Toe"
};

function startGame(type) {
  gameToken++;
  currentGame = type;

  $("playArea").hidden = false;
  $("gameTitle").textContent = gameNames[type];
  $("gameContent").innerHTML = "";
  setMessage("Good luck!");

  const games = {
    number: numberGame,
    memory: memoryGame,
    math: mathGame,
    word: wordGame,
    tic: ticGame
  };

  games[type]();

  $("playArea").scrollIntoView({ behavior: "smooth" });
}

function closeGame() {
  gameToken++;
  currentGame = "";
  $("playArea").hidden = true;
  $("games").scrollIntoView({ behavior: "smooth" });
}

// GAME 1 - NUMBER GUESS

function numberGame() {
  const secret = Math.floor(Math.random() * 100) + 1;
  let attempts = 0;
  let completed = false;

  $("gameContent").innerHTML = `
    <p>Guess a number from 1 to 100.</p>
    <input id="guessInput" type="number" min="1" max="100"
      placeholder="Enter your guess">
    <button id="guessBtn">Check Answer</button>
    <p id="attempts">Attempts: 0</p>
  `;

  $("guessBtn").onclick = () => {
    if (completed) return;

    const value = Number($("guessInput").value);

    if (!Number.isInteger(value) || value < 1 || value > 100) {
      setMessage("Enter a valid number between 1 and 100.");
      return;
    }

    attempts++;
    $("attempts").textContent = "Attempts: " + attempts;

    if (value === secret) {
      completed = true;
      const points = Math.max(10, 60 - attempts * 5);
      addPoints(points);
      setMessage(`Correct! You won ${points} points!`);
      $("guessBtn").textContent = "Play Again";
      $("guessBtn").onclick = numberGame;
    } else {
      setMessage(value < secret ? "📈 Too low! Try higher." :
        "📉 Too high! Try lower.");
    }
  };
}

// GAME 2 - MEMORY MATCH

function memoryGame() {
  const emojis = ["🍎", "🚀", "⭐", "🎮", "🔥", "💎"];
  const cards = [...emojis, ...emojis]
    .sort(() => Math.random() - 0.5);

  let flipped = [];
  let matched = [];
  let busy = false;
  const token = gameToken;

  const grid = document.createElement("div");
  grid.className = "memory-grid";

  cards.forEach((emoji, index) => {
    const button = document.createElement("button");
    button.textContent = "?";

    button.onclick = () => {
      if (busy || matched.includes(index) || flipped.includes(index))
        return;

      button.textContent = emoji;
      flipped.push(index);

      if (flipped.length !== 2) return;

      const [a, b] = flipped;

      if (cards[a] === cards[b]) {
        matched.push(a, b);
        grid.children[a].classList.add("matched");
        grid.children[b].classList.add("matched");
        flipped = [];

        if (matched.length === cards.length) {
          addPoints(60);
          setMessage("🎉 All pairs matched! +60 points.");
          const restart = document.createElement("button");
          restart.textContent = "Play Again";
          restart.onclick = memoryGame;
          $("gameContent").appendChild(restart);
        }
      } else {
        busy = true;

        setTimeout(() => {
          if (token !== gameToken) return;

          grid.children[a].textContent = "?";
          grid.children[b].textContent = "?";
          flipped = [];
          busy = false;
        }, 800);
      }
    };

    grid.appendChild(button);
  });

  $("gameContent").appendChild(grid);
  setMessage("Find all six matching pairs!");
}

// GAME 3 - MATH CHALLENGE

function mathGame() {
  let question = 0;
  let correct = 0;
  let answer = 0;

  function nextQuestion() {
    if (question === 10) {
      const points = correct * 10;
      addPoints(points);

      setMessage(`Finished! ${correct}/10 correct. +${points} points.`);

      $("gameContent").innerHTML =
        '<button id="restartMath">Play Again</button>';

      $("restartMath").onclick = mathGame;
      return;
    }

    question++;

    const a = Math.floor(Math.random() * 20) + 1;
    const b = Math.floor(Math.random() * 20) + 1;
    const operators = ["+", "-", "×"];
    const op = operators[Math.floor(Math.random() * 3)];

    answer = op === "+" ? a + b :
      op === "-" ? a - b : a * b;

    $("gameContent").innerHTML = `
      <h2>Question ${question}/10</h2>
      <h1 style="font-size:45px">${a} ${op} ${b} = ?</h1>
      <input id="mathInput" type="number" placeholder="Your answer">
      <button id="mathSubmit">Submit</button>
    `;

    $("mathSubmit").onclick = () => {
      if ($("mathInput").value.trim() === "") return;

      if (Number($("mathInput").value) === answer) {
        correct++;
        setMessage("Correct! ✅");
      } else {
        setMessage(`Incorrect. The answer was ${answer}.`);
      }

      nextQuestion();
    };
  }

  nextQuestion();
}

// GAME 4 - WORD SCRAMBLE

function wordGame() {
  const words = [
    "PUZZLE", "GAMING", "PLAYER", "ROCKET",
    "BRAIN", "PLANET", "CASTLE", "DRAGON",
    "GALAXY", "SECRET", "MEMORY", "WINNER"
  ];

  let round = 0;
  let correct = 0;
  const selected = [...words].sort(() => Math.random() - .5).slice(0, 5);

  function nextWord() {
    if (round === 5) {
      const points = correct * 15;
      addPoints(points);
      setMessage(`Completed! ${correct}/5 correct. +${points} points.`);

      $("gameContent").innerHTML =
        '<button id="restartWord">Play Again</button>';

      $("restartWord").onclick = wordGame;
      return;
    }

    const word = selected[round];
    round++;

    let scrambled = word;

    while (scrambled === word) {
      scrambled = word.split("")
        .sort(() => Math.random() - .5)
        .join("");
    }

    $("gameContent").innerHTML = `
      <p>Word ${round} of 5</p>
      <h1 style="font-size:40px;letter-spacing:7px">${scrambled}</h1>
      <input id="wordInput" placeholder="Unscramble the word"
        maxlength="20">
      <button id="wordSubmit">Submit Answer</button>
    `;

    $("wordSubmit").onclick = () => {
      const guess = $("wordInput").value.trim().toUpperCase();

      if (!guess) return;

      if (guess === word) {
        correct++;
        setMessage("Correct! 🎉");
      } else {
        setMessage(`The correct word was ${word}.`);
      }

      nextWord();
    };
  }

  nextWord();
}

// GAME 5 - TIC TAC TOE

function ticGame() {
  let board = Array(9).fill("");
  let finished = false;

  const grid = document.createElement("div");
  grid.className = "tic-grid";

  $("gameContent").innerHTML = "";
  $("gameContent").appendChild(grid);

  function winner() {
    const combinations = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];

    for (const [a, b, c] of combinations) {
      if (board[a] && board[a] === board[b] && board[b] === board[c])
        return board[a];
    }

    return board.every(Boolean) ? "draw" : null;
  }

  function render() {
    grid.innerHTML = "";

    board.forEach((cell, index) => {
      const button = document.createElement("button");
      button.textContent = cell || " ";
      button.disabled = Boolean(cell) || finished;

      button.onclick = () => {
        board[index] = "X";

        if (checkEnd()) return;

        // Computer chooses a random available square.
        const available = board
          .map((value, i) => value === "" ? i : -1)
          .filter(i => i !== -1);

        const choice = available[Math.floor(Math.random() * available.length)];
        board[choice] = "O";

        if (!checkEnd()) render();
      };

      grid.appendChild(button);
    });
  }

  function checkEnd() {
    const result = winner();

    if (!result) return false;

    finished = true;

    if (result === "X") {
      addPoints(50);
      setMessage("🎉 You won! +50 points.");
    } else if (result === "O") {
      setMessage("Computer wins! Try again.");
    } else {
      addPoints(10);
      setMessage("It's a draw! +10 points.");
    }

    render();

    const restart = document.createElement("button");
    restart.textContent = "Play Again";
    restart.onclick = ticGame;
    $("gameContent").appendChild(restart);

    return true;
  }

  render();
  setMessage("You are X. Computer is O. Your turn!");
}

// INITIALIZE WEBSITE
updateProfile();
