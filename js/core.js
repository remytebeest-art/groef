'use strict';
/* ============================================================
   Groef — kern: helpers, opslag, databronnen, verrijking, speler
   ============================================================ */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const enc = encodeURIComponent;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/&/g, ' and ').replace(/^the\s+/, '').replace(/[^a-z0-9]+/g, ' ').trim();
const nf = n => Number(n).toLocaleString('nl-NL');
const fmtMs = ms => { if (!ms) return '–'; const s = Math.round(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const fmtLong = ms => { const m = Math.round(ms / 60000); if (m < 60) return `${m} min`; const h = Math.floor(m / 60); return `${nf(h)} u ${m % 60} min`; };
// iTunes geeft vaak alleen de maand goed door (dag = 1): toon dan geen schijnprecisie
const fmtDate = iso => { try { const d = new Date(iso); return d.toLocaleDateString('nl-NL', d.getUTCDate() === 1 ? { month: 'long', year: 'numeric', timeZone: 'UTC' } : { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }); } catch { return ''; } };
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

const cleanTitle = t => (String(t || '')
  .replace(/\s*[\(\[][^\)\]]*\b(remaster(ed)?|deluxe|edition|version|anniversary|expanded|bonus|mono|stereo|super|legacy|collector'?s?|special|reissue|mix|edit[ie]e?)\b[^\)\]]*[\)\]]/gi, '')
  .replace(/\s+-\s+(\d{4}\s+)?remaster(ed)?(\s+\d{4})?$/i, '')
  .trim()) || String(t || '');
const cleanTrack = t => (String(t || '')
  .replace(/\s*[\(\[][^\)\]]*\bremaster(ed)?\b[^\)\]]*[\)\]]/gi, '')
  .replace(/\s+-\s+(\d{4}\s+)?remaster(ed)?(\s+\d{4})?$/i, '').trim()) || String(t || '');

