import { promises as fs } from "fs";
import path from "path";

export type FeatureItem = {
  icon: string;
  alt: string;
  title: string;
  description: string;
};

export type AdvantageItem = {
  title: string;
  icon: string;
  description: string;
};

export type LandingContent = {
  hero: {
    titleHighlight: string;
    titleLine1: string;
    titleLine2Highlight: string;
    description: string;
    ctaText: string;
  };
  features: FeatureItem[];
  together: {
    title: string;
    subtitle: string;
    description: string;
    benefits: string[];
    checklist: string[];
    ctaText: string;
  };
  advantages: {
    title: string;
    titleHighlight: string;
    detailTitle: string;
    detailFooter: string;
    bannerText: string;
    bannerHighlight: string;
    items: AdvantageItem[];
  };
  steps: {
    title: string;
    titleHighlight: string;
    subtitle: string;
    ctaText: string;
    items: Array<{
      number: string;
      title: string;
      description: string;
    }>;
  };
  contact: {
    title: string;
    titleHighlight: string;
    subtitle: string;
    infoEmailLabel: string;
    infoEmailValue: string;
    infoPhoneLabel: string;
    infoPhoneValue: string;
  };
  footer: {
    copyright: string;
  };
};

export const defaultLandingContent: LandingContent = {
  hero: {
    titleHighlight: "Economisez jusqu'a 20% de vos charges des le 1er mois !",
    titleLine1: "Seul on est fort",
    titleLine2Highlight: "mais ensemble on gagne de l'argent !",
    description:
      "Optimisez jusqu'a 20% de vos charges grace a SNAAC Group, La centrale d'achats nouvelle generation pour TPE/PME.",
    ctaText: "Rejoignez nos rangs en devenant adherent SNAAC",
  },
  features: [
    {
      icon: "/icon-target.svg",
      alt: "Achetez mieux",
      title: "Achetez mieux",
      description:
        "Beneficiez de tarifs negocies aupres de nos fournisseurs partenaires.",
    },
    {
      icon: "https://api.iconify.design/mdi/trending-down.svg",
      alt: "Economisez",
      title: "Economisez jusqu'a 20%",
      description:
        "Optimisez vos charges et economisez sur vos principaux postes de depenses.",
    },
    {
      icon: "/team.svg",
      alt: "Mutualisez",
      title: "Mutualisez votre force",
      description:
        "Integrez un veritable reseau d'entrepreneurs de votre region.",
    },
  ],
  together: {
    title: "Ensemble, invincibles !",
    subtitle: "Pourquoi rejoindre SNAAC Group ?",
    description:
      "SNAAC Group est la centrale d'achats des TPE/PME en Rhone-Alpes / Auvergne, partenaire privilegie des entreprises pour les aider a optimiser leurs couts au sein d'un reseau d'achats groupes.",
    benefits: [
      "Rejoignez le reseau des PME en avantages negocies.",
      "Beneficiez d'une expertise et d'un accompagnement personnalise.",
      "Voyez concretement vos economies et le reel retour sur investissement.",
    ],
    checklist: [
      "Tarifs negocies",
      "Accompagnement personnalise",
      "Reseau d'entrepreneurs solidaires",
      "Suivi et reporting de vos economies",
      "Acces fournisseurs premium",
    ],
    ctaText: "Devenir adherent",
  },
  advantages: {
    title: "Nos",
    titleHighlight: "Avantages",
    detailTitle: "Details",
    detailFooter: "Pour plus d'informations, Contactez nous",
    bannerText: "Seul, on est fort ! Mais ensemble on est",
    bannerHighlight: "INVINCIBLE",
    items: [
      {
        title: "Energie",
        icon: "Zap",
        description:
          "Optimisez vos couts energetiques grace a nos partenaires negocies et des offres adaptees aux entreprises.",
      },
      {
        title: "Telecom",
        icon: "Phone",
        description:
          "Reduisez vos factures telecom et ameliorez vos abonnements professionnels avec des solutions optimisees.",
      },
      {
        title: "Fournitures",
        icon: "ShoppingBag",
        description:
          "Accedez a des fournitures professionnelles a prix negocies pour reduire vos depenses operationnelles.",
      },
      {
        title: "Assurance",
        icon: "Shield",
        description:
          "Beneficiez de solutions d'assurance adaptees aux besoins des TPE/PME et de leurs activites.",
      },
      {
        title: "Internet",
        icon: "Globe",
        description:
          "Optimisez vos abonnements internet professionnels avec des offres performantes et economiques.",
      },
      {
        title: "Vehicules",
        icon: "Truck",
        description:
          "Solutions de gestion et optimisation de flotte et vehicules professionnels.",
      },
      {
        title: "Cash & Carry",
        icon: "CreditCard",
        description:
          "Accedez a des solutions d'achat en gros pour reduire vos couts d'approvisionnement.",
      },
      {
        title: "Mutuelle",
        icon: "Heart",
        description:
          "Protegez vos employes avec des solutions de mutuelle adaptees et avantageuses.",
      },
      {
        title: "RH",
        icon: "Users",
        description:
          "Optimisez la gestion de vos ressources humaines et de vos equipes efficacement.",
      },
      {
        title: "Et plus...",
        icon: "MoreHorizontal",
        description: "",
      },
    ],
  },
  steps: {
    title: "Pret a optimiser vos charges jusqu'a",
    titleHighlight: "20%",
    subtitle:
      "Rejoignez les adhérents SNAAC Group et bénéficiez d'avantages exclusifs dès le lancement.",
    ctaText: "Rejoindre SNAAC Group",
    items: [
      {
        number: "01",
        title: "Inscrivez-vous",
        description: "Remplissez le formulaire d'adhesion en quelques minutes.",
      },
      {
        number: "02",
        title: "Validation",
        description: "Notre equipe valide votre dossier rapidement.",
      },
      {
        number: "03",
        title: "Economisez",
        description: "Accedez immediatement a tous vos avantages negocies.",
      },
    ],
  },
  contact: {
    title: "Contactez-",
    titleHighlight: "nous",
    subtitle:
      "Une question ? Notre equipe est a votre ecoute pour vous accompagner dans votre demarche.",
    infoEmailLabel: "Email",
    infoEmailValue: "contact@snaac-group.com",
    infoPhoneLabel: "Telephone",
    infoPhoneValue: "06 64 27 01 93",
  },
  footer: {
    copyright:
      "© 2026 SNAAC Group - Centrale d'achats nouvelle génération pour TPE/PME. Tous droits réservés. | SIRET : 399 592 058 R.C.S.",
  },
};

