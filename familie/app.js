// ===== Speicher =====

// localStorage merkt sich Text im Browser – auch nach dem Schließen.
// JSON verwandelt Listen/Objekte in Text (und zurück).

// Etikett vor jedem Namen: So hat diese App eigene „Schubladen“ und
// berührt nie die Daten der Haupt-App (beide liegen unter derselben Adresse).
const VORSILBE = "familie-";

// Holt etwas aus dem Speicher. Gibt "standard" zurück, wenn noch nichts da ist.
function laden(schluessel, standard) {
  const text = localStorage.getItem(VORSILBE + schluessel);
  if (text === null) {
    return standard;
  }
  return JSON.parse(text);
}

// Legt etwas unter einem Namen (schluessel) im Speicher ab.
function speichern(schluessel, wert) {
  localStorage.setItem(VORSILBE + schluessel, JSON.stringify(wert));
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
  zeigeGym();
}

// Knöpfe in allen Leisten verbinden
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
//   { "2026-10-16": { dankbar: ["Sonne", "Kaffee"], fuerMich: ["Spaziergang"] } }
// Die Listen können beliebig lang sein: Mit „+“ kommt ein weiteres Feld dazu.
// (Ältere Einträge mit je drei Feldern funktionieren unverändert weiter.)

// Mindestens so viele Einträge bei „Was ich für mich getan habe“, damit der Kasten
// auf der Startseite grün wird. Die Dankbarkeits-Einträge sind ein Zusatz.
const TAGEBUCH_MIN_GELEISTET = 2;

// Ein leerer Tag: je ein leeres Feld
function leererTagebuchTag() {
  return { dankbar: [""], fuerMich: [""] };
}

// Einmalige Aufräumaktion: Alte Einträge hatten immer drei Felder, auch leere.
// Leere Felder am Ende fallen weg (ein Feld bleibt immer stehen).
if (!laden("tagebuch-bereinigt", false)) {
  const tagebuch = laden("tagebuch", {});
  for (const datum in tagebuch) {
    for (const art of ["dankbar", "fuerMich"]) {
      const liste = tagebuch[datum][art] || [""];
      while (liste.length > 1 && liste[liste.length - 1].trim() === "") {
        liste.pop();
      }
      tagebuch[datum][art] = liste;
    }
  }
  speichern("tagebuch", tagebuch);
  speichern("tagebuch-bereinigt", true);
}

// Baut die Felder für den gewählten Tag auf (so viele, wie Einträge gespeichert sind)
function zeigeTagebuch() {
  const tag = laden("tagebuch", {})[gewaehlterTag] || leererTagebuchTag();

  for (const art of ["dankbar", "fuerMich"]) {
    const behaelter = document.getElementById("tagebuch-" + art);
    behaelter.innerHTML = "";
    const eintraege = tag[art] && tag[art].length > 0 ? tag[art] : [""];

    eintraege.forEach(function (text, nr) {
      const feld = document.createElement("input");
      feld.className = "tagebuch-feld";
      feld.placeholder = (nr + 1) + ".";
      feld.value = text;
      feld.addEventListener("input", function () {
        speichereTagebuchFeld(art, nr, feld.value);
      });
      // Nach dem Tippen (Feld verlassen) das Archiv auffrischen – falls ein früherer Tag geändert wurde
      feld.addEventListener("change", zeigeTagebuchArchiv);
      behaelter.append(feld);
    });
  }
}

// Speichert den Text eines Feldes (art = "dankbar" oder "fuerMich", nr = Position in der Liste)
function speichereTagebuchFeld(art, nr, text) {
  const tagebuch = laden("tagebuch", {});
  const tag = tagebuch[gewaehlterTag] || leererTagebuchTag();
  if (!tag[art] || tag[art].length === 0) tag[art] = [""];
  tag[art][nr] = text;
  tagebuch[gewaehlterTag] = tag;
  speichern("tagebuch", tagebuch);
}

// „+“-Knopf: ein weiteres Feld unter der Liste. Ist das letzte Feld noch leer,
// springt der Cursor dorthin, statt ein weiteres leeres Feld anzulegen.
for (const knopf of document.querySelectorAll(".tagebuch-plus")) {
  knopf.addEventListener("click", function () {
    const art = knopf.dataset.art;
    const felder = document.querySelectorAll("#tagebuch-" + art + " .tagebuch-feld");

    if (felder.length > 0 && felder[felder.length - 1].value.trim() === "") {
      felder[felder.length - 1].focus();
      return;
    }

    const tagebuch = laden("tagebuch", {});
    const tag = tagebuch[gewaehlterTag] || leererTagebuchTag();
    if (!tag[art]) tag[art] = [""];
    tag[art].push("");
    tagebuch[gewaehlterTag] = tag;
    speichern("tagebuch", tagebuch);

    zeigeTagebuch();
    const neueFelder = document.querySelectorAll("#tagebuch-" + art + " .tagebuch-feld");
    neueFelder[neueFelder.length - 1].focus();
  });
}

