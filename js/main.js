'use strict';
/* ============================================================
   Groef — gedrag: navigatie, acties, luisteren, scannen
   ============================================================ */

const haptic = (ms = 12) => { try { navigator.vibrate?.(ms); } catch { } };
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

/* ---------- sheets + Android-terugknop ---------- */
const sheets = [];
const onClose = {
  listen: () => stopListening(),
  adder: () => stopScan(),
  detail: () => { ui.highlightTrack = null; },
};
function openSheet(id) {
  if (sheets.includes(id)) return;
  sheets.push(id); const el = $('#' + id);
  el.style.zIndex = String(50 + sheets.length); el.classList.add('open');
  history.pushState({ sheet: id }, '');
}
function closeSheet() { if (sheets.length) history.back(); }
window.addEventListener('popstate', () => {
  const id = sheets.pop(); if (!id) return;
  $('#' + id).classList.remove('open'); onClose[id]?.(); render();
});

function setTab(tab) {
  ui.tab = tab;
  $$('.view').forEach(v => v.classList.toggle('active', v.id === 'v-' + tab));
  $$('#tabbar .tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  $('#views').scrollTop = 0; window.scrollTo(0, 0);
  render();
  if (tab === 'tips' && !state.tips && owned().length >= 2 && !ui.tipsBusy) buildTips();
}

function openAlbum(al, track) {
  ui.detail = al; ui.pane = 'tracks'; ui.highlightTrack = track || null;
  renderDetail(); $('#detail-body').scrollTop = 0; openSheet('detail');
  if (al.status === 'preview' && (!(al.tracks || []).length || !al.desc)) enrich(al, { persist: false });
  if (track) setTimeout(() => $('#detail .trk.hl')?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 450);
}

/* ---------- zoeken (online) ---------- */
let adderSeq = 0;
const runAdderSearch = debounce(async () => {
  const q = $('#adder-q').value.trim(); const seq = ++adderSeq;
  if (q.length < 2) { ui.adderResults = null; ui.adderBusy = false; return renderAdder(); }
  ui.adderBusy = true; renderAdder();
  try { const res = await itunes.searchAlbums(q); if (seq !== adderSeq) return; ui.adderResults = res; }
  catch (e) { if (seq !== adderSeq) return; ui.adderResults = null; toast([403, 429].includes(e.status) ? 'Even te veel zoekopdrachten — wacht een paar tellen' : 'Zoeken lukt nu niet — controleer je internetverbinding'); }
  ui.adderBusy = false; renderAdder();
}, 550);

let songSeq = 0;
const runSongSearch = debounce(async () => {
  const q = $('#nummer-q').value.trim(); const seq = ++songSeq;
  if (q.length < 2) { ui.songResults = null; ui.songBusy = false; return renderNummer(); }
  ui.songBusy = true; renderNummer();
  try { const res = await itunes.searchSongs(q); if (seq !== songSeq) return; ui.songResults = res; }
  catch { if (seq !== songSeq) return; ui.songResults = []; }
  ui.songBusy = false; renderNummer();
}, 450);

/* ---------- voorbeeldkast ---------- */
// Vaste iTunes-album-id's (NL-winkel) voor een fictieve, goed gevulde kast
const DEMO_KAST = [1065973699, 594061854, 268443092, 1441164426, 1565391787, 1440856219, 617154241, 316620284, 1880517855,
  580708175, 1440788438, 1538081586, 1039796877, 6781023399, 635770200, 269572838, 1746833068, 1625213430, 1440783617, 1097861387,
  1440713018, 310730204, 1440812661, 324127933, 747087657, 726157248, 300948043, 1492263092, 1015739190, 574050396, 1443155637,
  1440653096, 81668043, 1443827338, 286035429, 151178566, 316351910];
const DEMO_WENS = [1065973975, 1706428459, 724466069, 1675375084];
const DEMO_NOTES = ['Gevonden op de platenbeurs in Utrecht.', '', 'Van mijn vader gekregen — zijn naam staat nog op de binnenhoes.', 'Tweedehands gekocht, hoes heeft een kleine vouw.', '',
  'Record Store Day-aankoop.', 'Licht kraakje aan het begin van kant B.', '', 'Rommelmarkt op Koningsdag — voor een paar euro!', 'Verjaardagscadeau.', '', 'Draai ik bijna elke zondagochtend.'];
const DEMO_WENS_NOTES = ['Liefst een vroege persing.', 'Niet meer dan € 25 voor betalen.', 'Gezien in de bak bij de platenzaak om de hoek.', ''];
function demoDetails(al, i) {   // verzonnen gegevens zodat de kast er 'geleefd' uitziet
  al.demo = true; al.addedAt = Date.now() - i * 19 * 86400000 - i * 5400000;
  if (al.status === 'collection') {
    al.my = {
      rating: [5, 4, 5, 4, 3, 5, 4][i % 7],
      condition: ['Near Mint (NM)', 'Very Good Plus (VG+)', 'Very Good (VG)', 'Mint (M)', 'Very Good Plus (VG+)'][i % 5],
      pressing: ['Originele persing', 'Heruitgave, 180 gram', 'Nederlandse persing', '', 'Heruitgave, gekleurd vinyl', 'Duitse persing'][i % 6],
      bought: new Date(al.addedAt).toISOString().slice(0, 10),
      price: ['12,50', '24,99', '5,00', '32,00', '18,00', '8,00', '27,50', '15,00', '21,95'][i % 9],
      notes: DEMO_NOTES[i % DEMO_NOTES.length],
    };
  } else { al.prio = [3, 2, 3, 1][i % 4]; (al.my ||= {}).notes = DEMO_WENS_NOTES[i % DEMO_WENS_NOTES.length]; }
}
async function loadDemo() {
  if (ui.demoBusy) return; ui.demoBusy = true;
  if (sheets.includes('settings')) closeSheet();
  toast('Voorbeeldkast wordt gevuld — een ogenblik…', 4000); let n = 0;
  const all = [...DEMO_KAST.map(id => [id, 'collection']), ...DEMO_WENS.map(id => [id, 'wishlist'])];
  try {
    for (let i = 0; i < all.length; i += 5) {
      const chunk = all.slice(i, i + 5);
      try {
        const d = await jget(`https://itunes.apple.com/lookup?id=${chunk.map(c => c[0]).join(',')}&entity=song&country=NL&limit=200`);
        chunk.forEach(([id, status], j) => {
          const head = d.results.find(r => r.wrapperType === 'collection' && r.collectionId === id); if (!head) return;
          const a = mapAlbum(head); a.tracks = tracksFrom(d.results.filter(r => r.collectionId === id), a.artist);
          const r = addAlbum(a, status); if (!r.added) return;
          demoDetails(r.album, i + j); n++;
        });
        save(); render();
      } catch { }
      await sleep(700);
    }
  } finally { ui.demoBusy = false; }
  state.tips = null; save(); render();
  toast(n ? `${n} voorbeeldplaten toegevoegd — veel bladerplezier!` : 'Voorbeeldkast laden is niet gelukt — probeer het zo nog eens');
}

/* ---------- luisteren (Shazam-functie) ---------- */
const listen = { stream: null, rec: null, raf: 0, busy: false, analyser: null };
function setListenStatus(t) { $('#listen-status').textContent = t; }
function stopListening() {
  cancelAnimationFrame(listen.raf); listen.raf = 0;
  try { if (listen.rec && listen.rec.state !== 'inactive') { listen.rec.onstop = null; listen.rec.stop(); } } catch { }
  listen.stream?.getTracks().forEach(t => t.stop()); listen.stream = null; listen.busy = false;
  $('#listen').classList.remove('listening', 'thinking');
  const c = $('#viz'); c.getContext('2d').clearRect(0, 0, c.width, c.height);
}
function drawViz() {
  const c = $('#viz'), x = c.getContext('2d'), an = listen.analyser; if (!an) return;
  const data = new Uint8Array(an.frequencyBinCount); an.getByteFrequencyData(data);
  const W = c.width, cx = W / 2, R = W * 0.31, N = 72; x.clearRect(0, 0, W, W);
  for (let i = 0; i < N; i++) {
    const v = data[Math.floor((i < N / 2 ? i : N - i) * (data.length * 0.55) / (N / 2))] / 255;
    const a = (i / N) * Math.PI * 2 - Math.PI / 2, len = 10 + v * W * 0.16;
    x.strokeStyle = `hsla(${28 - v * 18}, 100%, ${55 + v * 12}%, ${0.35 + v * 0.65})`; x.lineWidth = 7; x.lineCap = 'round';
    x.beginPath(); x.moveTo(cx + Math.cos(a) * R, cx + Math.sin(a) * R); x.lineTo(cx + Math.cos(a) * (R + len), cx + Math.sin(a) * (R + len)); x.stroke();
  }
  listen.raf = requestAnimationFrame(drawViz);
}
async function startListening() {
  if (listen.busy) return;
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { setListenStatus('Dit toestel of deze browser ondersteunt geen microfoonopname.'); return; }
  $('#listen-result').innerHTML = ''; listen.busy = true;
  if (player.playing) togglePlay();
  try {
    listen.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
  } catch { listen.busy = false; setListenStatus('Geen toegang tot de microfoon. Sta de microfoon toe en probeer het opnieuw.'); return; }
  haptic(20);
  const ctx = getCtx(); await ctx.resume?.();
  const src = ctx.createMediaStreamSource(listen.stream); listen.analyser = ctx.createAnalyser(); listen.analyser.fftSize = 256; src.connect(listen.analyser);
  $('#listen').classList.add('listening'); drawViz();
  const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find(m => MediaRecorder.isTypeSupported(m));
  const chunks = []; const rec = listen.rec = new MediaRecorder(listen.stream, mime ? { mimeType: mime } : undefined);
  rec.ondataavailable = e => e.data.size && chunks.push(e.data);
  rec.onstop = async () => {
    const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
    listen.stream?.getTracks().forEach(t => t.stop()); cancelAnimationFrame(listen.raf);
    $('#listen').classList.remove('listening'); $('#listen').classList.add('thinking'); setListenStatus('Even zoeken in de platenbakken…');
    try { await showRecognition(await recognize(blob)); }
    catch (e) {
      const tokenIssue = [900, 901, 902].includes(+e.code);
      setListenStatus(tokenIssue ? 'De herkenningsdienst vraagt om een (gratis) AudD-token.' : 'Herkennen is niet gelukt. Probeer het nog eens.');
      if (tokenIssue) $('#listen-result').innerHTML = `<div class="nores"><p>Vraag een gratis token aan en plak het bij Instellingen. Daarna herkent Groef muziek met één tik.</p><button class="btn" data-act="open-settings">${icon('gear')}<span>Naar instellingen</span></button></div>`;
    }
    $('#listen').classList.remove('thinking'); listen.busy = false;
  };
  rec.start();
  let left = 8; setListenStatus(`Ik luister… ${left}`);
  const tick = setInterval(() => {
    if (rec.state === 'inactive') return clearInterval(tick);
    left--; if (left <= 0) { clearInterval(tick); rec.stop(); } else setListenStatus(`Ik luister… ${left}`);
  }, 1000);
}
async function showRecognition(r) {
  if (!r) { setListenStatus('Niet herkend. Houd je telefoon dichter bij de muziek en probeer het opnieuw.'); return; }
  haptic([20, 60, 30]);
  setListenStatus('Gevonden!');
  const hit = findOwnedByTrack(r.artist, r.title);
  let al = hit?.album || null;
  if (!al) {
    try {
      const songs = await itunes.searchSongs(`${r.artist} ${r.title}`, 12);
      const pick = (r.album && songs.find(s => norm(cleanTitle(s.collectionName)) === norm(cleanTitle(r.album)))) || songs.find(s => norm(s.artistName).includes(norm(r.artist)) || norm(r.artist).includes(norm(s.artistName))) || songs[0];
      if (pick) { const cand = mapAlbum({ ...pick, artistName: pick.collectionArtistName || pick.artistName }); al = findStored(cand) || cand; }
    } catch { }
  }
  if (!al) al = { artist: r.artist, title: cleanTitle(r.album || r.title), year: r.release_date ? +r.release_date.slice(0, 4) : null, status: 'preview', cover: '', thumb: '' };
  const k = al.id || reg(al); const inKast = al.status === 'collection';
  $('#listen-result').innerHTML = `
    <div class="found ${inKast ? 'owned' : ''}">
      <img src="${coverSrc(al, true)}" alt="">
      <div class="found-t">
        <p class="eyebrow">${inKast ? 'Deze staat in je kast!' : al.status === 'wishlist' ? 'Staat op je verlanglijst' : 'Dit nummer hoort bij'}</p>
        <b>${esc(cleanTrack(r.title))}</b><small>${esc(r.artist)}</small>
        <span class="found-album">${icon('crate')}${esc(al.title)}${yearOf(al) ? ` · ${yearOf(al)}` : ''}</span>
      </div>
    </div>
    <div class="d-actions">
      <button class="btn primary" data-act="open-album" data-key="${esc(k)}" data-track="${esc(cleanTrack(r.title))}">${icon('crate')}<span>${inKast ? 'Pak de plaat erbij' : 'Bekijk het album'}</span></button>
      ${al.status === 'preview' ? `<button class="btn" data-act="add" data-status="wishlist" data-key="${esc(k)}">${icon('heart')}<span>Verlanglijst</span></button>` : ''}
    </div>
    ${spLink(r.spotify?.external_urls?.spotify || `https://open.spotify.com/search/${enc(`${r.artist} ${r.title}`)}/tracks`, 'Open in Spotify', 'btn spotify wide')}`;
}

/* ---------- barcode scannen ---------- */
const scan = { stream: null, timer: 0 };
function stopScan() {
  clearInterval(scan.timer); scan.stream?.getTracks().forEach(t => t.stop()); scan.stream = null;
  $('#scanner').hidden = true;
}
async function startScan() {
  if (!('BarcodeDetector' in window)) { toast('Barcode scannen wordt op dit toestel niet ondersteund'); return; }
  try { scan.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }); }
  catch { toast('Geen toegang tot de camera'); return; }
  const v = $('#scan-video'); v.srcObject = scan.stream; await v.play().catch(() => { }); $('#scanner').hidden = false;
  const det = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
  scan.timer = setInterval(async () => {
    try {
      const codes = await det.detect(v); if (!codes.length) return;
      const code = codes[0].rawValue; stopScan(); haptic(30); toast(`Barcode ${code} — plaat opzoeken…`);
      const d = await mb(`release/?query=${enc('barcode:' + code)}&limit=3`);
      const rel = d.releases?.[0];
      if (!rel) { toast('Deze barcode is niet bekend. Zoek de plaat op naam.'); return; }
      $('#adder-q').value = `${rel['artist-credit']?.[0]?.name || ''} ${rel.title}`.trim(); runAdderSearch();
    } catch { }
  }, 350);
}

