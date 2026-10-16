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


// ===== Habits =====
// Gespeichert werden:
//   "checkliste-punkte": welche Habits es gibt, z. B. [{ id: "lesen", name: "Lesen" }, …]
//                        (heißt noch „checkliste“, damit vorhandene Daten erhalten bleiben)
//   "habits-tage":       Stand pro Tag, z. B. { "2026-10-16": { lesen: "x", dehnen: "/" } }
//                        "x" = erledigt, "/" = teilweise, fehlt = nicht gemacht
//   "happy":             Glücks-Rating pro Tag, z. B. { "2026-10-16": 7.5 }

const HABIT_VORLAGE = [
  { id: "affirmationen", name: "Affirmationen" },
  { id: "fruehstueck", name: "Frühstück" },
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

// Setzt ein Habit für heute auf "x", "/" oder "" (leer)
function setzeHabit(id, zustand) {
  const alleTage = laden("habits-tage", {});
  const tag = alleTage[heute()] || {};
  if (zustand === "") {
    delete tag[id];
  } else {
    tag[id] = zustand;
  }
  alleTage[heute()] = tag;
  speichern("habits-tage", alleTage);
}

// Baut die Habit-Liste für heute neu auf
function zeigeHabits() {
  const tag = habitTag(heute());
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
      setzeHabit(habit.id, naechster);
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
  const wert = laden("happy", {})[heute()];
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
  alle[heute()] = Number(this.value);
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

// Schreibt die gespeicherten Einträge von heute in die Felder
function zeigeTagebuch() {
  const tagebuch = laden("tagebuch", {});
  const tag = tagebuch[heute()] || leererTagebuchTag();

  for (const feld of document.querySelectorAll(".tagebuch-feld")) {
    feld.value = tag[feld.dataset.art][feld.dataset.nr];
  }
}

// Speichert ein Feld, sobald darin getippt wird
for (const feld of document.querySelectorAll(".tagebuch-feld")) {
  feld.addEventListener("input", function () {
    const tagebuch = laden("tagebuch", {});
    const tag = tagebuch[heute()] || leererTagebuchTag();
    tag[feld.dataset.art][feld.dataset.nr] = feld.value;
    tagebuch[heute()] = tag;
    speichern("tagebuch", tagebuch);
  });
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
  setzeHabit("affirmationen", "x");
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

function zeigeHeute() {
  document.getElementById("heute-datum").textContent = langesDatum(heute());
  const kaesten = document.getElementById("heute-kaesten");
  kaesten.innerHTML = "";
  const tagHabits = habitTag(heute());

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
    zeigeHabits();
    zeigeTagebuch();
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

// Beim Start die Tagesansicht zeigen
zeigeBereich("heute");


// ===== Offline =====
// Den „Hausmeister“ (service-worker.js) anmelden, falls der Browser das kann
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}
