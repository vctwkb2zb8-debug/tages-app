// ===== Speicher =====
// localStorage merkt sich Text im Browser – auch nach dem Schließen.
// JSON verwandelt Listen/Objekte in Text (und zurück).

// Holt etwas aus dem Speicher. Gibt "standard" zurück, wenn noch nichts da ist.
function laden(schluessel, standard) {
  const text = localStorage.getItem(schluessel);
  if (text === null) {
    return standard;
  }
  return JSON.parse(text);
}

// Legt etwas unter einem Namen (schluessel) im Speicher ab.
function speichern(schluessel, wert) {
  localStorage.setItem(schluessel, JSON.stringify(wert));
}


// ===== Datum =====

// Macht aus einem Datum den Text "JJJJ-MM-TT", z. B. "2026-10-16"
function datumAlsText(datum) {
  const jahr = datum.getFullYear();
  const monat = String(datum.getMonth() + 1).padStart(2, "0"); // Januar ist 0, darum +1
  const tag = String(datum.getDate()).padStart(2, "0");        // 7 wird zu "07"
  return jahr + "-" + monat + "-" + tag;
}

// Gibt das heutige Datum als Text zurück
function heute() {
  return datumAlsText(new Date());
}

// Rechnet Tage dazu oder ab: verschiebeTag("2026-10-16", -1) → "2026-10-15"
function verschiebeTag(datum, tage) {
  const tag = new Date(datum + "T00:00");
  tag.setDate(tag.getDate() + tage);
  return datumAlsText(tag);
}

// Macht aus "2026-10-16" den Text "Freitag, 16. Oktober 2026"
function langesDatum(datum) {
  const tag = new Date(datum + "T00:00"); // T00:00 = Mitternacht in deiner Zeitzone
  return tag.toLocaleDateString("de-DE", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });
}

// Baut aus einer Liste von Texten eine Aufzählung (leere Zeilen weglassen)
function eintragsListe(eintraege) {
  const liste = document.createElement("ul");
  for (const eintrag of eintraege) {
    if (eintrag.trim() !== "") {
      const punkt = document.createElement("li");
      punkt.textContent = eintrag;
      liste.append(punkt);
    }
  }
  return liste;
}


// ===== Gewählter Tag (Datumsleiste) =====
// Habits und Tagebuch zeigen den „gewählten Tag“ – normalerweise heute.
// Mit ‹ und › kann man zurückblättern, um verpasste Tage nachzutragen.
let gewaehlterTag = heute();

// Kurzer Name für die Leiste: "Heute", "Gestern" oder z. B. "Mi., 14. Okt."
function tagesName(datum) {
  if (datum === heute()) return "Heute";
  if (datum === verschiebeTag(heute(), -1)) return "Gestern";
  return new Date(datum + "T00:00").toLocaleDateString("de-DE", {
    weekday: "short", day: "numeric", month: "short"
  });
}

// Setzt den gewählten Tag und baut Habits und Tagebuch dafür neu auf
function waehleTag(datum) {
  if (datum > heute()) return; // nicht in die Zukunft
  gewaehlterTag = datum;

  for (const anzeige of document.querySelectorAll(".tag-anzeige")) {
    anzeige.textContent = tagesName(datum);
  }
  for (const knopf of document.querySelectorAll(".tag-vor")) {
    knopf.disabled = datum === heute();
  }
  for (const hinweis of document.querySelectorAll(".frueherer-tag")) {
    hinweis.classList.toggle("versteckt", datum === heute());
  }

  zeigeHabits();
  zeigeTagebuch();
}

// Knöpfe in beiden Leisten verbinden
for (const knopf of document.querySelectorAll(".tag-zurueck")) {
  knopf.addEventListener("click", function () { waehleTag(verschiebeTag(gewaehlterTag, -1)); });
}
for (const knopf of document.querySelectorAll(".tag-vor")) {
  knopf.addEventListener("click", function () { waehleTag(verschiebeTag(gewaehlterTag, 1)); });
}
for (const knopf of document.querySelectorAll(".zu-heute")) {
  knopf.addEventListener("click", function () { waehleTag(heute()); });
}


// ===== Habits =====
// Gespeichert werden:
//   "checkliste-punkte": welche Habits es gibt, z. B. [{ id: "lesen", name: "Lesen" }, …]
//                        (heißt noch „checkliste“, damit vorhandene Daten erhalten bleiben)
//   "habits-tage":       Stand pro Tag, z. B. { "2026-10-16": { lesen: "x", dehnen: "/" } }
//                        "x" = erledigt, "/" = teilweise, fehlt = nicht gemacht
//   "happy":             Glücks-Rating pro Tag, z. B. { "2026-10-16": 7.5 }

