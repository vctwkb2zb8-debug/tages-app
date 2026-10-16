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


// ===== ToDos =====
// Gespeichert unter "todos" als Liste, z. B.
//   [{ id: "t123", text: "Einkaufen", erledigt: false, faellig: "2026-10-20" }]
// faellig ist "" (leer), wenn kein Datum gewählt wurde.

// Macht aus "2026-10-20" den deutschen Text "20.10.2026"
function deutschesDatum(datum) {
  const teile = datum.split("-"); // ["2026", "10", "20"]
  return teile[2] + "." + teile[1] + "." + teile[0];
}

// Sortier-Regel: offene Aufgaben vor erledigten, dann nach Datum (ohne Datum ganz hinten)
function vergleicheTodos(a, b) {
  if (a.erledigt !== b.erledigt) {
    return a.erledigt ? 1 : -1;
  }
  const datumA = a.faellig || "9999-99-99"; // kein Datum? → so tun, als wäre es ganz spät
  const datumB = b.faellig || "9999-99-99";
  return datumA.localeCompare(datumB); // Text-Vergleich klappt, weil Jahr-Monat-Tag
}

// Baut die Aufgabenliste neu auf
function zeigeTodos() {
  const todos = laden("todos", []);
  todos.sort(vergleicheTodos);

  const liste = document.getElementById("todo-liste");
  liste.innerHTML = "";

  for (const todo of todos) {
    const haken = document.createElement("input");
    haken.type = "checkbox";
    haken.checked = todo.erledigt;
    haken.addEventListener("change", function () {
      hakeTodoAb(todo.id, haken.checked);
    });

    const beschriftung = document.createElement("label");
    beschriftung.append(haken, " " + todo.text);

    // Fälligkeitsdatum anzeigen, falls vorhanden
    if (todo.faellig) {
      const datum = document.createElement("small");
      datum.textContent = " · bis " + deutschesDatum(todo.faellig);
      beschriftung.append(datum);
    }

    const loeschenKnopf = document.createElement("button");
    loeschenKnopf.textContent = "✕";
    loeschenKnopf.title = "Löschen";
    loeschenKnopf.addEventListener("click", function () {
      loescheTodo(todo.id);
    });

    const zeile = document.createElement("li");
    zeile.append(beschriftung, loeschenKnopf);

    // Klassen fürs Aussehen: erledigt = durchgestrichen, ueberfaellig = rot
    if (todo.erledigt) {
      zeile.classList.add("erledigt");
    } else if (todo.faellig && todo.faellig < heute()) {
      zeile.classList.add("ueberfaellig");
    }

    liste.append(zeile);
  }
}

function fuegeTodoHinzu(text, faellig) {
  const todos = laden("todos", []);
  todos.push({ id: "t" + Date.now(), text: text, erledigt: false, faellig: faellig });
  speichern("todos", todos);
  zeigeTodos();
}

function hakeTodoAb(id, istErledigt) {
  const todos = laden("todos", []);
  const todo = todos.find(function (t) { return t.id === id; });
  todo.erledigt = istErledigt;
  speichern("todos", todos);
  zeigeTodos(); // neu sortieren: erledigte rutschen nach unten
}

function loescheTodo(id) {
  const todos = laden("todos", []);
  const uebrig = todos.filter(function (t) { return t.id !== id; });
  speichern("todos", uebrig);
  zeigeTodos();
}

// Formular „Hinzufügen“
document.getElementById("todo-neu").addEventListener("submit", function (ereignis) {
  ereignis.preventDefault();
  const textFeld = document.getElementById("todo-neu-text");
  const datumFeld = document.getElementById("todo-neu-datum");
  fuegeTodoHinzu(textFeld.value.trim(), datumFeld.value);
  textFeld.value = "";
  datumFeld.value = "";
});

zeigeTodos();


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

// Macht aus "2026-10-16" den Text "Freitag, 16. Oktober 2026"
function langesDatum(datum) {
  const tag = new Date(datum + "T00:00"); // T00:00 = Mitternacht in deiner Zeitzone
  return tag.toLocaleDateString("de-DE", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });
}

// Baut aus einer Liste von Einträgen eine Aufzählung (leere Zeilen weglassen)
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

  // 1. Checkliste: was ist noch nicht abgehakt?
  const punkte = laden("checkliste-punkte", STARTPUNKTE);
  const heuteErledigt = laden("checkliste-tage", {})[heute()] || [];
  const offenePunkte = punkte.filter(function (p) { return !heuteErledigt.includes(p.id); });
  const anzahlErledigt = punkte.length - offenePunkte.length;
  kaesten.append(heuteKasten(
    "Checkliste",
    anzahlErledigt + " von " + punkte.length + " erledigt",
    offenePunkte.map(function (p) { return p.name; }),
    "checkliste",
    offenePunkte.length === 0
  ));

  // 2. Tagebuch: wie viele der 6 Zeilen sind ausgefüllt?
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

  // 3. ToDos: offen und heute fällig oder überfällig
  const dringend = laden("todos", [])
    .filter(function (t) { return !t.erledigt && t.faellig && t.faellig <= heute(); })
    .sort(vergleicheTodos);
  kaesten.append(heuteKasten(
    "ToDos",
    dringend.length === 0 ? "Heute nichts fällig" : dringend.length + " heute fällig oder überfällig",
    dringend.map(function (t) {
      return t.faellig < heute() ? t.text + " (überfällig)" : t.text;
    }),
    "todos",
    dringend.length === 0
  ));
}


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

  // 3. Den passenden Knopf unten hervorheben
  for (const knopf of document.querySelectorAll("nav button")) {
    knopf.classList.toggle("aktiv", knopf.dataset.bereich === name);
  }

  // 4. Die Startseite jedes Mal neu berechnen – in den anderen Bereichen kann sich ja was geändert haben
  if (name === "heute") {
    zeigeHeute();
  }
}

// Wenn die App wieder in den Vordergrund kommt (z. B. am nächsten Morgen),
// alles neu aufbauen – sonst stünde noch der gestrige Tag da.
document.addEventListener("visibilitychange", function () {
  if (document.visibilityState === "visible") {
    zeigeCheckliste();
    zeigeTodos();
    zeigeTagebuch();
    zeigeTagebuchArchiv();
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
