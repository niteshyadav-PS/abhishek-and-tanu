const WEDDING = new Date("2026-11-20T19:00:00+05:30");
const preloader = document.getElementById("preloader");
const hero = document.getElementById("hero");
const cover = document.getElementById("hero-cover");
const tap = document.getElementById("hero-tap");
const skip = document.getElementById("hero-skip");
const names = document.getElementById("hero-names");
const scrollHint = document.getElementById("hero-scroll");
const musicBtn = document.getElementById("music");
const scratchCard = document.getElementById("scratch-card");
const foil = document.getElementById("scratch-foil");
const revealBtn = document.getElementById("reveal-now");

let foilCtx = null;
let drawing = false;
let lastPoint = null;
let scratched = false;
let revealed = false;
let unlocked = false;
let ytPlayer = null;
let ytReady = false;
let ytFailed = false;
let musicOn = false;
let musicWanted = false;
let localFallbackTimer = null;
const localMusic = document.getElementById("local-music");
/* Vaaroon Forever — Shreya Ghoshal (played via YouTube) */
const YT_SONG_ID = "fMThiFar0vI";

function unlockPage() {
  if (unlocked) return;
  unlocked = true;
  document.documentElement.classList.remove("is-locked");
  document.body.classList.remove("is-locked");
  scrollHint.hidden = false;
  requestAnimationFrame(() => scrollHint.classList.add("is-in"));
  musicBtn.hidden = false;
  watchReveal();
}

function beginHero() {
  if (cover.classList.contains("is-gone")) return;
  cover.classList.add("is-gone");
  hero.classList.add("is-live");
  skip.hidden = false;
  names.hidden = false;
  requestAnimationFrame(() => names.classList.add("is-in"));
  startMusic();
  window.setTimeout(() => {
    skip.hidden = true;
    unlockPage();
  }, 2600);
}

function paintMotes() {
  const layer = document.getElementById("motes");
  for (let i = 0; i < 24; i += 1) {
    const mote = document.createElement("i");
    mote.style.left = `${Math.random() * 100}%`;
    mote.style.bottom = `-${Math.random() * 20}px`;
    mote.style.animationDuration = `${8 + Math.random() * 10}s`;
    mote.style.animationDelay = `${-Math.random() * 10}s`;
    layer.appendChild(mote);
  }
  const sparks = document.getElementById("sparks");
  for (let i = 0; i < 18; i += 1) {
    const spark = document.createElement("i");
    spark.style.left = `${Math.random() * 100}%`;
    spark.style.bottom = `-${Math.random() * 20}px`;
    spark.style.animationDuration = `${7 + Math.random() * 9}s`;
    spark.style.animationDelay = `${-Math.random() * 8}s`;
    sparks.appendChild(spark);
  }
  const petals = document.getElementById("invite-petals");
  if (petals) {
    for (let i = 0; i < 16; i += 1) {
      const petal = document.createElement("i");
      petal.style.left = `${Math.random() * 100}%`;
      petal.style.animationDuration = `${9 + Math.random() * 10}s`;
      petal.style.animationDelay = `${-Math.random() * 12}s`;
      petals.appendChild(petal);
    }
  }
}

function sizeFoil() {
  if (scratched) return;
  const box = foil.getBoundingClientRect();
  if (box.width < 10) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  foil.width = Math.round(box.width * dpr);
  foil.height = Math.round(box.height * dpr);
  foilCtx = foil.getContext("2d", { willReadFrequently: true });
  foilCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  paintFoil(box.width, box.height);
}

function paintFoil(w, h) {
  const ctx = foilCtx;
  ctx.globalCompositeOperation = "source-over";
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, "#d4af37");
  g.addColorStop(0.3, "#e6c27a");
  g.addColorStop(0.5, "#c9a227");
  g.addColorStop(0.7, "#fdf2a9");
  g.addColorStop(1, "#aa771c");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < w * h * 0.04; i += 1) {
    ctx.fillStyle = Math.random() > 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";
    ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1);
  }
  ctx.fillStyle = "rgba(80, 40, 10, 0.55)";
  ctx.textAlign = "center";
  ctx.font = "600 14px Cinzel, Times New Roman, serif";
  ctx.fillText("SCRATCH", w / 2, h / 2 - 4);
}

function pointFromEvent(event) {
  const rect = foil.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}