const HABIT_VORLAGE = [
  { id: "aufstehen", name: "Aufstehen 8:00" },
  { id: "affirmationen", name: "Affirmationen" },
  { id: "fruehstueck", name: "Frühstück" },
  { id: "lernen", name: "1 h Lernen" },
  { id: "kein-handy", name: "Kein Handy 1 h nach Aufstehen" },
  { id: "mittagessen", name: "Mittagessen" },
  { id: "abendessen", name: "Abendessen" },
  { id: "reflektieren", name: "Reflektieren" },
  { id: "achtsamkeit", name: "Achtsamkeit" },
  { id: "dehnen", name: "Dehnen/Haltung" },
  { id: "lesen", name: "Lesen" },
  { id: "sozial", name: "Sozial" },
  { id: "medikamente", name: "Medikamente" },
  { id: "schiene", name: "Schiene" },
  { id: "laufen", name: "Laufen" },
  { id: "schwimmen", name: "Schwimmen" },
  { id: "krafttraining", name: "Krafttraining" }
];

// Einmalige Umstellung: die alten Startpunkte (Sport, Mahlzeiten, Dehnen) durch die
// Vorlage ersetzen. Selbst hinzugefügte Punkte (id beginnt mit "p") bleiben erhalten.
if (!laden("habits-vorlage-eingerichtet", false)) {
  const altePunkte = laden("checkliste-punkte", []);
  const eigene = altePunkte.filter(function (p) { return p.id.startsWith("p"); });
  speichern("checkliste-punkte", HABIT_VORLAGE.concat(eigene));
  speichern("habits-vorlage-eingerichtet", true);
  speichern("habits-morgen-ergaenzt", true); // die Vorlage enthält die Morgen-Habits schon
}

// Einmalige Ergänzung (16.10.2026): „Aufstehen 8:00“ ganz oben und „1 h Lernen“
// nach „Frühstück“ einfügen – für alle, die die Vorlage schon vorher hatten.
if (!laden("habits-morgen-ergaenzt", false)) {
  const habits = laden("checkliste-punkte", HABIT_VORLAGE);
  const hat = function (id) { return habits.some(function (h) { return h.id === id; }); };
  if (!hat("aufstehen")) {
    habits.unshift({ id: "aufstehen", name: "Aufstehen 8:00" }); // unshift = vorne einfügen
  }
  if (!hat("lernen")) {
    const nachFruehstueck = habits.findIndex(function (h) { return h.id === "fruehstueck"; }) + 1;
    habits.splice(nachFruehstueck, 0, { id: "lernen", name: "1 h Lernen" }); // splice = an Stelle einfügen
  }
  speichern("checkliste-punkte", habits);
  speichern("habits-morgen-ergaenzt", true);
}

// Was zeigt ein Habit je nach Zustand an?
const HABIT_SYMBOL = { "x": "✓", "/": "½", "": "" };

function ladeHabits() {
  return laden("checkliste-punkte", HABIT_VORLAGE);
}

// Gibt den Stand eines Tages zurück, z. B. { lesen: "x" } (leer, wenn noch nichts da)
function habitTag(datum) {
  return laden("habits-tage", {})[datum] || {};
}

// Setzt ein Habit an einem Tag auf "x", "/" oder "" (leer)
function setzeHabit(datum, id, zustand) {
  const alleTage = laden("habits-tage", {});
  const tag = alleTage[datum] || {};
  if (zustand === "") {
    delete tag[id];
  } else {
    tag[id] = zustand;
  }
  alleTage[datum] = tag;
  speichern("habits-tage", alleTage);
}

// Baut die Habit-Liste für den gewählten Tag neu auf
function zeigeHabits() {
  const tag = habitTag(gewaehlterTag);
  const liste = document.getElementById("habit-liste");
  liste.innerHTML = "";

  for (const habit of ladeHabits()) {
    const zustand = tag[habit.id] || "";

    // Der ganze Eintrag ist ein Knopf: jeder Tipp schaltet weiter
    const knopf = document.createElement("button");
    knopf.className = "habit";
    if (zustand === "x") knopf.classList.add("erledigt");
    if (zustand === "/") knopf.classList.add("teilweise");

    const kaestchen = document.createElement("span");
    kaestchen.className = "kaestchen";
    kaestchen.textContent = HABIT_SYMBOL[zustand];

    knopf.append(kaestchen, habit.name);
    knopf.addEventListener("click", function () {
      // leer → x → / → leer
      const naechster = { "": "x", "x": "/", "/": "" }[zustand];
      setzeHabit(gewaehlterTag, habit.id, naechster);
      zeigeHabits();
    });

    // Knöpfe ✏️ und ✕ (nur sichtbar im Bearbeiten-Modus)
    const umbenennenKnopf = document.createElement("button");
    umbenennenKnopf.textContent = "✏️";
    umbenennenKnopf.title = "Umbenennen";
    umbenennenKnopf.className = "bearbeiten";
    umbenennenKnopf.addEventListener("click", function () {
      benenneHabitUm(habit.id);
    });

    const entfernenKnopf = document.createElement("button");
    entfernenKnopf.textContent = "✕";
    entfernenKnopf.title = "Entfernen";
    entfernenKnopf.className = "bearbeiten";
    entfernenKnopf.addEventListener("click", function () {
      entferneHabit(habit.id);
    });

    const zeile = document.createElement("li");
    zeile.append(knopf, umbenennenKnopf, entfernenKnopf);
    liste.append(zeile);
  }

  zeigeHappy();
}

