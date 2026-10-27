const Chess = window.Chess;

const boardEl = document.getElementById('board');
const modeLabelEl = document.getElementById('mode-label');
const turnIndicatorEl = document.getElementById('turn-indicator');
const statusTextEl = document.getElementById('status-text');
const modeToggleBtn = document.getElementById('mode-toggle-btn');
const soundToggleBtn = document.getElementById('sound-toggle-btn');
const pvpBtn = document.getElementById('pvp-btn');
const pvcBtn = document.getElementById('pvc-btn');
const newGameBtn = document.getElementById('new-game-btn');
const gameOverOverlayEl = document.getElementById('game-over-overlay');
const gameOverTitleEl = document.getElementById('game-over-title');
const gameOverMessageEl = document.getElementById('game-over-message');
const overlayNewGameBtn = document.getElementById('overlay-new-game-btn');

const pieceSymbols = {
  w: { p: '♙', r: '♖', n: '♘', b: '♗', q: '♕', k: '♔' },
  b: { p: '♟', r: '♜', n: '♞', b: '♝', q: '♛', k: '♚' }
};

const MODE = {
  PVP: 'pvp',
  PVC: 'pvc'
};

let game = new Chess();
window.__game = game;
let currentMode = MODE.PVP;
let selectedSquare = null;
let legalTargets = [];
let lastMove = null;
let thinking = false;
let soundEnabled = true;
let audioContext = null;

function getPieceColor(piece) {
  return piece ? piece.color : null;
}

function ensureAudioContext() {
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) {
    return null;
  }

  if (!audioContext) {
    audioContext = new AudioCtor();
  }

  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }

  return audioContext;
}

function updateModeButtons() {
  const isPvp = currentMode === MODE.PVP;
  pvpBtn.classList.toggle('active', isPvp);
  pvcBtn.classList.toggle('active', !isPvp);
  const currentModeLabel = isPvp ? 'User vs User' : 'User vs Computer';
  modeLabelEl.textContent = currentModeLabel;
  modeToggleBtn.textContent = currentModeLabel;
}

function playMoveSound() {
  if (!soundEnabled) {
    return;
  }

  const context = ensureAudioContext();
  if (!context) {
    return;
  }

  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(520, context.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(260, context.currentTime + 0.12);

  gainNode.gain.setValueAtTime(0.0001, context.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.15);

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.16);
}

function updateSoundButton() {
  if (!soundToggleBtn) {
    return;
  }

  soundToggleBtn.textContent = soundEnabled ? '🔊 Sound: On' : '🔇 Sound: Off';
  soundToggleBtn.setAttribute('aria-pressed', String(soundEnabled));
  soundToggleBtn.classList.toggle('muted', !soundEnabled);
}

function showGameOverOverlay(title, message) {
  if (!gameOverOverlayEl) {
    return;
  }

  gameOverTitleEl.textContent = title;
  gameOverMessageEl.textContent = message;
  gameOverOverlayEl.classList.add('show');
  gameOverOverlayEl.setAttribute('aria-hidden', 'false');
}

function hideGameOverOverlay() {
  if (!gameOverOverlayEl) {
    return;
  }

  gameOverOverlayEl.classList.remove('show');
  gameOverOverlayEl.setAttribute('aria-hidden', 'true');
}

function updateStatus() {
  const turnColor = game.turn() === 'w' ? 'White' : 'Black';
  turnIndicatorEl.textContent = `${turnColor} to move`;

  if (game.isCheckmate()) {
    const winner = game.turn() === 'w' ? 'Black' : 'White';
    statusTextEl.textContent = `${winner} wins by checkmate.`;
    showGameOverOverlay('Checkmate', `${winner} wins the match.`);
    return;
  }

  if (game.isStalemate()) {
    statusTextEl.textContent = 'Draw by stalemate.';
    showGameOverOverlay('Draw', 'Stalemate. The battle ends in a draw.');
    return;
  }

  if (game.isThreefoldRepetition()) {
    statusTextEl.textContent = 'Draw by threefold repetition.';
    showGameOverOverlay('Draw', 'Threefold repetition ends the game.');
    return;
  }

  if (game.isInsufficientMaterial()) {
    statusTextEl.textContent = 'Draw by insufficient material.';
    showGameOverOverlay('Draw', 'Insufficient material. It is a draw.');
    return;
  }

  if (game.isDraw()) {
    statusTextEl.textContent = 'Draw.';
    showGameOverOverlay('Draw', 'The game ends in a draw.');
    return;
  }

  hideGameOverOverlay();

  if (game.inCheck()) {
    statusTextEl.textContent = `${turnColor} is in check.`;
    return;
  }

  statusTextEl.textContent = 'Battle in progress.';
}

function getSquareName(row, col) {
  const files = 'abcdefgh';
  return `${files[col]}${8 - row}`;
}

function getSquareColor(squareName) {
  const fileIndex = 'abcdefgh'.indexOf(squareName[0]);
  const rank = Number(squareName[1]);
  return (fileIndex + rank) % 2 === 0 ? 'light' : 'dark';
}

function isHumanTurn() {
  if (currentMode === MODE.PVP) {
    return true;
  }
  return game.turn() === 'w';
}

