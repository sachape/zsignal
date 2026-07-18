# GenerationJob

> Pattern métier n°2. Spec Vol.2 Ch.05. Ancrée dans `content-queue/ClipGenerationDialog`,
> `content-queue/ClipPreparationPanel`, `visual-studio/VisualGenerationDialog`.

## Rôle — la décision encodée

Une génération (clip ou visuel) est un **objet visible, annulable et repris** —
jamais un spinner anonyme. Un résultat **partiel** (2 clips sur 3) est un
**résultat**, pas une erreur.

## État actuel — éparpillé, et l'état partiel manque

Le pattern le moins mûr des 3. La logique de génération est **ré-implémentée**
dans deux endroits (`ClipPreparationPanel`, `VisualGenerationDialog`, ~23
références d'état chacun), sans abstraction commune.

**Trou confirmé** : le statut est **binaire** — `generation_status: "succeeded"`
ou échec. L'état **partiel** (`2/3 réussis`) n'existe nulle part. C'est
exactement ce que le handbook (l'exemple Streamnco) prédisait : `PartialResult`
est le pattern qu'on saute.

**Cible** : un pattern `GenerationJob` unique + l'introduction de l'état partiel.

## Anatomy

```
GenerationJob
├── Trigger       lance la génération
├── Progress      barre + ETA (obligatoire au-delà de 10s — Vol.1 Ch.10)
├── Result        succès | PARTIEL | échec
│   └── PartialResult   « 2 sur 3 réussis » + ce qui a raté, nommé
└── Recovery      reprise — rejoue UNIQUEMENT les échecs
```

## API

```ts
type JobStatus = "queued" | "generating" | "succeeded" | "partial" | "failed";

interface GenerationJobProps {
  status: JobStatus;
  progress?: number;      // 0-1. Requis dès `generating`.
  etaSeconds?: number;    // Requis dès `generating` (> 10s).
  total: number;          // nb d'items demandés (ex. 3 clips)
  produced: number;       // nb réussis (peut être < total ET valide → partial)
  onCancel?: () => void;
  onRetry?: () => void;   // rejoue les échecs, pas le lot entier
  onLeave?: () => void;   // le job survit ; notifie à la fin
}
```

## States

| État | Rendu |
|---|---|
| `queued` | Accepté, pas commencé. |
| `generating` | Barre + ETA. **Obligatoires** (> 10s). Annulable. |
| `succeeded` | `produced == total`. Résultat complet. |
| `partial` | `produced < total` **et > 0**. Un résultat avec un manque nommé — ni succès, ni erreur. |
| `failed` | `produced == 0`. Cause + reprise. |
| détaché | L'utilisateur est parti. Le job survit, notifie. |

## Tokens consommés

`--primary` (progression, succès) · `--warning` (partiel) · `--destructive`
(échec) · surfaces standards. Jamais en dur.

## A11y

- Progression : `role="progressbar"` + `aria-valuenow` + le temps estimé en texte.
- L'annonce de fin (succès/partiel/échec) doit être perceptible au lecteur d'écran
  (`aria-live="polite"`).

## INVALIDE — les combinaisons interdites

```
INVALIDE : status="generating" sans progress ni etaSeconds (au-delà de 10s)
  → une attente sans estimation est une panne (Vol.1 Ch.10).

INVALIDE : traiter status="partial" comme une erreur
  → jette 2 clips valides pour signaler 1 échec.

INVALIDE : onRetry qui rejoue le lot entier
  → détruit le travail réussi. Retry = uniquement les échecs.

INVALIDE : produced=0 rendu comme "partial"
  → 0 réussi est un échec (failed), pas un partiel.
```

## Anti-usages

- ✗ Pour une action instantanée (< 1s) → un simple bouton avec spinner suffit.
- ✗ Pour un upload (pas une génération IA) → `ManualMediaUploadDialog` existe.

## Chemin de migration

1. Définir le type `JobStatus` avec `partial` (aujourd'hui absent).
2. Extraire l'UI commune de `ClipPreparationPanel` + `VisualGenerationDialog`.
3. Les deux features consomment `GenerationJob`.
4. Introduire l'état partiel côté données (`generation_status`).

Touche 2 dialogs + le modèle de données → étape prudente, après validation.
