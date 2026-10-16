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

// Gibt das heutige Datum als Text zurück, z. B. "2026-10-16"
function heute() {
  const jetzt = new Date();
  const jahr = jetzt.getFullYear();
  const monat = String(jetzt.getMonth() + 1).padStart(2, "0"); // Januar ist 0, darum +1
  const tag = String(jetzt.getDate()).padStart(2, "0");        // 7 wird zu "07"
  return jahr + "-" + monat + "-" + tag;
}


// ===== Checkliste =====
// Gespeichert werden zwei Dinge:
//   "checkliste-punkte": welche Punkte es gibt, z. B. [{ id: "sport", name: "Sport" }, …]
//   "checkliste-tage":   was an welchem Tag abgehakt wurde, z. B. { "2026-10-16": ["sport"] }

// Diese Punkte gibt es beim allerersten Start
const STARTPUNKTE = [
  { id: "sport", name: "Sport" },
  { id: "mahlzeiten", name: "Mahlzeiten" },
  { id: "dehnen", name: "Dehnen" }
];

// Baut die Liste mit den Häkchen für heute neu auf
function zeigeCheckliste() {
  const punkte = laden("checkliste-punkte", STARTPUNKTE);
  const alleTage = laden("checkliste-tage", {});
  const heuteErledigt = alleTage[heute()] || []; // noch nichts abgehakt? → leere Liste

  const liste = document.getElementById("checkliste-liste");
  liste.innerHTML = ""; // alte Einträge wegräumen

  // Für jeden Punkt eine Zeile mit Häkchen bauen
  for (const punkt of punkte) {
    const haken = document.createElement("input");
    haken.type = "checkbox";
    haken.checked = heuteErledigt.includes(punkt.id);
    haken.addEventListener("change", function () {
      hakeAb(punkt.id, haken.checked);
    });

    const beschriftung = document.createElement("label");
    beschriftung.append(haken, " " + punkt.name);

    // Knopf ✏️ zum Umbenennen
    const umbenennenKnopf = document.createElement("button");
    umbenennenKnopf.textContent = "✏️";
    umbenennenKnopf.title = "Umbenennen";
    umbenennenKnopf.addEventListener("click", function () {
      benennePunktUm(punkt.id);
    });

    // Knopf ✕ zum Entfernen
    const entfernenKnopf = document.createElement("button");
    entfernenKnopf.textContent = "✕";
    entfernenKnopf.title = "Entfernen";
    entfernenKnopf.addEventListener("click", function () {
      entfernePunkt(punkt.id);
    });

    const zeile = document.createElement("li");
    zeile.append(beschriftung, umbenennenKnopf, entfernenKnopf);
    liste.append(zeile);
  }
}

// Fügt einen neuen Punkt am Ende der Liste hinzu
function fuegePunktHinzu(name) {
  const punkte = laden("checkliste-punkte", STARTPUNKTE);
  const neuerPunkt = { id: "p" + Date.now(), name: name }; // Date.now() = eindeutige Zahl
  punkte.push(neuerPunkt);
  speichern("checkliste-punkte", punkte);
  zeigeCheckliste();
}

// Fragt nach einem neuen Namen und speichert ihn
function benennePunktUm(id) {
  const punkte = laden("checkliste-punkte", STARTPUNKTE);
  const punkt = punkte.find(function (p) { return p.id === id; });
  const neuerName = prompt("Neuer Name:", punkt.name);
  if (neuerName && neuerName.trim() !== "") { // nicht abgebrochen und nicht leer
    punkt.name = neuerName.trim();
    speichern("checkliste-punkte", punkte);
    zeigeCheckliste();
  }
}

// Fragt nach und entfernt den Punkt dann aus der Liste
function entfernePunkt(id) {
  const punkte = laden("checkliste-punkte", STARTPUNKTE);
  const punkt = punkte.find(function (p) { return p.id === id; });
  if (confirm("„" + punkt.name + "“ wirklich entfernen?")) {
    const uebrig = punkte.filter(function (p) { return p.id !== id; }); // alle außer diesem
    speichern("checkliste-punkte", uebrig);
    zeigeCheckliste();
  }
}

// Formular „Hinzufügen“: beim Absenden neuen Punkt anlegen
document.getElementById("checkliste-neu").addEventListener("submit", function (ereignis) {
  ereignis.preventDefault(); // sonst lädt der Browser die Seite neu
  const eingabe = document.getElementById("checkliste-neu-name");
  fuegePunktHinzu(eingabe.value.trim());
  eingabe.value = ""; // Feld wieder leeren
});

// Merkt sich für heute, ob ein Punkt abgehakt ist oder nicht
function hakeAb(id, istErledigt) {
  const alleTage = laden("checkliste-tage", {});
  let heuteErledigt = alleTage[heute()] || [];

  if (istErledigt) {
    heuteErledigt.push(id); // hinzufügen
  } else {
    heuteErledigt = heuteErledigt.filter(function (x) { return x !== id; }); // entfernen
  }

  alleTage[heute()] = heuteErledigt;
  speichern("checkliste-tage", alleTage);
}

zeigeCheckliste();


// ===== Navigation =====

// Zeigt nur den Bereich mit diesem Namen, z. B. zeigeBereich("todos")
function zeigeBereich(name) {
  // 1. Alle Bereiche verstecken
  const alleBereiche = document.querySelectorAll("section");
  for (const bereich of alleBereiche) {
    bereich.classList.add("versteckt");
  }

  // 2. Nur den gewählten Bereich wieder zeigen
  const gewaehlterBereich = document.getElementById(name);
  gewaehlterBereich.classList.remove("versteckt");
}

// Jeder Knopf in der Leiste ruft beim Antippen zeigeBereich auf
const knoepfe = document.querySelectorAll("nav button");
for (const knopf of knoepfe) {
  knopf.addEventListener("click", function () {
    zeigeBereich(knopf.dataset.bereich);
  });
}

// Beim Start die Tagesansicht zeigen
zeigeBereich("heute");