const contentPath = path.join(process.cwd(), "data", "landing-content.json");

function sanitizeContent(content: Partial<LandingContent>): LandingContent {
  return {
    ...defaultLandingContent,
    ...content,
    hero: { ...defaultLandingContent.hero, ...content.hero },
    together: { ...defaultLandingContent.together, ...content.together },
    contact: { ...defaultLandingContent.contact, ...content.contact },
    footer: { ...defaultLandingContent.footer, ...content.footer },
    features: Array.isArray(content.features)
      ? content.features
      : defaultLandingContent.features,
    advantages: {
      ...defaultLandingContent.advantages,
      ...content.advantages,
      items: Array.isArray(content.advantages?.items)
        ? content.advantages.items
        : defaultLandingContent.advantages.items,
    },
    steps: {
      ...defaultLandingContent.steps,
      ...content.steps,
      items: Array.isArray(content.steps?.items)
        ? content.steps.items
        : defaultLandingContent.steps.items,
    },
  };
}

export async function getLandingContent(): Promise<LandingContent> {
  try {
    const raw = await fs.readFile(contentPath, "utf8");
    return sanitizeContent(JSON.parse(raw) as LandingContent);
  } catch {
    return defaultLandingContent;
  }
}

export async function saveLandingContent(content: Partial<LandingContent>) {
  const safeContent = sanitizeContent(content);
  await fs.mkdir(path.dirname(contentPath), { recursive: true });
  await fs.writeFile(contentPath, JSON.stringify(safeContent, null, 2), "utf8");
  return safeContent;
}
