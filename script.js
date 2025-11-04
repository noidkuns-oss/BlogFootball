/* =======================================================
    SCRIPT.JS - BlogFootball
    Dirombak untuk API football-data.org (V4) Multi-Liga
   ======================================================= */

// === 1. KONFIGURASI API & LIGA ===
// API Base URL untuk football-data.org V4
const API_BASE = "https://api.football-data.org/v4";
// Kunci API Anda dari screenshot (football-data.org)
const API_KEY = "07cd52ea09c34d4e925c33139666fb38"; 

// Daftar Liga yang tersedia di Tier Gratis Anda (dari screenshot)
// CL: Champions League, BL1: Bundesliga, PL: Premier League, SA: Serie A, PD: La Liga, FL1: Ligue 1
const LEAGUES = {
    "PL": { id: "PL", name: "Premier League" },
    "BL1": { id: "BL1", name: "Bundesliga" },
    "SA": { id: "SA", name: "Serie A" },
    "PD": { id: "PD", name: "La Liga" },
    "FL1": { id: "FL1", name: "Ligue 1" },
    "CL": { id: "CL", name: "Champions League" }
};

// =======================================================
// INIT AOS (Animate On Scroll) - Kode Anda dipertahankan
// =======================================================
if (typeof AOS !== 'undefined') {
    AOS.init({
        duration: 900,      
        easing: 'ease-out-cubic', 
        once: true,         
        mirror: false,      
        offset: 80,         
    });
}

// =======================================================
// ELEMEN DOM (Document Object Model)
// =======================================================
const liveScoresEl = () => document.getElementById("liveScores");
const modal = document.getElementById("matchModal");
const closeModalBtn = document.getElementById("closeModal");
const matchStatsEl = document.getElementById("matchStats");
const matchTitleEl = document.getElementById("matchTitle");

// Elemen Dinamis (Hanya ada di halaman tertentu)
const leagueTabsContainer = document.getElementById("leagueTabsContainer");
const standingsBodyEl = document.getElementById("standingsBody");
const fixturesListEl = document.getElementById("fixturesList");
const mainArticleContainer = document.querySelector(".main-article");
const trendingContainer = document.getElementById("trendingArticles");
const moreArticlesContainer = document.getElementById("moreArticles");

/* =======================================================
   FUNGSI HELPER
   ======================================================= */

/* Helper Fetch API (Diubah untuk X-Auth-Token) */
async function apiFetch(path) {
    for (let i = 0; i < 3; i++) {
        try {
            const res = await fetch(`${API_BASE}${path}`, {
                headers: { 
                    "X-Auth-Token": API_KEY  // Menggunakan header yang benar
                }
            });

            if (res.status === 429) { // Rate limit
                const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
                continue; 
            }
            if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
            const json = await res.json();
            return json; // football-data.org mengembalikan data utuh
        } catch (error) {
            console.error(`Fetch API gagal (Attempt ${i + 1}): ${path}`, error);
            if (i === 2) throw error;
        }
    }
}

/* Helper Escape HTML (Kode Anda dipertahankan) */
function escapeHtml(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
}

/* =======================================================
   FUNGSI 1: LOAD LIVE SCORES (SEMUA LIGA)
   ======================================================= */