// Zeigt alle früheren Tage, der neueste zuerst. Ein Tipp aufs Datum klappt ihn auf.
function zeigeTagebuchArchiv() {
  const tagebuch = laden("tagebuch", {});
  const archiv = document.getElementById("tagebuch-archiv");
  archiv.innerHTML = "";

  // Alle Tage mit mindestens einem Eintrag außer heute, vom neuesten zum ältesten
  // (Tage, an denen nur leere Felder angelegt wurden, bleiben außen vor)
  const hatEintrag = function (tag) {
    return [].concat(tag.dankbar || [], tag.fuerMich || []).some(function (z) { return z.trim() !== ""; });
  };
  const fruehereTage = Object.keys(tagebuch)
    .filter(function (datum) { return datum !== heute() && hatEintrag(tagebuch[datum]); })
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


// ===== Gym =====
// Zwei Einheiten im Wechsel, jeweils Mo/Mi/Fr: Gym A (Push + Beine) und Gym B (Pull + Beine).
//
// Der PLAN liegt auf dem Handy unter "gym-plan" und lässt sich in der App ändern (✏️).
// Im Code steht nur eine Standard-Vorlage mit Übungsnamen, keine Gewichte, denn der Code
// ist öffentlich. Gewichte kommen über den Import oder die Eingabe in der App.
//   gym-plan = { A: { name, untertitel, uebungen: [{ id, name, einheit, start }] }, B: { … } }
// "einheit" ist die Gewichtsart: "kg", "kg je Hand", "kg Scheiben gesamt", "nur Wdh." oder
// "nur abhaken" (z. B. Dehnen: kein Gewicht, nur ein Haken pro Training).
//
// Das TRAINING liegt unter "gym", ein Eintrag pro Tag:
//   { "2026-10-26": { einheit: "A", saetze: { beinpresse: [{ kg: 69, wdh: 10 }, { kg: 69, wdh: 10 }] },
//                     haken: { dehnen: true } } }
// Ein Satz zählt als gemacht, sobald er gespeichert ist (✓ getippt oder ein Wert geändert).

const GYM_START = "2026-10-26";      // Montag der Woche 1
const GYM_BLOCK_WOCHEN = 4;          // nach 4 Wochen erinnert die App ans Überprüfen des Plans
const GYM_PRO_WOCHE = 3;             // Mo, Mi, Fr
const GYM_SAETZE = 2;
const GYM_WDH_MIN = 6;               // darunter: Gewicht reduzieren
const GYM_WDH_ZIEL = 10;             // 2× so viele: Gewicht erhöhen
const GYM_EINHEITEN = ["A", "B"];
const GYM_KG_ARTEN = ["kg", "kg je Hand", "kg Scheiben gesamt", "nur Wdh.", "nur abhaken"];

function gymUebung(id, name, kgArt) {
  return { id: id, name: name, einheit: kgArt || "kg", start: null };
}

const GYM_STANDARD_PLAN = {
  A: { name: "Gym A", untertitel: "Push + Beine", uebungen: [
    gymUebung("beinpresse", "Beinpresse"),
    gymUebung("hip-thrust", "Hip Thrust", "kg Scheiben gesamt"),
    gymUebung("beinstrecker", "Beinstrecker"),
    gymUebung("brustpresse", "Brustpresse"),
    gymUebung("schulterpresse", "Schulterpresse (Kurzhanteln)", "kg je Hand"),
    gymUebung("seitheben", "Seitheben", "kg je Hand"),
    gymUebung("trizeps-kabel", "Trizepsdrücken (Kabel)"),
    gymUebung("pec-fly", "Pec Fly"),
    gymUebung("dehnen", "Dehnen", "nur abhaken")
  ] },
  B: { name: "Gym B", untertitel: "Pull + Beine", uebungen: [
    gymUebung("beinbeuger", "Beinbeuger (Prone Leg Curl)"),
    gymUebung("huefte-abduktion", "Hüftabduktion"),
    gymUebung("huefte-adduktion", "Hüftadduktion"),
    gymUebung("wadenheben", "Wadenheben"),
    gymUebung("latzug", "Latzug"),
    gymUebung("seated-row", "Seated Row"),
    gymUebung("rear-delt", "Rear Delt"),
    gymUebung("incline-curls", "Incline Curls", "kg je Hand"),
    gymUebung("hammer-curls", "Hammer Curls", "kg je Hand"),
    gymUebung("dehnen", "Dehnen", "nur abhaken")
  ] }
};

let gymBearbeiten = false;   // Plan-bearbeiten-Modus an?
let gymEditId = null;        // welche Übung gerade im Formular ist ("neu" = neue Übung)

// Der Plan: der gespeicherte, sonst eine Kopie der Standard-Vorlage
function ladeGymPlan() {
  return laden("gym-plan", null) || JSON.parse(JSON.stringify(GYM_STANDARD_PLAN));
}

function speichereGymPlan(plan) {
  speichern("gym-plan", plan);
}

// Einmalige Ergänzung (26.10.2026): „Dehnen“ als abhakbare Übung am Ende von Gym A und B,
// auch in einem Plan, der schon auf dem Handy gespeichert ist. Wer Dehnen später löscht,
// bekommt es nicht wieder zurück.
if (!laden("gym-dehnen-ergaenzt", false)) {
  const gespeichert = laden("gym-plan", null);
  if (gespeichert) {
    for (const einheit of GYM_EINHEITEN) {
      const uebungen = gespeichert[einheit].uebungen;
      if (!uebungen.some(function (u) { return u.id === "dehnen"; })) {
        uebungen.push(gymUebung("dehnen", "Dehnen", "nur abhaken"));
      }
    }
    speichereGymPlan(gespeichert);
  }
  speichern("gym-dehnen-ergaenzt", true);
}

function gymNurWdh(uebung) {
  return uebung.einheit === "nur Wdh.";
}

// Ganze Tage zwischen zwei Daten ("2026-10-26", "2026-10-29" → 3)
function tageZwischen(von, bis) {
  return Math.round((new Date(bis + "T00:00") - new Date(von + "T00:00")) / 86400000);
}

// "2026-10-26" → "26.10."
function punktDatum(datum) {
  return datum.slice(8, 10) + "." + datum.slice(5, 7) + ".";
}

// Welche Einheit schlägt der Plan für ein Datum vor? Mo/Mi/Fr ab Start, im Wochenwechsel:
// ungerade Wochen Mo A · Mi B · Fr A, gerade Wochen Mo B · Mi A · Fr B.
function gymVorschlag(datum) {
  if (datum < GYM_START) return null;
  const platz = [0, 2, 4].indexOf(wochentag(datum)); // Mo = 0, Mi = 2, Fr = 4
  if (platz === -1) return null;
  const woche = Math.floor(tageZwischen(GYM_START, datum) / 7) + 1;
  return (woche % 2 === 1 ? ["A", "B", "A"] : ["B", "A", "B"])[platz];
}

// Die Einheit eines Tages: selbst gewählt, sonst der Vorschlag des Plans (oder keine)
function gymEinheit(datum) {
  const eintrag = laden("gym", {})[datum];
  if (eintrag && GYM_EINHEITEN.includes(eintrag.einheit)) return eintrag.einheit;
  return gymVorschlag(datum);
}

function gymSatzGemacht(satz) {
  return Boolean(satz && satz.wdh > 0);
}

// Wurde an diesem Tag mindestens ein Satz gemacht?
function gymTrainiert(datum) {
  const eintrag = laden("gym", {})[datum];
  if (!eintrag) return false;
  return Object.values(eintrag.saetze || {}).some(function (saetze) {
    return saetze.some(gymSatzGemacht);
  });
}

// „Kraftwert“ eines Satzes: verbindet Gewicht und Wiederholungen zu einer Zahl,
// damit auch mehr Wiederholungen als Fortschritt zählen (Formel nach Epley).
function kraftwert(satz, nurWdh) {
  if (!satz || !(satz.wdh > 0)) return 0;
  if (nurWdh) return satz.wdh;
  if (!(satz.kg > 0)) return 0;
  return satz.kg * (1 + satz.wdh / 30);
}

// Bester Kraftwert einer Übung an einem Trainingstag
function besterWert(saetze, nurWdh) {
  return Math.max(0, ...(saetze || []).map(function (s) { return kraftwert(s, nurWdh); }));
}

// Das letzte Training VOR einem Datum, in dem diese Übung gemacht wurde: { datum, saetze } oder null
function letztesTraining(uebungId, vorDatum) {
  const gym = laden("gym", {});
  const daten = Object.keys(gym).filter(function (d) { return d < vorDatum; }).sort().reverse();
  for (const d of daten) {
    const saetze = (gym[d].saetze || {})[uebungId];
    if (saetze && saetze.some(gymSatzGemacht)) {
      return { datum: d, saetze: saetze };
    }
  }
  return null;
}

// "40,5" oder "40.5" → 40.5; leer → null
function leseZahl(text) {
  const zahl = parseFloat(String(text).replace(",", "."));
  return isNaN(zahl) ? null : zahl;
}

function satzText(satz, nurWdh) {
  if (!gymSatzGemacht(satz)) return "–";
  return nurWdh ? satz.wdh + " Wdh." : deutscheZahl(satz.kg) + " kg × " + satz.wdh;
}

// Merkt sich einen gemachten Satz für den gewählten Tag
function speichereSatz(uebungId, nr, kg, wdh) {
  const gym = laden("gym", {});
  const tag = gym[gewaehlterTag] || { einheit: gymEinheit(gewaehlterTag), saetze: {} };
  tag.saetze = tag.saetze || {};
  tag.saetze[uebungId] = tag.saetze[uebungId] || [];
  tag.saetze[uebungId][nr] = { kg: kg, wdh: wdh };
  gym[gewaehlterTag] = tag;
  speichern("gym", gym);

  // Training gemacht → Habit „Krafttraining“ abhaken (nur wenn dort noch nichts steht)
  if (!habitTag(gewaehlterTag)["krafttraining"]) {
    setzeHabit(gewaehlterTag, "krafttraining", "x");
  }
}

// Nimmt einen Satz wieder zurück (✓ nochmal getippt)
function loescheSatz(uebungId, nr) {
  const gym = laden("gym", {});
  const tag = gym[gewaehlterTag];
  if (!tag || !tag.saetze || !tag.saetze[uebungId]) return;
  tag.saetze[uebungId][nr] = null;
  if (!tag.saetze[uebungId].some(gymSatzGemacht)) {
    delete tag.saetze[uebungId];
  }
  speichern("gym", gym);
}

// Was steht in einem noch nicht gemachten Satz-Feld? Die Werte vom letzten Training,
// sonst das Startgewicht aus dem Plan (ohne Wiederholungen).
function gymVorschlagWerte(uebung, vorher, nr) {
  if (vorher) {
    const gemachte = vorher.saetze.filter(gymSatzGemacht);
    const satz = gymSatzGemacht(vorher.saetze[nr]) ? vorher.saetze[nr] : gemachte[gemachte.length - 1];
    return { kg: satz.kg, wdh: satz.wdh };
  }
  return { kg: typeof uebung.start === "number" ? uebung.start : null, wdh: null };
}

// Hinweis fürs nächste Mal: "erhoehen", "reduzieren" oder null
function gymHinweisArt(vorher) {
  if (!vorher) return null;
  const saetze = vorher.saetze;
  if (gymSatzGemacht(saetze[0]) && saetze[0].wdh < GYM_WDH_MIN) return "reduzieren";
  const ersteSaetze = saetze.slice(0, GYM_SAETZE);
  const geschafft = ersteSaetze.length >= GYM_SAETZE && ersteSaetze.every(function (s) {
    return gymSatzGemacht(s) && s.wdh >= GYM_WDH_ZIEL;
  });
  return geschafft ? "erhoehen" : null;
}


// --- Anzeige: Training des gewählten Tages ---

function zeigeGym() {
  const plan = ladeGymPlan();
  const einheit = gymEinheit(gewaehlterTag);
  const tag = laden("gym", {})[gewaehlterTag] || { saetze: {} };

  // Knöpfe „Gym A“ / „Gym B“
  for (const knopf of document.querySelectorAll("#gym-einheiten button")) {
    knopf.textContent = plan[knopf.dataset.einheit].name;
    knopf.classList.toggle("aktiv", knopf.dataset.einheit === einheit);
  }

  // Bearbeiten-Knöpfe
  document.getElementById("gym-bearbeiten-knopf").textContent = gymBearbeiten ? "Fertig" : "✏️ Plan bearbeiten";
  document.getElementById("gym-import").classList.toggle("versteckt", !gymBearbeiten);

  const liste = document.getElementById("gym-uebungen");
  liste.innerHTML = "";
  const hinweis = document.getElementById("gym-hinweis");

  const angezeigt = einheit || (gymBearbeiten ? "A" : null);
  if (!angezeigt) {
    hinweis.textContent = "Kein Trainingstag laut Plan (Mo/Mi/Fr ab " + punktDatum(GYM_START) +
      "). Wähle oben Gym A oder B, wenn du trotzdem trainierst.";
  } else {
    hinweis.textContent = plan[angezeigt].untertitel || "";
    if (gymBearbeiten) {
      zeigeGymBearbeiten(plan, angezeigt);
    } else {
      zeigeGymUebungen(plan, angezeigt, tag);
    }
  }
  zeigeGymFortschritt();
}

function zeigeGymUebungen(plan, einheit, tag) {
  const liste = document.getElementById("gym-uebungen");

  for (const uebung of plan[einheit].uebungen) {
    // Übungen ohne Gewicht (z. B. Dehnen): nur ein Haken pro Training
    if (uebung.einheit === "nur abhaken") {
      liste.append(gymHakenKarte(uebung, tag));
      continue;
    }

    const vorher = letztesTraining(uebung.id, gewaehlterTag);

    const karte = document.createElement("div");
    karte.className = "gym-uebung";
    const titel = document.createElement("strong");
    titel.textContent = uebung.name;
    karte.append(titel);

    // Kleine graue Zeile, nur wenn nötig: „je Hand“, „Scheiben gesamt“, „nur Wdh.“
    if (uebung.einheit !== "kg") {
      const metaZeile = document.createElement("span");
      metaZeile.className = "gym-meta";
      metaZeile.textContent = uebung.einheit.replace(/^kg /, "");
      karte.append(metaZeile);
    }

    // Hinweis nach dem letzten Training
    const art = gymNurWdh(uebung) ? null : gymHinweisArt(vorher);
    if (art) {
      const tipp = document.createElement("span");
      tipp.className = "gym-tipp";
      tipp.textContent = art === "erhoehen"
        ? "Letztes Mal 2× " + GYM_WDH_ZIEL + " geschafft → Gewicht erhöhen"
        : "Letztes Mal Satz 1 unter " + GYM_WDH_MIN + " Wdh. → Gewicht reduzieren";
      karte.append(tipp);
    }

    for (let nr = 0; nr < GYM_SAETZE; nr++) {
      karte.append(gymSatzZeile(uebung, nr, tag, vorher));
    }
    liste.append(karte);
  }
}

// Merkt sich einen Haken (z. B. Dehnen) für den gewählten Tag
function speichereHaken(uebungId, wert) {
  const gym = laden("gym", {});
  const tag = gym[gewaehlterTag] || { einheit: gymEinheit(gewaehlterTag), saetze: {} };
  tag.haken = tag.haken || {};
  if (wert) {
    tag.haken[uebungId] = true;
  } else {
    delete tag.haken[uebungId];
  }
  gym[gewaehlterTag] = tag;
  speichern("gym", gym);

  // Dehnen gemacht → auch das Habit „Dehnen/Haltung“ abhaken (nur wenn dort noch nichts steht)
  if (wert && uebungId === "dehnen" && !habitTag(gewaehlterTag)["dehnen"]) {
    setzeHabit(gewaehlterTag, "dehnen", "x");
    zeigeHabits();
  }
}

// Eine Übung zum Abhaken: Name links, ✓ rechts
function gymHakenKarte(uebung, tag) {
  let gemacht = Boolean((tag.haken || {})[uebung.id]);

  const karte = document.createElement("div");
  karte.className = "gym-uebung gym-haken-karte";
  const titel = document.createElement("strong");
  titel.textContent = uebung.name;
  const haken = document.createElement("button");
  haken.type = "button";
  haken.className = "gym-haken";
  haken.textContent = "✓";
  haken.title = "Gemacht";

  function aktualisiere() {
    karte.classList.toggle("gemacht", gemacht);
    haken.setAttribute("aria-pressed", gemacht ? "true" : "false");
  }
  haken.addEventListener("click", function () {
    gemacht = !gemacht;
    speichereHaken(uebung.id, gemacht);
    aktualisiere();
  });

  karte.append(titel, haken);
  aktualisiere();
  return karte;
}

// Eine Satz-Zeile: Nummer, kg, Wdh., ✓ und „Zuletzt“.
// Die Felder sind vorausgefüllt; der Satz zählt erst, wenn du ✓ tippst oder einen Wert änderst.
function gymSatzZeile(uebung, nr, tag, vorher) {
  const nurWdh = gymNurWdh(uebung);
  const gespeichert = ((tag.saetze || {})[uebung.id] || [])[nr];
  let gemacht = gymSatzGemacht(gespeichert);
  const werte = gemacht ? gespeichert : gymVorschlagWerte(uebung, vorher, nr);
  const alt = vorher ? vorher.saetze[nr] : null;

  const zeile = document.createElement("div");
  zeile.className = "gym-satz";
  const nummer = document.createElement("span");
  nummer.className = "gym-nummer";
  nummer.textContent = nr + 1;

  const feldBauen = function (platzhalter, modus, wert) {
    const eingabe = document.createElement("input");
    eingabe.type = "text"; // text + inputmode, damit das Komma auf dem iPhone klappt
    eingabe.inputMode = modus;
    eingabe.placeholder = platzhalter;
    eingabe.value = wert == null ? "" : deutscheZahl(wert);
    eingabe.addEventListener("input", beiAenderung);
    // Beim Antippen alles markieren, dann überschreibt die erste Ziffer den alten Wert
    eingabe.addEventListener("focus", function () { setTimeout(function () { eingabe.select(); }, 0); });
    return eingabe;
  };
  const kgFeld = nurWdh ? null : feldBauen("kg", "decimal", werte.kg);
  const wdhFeld = feldBauen("Wdh.", "numeric", werte.wdh);

  const haken = document.createElement("button");
  haken.type = "button";
  haken.className = "gym-haken";
  haken.textContent = "✓";
  haken.title = "Satz gemacht";
  haken.addEventListener("click", beiHaken);

  const letztes = document.createElement("span");
  letztes.className = "gym-letztes";

  zeile.append(nummer);
  if (kgFeld) zeile.append(kgFeld);
  zeile.append(wdhFeld, haken, letztes);

  // Aktuelle Werte aus den Feldern lesen
  function lies() {
    return { kg: kgFeld ? leseZahl(kgFeld.value) : null, wdh: leseZahl(wdhFeld.value) };
  }

  function istVollstaendig(w) {
    return w.wdh > 0 && (nurWdh || w.kg > 0);
  }

  // Aussehen an den Stand anpassen (gemacht = grün, sonst blasser Vorschlag)
  function aktualisiere() {
    zeile.classList.toggle("gemacht", gemacht);
    haken.setAttribute("aria-pressed", gemacht ? "true" : "false");
    for (const feld of [kgFeld, wdhFeld]) {
      if (feld) feld.classList.toggle("vorschlag", !gemacht);
    }
    let text = gymSatzGemacht(alt) ? "Zuletzt: " + satzText(alt, nurWdh) : "";
    const besser = gemacht && gymSatzGemacht(alt) && kraftwert(lies(), nurWdh) > kraftwert(alt, nurWdh);
    if (besser) text += " ↑";
    letztes.textContent = text;
    letztes.classList.toggle("besser", Boolean(besser));
    zeigeGymFortschritt();
  }

  // Wert getippt: vollständig → Satz gilt als gemacht; sonst (war gemacht) wieder zurücknehmen
  function beiAenderung() {
    const w = lies();
    if (istVollstaendig(w)) {
      speichereSatz(uebung.id, nr, w.kg, w.wdh);
      gemacht = true;
    } else if (gemacht) {
      loescheSatz(uebung.id, nr);
      gemacht = false;
    }
    aktualisiere();
  }

  // ✓: Satz bestätigen oder wieder zurücknehmen
  function beiHaken() {
    if (gemacht) {
      loescheSatz(uebung.id, nr);
      gemacht = false;
      aktualisiere();
      return;
    }
    const w = lies();
    if (!(w.wdh > 0)) { wdhFeld.focus(); return; }
    if (!nurWdh && !(w.kg > 0)) { kgFeld.focus(); return; }
    speichereSatz(uebung.id, nr, w.kg, w.wdh);
    gemacht = true;
    aktualisiere();
  }

  aktualisiere();
  return zeile;
}

// Einheit-Knöpfe: Auswahl für den gewählten Tag speichern
for (const knopf of document.querySelectorAll("#gym-einheiten button")) {
  knopf.addEventListener("click", function () {
    const gym = laden("gym", {});
    const tag = gym[gewaehlterTag] || { saetze: {} };
    tag.einheit = knopf.dataset.einheit;
    gym[gewaehlterTag] = tag;
    speichern("gym", gym);
    zeigeGym();
  });
}


// --- Plan bearbeiten (✏️ ▲ ▼ ✕ +) ---

function zeigeGymBearbeiten(plan, einheit) {
  const liste = document.getElementById("gym-uebungen");
  const uebungen = plan[einheit].uebungen;

  uebungen.forEach(function (uebung, i) {
    if (gymEditId === uebung.id) {
      liste.append(gymEditForm(einheit, uebung));
      return;
    }

    const zeile = document.createElement("div");
    zeile.className = "gym-edit-zeile";

    const knopf = function (text, titel, aktion, gesperrt) {
      const k = document.createElement("button");
      k.type = "button";
      k.textContent = text;
      k.title = titel;
      k.disabled = Boolean(gesperrt);
      k.addEventListener("click", aktion);
      return k;
    };
    const name = document.createElement("span");
    name.className = "gym-edit-name";
    name.textContent = uebung.name;

    zeile.append(
      knopf("▲", "Nach oben", function () { verschiebeGymUebung(einheit, uebung.id, -1); }, i === 0),
      knopf("▼", "Nach unten", function () { verschiebeGymUebung(einheit, uebung.id, 1); }, i === uebungen.length - 1),
      name,
      knopf("✏️", "Ändern", function () { gymEditId = uebung.id; zeigeGym(); }),
      knopf("✕", "Entfernen", function () { entferneGymUebung(einheit, uebung.id); })
    );
    liste.append(zeile);
  });

  if (gymEditId === "neu") {
    liste.append(gymEditForm(einheit, null));
  } else {
    const neuKnopf = document.createElement("button");
    neuKnopf.type = "button";
    neuKnopf.className = "nebenknopf";
    neuKnopf.textContent = "+ Übung hinzufügen";
    neuKnopf.addEventListener("click", function () { gymEditId = "neu"; zeigeGym(); });
    liste.append(neuKnopf);
  }
}

function verschiebeGymUebung(einheit, id, richtung) {
  const plan = ladeGymPlan();
  const liste = plan[einheit].uebungen;
  const i = liste.findIndex(function (u) { return u.id === id; });
  const j = i + richtung;
  if (i === -1 || j < 0 || j >= liste.length) return;
  const gemerkt = liste[i];
  liste[i] = liste[j];
  liste[j] = gemerkt;
  speichereGymPlan(plan);
  zeigeGym();
}

function entferneGymUebung(einheit, id) {
  const plan = ladeGymPlan();
  const uebung = plan[einheit].uebungen.find(function (u) { return u.id === id; });
  if (!confirm("„" + uebung.name + "“ aus dem Plan entfernen? Bisherige Einträge bleiben gespeichert.")) return;
  plan[einheit].uebungen = plan[einheit].uebungen.filter(function (u) { return u.id !== id; });
  speichereGymPlan(plan);
  zeigeGym();
}

// Formular für eine Übung. uebung = null → neue Übung anlegen
function gymEditForm(einheit, uebung) {
  const w = uebung || { name: "", einheit: "kg", typ: "iso", start: null, notiz: "" };
  const form = document.createElement("form");
  form.className = "gym-edit-form";

  const mitBeschriftung = function (text, element) {
    const label = document.createElement("label");
    const beschriftung = document.createElement("span");
    beschriftung.textContent = text;
    label.append(beschriftung, element);
    return label;
  };
  const eingabe = function (wert, platzhalter, modus) {
    const feld = document.createElement("input");
    feld.type = "text";
    if (modus) feld.inputMode = modus;
    feld.placeholder = platzhalter;
    feld.value = wert;
    return feld;
  };
  const auswahl = function (optionen, gewaehlt) {
    const feld = document.createElement("select");
    for (const wert in optionen) {
      const option = document.createElement("option");
      option.value = wert;
      option.textContent = optionen[wert];
      feld.append(option);
    }
    feld.value = gewaehlt;
    return feld;
  };
  const arten = {};
  for (const art of GYM_KG_ARTEN) arten[art] = art;

  const nameFeld = eingabe(w.name, "Name der Übung");
  nameFeld.required = true;
  const startFeld = eingabe(w.start == null ? "" : deutscheZahl(w.start), "z. B. 40", "decimal");
  const artFeld = auswahl(arten, w.einheit);

  const knoepfe = document.createElement("div");
  knoepfe.className = "gym-edit-knoepfe";
  const speichernKnopf = document.createElement("button");
  speichernKnopf.type = "submit";
  speichernKnopf.textContent = "Speichern";
  const abbrechenKnopf = document.createElement("button");
  abbrechenKnopf.type = "button";
  abbrechenKnopf.textContent = "Abbrechen";
  abbrechenKnopf.addEventListener("click", function () { gymEditId = null; zeigeGym(); });
  knoepfe.append(speichernKnopf, abbrechenKnopf);

  form.append(
    mitBeschriftung("Name", nameFeld),
    mitBeschriftung("Startgewicht (gilt bis zum ersten Training)", startFeld),
    mitBeschriftung("Gewichtsart", artFeld),
    knoepfe
  );

  form.addEventListener("submit", function (ereignis) {
    ereignis.preventDefault();
    const name = nameFeld.value.trim();
    if (name === "") return;
    const daten = {
      name: name,
      einheit: artFeld.value,
      start: leseZahl(startFeld.value)
    };
    const plan = ladeGymPlan();
    if (uebung) {
      Object.assign(plan[einheit].uebungen.find(function (u) { return u.id === uebung.id; }), daten);
    } else {
      plan[einheit].uebungen.push(Object.assign({ id: "u" + Date.now() }, daten)); // Date.now() = eindeutige Zahl
    }
    speichereGymPlan(plan);
    gymEditId = null;
    zeigeGym();
  });
  return form;
}

document.getElementById("gym-bearbeiten-knopf").addEventListener("click", function () {
  gymBearbeiten = !gymBearbeiten;
  gymEditId = null;
  zeigeGym();
});


// --- Plan und Training importieren ---
// Der Import-Code (beginnt mit GYMPLAN1.) enthält Plan, Startgewichte und bisherige Trainings.
// So stehen deine Gewichte nie im öffentlichen Code, sondern kommen nur auf dein Gerät.

// Prüft und säubert den Inhalt des Codes. Wirft einen Fehler, wenn etwas nicht passt.
function bereinigeGymImport(daten) {
  if (!daten || daten.v !== 1 || !daten.plan) throw new Error("Kein Gym-Code");
  const sauber = { plan: {}, training: {} };

  for (const einheit of GYM_EINHEITEN) {
    const roh = daten.plan[einheit];
    if (!roh || !Array.isArray(roh.uebungen)) throw new Error("Einheit " + einheit + " fehlt");
    sauber.plan[einheit] = {
      name: String(roh.name || "Gym " + einheit),
      untertitel: String(roh.untertitel || ""),
      uebungen: roh.uebungen.map(function (u) {
        if (!u || !u.id || !u.name) throw new Error("Übung ohne Namen");
        return {
          id: String(u.id),
          name: String(u.name),
          einheit: GYM_KG_ARTEN.includes(u.einheit) ? u.einheit : "kg",
          start: typeof u.start === "number" ? u.start : null
        };
      })
    };
  }

  // „Dehnen“ gehört zu jeder Einheit; fehlt es im Code, wird es angehängt
  for (const einheit of GYM_EINHEITEN) {
    const uebungen = sauber.plan[einheit].uebungen;
    if (!uebungen.some(function (u) { return u.id === "dehnen"; })) {
      uebungen.push(gymUebung("dehnen", "Dehnen", "nur abhaken"));
    }
  }

  for (const datum in daten.training || {}) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(datum)) continue;
    const tag = daten.training[datum];
    const saetze = {};
    for (const id in tag.saetze || {}) {
      saetze[id] = tag.saetze[id].map(function (s) {
        return s && s.wdh > 0 ? { kg: typeof s.kg === "number" ? s.kg : null, wdh: Number(s.wdh) } : null;
      });
    }
    sauber.training[datum] = { einheit: GYM_EINHEITEN.includes(tag.einheit) ? tag.einheit : null, saetze: saetze };
  }
  return sauber;
}

