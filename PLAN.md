# Plan: Tages-App Stufe 1 (Lernprojekt mit Lars)

## Context
Lars lernt programmieren und will Checkliste, Dankbarkeitstagebuch und ToDos aus seiner Notizen-App in eine eigene, rein lokale Handy-App holen. Ordner `Desktop\tages-app` mit Git und CLAUDE.md (Ziel, Regeln, Lernmodus) existiert bereits. Entschieden: **localStorage** als Speicher, **GitHub Pages** für den Weg aufs Handy (nur der Code ist öffentlich, Einträge bleiben auf dem Gerät). Kein Framework, keine Pakete.

## Aufbau (Dateien)
- `index.html` – Grundgerüst, vier Bereiche + untere Tab-Leiste (Heute · Checkliste · Tagebuch · ToDos)
- `style.css` – mobiles Layout, große Tipp-Flächen, heller/dunkler Modus
- `app.js` – Logik, aufgeteilt in klar benannte Abschnitte (Speicher, Datum, je Funktion ein Abschnitt)
- `manifest.json`, `icon-192.png`, `icon-512.png` – für „Zum Homescreen hinzufügen“
- `service-worker.js` – speichert die App-Dateien fürs Offline-Laufen

**Datenmodell in localStorage** (ein Schlüssel pro Bereich, Werte als JSON):
- `checkliste-punkte`: `[{id, name}]`
- `checkliste-tage`: `{ "2026-10-15": ["id1","id3"] }` (abgehakte Punkte je Tag)
- `tagebuch`: `{ "2026-10-15": { dankbar: ["","",""], fuerMich: ["","",""] } }`
- `todos`: `[{id, text, erledigt, faellig}]`

## Schritte (jeder endet mit: im Browser zeigen → testen → committen)
Legende: 🧑‍💻 = Lars schreibt diesen Teil selbst, Claude prüft.

1. **Grundgerüst & lokaler Server** – `index.html` mit Überschrift, `python -m http.server` starten, im Browser ansehen. Erklärung: Was ist HTML, wie hängen HTML/CSS/JS zusammen. 🧑‍💻 Lars schreibt die vier `<section>`-Bereiche.
2. **Tab-Navigation** – untere Leiste, die zwischen den Bereichen umschaltet. Erklärung: Elemente finden, Klick-Ereignisse. 🧑‍💻 Lars schreibt die Funktion `zeigeBereich(name)`.
3. **Speicher-Helfer & Datum** – `laden(schluessel, standard)` / `speichern(schluessel, wert)` mit JSON, `heute()` → `JJJJ-MM-TT`. Erklärung: localStorage, JSON, warum Datum als Text. 🧑‍💻 Lars schreibt `heute()`.
4. **Checkliste anzeigen & abhaken** – Startpunkte Sport/Mahlzeiten/Dehnen, Haken je Tag speichern. Test: Haken setzen, Seite neu laden, Haken noch da. 🧑‍💻 Lars schreibt die Schleife, die die Punkte als Liste ausgibt.
5. **Checkliste bearbeiten** – Punkte hinzufügen, umbenennen, entfernen. 🧑‍💻 Lars schreibt „Entfernen“ (Array filtern).
6. **ToDos** – hinzufügen, abhaken, löschen, optionales Fälligkeitsdatum (`<input type="date">`), Überfälliges markieren. 🧑‍💻 Lars schreibt das Sortieren (offen vor erledigt, nach Datum).
7. **Dankbarkeitstagebuch – heute** – 2×3 Eingabefelder, speichert beim Tippen. 🧑‍💻 Lars schreibt das Speichern eines Feldes.
8. **Tagebuch – ältere Tage** – Datumsauswahl / Liste vergangener Tage, Ansicht nur lesend. 🧑‍💻 Lars schreibt die Liste der vorhandenen Tage (neueste zuerst).
9. **Tagesansicht (Startseite)** – zeigt offene Checklisten-Punkte, ob das Tagebuch heute ausgefüllt ist, heute fällige/überfällige ToDos. 🧑‍💻 Lars schreibt die Zählung „x von y erledigt“.
10. **Aussehen** – Handy-taugliches CSS, Dark Mode. 🧑‍💻 Lars gestaltet Farben/Abstände eines Bereichs.
11. **PWA: Manifest & Icons** – App-Name, Farben, Icons; im Browser unter DevTools → Application prüfen.
12. **PWA: Service Worker (offline)** – Dateien cachen, Versionsnummer für Updates. Test: DevTools „Offline“ anhaken, Seite neu laden → läuft. Erklärung, wie Updates ankommen.
13. **Aufs Handy** – Lars legt selbst ein GitHub-Konto und ein Repository an (Claude erklärt jeden Klick, gibt aber keine Zugangsdaten ein), dann `git push` und GitHub Pages einschalten. Am Handy öffnen → „Zum Startbildschirm“ → Flugmodus-Test → Handy neu starten → Daten noch da.
14. **Abschluss-Quiz** – Lars erklärt jeden Teil (Navigation, Speicher, Checkliste, Tagebuch, ToDos, Service Worker) in eigenen Worten; Lücken gemeinsam schließen.

## Verifikation
- Nach jedem Schritt: App im Browser-Pane über `http://localhost:8000` öffnen, Funktion durchklicken, Seite neu laden (Daten bleiben?), Konsole auf Fehler prüfen.
- Ab Schritt 12: Offline-Test in den DevTools.
- Ende Stufe 1: Test auf Lars' Handy im Flugmodus und nach Neustart.

## Hinweise
- Privatsphäre: Wenn ein Handy-Browser „Website-Daten löschen“ ausführt, sind die Einträge weg – Backup/Export kommt in Stufe 2 (steht in CLAUDE.md).
- Stufen 2 und 3 werden nicht gebaut.
