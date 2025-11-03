/* script.js - Final (glass header + slow live ticker + articles)
    API base: https://v3.football.api-sports.io
    API key: the one you provided
*/
const API_BASE = "https://v3.football.api-sports.io";
const API_KEY = "692e81ef84f51509360a8539fa45a9df"; // <--- your new key

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
const articlesContainerEl = document.querySelector(".articles-container");
const horizontalCarouselEl = document.getElementById("auto-carousel"); // Elemen Carousel Baru

// Fungsi utilitas untuk mengamankan string HTML
function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return unsafe;
    return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;');
}

/* =======================================================
   LOGIKA AUTO-SCROLL CAROUSEL (BARU)
   Mengatasi Eror dan masalah Indikasi
========================================================== */
let autoScrollTimer;
const SCROLL_DISTANCE = 340; // Sesuaikan dengan lebar card + margin (320px + 20px)
const SCROLL_INTERVAL = 4000; // Scroll setiap 4 detik

function startAutoScroll() {
    if (!horizontalCarouselEl) return;
    
    // Hentikan timer sebelumnya jika ada
    clearInterval(autoScrollTimer); 

    autoScrollTimer = setInterval(() => {
        const maxScroll = horizontalCarouselEl.scrollWidth - horizontalCarouselEl.clientWidth;

        if (maxScroll <= 0) return; // Tidak perlu scroll jika konten muat

        // Tentukan posisi scroll berikutnya
        let currentScroll = horizontalCarouselEl.scrollLeft;
        let nextScrollPosition = currentScroll + SCROLL_DISTANCE;

        if (nextScrollPosition >= maxScroll) {
            // Jika mencapai atau melebihi batas, kembali ke awal dengan animasi halus
            horizontalCarouselEl.scroll({
                left: 0,
                behavior: 'smooth'
            });
        } else {
            // Lanjutkan scroll
            horizontalCarouselEl.scroll({
                left: nextScrollPosition,
                behavior: 'smooth'
            });
        }
    }, SCROLL_INTERVAL);
}

// UX Enhancement: Hentikan scroll saat mouse di atas
if (horizontalCarouselEl) {
    horizontalCarouselEl.addEventListener('mouseenter', () => {
        clearInterval(autoScrollTimer);
    });

    // Lanjutkan scroll saat mouse keluar
    horizontalCarouselEl.addEventListener('mouseleave', () => {
        startAutoScroll();
    });
}
/* =======================================================
   AKHIR LOGIKA AUTO-SCROLL CAROUSEL
========================================================== */


/* Helper functions for rendering */
function createArticleCardHtml(article) {
    // Fungsi ini DITINGKATKAN untuk menggunakan image-wrapper
    const isHorizontal = article.style === 'horizontal';
    const cardClass = isHorizontal ? 'article-card horizontal-card' : 'article-card';
    
    // Pastikan link tersedia
    const link = escapeHtml(article.link || '#'); 
    const excerpt = escapeHtml(article.excerpt || ''); // Pastikan excerpt tidak null

    return `
        <article class="${cardClass}" data-aos="fade-up" data-aos-easing="ease-out-quad">
            <a href="${link}" class="card-link">
                <!-- PENTING: Menerapkan Image Wrapper untuk Konsistensi Rasio -->
                <div class="image-wrapper">
                    <img src="${escapeHtml(article.image || 'images/placeholder.jpg')}" alt="${escapeHtml(article.title)}"/>
                </div>
                <div class="card-content">
                    <span class="article-meta">${escapeHtml(article.category || 'Berita')} • ${escapeHtml(article.date || 'Tgl Tidak Ada')}</span>
                    <h3>${escapeHtml(article.title)}</h3>
                    ${!isHorizontal ? `<p>${excerpt}</p>` : ''}
                </div>
            </a>
        </article>
    `;
}