let gymImportErgebnis = null; // merkt sich das Ergebnis zwischen „Prüfen“ und „Übernehmen“

document.getElementById("gym-import-pruefen").addEventListener("click", function () {
  const meldung = document.getElementById("gym-import-meldung");
  const uebernehmen = document.getElementById("gym-import-uebernehmen");
  try {
    const daten = leseCode(document.getElementById("gym-import-text").value, "GYMPLAN1.");
    gymImportErgebnis = bereinigeGymImport(daten);
    const p = gymImportErgebnis.plan;
    const tage = Object.keys(gymImportErgebnis.training);
    meldung.textContent = "Erkannt: " + p.A.name + " mit " + p.A.uebungen.length + " Übungen, " +
      p.B.name + " mit " + p.B.uebungen.length + " Übungen, " + tage.length +
      (tage.length === 1 ? " Trainingstag" : " Trainingstage") +
      (tage.length > 0 ? " (" + tage.map(punktDatum).join(", ") + ")" : "") +
      ". Schon gemachte Sätze in der App bleiben erhalten.";
    uebernehmen.classList.remove("versteckt");
  } catch (fehler) {
    meldung.textContent = "Das konnte ich nicht lesen. Bitte den ganzen Code ab „GYMPLAN1.“ einfügen.";
    uebernehmen.classList.add("versteckt");
  }
});

