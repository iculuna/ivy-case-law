// =====================================================
// IMELD — Ivy Medical Employment Law Database
// =====================================================

// SEED_CASES is injected by the build script — placeholder below
// __SEED_CASES_PLACEHOLDER__

let cases = [];
const STORAGE_KEY = 'ivy_cases';
const BUCKETS = [
  "Wage & Hour",
  "Classification",
  "Leave",
  "Discrimination & Harassment",
  "Accommodation",
  "Hiring",
  "Discipline & Termination",
  "Non-Competes & Restrictive Covenants",
  "Pay Equity & Transparency",
  "Workplace Safety",
  "Healthcare-Specific",
  "Recordkeeping & Posting Requirements",
  "Correctional Medicine"
];
const ENTRY_TYPES = ["Case", "Statute", "Regulation", "Guidance", "Form"];

// Topic → bucket map (mirrors the Python migration so JS can migrate
// old-schema entries from localStorage at load time)
const TOPIC_TO_BUCKET = {
  "Travel Pay": "Wage & Hour",
  "Meal Breaks": "Wage & Hour",
  "Mandatory Overtime": "Wage & Hour",
  "Overtime": "Wage & Hour",
  "Hours Worked": "Wage & Hour",
  "Minimum Wage": "Wage & Hour",
  "Wage Claims": "Wage & Hour",
  "Classification / Exemptions": "Classification",
  "Leave": "Leave",
  "Discrimination": "Discrimination & Harassment",
  "Union / Labor Relations": "Discrimination & Harassment",
  "Confidentiality": "Discrimination & Harassment",
  "Arbitration / Class Actions": "Discrimination & Harassment",
  "Retaliation": "Discrimination & Harassment",
  "Religious Accommodation": "Accommodation",
  "Pregnancy Accommodation": "Accommodation",
  "Termination": "Discipline & Termination",
  "Noncompete": "Non-Competes & Restrictive Covenants",
  "Pay Equity": "Pay Equity & Transparency",
  "Workplace Safety": "Workplace Safety",
  "Staffing Ratios": "Healthcare-Specific",
  "Constitutional Medical Care": "Correctional Medicine",
  "§1983 Liability": "Correctional Medicine",
  "PREA": "Correctional Medicine",
  "Jail Standards": "Correctional Medicine",
  "HIPAA Correctional Carve-Out": "Correctional Medicine",
  "MAT in Custody": "Correctional Medicine"
};

const JURISDICTION_ORDER = ["Federal", "Washington", "Idaho", "Montana"];
const JURISDICTION_FLAGS = {
  "Federal": "🇺🇸",
  "Washington": "🌲",
  "Idaho": "⛰️",
  "Montana": "🦅"
};

// ---------- LOAD / SAVE ----------
function migrateOldEntry(c) {
  // Add v2 fields to entries that lack them (for users with
  // pre-existing localStorage data from the original schema)
  if (!c.bucket) c.bucket = TOPIC_TO_BUCKET[c.topic] || "Wage & Hour";
  if (!c.entryType) {
    const court = (c.court || '').toLowerCase();
    const cite = (c.cite || '').toLowerCase();
    if (court.includes('legislature') || court.includes('congress')) c.entryType = 'Statute';
    else if (court.includes('dept.') || court.includes('department') || court.includes('l&i')) {
      if (cite.includes('cfr') || cite.includes('wac')) c.entryType = 'Regulation';
      else c.entryType = 'Guidance';
    } else if (cite.includes('no state statute') || cite.includes('no prohibition')) {
      c.entryType = 'Statute';
    } else {
      c.entryType = 'Case';
    }
  }
  if (typeof c.favorite !== 'boolean') c.favorite = false;
  if (!c.lastReviewed) c.lastReviewed = 'May 2026';
  return c;
}

function loadCases() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      const storedById = new Map(parsed.map(c => [c.id, migrateOldEntry(c)]));
      // Add any seed entries that aren't in localStorage yet (handles new
      // database builds where the user already has older entries cached).
      // User-modified entries in localStorage are preserved as-is.
      let newCount = 0;
      for (const seedEntry of SEED_CASES) {
        if (!storedById.has(seedEntry.id)) {
          storedById.set(seedEntry.id, {...seedEntry});
          newCount++;
        }
      }
      cases = Array.from(storedById.values());
      if (newCount > 0) {
        console.log(`Added ${newCount} new entries from seed (now ${cases.length} total)`);
        saveCases();
      }
    } catch (e) {
      console.error('Could not parse stored cases, using seed', e);
      cases = SEED_CASES.map(c => ({...c}));
      saveCases();
    }
  } else {
    cases = SEED_CASES.map(c => ({...c}));
    saveCases();
  }
}

