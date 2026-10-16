# Tages-App: Format des App-Codes in der Morgen- und Abend-Mail (v1)

Beschreibt die Zeile, die die Morgen- und Abend-Mail (Claude-Routinen) für die Tages-App mitschicken. Die App liest sie in `app.js` → `leseAppCode()`. Die Beispielwerte sind ausgedacht.

## Wo
Ganz am Ende der **Morgen-Mail (06:35)** und der **Abend-Mail (20:00, Mo–Sa)**, nach allen anderen Abschnitten:

```
📲 APP-CODE
TAGESAPP1.eyJ2IjoxLCJhcnQiOiJtb3JnZW4i...
```

- Genau **eine Zeile**, ohne Leerzeichen und Zeilenumbrüche (damit Lars sie auf dem iPhone mit einem langen Tipp komplett markieren kann).
- Aufbau: `TAGESAPP1.` + **Base64url** (ohne `=`-Auffüllung) des **UTF-8-JSON** unten.
- **Mit Code erzeugen, nicht von Hand**, z. B.:
  `python3 -c "import base64,json,sys; print('TAGESAPP1.'+base64.urlsafe_b64encode(json.dumps(json.load(sys.stdin),ensure_ascii=False,separators=(',',':')).encode()).decode().rstrip('='))" < daten.json`

## JSON-Inhalt

```json
{
  "v": 1,
  "art": "morgen",
  "erstellt": "2026-10-16T06:35",
  "fuer": "2026-10-16",
  "termine": [
    { "start": "09:00", "ende": "10:00", "titel": "Zahnarzt", "ueberschneidung": false },
    { "start": null, "ende": null, "titel": "Ganztägig: Urlaub", "ueberschneidung": false }
  ],
  "geburtstage": [ { "name": "Anna", "datum": "2026-10-18" } ],
  "wetter": { "ort": "Stuttgart", "min": 8, "max": 15, "regen": 30 },
  "antwortMails": [ { "von": "Max Muster", "betreff": "Treffen Samstag?" } ],
  "strava": [
    { "datum": "2026-10-13", "typ": "laufen", "km": 8.2, "minuten": 45 },
    { "datum": "2026-10-14", "typ": "kraft", "km": 0, "minuten": 40 }
  ],
  "wecker": null
}
```

| Feld | Bedeutung |
|---|---|
| `art` | `"morgen"` oder `"abend"` |
| `erstellt` | Zeitpunkt der Mail, lokale Zeit `JJJJ-MM-TTTHH:MM` |
| `fuer` | Tag, auf den sich Termine und Wetter beziehen: **morgens = heute, abends = morgen** |
| `termine` | Termine an `fuer`, sortiert; ganztägig: `start`/`ende` = `null`; `ueberschneidung: true`, wenn er sich mit einem anderen überschneidet |
| `geburtstage` | morgens: nächste 7 Tage; abends: nur morgen. `datum` als `JJJJ-MM-TT` |
| `wetter` | für `fuer`; `regen` = Regenwahrscheinlichkeit in % |
| `antwortMails` | Mails, die eine Antwort brauchen (wie in der Mail), max. 5 |
| `strava` | **alle** Strava-Einheiten der laufenden Woche ab Montag bis jetzt; `typ`: `"laufen"`, `"kraft"`, `"schwimmen"` oder `"sonstiges"` |
| `wecker` | nur abends: Weckzeit für morgen als `"HH:MM"` (Regel wie in der Mail), morgens `null` |

Leere Listen als `[]`, fehlende Werte als `null`. Keine weiteren Felder nötig; zusätzliche Felder ignoriert die App.
