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
    // --- ACCESSIBILITY & UTILS ---
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

    // --- HEADER RENDERER ---
    const getHeaderLogoUrl = (url) => { return processProfileImage(url, 'Logo') };
    
    window.renderGuestHeader = function(data) {
        const titleEl = document.getElementById('header-nama-desa');
        const addrEl = document.getElementById('header-alamat-desa');
        const imgEl = document.getElementById('header-logo-img');
        const fallbackEl = document.getElementById('header-logo-fallback');
        const landingTitleEl = document.getElementById('landing-nama-desa');

        if (data.nama_desa || data.nama) {
            const rawNama = data.nama_desa || data.nama || "Desa Songgaja";
            const fixedNama = "Desa " + rawNama.replace('Desa ', '');
            if (titleEl) { titleEl.textContent = fixedNama; titleEl.classList.remove('opacity-0'); }
            if (landingTitleEl) landingTitleEl.textContent = fixedNama;
        }

        if (addrEl) {
            const kec = data.nama_kecamatan || "-";
            const kab = data.nama_kabupaten || "-";
            addrEl.textContent = `Kec. ${kec}, Kab. ${kab}`;
            addrEl.classList.remove('opacity-0');
        }

        const logoUrl = data.logo || data.logo_desa;
        if (logoUrl && imgEl) {
            const newSrc = getHeaderLogoUrl(logoUrl);
            if (imgEl.src !== newSrc) {
                imgEl.src = newSrc;
                if (imgEl.complete && imgEl.naturalHeight !== 0) {
                     imgEl.classList.remove('hidden');
                     if (fallbackEl) fallbackEl.classList.add('hidden');
                } else {
                     imgEl.onload = () => {
                        imgEl.classList.remove('hidden');
                        if (fallbackEl) fallbackEl.classList.add('hidden');
                     }
                }
            } else {
                imgEl.classList.remove('hidden');
                if (fallbackEl) fallbackEl.classList.add('hidden');
            }
        } else {
            if (imgEl) imgEl.classList.add('hidden');
            if (fallbackEl) fallbackEl.classList.remove('hidden');
        }

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
    };

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
    
    window.handleGuestLogout = function() {
        Swal.fire({ title: "Keluar?", text: "Akhiri sesi login?", icon: "question", showCancelButton: !0, confirmButtonColor: "#d33", confirmButtonText: "Ya, Keluar" }).then(async e => {
            if (e.isConfirmed) {
                Swal.fire({ title: "Proses keluar...", didOpen: () => Swal.showLoading() });
                try { "function" == typeof window.apiCall && await apiCall({ action: "logout" }) } catch (e) {}
                localStorage.removeItem("access_token"); localStorage.removeItem("refresh_token");
                localStorage.removeItem("CLIENT_SIDE_NOTIF_CACHE"); localStorage.removeItem("CACHE_KAMUS_REFERENSI");
                sessionStorage.clear(); location.replace("/p/login.html");
            }
        })
    };
