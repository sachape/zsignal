# Streamnco Design System — Audit & cadrage

> Phase 0 du pipeline. Méthode : *AI Product Design Handbook* Vol.2 Ch.01 (Discovery),
> Vol.1 Ch.15 (Audit). On formule le problème **avant** de toucher au code.
>
> Date : 2026-07-18 · Branche : `design-system` · Commit de base : `origin/main`

---

## 1. Le problème

Streamnco a des composants, des tokens partiels et une app qui tourne. Ce qu'il
n'a **pas**, c'est une **source de vérité partagée**.

Test décisif : *un designer qui rejoint l'équipe demain peut-il répondre à ces
quatre questions sans demander à Sacha ?*

1. Combien y a-t-il de composants, et lesquels sont réutilisables ?
2. Comment chaque composant est-il construit — props, variants, états ?
3. Quels tokens existent, et que signifient-ils ?
4. Dans lequel des deux systèmes visuels suis-je ?

Aujourd'hui la réponse aux quatre est **non**. Le savoir existe, mais il est
éclaté dans 217 fichiers, des commentaires de code, et une seule tête.

Ce n'est pas un problème d'esthétique. C'est un problème de **gouvernance et de
transmission** (Vol.1 Ch.01 : ce qui ne se délègue pas ≠ ce qui ne se documente
pas).

## 2. Problem Framing Canvas

| Champ | |
|---|---|
| **Signal** | Le besoin de travailler avec d'autres designers ; aucune base commune. |
| **Utilisateur** | Un designer ou un dev qui rejoint, et l'IA (agents, prompt-to-UI) qui génère sur le produit. |
| **Situation** | Onboarding, ou génération assistée d'un nouvel écran. |
| **Friction** | Il faut lire le code et interroger l'auteur pour connaître le système. |
| **Impact** | Chaque nouvel écran ré-invente des décisions déjà prises → dérive, incohérence. |
| **Preuves** | Voir l'Evidence Log ci-dessous. |
| **Inconnues** | Frontière exacte du DS ; relation entre les deux systèmes visuels. |
| **Non-objectifs** | Voir §5. |

## 3. Evidence Log

Mesures relevées sur `origin/main` le 2026-07-18. Chaque décision de refonte
devra pointer vers une de ces preuves.

| ID | Observation | Mesure | Confiance |
|---|---|---|---|
| E-01 | Volume de composants | 49 shadcn (`ui/`) + 75 custom + 56 pages = 217 `.tsx` | Élevée |
| E-02 | Couche sémantique produit existante | 37 variables CSS (`:root` + `.dark`) dans `index.css` | Élevée |
| E-03 | Palette marketing en primitives dures | ~20 hex fixes (`el.*`) dans `tailwind.config.ts` | Élevée |
| E-04 | Dérive : couleurs hardcodées | **103** valeurs (77 hex + 26 rgb) dans composants/pages | Élevée |
| E-05 | Deux systèmes visuels distincts | 25 fichiers en `el-*` (marketing) ; le reste en dark+lime (app) | Élevée |
| E-06 | Pas d'API de variant sur le custom | 9 composants `ui/` en CVA, **0** composant custom | Élevée |
| E-07 | Aucune surface de doc | Storybook : absent. Stories : 0. | Élevée |
| E-08 | Composants trop gros pour être atomiques | 3 composants > 700 lignes (`TeaserResultLayout` 733, `ManualFacecamPlacer` 712…) | Moyenne |
| E-09 | Socle MCP déjà présent | `streamnco-mcp` (`@lovable.dev/mcp-js`) + OAuth Supabase, 2 tools jouets | Élevée |
| E-10 | Références design existantes | `DESIGN.md`, `apple/DESIGN.md`, `elevenlabs/DESIGN.md` = principes, pas source de vérité | Élevée |

**Lecture.** Deux signaux positifs enterrés là-dedans : E-02 (la bonne moitié de
l'architecture token existe déjà — on complète, on ne refait pas) et E-09 (le
« 100 % IA » a un point de départ réel). Les vrais chantiers sont E-04 (dérive),
E-05 (frontière des systèmes) et E-06/E-07 (pas d'API, pas de surface).

## 4. Décisions de cadrage (validées le 2026-07-18)

| Décision | Choix | Conséquence |
|---|---|---|
| **Branche** | `design-system` dédiée | Isolé des édits Lovable/Codex sur `main`. Sync avant chaque phase. |
| **Systèmes** | **App uniquement** (dark+lime) | Le marketing `el/Fraunces` est hors scope — documenté comme système séparé, phase ultérieure. Les ~25 fichiers `el-*` sont exclus de l'inventaire DS. |
| **Périmètre** | **Exhaustif** (au sein de l'app) | Tout composant de l'app est inventorié et **classé**. Exhaustif = rien d'oublié, pas = tout traité comme une primitive. |

## 5. Non-objectifs

- **Pas de rebrand.** La marque Streamnco (dark + lime, Boogaloo) est conservée.
  Les `DESIGN.md` (getdesign) sont des principes, jamais un modèle à copier.
- **Pas de refonte du système marketing** `el/Fraunces` dans cette itération.
- **Pas de réécriture des 56 pages.** Les pages sont des consommateurs du DS,
  pas des membres du DS.
- **Pas de migration Figma en amont.** La source de vérité est le code +
  Storybook. Figma est un aval possible (code-to-canvas, Vol.1 Ch.14), plus tard.
- **Pas de changement de stack.** Vite + React + shadcn/ui restent.

## 6. Le gate de la Phase 0

Cette phase est franchie quand :

- [x] Le problème est formulé en termes de transmission, pas d'esthétique.
- [x] Les non-objectifs sont explicites.
- [x] Les preuves sont chiffrées et traçables (Evidence Log).
- [x] Les décisions de cadrage sont écrites.
- [ ] → passage à la Phase 1 (inventaire & classification).

## 7. Métrique de succès

À la fin du pipeline, le test des 4 questions du §1 se répond **oui** — par un
designer, et par un agent via le MCP. Mesure intermédiaire : le nombre de
valeurs hardcodées (E-04, aujourd'hui **103**) tend vers 0.