async function loadLiveScores() {
    const el = liveScoresEl();
    if (!el) return; // Hanya jalankan jika elemen ada

    try {
        // Path untuk semua pertandingan LIVE
        const data = await apiFetch(`/matches?status=LIVE`);
        const liveMatches = data.matches || [];

        if (liveMatches.length === 0) {
            el.innerHTML = '<div class="no-match">⚽ Tidak ada pertandingan yang berlangsung saat ini.</div>';
            return;
        }

        const html = liveMatches.map(match => {
            const statusText = match.status === 'PAUSED' ? 'HT' : "LIVE";
            const home = escapeHtml(match.homeTeam.name);
            const away = escapeHtml(match.awayTeam.name);
            const scoreH = match.score.fullTime.home ?? match.score.halfTime.home ?? 0;
            const scoreA = match.score.fullTime.away ?? match.score.halfTime.away ?? 0;
            const fixtureId = match.id;
            const title = `${home} ${scoreH} - ${scoreA} ${away}`;

            return `
                <div class="score-item" role="button" tabindex="0" 
                     data-id="${fixtureId}" 
                     data-title="${title}"
                     onclick="showMatchDetails(${fixtureId}, '${title}')"
                     onkeydown="if(event.key === 'Enter') showMatchDetails(${fixtureId}, '${title}')">
                    <span class="status ${statusText}">${escapeHtml(statusText)}</span>
                    <span class="home-name">${home}</span> 
                    <span class="score-home">${scoreH}</span> - 
                    <span class="score-away">${scoreA}</span> 
                    <span class="away-name">${away}</span>
                </div>
            `;
        }).join('');
        el.innerHTML = html;

    } catch (err) {
        console.error("loadLiveScores err:", err);
        el.innerHTML = '<div class="no-match error-text">⚠️ Gagal memuat skor (API Error).</div>';
    }
}


/* =======================================================
   FUNGSI 2: LOAD KLASEMEN (PER LIGA)
   ======================================================= */
async function loadStandings(leagueCode) {
    if (!standingsBodyEl) return; // Hanya jalankan jika elemen ada
    
    standingsBodyEl.innerHTML = '<tr><td colspan="4">Memuat klasemen...</td></tr>';
    try {
        const data = await apiFetch(`/competitions/${leagueCode}/standings`);
        
        if (!data.standings || data.standings.length === 0) {
            standingsBodyEl.innerHTML = '<tr><td colspan="4">Klasemen belum tersedia.</td></tr>';
            return;
        }

        const standings = data.standings[0].table; // Ambil tabel klasemen
        let html = '';

        standings.slice(0, 10).forEach(teamData => { // Tampilkan 10 Tim Teratas
            const rank = teamData.position;
            const teamName = escapeHtml(teamData.team.name);
            const matchesPlayed = teamData.playedGames;
            const points = teamData.points;
            
            let rankClass = '';
            if (rank <= 4) rankClass = 'ucl-zone';
            if (rank >= 18) rankClass = 'relegation-zone'; // Contoh

            html += `
                <tr class="${rankClass}">
                    <td>${rank}</td>
                    <td><img src="${escapeHtml(teamData.team.crest)}" alt="Logo ${teamName}" class="team-logo-small">${teamName}</td>
                    <td>${matchesPlayed}</td>
                    <td><strong>${points}</strong></td>
                </tr>
            `;
        });
        standingsBodyEl.innerHTML = html;

    } catch (err) {
        console.error(`loadStandings err (${leagueCode}):`, err);
        standingsBodyEl.innerHTML = `<tr><td colspan="4" class="error-text">Gagal memuat klasemen ${leagueCode}.</td></tr>`;
    }
}

/* =======================================
   FUNGSI 3: LOAD JADWAL (PER LIGA)
   ======================================= */
async function loadFixtures(leagueCode) {
    if (!fixturesListEl) return; // Hanya jalankan jika elemen ada

    fixturesListEl.innerHTML = '<li>Memuat jadwal...</li>';
    try {
        const today = new Date().toISOString().split('T')[0];
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        const nextWeekDate = nextWeek.toISOString().split('T')[0];

        const data = await apiFetch(`/competitions/${leagueCode}/matches?dateFrom=${today}&dateTo=${nextWeekDate}&status=SCHEDULED`);
        const fixtures = data.matches || [];

        if (fixtures.length === 0) {
            fixturesListEl.innerHTML = '<li class="muted-text">Tidak ada jadwal pertandingan dalam 7 hari ke depan.</li>';
            return;
        }

        let html = '';
        fixtures.slice(0, 10).forEach(f => {
            const date = new Date(f.utcDate);
            const timeStr = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
            const dayStr = date.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });

            html += `
                <li class="fixture-item">
                    <div class="date-time">${escapeHtml(dayStr)} ${escapeHtml(timeStr)} WIB</div>
                    <div class="teams">
                        <span class="home-team">${escapeHtml(f.homeTeam.name)}</span> vs 
                        <span class="away-team">${escapeHtml(f.awayTeam.name)}</span>
                    </div>
                </li>
            `;
        });
        fixturesListEl.innerHTML = html;

    } catch (err) {
        console.error(`loadFixtures err (${leagueCode}):`, err);
        fixturesListEl.innerHTML = '<li class="error-text">Gagal memuat jadwal.</li>';
    }
}