function buildBoard() {
  boardEl.innerHTML = '';

  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const squareName = getSquareName(row, col);
      const square = document.createElement('div');
      square.className = `square ${getSquareColor(squareName)}`;
      square.dataset.square = squareName;
      square.setAttribute('role', 'button');
      square.setAttribute('tabindex', '0');

      const piece = game.get(squareName);
      if (piece) {
        const pieceEl = document.createElement('div');
        pieceEl.className = `piece ${piece.color === 'w' ? 'white' : 'black'}`;
        pieceEl.textContent = pieceSymbols[piece.color][piece.type];
        pieceEl.setAttribute('aria-label', `${piece.color} ${piece.type}`);
        square.appendChild(pieceEl);
      }

      if (selectedSquare === squareName) {
        square.classList.add('selected');
      }

      if (legalTargets.includes(squareName)) {
        square.classList.add('reachable');
      }

      if (lastMove && (lastMove.from === squareName || lastMove.to === squareName)) {
        square.classList.add('last-move');
      }

      square.addEventListener('click', () => handleSquareClick(squareName));
      boardEl.appendChild(square);
    }
  }
}

function findLegalTargetsForSquare(square) {
  return game.moves({ square, verbose: true }).map((move) => move.to);
}

function handleSquareClick(squareName) {
  if (thinking || game.isGameOver()) {
    return;
  }

  if (currentMode === MODE.PVC && !isHumanTurn()) {
    return;
  }

  const clickedPiece = game.get(squareName);
  const hasSelected = selectedSquare !== null;

  if (!hasSelected) {
    if (clickedPiece && clickedPiece.color === game.turn()) {
      selectedSquare = squareName;
      legalTargets = findLegalTargetsForSquare(squareName);
      buildBoard();
    }
    return;
  }

  if (selectedSquare === squareName) {
    selectedSquare = null;
    legalTargets = [];
    buildBoard();
    return;
  }

  if (legalTargets.includes(squareName)) {
    const move = game.move({
      from: selectedSquare,
      to: squareName,
      promotion: 'q'
    });

    if (move) {
      playMoveSound();
    }

    const previousLastMove = lastMove;
    lastMove = move ? { from: move.from, to: move.to } : previousLastMove;
    selectedSquare = null;
    legalTargets = [];
    buildBoard();
    updateStatus();

    if (currentMode === MODE.PVC && !game.isGameOver() && game.turn() === 'b') {
      thinking = true;
      setTimeout(() => {
        try {
          console.log('AI callback start', game.fen(), game.turn());
          const aiMove = getBestMove();
          console.log('AI move selected', aiMove);
          if (aiMove) {
            const move = game.move(aiMove);
            if (move) {
              playMoveSound();
            }
            lastMove = move ? { from: move.from, to: move.to } : lastMove;
          }
        } catch (error) {
          console.error('AI move failed', error);
        } finally {
          thinking = false;
          buildBoard();
          updateStatus();
        }
      }, 500);
    }
    return;
  }

  if (clickedPiece && clickedPiece.color === game.turn()) {
    selectedSquare = squareName;
    legalTargets = findLegalTargetsForSquare(squareName);
    buildBoard();
    return;
  }

  selectedSquare = null;
  legalTargets = [];
  buildBoard();
}

function evaluateBoard(chessInstance = game) {
  const pieceValues = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
  let score = 0;

  for (const square of chessInstance.board().flat()) {
    if (!square) continue;
    const value = pieceValues[square.type] + (square.type === 'p' ? 10 : 0);
    score += square.color === 'w' ? value : -value;
  }

  return score;
}

function search(chessInstance, alpha, beta, depth) {
  if (depth === 0 || chessInstance.isGameOver()) {
    return evaluateBoard(chessInstance);
  }

  const moves = chessInstance.moves({ verbose: true });
  let value = -Infinity;

  for (const move of moves) {
    const nextBoard = new Chess(chessInstance.fen());
    nextBoard.move({ from: move.from, to: move.to, promotion: 'q' });
    value = Math.max(value, -search(nextBoard, -beta, -alpha, depth - 1));

    alpha = Math.max(alpha, value);
    if (alpha >= beta) {
      break;
    }
  }

  return value;
}

function getBestMove() {
  const legalMoves = game.moves({ verbose: true });
  if (!legalMoves.length) return null;

  let bestMove = legalMoves[0];
  let bestScore = -Infinity;

  for (const move of legalMoves) {
    const trialBoard = new Chess(game.fen());
    trialBoard.move({
      from: move.from,
      to: move.to,
      promotion: 'q'
    });

    const score = -search(trialBoard, -Infinity, Infinity, 2);

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return { from: bestMove.from, to: bestMove.to, promotion: 'q' };
}

function resetGame() {
  game = new Chess();
  window.__game = game;
  selectedSquare = null;
  legalTargets = [];
  lastMove = null;
  thinking = false;
  hideGameOverOverlay();
  buildBoard();
  updateStatus();
}

function setMode(mode) {
  currentMode = mode;
  updateModeButtons();
  resetGame();
}

pvpBtn.addEventListener('click', () => setMode(MODE.PVP));
pvcBtn.addEventListener('click', () => setMode(MODE.PVC));
modeToggleBtn.addEventListener('click', () => {
  setMode(currentMode === MODE.PVP ? MODE.PVC : MODE.PVP);
});

document.addEventListener('pointerdown', () => {
  ensureAudioContext();
}, { once: true });

soundToggleBtn.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  updateSoundButton();
  if (soundEnabled) {
    ensureAudioContext();
    playMoveSound();
  }
});
newGameBtn.addEventListener('click', resetGame);
overlayNewGameBtn.addEventListener('click', resetGame);

updateModeButtons();
updateSoundButton();
hideGameOverOverlay();
buildBoard();
updateStatus();
