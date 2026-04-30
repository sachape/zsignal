import { LegalLayout, LegalSection } from "@/components/LegalLayout";

const LegalPrivacyPage = () => (
  <LegalLayout title="Politique de confidentialité">
    <LegalSection title="1. Données collectées">
      <p>
        Dans le cadre de l'utilisation de Streamnco, nous collectons les données suivantes :
      </p>
      <ul className="ml-4 list-disc space-y-1.5">
        <li>Adresse e-mail lors de la création de compte ;</li>
        <li>Données de connexion (date, heure, adresse IP) ;</li>
        <li>Préférences et paramètres de l'espace compte ;</li>
        <li>Données de navigation sur le service (pages visitées, actions effectuées).</li>
      </ul>
    </LegalSection>

    <LegalSection title="2. Données issues de Twitch ou de sources publiques">
      <p>
        Streamnco analyse des informations publiquement accessibles associées aux chaînes Twitch
        renseignées par les utilisateurs. Ces données comprennent notamment :
      </p>
      <ul className="ml-4 list-disc space-y-1.5">
        <li>Nom d'utilisateur, description de chaîne, catégories diffusées ;</li>
        <li>Fréquence et régularité des streams ;</li>
        <li>Signaux de progression et indicateurs de performance publics.</li>
      </ul>
      <p>
        Ces données ne sont pas stockées de manière permanente et ne sont utilisées qu'à des
        fins d'analyse et d'affichage dans le service.
      </p>
    </LegalSection>

    <LegalSection title="3. Finalités du traitement">
      <p>Les données collectées sont utilisées aux fins suivantes :</p>
      <ul className="ml-4 list-disc space-y-1.5">
        <li>Fourniture et amélioration du service Streamnco ;</li>
        <li>Personnalisation de l'expérience utilisateur ;</li>
        <li>Envoi de communications liées au compte (confirmation, notifications) ;</li>
        <li>Analyse d'usage à des fins de développement du produit ;</li>
        <li>Respect des obligations légales et réglementaires.</li>
      </ul>
    </LegalSection>

    <LegalSection title="4. Base légale">
      <p>Le traitement de vos données repose sur les bases légales suivantes :</p>
      <ul className="ml-4 list-disc space-y-1.5">
        <li><span className="font-medium text-foreground/80">Exécution du contrat</span> : pour la fourniture du service souscrit ;</li>
        <li><span className="font-medium text-foreground/80">Intérêt légitime</span> : pour l'amélioration du service et la sécurité ;</li>
        <li><span className="font-medium text-foreground/80">Consentement</span> : pour les communications marketing, si applicable ;</li>
        <li><span className="font-medium text-foreground/80">Obligation légale</span> : pour la conservation de certaines données comptables ou fiscales.</li>
      </ul>
    </LegalSection>

    <LegalSection title="5. Durée de conservation">
      <p>
        Vos données personnelles sont conservées pour la durée nécessaire à l'accomplissement
        des finalités décrites ci-dessus, dans le respect des obligations légales :
      </p>
      <ul className="ml-4 list-disc space-y-1.5">
        <li>Données de compte : jusqu'à la suppression du compte + 3 ans ;</li>
        <li>Données de navigation : 13 mois maximum ;</li>
        <li>Données de facturation : 10 ans (obligation comptable).</li>
      </ul>
    </LegalSection>

    <LegalSection title="6. Partage avec des prestataires">
      <p>
        Streamnco fait appel à des prestataires tiers pour la fourniture du service, notamment
        pour l'hébergement, le paiement et l'analyse d'usage. Ces prestataires accèdent aux
        données strictement nécessaires à l'exécution de leur mission et sont tenus à la
        confidentialité.
      </p>
      <p>
        Nous ne vendons pas vos données personnelles à des tiers.
      </p>
    </LegalSection>

    <LegalSection title="7. Sécurité">
      <p>
        Streamnco met en œuvre des mesures techniques et organisationnelles appropriées pour
        protéger vos données contre la perte, l'accès non autorisé, la divulgation ou
        l'altération. Cela inclut notamment le chiffrement des communications (HTTPS) et
        le contrôle des accès aux systèmes.
      </p>
    </LegalSection>

    <LegalSection title="8. Droits de l'utilisateur">
      <p>Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez des droits suivants :</p>
      <ul className="ml-4 list-disc space-y-1.5">
        <li><span className="font-medium text-foreground/80">Droit d'accès</span> : obtenir une copie de vos données ;</li>
        <li><span className="font-medium text-foreground/80">Droit de rectification</span> : corriger des données inexactes ;</li>
        <li><span className="font-medium text-foreground/80">Droit à l'effacement</span> : demander la suppression de vos données ;</li>
        <li><span className="font-medium text-foreground/80">Droit à la portabilité</span> : recevoir vos données dans un format structuré ;</li>
        <li><span className="font-medium text-foreground/80">Droit d'opposition</span> : vous opposer à certains traitements ;</li>
        <li><span className="font-medium text-foreground/80">Droit de limitation</span> : restreindre le traitement dans certains cas.</li>
      </ul>
      <p>
        Pour exercer ces droits, contactez-nous à : <span className="text-foreground/80">[Email de contact]</span>.
        Vous disposez également du droit d'introduire une réclamation auprès de la CNIL (cnil.fr).
      </p>
    </LegalSection>

    <LegalSection title="9. Contact">
      <p>
        Pour toute question relative à la présente politique de confidentialité ou à l'exercice
        de vos droits, vous pouvez nous contacter à l'adresse suivante :{" "}
        <span className="text-foreground/80">[Email de contact]</span>
      </p>
      <p>Dernière mise à jour : avril 2026.</p>
    </LegalSection>
  </LegalLayout>
);

export default LegalPrivacyPage;
