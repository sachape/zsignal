import { LegalLayout, LegalSection } from "@/components/LegalLayout";

const LegalMentionsPage = () => (
  <LegalLayout title="Mentions légales">
    <LegalSection title="Éditeur du site">
      <div className="space-y-2">
        <p>
          <span className="font-medium text-foreground/80">Société :</span> Streamnco
        </p>
        <p>
          <span className="font-medium text-foreground/80">Forme juridique :</span> Micro-Entreprise
        </p>
        <p>
          <span className="font-medium text-foreground/80">Capital social :</span> 1 000 €
        </p>
        <p>
          <span className="font-medium text-foreground/80">Siège social :</span> 8, Rue de la Mare, 75020 Paris, France
        </p>
        <p>
          <span className="font-medium text-foreground/80">RCS :</span> Paris
        </p>
        <p>
          <span className="font-medium text-foreground/80">SIREN/SIRET :</span> [À compléter : SIREN/SIRET]
        </p>
        <p>
          <span className="font-medium text-foreground/80">Email :</span> contact@streamnco.fr
        </p>
        <p>
          <span className="font-medium text-foreground/80">Site :</span>{" "}
          <a href="https://streamnco.fr" className="text-foreground/80 underline-offset-2 hover:underline">
            https://streamnco.fr
          </a>
        </p>
      </div>
    </LegalSection>

    <LegalSection title="Directeur de publication">
      <p>
        <span className="font-medium text-foreground/80">Nom :</span> Sacha Perathoner
      </p>
    </LegalSection>

    <LegalSection title="Hébergement">
      <p>
        Le site Streamnco est hébergé par <span className="font-medium text-foreground/80">Lovable Cloud</span>.
      </p>
    </LegalSection>

    <LegalSection title="Propriété intellectuelle">
      <p>
        Le site, les textes, interfaces, logos, éléments graphiques, contenus, noms de produit et
        éléments de marque Streamnco sont protégés par les lois françaises et internationales
        relatives à la propriété intellectuelle.
      </p>
      <p>
        Toute reproduction, diffusion, modification, adaptation ou exploitation non autorisée de
        tout ou partie des éléments du site, quel que soit le support ou le procédé utilisé, est
        interdite sans l'autorisation écrite préalable de Streamnco.
      </p>
      <p>
        Streamnco n'est pas affilié à Twitch Interactive, Inc. ni à Amazon.com, Inc. Les marques
        Twitch et leurs logos appartiennent à leurs titulaires respectifs.
      </p>
    </LegalSection>

    <LegalSection title="Contact">
      <p>
        Pour toute question concernant le site Streamnco, vous pouvez nous écrire à :{" "}
        <a href="mailto:contact@streamnco.fr" className="text-foreground/80 underline-offset-2 hover:underline">
          contact@streamnco.fr
        </a>
      </p>
    </LegalSection>
  </LegalLayout>
);

export default LegalMentionsPage;
