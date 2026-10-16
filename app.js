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


// ===== Test (fliegt später wieder raus) =====
// Zählt, wie oft die App geöffnet wurde – so sehen wir, dass Speichern klappt.
let anzahl = laden("test-zaehler", 0);
anzahl = anzahl + 1;
speichern("test-zaehler", anzahl);
document.getElementById("test").textContent =
  "Heute ist der " + heute() + ". Du hast die App " + anzahl + "-mal geöffnet.";


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