function saveCases() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cases));
}

// ---------- VIEW MODE ----------
// VIEW_MODE is injected by the build script. Values:
//   'hr'         — hides Correctional Medicine bucket (for HR team)
//   'compliance' — shows everything (for Isaac / compliance)
// Defaults to 'compliance' when not injected (e.g., local dev).
const VIEW_MODE = (typeof window !== 'undefined' && window.IMELD_VIEW_MODE) || 'compliance';
const HIDDEN_BUCKETS = VIEW_MODE === 'hr' ? new Set(["Correctional Medicine"]) : new Set();

function visibleBuckets() {
  return BUCKETS.filter(b => !HIDDEN_BUCKETS.has(b));
}

function isEntryVisible(entry) {
  return !HIDDEN_BUCKETS.has(entry.bucket);
}

// ---------- STATE ----------
// jurisdiction and bucket are ARRAYS (multi-select). Empty array = all.
let currentFilters = {
  search: '',
  jurisdictions: [],
  buckets: [],
  entryType: '',
  year: '',
  quirky: false,
  favoritesOnly: false
};
let currentDetailId = null;
let currentEditId = null;

// ---------- HIGHLIGHTING & SNIPPETS ----------

// Get the active search terms (lowercase, stemmed alternates included).
function getActiveSearchTerms() {
  if (!currentFilters.search) return [];
  const terms = currentFilters.search.toLowerCase().split(/\s+/).filter(Boolean);
  const expanded = [];
  terms.forEach(t => {
    expanded.push(t);
    const stemmed = stemTerm(t);
    if (stemmed !== t) expanded.push(stemmed);
  });
  // Sort longest first so "termination" matches before "term"
  return [...new Set(expanded)].sort((a, b) => b.length - a.length);
}

// Highlight search terms inside an already-escaped HTML string.
// Returns HTML with <mark> tags wrapped around matches.
function highlightTerms(escapedText, terms) {
  if (!terms || terms.length === 0 || !escapedText) return escapedText;
  // Escape special regex chars in terms
  const pattern = terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const re = new RegExp(`(${pattern})`, 'gi');
  return escapedText.replace(re, '<mark>$1</mark>');
}

// Find the first sentence/fragment containing any search term across all
// the rich fields (holding, application, dos, donts). Returns null if no
// match is found OR if the match is already in the title/holding shown in
// the card. About 140 characters with the match centered.
function findMatchSnippet(c, terms) {
  if (!terms || terms.length === 0) return null;
  // The card already shows the name and a truncated holding; the snippet
  // should reveal a match that isn't visible from those.
  const visibleText = normalizeForSearch((c.name || '') + ' ' + (c.holding || '').slice(0, 240));

  // Try fields in priority order
  const candidates = [
    { label: 'Application', text: c.application },
    { label: 'Holding', text: c.holding },
    { label: "Do's", text: (c.dos || []).map(d => '• ' + d).join(' ') },
    { label: "Don'ts", text: (c.donts || []).map(d => '• ' + d).join(' ') },
    { label: 'Background', text: c.facts },
    { label: 'Reasoning', text: c.reasoning },
  ];

  for (const cand of candidates) {
    if (!cand.text) continue;
    const normalized = normalizeForSearch(cand.text);
    // Find the earliest position of any term
    let earliestPos = -1;
    let earliestTerm = '';
    for (const term of terms) {
      const pos = normalized.indexOf(term);
      if (pos >= 0 && (earliestPos < 0 || pos < earliestPos)) {
        earliestPos = pos;
        earliestTerm = term;
      }
    }
    if (earliestPos < 0) continue;

    // Skip if this match is already visible in the card
    if (visibleText.includes(normalized.slice(Math.max(0, earliestPos - 20), earliestPos + 40))) {
      if (cand.label === 'Holding') continue;
    }

    // Build snippet around the match. Aim for ~140 chars centered on the term.
    const text = cand.text;
    const targetLen = 140;
    const start = Math.max(0, earliestPos - Math.floor(targetLen / 2));
    let snippet = text.slice(start, start + targetLen);
    if (start > 0) snippet = '…' + snippet;
    if (start + targetLen < text.length) snippet = snippet + '…';

    return { label: cand.label, text: snippet };
  }
  return null;
}