function fuegeHabitHinzu(name) {
  const habits = ladeHabits();
  habits.push({ id: "p" + Date.now(), name: name }); // Date.now() = eindeutige Zahl
  speichern("checkliste-punkte", habits);
  zeigeHabits();
}

function benenneHabitUm(id) {
  const habits = ladeHabits();
  const habit = habits.find(function (h) { return h.id === id; });
  const neuerName = prompt("Neuer Name:", habit.name);
  if (neuerName && neuerName.trim() !== "") { // nicht abgebrochen und nicht leer
    habit.name = neuerName.trim();
    speichern("checkliste-punkte", habits);
    zeigeHabits();
  }
}

function entferneHabit(id) {
  const habits = ladeHabits();
  const habit = habits.find(function (h) { return h.id === id; });
  if (confirm("„" + habit.name + "“ wirklich entfernen?")) {
    const uebrig = habits.filter(function (h) { return h.id !== id; });
    speichern("checkliste-punkte", uebrig);
    zeigeHabits();
  }
}

// Knopf „Habits bearbeiten“: blendet ✏️/✕ und das Hinzufügen-Formular ein und aus
document.getElementById("habits-bearbeiten-knopf").addEventListener("click", function () {
  const liste = document.getElementById("habit-liste");
  liste.classList.toggle("bearbeiten-modus");
  document.getElementById("habit-neu").classList.toggle("versteckt");
  this.textContent = liste.classList.contains("bearbeiten-modus") ? "Fertig" : "Habits bearbeiten";
});

document.getElementById("habit-neu").addEventListener("submit", function (ereignis) {
  ereignis.preventDefault(); // sonst lädt der Browser die Seite neu
  const eingabe = document.getElementById("habit-neu-name");
  fuegeHabitHinzu(eingabe.value.trim());
  eingabe.value = "";
});


// ===== Glücks-Rating =====

// Zahl schön auf Deutsch: 7.5 → "7,5"
function deutscheZahl(zahl) {
  return String(zahl).replace(".", ",");
}

function zeigeHappy() {
  const wert = laden("happy", {})[gewaehlterTag];
  const regler = document.getElementById("happy-regler");
  const anzeige = document.getElementById("happy-wert");
  if (wert === undefined) {
    regler.value = 7;
    regler.classList.add("unbewertet"); // blass, bis du ihn bewegst
    anzeige.textContent = "–";
  } else {
    regler.value = wert;
    regler.classList.remove("unbewertet");
    anzeige.textContent = deutscheZahl(wert);
  }
}

document.getElementById("happy-regler").addEventListener("input", function () {
  const alle = laden("happy", {});
  alle[gewaehlterTag] = Number(this.value);
  speichern("happy", alle);
  zeigeHappy();
});


// ===== Verlauf importieren =====
// Liest die Tabelle aus der Notizen-App: erste Zeile = Daten (16.10. 15.10. …),
// jede weitere Zeile = Habit-Name und dann ein Feld pro Tag (x, / oder leer).
// Die Zeile „rating happy“ wird zum Glücks-Rating.

// Name vereinfachen, damit „kein handy 1h …“ und „Kein Handy 1 h …“ gleich sind
function vereinfacheName(name) {
  return name.toLowerCase().replace(/[^a-z0-9äöüß]/g, "");
}

// Wandelt die Datumszeile in echte Daten um. Das Jahr fehlt in der Tabelle, darum:
// Wir starten beim aktuellen Jahr und gehen rückwärts; springt der Monat nach oben
// (z. B. von Januar zu Dezember), sind wir im Vorjahr. Kaputte Einträge wie „24.0“
// werden als „ein Tag vor dem vorherigen“ gelesen.
function leseDaten(zellen) {
  const daten = [];
  let jahr = new Date().getFullYear();
  let vorheriges = null;

  for (const zelle of zellen) {
    const teile = zelle.trim().split(".");
    const tag = Number(teile[0]);
    const monat = Number(teile[1]);
    let datum;

    if (tag >= 1 && tag <= 31 && monat >= 1 && monat <= 12) {
      if (vorheriges && monat > vorheriges.getMonth() + 1) {
        jahr = jahr - 1;
      }
      datum = new Date(jahr, monat - 1, tag);
    } else if (vorheriges) {
      datum = new Date(vorheriges);
      datum.setDate(datum.getDate() - 1);
    } else {
      datum = new Date();
    }

    daten.push(datumAlsText(datum));
    vorheriges = datum;
  }
  return daten;
}

