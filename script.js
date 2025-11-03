/* script.js - Final (glass header + slow live ticker + articles)
    API base: https://v3.football.api-sports.io
    API key: the one you provided
*/
const API_BASE = "https://v3.football.api-sports.io";
const API_KEY = "692e81ef84f51509360a8539fa45a9df"; // <--- Ganti kunci API Anda di sini jika ada yang baru

// ID Liga & Tahun Musim
// Contoh: Premier League (39), La Liga (140), Bundesliga (78), Serie A (135), Ligue 1 (61)
const LEAGUE_ID = 39; // Default ke Premier League
const SEASON = new Date().getFullYear(); 

// =======================================================
// INIT AOS (Animate On Scroll)
// Easing yang lebih dinamis untuk efek 'pop' yang halus
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


/* Helper fetch (returns data.response or throws) */
async function apiFetch(path) {
    // Implementasi exponential backoff untuk retry
    for (let i = 0; i < 3; i++) {
        try {
            const res = await fetch(`${API_BASE}${path}`, {
                headers: { "x-apisports-key": API_KEY }
            });

            if (res.status === 429) {
                // Too Many Requests, tunggu dan coba lagi
                const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
                continue; // Lanjut ke iterasi berikutnya (retry)
            }

            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            
            // Cek batasan rate limit di header (opsional, untuk debugging)
            // console.log("API Remaining: ", res.headers.get("x-ratelimit-requests-remaining"));

            return json.response ?? [];
        } catch (error) {
            console.error(`Attempt ${i + 1} failed for path ${path}:`, error);
            if (i === 2) throw error;
        }
    }
}

/* Elements */
const liveScoresEl = () => document.getElementById("liveScores");
const modal = document.getElementById("matchModal");
const closeModalBtn = document.getElementById("closeModal");
const matchStatsEl = document.getElementById("matchStats");
const matchTitleEl = document.getElementById("matchTitle");
const standingsBodyEl = document.getElementById("standingsBody");
const fixturesListEl = document.getElementById("fixturesList");


/* Escape HTML for safety */
function escapeHtml(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
}

/* =======================================
   FUNGSI 1: LOAD JADWAL PERTANDINGAN (FIXTURES)
   ======================================= */
async function loadFixtures() {
    fixturesListEl.innerHTML = '<li>Memuat jadwal...</li>';
    try {
        // Ambil jadwal untuk LEAGUE_ID hari ini dan 7 hari ke depan
        const today = new Date().toISOString().split('T')[0];
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        const nextWeekDate = nextWeek.toISOString().split('T')[0];

        const path = `/fixtures?league=${LEAGUE_ID}&season=${SEASON}&from=${today}&to=${nextWeekDate}&status=NS`;
        const fixtures = await apiFetch(path);

        if (!fixtures || fixtures.length === 0) {
            fixturesListEl.innerHTML = '<li class="muted-text">Tidak ada jadwal pertandingan dalam 7 hari ke depan.</li>';
            return;
        }

        let html = '';
        fixtures.sort((a, b) => new Date(a.fixture.date) - new Date(b.fixture.date)); // Urutkan berdasarkan tanggal
        
        fixtures.slice(0, 10).forEach(f => {
            const date = new Date(f.fixture.date);
            const timeStr = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
            const dayStr = date.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });

            html += `
                <li class="fixture-item">
                    <div class="date-time">${escapeHtml(dayStr)} ${escapeHtml(timeStr)}</div>
                    <div class="teams">
                        <span class="home-team">${escapeHtml(f.teams.home.name)}</span> vs 
                        <span class="away-team">${escapeHtml(f.teams.away.name)}</span>
                    </div>
                </li>
            `;
        });
        fixturesListEl.innerHTML = html;

    } catch (err) {
        console.error("loadFixtures err:", err);
        fixturesListEl.innerHTML = '<li class="error-text">Gagal memuat jadwal. Silakan coba lagi.</li>';
    }
}

/* =======================================
   FUNGSI 2: LOAD KLASEMEN (STANDINGS)
   ======================================= */
