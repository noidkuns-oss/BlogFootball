/* script.js - Final (glass header + slow live ticker + articles)
   API base: https://v3.football.api-sports.io
   API key: the one you provided
*/
const API_BASE = "https://v3.football.api-sports.io";
const API_KEY = "692e81ef84f51509360a8539fa45a9df"; // <--- your new key

/* Helper fetch (returns data.response or throws) */
async function apiFetch(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "x-apisports-key": API_KEY }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json.response ?? [];
}

/* Elements */
const liveScoresEl = () => document.getElementById("liveScores");
const modal = document.getElementById("matchModal");
const closeModalBtn = document.getElementById("closeModal");
const matchStatsEl = document.getElementById("matchStats");
const matchTitleEl = document.getElementById("matchTitle");
const mainArticleEl = document.querySelector(".main-article");
const articlesContainer = document.querySelector(".articles-container");
const headerEl = document.getElementById("siteHeader");

/* Sticky header shrink effect */
window.addEventListener("scroll", () => {
  if (window.scrollY > 60) headerEl.classList.add("smaller");
  else headerEl.classList.remove("smaller");
});

/* Load articles.json, generate placeholders up to 30 if needed */
async function loadArticles() {
  try {
    const resp = await fetch("articles.json");
    if (!resp.ok) throw new Error("articles.json not found");
    const arr = await resp.json();
    const list = Array.isArray(arr) ? arr.slice() : [];

    // ensure 30 items (clone or placeholder)
    if (list.length < 30) {
      const need = 30 - list.length;
      for (let i = 0; i < need; i++) {
        const base = list[i % (list.length || 1)] || null;
        const idx = list.length + 1;
        list.push(
          base ? {
            title: `${base.title} (Update ${idx})`,
            date: base.date,
            category: base.category,
            image: base.image,
            excerpt: base.excerpt,
            link: base.link
          } : {
            title: `Berita Bola ${idx}`,
            date: new Date().toLocaleDateString('id-ID'),
            category: "Berita",
            image: "images/thumb-placeholder.png",
            excerpt: "Ringkasan berita sepak bola terbaru.",
            link: "#"
          }
        );
      }
    }

    // render main article
    if (list.length > 0 && mainArticleEl) {
      const main = list[0];
      mainArticleEl.innerHTML = `
        <div class="main-article-content">
          <img class="main-image" src="${main.image}" alt="${escapeHtml(main.title)}" />
          <div class="main-info">
            <h2>${escapeHtml(main.title)}</h2>
            <div class="meta">${escapeHtml(main.date)} • ${escapeHtml(main.category)}</div>
            <p>${escapeHtml(main.excerpt)}</p>
            <a class="read-more-btn" href="${main.link}">Baca Selengkapnya</a>
          </div>
        </div>
      `;
    }

    // render up to 30 article cards
    if (articlesContainer) {
      articlesContainer.innerHTML = "";
      list.slice(0, 30).forEach(a => {
        const card = document.createElement("div");
        card.className = "article-card";
        card.innerHTML = `
          <img src="${a.image}" alt="${escapeHtml(a.title)}" />
          <div class="article-info">
            <div class="meta">${escapeHtml(a.category)} • ${escapeHtml(a.date)}</div>
            <h3>${escapeHtml(a.title)}</h3>
            <p>${escapeHtml(a.excerpt)}</p>
            <a class="read-more-btn" href="${a.link}">Baca Selengkapnya</a>
          </div>
        `;
        articlesContainer.appendChild(card);
      });
    }
  } catch (err) {
    console.error("loadArticles:", err);
    if (mainArticleEl) mainArticleEl.innerHTML = "";
    if (articlesContainer) articlesContainer.innerHTML = "<p>Gagal memuat artikel.</p>";
  }
}