/* ---------- iconen ---------- */
const ICON = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h0a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
  heart: '<path d="M20.8 5.6a5.5 5.5 0 0 0-7.8 0L12 6.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 22l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"/>',
  sparkles: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z"/>',
  wave: '<path d="M3 12h1M7 8v8M11 4v16M15 7v10M19 10v4M22 12h0"/>',
  music: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
  crate: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.6"/><path d="M12 5.5a6.5 6.5 0 0 1 6.5 6.5"/>',
  play: '<path d="M7 4.5v15l12-7.5-12-7.5Z" fill="currentColor"/>',
  pause: '<path d="M8 5v14M16 5v14" stroke-width="3"/>',
  next: '<path d="M6 5v14l10-7L6 5Z" fill="currentColor"/><path d="M19 5v14"/>',
  prev: '<path d="M18 5v14L8 12l10-7Z" fill="currentColor"/><path d="M5 5v14"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  right: '<path d="m9 6 6 6-6 6"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
  spotify: '<circle cx="12" cy="12" r="10" fill="currentColor" stroke="none"/><path d="M7 9.6c3.6-1 7.3-.7 10.2 1M7.6 12.7c3-.8 5.9-.5 8.4.9M8.3 15.6c2.3-.6 4.4-.4 6.3.7" stroke="#0b0b0b" stroke-width="1.7"/>',
  barcode: '<path d="M4 6v12M7 6v12M11 6v12M14 6v12M17 6v12M20 6v12" stroke-width="1.6"/>',
  pencil: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z"/>',
  check: '<path d="m5 12 5 5L20 7"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4ZM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3"/>',
  zap: '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/>',
  tag: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8Z"/><circle cx="7" cy="7" r="1.2"/>',
  rotate: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
  ruler: '<path d="M3 17 17 3l4 4L7 21l-4-4Z"/><path d="m7 13 2 2M10 10l2 2M13 7l2 2"/>',
  cake: '<path d="M4 21h16M5 21v-7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7M5 16c2 1.5 3 1.5 4.7 0s2.800-1.5 4.600 0 2.700 1.500 4.700 0M12 12V8M12 5.500v0"/>',
  shuffle: '<path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
  upload: '<path d="M12 15V3M7 8l5-5 5 5M4 21h16"/>',
  star: '<path d="m12 3 2.7 5.6 6.1.9-4.400 4.300 1 6.100L12 17l-5.400 2.900 1-6.100L3.200 9.500l6.100-.9L12 3Z"/>',
  flame: '<path d="M12 22a6 6 0 0 0 6-6c0-4-3-5-3-9-3 1-5 4-5 6-1-1-1.500-2-1.500-3C7 11.500 6 13.500 6 16a6 6 0 0 0 6 6Z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.500v0"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4V8Z"/><circle cx="12" cy="13" r="3.500"/>',
  disc2: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18" /><circle cx="12" cy="12" r="2"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 15-6.700L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.700L3 16M3 21v-5h5"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
};
const icon = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n] || ''}</svg>`;

/* ---------- state & opslag ---------- */
const state = {
  albums: [],
  settings: { auddToken: '', country: 'NL', crackle: true },
  tips: null,
  dismissed: [],
};
const ui = {
  tab: 'kast', q: '', sort: 'added', genre: '', detail: null, pane: 'tracks', addStatus: 'collection',
  reg: new Map(), tipsBusy: false, songResults: null, songBusy: false, adderResults: null, adderBusy: false,
  highlightTrack: null, crateIndex: 0,
};

const store = {
  db: null,
  open() {
    return new Promise((res, rej) => {
      const rq = indexedDB.open('groef', 1);
      rq.onupgradeneeded = () => rq.result.createObjectStore('kv');
      rq.onsuccess = () => { this.db = rq.result; res(); };
      rq.onerror = () => rej(rq.error);
    });
  },
  get(k) {
    return new Promise((res, rej) => {
      const rq = this.db.transaction('kv').objectStore('kv').get(k);
      rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error);
    });
  },
  set(k, v) {
    return new Promise((res, rej) => {
      const tx = this.db.transaction('kv', 'readwrite'); tx.objectStore('kv').put(v, k);
      tx.oncomplete = res; tx.onerror = () => rej(tx.error);
    });
  },
};
async function loadState() {
  let data = null;
  try { await store.open(); data = await store.get('state'); } catch { store.db = null; }
  if (!data) { try { data = JSON.parse(localStorage.getItem('groef-state') || 'null'); } catch { } }
  if (data) applyState(data);
}
function applyState(data) {
  state.albums = Array.isArray(data.albums) ? data.albums : [];
  state.settings = { ...state.settings, ...(data.settings || {}) };
  state.tips = data.tips || null;
  state.dismissed = data.dismissed || [];
  state.albums.forEach(a => { delete a.loading; });
}
let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    const snap = JSON.parse(JSON.stringify(state));
    try { if (store.db) await store.set('state', snap); else localStorage.setItem('groef-state', JSON.stringify(snap)); }
    catch (e) { console.warn('Opslaan mislukt', e); }
  }, 250);
}

const owned = () => state.albums.filter(a => a.status === 'collection');
const wished = () => state.albums.filter(a => a.status === 'wishlist');
const keyOf = a => norm(a.artist) + '|' + norm(a.title);
const yearOf = a => a.origYear || a.year || null;
const totalMs = a => (a.tracks || []).reduce((s, t) => s + (t.ms || 0), 0);
const findStored = a => state.albums.find(x => (a.itunesId && x.itunesId === a.itunesId) || keyOf(x) === keyOf(a));
function reg(a) { const k = a.id || ('p:' + (a.itunesId || keyOf(a))); if (!a.id) ui.reg.set(k, a); return k; }
function getAl(k) { return state.albums.find(a => a.id === k) || ui.reg.get(k) || null; }

/* ---------- databronnen ---------- */
async function jget(url, opts) {
  const r = await fetch(url, opts);
  if (!r.ok) { const e = new Error('HTTP ' + r.status); e.status = r.status; throw e; }
  return r.json();
}
const art = (u, s) => (u ? u.replace(/\/\d+x\d+bb\./, `/${s}x${s}bb.`) : '');
const cc = () => state.settings.country || 'NL';

function mapAlbum(r) {
  let title = cleanTitle(r.collectionName);
  const pre = new RegExp('^' + String(r.artistName || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s+[-–:]\\s+', 'i');
  if (r.artistName && pre.test(title) && title.replace(pre, '').length > 1) title = title.replace(pre, '');
  return {
    itunesId: r.collectionId, artistId: r.artistId, artist: r.artistName,
    title, rawTitle: r.collectionName,
    year: r.releaseDate ? +r.releaseDate.slice(0, 4) : null, releaseDate: r.releaseDate || null,
    genre: r.primaryGenreName || '', cover: art(r.artworkUrl100, 600), thumb: art(r.artworkUrl100, 200),
    trackCount: r.trackCount || 0, copyright: r.copyright || '', status: 'preview',
  };
}
const isSingle = r => /\s(-\s)?(single|ep)$/i.test(r.collectionName || '');
const isProperAlbum = r => (r.trackCount || 0) >= 5 && !isSingle(r) &&
  !/(\bhits\b|best of|very best|\blive\b|karaoke|tribute|essential|anthology|collection|singles|box set|playlist|\bgold\b|platinum|remix|the (blue|red) album|\d{4}\s*[-–]\s*\d{4}|^\d+$)/i.test(r.collectionName || '');
const FANCY = /deluxe|anniversary|edition|legacy|super|expanded|bonus|live|remix|drumless/i;
function plainer(a, b) {   // is a een 'gewonere' uitgave dan b?
  const pa = a.rawTitle === a.title, pb = b.rawTitle === b.title;
  if (pa !== pb) return pa;
  return FANCY.test(b.rawTitle || '') && !FANCY.test(a.rawTitle || '');
}
function dedupe(list) {
  const map = new Map();
  for (const a of list) { const k = keyOf(a); const p = map.get(k); if (!p) map.set(k, a); else if (plainer(a, p)) map.set(k, a); }
  return [...map.values()];
}
const JUNK = /(karaoke|tribute|originally performed|in the style of|piano (version|cover)|lullab|8[- ]bit|string quartet|made famous|cover version|performs)/i;
const searchCache = new Map();
function tracksFrom(res, albumArtist) {
  return res.filter(r => r.wrapperType === 'track' && r.kind === 'song')
    .sort((a, b) => (a.discNumber - b.discNumber) || (a.trackNumber - b.trackNumber))
    .map(r => ({
      n: r.trackNumber, disc: r.discNumber || 1, title: cleanTrack(r.trackName), ms: r.trackTimeMillis || 0,
      preview: r.previewUrl || '', artist: r.artistName !== albumArtist ? r.artistName : '',
    }));
}
const itunes = {
  // Albums zoeken: de albumindex van iTunes mist soms bekende platen, daarom ook via nummers zoeken en samenvoegen
  async searchAlbums(q) {
    const key = cc() + '|' + norm(q); if (searchCache.has(key)) return searchCache.get(key);
    const base = `https://itunes.apple.com/search?term=${enc(q)}&media=music&country=${cc()}`;
    const [al, so] = await Promise.allSettled([jget(`${base}&entity=album&limit=40`), jget(`${base}&entity=song&limit=50`)]);
    if (al.status === 'rejected' && so.status === 'rejected') throw al.reason;
    const toks = norm(q).split(' ').filter(Boolean); const pool = new Map(); let pos = 0;
    const put = (a, hits) => {
      if (!a.itunesId || /\s-\s(single|ep)$/i.test(a.rawTitle || '')) return;
      const k = keyOf(a), p = pool.get(k);
      if (!p) pool.set(k, { a, hits, pos: pos++ }); else { p.hits += hits; if (plainer(a, p.a)) p.a = a; }
    };
    const bySong = new Map();
    ((so.value || {}).results || []).filter(r => r.kind === 'song').forEach(r => { const e = bySong.get(r.collectionId) || { r, n: 0 }; e.n++; bySong.set(r.collectionId, e); });
    [...bySong.values()].sort((x, y) => y.n - x.n).forEach(({ r, n }) => put(mapAlbum({ ...r, artistName: r.collectionArtistName || r.artistName }), n));
    ((al.value || {}).results || []).forEach(r => put(mapAlbum(r), 1));
    const out = [...pool.values()].map(p => {
      const hay = ' ' + norm(p.a.artist + ' ' + p.a.title) + ' ';
      const m = toks.filter(t => hay.includes(' ' + t)).length / (toks.length || 1);
      return { a: p.a, score: m + Math.min(p.hits, 8) * 0.03 - (JUNK.test(p.a.rawTitle || '') ? 0.6 : 0) - p.pos * 0.002 };
    }).filter(p => p.score > 0.5).sort((x, y) => y.score - x.score).map(p => p.a).slice(0, 40);
    searchCache.set(key, out); return out;
  },
  async searchAlbumsRaw(q, limit = 12) {
    const d = await jget(`https://itunes.apple.com/search?term=${enc(q)}&entity=album&media=music&country=${cc()}&limit=${limit}`);
    return d.results;
  },
  async searchSongs(q, limit = 40) {
    const d = await jget(`https://itunes.apple.com/search?term=${enc(q)}&entity=song&media=music&country=${cc()}&limit=${limit}`);
    return d.results.filter(r => r.kind === 'song');
  },
  async albumTracks(id) {
    const d = await jget(`https://itunes.apple.com/lookup?id=${id}&entity=song&country=${cc()}&limit=200`);
    return d.results;
  },
  async albumFull(id) {
    const res = await this.albumTracks(id); const head = res.find(r => r.wrapperType === 'collection'); if (!head) return null;
    const a = mapAlbum(head); a.tracks = tracksFrom(res, a.artist); return a;
  },
  async artistAlbums(artistId) {
    const d = await jget(`https://itunes.apple.com/lookup?id=${artistId}&entity=album&country=${cc()}&limit=80`);
    return d.results.filter(r => r.wrapperType === 'collection');
  },
};

