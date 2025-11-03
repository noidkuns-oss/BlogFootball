/* script.js - VERSI FINAL 100% LENGKAP DAN KOREKSI BUG
    API base: https://v3.football.api-sports.io
    API key: the one you provided
*/
const API_BASE = "https://v3.football.api-sports.io";
const API_KEY = "692e81ef84f51509360a8539fa45a9df"; 

// =======================================================
// INIT AOS (Animate On Scroll)
// =======================================================
if (typeof AOS !== 'undefined') {
    AOS.init({
        duration: 900,      
        easing: 'ease-out-cubic', 
        once: true,         
        offset: 80,         
    });
}
// =======================================================

/* Global state for main article rotation */
let articleList = [];
let currentArticleIndex = 0;
let articleRotationInterval;
const ROTATION_DELAY = 16000; // 16 detik (lebih lama dari durasi scroll headline 15s)

/* Helper fetch & elements */
async function apiFetch(path) {
    const res = await fetch(`${API_BASE}${path}`, {
        headers: { "x-apisports-key": API_KEY }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json.response ?? [];
}
function escapeHtml(str){ return String(str || "").replace(/[&<>"']/g, s=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[s])); }

const liveScoresEl = () => document.getElementById("liveScores");
const mainArticleEl = document.querySelector(".main-article");
const articlesContainer = document.querySelector(".articles-container");
const headerEl = document.getElementById("siteHeader");

// Ambil elemen modal (Penting untuk fungsi modal)
const modal = document.getElementById("matchModal");
const closeModalBtn = document.getElementById("closeModal");
const matchStatsEl = document.getElementById("matchStats");
const matchTitleEl = document.getElementById("matchTitle");


/* Function to render the main article (rotates) */
function renderMainArticle(article) {
    if (!mainArticleEl || !article) return;

    // 1. Tambahkan kelas transisi cepat untuk membuat pergantian halus (fade)
    mainArticleEl.classList.add('fading');

    // Buat HTML baru secara instan
    const newHTML = `
        <div class="main-article-content">
            <img class="main-image" src="${article.image}" alt="${escapeHtml(article.title)}" />
            <div class="main-info">
                
                <div class="headline-scroll-wrapper">
                     <h2 class="scrolling-headline headline-title">${escapeHtml(article.title)}</h2>
                     <div class="meta">${escapeHtml(article.date)} • ${escapeHtml(article.category)}</div> 
                </div>
                <p class="article-excerpt">${escapeHtml(article.excerpt)}</p>
                <a class="read-more-btn" href="${article.link}">Baca Selengkapnya</a>
            </div>
        </div>
    `;

    // Beri jeda singkat agar CSS transisi bekerja (fading)
    setTimeout(() => {
        // Ganti konten setelah fade-out
        mainArticleEl.innerHTML = newHTML;

        // Hapus kelas transisi setelah konten baru dimuat
        mainArticleEl.classList.remove('fading');
    }, 250); // Jeda 250ms (sesuai durasi transisi CSS)
}


/* Function to handle article rotation */
function rotateMainArticle() {
    if (articleList.length === 0) return;
    
    // Render artikel saat ini
    renderMainArticle(articleList[currentArticleIndex]);

    // Pindah ke artikel berikutnya (loop kembali ke 0 jika sudah mencapai akhir)
    currentArticleIndex = (currentArticleIndex + 1) % articleList.length;
}


/* Load articles.json and set up rotation/cards */
async function loadArticles() {
    try {
        const resp = await fetch("articles.json");
        if (!resp.ok) throw new Error("articles.json not found");
        const list = await resp.json();
        
        // Mengambil semua berita unik, tidak ada pengulangan
        articleList = Array.isArray(list) ? list : [];
        
        if (articleList.length === 0) {
            if (articlesContainer) articlesContainer.innerHTML = "<p>Tidak ada artikel yang tersedia.</p>";
            return;
        }

        // Mulai rotasi artikel utama
        rotateMainArticle();
        articleRotationInterval = setInterval(rotateMainArticle, ROTATION_DELAY);

        // render article cards
        if (articlesContainer) {
            articlesContainer.innerHTML = "";
            let delayTime = 0; 
            const delayIncrement = 120;

            articleList.slice(0, 30).forEach((a, index) => { 
                const card = document.createElement("div");
                card.className = "article-card";
                
                let aosEffect = "fade-up";
                if (index % 3 === 0) aosEffect = "fade-up-right"; 
                else if (index % 5 === 0) aosEffect = "zoom-in"; 
                
                card.setAttribute("data-aos", aosEffect);
                card.setAttribute("data-aos-delay", delayTime);
                card.setAttribute("data-aos-duration", "800"); 

                delayTime += delayIncrement;
                
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


/* --- Ticker & Modal Functions (Dilampirkan sepenuhnya) --- */

/* Sticky header shrink effect */
let isTicking = false;
function updateHeaderClass() {
    if (window.scrollY > 60) headerEl.classList.add("smaller");
    else headerEl.classList.remove("smaller");
    isTicking = false;
}
window.addEventListener("scroll", () => {
    if (!isTicking) {
        window.requestAnimationFrame(updateHeaderClass);
        isTicking = true;
    }
});

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

/* Load live scores from API */
async function loadLiveScores(){
    const container = liveScoresEl();
    if (!container) return;

    try {
        container.innerHTML = `<div class="no-match">⚽ Memuat skor langsung...</div>`;
        const live = await apiFetch("/fixtures?live=all");

        if (!live || live.length === 0) {
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

/* Show match stats modal */
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
    setInterval(loadLiveScores, 60000);
});
