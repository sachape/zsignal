import { LegalLayout, LegalSection } from "@/components/LegalLayout";

const LegalCookiesPage = () => (
  <LegalLayout
    title="Gestion des cookies"
    canonicalPath="/legal/cookies"
    description="Politique de gestion des cookies utilisés par Streamnco."
  >
    <LegalSection title="1. Qu'est-ce qu'un cookie ?">
      <p>
        Un cookie est un petit fichier texte déposé sur votre terminal (ordinateur, tablette,
        smartphone) lors de la visite d'un site internet ou de l'utilisation d'une application
        web. Il permet au service de mémoriser des informations sur votre navigation afin
        d'assurer son fonctionnement et d'améliorer votre expérience.
      </p>
    </LegalSection>

    <LegalSection title="2. Cookies utilisés par Streamnco">
      <p>
        Streamnco utilise principalement des cookies nécessaires au fonctionnement du site et de
        l'application :
      </p>
      <ul className="ml-4 list-disc space-y-1.5">
        <li>
          <span className="font-medium text-foreground/80">Cookies d'authentification et de session :</span>{" "}
          permettent de maintenir votre session active et de sécuriser votre compte.
        </li>
        <li>
          <span className="font-medium text-foreground/80">Préférences utilisateur :</span>{" "}
          mémorisent certains paramètres d'interface ou d'usage.
        </li>
        <li>
          <span className="font-medium text-foreground/80">Cookies liés au paiement Stripe :</span>{" "}
          déposés par Stripe lorsque vous ouvrez la page Checkout ou le portail client, afin
          d'assurer la sécurité des transactions et la prévention de la fraude.
        </li>
        <li>
          <span className="font-medium text-foreground/80">Cookies et traitements liés à Twitch :</span>{" "}
          utilisés lorsque vous connectez votre compte Twitch ou que vous utilisez des
          fonctionnalités s'appuyant sur l'API Twitch.
        </li>
      </ul>
      <p>
        Ces cookies sont indispensables au bon fonctionnement du service et ne nécessitent pas
        votre consentement préalable.
      </p>
    </LegalSection>

    <LegalSection title="3. Mesure d'audience">
      <p>
        Streamnco utilise principalement des cookies nécessaires au fonctionnement du service.
        D'éventuels outils de mesure d'audience pourront être ajoutés ultérieurement, avec les
        informations et, le cas échéant, le recueil du consentement nécessaires conformément à
        la réglementation applicable.
      </p>
    </LegalSection>

    <LegalSection title="4. Cookies marketing">
      <p>
        Streamnco n'utilise pas de cookies à des fins de ciblage publicitaire ou de remarketing.
        Si cette pratique devait évoluer, la présente politique serait mise à jour et votre
        consentement sollicité au préalable lorsque cela est requis.
      </p>
    </LegalSection>

    <LegalSection title="5. Gestion des cookies">
      <p>Vous pouvez à tout moment configurer la gestion des cookies :</p>
      <ul className="ml-4 list-disc space-y-1.5">
        <li>
          <span className="font-medium text-foreground/80">Via les paramètres de votre navigateur :</span>{" "}
          la plupart des navigateurs permettent de refuser ou supprimer les cookies. Le refus
          des cookies nécessaires peut empêcher le bon fonctionnement du service (notamment la
          connexion au compte).
        </li>
        <li>
          <span className="font-medium text-foreground/80">Via les services tiers concernés :</span>{" "}
          vous pouvez gérer les cookies déposés par Stripe ou Twitch directement depuis leurs
          paramètres respectifs.
        </li>
      </ul>
    </LegalSection>

    <LegalSection title="6. Contact">
      <p>
        Pour toute question relative à la présente politique de cookies :{" "}
        <a href="mailto:contact@streamnco.fr" className="text-foreground/80 underline-offset-2 hover:underline">
          contact@streamnco.fr
        </a>
      </p>
    </LegalSection>
  </LegalLayout>
);

export default LegalCookiesPage;