function rub(x, y, size) {
  const radius = size * 0.1;
  const brush = foilCtx.createRadialGradient(x, y, 0, x, y, radius);
  brush.addColorStop(0, "rgba(0,0,0,1)");
  brush.addColorStop(0.4, "rgba(0,0,0,0.85)");
  brush.addColorStop(0.8, "rgba(0,0,0,0.2)");
  brush.addColorStop(1, "rgba(0,0,0,0)");
  foilCtx.globalCompositeOperation = "destination-out";
  foilCtx.fillStyle = brush;
  foilCtx.beginPath();
  foilCtx.arc(x, y, radius, 0, Math.PI * 2);
  foilCtx.fill();
}

function strokeTo(point) {
  const size = foil.getBoundingClientRect().width;
  if (!lastPoint) rub(point.x, point.y, size);
  else {
    const dist = Math.hypot(point.x - lastPoint.x, point.y - lastPoint.y);
    const steps = Math.max(1, Math.ceil(dist / (size * 0.02)));
    for (let i = 1; i <= steps; i += 1) {
      rub(
        lastPoint.x + ((point.x - lastPoint.x) * i) / steps,
        lastPoint.y + ((point.y - lastPoint.y) * i) / steps,
        size
      );
    }
  }
  lastPoint = point;
  scratched = true;
}

function scratchedRatio() {
  const { width, height } = foil;
  const data = foilCtx.getImageData(0, 0, width, height).data;
  let clear = 0;
  let total = 0;
  for (let i = 3; i < data.length; i += 32) {
    total += 1;
    if (data[i] < 40) clear += 1;
  }
  return clear / total;
}

function finishScratch() {
  if (revealed) return;
  revealed = true;
  scratchCard.classList.add("is-done");
  document.getElementById("scratch-hint").hidden = true;
  revealBtn.hidden = true;
  burst();
}

function maybeFinish() {
  if (!revealed && scratchedRatio() > 0.4) finishScratch();
}

function burst() {
  const colors = ["#c9a227", "#e8c978", "#6e1f2f", "#faf5eb", "#b38728"];
  for (let i = 0; i < 40; i += 1) {
    const piece = document.createElement("i");
    piece.style.cssText = `
      position:fixed;top:50%;left:50%;width:7px;height:10px;z-index:60;pointer-events:none;
      background:${colors[i % colors.length]};
      animation:burst 1.2s ease-out forwards;
      --dx:${Math.random() * 260 - 130}px;--dy:${Math.random() * -240 - 40}px;--rot:${Math.random() * 480}deg;
    `;
    document.body.appendChild(piece);
    window.setTimeout(() => piece.remove(), 1300);
  }
  if (!document.getElementById("burst-style")) {
    const style = document.createElement("style");
    style.id = "burst-style";
    style.textContent = `@keyframes burst{to{transform:translate(var(--dx),var(--dy)) rotate(var(--rot));opacity:0}}`;
    document.head.appendChild(style);
  }
}

function onPointerDown(event) {
  if (revealed) return;
  event.preventDefault();
  drawing = true;
  try { foil.setPointerCapture(event.pointerId); } catch (err) { /* ignore */ }
  lastPoint = null;
  strokeTo(pointFromEvent(event));
}

function onPointerMove(event) {
  if (!drawing || revealed) return;
  event.preventDefault();
  strokeTo(pointFromEvent(event));
  maybeFinish();
}

function onPointerUp() {
  drawing = false;
  lastPoint = null;
  maybeFinish();
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function setCountValue(id, value) {
  const el = document.getElementById(id);
  const next = pad(value);
  if (el.textContent === next) return;
  el.textContent = next;
  el.classList.remove("is-tick");
  void el.offsetWidth;
  el.classList.add("is-tick");
}

function tickClock() {
  const diff = WEDDING.getTime() - Date.now();
  if (diff <= 0) {
    ["days", "hours", "minutes", "seconds"].forEach((id) => {
      document.getElementById(id).textContent = "00";
    });
    return;
  }
  const total = Math.floor(diff / 1000);
  setCountValue("days", Math.floor(total / 86400));
  setCountValue("hours", Math.floor((total % 86400) / 3600));
  setCountValue("minutes", Math.floor((total % 3600) / 60));
  setCountValue("seconds", total % 60);
}

function watchReveal() {
  const items = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("is-in"));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.16, rootMargin: "0px 0px -8% 0px" }
  );
  items.forEach((el) => observer.observe(el));
}

function setMusicUi(on) {
  musicOn = on;
  musicBtn.setAttribute("aria-pressed", on ? "true" : "false");
  musicBtn.setAttribute("aria-label", on ? "Pause music" : "Play music");
}

function clearLocalFallback() {
  if (localFallbackTimer) {
    window.clearTimeout(localFallbackTimer);
    localFallbackTimer = null;
  }
}

