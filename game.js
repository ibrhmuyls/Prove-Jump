// === Game Setup =====================================================
const canvas = document.getElementById("gameCanvas");
const ctx    = canvas.getContext("2d");

canvas.width  = 1000;
canvas.height = 500;
// === Background Image ===
const backgroundImage = new Image();
backgroundImage.src = "assets/background.png";
//---------------------------------------------------------------------
// GLOBAL STATE -------------------------------------------------------
//---------------------------------------------------------------------
const groundY   = canvas.height - 40;
const imageCache = {};
let hasWon = false; // Skoru izlemek için
let player = {
  x: 100,
  y: canvas.height - 110,
  width: 25,
  height: 35,
  color: "gray",
  dy: 0,
  jumpPower: -18,
  gravity: 0.5,
  onGround: true,
  cracks: 0,
  maxCracks: 4,
  isInvincible: false,
  invincibleTimer: null,
};
let spawnCounters = {
  coloredEgg: 0,
  prove: 0,
  platform: 0,
  speedBoost: 0
};
let keys           = {};
let lives          = 3;
let score          = 0;
let timeLeft       = 120;
let speed          = 8;
let boostTimeout   = null;
let animationId    = null;
let gameTimerId    = null;
let coloredEggs    = [];
let proveCoins     = [];
let platforms      = [];
let specialBox     = null;
let gameStarted    = false;
let lastColoredEggX = 0;
let lastProveX      = 0;


//---------------------------------------------------------------------
function preloadImages() {
  const colors = ["blue", "pink", "orange", "green", "purple", "gray"];
  for (const color of colors) {
    imageCache[color] = {};
    for (let stage = 1; stage <= 5; stage++) {
      const img = new Image();
      img.src   = `assets/egg_${color}_${stage}.png`;
      imageCache[color][stage] = img;
    }
  }
  
  imageCache["prove"] = new Image(); imageCache["prove"].src = "assets/prove.png";
  imageCache["sp1"]   = new Image(); imageCache["sp1"].src   = "assets/sp1_box.png";
}

function showEggSelection() {
  document.getElementById("start-screen").classList.add("hidden");
  document.getElementById("egg-selection").classList.remove("hidden");

  const container = document.getElementById("gray-eggs");
  container.innerHTML = "";
  const colors = ["blue", "pink", "orange", "green", "purple"];
  colors.forEach(color => {
    const img = document.createElement("img");
    img.src   = `assets/egg_${color}_1.png`;
    img.alt   = color;
    img.onclick = () => startGame(color);
    container.appendChild(img);
  });
}

function startGame(selectedColor) {
  document.getElementById("game-over").classList.add("hidden");
  document.getElementById("victory").classList.add("hidden");

  document.getElementById("egg-selection").classList.add("hidden");
  document.getElementById("game-container").classList.remove("hidden");
  preloadImages();
  keys  = {}; lives = 3; score = 0; timeLeft = 120; speed = 6;
  lastColoredEggX = lastProveX = 0;

  player.color    = selectedColor;
  player.cracks   = 0;
player.visible = true;
player.isInvincible = false;
  player.dy       = 0;
  player.y = groundY - player.height;
  player.onGround = true;

  coloredEggs = []; proveCoins = []; obstacles = []; platforms = [];
  specialBox = spawnSpecialBox();

document.getElementById("lives").textContent  = lives;
document.getElementById("prove").textContent  = score; // $PROVE sayısı
document.getElementById("timer").textContent  = timeLeft;

  clearInterval(gameTimerId);
gameTimerId = setInterval(() => {
  if (!gameStarted) return;
  timeLeft--;
  document.getElementById("timer").textContent = timeLeft;

  if (timeLeft <= 0) {
    if (lives > 0) {
      endGame(true); // Süre bitti, can kaldı: kazandın
    } else {
      endGame(false); // Süre bitti, ama can yok: kaybettin
    }
  }
}, 1000);

  gameStarted = true;
  gameLoop();
}