// MusicBrainz: maximaal 1 verzoek per seconde
let mbChain = Promise.resolve();
function mb(path) {
  const url = `https://musicbrainz.org/ws/2/${path}${path.includes('?') ? '&' : '?'}fmt=json`;
  const run = async () => {
    for (let i = 0; ; i++) {
      try { return await jget(url); } catch (e) { if (![503, 429].includes(e.status) || i >= 2) throw e; await sleep(2500); }
    }
  };
  const p = mbChain.then(run, run);
  mbChain = p.catch(() => { }).then(() => sleep(1100));
  return p;
}
const lucene = s => String(s).replace(/(["\\])/g, '\\$1');

/* ---------- verrijking van een album ---------- */
async function loadTracks(al) {
  if (!al.itunesId) return;
  const res = await itunes.albumTracks(al.itunesId);
  const head = res.find(r => r.wrapperType === 'collection');
  if (head && !al.copyright) al.copyright = head.copyright || '';
  al.tracks = tracksFrom(res, al.artist);
}

function extractColor(url) {
  return new Promise((res, rej) => {
    const im = new Image(); im.crossOrigin = 'anonymous';
    im.onload = () => {
      try {
        const c = document.createElement('canvas'); c.width = c.height = 32;
        const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0, 32, 32);
        const d = x.getImageData(0, 0, 32, 32).data; let r = 0, g = 0, b = 0, w = 0;
        for (let i = 0; i < d.length; i += 4) {
          const R = d[i], G = d[i + 1], B = d[i + 2], mx = Math.max(R, G, B), mn = Math.min(R, G, B);
          const sat = mx ? (mx - mn) / mx : 0, lum = (R + G + B) / 3;
          const wt = sat * sat * Math.pow(mx / 255, 1.5) * (lum < 235 ? 1 : 0.2) + 0.004;
          r += R * wt; g += G * wt; b += B * wt; w += wt;
        }
        let col = [r / w, g / w, b / w]; const mx = Math.max(...col) || 1;
        if (mx < 190) col = col.map(v => v * (190 / mx));           // zorg dat de tint zichtbaar blijft op donker
        res(col.map(v => Math.round(clamp(v, 0, 255))));
      } catch (e) { rej(e); }
    };
    im.onerror = rej; im.src = url;
  });
}

async function wikiTry(lang, al) {
  const q = `${al.title} ${al.artist} album`;
  const u = `https://${lang}.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${enc(q)}&gsrlimit=5&prop=extracts|info&exintro=1&explaintext=1&exlimit=5&inprop=url&format=json&origin=*`;
  const d = await jget(u);
  const pages = Object.values(d.query?.pages || {}).sort((a, b) => a.index - b.index);
  const na = norm(al.artist), nt = norm(al.title), base = norm(al.title.split(/[:(]|\s[-–]\s/)[0]); const lastWord = na.split(' ').pop();
  let best = null, bestScore = 1;
  for (const p of pages) {
    const ex = (p.extract || '').trim(); if (ex.length < 140) continue;
    const pt = norm(p.title), ne = norm(ex.slice(0, 700));
    const full = pt.includes(nt), partial = !full && base.length >= 4 && base !== nt && pt.includes(base);
    if (!full && !partial) continue;
    if (!ne.includes(na) && !ne.includes(lastWord)) continue;
    let s = partial ? -1 : 0;
    if (/album|soundtrack|elpee/i.test(p.title)) s += 3;
    if (/\b(album|studioalbum|livealbum|elpee|lp|soundtrack|langspeelplaat|plaat)\b/i.test(ex.slice(0, 300))) s += 2;
    if (pt === nt) s += 1;
    if (s > bestScore) { best = p; bestScore = s; }
  }
  if (!best) return null;
  let text = best.extract.trim().replace(/\n{2,}/g, '\n\n');
  if (text.length > 1100) { const cut = text.slice(0, 1100); text = cut.slice(0, Math.max(cut.lastIndexOf('. '), 600) + 1); }
  return { text, url: best.fullurl, lang, page: best.title };
}
async function loadStory(al) {
  let d = null;
  try { d = await wikiTry('nl', al); } catch { }
  if (!d) { try { d = await wikiTry('en', al); } catch { } }
  al.desc = d || { text: '', none: true };
}

const mbBusy = new WeakSet();
async function mbEnrich(al) {
  if (al.mb || mbBusy.has(al)) return; mbBusy.add(al);
  try { await mbEnrichRun(al); } finally { mbBusy.delete(al); }
}
async function mbEnrichRun(al) {
  const q = `releasegroup:"${lucene(al.title)}" AND artist:"${lucene(al.artist)}"`;
  const d = await mb(`release-group/?query=${enc(q)}&limit=3`);
  const rg = (d['release-groups'] || []).find(x => x.score >= 88);
  al.mb = true;
  if (rg) {
    al.mbid = rg.id;
    const y = +(rg['first-release-date'] || '').slice(0, 4);
    if (y && (!al.year || y < al.year)) al.origYear = y;
    al.mbArtistId = rg['artist-credit']?.[0]?.artist?.id || null;
    if (!al.cover) { al.cover = `https://coverartarchive.org/release-group/${rg.id}/front-500`; al.thumb = `https://coverartarchive.org/release-group/${rg.id}/front-250`; }
    if (!(al.tracks || []).length) {
      try {
        const rel = await mb(`release?release-group=${rg.id}&inc=recordings&limit=1`);
        const media = rel.releases?.[0]?.media || [];
        al.tracks = media.flatMap((m, mi) => (m.tracks || []).map(t => ({ n: t.position, disc: mi + 1, title: t.title, ms: t.length || 0, preview: '', artist: '' })));
      } catch { }
    }
  }
}

async function enrich(al, { persist = true } = {}) {
  al.loading = true; refreshAlbum(al);
  const jobs = [];
  if (!(al.tracks || []).length && al.itunesId) jobs.push(loadTracks(al).catch(() => { }));
  if (!al.color && (al.thumb || al.cover) && !String(al.cover).startsWith('data:')) jobs.push(extractColor(al.thumb || al.cover).then(c => { al.color = c; }).catch(() => { }));
  if (!al.desc) jobs.push(loadStory(al).catch(() => { }));
  await Promise.all(jobs);
  delete al.loading;
  if (persist) save();
  refreshAlbum(al);
  if (persist && !al.mb) {
    try {
      await mbEnrich(al);
      if (!al.color && al.thumb) { try { al.color = await extractColor(al.thumb); } catch { } }
      if (!al.desc) await loadStory(al).catch(() => { });
      save(); refreshAlbum(al);
    } catch { }
  }
}

function addAlbum(src, status) {
  const ex = findStored(src);
  if (ex) {
    if (ex.status === 'wishlist' && status === 'collection') { ex.status = 'collection'; ex.addedAt = Date.now(); save(); return { album: ex, moved: true }; }
    return { album: ex, exists: true };
  }
  const al = {
    id: uid(), status, addedAt: Date.now(),
    artist: src.artist, title: src.title, rawTitle: src.rawTitle || src.title, year: src.year || null,
    releaseDate: src.releaseDate || null, genre: src.genre || '', cover: src.cover || '', thumb: src.thumb || src.cover || '',
    itunesId: src.itunesId || null, artistId: src.artistId || null, copyright: src.copyright || '',
    tracks: src.tracks || [], desc: src.desc || null, color: src.color || null,
    my: { condition: '', pressing: '', bought: '', price: '', notes: '', rating: 0 }, prio: 2,
  };
  state.albums.push(al); save();
  enrich(al);
  return { album: al, added: true };
}

/* ---------- vinyl-logica: kanten & weetjes ---------- */
function computeSides(al) {
  const tr = al.tracks || []; if (!tr.length) return [];
  const total = totalMs(al);
  const n = total <= 54 * 60000 ? 2 : total <= 100 * 60000 ? 4 : total <= 150 * 60000 ? 6 : 8;
  if (!total || tr.length < n) return [{ name: 'A', tracks: tr, ms: total }];
  const target = total / n; const sides = []; let cur = [], acc = 0, done = 0;
  tr.forEach((t, i) => {
    const left = tr.length - i, sidesLeft = n - sides.length;
    if (cur.length && sides.length < n - 1 && (acc + (t.ms || 0) / 2 > target || left < sidesLeft)) {
      sides.push(cur); done += acc; cur = []; acc = 0;
    }
    cur.push(t); acc += t.ms || 0;
  });
  if (cur.length) sides.push(cur);
  return sides.map((s, i) => ({ name: String.fromCharCode(65 + i), tracks: s, ms: s.reduce((a, t) => a + (t.ms || 0), 0) }));
}

function factsOf(al) {
  const f = []; const tr = al.tracks || []; const total = totalMs(al); const now = new Date();
  const y = yearOf(al);
  if (y) {
    const age = now.getFullYear() - y;
    const exact = al.releaseDate && +al.releaseDate.slice(0, 4) === y;
    let txt = exact ? `Uitgebracht ${new Date(al.releaseDate).getUTCDate() === 1 ? 'in' : 'op'} ${fmtDate(al.releaseDate)}` : `Oorspronkelijk uitgebracht in ${y}`;
    if (age > 0) txt += ` — ${age} jaar geleden`;
    f.push({ ic: 'calendar', k: 'Verschenen', t: txt });
    if (age > 0 && age % 10 === 0) f.push({ ic: 'cake', k: 'Jubileum', t: `Deze plaat bestaat dit jaar precies ${age} jaar. Reden voor een draaibeurt!` });
    else if (age > 0 && (age + 1) % 10 === 0) f.push({ ic: 'cake', k: 'Bijna jarig', t: `Volgend jaar wordt deze plaat ${age + 1}.` });
  }
  if (tr.length && total) {
    f.push({ ic: 'clock', k: 'Speelduur', t: `${fmtLong(total)} muziek, verdeeld over ${tr.length} nummers (gemiddeld ${fmtMs(total / tr.length)} per nummer)` });
    const withMs = tr.filter(t => t.ms);
    if (withMs.length > 1) {
      const lo = withMs.reduce((a, b) => (b.ms > a.ms ? b : a)), sh = withMs.reduce((a, b) => (b.ms < a.ms ? b : a));
      f.push({ ic: 'trophy', k: 'Langste nummer', t: `“${lo.title}” — ${fmtMs(lo.ms)}` });
      f.push({ ic: 'zap', k: 'Kortste nummer', t: `“${sh.title}” — ${fmtMs(sh.ms)}` });
    }
    const sides = computeSides(al);
    if (sides.length > 1) {
      const lp = sides.length / 2;
      f.push({ ic: 'disc2', k: lp > 1 ? `Waarschijnlijk een ${lp}LP` : 'Twee kanten', t: sides.map(s => `Kant ${s.name} ± ${Math.round(s.ms / 60000)} min`).join(' · ') });
    }
    const turns = Math.round((total / 60000) * 33.333);
    f.push({ ic: 'rotate', k: 'Rondjes', t: `Op 33⅓ toeren draait je draaitafel ongeveer ${nf(turns)} rondjes om deze plaat helemaal af te spelen` });
    f.push({ ic: 'ruler', k: 'Lengte van de groef', t: `De naald legt naar schatting ${nf(Math.round((total / 60000) * 21.7 / 10) * 10)} meter af door de groef` });
  }
  if (al.copyright) f.push({ ic: 'tag', k: 'Label & rechten', t: al.copyright.replace(/^[℗©]\s*/, '') });
  if (al.genre) f.push({ ic: 'music', k: 'Genre', t: al.genre });
  const same = owned().filter(x => x.id !== al.id && norm(x.artist) === norm(al.artist));
  if (same.length) f.push({ ic: 'crate', k: 'In je kast', t: `Je hebt nog ${same.length} andere plaat${same.length > 1 ? 'en' : ''} van ${al.artist}: ${same.slice(0, 3).map(x => x.title).join(', ')}${same.length > 3 ? '…' : ''}` });
  return f;
}

/* ---------- Spotify ---------- */
const spotifyAlbumUrl = al => `https://open.spotify.com/search/${enc(`${al.artist} ${al.title}`)}/albums`;
const spotifyTrackUrl = (al, t) => `https://open.spotify.com/search/${enc(`${t.artist || al.artist} ${t.title}`)}/tracks`;

/* ---------- zoeken in eigen collectie ---------- */
function findOwnedByTrack(artist, title) {
  const nt = norm(cleanTrack(title)), na = norm(artist);
  for (const al of state.albums) {
    const aa = norm(al.artist); if (na && !(aa.includes(na) || na.includes(aa))) continue;
    const i = (al.tracks || []).findIndex(t => norm(t.title) === nt);
    if (i >= 0) return { album: al, index: i };
  }
  return null;
}
function localSongMatches(q) {
  const nq = norm(q); if (nq.length < 2) return [];
  const out = [];
  for (const al of state.albums) (al.tracks || []).forEach((t, i) => { if (norm(t.title).includes(nq)) out.push({ album: al, index: i, track: t }); });
  return out.slice(0, 30);
}

/* ---------- speler ---------- */
const player = { album: null, idx: -1, playing: false };
let audioCtx = null;
const getCtx = () => (audioCtx ||= new (window.AudioContext || window.webkitAudioContext)());
function crackle() {
  if (!state.settings.crackle) return;
  try {
    const ctx = getCtx(); const len = Math.floor(ctx.sampleRate * 1.1); const buf = ctx.createBuffer(1, len, ctx.sampleRate); const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) { d[i] = (Math.random() * 2 - 1) * 0.01; if (Math.random() < 0.0012) d[i] += (Math.random() * 2 - 1) * 0.55; }
    for (let i = 0; i < 900; i++) d[i] += Math.sin(i / 14) * 0.35 * (1 - i / 900);   // de 'plof' van de naald
    const src = ctx.createBufferSource(); src.buffer = buf; const g = ctx.createGain(); g.gain.value = 0.45;
    src.connect(g).connect(ctx.destination); src.start();
  } catch { }
}
function playTrack(al, i, { silent = false } = {}) {
  const tr = al.tracks || []; const t = tr[i]; const audio = $('#audio');
  if (!t) return stopPlayer();
  if (!t.preview) {
    const nx = tr.findIndex((x, j) => j > i && x.preview);
    if (nx < 0) { if (!silent) toast('Geen voorproefje beschikbaar — open het nummer in Spotify'); return; }
    return playTrack(al, nx, { silent });
  }
  const fresh = player.album !== al || !player.playing;
  player.album = al; player.idx = i; player.playing = true;
  if (fresh) crackle();
  audio.src = t.preview; audio.play().catch(() => { player.playing = false; refreshPlayer(); });
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: t.artist || al.artist, album: al.title, artwork: al.cover ? [{ src: al.cover, sizes: '600x600' }] : [] });
  }
  refreshPlayer();
}
function togglePlay() {
  const audio = $('#audio'); if (!player.album) return;
  if (audio.paused) { audio.play(); player.playing = true; } else { audio.pause(); player.playing = false; }
  refreshPlayer();
}
function stepTrack(dir) {
  if (!player.album) return; const tr = player.album.tracks || [];
  let i = player.idx + dir;
  while (i >= 0 && i < tr.length && !tr[i].preview) i += dir;
  if (i < 0 || i >= tr.length) { if (dir > 0) stopPlayer(); return; }
  playTrack(player.album, i, { silent: true });
}
function stopPlayer() { const audio = $('#audio'); audio.pause(); player.playing = false; refreshPlayer(); }

