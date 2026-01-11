/* ================================================= */
/* [0] JSON DATA LOADER + GLOBAL STATE */
/* ================================================= */

/* [0-1] Global variables */
let data = {};
let currentCategory = "menu";

/* ================================================= */
/* [NAV-SLIDE] ACTIVE MENU SLIDE UNDERLINE */
/* ================================================= */

/* [NAV-SLIDE-0] underline bar create + attach */
function initMenuUnderline() {
  const menu = document.getElementById("mainMenu");
  if (!menu) return;

  // underline bar create (only once)
  if (!document.querySelector(".menu-underline")) {
    const underline = document.createElement("div");
    underline.className = "menu-underline";
    menu.appendChild(underline);
  }
}

/* [NAV-SLIDE-1] Move underline to active item (PC UNDERLINE FIX ONLY) */
function moveUnderlineToActive() {
  const menu = document.getElementById("mainMenu");
  const underline = document.querySelector(".menu-underline");
  if (!menu || !underline) return;

  const active = menu.querySelector("li.active");
  if (!active) {
    underline.style.width = "0px";
    return;
  }

  const menuRect = menu.getBoundingClientRect();
  const activeRect = active.getBoundingClientRect();

  // ✅ FIX: scroll/transform/layout shift থাকলেও exact position ঠিক থাকবে
  const left = (activeRect.left - menuRect.left) + (menu.scrollLeft || 0);
  const width = activeRect.width;

  underline.style.left = left + "px";
  underline.style.width = width + "px";
}


/* [NAV-SLIDE-2] Active menu setter */
function setActiveMenu(category) {
  /* [NAV-SLIDE-2-1] remove active from only top menu items */
  document.querySelectorAll("#mainMenu > li").forEach((li) => li.classList.remove("active"));

  /* [NAV-SLIDE-2-2] category -> id map */
  const map = {
    menu: "nav-menu",
    newspaper: "nav-newspaper",
    facebook: "nav-facebook",
    propagandist: "nav-propagandist",
    youtube: "nav-youtube",
    talkshow: "nav-talkshow",
  };

  const id = map[category];
  if (!id) return;

  const el = document.getElementById(id);
  if (el) el.classList.add("active");

  /* [NAV-SLIDE-2-3] move underline */
  moveUnderlineToActive();
}

/* [NAV-SLIDE-3] On resize update underline */
window.addEventListener("resize", () => {
  moveUnderlineToActive();
});

/* ================================================= */
/* [NP-FIX] Newspaper dropdown click fix */
/* ================================================= */
function handleNewspaperClick(e) {
  // যদি dropdown এর ভিতরে ক্লিক হয়, parent click কাজ করবে না
  if (e.target.closest(".dropdown-menu") || e.target.closest(".dropdown-menu-sub")) {
    return;
  }

  // শুধু "নিউজপেপার" মেইন লেখায় ক্লিক করলে লোড হবে
  loadCategory("newspaper");
}

/* ================================================= */
/* [0-2] Fetch data.json */
/* ================================================= */
fetch("data.json")
  .then((res) => {
    if (!res.ok) throw new Error("data.json পাওয়া যায়নি (HTTP " + res.status + ")");
    return res.json();
  })
  .then((json) => {
    data = json;
    loadCategory("menu"); /* [0-3] Default load */
  })
  .catch((err) => {
    console.error(err);
    const container = document.getElementById("content");
    container.innerHTML = "<p>ডাটা লোড হয়নি। Live Server দিয়ে চালান।</p>";
  });

/* ================================================= */
/* [1] CATEGORY LOADER */
/* ================================================= */

/* [1-1] Load category + render */
function loadCategory(category) {
  currentCategory = category;
  setActiveMenu(category); /* [1-2] active underline */
  renderCategory();
}

/* ================================================= */
/* [2] CATEGORY RENDER (WITH SEARCH + FAVORITES) */
/* ================================================= */

