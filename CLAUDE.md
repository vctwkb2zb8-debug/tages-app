# Tages-App – Lernprojekt von Lars

## Ziel (Stufe 1)
Eine persönliche Tages-App als **Progressive Web App (PWA)**:
- reines HTML, CSS und JavaScript – **kein Framework, kein Build-Schritt, keine npm-Pakete**
- lässt sich auf dem Handy auf den Homescreen legen und funktioniert **komplett offline**
- speichert alle Daten **nur lokal auf dem Gerät** (IndexedDB oder localStorage)
- **kein Server, keine Anmeldung, keine Verbindung nach außen**

### Funktionen
1. **Abend-Checkliste** – tägliche Punkte zum Abhaken (Start: Sport, Mahlzeiten, Dehnen). Punkte lassen sich hinzufügen, umbenennen und entfernen. Jeder Tag wird gespeichert.
2. **Dankbarkeitstagebuch** – jeden Abend 3× „Wofür ich dankbar bin“ und 3× „Was ich heute für mich getan habe“. Ältere Tage lassen sich ansehen.
3. **ToDos** – Liste mit Hinzufügen, Abhaken, Löschen, optional mit Fälligkeitsdatum.
4. **Tagesansicht** als Startseite – zeigt, was heute noch offen ist.

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
- Datum immer als lokales Datum im Format `JJJJ-MM-TT` als Schlüssel für Tagesdaten.
- Lokal testen über einen einfachen lokalen Webserver (Service Worker brauchen `http://localhost` oder HTTPS, nicht `file://`).
- Commit-Nachrichten auf Deutsch, kurz und klar.

## Abgrenzung
Die **Morgenübersicht** (Mails, Termine, Geburtstage aus Gmail und Google Kalender) gehört **nicht** in diese App. Sie läuft als tägliche Cloud-Routine von Claude, die Lars eine Mail schickt (Google-Anmeldung und eigener Server wären für den Einstieg zu aufwendig).

## Ausblick (noch NICHT bauen)
- **Stufe 2 – Verlauf & Statistik:** z. B. Sport-Serie, Wochenrückblick, Export/Backup der Daten (als Datei auf dem Gerät).
- **Stufe 3 – Verbindung zur Morgen-Mail (optional):** z. B. offene ToDos in die tägliche Morgen-Mail übernehmen. Erst genau überlegen, wie das ohne Server und ohne Weitergabe privater Daten geht.
