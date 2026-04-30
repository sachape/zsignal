import { LegalLayout, LegalSection } from "@/components/LegalLayout";

const LegalTermsPage = () => (
  <LegalLayout title="Conditions générales d'utilisation">
    <LegalSection title="1. Objet">
      <p>
        Les présentes conditions générales d'utilisation (ci-après "CGU") régissent l'accès et
        l'utilisation du service Streamnco, copilote de progression pour streamers Twitch, édité
        par <span className="text-foreground/80">[Nom de la société]</span> (ci-après "Streamnco" ou "nous").
      </p>
      <p>
        En accédant au service, vous acceptez sans réserve les présentes CGU. Si vous n'acceptez
        pas ces conditions, vous ne devez pas utiliser Streamnco.
      </p>
    </LegalSection>

    <LegalSection title="2. Accès au service">
      <p>
        Streamnco est accessible à toute personne disposant d'une connexion internet. Une partie
        du service est disponible sans création de compte. L'accès aux fonctionnalités avancées
        requiert la création d'un compte utilisateur.
      </p>
      <p>
        Streamnco se réserve le droit de modifier, suspendre ou interrompre l'accès au service,
        en tout ou partie, à tout moment, notamment pour des raisons de maintenance.
      </p>
    </LegalSection>

    <LegalSection title="3. Création de compte">
      <p>
        Pour accéder aux fonctionnalités complètes, vous devez créer un compte en fournissant
        une adresse e-mail valide. Vous êtes responsable de la confidentialité de vos
        identifiants et de toute activité effectuée sous votre compte.
      </p>
      <p>
        Toute information fournie lors de l'inscription doit être exacte, complète et à jour.
        Streamnco se réserve le droit de suspendre ou supprimer tout compte comportant des
        informations inexactes ou frauduleuses.
      </p>
    </LegalSection>

    <LegalSection title="4. Utilisation autorisée">
      <p>Vous vous engagez à utiliser Streamnco exclusivement à des fins licites et conformes aux présentes CGU. Sont notamment interdits :</p>
      <ul className="ml-4 list-disc space-y-1.5">
        <li>toute utilisation frauduleuse, abusive ou contraire à la réglementation en vigueur ;</li>
        <li>toute tentative de contournement des mesures de sécurité du service ;</li>
        <li>toute collecte automatisée de données (scraping) non autorisée ;</li>
        <li>toute utilisation susceptible de nuire aux droits de tiers.</li>
      </ul>
    </LegalSection>

    <LegalSection title="5. Données affichées et limites d'analyse">
      <p>
        Streamnco analyse des signaux publiquement disponibles associés à votre chaîne Twitch.
        Les résultats fournis sont des indicateurs d'aide à la décision et ne constituent pas
        des garanties de performance ou de croissance.
      </p>
      <p>
        Les données affichées peuvent ne pas refléter en temps réel l'état de votre chaîne.
        Streamnco n'est pas responsable des décisions prises sur la base des analyses fournies.
      </p>
    </LegalSection>

    <LegalSection title="6. Abonnement et paiement">
      <p>
        Streamnco propose un accès gratuit limité ainsi qu'un abonnement payant mensuel donnant
        accès aux fonctionnalités complètes. Les tarifs en vigueur sont affichés sur la page
        Tarifs du site.
      </p>
      <p>
        Le paiement est effectué par prélèvement mensuel via le prestataire de paiement désigné.
        Toute période commencée est due dans son intégralité.
      </p>
    </LegalSection>

    <LegalSection title="7. Résiliation">
      <p>
        Vous pouvez résilier votre abonnement à tout moment depuis votre espace compte. La
        résiliation prend effet à la fin de la période en cours. Aucun remboursement partiel
        n'est effectué pour la période restante.
      </p>
      <p>
        Streamnco se réserve le droit de résilier votre accès en cas de violation des présentes
        CGU, sans préavis ni remboursement.
      </p>
    </LegalSection>

    <LegalSection title="8. Disponibilité du service">
      <p>
        Streamnco s'efforce d'assurer la disponibilité du service 24h/24 et 7j/7, sans toutefois
        s'y engager formellement. Des interruptions peuvent survenir pour des raisons de
        maintenance, de mise à jour ou d'événements indépendants de notre volonté.
      </p>
    </LegalSection>

    <LegalSection title="9. Responsabilité">
      <p>
        Streamnco est un outil d'aide à la décision. La responsabilité de Streamnco ne saurait
        être engagée pour les pertes ou préjudices résultant de l'utilisation ou de
        l'impossibilité d'utiliser le service, ni pour les décisions prises par l'utilisateur
        sur la base des analyses fournies.
      </p>
    </LegalSection>

    <LegalSection title="10. Propriété intellectuelle">
      <p>
        L'ensemble des contenus, marques, logos, textes, graphiques et fonctionnalités de
        Streamnco sont protégés par les droits de propriété intellectuelle applicables.
        Toute reproduction, modification ou utilisation non autorisée est strictement interdite.
      </p>
    </LegalSection>

    <LegalSection title="11. Modification des conditions">
      <p>
        Streamnco se réserve le droit de modifier les présentes CGU à tout moment. Les
        utilisateurs seront informés par tout moyen approprié. La poursuite de l'utilisation du
        service après notification vaut acceptation des nouvelles conditions.
      </p>
    </LegalSection>

    <LegalSection title="12. Contact">
      <p>
        Pour toute question relative aux présentes CGU, vous pouvez nous contacter à l'adresse
        suivante : <span className="text-foreground/80">[Email de contact]</span>
      </p>
    </LegalSection>
  </LegalLayout>
);

export default LegalTermsPage;