/* ---------- smaakprofiel & tips ---------- */
function tasteProfile() {
  const own = owned(); if (!own.length) return null;
  const count = (fn) => { const m = new Map(); own.forEach(a => { const k = fn(a); if (k) m.set(k, (m.get(k) || 0) + 1); }); return [...m].sort((a, b) => b[1] - a[1]); };
  const genres = count(a => a.genre), artists = count(a => a.artist), decades = count(a => (yearOf(a) ? Math.floor(yearOf(a) / 10) * 10 : null));
  const tracks = own.reduce((s, a) => s + (a.tracks || []).length, 0), ms = own.reduce((s, a) => s + totalMs(a), 0);
  const years = own.map(yearOf).filter(Boolean);
  const decName = { 1940: 'Forties', 1950: 'Fifties', 1960: 'Sixties', 1970: 'Seventies', 1980: 'Eighties', 1990: 'Nineties', 2000: 'Nillies', 2010: 'Tens', 2020: 'Twenties' };
  const level = own.length < 8 ? 'verkenner' : own.length < 40 ? 'liefhebber' : own.length < 120 ? 'fijnproever' : 'archivaris';
  const topDec = decades[0]?.[0], topGenre = genres[0]?.[0];
  const name = [decName[topDec] || '', topGenre ? `${topGenre.toLowerCase()}-${level}` : level].filter(Boolean).join(' ');
  return { n: own.length, genres, artists, decades, tracks, ms, oldest: years.length ? Math.min(...years) : null, newest: years.length ? Math.max(...years) : null, name };
}