document.getElementById("gym-import-uebernehmen").addEventListener("click", function () {
  if (laden("gym-plan", null) && !confirm("Dein bisheriger Plan wird durch den importierten ersetzt. Fortfahren?")) return;
  speichereGymPlan(gymImportErgebnis.plan);

  const gym = laden("gym", {});
  for (const datum in gymImportErgebnis.training) {
    const neu = gymImportErgebnis.training[datum];
    const tag = gym[datum] || { einheit: neu.einheit, saetze: {} };
    tag.saetze = tag.saetze || {};
    tag.einheit = tag.einheit || neu.einheit;
    for (const id in neu.saetze) {
      const schonDa = (tag.saetze[id] || []).some(gymSatzGemacht);
      if (!schonDa) tag.saetze[id] = neu.saetze[id]; // Eigene Einträge in der App haben Vorrang
    }
    gym[datum] = tag;
  }
  speichern("gym", gym);

  // Importierte Trainingstage haken auch das Habit „Krafttraining“ ab
  for (const datum in gymImportErgebnis.training) {
    if (gymTrainiert(datum) && !habitTag(datum)["krafttraining"]) setzeHabit(datum, "krafttraining", "x");
  }

  document.getElementById("gym-import-meldung").textContent = "Fertig importiert ✓";
  document.getElementById("gym-import-uebernehmen").classList.add("versteckt");
  document.getElementById("gym-import-text").value = "";
  zeigeHabits();
  zeigeGym();
  zeigeHeute();
});