// ---------- FILTERING / RENDERING ----------

// Normalize text for fuzzy matching: lowercase, strip trailing 's' on long
// words (handles plurals like "breaks" vs "break"), collapse whitespace.
function normalizeForSearch(text) {
  return (text || '').toString().toLowerCase().replace(/\s+/g, ' ').trim();
}

// Stem a single search term: strip trailing 's' or 'es' on words longer than
// 3 chars. This is a deliberately simple stemmer — handles common plurals
// without false positives on short words ("was", "his", "yes" etc.)
function stemTerm(term) {
  if (term.length <= 3) return term;
  if (term.endsWith('ies') && term.length > 4) return term.slice(0, -3) + 'y';
  if (term.endsWith('es') && term.length > 4) return term.slice(0, -2);
  if (term.endsWith('s')) return term.slice(0, -1);
  return term;
}

// Build the searchable text blob for an entry. Includes EVERYTHING:
// name, cite, holding, facts, reasoning, application, topic, bucket, court,
// jurisdiction, year, dos, donts.
function buildSearchHaystack(c) {
  const parts = [
    c.name, c.cite, c.holding, c.facts, c.reasoning, c.application,
    c.topic, c.bucket, c.court, c.jurisdiction, c.year ? String(c.year) : '',
    (c.dos || []).join(' '), (c.donts || []).join(' ')
  ];
  return normalizeForSearch(parts.filter(Boolean).join(' '));
}

// Multi-word AND search with plural-tolerant matching.
// Returns true if EVERY word in the query appears (with stem-tolerance)
// somewhere in the entry's searchable text.
function searchMatches(query, c) {
  const haystack = buildSearchHaystack(c);
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  return terms.every(term => {
    if (haystack.includes(term)) return true;
    // Try stemmed version as fallback (handles plurals)
    const stemmed = stemTerm(term);
    if (stemmed !== term && haystack.includes(stemmed)) return true;
    return false;
  });
}

function applyFilters(list) {
  return list.filter(c => {
    // First: view-mode gating (HR view hides Correctional Medicine entirely)
    if (!isEntryVisible(c)) return false;

    if (currentFilters.search) {
      if (!searchMatches(currentFilters.search, c)) return false;
    }
    if (currentFilters.jurisdictions.length > 0 && !currentFilters.jurisdictions.includes(c.jurisdiction)) return false;
    if (currentFilters.buckets.length > 0 && !currentFilters.buckets.includes(c.bucket)) return false;
    if (currentFilters.entryType && c.entryType !== currentFilters.entryType) return false;
    if (currentFilters.year && String(c.year) !== currentFilters.year) return false;
    if (currentFilters.quirky && !c.quirky) return false;
    if (currentFilters.favoritesOnly && !c.favorite) return false;
    return true;
  });
}

function sortCases(list) {
  const relOrder = {high: 0, med: 1, low: 2};
  return [...list].sort((a, b) => {
    const ra = relOrder[a.relevance] ?? 3;
    const rb = relOrder[b.relevance] ?? 3;
    if (ra !== rb) return ra - rb;
    return (b.year || 0) - (a.year || 0);
  });
}

