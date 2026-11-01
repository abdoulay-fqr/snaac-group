Ce projet [Next.js](https://nextjs.org) est initialise avec [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Demarrage

Lancez d'abord le serveur de developpement :

```bash
npm run dev
# ou
yarn dev
# ou
pnpm dev
# ou
bun dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur pour voir le resultat.

## Tableau De Bord Admin

Ce projet inclut un tableau de bord admin pour modifier le contenu de la landing page.

1. Creez un fichier `.env.local` avec :

```bash
ADMIN_USERNAME=votre_identifiant_admin
ADMIN_PASSWORD=votre_mot_de_passe_robuste
ADMIN_SECRET=votre_secret_long_et_aleatoire
```

2. Demarrez l'application et ouvrez :

- `http://localhost:3000/admin/login` pour vous connecter
- `http://localhost:3000/admin` pour acceder au tableau de bord

Les modifications du tableau de bord sont enregistrees dans `data/landing-content.json`.

Vous pouvez commencer a modifier la page en editant `app/page.tsx`. La page se met a jour automatiquement.

Ce projet utilise [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) pour optimiser et charger automatiquement [Geist](https://vercel.com/font), une nouvelle famille de polices Vercel.

## En Savoir Plus

Pour en savoir plus sur Next.js, consultez les ressources suivantes :

- [Documentation Next.js](https://nextjs.org/docs) - decouvrez les fonctionnalites et l'API Next.js.
- [Apprendre Next.js](https://nextjs.org/learn) - un tutoriel interactif Next.js.

Vous pouvez consulter [le depot GitHub Next.js](https://github.com/vercel/next.js) - vos retours et contributions sont les bienvenus !

## Deploiement Sur Vercel

La facon la plus simple de deployer votre application Next.js est d'utiliser la [plateforme Vercel](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme), creee par les auteurs de Next.js.

Consultez la [documentation de deploiement Next.js](https://nextjs.org/docs/app/building-your-application/deploying) pour plus de details.