// --- Fortschritt: Plan-Ring, Gesamtkurve, Linie pro Übung ---
// Für jede Übung: Kraftwert beim ersten Training = Startwert (0 %).
// Gesamtkurve: pro Trainingstag der Durchschnitt aller dort trainierten Übungen in % seit Start.

function gymFortschrittDaten() {
  const gym = laden("gym", {});
  const plan = ladeGymPlan();
  const verlauf = {};  // uebungId → [{ datum, wert }]
  const punkte = [];   // { datum, einheit, prozent }

  for (const datum of Object.keys(gym).sort()) {
    const tag = gym[datum];
    const prozente = [];
    let tagEinheit = null;
    for (const einheit of GYM_EINHEITEN) {
      for (const uebung of plan[einheit].uebungen) {
        const wert = besterWert((tag.saetze || {})[uebung.id], gymNurWdh(uebung));
        if (wert <= 0) continue;
        verlauf[uebung.id] = verlauf[uebung.id] || [];
        verlauf[uebung.id].push({ datum: datum, wert: wert });
        prozente.push((wert / verlauf[uebung.id][0].wert - 1) * 100);
        tagEinheit = tagEinheit || einheit;
      }
    }
    if (prozente.length > 0) {
      const schnitt = prozente.reduce(function (a, b) { return a + b; }, 0) / prozente.length;
      punkte.push({
        datum: datum,
        einheit: GYM_EINHEITEN.includes(tag.einheit) ? tag.einheit : tagEinheit,
        prozent: schnitt
      });
    }
  }
  return { verlauf: verlauf, punkte: punkte };
}

// Prozent schön: 12.34 → "+12 %", -3 → "−3 %"
function prozentText(p) {
  const r = Math.round(p);
  return (r > 0 ? "+" : r < 0 ? "−" : "±") + Math.abs(r) + " %";
}

