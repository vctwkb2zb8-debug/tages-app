# Tages-App – Lernprojekt von Lars

## Ziel (Stufe 1)
Eine persönliche Tages-App als **Progressive Web App (PWA)**:
- reines HTML, CSS und JavaScript – **kein Framework, kein Build-Schritt, keine npm-Pakete**
- lässt sich auf dem Handy auf den Homescreen legen und funktioniert **komplett offline**
- speichert alle Daten **nur lokal auf dem Gerät** (IndexedDB oder localStorage)
- **kein Server, keine Anmeldung, keine Verbindung nach außen**

### Funktionen (Stand 16.10.2026)
1. **Habits** (früher „Checkliste“) – 15 tägliche Gewohnheiten aus Lars' Gewohnheitstracker, je Tag mit drei Zuständen: ✓ erledigt (`x`), ½ teilweise (`/`), leer. Habits lassen sich hinzufügen, umbenennen und entfernen. Dazu ein tägliches **Happy-Rating** (1–10, halbe Schritte) und ein **Import** für den alten Verlauf aus der Notizen-App (Tabelle einfügen, wird nur lokal gelesen).
2. **Dankbarkeitstagebuch** – jeden Abend 3× „Wofür ich dankbar bin“ und 3× „Was ich heute für mich getan habe“. Ältere Tage lassen sich ansehen.
3. **Affirmationen** – Lars' Sätze zum morgendlichen Durchlesen; „Heute gelesen ✓“ hakt das Habit „Affirmationen“ ab. Der Text liegt **nur auf dem Gerät** (nicht im Code), Format: ein Satz pro Zeile, `#` = Überschrift, `!` = hervorgehoben.
4. **Tagesansicht** als Startseite – zeigt, was heute noch offen ist, plus (aus den Mail-Routinen übernommen):
   - **Morgenroutine-Challenge** 16.–29.10.2026 („Tag X/14“: Aufstehen 8:00, Affirmationen, Frühstück, 1 h Lernen)
   - **Sport diese Woche**: Laufen 2×, Kraft 1×, Mobility (= Habit „Dehnen/Haltung“) 2×, gezählt aus den Habits ab Montag, nur volle ✓
   - **Schlafenszeit** ab 17 Uhr: Licht aus = Wecker − 8 h (Wecker einstellbar, Schlüssel `wecker`)
   - **Wochenrückblick** (aufklappbar, sonntags offen): Sportziele erfüllt/verfehlt, Ø Happy vs. Vorwoche, Habits pro Woche, Reflexionsfeld (`wochen-reflexion`)
5. Habits und Tagebuch haben eine **Datumsleiste** (‹ Heute ›) zum Nachtragen früherer Tage.

Termine, Mails, Geburtstage, Wetter und Strava bleiben in den Mail-Routinen (Morgen 06:35, Abend 20:00 Mo–Sa, Wochenrückblick So 20:00), weil die App keinen Server und keine Google-/Strava-Anmeldung hat.

Die ToDos wurden am 16.10.2026 auf Lars' Wunsch entfernt (alte ToDo-Daten bleiben im Speicher unter `todos`, werden aber nicht mehr angezeigt).

Speicher-Schlüssel: `checkliste-punkte` (Liste der Habits, alter Name bewusst behalten), `habits-tage`, `happy`, `tagebuch`, `affirmationen-text`.

### Fertig ist Stufe 1, wenn …
- alle vier Funktionen offline auf Lars' Handy laufen,
- die Daten einen Neustart (App schließen, Handy neu starten) überleben,
- Lars jeden Teil des Codes grob erklären kann.

## Lernmodus (wichtigste Regel!)
Lars lernt programmieren. Claude baut die App **mit** ihm, nicht **für** ihn.
- Jeden Schritt kurz und einfach erklären (Deutsch, keine unnötigen Fachbegriffe; neue Begriffe einmal erklären).
- Kleine Teile lässt Claude Lars **selbst schreiben** (z. B. eine Funktion, ein CSS-Block, ein HTML-Abschnitt) – mit klarer Aufgabe und Hinweis, wo der Code hingehört.
- Danach Lars' Code **prüfen**: erst loben, was gut ist, dann Fehler erklären und Lars möglichst selbst korrigieren lassen. Nicht stillschweigend überschreiben.
- Kleine Schritte: lieber zehn kleine, verständliche Commits als ein großer.
- Nach jedem Schritt: im Browser zeigen, gemeinsam testen, dann committen.
- **Erklär-Stil:** Jede Antwort beginnt mit einem kurzen, lockeren Kasten „💡 Worum geht's?“ (2–4 Sätze, Alltagsvergleiche, keine Fachwörter ohne Erklärung). Antworten **kurz** halten, sonst wird es schnell zu viel. Code nur knapp erklären, Details auf Nachfrage. Lieber eine kleine Aufgabe auf einmal als viele.
- Code einfach und gut lesbar halten, lieber etwas länger als „clever“. Kommentare auf Deutsch, wo sie beim Verstehen helfen.

## Technische Regeln
- Dateien klein und übersichtlich halten (z. B. `index.html`, `style.css`, `app.js`, später `manifest.json`, `service-worker.js`).
- Keine externen Bibliotheken, keine CDNs, keine Schriftarten aus dem Netz – alles muss offline laufen.
- Datenschutz: Tagebuchdaten sind privat und **verlassen niemals das Gerät**. Kein Tracking, keine Analytics, keine `fetch`-Aufrufe an fremde Server.
- Der Code ist **öffentlich** auf GitHub (https://github.com/vctwkb2zb8-debug/tages-app, live unter https://vctwkb2zb8-debug.github.io/tages-app/). Darum **niemals** persönliche Inhalte in den Code oder ins Repo: keine Affirmationen-Texte, kein Habit-Verlauf, keine Ratings, keine Testdaten aus Lars' echten Daten. Die Habit-Namen als Vorlage hat Lars ausdrücklich freigegeben.
- Beim Testen im Browser-Pane immer zuerst prüfen, dass der Tab auf `http://localhost:8000` steht – nie Testdaten auf der Live-Adresse anlegen.
- Commits als `343493141+vctwkb2zb8-debug@users.noreply.github.com` (private Mailadresse nicht veröffentlichen).
- Datum immer als lokales Datum im Format `JJJJ-MM-TT` als Schlüssel für Tagesdaten.
- Lokal testen über einen einfachen lokalen Webserver (Service Worker brauchen `http://localhost` oder HTTPS, nicht `file://`).
- Commit-Nachrichten auf Deutsch, kurz und klar.

## Abgrenzung
Die **Morgenübersicht** (Mails, Termine, Geburtstage aus Gmail und Google Kalender) gehört **nicht** in diese App. Sie läuft als tägliche Cloud-Routine von Claude, die Lars eine Mail schickt (Google-Anmeldung und eigener Server wären für den Einstieg zu aufwendig).

## Ausblick (noch NICHT bauen)
- **Stufe 2 – Verlauf & Statistik:** z. B. Sport-Serie, Wochenrückblick, Export/Backup der Daten (als Datei auf dem Gerät).
- **Stufe 3 – Verbindung zur Morgen-Mail (optional):** z. B. offene ToDos in die tägliche Morgen-Mail übernehmen. Erst genau überlegen, wie das ohne Server und ohne Weitergabe privater Daten geht.