/* ---------- acties ---------- */
const actions = {
  tab: el => setTab(el.dataset.tab),
  'close-sheet': () => closeSheet(),
  'open-settings': () => { renderSettings(); openSheet('settings'); },
  'open-adder': el => {
    ui.addStatus = el.dataset.status || 'collection'; ui.adderResults = null; $('#adder-q').value = ''; $('#manual').hidden = true;
    $('#scan-btn').hidden = !('BarcodeDetector' in window);
    renderAdder(); openSheet('adder'); setTimeout(() => $('#adder-q').focus(), 350);
  },
  'search-online': () => { actions['open-adder']({ dataset: { status: 'collection' } }); $('#adder-q').value = ui.q; runAdderSearch(); },
  'manual-toggle': () => { const f = $('#manual'); f.hidden = !f.hidden; if (!f.hidden) f.artist.focus(); },
  'scan-start': () => startScan(),
  'scan-stop': () => stopScan(),
  'open-listen': () => { $('#listen-result').innerHTML = ''; setListenStatus('Tik op de plaat en houd je telefoon bij de muziek'); openSheet('listen'); },
  'listen-start': () => startListening(),
  'open-album': el => { const al = getAl(el.dataset.key); if (al) { haptic(); openAlbum(al, el.dataset.track); } },
  'crate-tap': el => {
    const i = +el.dataset.i;
    if (i === ui.crateIndex) { const al = getAl(el.dataset.key); if (al) { haptic(); openAlbum(al); } }
    else el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  },
  shuffle: () => {
    const crate = $('#crate'); if (!crate || crate.children.length < 2) return;
    let i; do { i = Math.floor(Math.random() * crate.children.length); } while (i === ui.crateIndex);
    haptic(25); crate.children[i].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    const al = ui.crateList[i]; setTimeout(() => { if (ui.tab === 'kast' && !sheets.length) openAlbum(al); }, 1100);
  },
  genre: el => { ui.genre = el.dataset.genre; renderKast(); },
  pane: el => { ui.pane = el.dataset.pane; renderDetail(); },
  add: el => {
    const src = getAl(el.dataset.key); if (!src) return; const status = el.dataset.status;
    const r = addAlbum(src, status); haptic(18);
    if (r.exists) toast(r.album.status === 'collection' ? 'Deze plaat staat al in je kast' : 'Deze plaat staat al op je verlanglijst');
    else toast(r.moved ? `“${r.album.title}” verhuisd naar je kast` : status === 'collection' ? `“${r.album.title}” staat in je kast` : `“${r.album.title}” staat op je verlanglijst`);
    if (ui.detail === src) { ui.detail = r.album; renderDetail(); }
    if (player.album === src) player.album = r.album;
    render(); if ($('#adder').classList.contains('open')) renderAdder();
  },
  found: el => {
    const al = getAl(el.dataset.key); if (!al) return;
    al.status = 'collection'; al.addedAt = Date.now(); save(); haptic([15, 40, 25]);
    toast(`Gefeliciteerd! “${al.title}” staat nu in je kast`); render(); if (ui.detail === al) renderDetail();
  },
  remove: () => {
    const al = ui.detail; if (!al) return;
    if (!confirm(`“${al.title}” verwijderen uit je ${al.status === 'collection' ? 'kast' : 'verlanglijst'}?`)) return;
    state.albums = state.albums.filter(a => a !== al); if (player.album === al) { stopPlayer(); player.album = null; player.idx = -1; renderMini(); }
    save(); closeSheet(); toast('Verwijderd');
  },
  prio: el => { const al = getAl(el.dataset.key); if (!al) return; const n = +el.dataset.n; al.prio = al.prio === n ? n - 1 : n; save(); render(); if (ui.detail === al) renderDetail(); },
  rate: el => { const al = ui.detail; if (!al) return; const n = +el.dataset.n; al.my.rating = al.my.rating === n ? n - 1 : n; save(); renderDetail(); },
  'cover-photo': () => $('#cover-file').click(),
  'play-album': () => {
    const al = ui.detail; if (!al) return; haptic();
    if (player.album === al && player.idx >= 0) togglePlay();
    else { const i = (al.tracks || []).findIndex(t => t.preview); if (i >= 0) { playTrack(al, i); renderDeck(); openSheet('deck'); } }
  },
  'play-track': el => { const al = ui.detail; if (!al) return; haptic(); playTrack(al, +el.dataset.i); },
  'toggle-play': () => { haptic(); togglePlay(); },
  next: () => stepTrack(1),
  prev: () => stepTrack(-1),
  stop: () => { stopPlayer(); player.album = null; player.idx = -1; refreshPlayer(); },
  'open-deck': () => { renderDeck(); openSheet('deck'); },
  'deck-album': () => {
    const al = player.album; if (!al) return;
    if (sheets.includes('detail') && ui.detail === al) closeSheet(); else if (!sheets.includes('detail')) openAlbum(al);
  },
  'tips-refresh': () => buildTips(),
  'tip-dismiss': el => { const al = getAl(el.dataset.key); if (!al) return; state.dismissed.push(keyOf(al)); save(); renderTips(); },
  'share-wishlist': async () => {
    const list = wished(); if (!list.length) return toast('Je verlanglijst is nog leeg');
    const text = 'Mijn LP-verlanglijst:\n' + list.sort((a, b) => (b.prio || 0) - (a.prio || 0)).map(a => `• ${a.artist} – ${a.title}${yearOf(a) ? ` (${yearOf(a)})` : ''}`).join('\n');
    try { if (navigator.share) await navigator.share({ title: 'Mijn LP-verlanglijst', text }); else { await navigator.clipboard.writeText(text); toast('Verlanglijst gekopieerd'); } } catch { }
  },
  demo: () => loadDemo(),
  'demo-remove': () => {
    const n = state.albums.filter(a => a.demo).length; if (!n) return;
    if (!confirm(`${n} voorbeeldplaten verwijderen? Platen die je zelf hebt toegevoegd blijven staan.`)) return;
    if (player.album?.demo) actions.stop();
    state.albums = state.albums.filter(a => !a.demo); state.tips = null; save(); renderSettings(); render(); toast('Voorbeeldplaten verwijderd');
  },
  export: () => {
    const blob = new Blob([JSON.stringify({ app: 'groef', version: 1, exportedAt: new Date().toISOString(), ...state }, null, 1)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `groef-platenkast-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  },
  import: () => $('#import-file').click(),
  wipe: () => {
    if (!confirm('Weet je het zeker? Je hele kast en verlanglijst worden van dit toestel gewist.')) return;
    stopPlayer(); player.album = null; player.idx = -1; applyState({ settings: state.settings }); save(); renderMini(); closeSheet(); toast('Alles is gewist');
  },
};

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const link = e.target.closest('a[href]'); if (link && el.contains(link) && link !== el) return;   // Spotify-links binnen een rij
  if (el.disabled) return;
  actions[el.dataset.act]?.(el, e);
});

document.addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.input === 'kast-q') { ui.q = t.value.trim(); renderKast(); }
  else if (t.dataset.input === 'nummer-q') { renderNummer(); runSongSearch(); }
  else if (t.dataset.input === 'adder-q') { runAdderSearch(); }
  else if (t.dataset.my && ui.detail) { (ui.detail.my ||= {})[t.dataset.my] = t.value; save(); }
  else if (t.dataset.setting && t.type !== 'checkbox') { state.settings[t.dataset.setting] = t.value; save(); }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.change === 'sort') { ui.sort = t.value; renderKast(); }
  else if (t.dataset.setting && t.type === 'checkbox') { state.settings[t.dataset.setting] = t.checked; save(); }
  else if (t.id === 'import-file' && t.files[0]) {
    t.files[0].text().then(txt => {
      const d = JSON.parse(txt); if (!Array.isArray(d.albums)) throw new Error('geen albums');
      if (!confirm(`Reservekopie met ${d.albums.length} platen terugzetten? Je huidige gegevens worden vervangen.`)) return;
      applyState(d); save(); render(); renderSettings(); toast('Reservekopie teruggezet');
    }).catch(() => toast('Dit bestand is geen geldige Groef-reservekopie')).finally(() => { t.value = ''; });
  }
  else if (t.id === 'cover-file' && t.files[0] && ui.detail) {
    const al = ui.detail; const im = new Image(); const url = URL.createObjectURL(t.files[0]);
    im.onload = () => {
      const s = Math.min(im.width, im.height), c = document.createElement('canvas'); c.width = c.height = 600;
      c.getContext('2d').drawImage(im, (im.width - s) / 2, (im.height - s) / 2, s, s, 0, 0, 600, 600);
      al.cover = al.thumb = c.toDataURL('image/jpeg', 0.82); URL.revokeObjectURL(url);
      extractColor(al.cover).then(col => { al.color = col; }).catch(() => { }).finally(() => { save(); renderDetail(); render(); });
    };
    im.src = url; t.value = '';
  }
});
document.addEventListener('submit', e => {
  if (e.target.dataset.form !== 'manual') return; e.preventDefault();
  const f = e.target; const src = { artist: f.artist.value.trim(), title: f.title.value.trim(), year: +f.year.value || null };
  if (!src.artist || !src.title) return;
  const r = addAlbum(src, ui.addStatus);
  toast(r.exists ? 'Deze plaat had je al' : `“${src.title}” toegevoegd — gegevens worden opgezocht`); f.reset(); f.hidden = true; render();
});
// kapotte hoesafbeeldingen vervangen
document.addEventListener('error', e => {
  const t = e.target; if (t.tagName === 'IMG' && !t.dataset.fb) { t.dataset.fb = '1'; t.src = PLACEHOLDER; }
}, true);

/* ---------- audio ---------- */
function wireAudio() {
  const a = $('#audio');
  a.addEventListener('timeupdate', updateDeckProgress);
  a.addEventListener('ended', () => stepTrack(1));
  a.addEventListener('pause', () => { if (player.playing && !a.ended) { player.playing = false; refreshPlayer(); } });
  a.addEventListener('play', () => { if (!player.playing) { player.playing = true; refreshPlayer(); } });
  a.addEventListener('error', () => { if (player.album) { toast('Dit voorproefje kan niet worden afgespeeld'); stepTrack(1); } });
  if ('mediaSession' in navigator) {
    navigator.mediaSession.setActionHandler('play', togglePlay); navigator.mediaSession.setActionHandler('pause', togglePlay);
    navigator.mediaSession.setActionHandler('nexttrack', () => stepTrack(1)); navigator.mediaSession.setActionHandler('previoustrack', () => stepTrack(-1));
  }
}

/* ---------- start ---------- */
(async function init() {
  $$('[data-ic]').forEach(el => { el.outerHTML = icon(el.dataset.ic); });
  await loadState();
  wireAudio(); render();
  // verrijking afmaken die eerder is onderbroken
  state.albums.filter(a => (!(a.tracks || []).length && a.itunesId) || !a.desc).slice(0, 12).forEach(a => enrich(a));
  state.albums.filter(a => !a.mb).slice(0, 25).forEach(a => mbEnrich(a).then(() => { save(); if (ui.detail === a) refreshAlbum(a); }).catch(() => { }));
  const actie = new URLSearchParams(location.search).get('actie');
  if (actie === 'luister') actions['open-listen'](); else if (actie === 'toevoegen') actions['open-adder']({ dataset: { status: 'collection' } });
  window.addEventListener('resize', layoutCrate);
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => { });
})();
