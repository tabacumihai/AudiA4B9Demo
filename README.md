# Audi A4 B9 — 3D Atlas

Versiune refăcută ca explorator 3D.

## Ce este real în această versiune
- randare 3D WebGL cu Three.js;
- orbit / zoom;
- fiecare componentă este obiect 3D independent;
- click pe piesă;
- exploded view 0–100%;
- arbore pe sisteme;
- răcitor EGR, EGR, turbo, DPF, injectoare, pompă HP, pompă ulei, pompă apă etc.;
- integrare Astra via `/api/ask`;
- Vercel-ready.

## Ce NU pretinde această versiune
Geometria inclusă este procedurală/demonstrativă. Nu este CAD OEM Audi și nu trebuie folosită pentru măsurători, reparații sau identificare exactă.

## Cum îl faci 1:1 și cu mii de piese
Păstrezi UI-ul și înlocuiești fiecare geometrie procedurală cu mesh-uri GLB/GLTF segmentate.

Structura recomandată:
`assets/models/engine/EA288/.../*.glb`

Fiecare mesh trebuie mapat la un `component_id` din catalog. Ideal:
- Assembly
- Subassembly
- Part
- fasteners / seals / clips
- hoses / harnesses / sensors
- variant fitment

Nu include modele Audi/CAD din surse cu licență neclară.

## Deploy
1. urcă folderul în GitHub;
2. importă repo-ul în Vercel;
3. Framework Preset: Other;
4. adaugă `OPENAI_API_KEY` în Vercel → Settings → Environment Variables;
5. redeploy.

## Local
Fiindcă Three.js este încărcat ca ESM din CDN, servește folderul HTTP:
`python -m http.server 8080`

Pentru endpoint AI folosește Vercel local sau deployment-ul Vercel.