/* [2-1] Render current category */
function renderCategory() {
  const container = document.getElementById("content");
  container.innerHTML = "";

  const items = data[currentCategory] || [];
  if (items.length === 0) {
    container.innerHTML = "<p>কোন তথ্য পাওয়া যায়নি</p>";
    return;
  }

  /* [2-2] Search query */
  const query = (document.getElementById("searchInput")?.value || "").toLowerCase();

  const filtered = items.filter((item) => {
    const title = (item.title || "").toLowerCase();
    const subtitle = (item.subtitle || "").toLowerCase();
    return !query || title.includes(query) || subtitle.includes(query);
  });

  if (filtered.length === 0) {
    container.innerHTML = "<p>সার্চে কোন তথ্য পাওয়া যায়নি</p>";
    return;
  }

  /* [2-3] Favorites section (always top) */
  renderFavoritesSection(container);
  const sum = buildFavSummaryText();

  /* [2-4] Sorting: Favorites first, then Most Opened */
  const sorted = sortByFavAndOpen(filtered);

  /* [2-5] Render cards */
  sorted.forEach((item) => container.appendChild(buildCard(item)));
}

/* ================================================= */
/* [3] GLOBAL SEARCH (ALL CATEGORY) */
/* ================================================= */

/* [3-1] Global search with duplicate removal */
function globalSearch(query) {
  const container = document.getElementById("content");
  container.innerHTML = "";

  /* [3-2] Duplicate stopper */
  const seenLinks = new Set();
  let results = [];

  /* [3-3] Loop all categories */
  Object.keys(data).forEach((category) => {
    const items = data[category] || [];

    items.forEach((item) => {
      const title = (item.title || "").toLowerCase();
      const subtitle = (item.subtitle || "").toLowerCase();

      /* [3-4] Match search */
      const isMatch = title.includes(query) || subtitle.includes(query);
      if (!isMatch) return;

      /* [3-5] Unique key */
      const uniqueKey = (item.link || (item.title || "") + "|" + (item.subtitle || "")).toLowerCase();

      /* [3-6] Skip duplicates */
      if (seenLinks.has(uniqueKey)) return;

      /* [3-7] Save unique result */
      seenLinks.add(uniqueKey);
      results.push(item);
    });
  });

  /* [3-8] Empty state */
  if (results.length === 0) {
    container.innerHTML = "<p>সার্চে কোন তথ্য পাওয়া যায়নি</p>";
    return;
  }

  /* [3-9] Favorites section (always top) */
  renderFavoritesSection(container);

  /* [3-10] Sorting: Favorites first, then Most Opened */
  const sorted = sortByFavAndOpen(results);

  /* [3-11] Render search results */
  sorted.forEach((item) => container.appendChild(buildCard(item)));
}

/* ================================================= */
/* [4] SEARCH INPUT HANDLER */
/* ================================================= */

/* [4-1] Search input triggers global search */
function filterCards() {
  const query = (document.getElementById("searchInput")?.value || "").toLowerCase();

  /* [4-1-A] Show/Hide clear button */
  const btn = document.getElementById("clearSearchBtn");
  if (btn) btn.style.display = query.trim() ? "block" : "none";

  /* [4-2] If empty -> normal category view */
  if (!query) {
    renderCategory();
    return;
  }

  /* [4-3] If has query -> global search */
  globalSearch(query);
}

/* ================================================= */
/* [4-A] CLEAR SEARCH BUTTON */
/* ================================================= */

/* [4-A-1] Clear Search Button Logic */
function clearSearch() {
  const input = document.getElementById("searchInput");
  const btn = document.getElementById("clearSearchBtn");
  if (!input) return;

  input.value = "";
  if (btn) btn.style.display = "none";

  filterCards(); /* [4-A-2] আগের মতো ক্যাটাগরি দেখাবে */
}

/* ================================================= */
/* [5] NEWSPAPER FILTER LOADER */
/* ================================================= */

