# Streamnco Live Companion

Application de bureau qui écoute ton micro **en local** et déclenche un clip Twitch
quand tu prononces ton mot-clé pendant ton live.

## Confidentialité

- La reconnaissance vocale tourne **entièrement hors ligne** (modèle Vosk embarqué).
- **Aucun audio, aucun fichier, aucune transcription** n'est envoyé à Streamnco.
- Seul un petit événement JSON est transmis quand le mot-clé est détecté :
  identifiant d'événement, mot-clé, score de confiance, horodatage.
- Le Companion ne détient **jamais** de token Twitch : il s'authentifie avec son
  propre code d'appairage, et c'est le backend Streamnco qui appelle Twitch.
- Le journal affiché dans l'app est local et ne contient ni token ni transcription.

## Installation (développement)

```bash
cd companion
npm install          # télécharge aussi le modèle vocal français (~41 Mo)
npm start
```

Si le téléchargement automatique du modèle échoue, récupère
`vosk-model-small-fr-0.22.zip` sur alphacephei.com/vosk/models et décompresse-le
dans `companion/models/vosk-model-small-fr`.

## Utilisation

1. Sur Streamnco, ouvre **Voice Clip** et copie ton code d'appairage.
2. Colle-le dans le Companion, puis clique sur **Appairer**.
3. Choisis ton microphone et clique sur **Démarrer l'écoute**.
4. Utilise le **test micro** depuis Streamnco pour valider la détection sans créer de clip.
5. Active Voice Clip sur Streamnco, lance ton live, et dis ton mot-clé.

L'app reste dans la barre de menus / zone de notification et continue d'écouter
quand la fenêtre est fermée.

## Build

```bash
npm run build:mac    # .dmg
npm run build:win    # installateur .exe
```

## Architecture

| Fichier | Rôle |
| --- | --- |
| `src/main.js` | Processus principal : tray, appairage, heartbeat, envoi des événements |
| `src/preload.js` | Pont IPC minimal (contextIsolation activé) |
| `src/renderer/` | UI et capture du micro sélectionné (PCM16 16 kHz) |
| `src/engine/VoiceRecognitionEngine.js` | Interface moteur (permet de remplacer Vosk par Whisper.cpp) |
| `src/engine/voskEngine.js` | Détection locale par grammaire restreinte au mot-clé |
| `src/lib/keyword.js` | Correspondance stricte sur mot entier (« clipping » ne déclenche pas) |
| `src/lib/cooldown.js` | Anti-doublon local |
| `src/lib/api.js` | Client Streamnco (`voice-clip-trigger`, `voice-clip-heartbeat`) |

## Robustesse

- Chaque détection génère un `voice_event_id` unique ; les tentatives de renvoi
  réutilisent le **même** identifiant, donc un incident réseau ne peut jamais
  créer deux clips.
- 3 tentatives avec backoff (1s, 3s, 6s) sur erreur réseau ou 5xx uniquement.
- Micro débranché, backend injoignable, live hors ligne : notification discrète
  et journal local, jamais de crash.

## Tests

```bash
npm test
```
