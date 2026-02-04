# Shi-Fu-Mi

Un jeu de Pierre-Feuille-Ciseaux multijoueur en temps réel avec synchronisation serveur.

## Apercu

Shi-Fu-Mi est une application web permettant de jouer au classique jeu de Pierre-Feuille-Ciseaux contre d'autres joueurs en ligne. Le jeu utilise des WebSockets pour une communication en temps réel et synchronise les countdowns entre les joueurs pour garantir une experience de jeu equitable.

## Fonctionnalites

- **Multijoueur en temps reel** - Affrontez d'autres joueurs connectes
- **Systeme d'invitation** - Invitez des joueurs disponibles et acceptez/refusez les invitations
- **Countdown synchronise** - Les phases "SHI FU MI" sont synchronisees via timestamps serveur
- **Profil joueur** - Definissez votre pseudo et selectionnez votre nationalite (200+ pays)
- **Gestion des scores** - Suivi des scores par session de jeu
- **Gestion des deconnexions** - Notification automatique si l'adversaire quitte

## Stack Technique

### Frontend
- **Next.js 15** avec Turbopack
- **React 19**
- **TypeScript**
- **Tailwind CSS**

### Backend
- **Node.js** (>=18)
- **WebSocket** (ws)
- **TypeScript**

## Installation

### Prerequisites

- Node.js 18 ou superieur
- npm, yarn ou pnpm

### Etapes

1. **Cloner le repository**
   ```bash
   git clone <repository-url>
   cd shi-fu-mi
   ```

2. **Installer les dependances**
   ```bash
   # Dependances frontend (racine)
   npm install

   # Dependances serveur
   cd server
   npm install
   cd ..
   ```

3. **Lancer l'application en developpement**
   ```bash
   # Lancer le frontend et le serveur simultanement
   npm run dev:all
   ```

   Ou separement :
   ```bash
   # Terminal 1 - Serveur WebSocket
   npm run server

   # Terminal 2 - Frontend Next.js
   npm run dev
   ```

4. **Acceder a l'application**
   - Frontend : [http://localhost:3000](http://localhost:3000)
   - Serveur WebSocket : `ws://localhost:3001`

## Scripts Disponibles

### Racine du projet

| Script | Description |
|--------|-------------|
| `npm run dev` | Lance le frontend Next.js |
| `npm run build` | Build de production du frontend |
| `npm run start` | Lance le frontend en production |
| `npm run server` | Lance le serveur WebSocket |
| `npm run dev:all` | Lance frontend + serveur simultanement |
| `npm run lint` | Verification ESLint |

### Serveur

| Script | Description |
|--------|-------------|
| `npm run dev` | Lance le serveur en mode developpement |
| `npm run build` | Compile TypeScript vers JavaScript |
| `npm run start` | Lance le serveur compile |

## Architecture

```
shi-fu-mi/
├── src/                    # Frontend Next.js
│   ├── app/                # Pages et layout
│   ├── components/         # Composants React
│   │   ├── Card/           # Affichage des coups
│   │   ├── Counter/        # Countdown SHI FU MI
│   │   ├── PreCountdown/   # Pre-countdown (5s)
│   │   ├── Lobby/          # Liste des joueurs
│   │   └── Invitation/     # Modal d'invitation
│   ├── contexts/           # Context React (GameContext)
│   ├── hooks/              # Custom hooks (useWebSocket)
│   └── types/              # Types TypeScript
│
├── server/                 # Backend WebSocket
│   ├── handlers/           # Gestionnaires de messages
│   ├── services/           # Logique metier
│   │   ├── GameService.ts  # Gestion des parties
│   │   ├── PlayerService.ts# Gestion des joueurs
│   │   └── InvitationService.ts
│   └── types/              # Types partages
│
└── public/                 # Assets statiques
```

## Comment Jouer

1. **Connexion** - Entrez votre pseudo et selectionnez votre pays
2. **Lobby** - Consultez la liste des joueurs disponibles
3. **Invitation** - Cliquez sur un joueur pour l'inviter
4. **Acceptation** - Le joueur invite accepte ou refuse
5. **Partie** - Le joueur qui a invite lance les rounds
6. **Countdown** - Phase de 5s puis "SHI FU MI" (3s)
7. **Coup** - Selectionnez Pierre, Feuille ou Ciseaux
8. **Resultat** - Le gagnant du round est affiche, les scores mis a jour

## Deroulement d'un Round

```
[Attente] → [Pre-countdown 5s] → [SHI FU MI 3s] → [Resultat]
    ↓              ↓                    ↓              ↓
 Player1      Les deux           Selection du      Affichage
 lance le     joueurs se          coup par les     des coups
  round       preparent           joueurs          et score
```

## Variables d'Environnement

### Serveur

| Variable | Description | Defaut |
|----------|-------------|--------|
| `WS_PORT` | Port du serveur WebSocket | `3001` |
| `PORT` | Port alternatif (Render.com) | - |
| `NODE_ENV` | Environnement | `development` |

### Frontend

| Variable | Description | Defaut |
|----------|-------------|--------|
| `NEXT_PUBLIC_WS_URL` | URL du serveur WebSocket | `ws://localhost:3001` |

## Deploiement

### Render.com

Le projet inclut un fichier `render.yaml` pour un deploiement sur Render.com :

```bash
# Le blueprint deploie automatiquement :
# - shi-fu-mi-server (WebSocket backend)
# - shi-fu-mi-frontend (Next.js frontend)
```

### Vercel (Frontend uniquement)

```bash
# Build et deploiement automatique
vercel --prod
```

N'oubliez pas de configurer `NEXT_PUBLIC_WS_URL` vers votre serveur WebSocket de production.

## Regles du Jeu

| Coup | Bat | Perd contre |
|------|-----|-------------|
| Pierre | Ciseaux | Feuille |
| Feuille | Pierre | Ciseaux |
| Ciseaux | Feuille | Pierre |

## Licence

MIT

---

Fait avec React, Next.js et WebSockets