/* [5-1] Load newspaper filter (country/lang/type/scope + search) */
function loadNewspaperFilter(filter) {
  currentCategory = "newspaper";
  setActiveMenu("newspaper"); /* [5-1-A] active underline */

  const container = document.getElementById("content");
  container.innerHTML = "";

  const items = data["newspaper"] || [];
  if (items.length === 0) {
    container.innerHTML = "<p>কোন তথ্য পাওয়া যায়নি</p>";
    return;
  }

  /* [5-2] Search query */
  const query = (document.getElementById("searchInput")?.value || "").toLowerCase();

  const filtered = items.filter((item) => {
    const matchLang = !filter.lang || item.lang === filter.lang;
    const matchCountry = !filter.country || item.country === filter.country;
    const matchScope = !filter.scope || item.scope === filter.scope;
    const matchType = !filter.type || item.type === filter.type;

    const title = (item.title || "").toLowerCase();
    const subtitle = (item.subtitle || "").toLowerCase();
    const matchSearch = !query || title.includes(query) || subtitle.includes(query);

    return matchLang && matchCountry && matchScope && matchType && matchSearch;
  });

  /* [5-3] Empty state */
  if (filtered.length === 0) {
    container.innerHTML = "<p>ফিল্টারে কোন তথ্য পাওয়া যায়নি</p>";
    return;
  }

  /* [5-4] Favorites section (always top) */
  renderFavoritesSection(container);

  /* [5-5] Sorting: Favorites first, then Most Opened */
  const sorted = sortByFavAndOpen(filtered);

  /* [5-6] Render cards */
  sorted.forEach((item) => container.appendChild(buildCard(item)));
}

/* ================================================= */
/* [6] UI: BACK TO TOP */
/* ================================================= */

/* [6-1] Back-to-top show/hide */
window.onscroll = function () {
  const btn = document.getElementById("backToTop");
  if (!btn) return;
  btn.style.display = document.documentElement.scrollTop > 200 ? "block" : "none";
};

/* [6-2] Scroll to top */
function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ================================================= */
/* [7] RIGHT-CLICK: OPEN ALL LINKS */
/* ================================================= */

/* [7-1] Open all links from a category */
function openAllCategory(category) {
  const items = data[category] || [];
  if (items.length === 0) return alert("কোনো তথ্য পাওয়া যায়নি ❌");

  const links = uniqueLinks(items);
  openLinksInTabs(links, `${category} থেকে`);
}

/* [7-2] Open all newspaper links with filter */
function openAllNewspapers(filter = {}) {
  const items = data["newspaper"] || [];
  if (items.length === 0) return alert("কোন নিউজপেপার ডাটা নেই ❌");

  const filtered = items.filter((item) => {
    const matchCountry = !filter.country || item.country === filter.country;
    const matchLang = !filter.lang || item.lang === filter.lang;
    const matchType = !filter.type || item.type === filter.type;
    const matchScope = !filter.scope || item.scope === filter.scope;
    return matchCountry && matchLang && matchType && matchScope;
  });

  if (filtered.length === 0) return alert("এই ফিল্টারে কোনো পেপার নেই ❌");

  const links = uniqueLinks(filtered);
  openLinksInTabs(links, "Newspaper");
}

/* [7-3] Get unique links (remove duplicates) */
function uniqueLinks(items) {
  const seen = new Set();
  const links = [];
  items.forEach((x) => {
    const url = (x.link || "").trim();
    if (!url) return;
    const key = url.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    links.push(url);
  });
  return links;
}

/* [7-4] Open many tabs (popup blocker warning) */
function openLinksInTabs(links, labelText) {
  const ok = confirm(`মোট ${links.length} টি লিংক নতুন ট্যাবে ওপেন হবে (${labelText}). এগোবেন?`);
  if (!ok) return;

  let blocked = 0;
  links.forEach((url) => {
    const w = window.open(url, "_blank");
    if (!w) blocked++;
  });

  if (blocked > 0) {
    alert(`কিছু ট্যাব ব্লক হয়েছে (${blocked}). Browser settings থেকে Pop-ups allow করুন।`);
  }
}

