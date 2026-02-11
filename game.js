const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const restartBtn = document.getElementById('restart');

const WORLD = {
  gravity: 0.42,
  playerSpeed: 4.3,
  jumpStrength: 10.3,
  platformWidth: 88,
  platformHeight: 12,
  minPlatformGap: 75,
  maxPlatformGap: 120,
  maxPlatforms: 12,
  initialRiseSpeed: 0.7,
  riseAcceleration: 0.00006,
};

const state = {
  keys: { left: false, right: false },
  player: null,
  platforms: [],
  score: 0,
  riseSpeed: WORLD.initialRiseSpeed,
  gameOver: false,
  animationId: null,
  lastTime: 0,
  distanceScore: 0,
};

function createPlatform(x, y) {
  return {
    x,
    y,
    width: WORLD.platformWidth,
    height: WORLD.platformHeight,
    scored: false,
  };
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function resetGame() {
  state.player = {
    x: canvas.width / 2 - 16,
    y: canvas.height - 120,
    width: 32,
    height: 38,
    vx: 0,
    vy: -WORLD.jumpStrength * 0.45,
  };

  state.platforms = [];
  state.score = 0;
  state.riseSpeed = WORLD.initialRiseSpeed;
  state.distanceScore = 0;
  state.gameOver = false;
  state.keys.left = false;
  state.keys.right = false;
  restartBtn.hidden = true;

  // Starter platform near the player
  state.platforms.push(createPlatform(canvas.width / 2 - WORLD.platformWidth / 2, canvas.height - 70));

  let y = canvas.height - 150;
  while (y > -100) {
    const x = rand(14, canvas.width - WORLD.platformWidth - 14);
    state.platforms.push(createPlatform(x, y));
    y -= rand(WORLD.minPlatformGap, WORLD.maxPlatformGap);
  }

  updateScoreText();
}

function updateScoreText() {
  scoreEl.textContent = `Score: ${Math.floor(state.score)}`;
}

function handleInput() {
  const { player, keys } = state;
  player.vx = 0;
  if (keys.left) player.vx = -WORLD.playerSpeed;
  if (keys.right) player.vx = WORLD.playerSpeed;
}

function updatePlayer(frameScale) {
  const p = state.player;

  p.vy += WORLD.gravity * frameScale;
  p.x += p.vx * frameScale;
  p.y += p.vy * frameScale;

  // Horizontal wrap
  if (p.x + p.width < 0) p.x = canvas.width;
  if (p.x > canvas.width) p.x = -p.width;

  // Platform collisions (only when falling)
  for (const platform of state.platforms) {
    const wasAbove = p.y + p.height - p.vy <= platform.y;
    const hitsHorizontally = p.x + p.width > platform.x && p.x < platform.x + platform.width;
    const touchesTop = p.y + p.height >= platform.y && p.y + p.height <= platform.y + platform.height + 4;

    if (p.vy >= 0 && wasAbove && hitsHorizontally && touchesTop) {
      p.y = platform.y - p.height;
      p.vy = -WORLD.jumpStrength;
      if (!platform.scored) {
        platform.scored = true;
        state.score += 15;
      }
      break;
    }
  }

  // Death: touching bottom of screen
  if (p.y + p.height >= canvas.height) {
    state.gameOver = true;
    restartBtn.hidden = false;
  }
}

function updatePlatforms(frameScale) {
  const riseBy = state.riseSpeed * frameScale;

  for (const platform of state.platforms) {
    platform.y += riseBy;
  }

  // Remove platforms that moved beyond bottom
  state.platforms = state.platforms.filter((platform) => platform.y < canvas.height + 30);

  // Spawn new platforms above screen
  let highestY = Math.min(...state.platforms.map((p) => p.y), canvas.height);
  while (state.platforms.length < WORLD.maxPlatforms) {
    highestY -= rand(WORLD.minPlatformGap, WORLD.maxPlatformGap);
    const x = rand(14, canvas.width - WORLD.platformWidth - 14);
    state.platforms.push(createPlatform(x, highestY));
  }

  // Increase speed slowly over time
  state.riseSpeed += WORLD.riseAcceleration * frameScale;

  // Time/distance-based score growth
  state.distanceScore += riseBy * 0.08;
  state.score += state.distanceScore * 0.001;
}

function drawBackground() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const stars = 35;
  for (let i = 0; i < stars; i += 1) {
    const x = (i * 77 + state.score * 0.9) % canvas.width;
    const y = (i * 141 + state.score * 1.2) % canvas.height;
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(x, y, 2, 2);
  }
}

function drawPlatforms() {
  for (const platform of state.platforms) {
    ctx.fillStyle = '#9aa4ff';
    ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    ctx.fillStyle = '#6c76db';
    ctx.fillRect(platform.x, platform.y + platform.height - 3, platform.width, 3);
  }
}

function drawPlayer() {
  const p = state.player;

  ctx.fillStyle = '#4ff1d2';
  ctx.fillRect(p.x, p.y, p.width, p.height);

  ctx.fillStyle = '#2dbca0';
  ctx.fillRect(p.x, p.y + p.height - 6, p.width, 6);

  // Eyes
  ctx.fillStyle = '#0f2e3b';
  ctx.fillRect(p.x + 7, p.y + 12, 5, 5);
  ctx.fillRect(p.x + p.width - 12, p.y + 12, 5, 5);
}

function drawGameOver() {
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, canvas.height / 2 - 60, canvas.width, 120);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 8);

  ctx.font = '16px sans-serif';
  ctx.fillText(`Final score: ${Math.floor(state.score)}`, canvas.width / 2, canvas.height / 2 + 24);
}

function render() {
  drawBackground();
  drawPlatforms();
  drawPlayer();
  if (state.gameOver) drawGameOver();
}

function loop(timestamp) {
  if (!state.lastTime) state.lastTime = timestamp;
  const delta = Math.min(32, timestamp - state.lastTime);
  state.lastTime = timestamp;
  const frameScale = delta / (1000 / 60);

  if (!state.gameOver) {
    handleInput();
    updatePlatforms(frameScale);
    updatePlayer(frameScale);
    updateScoreText();
  }

  render();
  state.animationId = requestAnimationFrame(loop);
}

window.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft') state.keys.left = true;
  if (event.key === 'ArrowRight') state.keys.right = true;
});

window.addEventListener('keyup', (event) => {
  if (event.key === 'ArrowLeft') state.keys.left = false;
  if (event.key === 'ArrowRight') state.keys.right = false;
});

restartBtn.addEventListener('click', () => {
  state.lastTime = 0;
  resetGame();
});

resetGame();
state.animationId = requestAnimationFrame(loop);
