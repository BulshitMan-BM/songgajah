// ================================================================
// 1. LIBRARY & HELPER FUNCTIONS
// ================================================================

function loadLeafletLibrary() {
    return new Promise((resolve, reject) => {
        if (window.L) { resolve(); return; }
        const css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(css);
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script)
    })
}

(function() {
    // --- HELPER DUPLIKAT (Perlu ada jika dipanggil local scope, tapi untuk Header pakai yg internal) ---
    // Kita buat versi local scope untuk keperluan lain selain header (misal avatar user)
    function processProfileImage(url, userName) {
        if (!url || url.trim() === "" || url === "null") {
            return `https://ui-avatars.com/api/?name=${encodeURIComponent(userName||'User')}&background=3b82f6&color=fff&bold=true&size=128`
        }
        if (url.startsWith('data:image') || url.includes('wsrv.nl') || url.includes('ui-avatars.com')) return url;
        let fileId = null;
        const match1 = url.match(/\/file\/d\/([^\/]+)/);
        if (match1) fileId = match1[1];
        else {
            const match2 = url.match(/[?&]id=([^&]+)/);
            if (match2) fileId = match2[1]
        }
        if (!fileId && !url.includes('/') && url.length > 20) fileId = url;
        if (fileId) return `https://wsrv.nl/?url=https://drive.google.com/uc?id=${fileId}&w=90&h=90&fit=cover&a=center&output=webp&q=80`;
        if (url.startsWith('http')) return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=90&h=90&fit=cover&output=webp`;
        return url
    }

    function fixBloggerAccessibility() {
        const images = document.querySelectorAll('.post-body img');
        const pageTitle = document.title || "Gambar Dokumentasi";
        images.forEach((img) => {
            if (!img.hasAttribute('alt') || img.alt.trim() === "") {
                let newAlt = img.getAttribute('title') || "";
                if (!newAlt) {
                    const src = img.src;
                    if (src) {
                        const filename = src.substring(src.lastIndexOf('/') + 1).split('.')[0];
                        newAlt = decodeURIComponent(filename).replace(/[-_+]/g, ' ')
                    }
                }
                if (!newAlt || newAlt.length < 3 || newAlt.includes('blogger_img')) { newAlt = pageTitle + " - Ilustrasi" }
                img.setAttribute('alt', newAlt)
            }
            const parentLink = img.closest('a');
            if (parentLink && parentLink.textContent.trim() === "" && !parentLink.getAttribute('aria-label')) {
                parentLink.setAttribute('aria-label', "Lihat Gambar: " + img.getAttribute('alt'))
            }
        })
    }

    // --- MAP RENDERER (Bagian Header hanya memanggil ini jika perlu) ---
    // Note: renderGuestHeader utama ada di Internal script untuk anti-blink
    // Disini kita hanya handle logika Map nya saja jika dipanggil ulang
    const setupMapLogic = function() {
        const mapContainer = document.getElementById('homepage-map-osm');
        if (mapContainer && !mapContainer.dataset.rendered) {
            const observer = new IntersectionObserver((entries, obs) => {
                entries.forEach(async entry => {
                    if (entry.isIntersecting) {
                        mapContainer.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100%;color:#888"><i class="fas fa-circle-notch fa-spin"></i> Memuat Peta...</div>';
                        try {
                            await loadLeafletLibrary();
                            mapContainer.dataset.rendered = "true";
                            mapContainer.innerHTML = "";
                            if (window.myLeafletMap) { window.myLeafletMap.off(); window.myLeafletMap.remove(); window.myLeafletMap = null; }
                            const LAT = -8.53754; const LNG = 118.20268;
                            window.myLeafletMap = L.map('homepage-map-osm', { zoomControl: true, scrollWheelZoom: false, dragging: true, attributionControl: false }).setView([LAT, LNG], 16);
                            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(window.myLeafletMap);
                            L.marker([LAT, LNG]).addTo(window.myLeafletMap).bindPopup(`<div style="text-align:center;"><b>Desa Songgajah</b></div>`);
                            obs.unobserve(entry.target);
                        } catch (e) { mapContainer.innerHTML = "Gagal memuat peta."; }
                    }
                })
            }, { rootMargin: "200px" });
            observer.observe(mapContainer);
        }
    }

    // --- AUTH & HEADER STATE ---
    function updateHeaderInfo() {
        let token = localStorage.getItem("access_token");
        if (token) {
            token = token.trim();
            if (token.startsWith('"') && token.endsWith('"')) token = token.slice(1, -1)
        }
        const containerGuest = document.getElementById('nav-guest-container');
        const containerUser = document.getElementById('nav-user-container');
        const elName = document.getElementById('guest-nav-name');
        const elRole = document.getElementById('guest-nav-role');
        const elDropdownName = document.getElementById('guest-dropdown-name');
        const elAvatar = document.getElementById('guest-nav-avatar');
        const mobileGuest = document.querySelectorAll('.guest-only-mobile');
        const mobileUser = document.querySelectorAll('.user-only-mobile');
        
        if (token && token !== "null") {
            mobileGuest.forEach(el => el.classList.add('hidden'));
            mobileUser.forEach(el => el.classList.remove('hidden'))
        } else {
            mobileGuest.forEach(el => el.classList.remove('hidden'));
            mobileUser.forEach(el => el.classList.add('hidden'))
        }
        
        if (token && token !== "null" && token !== "undefined") {
            const userData = parseJwt(token);
            if (userData) {
                if (containerGuest) containerGuest.classList.add('hidden');
                if (containerUser) { containerUser.classList.remove('hidden'); containerUser.classList.add('flex') }
                const namaUser = userData.nama || userData.name || userData.sub || "Warga";
                if (elName) elName.textContent = namaUser;
                if (elDropdownName) elDropdownName.textContent = namaUser;
                if (elRole) elRole.textContent = userData.role || "Warga";
                if (elAvatar) {
                    let rawFoto = userData.foto || userData.picture || userData.avatar || userData.image;
                    elAvatar.src = processProfileImage(rawFoto, namaUser)
                }
            } else {
                localStorage.removeItem("access_token");
                showGuestMode();
            }
        } else {
            showGuestMode();
        }
    }

    function showGuestMode() {
        const containerGuest = document.getElementById('nav-guest-container');
        const containerUser = document.getElementById('nav-user-container');
        if (containerGuest) containerGuest.classList.remove('hidden');
        if (containerUser) containerUser.classList.add('hidden');
    }
    
    // --- HOME LAYOUT & NEWS ---
    window.initHomepageLayout = function() {
        const guestHeader = document.getElementById('guest-header');
        const searchInput = document.getElementById('scroll-search-input');
        let isSearchFocused = false;
        let ticking = false;
        document.addEventListener('click', function(e) {
            const mobileMenu = document.getElementById('mobile-menu-panel');
            const mobileBtn = document.getElementById('mobile-menu-btn');
            if (mobileMenu && mobileBtn && !mobileMenu.classList.contains('hidden')) { if (!mobileMenu.contains(e.target) && !mobileBtn.contains(e.target)) { mobileMenu.classList.add('hidden') } }
            const searchPanel = document.getElementById('mobile-search-panel');
            const searchBtn = document.getElementById('mobile-search-btn');
            if (searchPanel && searchBtn && !searchPanel.classList.contains('hidden')) { if (!searchPanel.contains(e.target) && !searchBtn.contains(e.target)) { searchPanel.classList.add('hidden') } }
        });
        if (guestHeader) {
            guestHeader.classList.remove('hidden');
            const updateHeaderState = () => {
                const scrolled = window.scrollY > 20;
                const shouldBeWide = isSearchFocused || !scrolled;
                if (scrolled) {
                    if (!guestHeader.classList.contains('bg-white/90')) { guestHeader.classList.add('bg-white/90', 'backdrop-blur-md', 'shadow-sm', 'border-b', 'border-gray-200/50'); guestHeader.classList.remove('bg-white/80') }
                } else {
                    if (guestHeader.classList.contains('bg-white/90')) { guestHeader.classList.remove('bg-white/90', 'shadow-sm', 'border-b', 'border-gray-200/50', 'backdrop-blur-md'); guestHeader.classList.add('bg-white/80') }
                }
                if (searchInput) {
                    searchInput.classList.add('opacity-100', 'bg-gray-100', 'border', 'border-gray-200'); searchInput.classList.remove('opacity-0', 'w-8', 'bg-transparent', 'px-0');
                    if (shouldBeWide) { searchInput.classList.remove('md:w-48', 'w-36'); searchInput.classList.add('md:w-64', 'w-48') } else { searchInput.classList.remove('md:w-64', 'w-48'); searchInput.classList.add('md:w-48', 'w-36') }
                }
                ticking = false
            };
            const onScroll = () => { if (!ticking) { window.requestAnimationFrame(updateHeaderState); ticking = true } };
            window.addEventListener('scroll', onScroll, { passive: true });
            updateHeaderState();
            if (searchInput) {
                searchInput.addEventListener('focus', function() { isSearchFocused = true; updateHeaderState() });
                searchInput.addEventListener('blur', function() { isSearchFocused = false; setTimeout(updateHeaderState, 100) });
                const parentForm = searchInput.closest('form');
                if (parentForm) { parentForm.addEventListener('submit', function(e) { if (!searchInput.value.trim()) { e.preventDefault(); searchInput.focus(); searchInput.classList.add('ring-2', 'ring-red-500', 'border-red-500'); setTimeout(() => { searchInput.classList.remove('ring-2', 'ring-red-500', 'border-red-500') }, 500) } }) }
            }
        }
    };
    
    // --- FUNGSI NEWS (PERBAIKAN VARIABEL & GAMBAR) ---
    window.loadLandingNews = async function() {
        const container = document.getElementById('homepage-news-container');
        if (!container) return;
        
        try {
            const res = await fetch('/feeds/posts/default?alt=json&max-results=3');
            const data = await res.json();
            const entries = data.feed.entry || [];
            
            if (entries.length === 0) {
                container.innerHTML = `<div class="col-span-3 text-center py-10 text-slate-600">Belum ada berita.</div>`;
                return;
            }
            
            let html = '';
            entries.forEach(entry => {
                const title = entry.title.$t;
                const safeTitle = title.replace(/"/g, '"');
                let link = "#";
                const linkObj = entry.link.find(l => l.rel === 'alternate');
                if(linkObj) link = linkObj.href;

                const date = new Date(entry.published.$t).toLocaleDateString('id-ID', {
                    year: 'numeric', month: 'long', day: 'numeric'
                });
                let img = 'https://placehold.co/600x400?text=No+Image'; 
                
                if (entry.media$thumbnail) {
                    img = entry.media$thumbnail.url.replace(/\/s[0-9]+.*?\//, "/w600-h340-p-k-no-nu-rw/");
                } 
                else if (entry.content && /src="([^"]+)"/.test(entry.content.$t)) {
                    img = entry.content.$t.match(/src="([^"]+)"/)[1];
                }

                let snippet = '';
                if (entry.summary) {
                    snippet = entry.summary.$t.substring(0, 100);
                } else if (entry.content) {
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = entry.content.$t;
                    snippet = tempDiv.textContent.substring(0, 100);
                }

                html += `
                <article class="flex flex-col bg-white dark:bg-slate-800 rounded-2xl overflow-hidden hover:shadow-md hover:-translate-y-1 transition-all duration-300 border border-slate-100 dark:border-slate-700/50">
                    <a href="${link}" aria-label="Baca artikel: ${safeTitle}" class="relative h-48 overflow-hidden group">
                        <img src="${img}" alt="Thumbnail ${safeTitle}" loading="lazy" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110">
                        <div class="absolute top-3 left-3 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-sm">TERBARU</div>
                    </a>
                    <div class="flex flex-col flex-1 p-5">
                        <div class="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 mb-3">
                            <i class="far fa-calendar-alt" aria-hidden="true"></i> ${date}
                        </div>
                        <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-2 line-clamp-2 leading-snug hover:text-blue-600 transition">
                            <a href="${link}" aria-label="Baca selengkapnya tentang ${safeTitle}">${title}</a>
                        </h3>
                        <p class="text-sm text-slate-700 dark:text-slate-300 line-clamp-3 mb-4 flex-grow">${snippet}...</p>
                        <a href="${link}" aria-label="Baca selengkapnya: ${safeTitle}" class="inline-flex items-center text-sm font-bold text-blue-700 hover:text-blue-800 mt-auto">
                            Baca Selengkapnya <i class="fas fa-arrow-right ml-2 text-xs transition-transform group-hover:translate-x-1" aria-hidden="true"></i>
                        </a>
                    </div>
                </article>`;
            });
            
            container.innerHTML = html;
            if (typeof attachEvents === 'function') attachEvents();
            if (typeof fixBloggerAccessibility === 'function') fixBloggerAccessibility();

        } catch (e) {
            console.error("Error loading news:", e);
            container.innerHTML = `<div class="col-span-3 text-center py-10 text-red-600">Gagal memuat berita.</div>`;
        }
    };
    
    // --- FETCH VILLAGE PROFILE (UPDATE) ---
    async function fetchVillageProfilePublic() {
        // Cek Cache (Meski sudah dirender di internal, kita perlu update jika ada data baru)
        try {
            const res = await apiCall({ action: "get_identitas_desa" });
            if (res.status || res.success) { 
                const finalData = res.data || res; 
                // Panggil fungsi global yang ada di internal script
                if (window.renderGuestHeader) window.renderGuestHeader(finalData); 
                localStorage.setItem('CACHE_ID_DESA', JSON.stringify(finalData));
                setupMapLogic(); // Init map jika koordinat ada
            }
        } catch (e) { console.error("Gagal load profil desa:", e) }
    }

    // --- RELATED POSTS ---
    window.initRelatedPosts = function() {
        if (window.relatedTimer) clearTimeout(window.relatedTimer);
        const bridge = document.getElementById("related-data-bridge");
        const wrapper = document.getElementById("related-posts-wrapper");
        const container = document.getElementById("related-posts-grid");

        if (!bridge || !wrapper || !container) return;

        const labelRaw = bridge.textContent || bridge.innerText || "";
        if (!labelRaw.trim()) {
            wrapper.classList.add("hidden");
            return;
        }

        const labels = labelRaw.split(",").map(s => s.trim()).filter(s => s).slice(0, 3);
        const currentUrl = window.location.href.split("?")[0];

        const promises = labels.map(label => 
            fetch(`/feeds/posts/default/-/${encodeURIComponent(label)}?alt=json&max-results=5`)
            .then(res => res.json())
            .then(data => data.feed.entry || [])
            .catch(err => {
                console.warn("Gagal load label:", label); 
                return []; 
            })
        );

        Promise.all(promises).then(results => {
            const flatList = results.flat();
            const uniquePosts = [];
            const seenTitles = new Set();

            flatList.forEach(post => {
                const title = post.title.$t;
                const linkObj = post.link.find(l => l.rel === 'alternate');
                const href = linkObj ? linkObj.href.split("?")[0] : "";

                if (href !== currentUrl && !seenTitles.has(title)) {
                    seenTitles.add(title);
                    uniquePosts.push(post);
                }
            });

            if (uniquePosts.length === 0) {
                wrapper.classList.add("hidden");
                return;
            }

            const finalPosts = uniquePosts.sort(() => 0.5 - Math.random()).slice(0, 3);

            container.innerHTML = finalPosts.map(post => {
                const title = post.title.$t;
                const link = post.link.find(l => l.rel === 'alternate').href;
                const author = (post.author && post.author.length > 0) ? post.author[0].name.$t : "Admin";
                const dateObj = new Date(post.published.$t);
                const dateStr = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

                let imgUrl = "https://placehold.co/600x400?text=No+Image";
                if (post.media$thumbnail) {
                    imgUrl = post.media$thumbnail.url.replace(/\/s[0-9]+(-c)?\//, "/w600-h340-p-k-no-nu/");
                } else if (post.content && /src="([^"]+)"/.test(post.content.$t)) {
                    imgUrl = post.content.$t.match(/src="([^"]+)"/)[1];
                }

                return `
                <div class="group flex flex-col h-full bg-white dark:bg-gray-800 rounded-lg overflow-hidden border border-transparent hover:border-gray-200 dark:hover:border-gray-600 hover:shadow-xl transition-all duration-300">
                    <a href="${link}" class="block w-full relative overflow-hidden bg-gray-100" style="padding-top: 56.25%;">
                        <img src="${imgUrl}" alt="${title.replace(/"/g, '')}" loading="lazy" class="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110">
                    </a>
                    <div class="p-5 flex flex-col flex-grow">
                        <h4 class="text-base font-bold text-blue-600 dark:text-blue-400 leading-snug mb-3 line-clamp-2 text-left">
                            <a href="${link}">${title}</a>
                        </h4>
                        <div class="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center gap-3">
                             <div class="flex flex-col justify-center leading-none">
                                <span class="text-xs text-blue-500 dark:text-blue-400 mb-1">${author}</span>
                                <span class="text-[10px] font-medium text-gray-500 dark:text-gray-400">${dateStr}</span>
                             </div>
                        </div>
                    </div>
                </div>`;
            }).join("");

            wrapper.classList.remove("hidden");
            if (typeof attachEvents === 'function') attachEvents();

        }).catch(err => {
            console.error("Related Posts Error:", err);
            container.innerHTML = `<div class="col-span-full text-center py-6 text-sm text-gray-400 italic">Gagal memuat artikel terkait.</div>`;
        });
    };

    // ================================================================
    // SPA ROUTING & LOADING (OPTIMIZED & LOGIKA HERO)
    // ================================================================

    const UI = { bar: document.getElementById('nprogress'), content: '#main-content' };

    const startLoading = () => {
        const mainEl = document.querySelector(UI.content);
        if (UI.bar) { UI.bar.style.transition = 'none'; UI.bar.style.width = '0%'; UI.bar.style.opacity = '1'; void UI.bar.offsetWidth; UI.bar.style.transition = 'width 0.3s ease'; UI.bar.style.width = '60%'; }
        if (mainEl) { mainEl.style.pointerEvents = 'none'; mainEl.style.opacity = '0.5'; mainEl.style.filter = 'grayscale(100%)';}
    };

    const endLoading = () => {
        const mainEl = document.querySelector(UI.content);
        if (UI.bar) { UI.bar.style.width = '100%'; setTimeout(() => { UI.bar.style.opacity = '0'; setTimeout(() => { UI.bar.style.width = '0%' }, 200) }, 200) }
        if (mainEl) { mainEl.style.pointerEvents = 'auto'; mainEl.style.opacity = '1'; mainEl.style.filter = 'none';}
    };

    const smoothScrollToTop = () => {
        const startY = window.scrollY;
        if (startY < 50) { window.scrollTo(0, 0); return; }
        const duration = 400; const startTime = performance.now();
        const step = (currentTime) => {
            const elapsed = currentTime - startTime; const progress = Math.min(elapsed / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 4);
            window.scrollTo(0, startY - (startY * ease));
            if (progress < 1) { requestAnimationFrame(step); } else { window.scrollTo(0, 0); }
        };
        requestAnimationFrame(step);
    };

    const renderHTML = (htmlContent, url) => {
        const mainEl = document.querySelector(UI.content);
        if (!mainEl) return;
        smoothScrollToTop();
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, "text/html");
        const newContent = doc.querySelector(UI.content);
        if (newContent) {
            document.title = doc.title;
            mainEl.innerHTML = newContent.innerHTML;
            document.querySelectorAll(".spa-script").forEach(e => e.remove());
            mainEl.querySelectorAll("script").forEach(e => {
                const t = document.createElement("script"); t.className = "spa-script"; Array.from(e.attributes).forEach(attr => t.setAttribute(attr.name, attr.value)); if (e.innerHTML) t.appendChild(document.createTextNode(e.innerHTML)); document.body.appendChild(t);
            });
            if (typeof attachEvents === 'function') attachEvents();
            if (typeof updateHeaderInfo === 'function') updateHeaderInfo();
            if (typeof updateGuestMenuState === 'function') updateGuestMenuState();
            if (typeof fixBloggerAccessibility === 'function') fixBloggerAccessibility();

            const currentUrl = url.split('?')[0].replace(/\/$/, ""); const homeUrl = window.location.origin.replace(/\/$/, "");
            const isHomepage = (currentUrl === homeUrl) || currentUrl.endsWith('/index.html');
            
            if (isHomepage) {
                // LOGIKA SEMBUNYIKAN HERO JIKA KEMBALI DARI POSTINGAN
                if (sessionStorage.getItem("user_has_explored") === "true") {
                    setTimeout(() => {
                        const hero = document.getElementById('landing-hero');
                        if (hero) hero.style.display = 'none';
                    }, 10);
                }

                setTimeout(() => {
                    const mapContainer = document.getElementById('homepage-map-osm');
                    if (mapContainer) {
                        mapContainer.removeAttribute('data-rendered'); mapContainer.innerHTML = '';
                        if (window.myLeafletMap) { window.myLeafletMap.remove(); window.myLeafletMap = null; }
                        const cached = localStorage.getItem('CACHE_ID_DESA');
                        if (cached && window.renderGuestHeader) window.renderGuestHeader(JSON.parse(cached));
                        setupMapLogic(); // Re-init map
                    }
                    if (typeof window.initHomepageLayout === 'function') window.initHomepageLayout();
                    if (typeof window.loadLandingNews === 'function') window.loadLandingNews();
                    if (typeof fetchVillageProfilePublic === 'function') fetchVillageProfilePublic();
                }, 10);
            }

            if (url.includes("peta-situs.html") && window.initSitemap) setTimeout(window.initSitemap, 100);
            if (url.includes("laporan-pengaduan.html") && window.initLapor) setTimeout(window.initLapor, 100);
            if (document.getElementById("related-posts-wrapper") && window.initRelatedPosts) setTimeout(window.initRelatedPosts, 100);
            if (typeof runPageRouter === 'function') runPageRouter();

            requestAnimationFrame(() => { mainEl.classList.remove('translate-y-4'); mainEl.classList.add('translate-y-0'); });
        } else {
            window.location.href = url;
        }
    };

    const loadPage = async (url) => {
        startLoading();
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error("Gagal memuat halaman");
            const text = await response.text();
            if (window.location.href === url) { renderHTML(text, url); }
        } catch (e) {
            console.error("Gagal load:", e); window.location.href = url;
        } finally {
            endLoading();
        }
    };

    const handleLinkClick = (e) => {
        const link = e.currentTarget; let url = link.href;
        const cleanUrl = url.split('?')[0].replace(/\/$/, ""); 
        const currentCleanUrl = window.location.href.split('?')[0].replace(/\/$/, "");
        const homeUrl = window.location.origin.replace(/\/$/, "");

        if (cleanUrl === currentCleanUrl && !url.includes('#')) { e.preventDefault(); smoothScrollToTop(); return; }
        
        const isDashboard = url.includes('/p/dashboard.html');
        if (url.startsWith(window.location.origin) && !url.includes('#') && link.target !== '_blank' && !url.includes('/p/login.html') && !isDashboard) {
            e.preventDefault();
            
            if (cleanUrl !== homeUrl && cleanUrl !== homeUrl + '/index.html') {
                sessionStorage.setItem("user_has_explored", "true");
            }

            if (window.innerWidth < 768) {
                const sidebar = document.getElementById("sidebar");
                if (sidebar && sidebar.classList.contains("open")) sidebar.classList.remove("open");
                document.getElementById("mobile-menu-panel")?.classList.add("hidden");
                document.getElementById("mobile-search-panel")?.classList.add("hidden");
            }
            history.pushState(null, null, url);
            loadPage(url);
        }
    };

    const attachEvents = () => {
        document.querySelectorAll('a').forEach(a => { a.removeEventListener('click', handleLinkClick); a.addEventListener('click', handleLinkClick); })
    };

    window.addEventListener('popstate', () => loadPage(window.location.href));
    window.addEventListener('pageshow', (event) => { updateHeaderInfo() });

    const onReady = () => {
        initHomepageLayout(); updateHeaderInfo(); 
        if (typeof updateGuestMenuState === 'function') updateGuestMenuState();
        if (window.initRelatedPosts) window.initRelatedPosts();
        if (window.loadLandingNews) window.loadLandingNews();
        fetchVillageProfilePublic(); attachEvents(); fixBloggerAccessibility();
        if(typeof runPageRouter === 'function') runPageRouter();
    };

    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', onReady) } else { onReady() }
})();