function renderCases() {
  const container = document.getElementById('cases-container');
  const filtered = sortCases(applyFilters(cases));
  document.getElementById('stats').textContent =
    `Showing ${filtered.length} of ${cases.length} entries`;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>No entries match your filters</h3>
        <p>Try clearing some filters or adjusting your search.</p>
      </div>`;
    return;
  }

  // Group by jurisdiction (unless filter narrows to a single jurisdiction)
  const isSingleJur = currentFilters.jurisdictions.length === 1;
  if (isSingleJur) {
    container.innerHTML = `<div class="cases-grid">${filtered.map(renderCard).join('')}</div>`;
  } else {
    const grouped = {};
    JURISDICTION_ORDER.forEach(j => grouped[j] = []);
    filtered.forEach(c => {
      const j = grouped[c.jurisdiction] ? c.jurisdiction : 'Federal';
      grouped[j].push(c);
    });
    container.innerHTML = JURISDICTION_ORDER
      .filter(j => grouped[j].length > 0)
      .map(j => `
        <div class="jur-group">
          <div class="jur-header">
            <span class="jur-flag">${JURISDICTION_FLAGS[j]}</span>
            <h2>${j}</h2>
            <span class="jur-count">${grouped[j].length} ${grouped[j].length === 1 ? 'entry' : 'entries'}</span>
          </div>
          <div class="cases-grid">${grouped[j].map(renderCard).join('')}</div>
        </div>
      `).join('');
  }
}

function renderCard(c) {
  const jurClass = c.jurisdiction === 'Federal' ? 'federal' : 'state';
  const terms = getActiveSearchTerms();
  const hasSearch = terms.length > 0;

  // Apply highlighting to escaped fields
  const nameHtml = hasSearch ? highlightTerms(escapeHtml(c.name), terms) : escapeHtml(c.name);
  const holdingHtml = hasSearch
    ? highlightTerms(escapeHtml(truncate(c.holding, 240)), terms)
    : escapeHtml(truncate(c.holding, 240));

  // Snippet preview — only if there's an active search AND a match outside the
  // already-visible name/holding
  let snippetHtml = '';
  if (hasSearch) {
    const snip = findMatchSnippet(c, terms);
    if (snip) {
      const escaped = escapeHtml(snip.text);
      const highlighted = highlightTerms(escaped, terms);
      snippetHtml = `<div class="case-snippet"><span class="snippet-label">${snip.label}:</span> ${highlighted}</div>`;
    }
  }

  return `
    <div class="case-card" onclick="openDetail('${c.id}')">
      <div class="case-header">
        <div class="case-name">${nameHtml}</div>
        <button class="fav-btn ${c.favorite ? 'active' : ''}" onclick="event.stopPropagation(); toggleFavorite('${c.id}')" title="${c.favorite ? 'Remove favorite' : 'Add to favorites'}">★</button>
      </div>
      <div class="case-meta">
        <span class="tag ${jurClass}">${c.jurisdiction}</span>
        <span class="tag entry-${c.entryType}">${c.entryType}</span>
        <span class="tag bucket">${c.bucket}</span>
        ${c.year ? `<span class="tag year">${c.year}</span>` : ''}
        <span class="tag relevance-${c.relevance}">${c.relevance === 'high' ? 'Cornerstone' : c.relevance === 'med' ? 'Important' : 'Reference'}</span>
        ${c.quirky ? '<span class="tag quirky">⚠️ Quirky</span>' : ''}
      </div>
      <div class="case-holding">${holdingHtml}</div>
      ${snippetHtml}
    </div>`;
}

function truncate(s, n) {
  if (!s) return '';
  return s.length > n ? s.substring(0, n) + '…' : s;
}

function escapeHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ---------- DETAIL VIEW ----------
function openDetail(id) {
  const c = cases.find(x => x.id === id);
  if (!c) return;
  currentDetailId = id;
  document.body.classList.add('detail-mode');
  window.scrollTo(0, 0);

  const jurClass = c.jurisdiction === 'Federal' ? 'federal' : 'state';
  const content = document.getElementById('detail-content');
  content.innerHTML = `
    <div class="detail-meta">
      <span class="tag ${jurClass}">${c.jurisdiction}</span>
      <span class="tag entry-${c.entryType}">${c.entryType}</span>
      <span class="tag bucket">${c.bucket}</span>
      ${c.year ? `<span class="tag year">${c.year}</span>` : ''}
      <span class="tag relevance-${c.relevance}">${c.relevance === 'high' ? 'Cornerstone' : c.relevance === 'med' ? 'Important' : 'Reference'}</span>
      ${c.quirky ? '<span class="tag quirky">⚠️ Quirky State Rule</span>' : ''}
      <button class="detail-fav ${c.favorite ? 'active' : ''}" onclick="toggleFavorite('${c.id}'); openDetail('${c.id}');">★ ${c.favorite ? 'Favorited' : 'Favorite'}</button>
    </div>

    ${c.cite ? `<div class="detail-section"><h3>Citation</h3><p>${escapeHtml(c.cite)} — ${escapeHtml(c.court || '')}</p></div>` : ''}

    <div class="detail-section">
      <h3>${c.entryType === 'Case' ? 'Holding' : 'Summary'}</h3>
      <p>${escapeHtml(c.holding)}</p>
    </div>

    ${c.facts ? `<div class="detail-section"><h3>${c.entryType === 'Case' ? 'Facts' : 'Operative Provisions'}</h3><p>${escapeHtml(c.facts)}</p></div>` : ''}

    ${c.reasoning ? `<div class="detail-section"><h3>${c.entryType === 'Case' ? 'Reasoning' : 'Legislative Intent / Background'}</h3><p>${escapeHtml(c.reasoning)}</p></div>` : ''}

    <div class="detail-section application">
      <h3>Application — Ivy Medical Practice</h3>
      <p>${escapeHtml(c.application)}</p>
    </div>

    ${(c.dos && c.dos.length) || (c.donts && c.donts.length) ? `
      <div class="two-col">
        ${c.dos && c.dos.length ? `
          <div class="detail-section">
            <h3 style="color:var(--green);">✓ Do</h3>
            <ul class="checklist dos">${c.dos.map(d => `<li>${escapeHtml(d)}</li>`).join('')}</ul>
          </div>` : ''}
        ${c.donts && c.donts.length ? `
          <div class="detail-section">
            <h3 style="color:var(--red);">✗ Don't</h3>
            <ul class="checklist donts">${c.donts.map(d => `<li>${escapeHtml(d)}</li>`).join('')}</ul>
          </div>` : ''}
      </div>` : ''}

    ${c.relatedCases && c.relatedCases.length ? `
      <div class="detail-section">
        <h3>Related Entries</h3>
        <div class="related-cases">
          ${c.relatedCases.map(rid => {
            const r = cases.find(x => x.id === rid);
            return r ? `<a onclick="openDetail('${r.id}')">${escapeHtml(r.name)}</a>` : '';
          }).join('')}
        </div>
      </div>` : ''}

    <div class="detail-actions">
      <button class="btn btn-ghost" onclick="window.print()">🖨️ Print</button>
      <button class="btn btn-ghost" onclick="openEditModal('${c.id}')">✏️ Edit</button>
      <button class="btn btn-ghost" onclick="confirmDelete('${c.id}')">🗑️ Delete</button>
    </div>

    <p class="last-reviewed">Last reviewed: ${escapeHtml(c.lastReviewed || 'May 2026')}</p>
  `;

  document.getElementById('detail-title').textContent = c.name;
  document.getElementById('detail-subtitle').textContent =
    `${c.bucket} — ${c.entryType}${c.year ? ' (' + c.year + ')' : ''}`;
}

function closeDetail() {
  document.body.classList.remove('detail-mode');
  currentDetailId = null;
}

function toggleFavorite(id) {
  const c = cases.find(x => x.id === id);
  if (!c) return;
  c.favorite = !c.favorite;
  saveCases();
  if (currentDetailId === id) {
    // detail page will re-render via caller
  } else {
    renderCases();
  }
}

function confirmDelete(id) {
  const c = cases.find(x => x.id === id);
  if (!c) return;
  if (confirm(`Delete "${c.name}"? This cannot be undone.`)) {
    cases = cases.filter(x => x.id !== id);
    saveCases();
    closeDetail();
    renderCases();
  }
}

// ---------- COMPARISON VIEW ----------
function openComparison() {
  document.body.classList.add('comparison-mode');
  window.scrollTo(0, 0);
  // Populate the bucket selector (use visibleBuckets so HR view hides
  // Correctional Medicine)
  const sel = document.getElementById('comparison-bucket-select');
  sel.innerHTML = visibleBuckets().map(b => `<option value="${b}">${b}</option>`).join('');
  renderComparison();
}

function closeComparison() {
  document.body.classList.remove('comparison-mode');
}

function renderComparison() {
  const bucket = document.getElementById('comparison-bucket-select').value;
  const inBucket = cases.filter(c => c.bucket === bucket);
  const federal = inBucket.filter(c => c.jurisdiction === 'Federal');
  const states = ['Washington', 'Idaho', 'Montana'];
  const stateMap = {};
  states.forEach(s => stateMap[s] = inBucket.filter(c => c.jurisdiction === s));

  const container = document.getElementById('comparison-content-inner');
  container.innerHTML = `
    ${federal.length > 0 ? `
      <div class="federal-context">
        <h3>🇺🇸 Federal Context (applies to all three states)</h3>
        ${federal.map(c => `
          <div class="fed-entry">
            <div class="fed-name" onclick="openDetail('${c.id}')">${escapeHtml(c.name)}</div>
            <div class="fed-holding">${escapeHtml(truncate(c.holding, 200))}</div>
          </div>
        `).join('')}
      </div>
    ` : ''}

    <div class="comparison-grid">
      ${states.map(s => `
        <div class="comparison-col">
          <div class="comparison-col-header">
            <span>${JURISDICTION_FLAGS[s]}</span>
            <h3>${s}</h3>
            <span class="jur-count">${stateMap[s].length}</span>
          </div>
          ${stateMap[s].length > 0
            ? stateMap[s].map(c => `
                <div class="comparison-entry" onclick="openDetail('${c.id}')">
                  <div class="comp-name">${escapeHtml(c.name)}</div>
                  <div class="comp-holding">${escapeHtml(truncate(c.holding, 150))}</div>
                </div>
              `).join('')
            : `<div class="comp-empty">${federal.length > 0 ? 'Federal default applies — see federal entry above.' : 'No state-specific rule on file.'}</div>`
          }
        </div>
      `).join('')}
    </div>
  `;
}

// ---------- ADD / EDIT MODAL ----------
function openAddModal() {
  currentEditId = null;
  document.getElementById('modal-title').textContent = 'Add Entry';
  document.getElementById('modal-subtitle').textContent = 'Add a new case, statute, regulation, guidance, or form.';
  document.getElementById('form-id').value = '';
  document.getElementById('form-name').value = '';
  document.getElementById('form-year').value = new Date().getFullYear();
  document.getElementById('form-cite').value = '';
  document.getElementById('form-jurisdiction').value = 'Washington';
  document.getElementById('form-court').value = '';
  document.getElementById('form-topic').value = '';
  document.getElementById('form-bucket').value = 'Wage & Hour';
  document.getElementById('form-entryType').value = 'Case';
  document.getElementById('form-relevance').value = 'med';
  document.getElementById('form-quirky').checked = false;
  document.getElementById('form-favorite').checked = false;
  document.getElementById('form-holding').value = '';
  document.getElementById('form-facts').value = '';
  document.getElementById('form-reasoning').value = '';
  document.getElementById('form-application').value = '';
  document.getElementById('form-dos').value = '';
  document.getElementById('form-donts').value = '';
  document.getElementById('form-related').value = '';
  document.getElementById('modal-backdrop').classList.add('show');
}

function openEditModal(id) {
  const c = cases.find(x => x.id === id);
  if (!c) return;
  currentEditId = id;
  document.getElementById('modal-title').textContent = 'Edit Entry';
  document.getElementById('modal-subtitle').textContent = c.name;
  document.getElementById('form-id').value = c.id;
  document.getElementById('form-name').value = c.name || '';
  document.getElementById('form-year').value = c.year || '';
  document.getElementById('form-cite').value = c.cite || '';
  document.getElementById('form-jurisdiction').value = c.jurisdiction || 'Washington';
  document.getElementById('form-court').value = c.court || '';
  document.getElementById('form-topic').value = c.topic || '';
  document.getElementById('form-bucket').value = c.bucket || 'Wage & Hour';
  document.getElementById('form-entryType').value = c.entryType || 'Case';
  document.getElementById('form-relevance').value = c.relevance || 'med';
  document.getElementById('form-quirky').checked = !!c.quirky;
  document.getElementById('form-favorite').checked = !!c.favorite;
  document.getElementById('form-holding').value = c.holding || '';
  document.getElementById('form-facts').value = c.facts || '';
  document.getElementById('form-reasoning').value = c.reasoning || '';
  document.getElementById('form-application').value = c.application || '';
  document.getElementById('form-dos').value = (c.dos || []).join('\n');
  document.getElementById('form-donts').value = (c.donts || []).join('\n');
  document.getElementById('form-related').value = (c.relatedCases || []).join(', ');
  document.getElementById('modal-backdrop').classList.add('show');
}

function closeModal() {
  document.getElementById('modal-backdrop').classList.remove('show');
  currentEditId = null;
}

function saveCase() {
  const id = document.getElementById('form-id').value.trim() ||
    document.getElementById('form-name').value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 50);
  if (!id) {
    alert('Entry name is required.');
    return;
  }
  const entry = {
    id: id,
    name: document.getElementById('form-name').value.trim(),
    year: parseInt(document.getElementById('form-year').value, 10) || new Date().getFullYear(),
    cite: document.getElementById('form-cite').value.trim(),
    jurisdiction: document.getElementById('form-jurisdiction').value,
    court: document.getElementById('form-court').value.trim(),
    topic: document.getElementById('form-topic').value.trim(),
    bucket: document.getElementById('form-bucket').value,
    entryType: document.getElementById('form-entryType').value,
    relevance: document.getElementById('form-relevance').value,
    quirky: document.getElementById('form-quirky').checked,
    favorite: document.getElementById('form-favorite').checked,
    holding: document.getElementById('form-holding').value.trim(),
    facts: document.getElementById('form-facts').value.trim(),
    reasoning: document.getElementById('form-reasoning').value.trim(),
    application: document.getElementById('form-application').value.trim(),
    dos: document.getElementById('form-dos').value.split('\n').map(s => s.trim()).filter(Boolean),
    donts: document.getElementById('form-donts').value.split('\n').map(s => s.trim()).filter(Boolean),
    relatedCases: document.getElementById('form-related').value.split(',').map(s => s.trim()).filter(Boolean),
    lastReviewed: 'May 2026'
  };
  if (!entry.name || !entry.holding) {
    alert('Entry name and holding/summary are required.');
    return;
  }
  if (currentEditId) {
    const idx = cases.findIndex(x => x.id === currentEditId);
    if (idx >= 0) cases[idx] = entry;
  } else {
    if (cases.find(x => x.id === entry.id)) {
      alert(`An entry with id "${entry.id}" already exists. Please choose a different name.`);
      return;
    }
    cases.push(entry);
  }
  saveCases();
  closeModal();
  renderCases();
  if (currentEditId && currentDetailId === currentEditId) {
    openDetail(currentEditId);
  }
}

// ---------- EXPORT / IMPORT ----------
function exportCases() {
  const blob = new Blob([JSON.stringify(cases, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const d = new Date();
  const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  a.download = `imeld-${ymd}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function handleImportFile(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (!Array.isArray(parsed)) {
        alert('Invalid file format: expected a JSON array.');
        return;
      }
      if (!confirm(`Import ${parsed.length} entries? This will REPLACE all current entries.`)) {
        return;
      }
      cases = parsed.map(migrateOldEntry);
      saveCases();
      renderCases();
      alert(`Imported ${cases.length} entries successfully.`);
    } catch (err) {
      alert('Could not parse file: ' + err.message);
    }
    input.value = '';
  };
  reader.readAsText(file);
}