/* =======================================================
   FUNGSI 4: SETUP TAB LIGA (MULTI-LIGA)
   ======================================================= */
function setupLeagueTabs() {
    if (!leagueTabsContainer) return; // Hanya jalankan jika elemen ada

    let tabsHtml = '';
    Object.values(LEAGUES).forEach((league, index) => {
        tabsHtml += `
            <button class="tab-button ${index === 0 ? 'active' : ''}" data-league-code="${league.id}">
                ${escapeHtml(league.name)}
            </button>
        `;
    });
    leagueTabsContainer.innerHTML = tabsHtml;

    // Tambahkan event listener ke setiap tombol tab
    leagueTabsContainer.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            // Hapus 'active' dari semua tombol
            leagueTabsContainer.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            // Tambahkan 'active' ke tombol yang diklik
            button.classList.add('active');
            
            const newLeagueCode = button.dataset.leagueCode;
            
            // Muat ulang data berdasarkan liga yang dipilih
            // Cek elemen apa yang ada di halaman ini
            if (standingsBodyEl) {
                loadStandings(newLeagueCode);
            }
            if (fixturesListEl) {
                loadFixtures(newLeagueCode);
            }
        });
    });

    // Muat data default untuk tab pertama yang aktif
    const defaultLeagueCode = Object.values(LEAGUES)[0].id;
    if (standingsBodyEl) {
        loadStandings(defaultLeagueCode);
    }
    if (fixturesListEl) {
        loadFixtures(defaultLeagueCode);
    }
}


/* =======================================================
   FUNGSI 5: LOAD ARTIKEL (DARI ARTICLES.JSON)
   ======================================================= */
// Fungsi ini memuat artikel statis dari articles.json Anda
async function loadArticles() {
    // Pastikan fungsi ini hanya berjalan di halaman yang memiliki elemen artikel
    if (!mainArticleContainer && !trendingContainer && !moreArticlesContainer) {
        return;
    }

    try {
        const response = await fetch('articles.json');
        if (!response.ok) throw new Error('Gagal memuat articles.json');
        const articles = await response.json();

        // Render Artikel Utama (Headline)
        if (mainArticleContainer) {
            const mainArticle = articles.find(a => a.type === 'main');
            if (mainArticle) {
                mainArticleContainer.innerHTML = renderArticleCard(mainArticle, 'main-headline-card');
            }
        }

        // Render Trending (Carousel)
        if (trendingContainer) {
            const trendingArticles = articles.filter(a => a.type === 'carousel');
            trendingContainer.innerHTML = trendingArticles.map(a => renderArticleCard(a, 'horizontal-card')).join('');
        }

        // Render Berita Lainnya (Grid)
        if (moreArticlesContainer) {
            const gridArticles = articles.filter(a => a.type === 'grid');
            moreArticlesContainer.innerHTML = gridArticles.map(a => renderArticleCard(a, 'article-card')).join('');
        }

    } catch (err) {
        console.error("loadArticles err:", err);
        if (mainArticleContainer) mainArticleContainer.innerHTML = "<p class='error-text'>Gagal memuat artikel.</p>";
    }
}

