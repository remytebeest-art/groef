'use strict';
/* ============================================================
   Groef — weergave: alle schermen en sheets
   ============================================================ */

const PLACEHOLDER = 'data:image/svg+xml,' + enc(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="#231d1a"/><circle cx="100" cy="100" r="70" fill="#0d0b0a"/><circle cx="100" cy="100" r="54" fill="none" stroke="#2a2420" stroke-width="2"/><circle cx="100" cy="100" r="40" fill="none" stroke="#2a2420" stroke-width="2"/><circle cx="100" cy="100" r="22" fill="#ff9d2e"/><circle cx="100" cy="100" r="4" fill="#0d0b0a"/></svg>`);
const coverSrc = (al, big) => esc((big ? al.cover || al.thumb : al.thumb || al.cover) || PLACEHOLDER);
const spLink = (href, label, cls = 'btn spotify') => `<a class="${cls}" href="${esc(href)}" target="_blank" rel="noopener">${icon('spotify')}${label ? `<span>${label}</span>` : ''}</a>`;

function toast(msg, ms = 2800) {
  const el = document.createElement('div'); el.className = 'toast'; el.textContent = msg;
  $('#toasts').append(el);
  setTimeout(() => el.classList.add('out'), ms); setTimeout(() => el.remove(), ms + 400);
}

function render() {
  ({ kast: renderKast, nummer: renderNummer, wens: renderWens, tips: renderTips })[ui.tab]();
}
function refreshAlbum(al) {
  render();
  if (ui.detail === al && $('#detail').classList.contains('open')) {
    const act = document.activeElement;
    if (!(act && $('#detail').contains(act) && /INPUT|TEXTAREA|SELECT/.test(act.tagName))) renderDetail();
  }
}
function refreshPlayer() {
  renderMini();
  if ($('#deck').classList.contains('open')) renderDeck();
  if ($('#detail').classList.contains('open')) {
    $('#detail .stage')?.classList.toggle('is-playing', player.playing && player.album === ui.detail);
    $$('#detail .trk').forEach(el => el.classList.toggle('on', player.album === ui.detail && +el.dataset.i === player.idx));
    const b = $('#detail [data-act="play-album"] span');
    if (b) b.textContent = player.playing && player.album === ui.detail ? 'Pauzeer' : 'Draai plaat';
  }
}

/* ---------------- KAST ---------------- */
function kastList() {
  const nq = norm(ui.q);
  let list = owned().map(a => {
    if (!nq) return { a };
    if (norm(`${a.artist} ${a.title} ${a.genre} ${yearOf(a) || ''}`).includes(nq)) return { a };
    const t = (a.tracks || []).find(t => norm(t.title).includes(nq));
    return t ? { a, t } : null;
  }).filter(Boolean);
  if (ui.genre) list = list.filter(x => x.a.genre === ui.genre);
  const by = {
    added: (x, y) => y.a.addedAt - x.a.addedAt,
    artist: (x, y) => norm(x.a.artist).localeCompare(norm(y.a.artist)) || (yearOf(x.a) || 0) - (yearOf(y.a) || 0),
    year: (x, y) => (yearOf(x.a) || 9999) - (yearOf(y.a) || 9999),
    title: (x, y) => norm(x.a.title).localeCompare(norm(y.a.title)),
  }[ui.sort];
  return list.sort(by);
}

function renderKast() {
  const body = $('#kast-body'); const all = owned();
  $('#v-kast .searchbar').hidden = !all.length;
  if (!all.length) {
    body.innerHTML = `
      <div class="empty-hero">
        <div class="hero-vinyl"><div class="vinyl spin"><div class="vinyl-label hero-label"><span>33⅓</span></div></div></div>
        <h2>Je platenkast is nog leeg</h2>
        <p>Voeg je eerste LP toe. Groef zoekt de hoes, alle nummers, het verhaal achter de plaat en de weg naar Spotify er vanzelf bij.</p>
        <button class="btn primary" data-act="open-adder" data-status="collection">${icon('plus')}<span>Eerste plaat toevoegen</span></button>
        <button class="btn ghost" data-act="demo">${icon('sparkles')}<span>Laat eerst een voorbeeldkast zien</span></button>
      </div>`;
    return;
  }
  const list = kastList();
  const prof = tasteProfile();
  const genres = prof.genres.slice(0, 6).map(g => g[0]);
  const keepScroll = $('#crate')?.scrollLeft;
  ui.crateList = list.map(x => x.a);
  body.innerHTML = `
    <p class="kast-stats"><b>${nf(prof.n)}</b> ${prof.n === 1 ? 'plaat' : 'platen'} · <b>${nf(prof.tracks)}</b> nummers · <b>${fmtLong(prof.ms)}</b> muziek</p>
    ${list.length ? `
    <div class="crate-wrap">
      <div class="crate" id="crate">
        ${list.map((x, i) => `<button class="crate-item" data-act="crate-tap" data-i="${i}" data-key="${x.a.id}" aria-label="${esc(x.a.title)}"><img src="${coverSrc(x.a, true)}" alt="" loading="lazy"></button>`).join('')}
      </div>
      <div class="crate-info" id="crate-info"></div>
      <button class="pill shuffle" data-act="shuffle">${icon('shuffle')}Verras me</button>
    </div>` : `
    <div class="nores"><p>Niets in je kast gevonden voor “${esc(ui.q)}”.</p>
      <button class="btn ghost" data-act="search-online">${icon('search')}<span>Zoek deze plaat online</span></button></div>`}
    <div class="toolbar">
      <div class="chips">
        <button class="chip ${!ui.genre ? 'on' : ''}" data-act="genre" data-genre="">Alles</button>
        ${genres.map(g => `<button class="chip ${ui.genre === g ? 'on' : ''}" data-act="genre" data-genre="${esc(g)}">${esc(g)}</button>`).join('')}
      </div>
      <select class="sort" data-change="sort" aria-label="Sorteren">
        ${[['added', 'Nieuwste eerst'], ['artist', 'Artiest A–Z'], ['year', 'Jaar'], ['title', 'Titel A–Z']].map(([v, l]) => `<option value="${v}" ${ui.sort === v ? 'selected' : ''}>${l}</option>`).join('')}
      </select>
    </div>
    <div class="grid">
      ${list.map(x => `
        <button class="card" data-act="open-album" data-key="${x.a.id}" ${x.t ? `data-track="${esc(x.t.title)}"` : ''}>
          <span class="card-cover"><img src="${coverSrc(x.a)}" alt="" loading="lazy">${x.a.loading ? '<span class="card-load"></span>' : ''}</span>
          <b>${esc(x.a.title)}</b>
          <small>${esc(x.a.artist)}${yearOf(x.a) ? ` · ${yearOf(x.a)}` : ''}</small>
          ${x.t ? `<small class="hit">${icon('music')}${esc(x.t.title)}</small>` : ''}
        </button>`).join('')}
    </div>`;
  const crate = $('#crate');
  if (crate) {
    crate.addEventListener('scroll', onCrateScroll, { passive: true });
    if (keepScroll) crate.scrollLeft = keepScroll;
    layoutCrate();
  }
}
let crateRaf = 0;
function onCrateScroll() { if (!crateRaf) crateRaf = requestAnimationFrame(() => { crateRaf = 0; layoutCrate(); }); }
function layoutCrate() {
  const crate = $('#crate'); if (!crate) return;
  const mid = crate.scrollLeft + crate.clientWidth / 2; const items = crate.children; let best = 0, bestD = Infinity;
  for (let i = 0; i < items.length; i++) {
    const it = items[i]; const d = (it.offsetLeft + it.offsetWidth / 2 - mid) / it.offsetWidth; const ad = Math.abs(d);
    if (ad < bestD) { bestD = ad; best = i; }
    if (ad > 7) { it.style.visibility = 'hidden'; continue; }
    it.style.visibility = '';
    const k = clamp(d, -1, 1);
    it.style.transform = `translateX(${k * 46}px) translateZ(${-Math.abs(k) * 110}px) rotateY(${k * -58}deg)`;
    it.style.zIndex = String(100 - Math.round(ad * 4));
    it.classList.toggle('center', ad < 0.5);
  }
  if (ui.crateIndex !== best || !$('#crate-info').firstChild) {
    ui.crateIndex = best; const a = ui.crateList[best]; if (!a) return;
    $('#crate-info').innerHTML = `<b>${esc(a.title)}</b><span>${esc(a.artist)}${yearOf(a) ? ` · ${yearOf(a)}` : ''}</span>`;
  }
}

/* ---------------- NUMMER -> ALBUM ---------------- */
function songRow({ thumb, track, sub, key, badge, trackName, quick }) {
  return `<div class="row" data-act="open-album" data-key="${esc(key)}" data-track="${esc(trackName)}">
    <img src="${esc(thumb || PLACEHOLDER)}" alt="" loading="lazy">
    <div class="row-t"><b>${esc(track)}</b><small>${sub}</small>${badge || ''}</div>
    ${quick || icon('right', 'dim')}
  </div>`;
}
function renderNummer() {
  const body = $('#nummer-body'); const q = $('#nummer-q').value.trim();
  if (q.length < 2) {
    body.innerHTML = `
      <div class="hint-card">
        <div class="hint-disc"><div class="vinyl spin slow"><div class="vinyl-label hero-label"><span>?</span></div></div></div>
        <p>Hoor je een nummer en wil je weten welke plaat je uit de kast moet trekken? Typ de titel hierboven — of laat Groef meeluisteren.</p>
        <button class="btn primary" data-act="open-listen">${icon('wave')}<span>Luister mee</span></button>
      </div>`;
    return;
  }
  const local = localSongMatches(q);
  const localHtml = local.length ? `<h3 class="sec">In jouw ${local.some(m => m.album.status === 'collection') ? 'kast' : 'verlanglijst'}</h3>` + local.map(m => songRow({
    thumb: m.album.thumb || m.album.cover, track: m.track.title, trackName: m.track.title, key: m.album.id,
    sub: `${esc(m.album.title)} · ${esc(m.album.artist)}`,
    badge: m.album.status === 'collection' ? `<span class="badge ok">${icon('check')}In je kast</span>` : `<span class="badge wish">${icon('heart')}Op je verlanglijst</span>`,
  })).join('') : '';
  let online = '';
  if (ui.songBusy) online = `<div class="loading-row"><span class="spinner"></span>Zoeken op internet…</div>`;
  else if (ui.songResults) {
    const seen = new Set(local.map(m => m.album.id + '|' + norm(m.track.title)));
    const rows = [];
    for (const r of ui.songResults) {
      const al = mapAlbum({ ...r, artistName: r.collectionArtistName || r.artistName });
      const stored = findStored(al); const k = (stored?.id || keyOf(al)) + '|' + norm(cleanTrack(r.trackName));
      if (seen.has(k)) continue; seen.add(k);
      rows.push(songRow({
        thumb: al.thumb, track: cleanTrack(r.trackName), trackName: cleanTrack(r.trackName), key: stored ? stored.id : reg(al),
        sub: `${icon('crate')} ${esc(al.title)} · ${esc(r.artistName)}${al.year ? ` · ${al.year}` : ''}`,
        badge: stored ? (stored.status === 'collection' ? `<span class="badge ok">${icon('check')}In je kast</span>` : `<span class="badge wish">${icon('heart')}Op je verlanglijst</span>`) : '',
        quick: stored ? '' : `<button class="iconbtn sm" data-act="add" data-status="wishlist" data-key="${esc(reg(al))}" aria-label="Op verlanglijst">${icon('heart')}</button>`,
      }));
      if (rows.length >= 25) break;
    }
    online = rows.length ? `<h3 class="sec">Gevonden op internet</h3>${rows.join('')}` : (local.length ? '' : `<div class="nores"><p>Geen nummers gevonden voor “${esc(q)}”.</p></div>`);
  }
  body.innerHTML = localHtml + online;
}

/* ---------------- VERLANGLIJST ---------------- */
function renderWens() {
  const body = $('#wens-body'); const list = wished().sort((a, b) => (b.prio || 0) - (a.prio || 0) || b.addedAt - a.addedAt);
  if (!list.length) {
    body.innerHTML = `<div class="hint-card">
      <div class="hint-ic">${icon('heart')}</div>
      <p>Hier bewaar je de platen die je nog wilt hebben. Handig in de platenzaak — en je kunt de lijst delen als iemand een cadeau zoekt.</p>
      <button class="btn primary" data-act="open-adder" data-status="wishlist">${icon('plus')}<span>Eerste wens toevoegen</span></button>
    </div>`;
    return;
  }
  body.innerHTML = `<p class="kast-stats"><b>${list.length}</b> ${list.length === 1 ? 'plaat' : 'platen'} op je lijst</p>` + list.map(a => `
    <div class="wish" data-act="open-album" data-key="${a.id}">
      <img src="${coverSrc(a)}" alt="" loading="lazy">
      <div class="wish-t">
        <b>${esc(a.title)}</b><small>${esc(a.artist)}${yearOf(a) ? ` · ${yearOf(a)}` : ''}</small>
        <div class="wish-a">
          <div class="prio" aria-label="Prioriteit">${[1, 2, 3].map(n => `<button class="${(a.prio || 0) >= n ? 'on' : ''}" data-act="prio" data-key="${a.id}" data-n="${n}" aria-label="Prioriteit ${n}">${icon('flame')}</button>`).join('')}</div>
          ${spLink(spotifyAlbumUrl(a), '', 'iconbtn sm sp')}
          <button class="pill accent sm" data-act="found" data-key="${a.id}">${icon('check')}Gevonden!</button>
        </div>
      </div>
    </div>`).join('');
}

/* ---------------- VOOR JOU ---------------- */
function renderTips() {
  const body = $('#tips-body'); const prof = tasteProfile();
  if (!prof) {
    body.innerHTML = `<div class="hint-card"><div class="hint-ic">${icon('sparkles')}</div>
      <p>Zodra er platen in je kast staan, leert Groef je smaak kennen en stelt het albums voor die erbij passen.</p>
      <button class="btn primary" data-act="open-adder" data-status="collection">${icon('plus')}<span>Plaat toevoegen</span></button></div>`;
    return;
  }
  const maxG = prof.genres[0]?.[1] || 1;
  const decs = [...prof.decades].sort((a, b) => a[0] - b[0]); const maxD = Math.max(...decs.map(d => d[1]), 1);
  const dna = `
    <div class="dna">
      <p class="eyebrow">Jouw muzikale DNA</p>
      <h2>${esc(prof.name)}</h2>
      <div class="dna-stats">
        <div><b>${nf(prof.n)}</b><span>platen</span></div>
        <div><b>${nf(prof.artists.length)}</b><span>artiesten</span></div>
        <div><b>${nf(Math.round(prof.ms / 3600000 * 10) / 10)}</b><span>uur muziek</span></div>
        ${prof.oldest ? `<div><b>${prof.oldest}</b><span>oudste plaat</span></div>` : ''}
      </div>
      <div class="bars">
        ${prof.genres.slice(0, 5).map(([g, n]) => `<div class="bar"><span>${esc(g)}</span><i><u style="width:${Math.round(n / maxG * 100)}%"></u></i><em>${Math.round(n / prof.n * 100)}%</em></div>`).join('')}
      </div>
      ${decs.length > 1 ? `<div class="decades">${decs.map(([d, n]) => `<div><i style="height:${Math.max(8, Math.round(n / maxD * 100))}%"><em>${n}</em></i><span>’${String(d).slice(2)}</span></div>`).join('')}</div>` : ''}
      ${prof.artists[0] ? `<p class="dna-foot">Vaakst in je kast: <b>${prof.artists.slice(0, 3).map(a => esc(a[0])).join('</b>, <b>')}</b></p>` : ''}
    </div>`;
  let tips = '';
  if (ui.tipsBusy) tips = `<div class="tips-busy"><div class="vinyl spin mini"><div class="vinyl-label hero-label"></div></div><p>${esc(ui.tipsStep || 'Tips zoeken…')}</p></div>`;
  else if (state.tips?.items?.length) {
    const gone = new Set(state.dismissed);
    const items = state.tips.items.filter(t => !findStored(t) && !gone.has(keyOf(t)));
    tips = items.length ? items.map(t => {
      const k = reg({ ...t, status: 'preview' });
      return `<div class="tip" data-act="open-album" data-key="${esc(k)}">
        <img src="${esc(t.cover || t.thumb || PLACEHOLDER)}" alt="" loading="lazy">
        <div class="tip-t">
          <span class="reason">${icon(t.kind === 'missing' ? 'crate' : 'sparkles')}${esc(t.reason)}</span>
          <b>${esc(t.title)}</b><small>${esc(t.artist)}${t.year ? ` · ${t.year}` : ''}${t.genre ? ` · ${esc(t.genre)}` : ''}</small>
          <div class="tip-a">
            <button class="pill accent sm" data-act="add" data-status="wishlist" data-key="${esc(k)}">${icon('heart')}Wil ik</button>
            ${spLink(spotifyAlbumUrl(t), '', 'iconbtn sm sp')}
            <button class="iconbtn sm" data-act="tip-dismiss" data-key="${esc(k)}" aria-label="Niet voor mij">${icon('x')}</button>
          </div>
        </div>
      </div>`;
    }).join('') : `<div class="nores"><p>Je hebt alle tips verwerkt. Tijd voor een nieuwe ronde!</p></div>`;
  } else if (state.tips) tips = `<div class="nores"><p>Geen tips gevonden. Voeg nog wat platen toe en probeer het opnieuw.</p></div>`;
  else tips = `<div class="nores"><p>Groef vergelijkt je kast met het luistergedrag van duizenden muziekliefhebbers en zoekt platen die bij jouw smaak passen.</p></div>`;
  body.innerHTML = dna + `
    <div class="sec-head"><h3 class="sec">Tips voor jouw kast</h3>
      <button class="pill" data-act="tips-refresh" ${ui.tipsBusy ? 'disabled' : ''}>${icon('refresh')}${state.tips ? 'Nieuwe tips' : 'Zoek tips'}</button></div>
    ${tips}`;
}

/* ---------------- ALBUM-DETAIL ---------------- */
function renderDetail() {
  const al = ui.detail; if (!al) return; const el = $('#detail'); const body = $('#detail-body');
  el.style.setProperty('--tint', (al.color || [255, 157, 46]).join(','));
  const total = totalMs(al); const playingThis = player.album === al && player.playing;
  const meta = [yearOf(al), al.genre, total ? fmtLong(total) : '', (al.tracks || []).length ? `${al.tracks.length} nummers` : ''].filter(Boolean).join(' · ');
  const stored = al.status !== 'preview';
  const panes = stored ? [['tracks', 'Nummers'], ['story', 'Verhaal'], ['my', al.status === 'collection' ? 'Mijn exemplaar' : 'Mijn wens']] : [['tracks', 'Nummers'], ['story', 'Verhaal']];
  if (!panes.some(p => p[0] === ui.pane)) ui.pane = 'tracks';
  const hasPreview = (al.tracks || []).some(t => t.preview);
  const actions = `
    ${al.status === 'preview' ? `<div class="d-actions">
        <button class="btn primary" data-act="add" data-status="collection" data-key="${esc(reg(al))}">${icon('plus')}<span>In mijn kast</span></button>
        <button class="btn" data-act="add" data-status="wishlist" data-key="${esc(reg(al))}">${icon('heart')}<span>Verlanglijst</span></button></div>` : ''}
    ${al.status === 'wishlist' ? `<div class="d-actions"><button class="btn primary" data-act="found" data-key="${al.id}">${icon('check')}<span>Gevonden! Zet in mijn kast</span></button></div>` : ''}
    <div class="d-actions">
      <button class="btn ${al.status === 'collection' ? 'primary' : ''}" data-act="play-album" ${hasPreview ? '' : 'disabled'}>${icon(playingThis ? 'pause' : 'play')}<span>${playingThis ? 'Pauzeer' : 'Draai plaat'}</span></button>
      ${spLink(spotifyAlbumUrl(al), 'Spotify')}
    </div>`;
  let pane = '';
  if (ui.pane === 'tracks') {
    const sides = computeSides(al);
    if (!sides.length) pane = al.loading ? `<div class="skel-list">${'<i></i>'.repeat(7)}</div>` : `<div class="nores"><p>Voor deze plaat is geen tracklist gevonden.</p></div>`;
    else pane = sides.map(s => `
      <div class="side"><h4>Kant ${s.name}</h4><span>${s.ms ? fmtLong(s.ms) : ''}</span></div>
      ${s.tracks.map((t, j) => {
        const i = al.tracks.indexOf(t);
        const hl = ui.highlightTrack && norm(ui.highlightTrack) === norm(t.title);
        return `<div class="trk ${player.album === al && player.idx === i ? 'on' : ''} ${hl ? 'hl' : ''}" data-act="play-track" data-i="${i}">
          <span class="trk-n">${s.name}${j + 1}</span>
          <span class="trk-t">${esc(t.title)}${t.artist ? `<small>${esc(t.artist)}</small>` : ''}</span>
          <span class="trk-d">${fmtMs(t.ms)}</span>
          ${spLink(spotifyTrackUrl(al, t), '', 'trk-sp')}
        </div>`;
      }).join('')}`).join('') + `<p class="fine">Tik op een nummer voor een voorproefje van 30 seconden op de draaitafel; het ${icon('spotify')}-icoon opent het hele nummer in Spotify. De kantindeling is geschat op basis van de speelduur.</p>`;
  } else if (ui.pane === 'story') {
    const d = al.desc; let story;
    if (!d && al.loading) story = `<div class="skel-text"><i></i><i></i><i></i><i></i></div>`;
    else if (d?.text) story = d.text.split(/\n+/).map(p => `<p>${esc(p)}</p>`).join('') +
      `<a class="src" href="${esc(d.url)}" target="_blank" rel="noopener">${icon('info')}Bron: Wikipedia${d.lang === 'en' ? ' (Engelstalig)' : ''} — lees verder</a>`;
    else story = `<p class="dim">Over deze plaat is geen Wikipedia-artikel gevonden. De bijzonderheden hieronder zijn afgeleid uit de plaatgegevens.</p>`;
    const facts = factsOf(al);
    pane = `<div class="story">${story}</div>
      <h4 class="facts-h">Bijzonderheden</h4>
      <div class="facts">${facts.map(f => `<div class="fact"><span class="fact-ic">${icon(f.ic)}</span><div><small>${esc(f.k)}</small><p>${esc(f.t)}</p></div></div>`).join('') || '<p class="dim">Nog geen gegevens.</p>'}</div>`;
  } else {
    const m = al.my || (al.my = {});
    pane = al.status === 'collection' ? `
      <div class="form">
        <label>Mijn waardering<div class="stars">${[1, 2, 3, 4, 5].map(n => `<button class="${(m.rating || 0) >= n ? 'on' : ''}" data-act="rate" data-n="${n}" aria-label="${n} sterren">${icon('star')}</button>`).join('')}</div></label>
        <label>Staat van de plaat
          <select data-my="condition">${['', 'Mint (M)', 'Near Mint (NM)', 'Very Good Plus (VG+)', 'Very Good (VG)', 'Good (G)', 'Fair / Poor'].map(o => `<option ${m.condition === o ? 'selected' : ''} value="${o}">${o || '— kies —'}</option>`).join('')}</select></label>
        <label>Uitvoering / persing<input data-my="pressing" value="${esc(m.pressing)}" placeholder="bv. 1e persing, 180 gram, gekleurd vinyl"></label>
        <div class="form-2">
          <label>Gekocht op<input type="date" data-my="bought" value="${esc(m.bought)}"></label>
          <label>Prijs (€)<input data-my="price" inputmode="decimal" value="${esc(m.price)}" placeholder="0,00"></label>
        </div>
        <label>Notities<textarea data-my="notes" rows="3" placeholder="Waar gevonden, herinneringen, krasje op kant B…">${esc(m.notes)}</textarea></label>
        <button class="btn ghost" data-act="cover-photo">${icon('camera')}<span>Foto van mijn eigen hoes maken</span></button>
        <button class="btn danger" data-act="remove">${icon('trash')}<span>Verwijder uit mijn kast</span></button>
      </div>` : `
      <div class="form">
        <label>Hoe graag wil je 'm?<div class="prio big">${[1, 2, 3].map(n => `<button class="${(al.prio || 0) >= n ? 'on' : ''}" data-act="prio" data-key="${al.id}" data-n="${n}">${icon('flame')}</button>`).join('')}</div></label>
        <label>Notities<textarea data-my="notes" rows="3" placeholder="Gezien bij…, maximale prijs, welke persing…">${esc(m.notes)}</textarea></label>
        <button class="btn danger" data-act="remove">${icon('trash')}<span>Haal van mijn verlanglijst</span></button>
      </div>`;
  }
  const keep = body.scrollTop;
  body.innerHTML = `
    <div class="d-hero">
      <div class="d-bar">
        <button class="iconbtn glass" data-act="close-sheet" aria-label="Terug">${icon('down')}</button>
        <span class="d-status">${al.status === 'collection' ? `${icon('check')}In je kast` : al.status === 'wishlist' ? `${icon('heart')}Verlanglijst` : ''}</span>
        <span class="iconbtn ghost"></span>
      </div>
      <div class="stage ${playingThis ? 'is-playing' : ''}">
        <div class="vinyl"><div class="vinyl-label" style="background-image:url('${coverSrc(al)}')"></div></div>
        <img class="sleeve" src="${coverSrc(al, true)}" alt="Hoes van ${esc(al.title)}">
      </div>
      <h2>${esc(al.title)}</h2>
      <p class="artist">${esc(al.artist)}</p>
      <p class="meta">${esc(meta)}${al.loading ? ' <span class="spinner sm"></span>' : ''}</p>
      ${actions}
    </div>
    <div class="seg">${panes.map(([k, l]) => `<button class="${ui.pane === k ? 'on' : ''}" data-act="pane" data-pane="${k}">${l}</button>`).join('')}</div>
    <div class="d-pane">${pane}</div>`;
  body.scrollTop = keep;
}

/* ---------------- DRAAITAFEL ---------------- */
function armAngle() {
  const al = player.album; if (!al || player.idx < 0) return 0;
  const t = al.tracks[player.idx]; const side = computeSides(al).find(s => s.tracks.includes(t));
  if (!side || !side.ms) return 26;
  let before = 0; for (const x of side.tracks) { if (x === t) break; before += x.ms || 0; }
  const a = $('#audio'); const p = a.duration ? a.currentTime / a.duration : 0;
  return 22 + clamp((before + p * (t.ms || 0)) / side.ms, 0, 1) * 21;
}
function renderDeck() {
  const al = player.album; const body = $('#deck-body'); if (!al) { body.innerHTML = ''; return; }
  const t = al.tracks[player.idx] || {}; const sides = computeSides(al); const side = sides.find(s => s.tracks.includes(t));
  $('#deck').style.setProperty('--tint', (al.color || [255, 157, 46]).join(','));
  body.innerHTML = `
    <header class="sheet-head">
      <button class="iconbtn glass" data-act="close-sheet" aria-label="Sluiten">${icon('down')}</button>
      <h2>Op de draaitafel</h2>
      <span class="iconbtn ghost"></span>
    </header>
    <div class="plinth ${player.playing ? 'is-playing' : ''}">
      <div class="platter">
        <div class="record"><div class="record-label" style="background-image:url('${coverSrc(al)}')"></div></div>
      </div>
      <div class="arm" id="arm" style="--arm:${armAngle()}deg"><span class="arm-weight"></span><span class="arm-rod"></span><span class="arm-head"></span></div>
      <div class="arm-pivot"></div>
      <div class="deck-led"><i></i><span>33⅓</span></div>
    </div>
    <div class="deck-info">
      <p class="eyebrow">${side ? `Kant ${side.name} · nummer ${side.tracks.indexOf(t) + 1}` : ''}</p>
      <h3>${esc(t.title || '')}</h3>
      <button class="deck-album" data-act="deck-album">${esc(t.artist || al.artist)} — ${esc(al.title)}</button>
    </div>
    <div class="deck-prog"><i id="deck-bar"></i></div>
    <p class="fine center">Voorproefje van 30 seconden</p>
    <div class="deck-ctrl">
      <button class="iconbtn lg" data-act="prev" aria-label="Vorige">${icon('prev')}</button>
      <button class="playbtn" data-act="toggle-play" aria-label="Afspelen of pauzeren">${icon(player.playing ? 'pause' : 'play')}</button>
      <button class="iconbtn lg" data-act="next" aria-label="Volgende">${icon('next')}</button>
    </div>
    ${spLink(spotifyTrackUrl(al, t), 'Luister het hele nummer op Spotify', 'btn spotify wide')}`;
  updateDeckProgress();
}
function updateDeckProgress() {
  const a = $('#audio'); const bar = $('#deck-bar'); const arm = $('#arm');
  if (bar) bar.style.width = (a.duration ? (a.currentTime / a.duration) * 100 : 0) + '%';
  if (arm) arm.style.setProperty('--arm', armAngle() + 'deg');
  const mb = $('#mini-bar'); if (mb) mb.style.width = (a.duration ? (a.currentTime / a.duration) * 100 : 0) + '%';
}
function renderMini() {
  const el = $('#mini'); const al = player.album;
  if (!al || player.idx < 0) { el.hidden = true; document.body.classList.remove('has-mini'); return; }
  const t = al.tracks[player.idx] || {};
  el.hidden = false; document.body.classList.add('has-mini');
  el.innerHTML = `<div class="mini-in" data-act="open-deck">
      <span class="mini-disc ${player.playing ? 'spin' : ''}" style="background-image:url('${coverSrc(al)}')"></span>
      <div class="mini-t"><b>${esc(t.title)}</b><small>${esc(t.artist || al.artist)} — ${esc(al.title)}</small></div>
      <button class="iconbtn" data-act="toggle-play" aria-label="Afspelen of pauzeren">${icon(player.playing ? 'pause' : 'play')}</button>
      <button class="iconbtn" data-act="stop" aria-label="Stoppen">${icon('x')}</button>
    </div><div class="mini-prog"><i id="mini-bar"></i></div>`;
}

/* ---------------- TOEVOEGEN ---------------- */
function renderAdder() {
  const body = $('#adder-body'); const q = $('#adder-q').value.trim();
  $('#adder-title').textContent = ui.addStatus === 'wishlist' ? 'Wens toevoegen' : 'Plaat toevoegen';
  if (ui.adderBusy) { body.innerHTML = `<div class="loading-row"><span class="spinner"></span>Zoeken…</div>`; return; }
  if (!ui.adderResults) {
    body.innerHTML = q.length < 2 ? `<p class="fine pad">Typ een artiest of albumtitel. Groef haalt daarna automatisch de hoes, alle nummers en het verhaal achter de plaat op.</p>` : '';
    return;
  }
  if (!ui.adderResults.length) { body.innerHTML = `<div class="nores"><p>Niets gevonden voor “${esc(q)}”. Probeer een andere spelling of voer de plaat handmatig in.</p></div>`; return; }
  body.innerHTML = ui.adderResults.map(a => {
    const st = findStored(a); const k = st ? st.id : reg(a);
    return `<div class="row" data-act="open-album" data-key="${esc(k)}">
      <img src="${esc(a.thumb || PLACEHOLDER)}" alt="" loading="lazy">
      <div class="row-t"><b>${esc(a.title)}</b><small>${esc(a.artist)}${a.year ? ` · ${a.year}` : ''} · ${a.trackCount} nrs</small>
        ${st ? `<span class="badge ${st.status === 'collection' ? 'ok' : 'wish'}">${icon(st.status === 'collection' ? 'check' : 'heart')}${st.status === 'collection' ? 'In je kast' : 'Op je verlanglijst'}</span>` : ''}</div>
      ${st && st.status === 'collection' ? '' : `
        ${st ? '' : `<button class="iconbtn sm" data-act="add" data-status="${ui.addStatus === 'wishlist' ? 'collection' : 'wishlist'}" data-key="${esc(k)}" aria-label="${ui.addStatus === 'wishlist' ? 'In kast' : 'Op verlanglijst'}">${icon(ui.addStatus === 'wishlist' ? 'crate' : 'heart')}</button>`}
        ${st && ui.addStatus === 'wishlist' ? '' : `<button class="iconbtn sm accent" data-act="add" data-status="${ui.addStatus}" data-key="${esc(k)}" aria-label="Toevoegen">${icon('plus')}</button>`}`}
    </div>`;
  }).join('');
}

/* ---------------- INSTELLINGEN ---------------- */
function renderSettings() {
  const s = state.settings;
  $('#settings-body').innerHTML = `
    <header class="sheet-head">
      <button class="iconbtn" data-act="close-sheet" aria-label="Sluiten">${icon('down')}</button>
      <h2>Instellingen</h2><span class="iconbtn ghost"></span>
    </header>
    <div class="form pad">
      <h4 class="facts-h">Muziekherkenning</h4>
      <label>AudD API-token
        <input data-setting="auddToken" value="${esc(s.auddToken)}" placeholder="Plak hier je token" autocomplete="off" autocapitalize="off" spellcheck="false">
      </label>
      <p class="fine">‘Luister mee’ herkent muziek via de dienst AudD. Zonder token kun je een paar keer per dag proberen; met een gratis token van <a href="https://dashboard.audd.io" target="_blank" rel="noopener">dashboard.audd.io</a> werkt het ruimer. Het token wordt alleen op dit toestel bewaard.</p>
      <h4 class="facts-h">Beleving</h4>
      <label class="switch"><span>Naaldgeluid bij het starten van een plaat</span><input type="checkbox" data-setting="crackle" ${s.crackle ? 'checked' : ''}><i></i></label>
      <label>Muziekwinkel-land (voor zoekresultaten)
        <select data-setting="country">${[['NL', 'Nederland'], ['BE', 'België'], ['DE', 'Duitsland'], ['GB', 'Verenigd Koninkrijk'], ['US', 'Verenigde Staten']].map(([v, l]) => `<option value="${v}" ${s.country === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <h4 class="facts-h">Mijn gegevens</h4>
      <p class="fine">Je collectie staat alleen op dit toestel. Maak af en toe een reservekopie.</p>
      ${state.albums.some(a => a.demo)
      ? `<button class="btn" data-act="demo-remove">${icon('trash')}<span>Voorbeeldplaten verwijderen (${state.albums.filter(a => a.demo).length})</span></button>`
      : `<button class="btn" data-act="demo">${icon('sparkles')}<span>Voorbeeldkast laden (41 platen)</span></button>`}
      <button class="btn" data-act="export">${icon('download')}<span>Reservekopie opslaan</span></button>
      <button class="btn" data-act="import">${icon('upload')}<span>Reservekopie terugzetten</span></button>
      <button class="btn danger" data-act="wipe">${icon('trash')}<span>Alles wissen</span></button>
      <p class="fine center">Groef · ${nf(owned().length)} platen in de kast · ${nf(wished().length)} op de verlanglijst<br>Gegevens: iTunes, MusicBrainz, Wikipedia, ListenBrainz, AudD</p>
    </div>`;
}
