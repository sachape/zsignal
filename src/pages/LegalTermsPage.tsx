import { LegalLayout, LegalSection } from "@/components/LegalLayout";

const LegalTermsPage = () => (
  <LegalLayout title="Conditions générales d'utilisation">
    <LegalSection title="1. Objet">
      <p>
        Les présentes conditions générales d'utilisation (ci-après « CGU ») régissent l'accès et
        l'utilisation du service Streamnco, SaaS d'analyse et de progression pour streamers Twitch,
        édité par Streamnco, Micro-Entreprise dont le siège est situé 8, Rue de la Mare, 75020 Paris.
      </p>
      <p>
        En accédant au service, l'utilisateur accepte sans réserve les présentes CGU. À défaut
        d'acceptation, l'utilisateur doit renoncer à utiliser Streamnco.
      </p>
    </LegalSection>

    <LegalSection title="2. Accès au service">
      <p>
        Streamnco est accessible via le site https://streamnco.com. Une partie du service est
        accessible sans création de compte (analyse publique). L'accès aux fonctionnalités
        avancées requiert la création d'un compte et, pour certaines fonctionnalités, une
        connexion à un compte Twitch.
      </p>
      <p>
        Streamnco se réserve le droit de modifier, suspendre ou interrompre l'accès au service,
        en tout ou partie, à tout moment, notamment pour des raisons de maintenance, de sécurité
        ou d'évolution produit.
      </p>
    </LegalSection>

    <LegalSection title="3. Création de compte">
      <p>
        Pour accéder aux fonctionnalités complètes, l'utilisateur doit créer un compte avec une
        adresse e-mail valide. Il est responsable de la confidentialité de ses identifiants et de
        toute activité effectuée sous son compte.
      </p>
      <p>
        Les informations fournies doivent être exactes et tenues à jour. Streamnco peut suspendre
        ou supprimer tout compte comportant des informations inexactes, frauduleuses ou utilisé
        en violation des présentes CGU.
      </p>
    </LegalSection>

    <LegalSection title="4. Connexion Twitch">
      <p>
        L'utilisateur peut connecter son compte Twitch à Streamnco via le protocole OAuth de
        Twitch. Cette connexion est facultative et permet d'accéder à des analyses approfondies
        basées sur les données de sa chaîne.
      </p>
      <p>
        L'utilisateur peut révoquer la connexion Twitch à tout moment depuis son espace compte
        ou depuis les paramètres de sécurité de son compte Twitch. Streamnco accède uniquement
        aux périmètres explicitement autorisés lors de la connexion.
      </p>
    </LegalSection>

    <LegalSection title="5. Fonctionnement des analyses">
      <p>
        Streamnco fournit des analyses, scores, recommandations et plans d'action à partir de
        données publiques Twitch, de données connectées par l'utilisateur et de signaux d'usage
        du produit.
      </p>
      <p>
        Les analyses peuvent être partielles lorsque certaines données ne sont pas disponibles.
        Dans ce cas, Streamnco le signale explicitement et n'invente pas de valeurs manquantes.
      </p>
    </LegalSection>

    <LegalSection title="6. StreamScore et recommandations">
      <p>
        Le StreamScore et les recommandations associées sont des indicateurs d'aide à la décision
        construits à partir des données disponibles. Ils ne constituent ni une garantie de
        performance, ni une promesse de croissance, de viewers, d'abonnés ou de monétisation.
      </p>
      <p>
        L'utilisateur reste seul juge des décisions à prendre concernant sa chaîne, ses contenus
        et sa stratégie.
      </p>
    </LegalSection>

    <LegalSection title="7. Limites du service">
      <p>
        Streamnco ne garantit pas une croissance, un nombre de viewers, une monétisation ou un
        résultat précis sur Twitch. Le service est fourni en l'état, en fonction des données
        accessibles au moment de l'analyse.
      </p>
      <p>
        Streamnco dépend en partie de services tiers (notamment l'API Twitch et l'infrastructure
        d'hébergement). Toute indisponibilité ou modification de ces services tiers peut affecter
        le fonctionnement du service.
      </p>
    </LegalSection>

    <LegalSection title="8. Responsabilité de l'utilisateur">
      <p>
        L'utilisateur reste responsable de ses décisions, de ses contenus, de ses lives et de
        l'usage qu'il fait du service. Il s'engage à utiliser Streamnco conformément aux lois
        applicables, aux conditions d'utilisation de Twitch et aux présentes CGU.
      </p>
      <p>Sont notamment interdits :</p>
      <ul className="ml-4 list-disc space-y-1.5">
        <li>toute utilisation frauduleuse ou abusive du service ;</li>
        <li>toute tentative de contournement des mesures de sécurité ;</li>
        <li>toute collecte automatisée non autorisée (scraping) ;</li>
        <li>toute utilisation susceptible de nuire aux droits de tiers.</li>
      </ul>
    </LegalSection>

    <LegalSection title="9. Disponibilité du service">
      <p>
        Streamnco met en œuvre les moyens raisonnables pour assurer la disponibilité du service,
        sans garantie de disponibilité continue. Des interruptions peuvent survenir pour
        maintenance, mise à jour ou en raison d'événements indépendants de la volonté de Streamnco.
      </p>
    </LegalSection>

    <LegalSection title="10. Propriété intellectuelle">
      <p>
        L'ensemble des contenus, marques, logos, textes, graphiques, interfaces et fonctionnalités
        de Streamnco sont protégés par les droits de propriété intellectuelle applicables. Toute
        reproduction, modification ou utilisation non autorisée est interdite.
      </p>
      <p>
        L'utilisateur conserve la propriété de ses contenus. Il accorde à Streamnco une licence
        strictement nécessaire à la fourniture du service (traitement, affichage, génération
        d'analyses).
      </p>
    </LegalSection>

    <LegalSection title="11. Suspension ou suppression de compte">
      <p>
        Streamnco peut suspendre ou supprimer un compte en cas de violation des présentes CGU,
        d'usage frauduleux du service ou de risque pour la sécurité de la plateforme ou de ses
        utilisateurs.
      </p>
      <p>
        L'utilisateur peut à tout moment demander la suppression de son compte en écrivant à
        contact@streamnco.com ou depuis son espace compte lorsque la fonctionnalité est disponible.
      </p>
    </LegalSection>

    <LegalSection title="12. Évolution des fonctionnalités">
      <p>
        Streamnco peut faire évoluer ses fonctionnalités, ses limites d'usage et ses offres pour
        améliorer le service. Les évolutions majeures susceptibles d'impacter l'utilisateur seront
        communiquées par tout moyen approprié.
      </p>
    </LegalSection>

    <LegalSection title="13. Droit applicable">
      <p>
        Les présentes CGU sont régies par le droit français. En cas de litige, et à défaut de
        résolution amiable, les tribunaux français seront compétents, sous réserve des règles
        impératives de protection des consommateurs.
      </p>
    </LegalSection>

    <LegalSection title="14. Contact">
      <p>
        Pour toute question relative aux présentes CGU, vous pouvez nous écrire à :{" "}
        <a href="mailto:contact@streamnco.com" className="text-foreground/80 underline-offset-2 hover:underline">
          contact@streamnco.com
        </a>
      </p>
    </LegalSection>
  </LegalLayout>
);

export default LegalTermsPage;