function spawnColoredEgg() {
  if (coloredEggs.length >= 1) return;

  const minGap = 400;
  if (lastColoredEggX && canvas.width - lastColoredEggX < minGap) return;

  if (Math.random() < 0.08) {
    const colors = ["blue", "pink", "orange", "green", "purple"];
    const color  = colors[Math.floor(Math.random() * colors.length)];
    const newX   = canvas.width + 200 + Math.random() * 200;
    const newY   = 60 + Math.random() * (groundY - 180);

    const egg = { x: newX, y: newY, width: 65, height: 75, color };
    if (!checkOverlap(egg, coloredEggs) &&
        !checkOverlap(egg, proveCoins) &&
        !checkOverlap(egg, obstacles) &&
        !checkOverlap(egg, platforms)) {
      coloredEggs.push(egg);
      lastColoredEggX = newX;
      spawnCounters.coloredEgg++;
    }
  }
}


function spawnProve() {
  if (spawnCounters.prove >= 250) return;
  if (proveCoins.length >= 7) return;

  const minGap = 250;
  if (lastProveX && canvas.width - lastProveX < minGap) return;

  if (Math.random() < 0.5) {
    const newX = canvas.width + 100 + Math.random() * 200;
    const newY = 80 + Math.random() * (groundY - 140);

    const coin = { x: newX, y: newY, width: 65, height: 35 };
    if (!checkOverlap(coin, proveCoins) &&
        !checkOverlap(coin, coloredEggs) &&
        !checkOverlap(coin, obstacles) &&
        !checkOverlap(coin, platforms)) {
      proveCoins.push(coin);
      lastProveX = newX;
      spawnCounters.prove++;
    }
  }
}

function spawnPlatform() {
  if (spawnCounters.platform >= 30) return;
  if (platforms.length >= 2) return;

  if (Math.random() < 0.005) {
    const newX = canvas.width + Math.random() * 1000;

    const minY = groundY - 140;
    const maxY = groundY - 80;
    const newY = minY + Math.random() * (maxY - minY);

    const isVerticallyOverlapping = platforms.some(p => Math.abs(p.y - newY) < 80);
    if (isVerticallyOverlapping) return;

    const plat = { x: newX, y: newY, width: 100, height: 10 };

    if (
      !checkOverlap(plat, platforms) &&
      !checkOverlap(plat, coloredEggs) &&
      !checkOverlap(plat, proveCoins) &&
      !checkOverlap(plat, obstacles)
    ) {
      platforms.push(plat);
      spawnCounters.platform++;

      // === PROVE'LERİ UZAKTA VE ÇOK YUKARIDA DİZ ===
      const coinCount = 4 + Math.floor(Math.random() * 3); // 4–6 arası
      const arcRadius = 120; // Dairenin yarıçapı (yükseklik)
      const tokenWidth = 65;

      // 🎯 1) Dairenin merkezi, platformdan 4 kat uzak sağda
      const centerX = plat.x + plat.width + 2 * 100; // 100 = platform genişliği

      // 🎯 2) Dairenin merkezi çok yukarıda
      const centerY = plat.y - 170;

      // 🎯 3) Daha geniş açı (yay aralığı büyüdü → 240°–300°)
      const angleStart = Math.PI * 1.33; // ~240°
      const angleEnd   = Math.PI * 1.67; // ~300°

      for (let i = 0; i < coinCount; i++) {
        const t = i / (coinCount - 1); // 0 → 1
        const angle = angleStart + t * (angleEnd - angleStart);

        const coinX = centerX + Math.cos(angle) * arcRadius;
        const coinY = centerY + Math.sin(angle) * arcRadius;

        const coin = { x: coinX, y: coinY, width: tokenWidth, height: 35 };
        proveCoins.push(coin);
        spawnCounters.prove++;
      }
    }
  }
}


function spawnSpecialBox() {
  if (spawnCounters.speedBoost >= 14) return { x: -999, y: -999, width: 0, height: 0 };
  spawnCounters.speedBoost++;
  return { x: canvas.width + 2000 + Math.random() * 1500, y: groundY - 80, width: 35, height: 45 };
}
function checkOverlap(obj, list) {
  return list.some(item =>
    obj.x < item.x + item.width &&
    obj.x + obj.width > item.x &&
    obj.y < item.y + item.height &&
    obj.y + obj.height > item.y
  );
}
function gameLoop() {
  animationId = requestAnimationFrame(gameLoop);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawBackground();
  updatePlayer();
  moveEntities();
  drawEntities();
  checkCollisions();

  spawnProve();
  spawnColoredEgg();
  spawnPlatform();

  if (specialBox.x + specialBox.width < 0) specialBox = spawnSpecialBox();
}