async function loadArticles() {
    try {
        // PERBAIKAN: Memastikan pemanggilan fetch('/articles.json')
        const articles = await fetch('articles.json').then(res => {
            if (!res.ok) {
                // Memberikan pesan error yang jelas jika file tidak ditemukan
                throw new Error(`Gagal memuat articles.json: HTTP ${res.status}`);
            }
            return res.json();
        });

        const mainArticle = articles.find(a => a.type === 'main');
        const carouselArticles = articles.filter(a => a.type === 'carousel');
        const gridArticles = articles.filter(a => a.type === 'grid');
        const popularArticles = articles.filter(a => a.type === 'popular').slice(0, 5); // Ambil 5 terpopuler

        // 1. Render Headline Utama
        if (mainArticle) {
            mainArticleEl.innerHTML = createArticleCardHtml(mainArticle).replace(/article-card/g, 'main-headline-card');
        } else {
             mainArticleEl.innerHTML = '<p style="text-align:center; color:var(--muted); padding:20px;">Artikel utama tidak ditemukan.</p>';
        }

        // 2. Render Carousel (Horizontal Scroll)
        if (carouselArticles.length > 0) {
            horizontalCarouselEl.innerHTML = carouselArticles.map(article => {
                // Modifikasi untuk memastikan card horizontal tampil benar
                return createArticleCardHtml({ ...article, style: 'horizontal' });
            }).join('');
            startAutoScroll(); // Mulai Auto Scroll setelah konten dimuat
        } else {
            horizontalCarouselEl.innerHTML = `<p style="text-align:center; color:var(--muted); padding:20px;">Belum ada artikel trending.</p>`;
        }

        // 3. Render Grid Articles
        if (articlesContainerEl && gridArticles.length > 0) {
            articlesContainerEl.innerHTML = gridArticles.map(createArticleCardHtml).join('');
        } else if (articlesContainerEl) {
             articlesContainerEl.innerHTML = '<p style="text-align:center; color:var(--muted); padding:20px;">Belum ada artikel berita lainnya.</p>';
        }

        // 4. Render Popular List (Sidebar Kanan)
        const popularListEl = document.getElementById('popularList');
        if (popularListEl && popularArticles.length > 0) {
            popularListEl.innerHTML = popularArticles.map((article, index) => {
                const link = escapeHtml(article.link || '#');
                return `<li><a href="${link}"><span>${index + 1}.</span> ${escapeHtml(article.title)}</a></li>`;
            }).join('');
        }


    } catch (err) {
        console.error("Failed to load articles:", err);
        // Menampilkan error di UI jika gagal memuat (misalnya, file tidak ditemukan)
        if (articlesContainerEl) {
            articlesContainerEl.innerHTML = `<p style="text-align:center; color:#ff6666; padding:20px;">⚠️ Gagal memuat artikel: ${err.message}. Pastikan file articles.json ada.</p>`;
        }
    }
}


/* Ticker Logic */
function updateTicker(scores) {
    const wrapper = liveScoresEl();
    if (!wrapper) return;
    
    if (scores.length === 0) {
        wrapper.innerHTML = `<div class="no-match">⚽ Tidak ada pertandingan yang berlangsung saat ini.</div>`;
        return;
    }
    
    let html = scores.map(s => {
        // Amankan semua string sebelum dimasukkan ke HTML
        const team1 = escapeHtml(s.teams.home.name);
        const team2 = escapeHtml(s.teams.away.name);
        const score1 = escapeHtml(s.goals.home);
        const score2 = escapeHtml(s.goals.away);
        const time = escapeHtml(s.fixture.status.elapsed + "'");
        const status = escapeHtml(s.fixture.status.short);
        const logo1 = escapeHtml(s.teams.home.logo);
        const logo2 = escapeHtml(s.teams.away.logo);

        return `
            <div class="score-item" onclick="showMatchDetails(${s.fixture.id}, '${team1} vs ${team2}')" role="button" tabindex="0" aria-label="Lihat detail pertandingan ${team1} melawan ${team2}">
                <span class="status ${status === 'HT' || status === 'FT' ? 'final' : ''}">${time}</span>
                <span class="team"><img src="${logo1}" alt="${team1}">${team1}</span>
                <span class="score">${score1} - ${score2}</span>
                <span class="team"><img src="${logo2}" alt="${team2}">${team2}</span>
            </div>
        `;
    }).join('');

    wrapper.innerHTML = html;
}

async function loadLiveScores() {
    try {
        // Dapatkan tanggal hari ini (YYYY-MM-DD)
        const today = new Date().toISOString().split('T')[0];

        // Memuat pertandingan yang sedang live (status: 'LIVE' atau 'HT')
        const liveStatus = await apiFetch(`/fixtures?live=all`);
        
        // Memuat pertandingan yang sudah selesai hari ini
        const finishedToday = await apiFetch(`/fixtures?date=${today}&status=FT`);

        // Gabungkan dan filter
        let allScores = [...liveStatus, ...finishedToday];

        // Urutkan: LIVE > HT > FT
        allScores.sort((a, b) => {
            const statusOrder = { 'LIVE': 3, 'HT': 2, 'FT': 1 };
            return (statusOrder[b.fixture.status.short] || 0) - (statusOrder[a.fixture.status.short] || 0);
        });

        updateTicker(allScores);
    } catch (err) {
        console.error("Failed to load live scores:", err);
        const wrapper = liveScoresEl();
        if(wrapper) {
             wrapper.innerHTML = `<div class="no-match" style="width:100%; text-align:center;">⚠️ Gagal memuat skor. Cek koneksi API.</div>`;
        }
    }
}


/* Modal functions */
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
            html += `<h4 style="margin:8px 0 6px; color:var(--accent);">${escapeHtml(team.team?.name || "")}</h4><ul>`;
            team.statistics.forEach(s => html += `<li style="font-size:0.9rem; margin-left:15px; list-style-type:'→ ';">${escapeHtml(s.type)}: <strong>${escapeHtml(String(s.value ?? 0))}</strong></li>`);
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
    setInterval(loadLiveScores, 60000); // Update setiap 1 menit
    
    // PENTING: Mulai auto-scroll hanya setelah DOM siap
    if (horizontalCarouselEl) {
        startAutoScroll(); 
    }
});