/* Escape HTML to be safe */
function escapeHtml(str){ return String(str || "").replace(/[&<>"']/g, s=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[s])); }

/* Render ticker items and duplicate for smooth loop */
function renderTicker(matches, label = "Hari Ini") {
  const container = liveScoresEl();
  if (!container) return;
  container.innerHTML = "";

  if (!matches || matches.length === 0) {
    container.innerHTML = `<div class="no-match">⚽ Tidak ada pertandingan ${label.toLowerCase()} saat ini • Memuat skor langsung...</div>`;
    return;
  }

  const frag = document.createDocumentFragment();
  matches.forEach(m => {
    const home = m.teams?.home || {};
    const away = m.teams?.away || {};
    const goals = m.goals || {};
    const league = m.league?.name || "";

    const div = document.createElement("div");
    div.className = "match";
    div.dataset.fixtureId = m.fixture?.id ?? m.id ?? "";
    div.innerHTML = `
      <img src="${home.logo || 'images/thumb-placeholder.png'}" alt="${escapeHtml(home.name)}">
      <span>${escapeHtml(home.name || 'Home')} ${goals.home ?? '-'}–${goals.away ?? '-'} ${escapeHtml(away.name || 'Away')}</span>
      <img src="${away.logo || 'images/thumb-placeholder.png'}" alt="${escapeHtml(away.name)}">
      <small>• ${escapeHtml(league)}</small>
    `;
    div.addEventListener("click", () => showMatchDetails(div.dataset.fixtureId, `${home.name || 'Home'} vs ${away.name || 'Away'}`));
    frag.appendChild(div);
  });

  container.appendChild(frag);

  // duplicate children once to make loop smooth, reattach listeners for clones
  const orig = Array.from(container.children);
  orig.forEach(node => {
    const clone = node.cloneNode(true);
    const id = node.dataset.fixtureId;
    if (id) clone.addEventListener("click", () => showMatchDetails(id, clone.querySelector("span")?.textContent || "Detail Pertandingan"));
    container.appendChild(clone);
  });
}

/* Load live scores from API; if none live -> fallback to today's fixtures */
async function loadLiveScores(){
  const container = liveScoresEl();
  if (!container) return;

  try {
    container.innerHTML = `<div class="no-match">⚽ Memuat skor langsung...</div>`;
    const live = await apiFetch("/fixtures?live=all");

    if (!live || live.length === 0) {
      // fallback to today's fixtures
      const today = new Date().toISOString().split("T")[0];
      const todayMatches = await apiFetch(`/fixtures?date=${today}`);
      renderTicker(todayMatches, "Hari Ini");
    } else {
      renderTicker(live, "Live");
    }
  } catch (err) {
    console.error("loadLiveScores:", err);
    container.innerHTML = `<div class="no-match">⚠️ Gagal memuat skor langsung.</div>`;
  }
}

/* Show match stats modal (fetch statistics endpoint) */
async function showMatchDetails(fixtureId, title) {
  if (!fixtureId) return;
  try {
    matchTitleEl.textContent = title || "Detail Pertandingan";
    matchStatsEl.textContent = "Memuat statistik...";
    modal.style.display = "flex";
    modal.setAttribute("aria-hidden","false");

    const stats = await apiFetch(`/fixtures/statistics?fixture=${fixtureId}`);
    if (!stats || stats.length === 0) {
      matchStatsEl.textContent = "Statistik belum tersedia.";
      return;
    }
    let html = "";
    stats.forEach(team => {
      html += `<h4 style="margin:8px 0 6px">${escapeHtml(team.team?.name || "")}</h4><ul>`;
      team.statistics.forEach(s => html += `<li>${escapeHtml(s.type)}: ${escapeHtml(String(s.value ?? 0))}</li>`);
      html += "</ul>";
    });
    matchStatsEl.innerHTML = html;
  } catch (err) {
    console.error("showMatchDetails err:", err);
    matchStatsEl.textContent = "Gagal memuat statistik.";
  }
}

/* modal close handlers */
document.addEventListener("click", (e) => {
  if (e.target === modal) { modal.style.display="none"; modal.setAttribute("aria-hidden","true"); }
});
if (closeModalBtn) closeModalBtn.addEventListener("click", () => { modal.style.display="none"; modal.setAttribute("aria-hidden","true"); });

/* Boot sequence */
document.addEventListener("DOMContentLoaded", () => {
  loadArticles();
  loadLiveScores();
  // refresh live every 60s
  setInterval(loadLiveScores, 60000);
});
