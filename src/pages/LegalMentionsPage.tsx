import { LegalLayout, LegalSection, LegalPlaceholder } from "@/components/LegalLayout";

const LegalMentionsPage = () => (
  <LegalLayout title="Mentions légales">
    <LegalSection title="Éditeur du site">
      <div className="space-y-2">
        <p>
          <span className="font-medium text-foreground/80">Raison sociale :</span>{" "}
          <LegalPlaceholder label="Nom de la société" />
        </p>
        <p>
          <span className="font-medium text-foreground/80">Forme juridique :</span>{" "}
          <LegalPlaceholder label="SAS / SARL / Auto-entrepreneur / etc." />
        </p>
        <p>
          <span className="font-medium text-foreground/80">Capital social :</span>{" "}
          <LegalPlaceholder label="Montant en €" />
        </p>
        <p>
          <span className="font-medium text-foreground/80">Siège social :</span>{" "}
          <LegalPlaceholder label="Adresse complète" />
        </p>
        <p>
          <span className="font-medium text-foreground/80">SIRET :</span>{" "}
          <LegalPlaceholder label="Numéro SIRET" />
        </p>
        <p>
          <span className="font-medium text-foreground/80">Numéro de TVA intracommunautaire :</span>{" "}
          <LegalPlaceholder label="FR + numéro" />
        </p>
      </div>
    </LegalSection>

    <LegalSection title="Responsable de publication">
      <p>
        <span className="font-medium text-foreground/80">Nom :</span>{" "}
        <LegalPlaceholder label="Prénom Nom" />
      </p>
      <p>
        <span className="font-medium text-foreground/80">Qualité :</span>{" "}
        <LegalPlaceholder label="Gérant / Directeur de publication / etc." />
      </p>
    </LegalSection>

    <LegalSection title="Hébergeur">
      <p>Le site Streamnco est hébergé par :</p>
      <div className="space-y-2">
        <p>
          <span className="font-medium text-foreground/80">Société :</span>{" "}
          <LegalPlaceholder label="Nom de l'hébergeur" />
        </p>
        <p>
          <span className="font-medium text-foreground/80">Adresse :</span>{" "}
          <LegalPlaceholder label="Adresse de l'hébergeur" />
        </p>
        <p>
          <span className="font-medium text-foreground/80">Site :</span>{" "}
          <LegalPlaceholder label="URL de l'hébergeur" />
        </p>
      </div>
    </LegalSection>

    <LegalSection title="Contact">
      <p>
        Pour toute question ou demande concernant le site Streamnco, vous pouvez nous contacter :
      </p>
      <div className="space-y-2">
        <p>
          <span className="font-medium text-foreground/80">Par e-mail :</span>{" "}
          <LegalPlaceholder label="Email de contact" />
        </p>
        <p>
          <span className="font-medium text-foreground/80">Par courrier :</span>{" "}
          <LegalPlaceholder label="Adresse postale" />
        </p>
      </div>
    </LegalSection>

    <LegalSection title="Propriété intellectuelle">
      <p>
        L'ensemble des éléments constituant le site Streamnco (textes, graphiques, logotypes,
        icônes, images, sons, logiciels) est la propriété exclusive de{" "}
        <LegalPlaceholder label="Nom de la société" /> ou de ses partenaires, et est protégé
        par les lois françaises et internationales relatives à la propriété intellectuelle.
      </p>
      <p>
        Toute reproduction, représentation, modification, publication ou adaptation de tout ou
        partie des éléments du site, quel que soit le moyen ou le procédé utilisé, est
        interdite sans l'autorisation écrite préalable de{" "}
        <LegalPlaceholder label="Nom de la société" />.
      </p>
      <p>
        Streamnco n'est pas affilié à Twitch Interactive, Inc. ni à Amazon.com, Inc.
        La marque Twitch et le logo Twitch sont la propriété de Twitch Interactive, Inc.
      </p>
    </LegalSection>
  </LegalLayout>
);

export default LegalMentionsPage;