function drawBackground() {
  if (backgroundImage.complete) {
    ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
  } else {
    // Resim henüz yüklenmediyse geçici renk kullan
    ctx.fillStyle = "#fce4ec";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Zemin çizgisi (yere bir çizgi çekmek istiyorsan)
  ctx.fillStyle = "#f8bbd0";
  ctx.fillRect(0, groundY, canvas.width, 40);
}

function drawEgg(x, y, color, cracks = 0) {
  const safeCracks = Math.max(0, cracks); // negatifse 0 yap
  const stage = Math.min(safeCracks + 1, 5);
  const img = imageCache[color]?.[stage];

  if (img?.complete) {
    ctx.drawImage(img, x, y, 35, 45);
  } else {
    console.warn("Eksik görsel:", color, "aşama:", stage);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x + 25, y + 35, 20, 30, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}


function drawEntities() {
  proveCoins.forEach(p => ctx.drawImage(imageCache["prove"], p.x, p.y, p.width, p.height));
  coloredEggs.forEach(e => drawEgg(e.x, e.y, e.color, 0));
  ctx.drawImage(imageCache["sp1"], specialBox.x, specialBox.y, specialBox.width, specialBox.height);
  ctx.fillStyle = "#ec407a";
  platforms.forEach(p => ctx.fillRect(p.x, p.y, p.width, p.height));
}
/* ==== Mobil + Masaüstü için ortak zıplama fonksiyonları ============ */
function jumpPress() {                     // basıldığı an
  if (!gameStarted) return;
  if (player.onGround) {
    player.dy = player.jumpPower;          // tam güç zıpla
    player.onGround = false;
  }
}

function jumpRelease() {                   // bırakıldığı an
  if (!gameStarted) return;
  if (player.dy < -6) {                    // yarıda kes → alçak zıplama
    player.dy = -6;
  }
}
function updatePlayer() {
  player.dy += player.gravity;
  player.y  += player.dy;

  let landedOnPlatform = false;
  for (const p of platforms) {
    const withinX = player.x + player.width > p.x && player.x < p.x + p.width;
    const fallingOnto = player.y + player.height <= p.y + 15 && player.y + player.height + player.dy >= p.y;
    if (withinX && fallingOnto) {
      player.y = p.y - player.height;
      player.dy = 0;
      player.onGround = true;
      landedOnPlatform = true;
      break;
    }
  }

if (!landedOnPlatform && player.y + player.height >= groundY - 0.5) {
    if (!player.onGround && player.dy > 0) {
        player.cracks++;
        if (player.cracks > player.maxCracks) loseLife();
    }
    player.y = groundY - player.height;
    player.dy = 0;
    player.onGround = true;
} else if (!landedOnPlatform) {
    player.onGround = false;
}

  // 🔷 Burada kontrol:
  if (player.visible !== false) {
    drawEgg(player.x, player.y, player.color, player.cracks);
  }
}

function moveEntities() {
  const lists = [coloredEggs, proveCoins, platforms];
  lists.forEach(list => list.forEach(obj => obj.x -= speed));
  specialBox.x -= speed;

  lastColoredEggX -= speed;
  lastProveX      -= speed;
  if (lastColoredEggX < 0) lastColoredEggX = 0;
  if (lastProveX    < 0) lastProveX    = 0;

  coloredEggs = coloredEggs.filter(e => e.x + e.width  > 0);
  proveCoins  = proveCoins.filter(p => p.x + p.width  > 0);
  platforms   = platforms.filter(p => p.x + p.width > 0);
}

function collision(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function checkCollisions() {
  for (let i = proveCoins.length - 1; i >= 0; i--) {
    const p = proveCoins[i];
    if (collision(player, p)) {
      score++;
      document.getElementById("prove").textContent = score;
      proveCoins.splice(i, 1);

      // 🎯 100 PROVE’ye ulaştıysa hasWon aktif olur (ama oyun devam eder)
      if (!hasWon && score >= 100 && timeLeft > 0) {
        hasWon = true;
      }
    }
  }

  for (let i = coloredEggs.length - 1; i >= 0; i--) {
    const e = coloredEggs[i];
    if (collision(player, e)) {
      player.color  = e.color;
      player.cracks = 0;
      coloredEggs.splice(i, 1);
    }
  }

  if (collision(player, specialBox)) {
    applySpeedBoost();
    specialBox.x = -999;
  }
}

function loseLife() {
  lives--;
  player.cracks = 0;
  player.onGround = true;
  player.dy = 0;
  player.y = groundY - player.height;

  document.getElementById("lives").textContent = lives;

  if (lives <= 0) {
    endGame(false);
  } else {
    player.isInvincible = true;

    // Yanıp sönme efekti için
    let blinkCount = 0;
    const blinkInterval = setInterval(() => {
      blinkCount++;
      player.visible = !player.visible; // Yeni özellik: görünür/görünmez
      if (blinkCount >= 6) {
        clearInterval(blinkInterval);
        player.visible = true;
        player.isInvincible = false;
      }
    }, 150);

    // 1 saniye kadar “hasarsız” kalsın
    if (player.invincibleTimer) clearTimeout(player.invincibleTimer);
    player.invincibleTimer = setTimeout(() => {
      player.isInvincible = false;
    }, 1000);
  }
}
function applySpeedBoost() {
  speed = 10;
  clearTimeout(boostTimeout);
  boostTimeout = setTimeout(() => speed = 6, 10_000);
}

function endGame(win) {
  cancelAnimationFrame(animationId);
  clearInterval(gameTimerId);
  clearTimeout(boostTimeout);
  gameStarted = false;

  document.getElementById("game-container").classList.add("hidden");

  if (win) {
    document.getElementById("prove-count").textContent = score;
    document.getElementById("victory").classList.remove("hidden");
  } else {
    document.getElementById("game-over").classList.remove("hidden");
  }
}

window.addEventListener("keydown", (e) => {
  if (!gameStarted) return;
  if (!keys[e.code]) {
    keys[e.code] = true;
    if ((e.code === "Space" || e.code === "ArrowUp") && player.onGround) {
      player.dy = player.jumpPower;
      player.onGround = false;
    }
  }
});

window.addEventListener("keyup", (e) => {
  if (!gameStarted) return;
  keys[e.code] = false;
  if ((e.code === "Space" || e.code === "ArrowUp") && player.dy < -6) {
    player.dy = -6;
  }
});

/* ==== Dokunmatik + Fare + Kalem hepsi için tek çözü m =============== */
const canvasEl = document.getElementById("gameCanvas");

/* Basma */
canvasEl.addEventListener("pointerdown", (e) => {
  if (e.pointerType === "touch" || e.pointerType === "mouse") {
    e.preventDefault();                    // kaydırma/zoom engeli
    jumpPress();
  }
});

/* Bırakma — parmak tuval dışına çıksa bile yakalamak için window’da */
window.addEventListener("pointerup", (e) => {
  if (e.pointerType === "touch" || e.pointerType === "mouse") {
    e.preventDefault();
    jumpRelease();
  }
});

/* Çok parmakla zoom’u tamamen kapatmak istersen: */
canvasEl.style.touchAction = "none";

function restartGame() {
  // Oyun döngüsü ve zamanlayıcıları durdur
  cancelAnimationFrame(animationId);
  clearInterval(gameTimerId);
  clearTimeout(boostTimeout);
 hasWon = false;
  // Oyuncu başlangıç durumu
  player.x        = 100;
  player.y = groundY - player.height;
  player.dy       = 0;
  player.onGround = true;
  player.cracks   = 0;
player.visible = true;
player.isInvincible = false;
  player.color    = "gray";

  // Tüm varlıkları temizle
  coloredEggs  = [];
  proveCoins   = [];
  platforms    = [];
  specialBox   = spawnSpecialBox();

  // Sayaçları sıfırla
  spawnCounters = {
    coloredEgg: 0,
    prove: 0,
    platform: 0,
    speedBoost: 0
  };

  // Diğer değişkenleri sıfırla
  keys      = {};
  lives     = 3;
  score     = 0;
  timeLeft  = 120;
  speed     = 4;
  gameStarted = false;

  // Ekrandaki bilgileri güncelle
  document.getElementById("lives").textContent  = lives;
  document.getElementById("prove").textContent  = score;
  document.getElementById("timer").textContent  = timeLeft;

  // Ekranları ayarla
  document.getElementById("game-over").classList.add("hidden");
  document.getElementById("victory").classList.add("hidden");
  document.getElementById("egg-selection").classList.remove("hidden");
  document.getElementById("game-container").classList.add("hidden");
}