// Fungsi helper untuk merender HTML card artikel
function renderArticleCard(article, cardClass) {
    return `
        <a href="${escapeHtml(article.link)}" class="${cardClass}" data-aos="fade-up" data-aos-delay="50">
            <div class="image-wrapper">
                <img src="${escapeHtml(article.image)}" alt="${escapeHtml(article.title)}" class="card-image" loading="lazy" 
                     onerror="this.onerror=null; this.src='https://placehold.co/400x225/333333/ffffff?text=Image+Error';">
            </div>
            <div class="card-content">
                <div class="article-meta">
                    <span class="category">${escapeHtml(article.category)}</span> | ${escapeHtml(article.date)}
                </div>
                <h3 class="card-title">${escapeHtml(article.title)}</h3>
                ${cardClass === 'main-headline-card' ? `<p class="card-summary">${escapeHtml(article.excerpt)}</p>` : ''}
            </div>
        </a>
    `;
}


/* =======================================================
   FUNGSI 6: MODAL DETAIL PERTANDINGAN
   ======================================================= */
async function showMatchDetails(fixtureId, title) {
    if (!fixtureId) return;
    try {
        matchTitleEl.textContent = title || "Detail Pertandingan";
        matchStatsEl.textContent = "Memuat detail...";
        modal.style.display = "flex";
        modal.setAttribute("aria-hidden", "false");

        // Ambil data pertandingan spesifik
        const data = await apiFetch(`/matches/${fixtureId}`);
        const match = data; // Data utuh adalah objek pertandingan

        if (!match) {
            matchStatsEl.textContent = "Detail pertandingan tidak ditemukan.";
            return;
        }

        // Tampilkan info dasar (karena statistik rinci tidak ada di Free Tier)
        const home = escapeHtml(match.homeTeam.name);
        const away = escapeHtml(match.awayTeam.name);
        const scoreH = match.score.fullTime.home ?? 0;
        const scoreA = match.score.fullTime.away ?? 0;
        const status = escapeHtml(match.status);
        const competition = escapeHtml(match.competition.name);
        const date = new Date(match.utcDate).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' });

        matchStatsEl.innerHTML = `
            <div class="match-detail-header">
                <img src="${escapeHtml(match.homeTeam.crest)}" alt="${home}" class="team-logo-small">
                <strong>${home}</strong>
                <span class="match-detail-score">${scoreH} - ${scoreA}</span>
                <strong>${away}</strong>
                <img src="${escapeHtml(match.awayTeam.crest)}" alt="${away}" class="team-logo-small">
            </div>
            <ul class="stats-list-group">
                <li><span class="stat-type">Status</span> <span class="stat-value">${status}</span></li>
                <li><span class="stat-type">Kompetisi</span> <span class="stat-value">${competition}</span></li>
                <li><span class="stat-type">Tanggal</span> <span class="stat-value">${date} WIB</span></li>
                <li><span class="stat-type">Skor HT</span> <span class="stat-value">${match.score.halfTime.home ?? '-'} - ${match.score.halfTime.away ?? '-'}</span></li>
                <li><span class="stat-type">Wasit</span> <span class="stat-value">${escapeHtml(match.referee?.name || 'N/A')}</span></li>
            </ul>
            <p class="api-note">Statistik mendalam (shots, possession, dll) tidak tersedia di API Tier ini.</p>
        `;

    } catch (err) {
        console.error("showMatchDetails err:", err);
        matchStatsEl.textContent = "Gagal memuat detail pertandingan.";
    }
}

/* Modal close handlers (Kode Anda dipertahankan) */
document.addEventListener("click", (e) => {
    if (e.target === modal) { modal.style.display="none"; modal.setAttribute("aria-hidden","true"); }
});
if (closeModalBtn) closeModalBtn.addEventListener("click", () => { modal.style.display="none"; modal.setAttribute("aria-hidden","true"); });

/* =======================================================
   BOOT SEQUENCE (URUTAN PEMUATAN)
   ======================================================= */
document.addEventListener("DOMContentLoaded", () => {
    // 1. Muat artikel statis dari articles.json
    loadArticles();
    
    // 2. Muat skor langsung (Live Ticker) dari semua liga
    loadLiveScores(); 
    
    // 3. Setup Tab Liga (jika ada di halaman ini)
    // Ini juga akan memuat Klasemen/Jadwal default
    setupLeagueTabs(); 
});