/* ================================================= */
/* [8] ADVANCED SIDEBAR PREVIEW SYSTEM */
/* ================================================= */

/* [8-1] Side panel state */
let sidePanelState = {
  lastTitle: "",
  lastUrl: "",
  position: "right",
  width: "normal",
  history: [],
};

/* [8-2] Open side panel */
function openSidePanel(title, url, subtitle = "") {
  const panel = document.getElementById("sidePanel");
  const frame = document.getElementById("sidePanelFrame");
  const panelTitle = document.getElementById("sidePanelTitle");
  const panelSub = document.getElementById("sidePanelSub");
  const fallback = document.getElementById("sidePanelFallback");

  if (!panel || !frame) return;

  sidePanelState.lastTitle = title || "Preview";
  sidePanelState.lastUrl = url || "";

  if (panelTitle) panelTitle.textContent = sidePanelState.lastTitle;
  if (panelSub) panelSub.textContent = subtitle || "";

  if (fallback) fallback.classList.remove("show");

  frame.src = url || "about:blank";
  panel.classList.add("open");

  addToSidePanelHistory(sidePanelState.lastTitle, sidePanelState.lastUrl);
  applySidePanelMode();
  scheduleIframeFallbackCheck();
}

/* [8-3] Close side panel */
function closeSidePanel() {
  const panel = document.getElementById("sidePanel");
  const frame = document.getElementById("sidePanelFrame");
  const fallback = document.getElementById("sidePanelFallback");

  if (!panel || !frame) return;

  panel.classList.remove("open");
  if (fallback) fallback.classList.remove("show");
  frame.src = "about:blank";
}

/* [8-4] Open current in new tab */
function openSidePanelInNewTab() {
  if (!sidePanelState.lastUrl) return;
  window.open(sidePanelState.lastUrl, "_blank");
}

/* [8-5] Retry current preview */
function retrySidePanel() {
  if (!sidePanelState.lastUrl) return;
  openSidePanel(sidePanelState.lastTitle, sidePanelState.lastUrl);
}

/* [8-6] Toggle width mode */
function toggleSidePanelWidth() {
  sidePanelState.width =
    sidePanelState.width === "normal"
      ? "wide"
      : sidePanelState.width === "wide"
      ? "narrow"
      : "normal";
  applySidePanelMode();
}

/* [8-7] Toggle position */
function toggleSidePanelPosition() {
  sidePanelState.position = sidePanelState.position === "right" ? "left" : "right";
  applySidePanelMode();
}

/* [8-8] Apply panel classes */
function applySidePanelMode() {
  const panel = document.getElementById("sidePanel");
  if (!panel) return;

  panel.classList.toggle("left", sidePanelState.position === "left");

  panel.classList.remove("wide", "narrow");
  if (sidePanelState.width === "wide") panel.classList.add("wide");
  if (sidePanelState.width === "narrow") panel.classList.add("narrow");
}

/* [8-9] Add to history + render */
function addToSidePanelHistory(title, url) {
  if (!url) return;

  sidePanelState.history = sidePanelState.history.filter((x) => x.url !== url);
  sidePanelState.history.unshift({ title: title || "Link", url });

  if (sidePanelState.history.length > 10) sidePanelState.history = sidePanelState.history.slice(0, 10);

  renderSidePanelHistory();
}

/* [8-10] Render history chips */
function renderSidePanelHistory() {
  const host = document.getElementById("sidePanelHistory");
  if (!host) return;

  if (sidePanelState.history.length === 0) {
    host.innerHTML = `<span style="font-size:12px;color:#777;">Empty</span>`;
    return;
  }

  host.innerHTML = sidePanelState.history
    .map(
      (h) => `
        <div class="history-item" onclick="openSidePanel('${escapeQuotes(h.title)}','${escapeQuotes(h.url)}')">
          ${h.title}
        </div>
      `
    )
    .join("");
}