function playLocalMusic() {
  localMusic.volume = 0.55;
  const play = localMusic.play();
  if (play && play.catch) play.catch(() => {});
  setMusicUi(true);
}

function playYouTubeMusic() {
  if (!ytPlayer || !ytReady || typeof ytPlayer.playVideo !== "function") return false;
  try {
    localMusic.pause();
    localMusic.currentTime = 0;
    if (typeof ytPlayer.loadVideoById === "function") {
      ytPlayer.loadVideoById({ videoId: YT_SONG_ID, startSeconds: 0 });
    }
    ytPlayer.unMute();
    ytPlayer.setVolume(70);
    ytPlayer.playVideo();
    setMusicUi(true);
    return true;
  } catch (err) {
    return false;
  }
}

function startMusic() {
  musicWanted = true;
  setMusicUi(true);
  clearLocalFallback();

  if (playYouTubeMusic()) return;

  if (ytFailed) {
    playLocalMusic();
    return;
  }

  /* Wait for YouTube instead of immediately playing the old local MP3 */
  localFallbackTimer = window.setTimeout(() => {
    if (!musicWanted || (ytReady && !ytFailed)) return;
    playLocalMusic();
  }, 3500);
}

function stopMusic() {
  musicWanted = false;
  clearLocalFallback();
  if (ytPlayer && ytReady && typeof ytPlayer.pauseVideo === "function") {
    try { ytPlayer.pauseVideo(); } catch (err) { /* ignore */ }
  }
  localMusic.pause();
  setMusicUi(false);
}

function setupYouTube() {
  window.onYouTubeIframeAPIReady = function onYouTubeIframeAPIReady() {
    ytPlayer = new YT.Player("yt-host", {
      height: "1",
      width: "1",
      videoId: YT_SONG_ID,
      host: "https://www.youtube-nocookie.com",
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        playsinline: 1,
        rel: 0,
        loop: 1,
        playlist: YT_SONG_ID,
        origin: window.location.origin
      },
      events: {
        onReady() {
          ytReady = true;
          ytFailed = false;
          if (musicWanted || cover.classList.contains("is-gone")) startMusic();
        },
        onError() {
          ytFailed = true;
          ytReady = false;
          if (musicWanted) playLocalMusic();
        },
        onStateChange(event) {
          if (!musicWanted) return;
          if (event.data === YT.PlayerState.PLAYING) {
            localMusic.pause();
            setMusicUi(true);
          }
        }
      }
    });
  };

  if (window.YT && window.YT.Player) {
    window.onYouTubeIframeAPIReady();
    return;
  }
  const tag = document.createElement("script");
  tag.src = "https://www.youtube.com/iframe_api";
  document.head.appendChild(tag);
}

function downloadCalendar() {
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Abhishek and Tanu//Wedding//EN",
    "BEGIN:VEVENT",
    "UID:wedding-abhi-tanu@invitation",
    "DTSTART;TZID=Asia/Kolkata:20261120T190000",
    "DTEND;TZID=Asia/Kolkata:20261120T230000",
    "SUMMARY:Wedding of Abhishek & Tanushree",
    "LOCATION:S.S. Garden Palace, Y K Nagar, Virar West, Maharashtra 401303",
    "DESCRIPTION:Sangeet 18 Nov. Haldi & Mehandi 19 Nov. Wedding 20 Nov 2026, 7:00 pm.",
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "Abhishek-and-Tanu-wedding.ics";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

paintMotes();
window.setTimeout(() => preloader.classList.add("is-done"), 700);
window.setTimeout(() => { preloader.hidden = true; }, 1400);

cover.addEventListener("click", beginHero);
tap.addEventListener("click", beginHero);
skip.addEventListener("click", (event) => {
  event.stopPropagation();
  skip.hidden = true;
  unlockPage();
});
foil.addEventListener("pointerdown", onPointerDown, { passive: false });
foil.addEventListener("pointermove", onPointerMove, { passive: false });
foil.addEventListener("pointerup", onPointerUp);
foil.addEventListener("pointercancel", onPointerUp);
revealBtn.addEventListener("click", finishScratch);
musicBtn.addEventListener("click", () => {
  if (musicOn) stopMusic();
  else startMusic();
});
document.getElementById("calendar").addEventListener("click", downloadCalendar);
setupYouTube();

tickClock();
window.setInterval(tickClock, 1000);

const foilObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      sizeFoil();
      foilObserver.disconnect();
    }
  });
}, { threshold: 0.2 });
foilObserver.observe(scratchCard);
window.addEventListener("resize", () => {
  if (!scratched) sizeFoil();
});

if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  beginHero();
  unlockPage();
}