// Zerlegt den eingefügten Text. Ergebnis: { tage, habits: [{ name, werte }], happy }
function leseTabelle(text) {
  const zeilen = text.split("\n").filter(function (z) { return z.trim() !== ""; });
  const kopf = zeilen[0].split("\t").filter(function (z) { return z.trim() !== ""; });
  const tage = leseDaten(kopf);

  const habits = [];
  const happy = {};

  for (const zeile of zeilen.slice(1)) {
    const zellen = zeile.split("\t");
    const name = zellen[0].trim();
    const felder = zellen.slice(1); // ein Feld pro Tag, gleiche Reihenfolge wie die Daten

    if (vereinfacheName(name).startsWith("rating")) {
      tage.forEach(function (datum, i) {
        const zahl = parseFloat((felder[i] || "").replace(",", "."));
        if (zahl >= 0 && zahl <= 10) {
          happy[datum] = zahl;
        }
      });
      continue;
    }

    const werte = {};
    tage.forEach(function (datum, i) {
      const feld = (felder[i] || "").toLowerCase();
      if (feld.includes("/")) {
        werte[datum] = "/";
      } else if (feld.includes("x")) {
        werte[datum] = "x"; // auch „xx“ zählt als erledigt
      }
    });
    habits.push({ name: name, werte: werte });
  }

  return { tage: tage, habits: habits, happy: happy };
}

let importErgebnis = null; // merkt sich das Ergebnis zwischen „Prüfen“ und „Übernehmen“

document.getElementById("import-pruefen").addEventListener("click", function () {
  const vorschau = document.getElementById("import-vorschau");
  const uebernehmen = document.getElementById("import-uebernehmen");
  try {
    importErgebnis = leseTabelle(document.getElementById("import-text").value);
    const t = importErgebnis.tage;
    vorschau.textContent =
      t.length + " Tage (" + langesDatum(t[t.length - 1]) + " bis " + langesDatum(t[0]) + "), " +
      importErgebnis.habits.length + " Habits und " +
      Object.keys(importErgebnis.happy).length + " Ratings erkannt. " +
      "Schon in der App eingetragene Werte bleiben erhalten.";
    uebernehmen.classList.remove("versteckt");
  } catch (fehler) {
    vorschau.textContent = "Das konnte ich nicht lesen. Hast du die ganze Tabelle mit Datumszeile kopiert?";
    uebernehmen.classList.add("versteckt");
  }
});

document.getElementById("import-uebernehmen").addEventListener("click", function () {
  const habits = ladeHabits();
  const alleTage = laden("habits-tage", {});
  const happy = laden("happy", {});

  for (const importiert of importErgebnis.habits) {
    // Passendes Habit suchen – oder neu anlegen, falls es den Namen noch nicht gibt
    let habit = habits.find(function (h) {
      return vereinfacheName(h.name) === vereinfacheName(importiert.name);
    });
    if (!habit) {
      habit = { id: "p" + Date.now() + habits.length, name: importiert.name };
      habits.push(habit);
    }

    for (const datum in importiert.werte) {
      alleTage[datum] = alleTage[datum] || {};
      if (!alleTage[datum][habit.id]) { // App-Einträge haben Vorrang
        alleTage[datum][habit.id] = importiert.werte[datum];
      }
    }
  }

  for (const datum in importErgebnis.happy) {
    if (happy[datum] === undefined) {
      happy[datum] = importErgebnis.happy[datum];
    }
  }

  speichern("checkliste-punkte", habits);
  speichern("habits-tage", alleTage);
  speichern("happy", happy);

  document.getElementById("import-vorschau").textContent = "Fertig importiert ✓";
  document.getElementById("import-uebernehmen").classList.add("versteckt");
  document.getElementById("import-text").value = "";
  zeigeHabits();
});

zeigeHabits();


// ===== Dankbarkeitstagebuch =====
// Gespeichert unter "tagebuch", ein Eintrag pro Tag, z. B.
//   { "2026-10-16": { dankbar: ["Sonne", "", ""], fuerMich: ["Spaziergang", "", ""] } }

// Ein leerer Tag: je drei leere Zeilen
function leererTagebuchTag() {
  return { dankbar: ["", "", ""], fuerMich: ["", "", ""] };
}

// Schreibt die gespeicherten Einträge des gewählten Tages in die Felder
function zeigeTagebuch() {
  const tagebuch = laden("tagebuch", {});
  const tag = tagebuch[gewaehlterTag] || leererTagebuchTag();

  for (const feld of document.querySelectorAll(".tagebuch-feld")) {
    feld.value = tag[feld.dataset.art][feld.dataset.nr];
  }
}

// Speichert ein Feld, sobald darin getippt wird
for (const feld of document.querySelectorAll(".tagebuch-feld")) {
  feld.addEventListener("input", function () {
    const tagebuch = laden("tagebuch", {});
    const tag = tagebuch[gewaehlterTag] || leererTagebuchTag();
    tag[feld.dataset.art][feld.dataset.nr] = feld.value;
    tagebuch[gewaehlterTag] = tag;
    speichern("tagebuch", tagebuch);
  });
  // Nach dem Tippen (Feld verlassen) das Archiv auffrischen – falls ein früherer Tag geändert wurde
  feld.addEventListener("change", zeigeTagebuchArchiv);
}