async function loadStandings() {
    standingsBodyEl.innerHTML = '<tr><td colspan="4">Memuat klasemen...</td></tr>';
    try {
        const path = `/standings?league=${LEAGUE_ID}&season=${SEASON}`;
        const data = await apiFetch(path);

        if (!data || data.length === 0 || !data[0].league?.standings?.[0]) {
            standingsBodyEl.innerHTML = '<tr><td colspan="4">Klasemen belum tersedia.</td></tr>';
            return;
        }

        // Ambil klasemen dari grup pertama (biasanya hanya ada 1 grup di liga reguler)
        const standings = data[0].league.standings[0];
        let html = '';

        // Tampilkan 5 tim teratas
        standings.slice(0, 5).forEach(teamData => {
            const rank = teamData.rank;
            const teamName = escapeHtml(teamData.team.name);
            const matchesPlayed = teamData.all.played;
            const points = teamData.points;
            
            let rankClass = '';
            if (rank <= 4) { // Contoh zona UCL/UEL
                rankClass = 'ucl-zone';
            } else if (rank > standings.length - 3) { // Contoh zona degradasi
                rankClass = 'relegation-zone';
            }

            html += `
                <tr class="${rankClass}">
                    <td>${rank}</td>
                    <td><img src="${escapeHtml(teamData.team.logo)}" alt="Logo ${teamName}" class="team-logo-small">${teamName}</td>
                    <td>${matchesPlayed}</td>
                    <td><strong>${points}</strong></td>
                </tr>
            `;
        });
        standingsBodyEl.innerHTML = html;

    } catch (err) {
        console.error("loadStandings err:", err);
        standingsBodyEl.innerHTML = '<tr><td colspan="4" class="error-text">Gagal memuat klasemen.</td></tr>';
    }
}


/* =======================================
   FUNGSI SISANYA (LIVE SCORES & ARTIKEL MOCK)
   ======================================= */

/* --- Mock Articles (Tidak ada perubahan) --- */
const MOCK_ARTICLES = [
    // ... (Mock articles tetap di sini)
    { id: 1, type: 'main', title: "Eksklusif: Mengapa Skema 3-4-3 Xavi Adalah Kunci Kebangkitan Barca", excerpt: "Analisis mendalam tentang perubahan taktik yang diterapkan Xavi Hernandez dan dampaknya pada lini serang Barcelona.", image: "https://placehold.co/1200x600/1e3b60/ffffff?text=HEADLINE+BARCA+3-4-3", tags: ["Analisis", "Taktik", "LaLiga"] },
    { id: 2, type: 'normal', title: "Guardiola Isyaratkan Pensiun dalam Waktu Dekat, Fans City Panik", excerpt: "Manajer Manchester City memberikan petunjuk tentang akhir karirnya, memicu spekulasi besar di kalangan penggemar dan media.", image: "https://placehold.co/800x450/111b2e/99c8e8?text=Pep+Pensiun", tags: ["Liga Inggris", "City"] },
    { id: 3, type: 'normal', title: "Rekor! Transfer Bintang Muda Portugal Pecahkan Batas Gaji Klub", excerpt: "Detail terperinci mengenai kepindahan sensasional Joao Almeida ke klub raksasa Italia dan besaran kontraknya yang fantastis.", image: "https://placehold.co/800x450/222d3c/b3d4f5?text=Joao+Transfer", tags: ["Transfer", "Serie A"] },
    { id: 4, type: 'normal', title: "Prediksi UCL: Mampukah Inter Milan Mengulang Kejutan Musim Lalu?", excerpt: "Preview lengkap babak penyisihan grup Liga Champions, fokus pada peluang Inter Milan di 'Grup Neraka'.", image: "https://placehold.co/800x450/333a4b/c8e8ff?text=UCL+Preview", tags: ["UCL", "Preview"] },
    { id: 5, type: 'normal', title: "Derby Panas Bundesliga Berakhir Imbang 3-3 Penuh Drama VAR", excerpt: "Laporan pertandingan penuh aksi dari Derby Ruhr yang menyajikan enam gol, dua kartu merah, dan intervensi VAR kontroversial.", image: "https://placehold.co/800x450/444a5a/dbefff?text=Derby+Bundesliga", tags: ["Bundesliga", "Laporan"] },
    { id: 6, type: 'normal', title: "Wawancara Eksklusif: Eduardo Camavinga Bicara Peran Baru di Real Madrid", excerpt: "Gelandang Prancis ini membahas adaptasinya di posisi bek sayap dan ambisinya untuk meraih Ballon d'Or.", image: "https://placehold.co/800x450/555b6c/e9f7ff?text=Camavinga", tags: ["LaLiga", "Wawancara"] },
];