function resetToSeed() {
  if (!confirm('Reset to the original seed entries? This will delete any of your custom additions or edits.')) return;
  cases = SEED_CASES.map(c => ({...c}));
  saveCases();
  renderCases();
}

// ---------- FILTER POPULATION ----------
function populateFilters() {
  // Multi-select jurisdiction pills
  const jurContainer = document.getElementById('filter-jurisdictions-pills');
  if (jurContainer) {
    jurContainer.innerHTML = JURISDICTION_ORDER.map(j =>
      `<button class="ms-pill" data-jur="${j}">${JURISDICTION_FLAGS[j] || ''} ${j}</button>`
    ).join('');
    jurContainer.querySelectorAll('.ms-pill').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const j = btn.dataset.jur;
        const i = currentFilters.jurisdictions.indexOf(j);
        if (i >= 0) currentFilters.jurisdictions.splice(i, 1);
        else currentFilters.jurisdictions.push(j);
        btn.classList.toggle('active');
        renderCases();
      });
    });
  }

  // Multi-select bucket pills
  const buckContainer = document.getElementById('filter-buckets-pills');
  if (buckContainer) {
    buckContainer.innerHTML = visibleBuckets().map(b =>
      `<button class="ms-pill" data-bucket="${b}">${b}</button>`
    ).join('');
    buckContainer.querySelectorAll('.ms-pill').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const b = btn.dataset.bucket;
        const i = currentFilters.buckets.indexOf(b);
        if (i >= 0) currentFilters.buckets.splice(i, 1);
        else currentFilters.buckets.push(b);
        btn.classList.toggle('active');
        renderCases();
      });
    });
  }

  // Entry type dropdown (still single-select)
  const entrySel = document.getElementById('filter-entryType');
  if (entrySel) {
    entrySel.innerHTML = '<option value="">All Types</option>' +
      ENTRY_TYPES.map(t => `<option value="${t}">${t}</option>`).join('');
  }

  // Year dropdown (still single-select)
  const years = [...new Set(cases.filter(isEntryVisible).map(c => c.year).filter(Boolean))].sort((a,b) => b - a);
  const yearSel = document.getElementById('filter-year');
  if (yearSel) {
    yearSel.innerHTML = '<option value="">All Years</option>' +
      years.map(y => `<option value="${y}">${y}</option>`).join('');
  }

  // Add-entry form bucket dropdown (respects view mode)
  const formBucket = document.getElementById('form-bucket');
  if (formBucket) {
    formBucket.innerHTML = visibleBuckets().map(b => `<option>${b}</option>`).join('');
  }
}

