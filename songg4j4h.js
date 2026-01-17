// ================================================================
// FILE: songgajah-core.js (Versi Bersih)
// ================================================================

window.loadLeafletLibrary = function() {
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
        document.head.appendChild(script);
    });
};

window.fixBloggerAccessibility = function() {
    const images = document.querySelectorAll('.post-body img');
    const pageTitle = document.title || "Gambar Dokumentasi";
    images.forEach((img) => {
        if (!img.hasAttribute('alt') || img.alt.trim() === "") {
            let newAlt = img.getAttribute('title') || "";
            if (!newAlt && img.src) {
                const filename = img.src.substring(img.src.lastIndexOf('/') + 1).split('.')[0];
                newAlt = decodeURIComponent(filename).replace(/[-_+]/g, ' ');
            }
            if (!newAlt || newAlt.length < 3) { newAlt = pageTitle + " - Ilustrasi" }
            img.setAttribute('alt', newAlt);
        }
        const parentLink = img.closest('a');
        if (parentLink && !parentLink.getAttribute('aria-label')) {
            parentLink.setAttribute('aria-label', "Lihat Gambar: " + img.getAttribute('alt'));
        }
    });
};

window.handleGuestLogout = function() {
    Swal.fire({ title: "Keluar?", text: "Akhiri sesi login?", icon: "question", showCancelButton: true, confirmButtonColor: "#d33", confirmButtonText: "Ya, Keluar" }).then(async e => {
        if (e.isConfirmed) {
            Swal.fire({ title: "Proses keluar...", didOpen: () => Swal.showLoading() });
            try { if(typeof window.apiCall === 'function') await apiCall({ action: "logout" }) } catch (e) {}
            localStorage.removeItem("access_token"); localStorage.removeItem("refresh_token");
            localStorage.removeItem("CLIENT_SIDE_NOTIF_CACHE"); localStorage.removeItem("CACHE_KAMUS_REFERENSI");
            sessionStorage.clear(); location.replace("/p/login.html");
        }
    })
};

window.updateGuestMenuState = function() {
    const currentPath = window.location.pathname;
    document.querySelectorAll('#guest-header nav > a').forEach(link => {
        const href = link.getAttribute('href');
        const isActive = (href === '/' && (currentPath === '/' || currentPath === '/index.html')) || (href === currentPath);
        link.classList.toggle('text-blue-600', isActive);
        link.classList.toggle('bg-blue-50', isActive);
        link.classList.toggle('font-bold', isActive);
        link.classList.toggle('text-gray-600', !isActive);
    });
    document.querySelectorAll('#mobile-menu-panel a').forEach(link => {
        const href = link.getAttribute('href');
        const isActive = (href === '/' && (currentPath === '/' || currentPath === '/index.html')) || (href === currentPath);
        link.classList.toggle('text-blue-600', isActive);
        link.classList.toggle('bg-blue-50', isActive);
        const icon = link.querySelector('i');
        if(icon) { icon.classList.toggle('text-blue-600', isActive); icon.classList.toggle('text-gray-400', !isActive); }
    });
};

window.initHomepageLayout = function() {
    const guestHeader = document.getElementById('guest-header');
    const searchInput = document.getElementById('scroll-search-input');
    if (!guestHeader) return;
    
    guestHeader.classList.remove('hidden');
    let ticking = false;
    
    const updateHeaderState = () => {
        const scrolled = window.scrollY > 20;
        if (scrolled) {
            guestHeader.classList.add('bg-white/90', 'backdrop-blur-md', 'shadow-sm', 'border-b', 'border-gray-200/50');
            guestHeader.classList.remove('bg-white/80');
        } else {
            guestHeader.classList.remove('bg-white/90', 'shadow-sm', 'border-b', 'border-gray-200/50', 'backdrop-blur-md');
            guestHeader.classList.add('bg-white/80');
        }
        if (searchInput) {
            searchInput.classList.remove('opacity-0');
            searchInput.classList.add('opacity-100');
        }
        ticking = false;
    };
    
    window.addEventListener('scroll', () => { if (!ticking) { window.requestAnimationFrame(updateHeaderState); ticking = true } }, { passive: true });
    updateHeaderState();
};