const SVG_NS = "http://www.w3.org/2000/svg";

function svgElement(name, eigenschaften) {
  const element = document.createElementNS(SVG_NS, name);
  for (const schluessel in eigenschaften) element.setAttribute(schluessel, eigenschaften[schluessel]);
  return element;
}

// Der Plan-Ring: z. B. 5 von 12 Einheiten
function gymRing(anzahl, von) {
  const umfang = 2 * Math.PI * 40;
  const anteil = Math.min(anzahl, von) / von;
  const svg = svgElement("svg", { viewBox: "0 0 100 100", class: "gym-ring" });
  svg.append(
    svgElement("circle", { cx: 50, cy: 50, r: 40, class: "ring-spur" }),
    svgElement("circle", {
      cx: 50, cy: 50, r: 40, class: "ring-fuellung",
      "stroke-dasharray": umfang, "stroke-dashoffset": umfang * (1 - anteil),
      transform: "rotate(-90 50 50)"                   // Start oben statt rechts
    })
  );
  const zahl = svgElement("text", { x: 50, y: 56, class: "ring-zahl", "text-anchor": "middle" });
  zahl.textContent = anzahl + "/" + von;
  svg.append(zahl);
  return svg;
}

// Zeichnet die Gesamtkurve als SVG (selbst gezeichnet, ohne Bibliothek)
function gymKurve(punkte) {
  const breite = 320, hoehe = 140, rand = 28;
  const svg = svgElement("svg", { viewBox: "0 0 " + breite + " " + hoehe, class: "gym-kurve" });

  // y-Bereich: mindestens −5 % bis +5 %, damit eine flache Kurve nicht übertrieben wirkt
  const werte = punkte.map(function (p) { return p.prozent; });
  const oben = Math.max(5, ...werte), unten = Math.min(-5, ...werte);
  const x = function (i) {
    return punkte.length === 1 ? breite / 2 : rand + i * (breite - rand - 10) / (punkte.length - 1);
  };
  const y = function (p) { return 10 + (oben - p) / (oben - unten) * (hoehe - 30); };
  const text = function (inhalt, tx, ty) {
    const t = svgElement("text", { x: tx, y: ty, class: "achse" });
    t.textContent = inhalt;
    svg.append(t);
  };

  // Null-Linie = Startniveau, dazu Beschriftung oben und bei 0
  svg.append(svgElement("line", { x1: rand, y1: y(0), x2: breite - 4, y2: y(0), class: "nulllinie" }));
  text("0 %", 0, y(0) + 4);
  text(prozentText(oben), 0, y(oben) + 4);

  // Verbindungslinie und Punkte (Farbe je Einheit)
  svg.append(svgElement("polyline", {
    points: punkte.map(function (p, i) { return x(i) + "," + y(p.prozent); }).join(" "),
    class: "verlauf"
  }));
  punkte.forEach(function (p, i) {
    svg.append(svgElement("circle", { cx: x(i), cy: y(p.prozent), r: 4.5, class: "punkt " + p.einheit }));
  });

  // Datum unter erstem und letztem Punkt
  text(punktDatum(punkte[0].datum), x(0) - 14, hoehe - 4);
  if (punkte.length > 1) text(punktDatum(punkte[punkte.length - 1].datum), x(punkte.length - 1) - 30, hoehe - 4);
  return svg;
}

// Kleine Verlaufslinie einer Übung (ohne Achsen): werte = Kraftwerte pro Training
function gymLinie(werte) {
  const breite = 120, hoehe = 28;
  const svg = svgElement("svg", { viewBox: "0 0 " + breite + " " + hoehe, class: "gym-linie" });
  const kleinster = Math.min(...werte), groesster = Math.max(...werte);
  const x = function (i) { return werte.length === 1 ? breite / 2 : 6 + i * (breite - 12) / (werte.length - 1); };
  const y = function (w) { return groesster === kleinster ? hoehe / 2 : (hoehe - 5) - (w - kleinster) / (groesster - kleinster) * (hoehe - 10); };

  if (werte.length > 1) {
    svg.append(svgElement("polyline", {
      points: werte.map(function (w, i) { return x(i) + "," + y(w); }).join(" "),
      class: "linie"
    }));
  }
  svg.append(svgElement("circle", { cx: x(werte.length - 1), cy: y(werte[werte.length - 1]), r: 3, class: "linie-punkt" }));
  return svg;
}

function zeigeGymFortschritt() {
  const inhalt = document.getElementById("gym-fortschritt-inhalt");
  inhalt.innerHTML = "";
  const gym = laden("gym", {});
  const plan = ladeGymPlan();
  const daten = gymFortschrittDaten();

  // 1. Plan-Ring für die aktuelle Woche (Mo–So): x von 3 Einheiten
  const wochenStart = montagVon(heute());
  const wochenEnde = verschiebeTag(wochenStart, 6);
  const absolviert = Object.keys(gym).filter(function (d) {
    return d >= wochenStart && d <= wochenEnde && gymTrainiert(d);
  }).length;
  const wochenNr = heute() < GYM_START ? 0 : Math.floor(tageZwischen(GYM_START, heute()) / 7) + 1;

  // Der 4-Wochen-Block wird nur noch für die Erinnerung „Plan überprüfen“ gebraucht
  const blockNr = Math.max(0, Math.floor(tageZwischen(GYM_START, heute()) / (7 * GYM_BLOCK_WOCHEN)));
  const blockStart = verschiebeTag(GYM_START, blockNr * 7 * GYM_BLOCK_WOCHEN);

  const ringZeile = document.createElement("div");
  ringZeile.className = "gym-ring-zeile";
  const ringText = document.createElement("div");
  const wocheText = document.createElement("strong");
  wocheText.textContent = wochenNr === 0 ? "Start am " + punktDatum(GYM_START) : "Woche " + wochenNr;
  const zeitraum = document.createElement("span");
  zeitraum.textContent = punktDatum(wochenStart) + " – " + punktDatum(wochenEnde);
  const zaehler = document.createElement("span");
  zaehler.textContent = absolviert + " von " + GYM_PRO_WOCHE + " Einheiten";
  // Alle Einheiten seit Beginn, ohne Begrenzung
  const gesamt = Object.keys(gym).filter(gymTrainiert).length;
  const gesamtZeile = document.createElement("span");
  gesamtZeile.textContent = "Insgesamt: " + gesamt + (gesamt === 1 ? " Einheit" : " Einheiten");
  ringText.append(wocheText, zeitraum, zaehler, gesamtZeile);
  ringZeile.append(gymRing(absolviert, GYM_PRO_WOCHE), ringText);
  inhalt.append(ringZeile);

  // 2. Nach dem Block: Erinnerung, den Plan zu überprüfen (bis du sie wegtippst)
  const pruefDatum = verschiebeTag(blockStart, 7 * GYM_BLOCK_WOCHEN - 3); // Freitag der letzten Woche
  if (heute() >= pruefDatum && laden("gym-review-ok", -1) < blockNr) {
    const pruefen = document.createElement("p");
    pruefen.className = "frueherer-tag";
    pruefen.append(GYM_BLOCK_WOCHEN + " Wochen geschafft: Zeit, den Plan zu überprüfen (✏️ Plan bearbeiten). ");
    const erledigt = document.createElement("button");
    erledigt.textContent = "Erledigt";
    erledigt.addEventListener("click", function () {
      speichern("gym-review-ok", blockNr);
      zeigeGymFortschritt();
    });
    pruefen.append(erledigt);
    inhalt.append(pruefen);
  }

  if (daten.punkte.length === 0) {
    const leer = document.createElement("p");
    leer.className = "hinweis";
    leer.textContent = "Sobald du Sätze mit ✓ bestätigt hast, siehst du hier deinen Fortschritt.";
    inhalt.append(leer);
    return;
  }

  // 3. Gesamtkurve
  const kopf = document.createElement("p");
  kopf.append("Gesamt (Ø aller Übungen): ");
  const zahl = document.createElement("strong");
  zahl.textContent = prozentText(daten.punkte[daten.punkte.length - 1].prozent);
  kopf.append(zahl, " seit Start");
  const legende = document.createElement("p");
  legende.className = "hinweis gym-legende";
  legende.innerHTML = '<span class="punkt-legende A"></span>Gym A <span class="punkt-legende B"></span>Gym B';
  inhalt.append(kopf, gymKurve(daten.punkte), legende);

  // 4. Eine kleine Linie pro Übung, nach Einheit gruppiert
  for (const einheit of GYM_EINHEITEN) {
    const uebungen = plan[einheit].uebungen.filter(function (u) { return daten.verlauf[u.id]; });
    if (uebungen.length === 0) continue;
    const titel = document.createElement("h3");
    titel.textContent = plan[einheit].name + (plan[einheit].untertitel ? " · " + plan[einheit].untertitel : "");
    inhalt.append(titel);

    for (const uebung of uebungen) {
      const werte = daten.verlauf[uebung.id].map(function (v) { return v.wert; });
      const prozent = (werte[werte.length - 1] / werte[0] - 1) * 100;
      const zeile = document.createElement("div");
      zeile.className = "gym-fortschritt-zeile";
      const name = document.createElement("span");
      name.textContent = uebung.name;
      const wert = document.createElement("span");
      wert.className = "wert" + (prozent < 0 ? " minus" : "");
      wert.textContent = werte.length > 1 ? prozentText(prozent) : "neu";
      zeile.append(name, gymLinie(werte), wert);
      inhalt.append(zeile);
    }
  }
}


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

  let zeile = stand.map(function (z) {
    return z.name + " " + z.ist + "/" + z.soll + (z.ist >= z.soll ? " (erfüllt)" : "");
  }).join(" · ");

  // Gelaufene Kilometer dieser Woche laut Strava (aus dem neuesten Mail-Code)
  const code = neuesterAppCode();
  if (code && code.strava) {
    const km = code.strava
      .filter(function (e) { return e.typ === "laufen" && e.datum >= montagVon(heute()); })
      .reduce(function (summe, e) { return summe + (e.km || 0); }, 0);
    if (km > 0) zeile += " · " + deutscheZahl(Math.round(km * 10) / 10) + " km (Strava)";
  }

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
  kasten.className = "heute-kasten neutral";

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


