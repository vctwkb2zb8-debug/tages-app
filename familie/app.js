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

// Feine Linien-Symbole statt Emojis. Jedes ist ein kleiner SVG-Pfad (Zeichenanweisung)
// auf einem 24 × 24 großen Raster: M = Stift hinsetzen, l/L = Linie ziehen, z = schließen.
const SYMBOLE = {
  haken: "M5 12.5l4.5 4.5L19 7.5",
  kreuz: "M6 6l12 12M18 6L6 18",
  stift: "M4 20h4L19 9l-4-4L4 16z",
  stern: "M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z",
  hoch: "M6 15l6-6 6 6",
  runter: "M6 9l6 6 6-6"
};

// Baut ein Symbol als Element, z. B. symbol("haken")
function symbol(name) {
  const ns = "http://www.w3.org/2000/svg"; // SVG-Elemente brauchen diesen „Namensraum“
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("class", "symbol");
  svg.setAttribute("aria-hidden", "true");
  const pfad = document.createElementNS(ns, "path");
  pfad.setAttribute("d", SYMBOLE[name]);
  svg.append(pfad);
  return svg;
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
//   "mindest-habits":    ids der Habits, die für „Tag geschafft“ zählen, z. B. ["p1730000000000"]
// Am Anfang gibt es keine Habits – jede Person legt ihre eigenen an.


function ladeHabits() {
  return laden("checkliste-punkte", []);
}

// Nur ids, deren Habit es noch gibt
function ladeMindestHabits() {
  const ids = ladeHabits().map(function (h) { return h.id; });
  return laden("mindest-habits", []).filter(function (id) { return ids.includes(id); });
}

// Markiert ein Habit als Mindest-Habit oder nimmt die Markierung zurück
function schalteMindestHabit(id) {
  const mindest = ladeMindestHabits();
  const neu = mindest.includes(id)
    ? mindest.filter(function (m) { return m !== id; })
    : mindest.concat(id);
  speichern("mindest-habits", neu);
  zeigeHabits();
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
  const habits = ladeHabits();
  const mindest = ladeMindestHabits();

  // Noch leer: kurzer Hinweis statt einer leeren Liste
  document.getElementById("habits-leer").classList.toggle("versteckt", habits.length > 0);

  for (const habit of habits) {
    const zustand = tag[habit.id] || "";

    // Der ganze Eintrag ist ein Knopf: jeder Tipp schaltet weiter
    const knopf = document.createElement("button");
    knopf.className = "habit";
    if (zustand === "x") knopf.classList.add("erledigt");
    if (zustand === "/") knopf.classList.add("teilweise");

    const kaestchen = document.createElement("span");
    kaestchen.className = "kaestchen";
    // Erledigt: Haken, teilweise: ½, sonst leer
    if (zustand === "x") kaestchen.append(symbol("haken"));
    if (zustand === "/") kaestchen.textContent = "½";

    knopf.append(kaestchen, habit.name);
    knopf.addEventListener("click", function () {
      // leer → x → / → leer
      const naechster = { "": "x", "x": "/", "/": "" }[zustand];
      setzeHabit(gewaehlterTag, habit.id, naechster);
      zeigeHabits();
    });

    // Knöpfe Stern, Stift und Kreuz (nur sichtbar im Bearbeiten-Modus)
    // Stern = Mindest-Habit: zählt dafür, dass der Tag auf der Startseite als geschafft gilt
    const mindestKnopf = document.createElement("button");
    mindestKnopf.append(symbol("stern"));
    mindestKnopf.title = "Mindest-Habit";
    mindestKnopf.className = "bearbeiten";
    if (mindest.includes(habit.id)) mindestKnopf.classList.add("an"); // gefüllter Stern
    mindestKnopf.addEventListener("click", function () {
      schalteMindestHabit(habit.id);
    });

    const umbenennenKnopf = document.createElement("button");
    umbenennenKnopf.append(symbol("stift"));
    umbenennenKnopf.title = "Umbenennen";
    umbenennenKnopf.className = "bearbeiten";
    umbenennenKnopf.addEventListener("click", function () {
      benenneHabitUm(habit.id);
    });

    const entfernenKnopf = document.createElement("button");
    entfernenKnopf.append(symbol("kreuz"));
    entfernenKnopf.title = "Entfernen";
    entfernenKnopf.className = "bearbeiten";
    entfernenKnopf.addEventListener("click", function () {
      entferneHabit(habit.id);
    });

    const zeile = document.createElement("li");
    zeile.append(knopf, mindestKnopf, umbenennenKnopf, entfernenKnopf);
    liste.append(zeile);
  }

  zeigeHappy();
}

function fuegeHabitHinzu(name) {
  const habits = ladeHabits();
  // Date.now() = Millisekunden seit 1970; falls die id schon vergeben ist, eins weiterzählen
  let zahl = Date.now();
  while (habits.some(function (h) { return h.id === "p" + zahl; })) zahl++;
  habits.push({ id: "p" + zahl, name: name });
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
  knopf.textContent = gelesen ? "Heute gelesen – schön!" : "Heute gelesen";
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
// Ein Trainingsplan, am Anfang leer. Übungen legt man selbst an (✏️ Plan bearbeiten).
//
// Der PLAN liegt auf dem Handy unter "gym-plan":
//   gym-plan = { A: { name, untertitel, uebungen: [{ id, name, einheit, start }] } }
// (Der Plan heißt intern „A“ – so bleibt Platz, falls später mehrere Pläne dazukommen.)
// "einheit" ist die Gewichtsart: "kg", "kg je Hand", "kg Scheiben gesamt", "nur Wdh." oder
// "nur abhaken" (z. B. Dehnen: kein Gewicht, nur ein Haken pro Training).
//
// Das TRAINING liegt unter "gym", ein Eintrag pro Tag:
//   { "2026-10-26": { einheit: "A", saetze: { beinpresse: [{ kg: 69, wdh: 10 }, { kg: 69, wdh: 10 }] },
//                     haken: { dehnen: true } } }
// Ein Satz zählt als gemacht, sobald er gespeichert ist (✓ getippt oder ein Wert geändert).

const GYM_SAETZE = 2;
const GYM_WDH_MIN = 6;               // darunter: Gewicht reduzieren
const GYM_WDH_ZIEL = 10;             // 2× so viele: Gewicht erhöhen
const GYM_EINHEITEN = ["A"];
const GYM_KG_ARTEN = ["kg", "kg je Hand", "kg Scheiben gesamt", "nur Wdh.", "nur abhaken"];

const GYM_STANDARD_PLAN = {
  A: { name: "Training", untertitel: "", uebungen: [] }
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

function gymNurWdh(uebung) {
  return uebung.einheit === "nur Wdh.";
}

// "2026-10-26" → "26.10."
function punktDatum(datum) {
  return datum.slice(8, 10) + "." + datum.slice(5, 7) + ".";
}

// Die Einheit eines Tages – es gibt nur den einen Plan
function gymEinheit(datum) {
  return "A";
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

  // Bearbeiten-Knopf
  document.getElementById("gym-bearbeiten-knopf").textContent = gymBearbeiten ? "Fertig" : "Plan bearbeiten";

  const liste = document.getElementById("gym-uebungen");
  liste.innerHTML = "";
  const hinweis = document.getElementById("gym-hinweis");

  if (gymBearbeiten) {
    hinweis.textContent = "";
    zeigeGymBearbeiten(plan, einheit);
  } else if (plan[einheit].uebungen.length === 0) {
    hinweis.textContent = "Noch keine Übungen. Tippe auf „Plan bearbeiten“, um welche anzulegen.";
  } else {
    hinweis.textContent = "";
    zeigeGymUebungen(plan, einheit, tag);
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
  haken.append(symbol("haken"));
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
  haken.append(symbol("haken"));
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

    const knopf = function (symbolName, titel, aktion, gesperrt) {
      const k = document.createElement("button");
      k.type = "button";
      k.append(symbol(symbolName));
      k.title = titel;
      k.disabled = Boolean(gesperrt);
      k.addEventListener("click", aktion);
      return k;
    };
    const name = document.createElement("span");
    name.className = "gym-edit-name";
    name.textContent = uebung.name;

    zeile.append(
      knopf("hoch", "Nach oben", function () { verschiebeGymUebung(einheit, uebung.id, -1); }, i === 0),
      knopf("runter", "Nach unten", function () { verschiebeGymUebung(einheit, uebung.id, 1); }, i === uebungen.length - 1),
      name,
      knopf("stift", "Ändern", function () { gymEditId = uebung.id; zeigeGym(); }),
      knopf("kreuz", "Entfernen", function () { entferneGymUebung(einheit, uebung.id); })
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

  // 1. Ring für die aktuelle Woche (Mo–So): x von <Ziel aus den Einstellungen> Einheiten
  const ziel = gymProWoche();
  const wochenStart = montagVon(heute());
  const wochenEnde = verschiebeTag(wochenStart, 6);
  const absolviert = Object.keys(gym).filter(function (d) {
    return d >= wochenStart && d <= wochenEnde && gymTrainiert(d);
  }).length;

  const ringZeile = document.createElement("div");
  ringZeile.className = "gym-ring-zeile";
  const ringText = document.createElement("div");
  const wocheText = document.createElement("strong");
  wocheText.textContent = "Diese Woche";
  const zeitraum = document.createElement("span");
  zeitraum.textContent = punktDatum(wochenStart) + " – " + punktDatum(wochenEnde);
  const zaehler = document.createElement("span");
  zaehler.textContent = absolviert + " von " + ziel + " Einheiten";
  // Alle Einheiten seit Beginn, ohne Begrenzung
  const gesamt = Object.keys(gym).filter(gymTrainiert).length;
  const gesamtZeile = document.createElement("span");
  gesamtZeile.textContent = "Insgesamt: " + gesamt + (gesamt === 1 ? " Einheit" : " Einheiten");
  ringText.append(wocheText, zeitraum, zaehler, gesamtZeile);
  ringZeile.append(gymRing(absolviert, ziel), ringText);
  inhalt.append(ringZeile);

  if (daten.punkte.length === 0) {
    const leer = document.createElement("p");
    leer.className = "hinweis";
    leer.textContent = "Sobald du Sätze mit dem Haken bestätigt hast, siehst du hier deinen Fortschritt.";
    inhalt.append(leer);
    return;
  }

  // 2. Gesamtkurve
  const kopf = document.createElement("p");
  kopf.append("Gesamt (Ø aller Übungen): ");
  const zahl = document.createElement("strong");
  zahl.textContent = prozentText(daten.punkte[daten.punkte.length - 1].prozent);
  kopf.append(zahl, " seit Start");
  inhalt.append(kopf, gymKurve(daten.punkte));

  // 3. Eine kleine Linie pro Übung
  for (const einheit of GYM_EINHEITEN) {
    const uebungen = plan[einheit].uebungen.filter(function (u) { return daten.verlauf[u.id]; });
    if (uebungen.length === 0) continue;
    const titel = document.createElement("h3");
    titel.textContent = "Übungen";
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
  ueberschrift.textContent = titel;
  const beschreibung = document.createElement("span");
  beschreibung.textContent = text;
  // Kreis rechts: leer = offen, gefüllt mit Haken = erledigt (Aussehen im CSS)
  const status = document.createElement("span");
  status.className = "status";
  if (fertig) status.append(symbol("haken"));
  kasten.append(ueberschrift, status, beschreibung, eintragsListe(eintraege));

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


// --- Wochenziele Sport ---
// Gespeichert unter "sport-ziele": welches Habit wie oft pro Woche, z. B.
//   [{ id: "p1730000000000", soll: 2 }]
// Der Name kommt aus dem Habit. Gezählt werden nur volle Häkchen (✓), nicht ½.
// Am Anfang leer; einstellen lässt es sich in den Einstellungen.
function ladeSportZiele() {
  const habits = ladeHabits();
  // Nur Ziele, deren Habit es noch gibt (gelöschte Habits fallen raus)
  return laden("sport-ziele", []).filter(function (ziel) {
    return habits.some(function (h) { return h.id === ziel.id; });
  }).map(function (ziel) {
    const habit = habits.find(function (h) { return h.id === ziel.id; });
    return { id: ziel.id, name: habit.name, soll: ziel.soll };
  });
}

// Stand der Sportziele in einer Woche bis zu einem Tag, z. B. [{ name, soll, ist }]
function sportStand(montag, bis) {
  return ladeSportZiele().map(function (ziel) {
    return { name: ziel.name, soll: ziel.soll, ist: zaehleHabit(ziel.id, montag, bis) };
  });
}

// Kasten „Sport diese Woche“ – null, wenn keine Ziele eingestellt sind
function sportKasten() {
  const stand = sportStand(montagVon(heute()), heute());
  if (stand.length === 0) return null;
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
  kasten.className = "heute-kasten neutral";

  const ueberschrift = document.createElement("strong");
  ueberschrift.textContent = "Schlafenszeit";
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

  // Sportziele (nur, wenn welche eingestellt sind)
  const sport = sportStand(montag, bis).map(function (z) {
    const zustand = z.ist >= z.soll ? "erfüllt" : (vorbei ? "verfehlt" : "offen");
    return z.name + ": " + z.ist + "/" + z.soll + " – " + zustand;
  });
  if (sport.length > 0) {
    const sportTitel = document.createElement("h3");
    sportTitel.textContent = "Sportziele";
    inhalt.append(sportTitel, eintragsListe(sport));
  }

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

// Begrüßung oben: mit Namen, sobald einer eingetragen ist
function zeigeBegruessung() {
  const name = laden("name", "");
  document.getElementById("begruessung").textContent = name ? "Hallo " + name : "Mein Tag";
  document.getElementById("name-form").classList.toggle("versteckt", name !== "");
}

// Beim ersten Start: Namen eintragen (später in den Einstellungen änderbar)
document.getElementById("name-form").addEventListener("submit", function (ereignis) {
  ereignis.preventDefault();
  const name = document.getElementById("name-eingabe").value.trim();
  if (name === "") return;
  speichern("name", name);
  zeigeBegruessung();
});

// Kasten „Habits“: grün, sobald die Mindest-Habits erfüllt sind. Sind keine als
// „Mindest“ markiert, müssen alle Habits abgehakt sein.
function habitsKasten(tagHabits) {
  const habits = ladeHabits();
  if (habits.length === 0) {
    return heuteKasten("Habits", "Noch keine Habits angelegt", [], "habits", false);
  }

  const happy = laden("happy", {})[heute()];
  const happyText = happy === undefined ? "" : " · Happy: " + deutscheZahl(happy);
  const markiert = ladeMindestHabits();
  const mindest = markiert.length > 0
    ? habits.filter(function (h) { return markiert.includes(h.id); })
    : habits;
  const mindestOffen = mindest.filter(function (h) { return tagHabits[h.id] !== "x"; });
  const gesamtErledigt = habits.filter(function (h) { return tagHabits[h.id] === "x"; }).length;
  const text = markiert.length > 0
    ? "Mindestens " + (mindest.length - mindestOffen.length) + " von " + mindest.length +
      " · gesamt " + gesamtErledigt + " von " + habits.length
    : gesamtErledigt + " von " + habits.length + " erledigt";

  return heuteKasten(
    "Habits",
    text + happyText,
    mindestOffen.map(function (h) { return tagHabits[h.id] === "/" ? h.name + " (½)" : h.name; }),
    "habits",
    mindestOffen.length === 0
  );
}

function zeigeHeute() {
  zeigeBegruessung();
  document.getElementById("heute-datum").textContent = langesDatum(heute());
  const kaesten = document.getElementById("heute-kaesten");
  kaesten.innerHTML = "";
  const tagHabits = habitTag(heute());

  // Jeder Kasten erscheint nur, wenn er in den Einstellungen an ist (kastenAn).

  // 1. Affirmationen: heute schon gelesen?
  const gelesen = tagHabits["affirmationen"] === "x";
  if (kastenAn("affirmationen")) {
    kaesten.append(heuteKasten(
      "Affirmationen",
      gelesen ? "Heute gelesen" : "Noch nicht gelesen",
      [],
      "affirmationen",
      gelesen
    ));
  }

  // 2. Habits
  if (kastenAn("habits")) kaesten.append(habitsKasten(tagHabits));

  // 2b. Gym: nur wenn heute schon trainiert wurde
  if (kastenAn("training") && gymTrainiert(heute())) {
    kaesten.append(heuteKasten("Training", "Heute eingetragen", [], "gym", true));
  }

  // 3. Tagebuch: grün, sobald bei „geleistet“ mindestens 2 Einträge stehen (Dankbar = Zusatz)
  if (kastenAn("tagebuch")) {
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
  }

  // 4. Sport diese Woche (nur, wenn Ziele eingestellt sind)
  const sport = kastenAn("sport") ? sportKasten() : null;
  if (sport) kaesten.append(sport);

  // 5. Schlafenszeit (ab 17 Uhr)
  const schlaf = kastenAn("schlaf") ? schlafKasten() : null;
  if (schlaf) kaesten.append(schlaf);

  // Alles ausgeblendet? Dann ein kurzer Hinweis statt einer leeren Seite
  if (kaesten.children.length === 0) {
    const leer = document.createElement("p");
    leer.className = "hinweis";
    leer.textContent = "Hier ist gerade nichts eingeblendet. Über das Zahnrad oben kannst du Kästen einschalten.";
    kaesten.append(leer);
  }

  // 6. Wochenrückblick: immer die aktuelle Woche; sonntags automatisch aufgeklappt
  document.getElementById("wochenrueckblick").classList.toggle("versteckt", !kastenAn("wochenrueckblick"));
  rueckblickMontag = montagVon(heute());
  if (wochentag(heute()) === 6) {
    document.getElementById("wochenrueckblick").open = true;
  }
  zeigeWochenrueckblick();
}


// ===== Einstellungen =====
// Gespeichert unter "einstellungen", z. B.
//   { reiter: { gym: false }, kaesten: { schlaf: false }, gymProWoche: 3 }
// Was dort nicht steht, ist an (bzw. hat den Standardwert).

// Die Bereiche unten in der Leiste („Heute“ ist immer da)
const REITER = [
  { id: "habits", name: "Habits" },
  { id: "tagebuch", name: "Tagebuch" },
  { id: "affirmationen", name: "Affirmationen" },
  { id: "gym", name: "Gym" }
];

// Die Kästen auf der Startseite. „reiter“: gehört zu diesem Bereich – ist der aus,
// verschwindet auch der Kasten (er würde sonst ins Leere führen).
const KAESTEN = [
  { id: "affirmationen", name: "Affirmationen", reiter: "affirmationen" },
  { id: "habits", name: "Habits", reiter: "habits" },
  { id: "training", name: "Training", reiter: "gym" },
  { id: "tagebuch", name: "Tagebuch", reiter: "tagebuch" },
  { id: "sport", name: "Sport diese Woche", reiter: "habits" },
  { id: "schlaf", name: "Schlafenszeit (ab 17 Uhr)", reiter: null },
  { id: "wochenrueckblick", name: "Wochenrückblick", reiter: null }
];

function ladeEinstellungen() {
  const e = laden("einstellungen", {});
  return { reiter: e.reiter || {}, kaesten: e.kaesten || {}, gymProWoche: e.gymProWoche || 2 };
}

// Ändert eine einzelne Einstellung, z. B. speichereEinstellung("reiter", "gym", false)
function speichereEinstellung(gruppe, id, wert) {
  const e = ladeEinstellungen();
  e[gruppe][id] = wert;
  speichern("einstellungen", e);
}

// Ist ein Bereich eingeschaltet?
function reiterAn(id) {
  return ladeEinstellungen().reiter[id] !== false;
}

// Wird ein Kasten auf der Startseite gezeigt? (eigener Schalter und sein Bereich an)
function kastenAn(id) {
  const kasten = KAESTEN.find(function (k) { return k.id === id; });
  if (ladeEinstellungen().kaesten[id] === false) return false;
  return !kasten.reiter || reiterAn(kasten.reiter);
}

function gymProWoche() {
  return ladeEinstellungen().gymProWoche;
}

// Blendet die Knöpfe unten in der Leiste passend ein und aus
function wendeReiterAn() {
  for (const knopf of document.querySelectorAll("nav button")) {
    const bereich = knopf.dataset.bereich;
    knopf.classList.toggle("versteckt", bereich !== "heute" && !reiterAn(bereich));
  }
}

// Baut eine Zeile mit Text und Schalter (Checkbox)
function schalterZeile(text, an, gesperrt, beiAenderung) {
  const zeile = document.createElement("label");
  zeile.className = "einstellung-zeile" + (gesperrt ? " gesperrt" : "");
  const beschriftung = document.createElement("span");
  beschriftung.textContent = text;
  const schalter = document.createElement("input");
  schalter.type = "checkbox";
  schalter.className = "schalter";
  schalter.checked = an;
  schalter.disabled = gesperrt;
  schalter.addEventListener("change", function () { beiAenderung(schalter.checked); });
  zeile.append(beschriftung, schalter);
  return zeile;
}

function zeigeEinstellungen() {
  const e = ladeEinstellungen();
  document.getElementById("einstellungen-name").value = laden("name", "");
  document.getElementById("einstellungen-gym-ziel").value = e.gymProWoche;

  // Bereiche
  const reiterListe = document.getElementById("einstellungen-reiter");
  reiterListe.innerHTML = "";
  for (const reiter of REITER) {
    reiterListe.append(schalterZeile(reiter.name, reiterAn(reiter.id), false, function (an) {
      speichereEinstellung("reiter", reiter.id, an);
      wendeReiterAn();
      zeigeEinstellungen(); // Kästen des Bereichs sperren bzw. freigeben
    }));
  }

  // Kästen der Startseite (gesperrt, wenn ihr Bereich aus ist)
  const kaestenListe = document.getElementById("einstellungen-kaesten");
  kaestenListe.innerHTML = "";
  for (const kasten of KAESTEN) {
    const bereichAus = kasten.reiter && !reiterAn(kasten.reiter);
    const text = kasten.name + (bereichAus ? " (Bereich ist aus)" : "");
    kaestenListe.append(schalterZeile(text, e.kaesten[kasten.id] !== false, bereichAus, function (an) {
      speichereEinstellung("kaesten", kasten.id, an);
    }));
  }

  zeigeSportEinstellungen();
}

// Sport-Ziele: vorhandene Ziele mit Anzahl und ✕, darunter „Ziel hinzufügen“
function zeigeSportEinstellungen() {
  const bereich = document.getElementById("einstellungen-sport");
  bereich.innerHTML = "";
  const habits = ladeHabits();
  const ziele = ladeSportZiele();

  if (habits.length === 0) {
    const hinweis = document.createElement("p");
    hinweis.className = "hinweis";
    hinweis.textContent = "Lege zuerst unter Habits eins an, z. B. „Spazieren“.";
    bereich.append(hinweis);
    return;
  }

  for (const ziel of ziele) {
    const zeile = document.createElement("div");
    zeile.className = "einstellung-zeile";
    const name = document.createElement("span");
    name.textContent = ziel.name;
    const anzahl = document.createElement("input");
    anzahl.type = "number";
    anzahl.min = 1;
    anzahl.max = 7;
    anzahl.inputMode = "numeric";
    anzahl.value = ziel.soll;
    anzahl.title = "Wie oft pro Woche";
    anzahl.addEventListener("change", function () {
      const soll = Math.min(7, Math.max(1, Math.round(Number(anzahl.value) || 1)));
      anzahl.value = soll;
      aendereSportZiel(ziel.id, soll);
    });
    const proWoche = document.createElement("span");
    proWoche.className = "hinweis";
    proWoche.textContent = "× pro Woche";
    const entfernen = document.createElement("button");
    entfernen.type = "button";
    entfernen.append(symbol("kreuz"));
    entfernen.title = "Ziel entfernen";
    entfernen.addEventListener("click", function () {
      aendereSportZiel(ziel.id, null);
      zeigeSportEinstellungen();
    });
    zeile.append(name, anzahl, proWoche, entfernen);
    bereich.append(zeile);
  }

  // Habits, die noch kein Ziel haben, stehen zur Auswahl
  const frei = habits.filter(function (h) {
    return !ziele.some(function (z) { return z.id === h.id; });
  });
  if (frei.length === 0) return;

  const form = document.createElement("form");
  form.className = "einstellung-zeile";
  const auswahl = document.createElement("select");
  for (const habit of frei) {
    const option = document.createElement("option");
    option.value = habit.id;
    option.textContent = habit.name;
    auswahl.append(option);
  }
  const hinzufuegen = document.createElement("button");
  hinzufuegen.type = "submit";
  hinzufuegen.textContent = "Ziel hinzufügen";
  form.append(auswahl, hinzufuegen);
  form.addEventListener("submit", function (ereignis) {
    ereignis.preventDefault();
    aendereSportZiel(auswahl.value, 2); // startet mit 2× pro Woche
    zeigeSportEinstellungen();
  });
  bereich.append(form);
}

// Setzt das Wochenziel eines Habits; soll = null entfernt das Ziel
function aendereSportZiel(id, soll) {
  const ziele = laden("sport-ziele", []).filter(function (z) { return z.id !== id; });
  if (soll !== null) ziele.push({ id: id, soll: soll });
  // Reihenfolge wie in der Habit-Liste
  const reihenfolge = ladeHabits().map(function (h) { return h.id; });
  ziele.sort(function (a, b) { return reihenfolge.indexOf(a.id) - reihenfolge.indexOf(b.id); });
  speichern("sport-ziele", ziele);
}

document.getElementById("einstellungen-name").addEventListener("change", function () {
  speichern("name", this.value.trim());
  zeigeBegruessung();
});

document.getElementById("einstellungen-gym-ziel").addEventListener("change", function () {
  const ziel = Math.min(7, Math.max(1, Math.round(Number(this.value) || 2)));
  this.value = ziel;
  const e = ladeEinstellungen();
  e.gymProWoche = ziel;
  speichern("einstellungen", e);
  zeigeGymFortschritt();
});

document.getElementById("einstellungen-knopf").addEventListener("click", function () {
  zeigeBereich("einstellungen");
});
document.getElementById("einstellungen-fertig").addEventListener("click", function () {
  zeigeBereich("heute");
});


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
  if (name === "einstellungen") {
    zeigeEinstellungen();
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

// Beim Start: ausgeschaltete Bereiche ausblenden, Datumsleisten auf heute stellen
// und die Tagesansicht zeigen
wendeReiterAn();
waehleTag(heute());
zeigeBereich("heute");


// ===== Offline =====
// Den „Hausmeister“ (service-worker.js) anmelden, falls der Browser das kann
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}