window.loadLandingNews = async function() {
    const container = document.getElementById('homepage-news-container');
    if (!container) return;
    try {
        const res = await fetch('/feeds/posts/default?alt=json&max-results=3');
        const data = await res.json();
        const entries = data.feed.entry || [];
        if (entries.length === 0) { container.innerHTML = `<div class="col-span-3 text-center py-10 text-slate-600">Belum ada berita.</div>`; return; }
        
        container.innerHTML = entries.map(entry => {
            const title = entry.title.$t;
            const link = entry.link.find(l => l.rel === 'alternate')?.href || "#";
            const date = new Date(entry.published.$t).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
            let img = 'https://placehold.co/600x400?text=No+Image';
            if (entry.media$thumbnail) img = entry.media$thumbnail.url.replace(/\/s[0-9]+.*?\//, "/w600-h340-p-k-no-nu-rw/");
            else if (entry.content && /src="([^"]+)"/.test(entry.content.$t)) img = entry.content.$t.match(/src="([^"]+)"/)[1];
            
            return `<article class="flex flex-col bg-white dark:bg-slate-800 rounded-2xl overflow-hidden hover:shadow-md hover:-translate-y-1 transition-all duration-300 border border-slate-100 dark:border-slate-700/50">
                <a href="${link}" class="relative h-48 overflow-hidden group"><img src="${img}" alt="${title.replace(/"/g,'')}" loading="lazy" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"></a>
                <div class="flex flex-col flex-1 p-5">
                    <div class="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 mb-3"><i class="far fa-calendar-alt"></i> ${date}</div>
                    <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-2 line-clamp-2 hover:text-blue-600"><a href="${link}">${title}</a></h3>
                    <a href="${link}" class="inline-flex items-center text-sm font-bold text-blue-700 hover:text-blue-800 mt-auto">Baca Selengkapnya <i class="fas fa-arrow-right ml-2 text-xs"></i></a>
                </div>
            </article>`;
        }).join('');
        
        // PENTING: Refresh link handler setelah inject HTML
        if (typeof window.attachEvents === 'function') window.attachEvents(); 
        
    } catch (e) { container.innerHTML = `<div class="col-span-3 text-center py-10 text-red-600">Gagal memuat berita.</div>`; }
};

window.fetchVillageProfilePublic = async function() {
    // Fungsi ini hanya fetch data untuk update cache, tidak render langsung untuk menghindari kedip
    try {
        const res = await apiCall({ action: "get_identitas_desa" });
        if (res.status || res.success) { 
            const finalData = res.data || res; 
            localStorage.setItem('CACHE_ID_DESA', JSON.stringify(finalData));
            // Panggil render header dari internal script jika tersedia
            if(window.renderGuestHeader) window.renderGuestHeader(finalData);
        }
    } catch (e) { console.error("Gagal load profil desa:", e) }
};

window.toggleGuestProfile = function(e) { 
    e.stopPropagation(); 
    const menu = document.getElementById('guest-nav-dropdown'); 
    const arrow = document.getElementById('guest-nav-arrow'); 
    if (menu) { 
        menu.classList.toggle('show'); 
        if (arrow) arrow.style.transform = menu.classList.contains('show') ? 'rotate(180deg)' : 'rotate(0deg)' 
    } 
};

window.initRelatedPosts = function() {
    const bridge = document.getElementById("related-data-bridge");
    const container = document.getElementById("related-posts-grid");
    const wrapper = document.getElementById("related-posts-wrapper");
    if (!bridge || !container) return;
    
    const labelRaw = bridge.textContent || bridge.innerText || "";
    if (!labelRaw.trim()) { if(wrapper) wrapper.classList.add("hidden"); return; }
    
    const labels = labelRaw.split(",").map(s => s.trim()).filter(s => s).slice(0, 3);
    if(labels.length === 0) return;

    Promise.all(labels.map(label => fetch(`/feeds/posts/default/-/${encodeURIComponent(label)}?alt=json&max-results=5`).then(r=>r.json()).then(d=>d.feed.entry||[]).catch(()=>[])))
    .then(results => {
        const uniquePosts = [];
        const seen = new Set();
        const currentUrl = location.href.split('?')[0];
        
        results.flat().forEach(post => {
            const link = post.link.find(l=>l.rel==='alternate')?.href;
            if(link && link.split('?')[0] !== currentUrl && !seen.has(post.title.$t)) {
                seen.add(post.title.$t);
                uniquePosts.push(post);
            }
        });
        
        if (uniquePosts.length === 0) { if(wrapper) wrapper.classList.add("hidden"); return; }
        
        container.innerHTML = uniquePosts.sort(()=>0.5-Math.random()).slice(0,3).map(post => {
            const title = post.title.$t;
            const link = post.link.find(l=>l.rel==='alternate').href;
            let img = 'https://placehold.co/600x400?text=No+Image';
            if (post.media$thumbnail) img = post.media$thumbnail.url.replace(/\/s[0-9]+(-c)?\//, "/w600-h340-p-k-no-nu/");
            else if (post.content && /src="([^"]+)"/.test(post.content.$t)) img = post.content.$t.match(/src="([^"]+)"/)[1];
            
            return `<div class="group flex flex-col h-full bg-white dark:bg-gray-800 rounded-lg overflow-hidden hover:shadow-xl transition-all border border-gray-100 dark:border-gray-700">
                <a href="${link}" class="block w-full relative overflow-hidden bg-gray-100" style="padding-top: 56.25%;">
                    <img src="${img}" loading="lazy" class="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110">
                </a>
                <div class="p-5 flex flex-col flex-grow">
                    <h4 class="text-base font-bold text-blue-600 dark:text-blue-400 mb-2"><a href="${link}">${title}</a></h4>
                </div>
            </div>`;
        }).join('');
        
        if(wrapper) wrapper.classList.remove("hidden");
        // PENTING: Refresh link handler
        if (typeof window.attachEvents === 'function') window.attachEvents();
    });
};
