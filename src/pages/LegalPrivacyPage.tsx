import { LegalLayout, LegalSection } from "@/components/LegalLayout";

const LegalPrivacyPage = () => (
  <LegalLayout title="Politique de confidentialité">
    <LegalSection title="1. Responsable du traitement">
      <p>
        Le responsable du traitement des données collectées via Streamnco est la société Streamnco,
        Micro-Entreprise dont le siège social est situé 8, Rue de la Mare, 75020 Paris.
      </p>
      <p>
        Pour toute question relative à vos données personnelles, vous pouvez nous écrire à :{" "}
        <a href="mailto:contact@streamnco.com" className="text-foreground/80 underline-offset-2 hover:underline">
          contact@streamnco.com
        </a>
      </p>
    </LegalSection>

    <LegalSection title="2. Données collectées">
      <p>Dans le cadre de l'utilisation de Streamnco, nous collectons les données suivantes :</p>
      <ul className="ml-4 list-disc space-y-1.5">
        <li>données de compte (identifiant, préférences, paramètres) ;</li>
        <li>adresse e-mail ;</li>
        <li>données Twitch publiques associées à la chaîne analysée ;</li>
        <li>données Twitch connectées si l'utilisateur connecte son compte Twitch via OAuth ;</li>
        <li>données liées aux analyses, au StreamScore et aux recommandations générées ;</li>
        <li>données d'usage produit (pages consultées, actions effectuées) ;</li>
        <li>données de paiement et d'abonnement gérées via Stripe ;</li>
        <li>emails transactionnels envoyés via le système email de Lovable Cloud.</li>
      </ul>
    </LegalSection>

    <LegalSection title="3. Finalités du traitement">
      <p>Vos données sont utilisées pour les finalités suivantes :</p>
      <ul className="ml-4 list-disc space-y-1.5">
        <li>création et gestion du compte utilisateur ;</li>
        <li>fourniture et accès au service ;</li>
        <li>connexion Twitch et exécution des fonctionnalités associées ;</li>
        <li>génération du StreamScore et des analyses de chaîne ;</li>
        <li>suivi de progression et plans d'action ;</li>
        <li>classements et benchmarks entre chaînes ;</li>
        <li>gestion des abonnements et des paiements ;</li>
        <li>support utilisateur et communications transactionnelles ;</li>
        <li>amélioration du produit et des modèles d'analyse ;</li>
        <li>sécurité du service et prévention des abus.</li>
      </ul>
    </LegalSection>

    <LegalSection title="4. Base légale">
      <p>Le traitement de vos données repose sur les bases légales suivantes :</p>
      <ul className="ml-4 list-disc space-y-1.5">
        <li><span className="font-medium text-foreground/80">Exécution du contrat</span> : pour la fourniture du service et la gestion du compte ;</li>
        <li><span className="font-medium text-foreground/80">Consentement</span> : lorsque requis, notamment pour la connexion Twitch et certaines communications ;</li>
        <li><span className="font-medium text-foreground/80">Intérêt légitime</span> : pour l'amélioration du service, la sécurité et le support ;</li>
        <li><span className="font-medium text-foreground/80">Obligations légales</span> : notamment pour la facturation et la conservation des justificatifs comptables.</li>
      </ul>
    </LegalSection>

    <LegalSection title="5. Sous-traitants et services utilisés">
      <p>Streamnco s'appuie sur les prestataires suivants pour fournir le service :</p>
      <ul className="ml-4 list-disc space-y-1.5">
        <li><span className="font-medium text-foreground/80">Lovable Cloud</span> : hébergement et infrastructure applicative ;</li>
        <li><span className="font-medium text-foreground/80">Stripe</span> : paiement et gestion des abonnements ;</li>
        <li><span className="font-medium text-foreground/80">Twitch API</span> : accès aux données Twitch et connexion de compte ;</li>
        <li><span className="font-medium text-foreground/80">Lovable Cloud App Emails</span> : envoi des emails transactionnels.</li>
      </ul>
      <p>
        Ces prestataires n'accèdent qu'aux données strictement nécessaires à l'exécution de leur
        mission et sont tenus à des engagements de confidentialité et de sécurité.
      </p>
    </LegalSection>

    <LegalSection title="6. Durée de conservation">
      <ul className="ml-4 list-disc space-y-1.5">
        <li>données de compte : pendant toute la durée d'utilisation du service ;</li>
        <li>données d'analyse : pendant la durée nécessaire à la fourniture du service ;</li>
        <li>données de facturation : selon les durées légales applicables ;</li>
        <li>logs techniques : durée limitée nécessaire à la sécurité et au bon fonctionnement du service.</li>
      </ul>
      <p>
        À l'issue de ces durées, les données sont supprimées ou anonymisées, sauf obligation
        légale de conservation plus longue.
      </p>
    </LegalSection>

    <LegalSection title="7. Sécurité">
      <p>
        Streamnco met en œuvre des mesures techniques et organisationnelles appropriées pour
        protéger vos données contre la perte, l'accès non autorisé, la divulgation ou
        l'altération. Cela inclut notamment le chiffrement des communications (HTTPS), le
        chiffrement des jetons sensibles côté serveur et un contrôle strict des accès.
      </p>
    </LegalSection>

    <LegalSection title="8. Vos droits">
      <p>Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez des droits suivants :</p>
      <ul className="ml-4 list-disc space-y-1.5">
        <li>droit d'accès à vos données ;</li>
        <li>droit de rectification ;</li>
        <li>droit à l'effacement ;</li>
        <li>droit d'opposition ;</li>
        <li>droit à la limitation du traitement ;</li>
        <li>droit à la portabilité ;</li>
        <li>droit de retrait du consentement, lorsque le traitement repose sur celui-ci.</li>
      </ul>
      <p>
        Pour exercer ces droits, contactez-nous à{" "}
        <a href="mailto:contact@streamnco.com" className="text-foreground/80 underline-offset-2 hover:underline">
          contact@streamnco.com
        </a>
        . Vous disposez également du droit d'introduire une réclamation auprès de la CNIL
        (cnil.fr).
      </p>
    </LegalSection>

    <LegalSection title="9. Contact">
      <p>
        Pour toute question relative à la présente politique de confidentialité ou à l'exercice
        de vos droits :{" "}
        <a href="mailto:contact@streamnco.com" className="text-foreground/80 underline-offset-2 hover:underline">
          contact@streamnco.com
        </a>
      </p>
    </LegalSection>
  </LegalLayout>
);

export default LegalPrivacyPage;