// Zeigt alle früheren Tage, der neueste zuerst. Ein Tipp aufs Datum klappt ihn auf.
function zeigeTagebuchArchiv() {
  const tagebuch = laden("tagebuch", {});
  const archiv = document.getElementById("tagebuch-archiv");
  archiv.innerHTML = "";

  // Alle Daten außer heute, sortiert vom neuesten zum ältesten
  const fruehereTage = Object.keys(tagebuch)
    .filter(function (datum) { return datum !== heute(); })
    .sort()
    .reverse();

  if (fruehereTage.length === 0) {
    archiv.textContent = "Noch keine früheren Einträge.";
    return;
  }

  for (const datum of fruehereTage) {
    const tag = tagebuch[datum];

    // <details> ist ein eingebautes Aufklapp-Element, <summary> seine Überschrift
    const block = document.createElement("details");
    const ueberschrift = document.createElement("summary");
    ueberschrift.textContent = langesDatum(datum);

    const dankbarTitel = document.createElement("strong");
    dankbarTitel.textContent = "Dankbar für:";
    const fuerMichTitel = document.createElement("strong");
    fuerMichTitel.textContent = "Für mich getan:";

    block.append(
      ueberschrift,
      dankbarTitel, eintragsListe(tag.dankbar),
      fuerMichTitel, eintragsListe(tag.fuerMich)
    );
    archiv.append(block);
  }
}

zeigeTagebuch();
zeigeTagebuchArchiv();


// ===== Affirmationen =====
// Der Text liegt nur auf diesem Gerät unter "affirmationen-text".
// Regeln: ein Satz pro Zeile, „# …“ = Zwischenüberschrift, „! …“ = hervorgehoben.
// „Heute gelesen ✓“ hakt das Habit „Affirmationen“ ab.

