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

    function updateGuestMenuState() {
        const currentPath = window.location.pathname;
        const desktopLinks = document.querySelectorAll('#guest-header nav > a');
        desktopLinks.forEach(link => {
            const href = link.getAttribute('href');
            const isActive = (href === '/' && (currentPath === '/' || currentPath === '/index.html')) || (href === currentPath);
            if (isActive) { link.classList.remove('text-gray-600'); link.classList.add('text-blue-600', 'bg-blue-50', 'font-bold', 'shadow-sm') } else { link.classList.add('text-gray-600'); link.classList.remove('text-blue-600', 'bg-blue-50', 'font-bold', 'shadow-sm') }
        });
        const mobileLinks = document.querySelectorAll('#mobile-menu-panel a');
        mobileLinks.forEach(link => {
            const href = link.getAttribute('href');
            const isActive = (href === '/' && (currentPath === '/' || currentPath === '/index.html')) || (href === currentPath);
            if (isActive) { link.classList.remove('text-gray-700'); link.classList.add('text-blue-600', 'bg-blue-50', 'font-bold'); const icon = link.querySelector('i'); if (icon) { icon.classList.remove('text-gray-400'); icon.classList.add('text-blue-600') } } else { link.classList.add('text-gray-700'); link.classList.remove('text-blue-600', 'bg-blue-50', 'font-bold'); const icon = link.querySelector('i'); if (icon) { icon.classList.add('text-gray-400'); icon.classList.remove('text-blue-600') } }
        })
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
                // Ambil Link
                let link = "#";
                const linkObj = entry.link.find(l => l.rel === 'alternate');
                if(linkObj) link = linkObj.href;

                const date = new Date(entry.published.$t).toLocaleDateString('id-ID', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
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