async function artistMbid(name) {
  const hit = state.albums.find(a => a.mbArtistId && norm(a.artist) === norm(name));
  if (hit) return hit.mbArtistId;
  const d = await mb(`artist/?query=${enc(`artist:"${lucene(name)}"`)}&limit=1`);
  const a = d.artists?.[0]; return a && a.score >= 85 ? a.id : null;
}

async function buildTips() {
  if (ui.tipsBusy) return; const own = owned(); if (!own.length) return;
  ui.tipsBusy = true; ui.tipsStep = 'Je smaak analyseren…'; renderTips();
  const items = []; const have = new Set(state.albums.map(keyOf)); const gone = new Set(state.dismissed);
  const haveArtists = new Set(own.map(a => norm(a.artist)));
  const ok = a => !have.has(keyOf(a)) && !gone.has(keyOf(a)) && !items.some(x => keyOf(x) === keyOf(a));
  try {
    const prof = tasteProfile();
    const seeds = shuffle(prof.artists.slice(0, 8).map(a => a[0]).filter(n => !/various|verschillende/i.test(n))).slice(0, 4);
    // 1) verwante artiesten via ListenBrainz
    const sim = new Map();
    for (const seed of seeds) {
      ui.tipsStep = `Verwanten van ${seed} zoeken…`; renderTips();
      try {
        const id = await artistMbid(seed); if (!id) continue;
        const list = await jget(`https://labs.api.listenbrainz.org/similar-artists/json?artist_mbids=${id}&algorithm=session_based_days_7500_session_300_contribution_3_threshold_10_limit_100_filter_True_skip_30`);
        const top = list[0]?.score || 1;
        list.slice(0, 30).forEach(x => {
          if (!x.name || haveArtists.has(norm(x.name))) return;
          const p = sim.get(x.name) || { score: 0, seed };
          p.score += x.score / top; sim.set(x.name, p);
        });
      } catch { }
    }
    const ranked = [...sim].sort((a, b) => b[1].score - a[1].score);
    const picks = [...ranked.slice(0, 5), ...shuffle(ranked.slice(5, 22)).slice(0, 7)];
    const myGenres = new Set(prof.genres.map(g => g[0])); const offGenre = [];
    for (const [name, info] of picks) {
      if (items.length >= 8) break;
      ui.tipsStep = `Platen van ${name} bekijken…`; renderTips();
      try {
        const raw = await itunes.searchAlbumsRaw(name, 15);
        const cand = raw.filter(r => norm(r.artistName) === norm(name) && isProperAlbum(r)).map(mapAlbum).find(ok);
        if (cand) {
          const tip = { ...cand, reason: `Omdat je ${info.seed} draait`, kind: 'similar' };
          if (myGenres.has(cand.genre)) items.push(tip); else offGenre.push(tip);   // eerst wat bij je genres past
        }
      } catch { }
      await sleep(350);
    }
    items.push(...offGenre.slice(0, Math.max(0, 6 - items.length)));
    // 2) ontbrekende platen van artiesten die je al hebt
    const favs = prof.artists.slice(0, 6).map(a => own.find(x => x.artist === a[0] && x.artistId)).filter(Boolean);
    for (const f of shuffle(favs).slice(0, 3)) {
      ui.tipsStep = `Wat mist er nog van ${f.artist}?`; renderTips();
      try {
        const raw = await itunes.artistAlbums(f.artistId);
        dedupe(raw.filter(isProperAlbum).map(mapAlbum)).filter(ok).slice(0, 2)
          .forEach(c => items.push({ ...c, reason: `Ontbreekt nog van ${f.artist}`, kind: 'missing' }));
      } catch { }
      await sleep(350);
    }
    state.tips = { at: Date.now(), items: items.map(({ status, ...x }) => x), basis: own.length };
    save();
  } finally { ui.tipsBusy = false; renderTips(); }
}

/* ---------- herkenning (AudD) ---------- */
async function recognize(blob) {
  const fd = new FormData();
  fd.append('file', blob, 'fragment.webm'); fd.append('return', 'apple_music,spotify');
  if (state.settings.auddToken) fd.append('api_token', state.settings.auddToken.trim());
  const r = await fetch('https://api.audd.io/', { method: 'POST', body: fd });
  const d = await r.json();
  if (d.status === 'error') { const e = new Error(d.error?.error_message || 'Herkenning mislukt'); e.code = d.error?.error_code; throw e; }
  return d.result || null;
}