/* [8-11] Clear history */
function clearSidePanelHistory() {
  sidePanelState.history = [];
  renderSidePanelHistory();
}

/* [8-12] Escape helper */
function escapeQuotes(str) {
  return (str || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

/* [8-13] Fallback checker */
let iframeFallbackTimer = null;
function scheduleIframeFallbackCheck() {
  const fallback = document.getElementById("sidePanelFallback");
  const frame = document.getElementById("sidePanelFrame");
  if (!fallback || !frame) return;

  if (iframeFallbackTimer) clearTimeout(iframeFallbackTimer);

  iframeFallbackTimer = setTimeout(() => {
    fallback.classList.add("show");
  }, 2000);
}

/* ================================================= */
/* [9] FAVORITES + MOST OPENED (localStorage) */
/* ================================================= */

/* [9-1] Category-wise Favorite key */
function getFavKey(category) {
  return "mediahub_favs_" + (category || "menu");
}
const LS_OPEN_KEY = "mediahub_opencount";

/* [9-2] Favorites read/write (category-wise) */
function getFavs(category = currentCategory) {
  try {
    return JSON.parse(localStorage.getItem(getFavKey(category))) || [];
  } catch {
    return [];
  }
}
function setFavs(category, arr) {
  localStorage.setItem(getFavKey(category), JSON.stringify(arr));
}
function isFav(link, category = currentCategory) {
  return getFavs(category).includes((link || "").toLowerCase());
}
function toggleFav(link, category = currentCategory) {
  const key = (link || "").toLowerCase();
  let favs = getFavs(category);
  favs = favs.includes(key) ? favs.filter((x) => x !== key) : [key, ...favs];
  setFavs(category, favs);
}

/* [9-3] Open count map (global) */
function getOpenMap() {
  try {
    return JSON.parse(localStorage.getItem(LS_OPEN_KEY)) || {};
  } catch {
    return {};
  }
}
function incOpen(link) {
  const key = (link || "").toLowerCase();
  if (!key) return;
  const m = getOpenMap();
  m[key] = (m[key] || 0) + 1;
  localStorage.setItem(LS_OPEN_KEY, JSON.stringify(m));
}
function getOpenCount(link) {
  const m = getOpenMap();
  return m[(link || "").toLowerCase()] || 0;
}

/* [9-4] Sort items: favorites first, then most opened */
function sortByFavAndOpen(items) {
  const favs = new Set(getFavs(currentCategory));

  return (items || []).slice().sort((a, b) => {
    const aKey = (a.link || "").toLowerCase();
    const bKey = (b.link || "").toLowerCase();

    const aFav = favs.has(aKey) ? 1 : 0;
    const bFav = favs.has(bKey) ? 1 : 0;
    if (aFav !== bFav) return bFav - aFav;

    const aOpen = getOpenCount(a.link);
    const bOpen = getOpenCount(b.link);
    if (aOpen !== bOpen) return bOpen - aOpen;

    return (a.title || "").localeCompare((b.title || ""), "bn");
  });
}

/* [9-5] Render favorites section */
function renderFavoritesSection(container) {
  const favs = getFavs(currentCategory);
  if (favs.length === 0) return;

  const items = data[currentCategory] || [];
  const favSet = new Set(favs);
  const favItems = items.filter((x) => favSet.has((x.link || "").toLowerCase()));
  if (favItems.length === 0) return;

  const wrap = document.createElement("div");
  wrap.className = "fav-wrap";

  const sum = buildFavSummaryText();
  
  wrap.innerHTML= `
    <div class="fav-head">
      <div>
        <div class="fav-title">⭐ Favorites (${sum.total})</div>
        <div class="fav-sub">${currentCategory} মেনুর Pin করা সোর্সগুলো (সবসময় উপরে)</div>
        <div class="fav-summary">📌 ${sum.line}</div>
      </div>
      <div class="fav-sub">মোট: ${favItems.length}</div>
    </div>
    <div class="fav-grid" id="favGrid"></div>
  `;



  container.appendChild(wrap);

  const favGrid = wrap.querySelector("#favGrid");
  sortByFavAndOpen(favItems).forEach((item) => favGrid.appendChild(buildCard(item)));
}

/* [9-6] Build single card */
function buildCard(item) {
  const card = document.createElement("div");
  card.className = "news-card";

  const fav = isFav(item.link, currentCategory);
  const openCount = getOpenCount(item.link);

  card.innerHTML = `
    <div class="fav-btn ${fav ? "is-fav" : ""}" title="Favorite (Pin)">${fav ? "★" : "☆"}</div>
    ${openCount > 0 ? `<div class="open-badge">Opened: ${openCount}</div>` : ""}

    <img src="${item.logo}" alt="${item.title}">
    <div class="news-title">${item.title}</div>
    <div class="news-subtitle">${item.subtitle}</div>
  `;

  /* [9-6-1] Left click -> open + count */
  card.onclick = () => {
    incOpen(item.link);
    window.open(item.link, "_blank");
    filterCards();
  };

  /* [9-6-2] Right click -> Sidebar preview + count */
  card.oncontextmenu = (e) => {
    e.preventDefault();
    incOpen(item.link);
    openSidePanel(item.title, item.link, item.subtitle || "");
    filterCards();
  };

  /* [9-6-3] Fav button click */
  const btn = card.querySelector(".fav-btn");
  btn.onclick = (e) => {
    e.stopPropagation();
    toggleFav(item.link, currentCategory);
    filterCards();
  };

  return card;
}

/* ================================================= */
/* [FV-SUM] Favorites Count Summary (All Categories) */
/* ================================================= */

/* ✅ Get favorites count for all categories */
function getFavCountsAll() {
  const counts = {};
  Object.keys(data || {}).forEach((cat) => {
    const favs = getFavs(cat);
    counts[cat] = favs.length;
  });
  return counts;
}

/* ================================================= */
/* [FV-SUM] Favorites Count Summary (All Categories) */
/* ================================================= */

/* ✅ Get favorites count for all categories */
function getFavCountsAll() {
  const counts = {};
  Object.keys(data || {}).forEach((cat) => {
    const favs = getFavs(cat);
    counts[cat] = favs.length;
  });
  return counts;
}

/* ✅ Convert category key to label */
function getCategoryLabel(cat) {
  const map = {
    menu: "Menu",
    newspaper: "Newspaper",
    facebook: "Facebook",
    propagandist: "Propagandist",
    youtube: "YouTube",
    talkshow: "Talkshow",
  };
  return map[cat] || cat;
}

/* ✅ Build summary text */
function buildFavSummaryText() {
  const counts = getFavCountsAll();

  const entries = Object.keys(counts)
    .filter((c) => counts[c] > 0)
    .map((c) => `${getCategoryLabel(c)}: ${counts[c]}`);

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return {
    total,
    line: entries.length ? entries.join(" | ") : "No favorites yet",
  };
}


/* ✅ Convert category key to Bangla label */
function getCategoryLabel(cat) {
  const map = {
    menu: "Menu",
    newspaper: "Newspaper",
    facebook: "Facebook",
    propagandist: "Propagandist",
    youtube: "YouTube",
    talkshow: "Talkshow",
  };
  return map[cat] || cat;
}

/* ✅ Build summary text */
function buildFavSummaryText() {
  const counts = getFavCountsAll();
  const entries = Object.keys(counts)
    .filter((c) => counts[c] > 0)
    .map((c) => `${getCategoryLabel(c)}: ${counts[c]}`);

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return {
    total,
    line: entries.length ? entries.join(" | ") : "No favorites yet",
  };
}




/* ================================================= */
/* [DOM-READY] Single DOMContentLoaded */
/* ================================================= */
document.addEventListener("DOMContentLoaded", () => {
  /* [DOM-1] underline init */
  initMenuUnderline();
  moveUnderlineToActive();

  /* [DOM-2] Search clear show/hide */
  const input = document.getElementById("searchInput");
  const btn = document.getElementById("clearSearchBtn");
  if (input && btn) {
    btn.style.display = input.value.trim() ? "block" : "none";
    input.addEventListener("input", () => {
      btn.style.display = input.value.trim() ? "block" : "none";
    });
  }

  /* [DOM-3] sidebar iframe fallback hide */
  const frame = document.getElementById("sidePanelFrame");
  const fallback = document.getElementById("sidePanelFallback");
  if (frame && fallback) {
    frame.addEventListener("load", () => {
      fallback.classList.remove("show");
    });
  }

  /* [DOM-4] render history chips */
  renderSidePanelHistory();
});

/* ================================================= */
/* [AUTH-LOGOUT] Logout System */
/* ================================================= */
function logout() {
  if (confirm("আপনি কি সত্যিই Logout করতে চান?")) {
    localStorage.removeItem("mediahub_logged_in");
    localStorage.removeItem("mediahub_user");
    localStorage.removeItem("mediahub_role");
    localStorage.removeItem("mediahub_remember");
    window.location.href = "login.html";
  }
}

/* ================================================= */
/* [IF-1] Load iframe page into content area */
/* ================================================= */
function loadIframePage() {
  const container = document.getElementById("content");
  container.innerHTML = `
    <div style="width:100%; background:#fff; padding:15px; border-radius:12px;">
      <iframe 
        src="https://bgbmediabd.com/login"
        width="500%"
        height="700"
        style="border:none; border-radius:12px;">
      </iframe>
    </div>
  `;
}
function loadIframePage() {
window.open("https://bgbmediabd.com/login", "_blank");
}

/* ================================================= */
/* [THEME] DARK/LIGHT THEME TOGGLE (localStorage) */
/* ================================================= */
function applyTheme(mode) {
  document.body.classList.remove("dark-theme", "light-theme");

  if (mode === "light") {
    document.body.classList.add("light-theme");
    const btn = document.getElementById("themeToggleBtn");
    if (btn) btn.innerText = "☀️ Light";
  } else {
    document.body.classList.add("dark-theme");
    const btn = document.getElementById("themeToggleBtn");
    if (btn) btn.innerText = "🌙 Dark";
  }

  localStorage.setItem("mediahub_theme", mode);
}

function toggleTheme() {
  const current = localStorage.getItem("mediahub_theme") || "dark";
  const next = current === "dark" ? "light" : "dark";
  applyTheme(next);
}

/* ✅ auto apply saved theme on load */
document.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem("mediahub_theme") || "dark";
  applyTheme(saved);
});
/* ================================================= */
/* [LANG] Language Toggle (BN ⇆ EN) */
/* ================================================= */