// --- App-Code aus der Mail ---
// Die Morgen- und Abend-Mail enthalten eine Zeile „TAGESAPP1.…“. Dahinter steckt
// JSON (Termine, Wetter, Geburtstage, Antwort-Mails, Strava, Wecker), verpackt in
// Base64 – einer Schreibweise nur aus Buchstaben, Zahlen, - und _, damit es eine
// einzige Zeile ohne Leerzeichen ist. Gespeichert wird nur auf diesem Gerät.
// Das genaue Format steht in APP-CODE.md.

// Base64url → normales Base64 → Bytes → Text (UTF-8, damit Umlaute stimmen) → JSON
function entpacke(code) {
  let base64 = code.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4 !== 0) base64 += "=";
  const zeichen = atob(base64);
  const bytes = Uint8Array.from(zeichen, function (z) { return z.charCodeAt(0); });
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}

// Liest eine Code-Zeile mit dem Anfang „praefix“ (z. B. "TAGESAPP1.") aus einem Text.
// Gibt das JSON-Objekt dahinter zurück oder wirft einen Fehler.
function leseCode(text, praefix) {
  // Unsichtbare Zeichen entfernen, die Mail-Apps in lange Wörter einbauen
  // (weiches Trennzeichen, Null-Breite-Leerzeichen u. Ä.)
  text = text.replace(/[­​-‍⁠﻿]/g, "").replace(/ /g, " ");
  const start = text.indexOf(praefix);
  if (start === -1) throw new Error("Kein Code gefunden");

  // Manche Mail-Apps brechen lange Zeilen um. Darum sammeln wir den Code-Anfang und
  // die direkt folgenden Zeilen, die nur aus Code-Zeichen bestehen …
  const zeilen = text.slice(start + praefix.length).split(/\r?\n/);
  const stuecke = [];
  for (const zeile of zeilen) {
    const teil = zeile.trim();
    if (!/^[A-Za-z0-9_-]+$/.test(teil)) {
      if (stuecke.length === 0) stuecke.push(teil.match(/^[A-Za-z0-9_-]*/)[0]);
      break;
    }
    stuecke.push(teil);
  }

  // … und probieren dann von der längsten Variante abwärts, welche sich entpacken lässt.
  // So stört es nicht, wenn direkt darunter z. B. ein einzelnes Wort steht.
  for (let anzahl = stuecke.length; anzahl >= 1; anzahl--) {
    try {
      return entpacke(stuecke.slice(0, anzahl).join(""));
    } catch (fehler) {
      continue; // passt nicht – eine Zeile weniger probieren
    }
  }
  throw new Error("Code beschädigt");
}

// Liest den App-Code der Morgen-/Abend-Mail
function leseAppCode(text) {
  const daten = leseCode(text, "TAGESAPP1.");
  if (daten.v !== 1 || (daten.art !== "morgen" && daten.art !== "abend")) {
    throw new Error("Unbekannte Code-Version");
  }
  return daten;
}

// Welches Habit hakt eine Strava-Einheit ab?
const STRAVA_HABIT = { laufen: "laufen", kraft: "krafttraining", schwimmen: "schwimmen" };

// Speichert den Code und übernimmt Strava-Einheiten und Weckzeit
function uebernehmeAppCode(daten) {
  const mail = laden("mail-daten", {});
  mail[daten.art] = daten;
  speichern("mail-daten", mail);

  // Strava: Habit für den Tag abhaken – aber nie etwas überschreiben, was du selbst eingetragen hast
  const alleTage = laden("habits-tage", {});
  for (const einheit of daten.strava || []) {
    const id = STRAVA_HABIT[einheit.typ];
    if (!id || einheit.datum > heute()) continue;
    alleTage[einheit.datum] = alleTage[einheit.datum] || {};
    if (!alleTage[einheit.datum][id]) {
      alleTage[einheit.datum][id] = "x";
    }
  }
  speichern("habits-tage", alleTage);

  // Abends bringt die Mail die passende Weckzeit für morgen mit
  if (daten.art === "abend" && daten.wecker) {
    speichern("wecker", daten.wecker);
  }
}

// Der neueste Code (morgens oder abends), z. B. für die Strava-Kilometer
function neuesterAppCode() {
  const mail = laden("mail-daten", {});
  const codes = [mail.morgen, mail.abend].filter(Boolean);
  codes.sort(function (a, b) { return a.erstellt < b.erstellt ? 1 : -1; });
  return codes[0] || null;
}

// "2026-10-18" → "Sa., 18.10."
function kurzesDatum(datum) {
  return new Date(datum + "T00:00").toLocaleDateString("de-DE", {
    weekday: "short", day: "2-digit", month: "2-digit"
  });
}

// Ein Kasten nur zum Lesen (kein Knopf)
function infoKasten(titel, text, eintraege) {
  const kasten = document.createElement("div");
  kasten.className = "heute-kasten neutral";
  const ueberschrift = document.createElement("strong");
  ueberschrift.textContent = titel;
  const beschreibung = document.createElement("span");
  beschreibung.textContent = text;
  kasten.append(ueberschrift, beschreibung, eintragsListe(eintraege));
  return kasten;
}

function wetterText(wetter) {
  if (!wetter) return "";
  return wetter.ort + ": " + wetter.min + "–" + wetter.max + " °C · Regen " + wetter.regen + " %";
}

function terminZeilen(termine) {
  return (termine || []).map(function (t) {
    const zeit = t.start ? t.start + (t.ende ? "–" + t.ende : "") + " " : "Ganztägig: ";
    return (t.ueberschneidung ? "Achtung: Überschneidung – " : "") + zeit + t.titel;
  });
}