function zeigeAffirmationen() {
  const text = laden("affirmationen-text", "");
  const bereich = document.getElementById("affirmationen-text");
  bereich.innerHTML = "";
  document.getElementById("affirmationen-eingabe").value = text;

  if (text.trim() === "") {
    bereich.textContent = "Noch keine Affirmationen. Tippe unten auf „Affirmationen bearbeiten“.";
    document.getElementById("affirmationen-bearbeiten").open = true;
  }

  let liste = null;
  for (const zeile of text.split("\n")) {
    const inhalt = zeile.trim().replace(/^[-*•]\s*/, ""); // Aufzählungszeichen weglassen
    if (inhalt === "") continue;

    if (inhalt.startsWith("#")) {
      const ueberschrift = document.createElement("h3");
      ueberschrift.textContent = inhalt.replace(/^#+\s*/, "");
      bereich.append(ueberschrift);
      liste = null; // nach einer Überschrift beginnt eine neue Liste
    } else if (inhalt.startsWith("!")) {
      const kasten = document.createElement("p");
      kasten.className = "hervorgehoben";
      kasten.textContent = inhalt.replace(/^!+\s*/, "");
      bereich.append(kasten);
      liste = null;
    } else {
      if (!liste) {
        liste = document.createElement("ul");
        bereich.append(liste);
      }
      const satz = document.createElement("li");
      satz.textContent = inhalt;
      liste.append(satz);
    }
  }

  const gelesen = habitTag(heute())["affirmationen"] === "x";
  const knopf = document.getElementById("affirmationen-gelesen");
  knopf.textContent = gelesen ? "Heute gelesen ✓ – schön!" : "Heute gelesen ✓";
  knopf.classList.toggle("fertig", gelesen);
}

document.getElementById("affirmationen-gelesen").addEventListener("click", function () {
  setzeHabit(heute(), "affirmationen", "x"); // Affirmationen gelten immer für heute
  zeigeAffirmationen();
  zeigeHabits();
});

document.getElementById("affirmationen-speichern").addEventListener("click", function () {
  speichern("affirmationen-text", document.getElementById("affirmationen-eingabe").value);
  document.getElementById("affirmationen-bearbeiten").open = false;
  zeigeAffirmationen();
});

zeigeAffirmationen();


// ===== Startseite „Heute“ =====

// Baut einen Kasten mit Überschrift, Text und (falls vorhanden) einer Liste.
// Ein Tipp auf den Kasten öffnet den passenden Bereich.
function heuteKasten(titel, text, eintraege, zielBereich, fertig) {
  const kasten = document.createElement("button");
  kasten.className = "heute-kasten";
  if (fertig) {
    kasten.classList.add("fertig");
  }

  const ueberschrift = document.createElement("strong");
  ueberschrift.textContent = (fertig ? "✅ " : "⏳ ") + titel;
  const beschreibung = document.createElement("span");
  beschreibung.textContent = text;
  kasten.append(ueberschrift, beschreibung, eintragsListe(eintraege));

  kasten.addEventListener("click", function () {
    zeigeBereich(zielBereich);
  });
  return kasten;
}

// --- Hilfen für Wochen ---

// Wochentag als Zahl: Montag = 0 … Sonntag = 6
function wochentag(datum) {
  return (new Date(datum + "T00:00").getDay() + 6) % 7; // getDay() zählt ab Sonntag = 0
}

// Der Montag der Woche, in der das Datum liegt
function montagVon(datum) {
  return verschiebeTag(datum, -wochentag(datum));
}

// Kalenderwoche nach deutscher Zählung (ISO): Woche 1 enthält den ersten Donnerstag des Jahres
function kalenderwoche(datum) {
  const donnerstag = new Date(verschiebeTag(montagVon(datum), 3) + "T00:00");
  const jahresanfang = new Date(donnerstag.getFullYear(), 0, 1);
  // Erst auf ganze Tage runden (wegen Sommerzeit fehlt sonst eine Stunde), dann Wochen zählen
  const tage = Math.round((donnerstag - jahresanfang) / 86400000);
  return Math.floor(tage / 7) + 1;
}

// Wie oft wurde ein Habit von „von“ bis „bis“ (je einschließlich) voll erledigt (x)?
function zaehleHabit(id, von, bis) {
  const alleTage = laden("habits-tage", {});
  let anzahl = 0;
  for (let datum = von; datum <= bis; datum = verschiebeTag(datum, 1)) {
    if (alleTage[datum] && alleTage[datum][id] === "x") anzahl++;
  }
  return anzahl;
}


// --- Morgenroutine-Challenge ---
const ROUTINE_START = "2026-10-16";
const ROUTINE_TAGE = 14;
const ROUTINE_HABITS = ["aufstehen", "affirmationen", "fruehstueck", "lernen"];

function morgenroutineKasten(tagHabits) {
  // Welcher Tag der Challenge ist heute? (1 bis 14, sonst kein Kasten)
  const tagNr = Math.round((new Date(heute() + "T00:00") - new Date(ROUTINE_START + "T00:00")) / 86400000) + 1;
  if (tagNr < 1 || tagNr > ROUTINE_TAGE) return null;

  const habits = ladeHabits();
  const offen = ROUTINE_HABITS
    .filter(function (id) { return tagHabits[id] !== "x"; })
    .map(function (id) {
      const habit = habits.find(function (h) { return h.id === id; });
      return habit ? habit.name : id;
    });
  if (tagNr === ROUTINE_TAGE) {
    offen.push("Letzter Tag – kurzer Rückblick: Was behältst du bei?");
  }

  return heuteKasten(
    "Morgenroutine – Tag " + tagNr + "/" + ROUTINE_TAGE,
    offen.length === 0 ? "Alles geschafft" : "Aufstehen 8:00 · Affirmationen · Frühstück · 1 h Lernen",
    offen,
    "habits",
    offen.length === 0
  );
}


// --- Wochenziele Sport ---
// Mobility = Habit „Dehnen/Haltung“. Gezählt werden nur volle Häkchen (✓), nicht ½.
const SPORTZIELE = [
  { id: "laufen", name: "Laufen", soll: 2 },
  { id: "krafttraining", name: "Kraft", soll: 1 },
  { id: "dehnen", name: "Mobility", soll: 2 }
];

// Stand der Sportziele in einer Woche bis zu einem Tag, z. B. [{ name, soll, ist }]
function sportStand(montag, bis) {
  return SPORTZIELE.map(function (ziel) {
    return { name: ziel.name, soll: ziel.soll, ist: zaehleHabit(ziel.id, montag, bis) };
  });
}

function sportKasten() {
  const stand = sportStand(montagVon(heute()), heute());
  const tageUebrig = 7 - wochentag(heute()); // heute mitgezählt, bis Sonntag

  const zeile = stand.map(function (z) {
    return z.name + " " + z.ist + "/" + z.soll + (z.ist >= z.soll ? " (erfüllt)" : "");
  }).join(" · ");

  const hinweise = [];
  for (const z of stand) {
    const offen = z.soll - z.ist;
    if (offen > 0) {
      const text = "Noch " + offen + "× " + z.name + " offen, " +
        tageUebrig + (tageUebrig === 1 ? " Tag" : " Tage") + " übrig";
      hinweise.push(offen >= tageUebrig ? "Achtung: " + text : text);
    }
  }

  return heuteKasten("Sport diese Woche", zeile, hinweise, "habits", hinweise.length === 0);
}


// --- Schlafenszeit ---
// Licht aus = Wecker − 8 Stunden, auf 15 Minuten gerundet. Wird ab 17 Uhr angezeigt.
function lichtAus(wecker) {
  const teile = wecker.split(":");
  let minuten = Number(teile[0]) * 60 + Number(teile[1]) - 8 * 60;
  minuten = Math.round(minuten / 15) * 15;
  minuten = (minuten + 24 * 60) % (24 * 60); // über Mitternacht zurückrechnen
  return String(Math.floor(minuten / 60)).padStart(2, "0") + ":" + String(minuten % 60).padStart(2, "0");
}

function schlafKasten() {
  if (new Date().getHours() < 17) return null;
  const wecker = laden("wecker", "08:00");

  // Kein Knopf wie die anderen Kästen, weil ein Eingabefeld drin ist
  const kasten = document.createElement("div");
  kasten.className = "heute-kasten schlaf";

  const ueberschrift = document.createElement("strong");
  ueberschrift.textContent = "😴 Schlafenszeit";
  const text = document.createElement("span");
  text.textContent = "Licht aus um ca. " + lichtAus(wecker) + " (Wecker ";

  const weckerFeld = document.createElement("input");
  weckerFeld.type = "time";
  weckerFeld.value = wecker;
  weckerFeld.addEventListener("change", function () {
    if (weckerFeld.value) {
      speichern("wecker", weckerFeld.value);
      zeigeHeute();
    }
  });

  kasten.append(ueberschrift, text, weckerFeld, ")");
  return kasten;
}


// --- Wochenrückblick ---
let rueckblickMontag = montagVon(heute());

function zeigeWochenrueckblick() {
  const inhalt = document.getElementById("wochenrueckblick-inhalt");
  inhalt.innerHTML = "";
  const montag = rueckblickMontag;
  const sonntag = verschiebeTag(montag, 6);
  const bis = sonntag < heute() ? sonntag : heute(); // laufende Woche nur bis heute
  const vorbei = sonntag <= heute();                 // ab Sonntag gilt die Woche als „abgeschlossen“

  // Kopfzeile: ‹ KW 42 · 12.10.–18.10. ›
  const kurz = function (d) { return d.slice(8, 10) + "." + d.slice(5, 7) + "."; };
  document.getElementById("woche-anzeige").textContent =
    "KW " + kalenderwoche(montag) + " · " + kurz(montag) + "–" + kurz(sonntag);
  document.getElementById("woche-vor").disabled = montag === montagVon(heute());

  // Sportziele
  const sportTitel = document.createElement("h3");
  sportTitel.textContent = "Sportziele";
  const sport = sportStand(montag, bis).map(function (z) {
    const zustand = z.ist >= z.soll ? "erfüllt" : (vorbei ? "verfehlt" : "offen");
    return z.name + ": " + z.ist + "/" + z.soll + " – " + zustand;
  });
  inhalt.append(sportTitel, eintragsListe(sport));

  // Happy-Rating: Durchschnitt dieser Woche und der Vorwoche
  const happy = laden("happy", {});
  const schnitt = function (von, bisTag) {
    const werte = [];
    for (let d = von; d <= bisTag; d = verschiebeTag(d, 1)) {
      if (happy[d] !== undefined) werte.push(happy[d]);
    }
    if (werte.length === 0) return null;
    const summe = werte.reduce(function (a, b) { return a + b; }, 0);
    return Math.round(summe / werte.length * 10) / 10; // auf eine Nachkommastelle
  };
  const diese = schnitt(montag, bis);
  const vorher = schnitt(verschiebeTag(montag, -7), verschiebeTag(montag, -1));
  const happyTitel = document.createElement("h3");
  happyTitel.textContent = "Happy-Rating";
  const happyText = document.createElement("p");
  happyText.textContent = diese === null
    ? "Diese Woche noch keine Bewertung."
    : "Durchschnitt " + deutscheZahl(diese) +
      (vorher === null ? "" : " (Vorwoche " + deutscheZahl(vorher) + ")");
  inhalt.append(happyTitel, happyText);

  // Habits: wie oft geschafft?
  const tageGesamt = Math.round((new Date(bis + "T00:00") - new Date(montag + "T00:00")) / 86400000) + 1;
  const habitsTitel = document.createElement("h3");
  habitsTitel.textContent = "Habits (" + tageGesamt + (tageGesamt === 1 ? " Tag)" : " Tage)");
  const alleTage = laden("habits-tage", {});
  const habitZeilen = ladeHabits().map(function (h) {
    let halb = 0;
    for (let d = montag; d <= bis; d = verschiebeTag(d, 1)) {
      if (alleTage[d] && alleTage[d][h.id] === "/") halb++;
    }
    return h.name + ": " + zaehleHabit(h.id, montag, bis) + "/" + tageGesamt +
      (halb > 0 ? " (+" + halb + "× ½)" : "");
  });
  inhalt.append(habitsTitel, eintragsListe(habitZeilen));

  // Reflexion: pro Woche gespeichert
  const reflexionTitel = document.createElement("h3");
  reflexionTitel.textContent = "Was behalte ich bei? Was ändere ich?";
  const feld = document.createElement("textarea");
  feld.rows = 4;
  feld.value = laden("wochen-reflexion", {})[montag] || "";
  feld.addEventListener("input", function () {
    const alle = laden("wochen-reflexion", {});
    alle[montag] = feld.value;
    speichern("wochen-reflexion", alle);
  });
  inhalt.append(reflexionTitel, feld);
}

document.getElementById("woche-zurueck").addEventListener("click", function () {
  rueckblickMontag = verschiebeTag(rueckblickMontag, -7);
  zeigeWochenrueckblick();
});
document.getElementById("woche-vor").addEventListener("click", function () {
  rueckblickMontag = verschiebeTag(rueckblickMontag, 7);
  zeigeWochenrueckblick();
});


// --- Startseite zusammenbauen ---
function zeigeHeute() {
  document.getElementById("heute-datum").textContent = langesDatum(heute());
  const kaesten = document.getElementById("heute-kaesten");
  kaesten.innerHTML = "";
  const tagHabits = habitTag(heute());

  // 0. Morgenroutine-Challenge (nur 16.–29.10.)
  const routine = morgenroutineKasten(tagHabits);
  if (routine) kaesten.append(routine);

  // 1. Affirmationen: heute schon gelesen?
  const gelesen = tagHabits["affirmationen"] === "x";
  kaesten.append(heuteKasten(
    "Affirmationen",
    gelesen ? "Heute gelesen" : "Noch nicht gelesen",
    [],
    "affirmationen",
    gelesen
  ));

  // 2. Habits: wie viele erledigt, welche noch offen?
  const habits = ladeHabits();
  const offen = habits.filter(function (h) { return tagHabits[h.id] !== "x"; });
  const happy = laden("happy", {})[heute()];
  kaesten.append(heuteKasten(
    "Habits",
    (habits.length - offen.length) + " von " + habits.length + " erledigt" +
      (happy === undefined ? "" : " · Happy: " + deutscheZahl(happy)),
    offen.map(function (h) { return tagHabits[h.id] === "/" ? h.name + " (½)" : h.name; }),
    "habits",
    offen.length === 0
  ));

  // 3. Tagebuch: wie viele der 6 Zeilen sind ausgefüllt?
  const tag = laden("tagebuch", {})[heute()] || leererTagebuchTag();
  const alleZeilen = tag.dankbar.concat(tag.fuerMich);
  const ausgefuellt = alleZeilen.filter(function (z) { return z.trim() !== ""; }).length;
  kaesten.append(heuteKasten(
    "Tagebuch",
    ausgefuellt + " von 6 Zeilen ausgefüllt",
    [],
    "tagebuch",
    ausgefuellt === 6
  ));

  // 4. Sport diese Woche
  kaesten.append(sportKasten());

  // 5. Schlafenszeit (ab 17 Uhr)
  const schlaf = schlafKasten();
  if (schlaf) kaesten.append(schlaf);

  // 6. Wochenrückblick: immer die aktuelle Woche; sonntags automatisch aufgeklappt
  rueckblickMontag = montagVon(heute());
  if (wochentag(heute()) === 6) {
    document.getElementById("wochenrueckblick").open = true;
  }
  zeigeWochenrueckblick();
}


// ===== Navigation =====

// Zeigt nur den Bereich mit diesem Namen, z. B. zeigeBereich("habits")
function zeigeBereich(name) {
  // 1. Alle Bereiche verstecken
  const alleBereiche = document.querySelectorAll("section");
  for (const bereich of alleBereiche) {
    bereich.classList.add("versteckt");
  }

  // 2. Nur den gewählten Bereich wieder zeigen
  const gewaehlterBereich = document.getElementById(name);
  gewaehlterBereich.classList.remove("versteckt");

  // 3. Den passenden Knopf unten hervorheben
  for (const knopf of document.querySelectorAll("nav button")) {
    knopf.classList.toggle("aktiv", knopf.dataset.bereich === name);
  }

  // 4. Die Startseite jedes Mal neu berechnen – in den anderen Bereichen kann sich ja was geändert haben
  if (name === "heute") {
    zeigeHeute();
  }
  window.scrollTo(0, 0);
}

// Wenn die App wieder in den Vordergrund kommt (z. B. am nächsten Morgen),
// alles neu aufbauen – sonst stünde noch der gestrige Tag da.
document.addEventListener("visibilitychange", function () {
  if (document.visibilityState === "visible") {
    waehleTag(heute()); // zeigt Habits und Tagebuch wieder für heute
    zeigeTagebuchArchiv();
    zeigeAffirmationen();
    zeigeHeute();
  }
});

// Jeder Knopf in der Leiste ruft beim Antippen zeigeBereich auf
const knoepfe = document.querySelectorAll("nav button");
for (const knopf of knoepfe) {
  knopf.addEventListener("click", function () {
    zeigeBereich(knopf.dataset.bereich);
  });
}

// Beim Start: Datumsleisten auf heute stellen und die Tagesansicht zeigen
waehleTag(heute());
zeigeBereich("heute");


// ===== Offline =====
// Den „Hausmeister“ (service-worker.js) anmelden, falls der Browser das kann
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}