const LANG_KEY = "mediahub_lang";

/* ✅ Translation Dictionary */
const TEXTS = {
  bn: {
    menu: "মেনু",
    newspaper: "নিউজপেপার",
    facebook: "ফেসবুক",
    propagandist: "প্রবাগান্ডিস্ট",
    youtube: "ইউটিউব",
    talkshow: "টকশো",
    transcriber: "🎙️ Transcriber",
    media: "Media",
    search: "Search...",
    logout: "🔒 Logout",
    empty: "উপরের মেনু থেকে একটি নির্বাচন করুন",
    langBtn: "বাংলা"
  },
  en: {
    menu: "Menu",
    newspaper: "Newspaper",
    facebook: "Facebook",
    propagandist: "Propagandist",
    youtube: "YouTube",
    talkshow: "Talkshow",
    transcriber: "🎙️ Transcriber",
    media: "Media",
    search: "Search...",
    logout: "🔒 Logout",
    empty: "Select an option from the menu above",
    langBtn: "English"
  }
};

/* ✅ Apply language text */
function applyLang(lang) {
  const t = TEXTS[lang] || TEXTS.bn;

  /* Menu Items */
  document.getElementById("nav-menu").innerText = t.menu;
  document.getElementById("nav-newspaper").childNodes[0].nodeValue = t.newspaper;

  document.getElementById("nav-facebook").innerText = t.facebook;
  document.getElementById("nav-propagandist").innerText = t.propagandist;
  document.getElementById("nav-youtube").innerText = t.youtube;
  document.getElementById("nav-talkshow").innerText = t.talkshow;

  /* Search placeholder */
  const search = document.getElementById("searchInput");
  if (search) search.placeholder = t.search;

  /* Logout */
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) logoutBtn.innerText = t.logout;

  /* Empty Message */
  const content = document.getElementById("content");
  if (content && content.querySelector("p")) {
    content.querySelector("p").innerText = t.empty;
  }

  /* Language button text */
  const langBtn = document.getElementById("langToggleBtn");
  if (langBtn) langBtn.innerText = lang === "bn" ? "English" : "বাংলা";

  localStorage.setItem(LANG_KEY, lang);
}

