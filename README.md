# A4 B9 Atlas

Prototip interactiv pentru explorarea componentelor Audi A4 B9 (8W), pregătit pentru GitHub + Vercel.

## Deploy pe Vercel

### 1. Urcă proiectul pe GitHub
Din folderul proiectului:

```bash
git init
git add .
git commit -m "Initial A4 B9 Atlas"
git branch -M main
git remote add origin https://github.com/USERNAME/audi-a4-b9-atlas.git
git push -u origin main
```

### 2. Importă repository-ul în Vercel
- New Project
- Import Git Repository
- selectează `audi-a4-b9-atlas`
- Framework Preset: Other
- Root Directory: `./`
- Deploy

### 3. Configurează cheia OpenAI
În Vercel:

Settings -> Environment Variables

Adaugă:

`OPENAI_API_KEY = cheia_ta`

Activează cel puțin Production. Pentru Preview deployments poți activa și Preview.

După adăugarea variabilei, fă Redeploy.

## Structura Vercel

- `index.html` - UI
- `styles.css` - design
- `app.js` - interactivitate
- `data/parts.json` - catalog demo
- `api/ask.js` - Vercel Function pentru Astra
- `vercel.json` - configurare function

Cheia OpenAI este folosită doar server-side în `api/ask.js`; nu trebuie pusă în frontend sau GitHub.

## Local
Poți rula frontend-ul fără AI cu:

```bash
python -m http.server 8080
```

Pentru testarea endpoint-ului Vercel local, folosește Vercel CLI și o variabilă locală de mediu.

## Extindere
Dataset-ul actual este un seed demonstrativ. Structura poate fi extinsă la mii de componente și ulterior la un model 3D segmentat.