// --- FUNGSI UPDATE MENU ACTIVE (FIX DROPDOWN & DARK MODE) ---
    function updateGuestMenuState() {
        const currentPath = window.location.pathname;

        // ============================
        // 1. LOGIKA DESKTOP
        // ============================
        const navContainer = document.querySelector('#guest-header nav');
        
        if (navContainer) {
            // Helper untuk memberi style Aktif/Tidak
            const setStyle = (el, isActive) => {
                if (!el) return;
                if (isActive) {
                    el.classList.remove('text-gray-600', 'dark:text-gray-300');
                    el.classList.add(
                        'text-blue-600', 'bg-blue-50', 'font-bold', 'shadow-sm', 
                        'dark:text-blue-400', 'dark:bg-gray-800'
                    );
                } else {
                    el.classList.remove(
                        'text-blue-600', 'bg-blue-50', 'font-bold', 'shadow-sm',
                        'dark:text-blue-400', 'dark:bg-gray-800'
                    );
                    el.classList.add('text-gray-600', 'dark:text-gray-300');
                }
            };

            // A. Cek Menu Tunggal (Link Langsung seperti Beranda)
            // Menggunakan :scope > a agar hanya mengambil anak langsung, bukan yang di dalam dropdown
            navContainer.querySelectorAll(':scope > a').forEach(link => {
                const href = link.getAttribute('href');
                const isActive = (href === '/' && (currentPath === '/' || currentPath === '/index.html')) || (href === currentPath);
                setStyle(link, isActive);
            });

            // B. Cek Menu Dropdown (Profil, Pemerintahan, Data & Layanan)
            navContainer.querySelectorAll(':scope > div.group').forEach(group => {
                const parentButton = group.querySelector('button'); // Tombol Menu Utama
                const childLinks = group.querySelectorAll('a');     // Link di dalam Dropdown
                let isParentActive = false;

                childLinks.forEach(subLink => {
                    const subHref = subLink.getAttribute('href');
                    const isSubActive = (subHref === currentPath);

                    if (isSubActive) {
                        isParentActive = true;
                        // Style untuk Submenu yang aktif (Teks Biru & Bold)
                        subLink.classList.remove('text-gray-700', 'dark:text-gray-300');
                        subLink.classList.add('text-blue-600', 'dark:text-blue-400', 'font-bold', 'bg-blue-50', 'dark:bg-gray-700');
                    } else {
                        // Reset style submenu lain
                        subLink.classList.remove('text-blue-600', 'dark:text-blue-400', 'font-bold', 'bg-blue-50', 'dark:bg-gray-700');
                        subLink.classList.add('text-gray-700', 'dark:text-gray-300');
                    }
                });

                // Jika ada salah satu anak yang aktif, maka BAPAKNYA juga aktif
                setStyle(parentButton, isParentActive);
            });
        }

        // ============================
        // 2. LOGIKA MOBILE
        // ============================
        const mobileLinks = document.querySelectorAll('#mobile-menu-panel a');
        mobileLinks.forEach(link => {
            const href = link.getAttribute('href');
            const isActive = (href === '/' && (currentPath === '/' || currentPath === '/index.html')) || (href === currentPath);
            const icon = link.querySelector('i');

            if (isActive) {
                link.classList.remove('text-gray-700', 'dark:text-gray-300');
                link.classList.add(
                    'text-blue-600', 'bg-blue-50', 'font-bold',
                    'dark:text-blue-400', 'dark:bg-gray-800'
                );
                
                if (icon) {
                    icon.classList.remove('text-gray-400', 'dark:text-gray-500');
                    icon.classList.add('text-blue-600', 'dark:text-blue-400');
                }

                // FITUR TAMBAHAN: Otomatis Buka Accordion (Details) di Mobile
                const parentDetails = link.closest('details');
                if (parentDetails) {
                    parentDetails.open = true; // Buka dropdown mobile
                    const summary = parentDetails.querySelector('summary');
                    if (summary) {
                         // Highlight juga judul accordionnya
                         summary.classList.add('text-blue-600', 'dark:text-blue-400', 'font-bold');
                         const arrow = summary.querySelector('.fa-chevron-down');
                         if(arrow) arrow.style.transform = 'rotate(180deg)';
                    }
                }

            } else {
                link.classList.remove(
                    'text-blue-600', 'bg-blue-50', 'font-bold',
                    'dark:text-blue-400', 'dark:bg-gray-800'
                );
                link.classList.add('text-gray-700', 'dark:text-gray-300');
                
                if (icon) {
                    icon.classList.add('text-gray-400', 'dark:text-gray-500');
                    icon.classList.remove('text-blue-600', 'dark:text-blue-400');
                }
            }
        });
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
    
  // --- 1. Tambahkan Variabel Cache Global (Di luar fungsi) ---
window.CACHED_NEWS_DATA = null; 

// --- 2. Update Fungsi Load Berita ---
window.loadLandingNews = async function() {
    const container = document.getElementById('homepage-news-container');
    if (!container) return;
    
    // --- CEK MEMORI: Apakah data sudah pernah diambil sebelumnya? ---
    if (window.CACHED_NEWS_DATA) {
        // JIKA ADA: Langsung pakai data lama (Instant Load)
        renderNewsToHTML(container, window.CACHED_NEWS_DATA);
        return; 
    }

    // --- JIKA BELUM ADA: Ambil dari Server ---
    try {
        const res = await fetch('/feeds/posts/default?alt=json&max-results=3');
        const data = await res.json();
        
        // Simpan ke Memori agar nanti tidak perlu fetch lagi
        window.CACHED_NEWS_DATA = data; 
        
        // Tampilkan
        renderNewsToHTML(container, data);

    } catch (e) {
        console.error("Error loading news:", e);
        container.innerHTML = `<div class="col-span-3 text-center py-10 text-red-600">Gagal memuat berita.</div>`;
    }
};
// --- 3. Fungsi Render dengan Efek Muncul Dari Bawah ---
function renderNewsToHTML(container, data) {
    const entries = data.feed.entry || [];
    
    if (entries.length === 0) {
        container.innerHTML = `<div class="col-span-3 text-center py-10 text-slate-600">Belum ada berita.</div>`;
        return;
    }
    
    let html = '';
    
    entries.forEach((entry, index) => {
        const title = entry.title.$t;
        const safeTitle = title.replace(/"/g, '&quot;');
        
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
        <article class="flex flex-col bg-white dark:bg-slate-800 rounded-2xl overflow-hidden hover:shadow-md hover:-translate-y-1 transition-all duration-300 border border-slate-100 dark:border-slate-700/50 animate-fade-up" style="animation-delay: ${index * 100}ms">
            <a href="${link}" aria-label="Baca artikel: ${safeTitle}" class="relative h-48 overflow-hidden group aspect-video">
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
}
    // --- FETCH VILLAGE PROFILE ---
    async function fetchVillageProfilePublic() {
        const cached = localStorage.getItem('CACHE_ID_DESA');
        if (cached) { try { renderGuestHeader(JSON.parse(cached)) } catch (e) {} }
        try {
            const res = await apiCall({ action: "get_identitas_desa" });
            if (res.status || res.success) { const finalData = res.data || res; renderGuestHeader(finalData); localStorage.setItem('CACHE_ID_DESA', JSON.stringify(finalData)) }
        } catch (e) { console.error("Gagal load profil desa:", e) }
    }

    window.toggleGuestProfile = function(e) { e.stopPropagation(); const menu = document.getElementById('guest-nav-dropdown'); const arrow = document.getElementById('guest-nav-arrow'); if (menu) { menu.classList.toggle('show'); if (arrow) arrow.style.transform = menu.classList.contains('show') ? 'rotate(180deg)' : 'rotate(0deg)' } };
    document.addEventListener('click', function(e) { const menu = document.getElementById('guest-nav-dropdown'); const btn = document.getElementById('nav-user-container'); if (menu && menu.classList.contains('show') && btn && !btn.contains(e.target)) { menu.classList.remove('show'); const arrow = document.getElementById('guest-nav-arrow'); if (arrow) arrow.style.transform = 'rotate(0deg)' } });
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

const UI={bar:document.getElementById("nprogress"),content:"#main-content"};const startLoading=()=>{const e=document.querySelector(UI.content);if(UI.bar){UI.bar.style.transition="none";UI.bar.style.width="0%";UI.bar.style.opacity="1";void UI.bar.offsetWidth;UI.bar.style.transition="width 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)";UI.bar.style.width="30%";setTimeout(()=>{if(UI.bar.style.opacity==="1"){UI.bar.style.transition="width 5s linear";UI.bar.style.width="85%"}},400)}e&&(e.style.pointerEvents="none")};const endLoading=()=>{const e=document.querySelector(UI.content);if(UI.bar){UI.bar.style.transition="width 0.2s ease-out";UI.bar.style.width="100%";setTimeout(()=>{UI.bar.style.opacity="0";setTimeout(()=>{UI.bar.style.width="0%"},200)},250)}e&&(e.style.pointerEvents="auto",e.style.filter="none")};
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
            
            // LOGIKA DETEKSI KELUAR DARI HOME
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

const attachEvents=()=>{document.querySelectorAll("a").forEach(e=>{e.removeEventListener("click",handleLinkClick),e.addEventListener("click",handleLinkClick),e.addEventListener("mouseenter",function(){const t=this.href;t.startsWith(location.origin)&&!document.querySelector(`link[href="${t}"]`)&&(()=>{const e=document.createElement("link");e.rel="prefetch",e.href=t,document.head.appendChild(e)})()},{once:!0})})};


    window.addEventListener('popstate', () => loadPage(window.location.href));
    window.addEventListener('pageshow', (event) => { updateHeaderInfo() });

    const cachedData = localStorage.getItem('CACHE_ID_DESA');
    if (cachedData) {
        try {
            const parsed = JSON.parse(cachedData);
            if (document.getElementById('header-nama-desa')) { window.renderGuestHeader(parsed) } else { requestAnimationFrame(() => window.renderGuestHeader(parsed)) }
        } catch (e) {}
    }
// --- FITUR DARK MODE GUEST ---
    const initGuestDarkMode = () => {
        const toggleDesktop = document.getElementById('guestDarkModeToggle');
        const toggleMobile = document.getElementById('mobileDarkModeToggle');
        const html = document.documentElement;

        // 1. Cek LocalStorage saat loading
        const isDark = localStorage.getItem('darkMode') === 'true';
        if (isDark) {
            html.classList.add('dark');
        } else {
            html.classList.remove('dark');
        }

        // 2. Fungsi Update Icon (Bulan/Matahari)
        const updateIcons = () => {
            const isDarkMode = html.classList.contains('dark');
            const iconClass = isDarkMode ? 'fa-sun' : 'fa-moon';
            const buttons = [toggleDesktop, toggleMobile];
            
            buttons.forEach(btn => {
                if (btn) {
                    const icon = btn.querySelector('i');
                    if (icon) {
                        icon.className = `fas ${iconClass} text-lg`;
                        // Efek animasi kecil
                        icon.style.transform = 'scale(0.5)';
                        setTimeout(() => icon.style.transform = 'scale(1)', 200);
                    }
                }
            });
        };

        // 3. Fungsi Toggle
        const handleToggle = () => {
            html.classList.toggle('dark');
            const currentStatus = html.classList.contains('dark');
            localStorage.setItem('darkMode', currentStatus); // Simpan ke storage agar dashboard juga berubah
            updateIcons();
        };

        // 4. Pasang Event Listener
        if (toggleDesktop) toggleDesktop.addEventListener('click', handleToggle);
        if (toggleMobile) toggleMobile.addEventListener('click', handleToggle);

        // Jalankan update icon saat pertama kali load
        updateIcons();
    };
    const onReady = () => {
		initGuestDarkMode();
        initHomepageLayout(); updateHeaderInfo(); updateGuestMenuState();
        if (window.initRelatedPosts) window.initRelatedPosts();
        if (window.loadLandingNews) window.loadLandingNews();
        fetchVillageProfilePublic(); attachEvents(); fixBloggerAccessibility();
        if(typeof runPageRouter === 'function') runPageRouter();
    };

    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', onReady) } else { onReady() }
})();