// Kasten „Heute laut Mail“ (Morgen-Code von heute)
function mailHeuteKasten() {
  const code = laden("mail-daten", {}).morgen;
  if (!code || code.fuer !== heute()) return null;

  const zeilen = terminZeilen(code.termine);
  for (const m of code.antwortMails || []) {
    zeilen.push("Antworten: " + m.von + " – " + m.betreff);
  }
  for (const g of code.geburtstage || []) {
    zeilen.push("Geburtstag " + kurzesDatum(g.datum) + ": " + g.name);
  }
  if (zeilen.length === 0) zeilen.push("Keine Termine heute");

  return infoKasten("📬 Heute laut Mail · Stand " + code.erstellt.slice(11, 16), wetterText(code.wetter), zeilen);
}

// Kasten „Morgen laut Mail“ (Abend-Code, der sich auf morgen bezieht)
function mailMorgenKasten() {
  const code = laden("mail-daten", {}).abend;
  if (!code || code.fuer !== verschiebeTag(heute(), 1)) return null;

  const zeilen = terminZeilen(code.termine);
  for (const g of code.geburtstage || []) {
    zeilen.push("Geburtstag: " + g.name + " – Nachricht oder Geschenk bereit?");
  }
  if (zeilen.length === 0) zeilen.push("Keine Termine morgen");

  return infoKasten("🌙 Morgen laut Mail · Stand " + code.erstellt.slice(11, 16), wetterText(code.wetter), zeilen);
}

// Knopf „Aus Mail einfügen“: erst die Zwischenablage versuchen, sonst ein Textfeld zeigen
function zeigeMailMeldung(text, istFehler) {
  const meldung = document.getElementById("mailcode-meldung");
  meldung.textContent = text;
  meldung.classList.toggle("fehler", Boolean(istFehler));
  if (text) {
    document.activeElement.blur(); // Tastatur schließen, damit die Meldung nicht verdeckt ist
    meldung.scrollIntoView({ block: "center", behavior: "smooth" });
  }
}

function verarbeiteMailText(text) {
  const daten = leseAppCode(text); // wirft einen Fehler, wenn der Text keinen gültigen Code enthält
  uebernehmeAppCode(daten);
  document.getElementById("mailcode-feld").classList.add("versteckt");
  document.getElementById("mailcode-text").value = "";
  zeigeMailMeldung("Übernommen ✓ " + (daten.art === "morgen" ? "Morgen" : "Abend") +
    "-Mail von " + daten.erstellt.slice(11, 16) + " Uhr");
  zeigeHabits();
  zeigeHeute();
}

document.getElementById("mailcode-knopf").addEventListener("click", async function () {
  try {
    // Zwischenablage lesen – iOS fragt dabei kurz „Einfügen?“
    const text = await navigator.clipboard.readText();
    verarbeiteMailText(text);
  } catch (fehler) {
    // Keine Erlaubnis oder kein Code in der Zwischenablage → zum Einfügen per Hand
    document.getElementById("mailcode-feld").classList.remove("versteckt");
    zeigeMailMeldung("");
  }
});

document.getElementById("mailcode-uebernehmen").addEventListener("click", function () {
  try {
    verarbeiteMailText(document.getElementById("mailcode-text").value);
  } catch (fehler) {
    const text = document.getElementById("mailcode-text").value;
    let hinweis;
    if (text.trim() === "") {
      hinweis = "Das Feld ist leer. Erst den Code aus der Mail kopieren und hier einfügen.";
    } else if (!text.includes("TAGESAPP1.")) {
      hinweis = "Kein App-Code gefunden. Er beginnt mit „TAGESAPP1.“ und steht ganz unten in der Mail unter „📲 APP-CODE“.";
    } else {
      hinweis = "Der Code ist unvollständig (" + text.length + " Zeichen eingefügt). Bitte die ganze Zeile ab „TAGESAPP1.“ kopieren.";
    }
    zeigeMailMeldung(hinweis, true);
  }
});


// --- Startseite zusammenbauen ---

// Mindestanforderungen am Tag: Ist all das abgehakt, wird der Habits-Kasten grün.
const MINDEST_HABITS = ["fruehstueck", "mittagessen", "abendessen", "reflektieren", "medikamente", "affirmationen"];

function zeigeHeute() {
  document.getElementById("heute-datum").textContent = langesDatum(heute());
  const kaesten = document.getElementById("heute-kaesten");
  kaesten.innerHTML = "";
  const tagHabits = habitTag(heute());

  // 0. Aus der Morgen-Mail: Termine, Wetter, Geburtstage, Antwort-Mails
  const mailHeute = mailHeuteKasten();
  if (mailHeute) kaesten.append(mailHeute);

  // 0b. Morgenroutine-Challenge (nur 16.–29.10.)
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

  // 2. Habits: grün, sobald die Mindestanforderungen erfüllt sind. Alle anderen Habits
  //    sind eher eine Wochenübersicht und zählen hier nur in der Gesamtzahl mit.
  const habits = ladeHabits();
  const mindest = habits.filter(function (h) { return MINDEST_HABITS.includes(h.id); });
  const mindestOffen = mindest.filter(function (h) { return tagHabits[h.id] !== "x"; });
  const gesamtErledigt = habits.filter(function (h) { return tagHabits[h.id] === "x"; }).length;
  const happy = laden("happy", {})[heute()];
  kaesten.append(heuteKasten(
    "Habits",
    "Mindestens " + (mindest.length - mindestOffen.length) + " von " + mindest.length +
      " · gesamt " + gesamtErledigt + " von " + habits.length +
      (happy === undefined ? "" : " · Happy: " + deutscheZahl(happy)),
    mindestOffen.map(function (h) { return tagHabits[h.id] === "/" ? h.name + " (½)" : h.name; }),
    "habits",
    mindestOffen.length === 0
  ));

  // 2b. Gym: an Trainingstagen (Mo/Mi/Fr oder selbst gewählt) – gelb bis eingetragen
  const einheitHeute = gymEinheit(heute());
  if (einheitHeute) {
    const trainiert = gymTrainiert(heute());
    const gymPlan = ladeGymPlan()[einheitHeute];
    kaesten.append(heuteKasten(
      "Heute: " + gymPlan.name + (gymPlan.untertitel ? " (" + gymPlan.untertitel + ")" : ""),
      trainiert ? "Training eingetragen" : "Noch nicht eingetragen",
      [],
      "gym",
      trainiert
    ));
  }

  // 3. Tagebuch: grün, sobald bei „geleistet“ mindestens 2 Einträge stehen (Dankbar = Zusatz)
  const tag = laden("tagebuch", {})[heute()] || leererTagebuchTag();
  const gefuellt = function (liste) {
    return (liste || []).filter(function (z) { return z.trim() !== ""; }).length;
  };
  const anzahlDankbar = gefuellt(tag.dankbar);
  const anzahlFuerMich = gefuellt(tag.fuerMich);
  kaesten.append(heuteKasten(
    "Tagebuch",
    "Geleistet: " + anzahlFuerMich + " (Ziel: mind. " + TAGEBUCH_MIN_GELEISTET + ") · Dankbar: " + anzahlDankbar,
    [],
    "tagebuch",
    anzahlFuerMich >= TAGEBUCH_MIN_GELEISTET
  ));

  // 4. Sport diese Woche
  kaesten.append(sportKasten());

  // 5. Aus der Abend-Mail: was morgen ansteht
  const mailMorgen = mailMorgenKasten();
  if (mailMorgen) kaesten.append(mailMorgen);

  // 6. Schlafenszeit (ab 17 Uhr)
  const schlaf = schlafKasten();
  if (schlaf) kaesten.append(schlaf);

  // 7. Wochenrückblick: immer die aktuelle Woche; sonntags automatisch aufgeklappt
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