/* ✅ Toggle function */
function toggleLang() {
  const current = localStorage.getItem(LANG_KEY) || "bn";
  const next = current === "bn" ? "en" : "bn";
  applyLang(next);
}

/* ✅ Auto apply saved language on load */
document.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem(LANG_KEY) || "bn";
  applyLang(saved);
});

/* ================================================= */
/* [M-AUTO] Mobile only: newspaper dropdown + submenu + auto hide */
/* ✅ FIX: stopPropagation removed so inline onclick can fire */
/* ================================================= */
(function () {
  let autoHideTimer = null;

  function isMobile() {
    return window.matchMedia("(max-width: 768px)").matches;
  }

  function closeAllMobileMenus() {
    const top = document.getElementById("nav-newspaper");
    if (top) top.classList.remove("open");
    document.querySelectorAll("#nav-newspaper .dropdown-sub.open").forEach((s) => s.classList.remove("open"));
  }

  function scheduleAutoHide(ms = 2500) {
    if (autoHideTimer) clearTimeout(autoHideTimer);
    autoHideTimer = setTimeout(() => {
      if (!isMobile()) return;
      closeAllMobileMenus();
    }, ms);
  }

  // ✅ Capture phase থাকবে, কিন্তু stopPropagation দেব না
  document.addEventListener(
    "click",
    (e) => {
      if (!isMobile()) return;

      const top = e.target.closest("#nav-newspaper");

      // বাইরে ক্লিক করলে বন্ধ
      if (!top) {
        closeAllMobileMenus();
        return;
      }

      // ভেতরে ক্লিক হলে dropdown open রাখো
      top.classList.add("open");

      // বাংলাদেশ/ইন্ডিয়া parentSub টাচ করলে submenu toggle করো
      const parentSub = e.target.closest("#nav-newspaper .dropdown-sub");
      if (parentSub) {
        // অন্য সব submenu বন্ধ
        top.querySelectorAll(".dropdown-sub.open").forEach((x) => {
          if (x !== parentSub) x.classList.remove("open");
        });

        // বর্তমানটা toggle
        parentSub.classList.toggle("open");

        // ✅ inline onclick (loadNewspaperFilter...) চলতে দাও
        scheduleAutoHide(2500);
        return;
      }

      // submenu item এ টাচ করলে শুধু টাইমার দাও (inline onclick চলবে)
      const subItem = e.target.closest("#nav-newspaper .dropdown-menu-sub li");
      if (subItem) {
        scheduleAutoHide(2500);
        return;
      }

      // শুধু "নিউজপেপার" টেক্সট/এরিয়ায় ট্যাপ
      scheduleAutoHide(2500);
    },
    true
  );

  // dropdown এর ভিতরে touch করলে timer reset
  document.addEventListener(
    "touchstart",
    (e) => {
      if (!isMobile()) return;
      if (e.target.closest("#nav-newspaper")) scheduleAutoHide(2500);
    },
    { passive: true }
  );
})();



