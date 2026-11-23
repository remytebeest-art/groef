# Groef — jouw platenkast

Een installeerbare app (PWA) voor Android om je LP-collectie te beheren.

## Wat zit erin
- **Kast** — je collectie als bladerbare platenkrat, met zoeken (album, artiest, nummer), genrefilters en sorteren.
- **Plaat toevoegen** — zoek op naam, scan de barcode op de hoes, of voer handmatig in. Hoes, tracklist, verhaal en bijzonderheden worden automatisch opgezocht.
- **Albumpagina** — hoes met uitschuivende plaat, nummers per kant (A/B), verhaal (Wikipedia), bijzonderheden, en je eigen notities (staat, persing, prijs, waardering, eigen hoesfoto).
- **Draaitafel** — voorproefjes van 30 seconden met draaiende plaat en meelopende arm; elk nummer en album opent met één tik in Spotify.
- **Nummer → album** — typ een nummer en zie op welke plaat het staat (eerst je eigen kast).
- **Luister mee** — herkent muziek via de microfoon (zoals Shazam) en wijst de plaat in je kast aan.
- **Verlanglijst** — met prioriteit, "Gevonden!"-knop en delen.
- **Voor jou** — je muzikale DNA en albumtips op basis van je smaak.

## Op je Android-telefoon zetten
De app moet op een https-adres staan (microfoon, camera en installeren werken alleen via https).
1. Zet de map `groef` online, bv. via Netlify Drop (app.netlify.com/drop), GitHub Pages of Cloudflare Pages.
2. Open het adres in Chrome op je telefoon.
3. Menu (⋮) → **App installeren** / **Toevoegen aan startscherm**.

## Lokaal proberen op de computer
    python3 -m http.server 5173 --directory groef
en open http://localhost:5173

## Goed om te weten
- Je collectie staat alleen op het toestel zelf. Maak reservekopieën via Instellingen.
- Muziekherkenning loopt via AudD; een gratis token (Instellingen) geeft meer herkenningen per dag.
- Gegevensbronnen: iTunes Search, MusicBrainz, Cover Art Archive, Wikipedia, ListenBrainz, AudD.