function renderArticleCard(article) {
    // ... (Fungsi renderArticleCard tetap di sini)
    const typeClass = article.type === 'main' ? 'main-headline-card horizontal-card' : 'standard-card';
    const tagHtml = article.tags.map(tag => `<span class="article-tag">${escapeHtml(tag)}</span>`).join('');

    return `
        <article class="${typeClass}" data-id="${article.id}" data-aos="zoom-in" data-aos-easing="ease-out-quad">
            <div class="article-image-area">
                <img src="${escapeHtml(article.image)}" alt="${escapeHtml(article.title)}" class="article-image" loading="lazy" onerror="this.onerror=null; this.src='https://placehold.co/800x450/333a4b/c8e8ff?text=No+Image';">
            </div>
            <div class="article-content-area">
                <div class="article-tags">${tagHtml}</div>
                <h3 class="article-title">${escapeHtml(article.title)}</h3>
                <p class="article-excerpt">${escapeHtml(article.excerpt)}</p>
                <a href="#" class="read-more-link">Baca Selengkapnya »</a>
            </div>
        </article>
    `;
}

function loadArticles() {
    const mainArticleContainer = document.querySelector('.main-article');
    const articlesContainer = document.querySelector('.articles-container');

    const mainArticle = MOCK_ARTICLES.find(a => a.type === 'main');
    const normalArticles = MOCK_ARTICLES.filter(a => a.type !== 'main');

    if (mainArticle) {
        mainArticleContainer.innerHTML = renderArticleCard(mainArticle);
    }
    
    articlesContainer.innerHTML = normalArticles.map(renderArticleCard).join('');
}


/* --- Live Scores & Modal --- */
const MAX_TICKER_ITEMS = 15; // Batasi item di ticker

async function loadLiveScores() {
    // ... (Fungsi loadLiveScores tetap di sini)
    try {
        const path = `/fixtures?live=all&league=39`; // Cari semua pertandingan LIVE di EPL (ID 39)
        const liveMatches = await apiFetch(path);

        if (!liveMatches || liveMatches.length === 0) {
            liveScoresEl().innerHTML = '<div class="no-match">⚽ Tidak ada pertandingan yang berlangsung saat ini.</div>';
            // Set timeout yang lebih lama jika tidak ada pertandingan
            setTimeout(loadLiveScores, 15000); 
            return;
        }

        let html = '';
        liveMatches.slice(0, MAX_TICKER_ITEMS).forEach(match => {
            const status = match.fixture.status.elapsed;
            const statusText = match.fixture.status.short === 'HT' ? 'HT' : `${status}'`;
            const home = escapeHtml(match.teams.home.name);
            const away = escapeHtml(match.teams.away.name);
            const scoreH = match.goals.home ?? 0;
            const scoreA = match.goals.away ?? 0;
            const fixtureId = match.fixture.id;
            const title = `${home} ${scoreH} - ${scoreA} ${away}`;

            html += `
                <div class="score-item" role="button" tabindex="0" 
                     data-id="${fixtureId}" 
                     data-title="${title}"
                     onclick="showMatchDetails(${fixtureId}, '${title}')"
                     onkeydown="if(event.key === 'Enter') showMatchDetails(${fixtureId}, '${title}')"
                >
                    <span class="status ${match.fixture.status.short}">${escapeHtml(statusText)}</span>
                    <span class="home-name">${home}</span> 
                    <span class="score-home">${scoreH}</span> - 
                    <span class="score-away">${scoreA}</span> 
                    <span class="away-name">${away}</span>
                </div>
            `;
        });
        liveScoresEl().innerHTML = html;

        // Ticker update setiap 5 detik
        setTimeout(loadLiveScores, 5000); 

    } catch (err) {
        console.error("loadLiveScores err:", err);
        liveScoresEl().innerHTML = '<div class="no-match error-text">⚠️ Gagal memuat skor langsung.</div>';
        setTimeout(loadLiveScores, 15000); 
    }
}


// Fungsi untuk menampilkan detail pertandingan (statistik)
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
            html += `<h4 style="margin:8px 0 6px">${escapeHtml(team.team?.name || "")}</h4><ul class="stats-list-group">`;
            team.statistics.forEach(s => {
                const value = String(s.value ?? 0);
                const type = escapeHtml(s.type);
                const displayValue = type.includes('percentage') ? value : escapeHtml(value);

                html += `<li><span class="stat-type">${type}</span><span class="stat-value">${displayValue}</span></li>`;
            });
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
    loadFixtures(); // Panggil fungsi baru
    loadStandings(); // Panggil fungsi baru
});