// ---------- EVENT WIRING ----------
function wireEvents() {
  document.getElementById('search-input').addEventListener('input', (e) => {
    currentFilters.search = e.target.value;
    renderCases();
  });
  // Multi-select pill handlers are wired in populateFilters() because the
  // pills are created dynamically there.
  document.getElementById('filter-entryType').addEventListener('change', (e) => {
    currentFilters.entryType = e.target.value;
    renderCases();
  });
  document.getElementById('filter-year').addEventListener('change', (e) => {
    currentFilters.year = e.target.value;
    renderCases();
  });
  document.getElementById('pill-quirky').addEventListener('click', (e) => {
    currentFilters.quirky = !currentFilters.quirky;
    e.target.classList.toggle('active', currentFilters.quirky);
    renderCases();
  });
  document.getElementById('pill-favorites').addEventListener('click', (e) => {
    currentFilters.favoritesOnly = !currentFilters.favoritesOnly;
    e.target.classList.toggle('active', currentFilters.favoritesOnly);
    renderCases();
  });
  document.getElementById('pill-clear').addEventListener('click', () => {
    currentFilters = { search: '', jurisdictions: [], buckets: [], entryType: '', year: '', quirky: false, favoritesOnly: false };
    document.getElementById('search-input').value = '';
    document.querySelectorAll('#filter-jurisdictions-pills .ms-pill').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('#filter-buckets-pills .ms-pill').forEach(p => p.classList.remove('active'));
    document.getElementById('filter-entryType').value = '';
    document.getElementById('filter-year').value = '';
    document.getElementById('pill-quirky').classList.remove('active');
    document.getElementById('pill-favorites').classList.remove('active');
    renderCases();
  });
  document.getElementById('btn-add').addEventListener('click', openAddModal);
  document.getElementById('btn-compare').addEventListener('click', openComparison);
  document.getElementById('btn-export').addEventListener('click', exportCases);
  document.getElementById('btn-import').addEventListener('click', () => document.getElementById('import-file').click());
  document.getElementById('import-file').addEventListener('change', (e) => handleImportFile(e.target));
  document.getElementById('btn-reset').addEventListener('click', resetToSeed);
  document.getElementById('comparison-bucket-select').addEventListener('change', renderComparison);
  document.getElementById('btn-back-from-detail').addEventListener('click', closeDetail);
  document.getElementById('btn-back-from-comparison').addEventListener('click', closeComparison);
  document.getElementById('btn-modal-save').addEventListener('click', saveCase);
  document.getElementById('btn-modal-cancel').addEventListener('click', closeModal);
  document.getElementById('modal-backdrop').addEventListener('click', (e) => {
    if (e.target.id === 'modal-backdrop') closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (document.getElementById('modal-backdrop').classList.contains('show')) closeModal();
      else if (document.body.classList.contains('detail-mode')) closeDetail();
      else if (document.body.classList.contains('comparison-mode')) closeComparison();
    }
  });
}

// ---------- INIT ----------
function init() {
  loadCases();
  populateFilters();
  wireEvents();
  renderCases();
}

document.addEventListener('DOMContentLoaded', init);
