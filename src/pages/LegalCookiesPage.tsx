import { LegalLayout, LegalSection } from "@/components/LegalLayout";

const LegalCookiesPage = () => (
  <LegalLayout title="Gestion des cookies">
    <LegalSection title="1. Qu'est-ce qu'un cookie ?">
      <p>
        Un cookie est un petit fichier texte déposé sur votre terminal (ordinateur, tablette,
        smartphone) lors de la visite d'un site internet. Il permet au site de mémoriser des
        informations sur votre navigation pour améliorer votre expérience.
      </p>
      <p>
        Les cookies ne contiennent pas de virus et ne peuvent pas endommager votre appareil.
        Ils peuvent en revanche être utilisés pour tracer votre navigation à des fins
        d'analyse ou de personnalisation.
      </p>
    </LegalSection>

    <LegalSection title="2. Cookies nécessaires">
      <p>
        Ces cookies sont indispensables au bon fonctionnement du service Streamnco. Ils
        permettent notamment de maintenir votre session active, de mémoriser vos préférences
        de navigation et d'assurer la sécurité du service.
      </p>
      <p>
        Ils ne peuvent pas être désactivés sans affecter le fonctionnement du site.
        Leur dépôt ne nécessite pas votre consentement préalable.
      </p>
      <div className="mt-3 overflow-hidden rounded-xl border border-white/[0.06] bg-card/40">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="px-4 py-2.5 text-left font-semibold text-foreground/70">Cookie</th>
              <th className="px-4 py-2.5 text-left font-semibold text-foreground/70">Finalité</th>
              <th className="px-4 py-2.5 text-left font-semibold text-foreground/70">Durée</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            <tr>
              <td className="px-4 py-2.5 text-foreground/80">session</td>
              <td className="px-4 py-2.5">Maintien de la session utilisateur</td>
              <td className="px-4 py-2.5">Session</td>
            </tr>
            <tr>
              <td className="px-4 py-2.5 text-foreground/80">csrf_token</td>
              <td className="px-4 py-2.5">Protection contre les attaques CSRF</td>
              <td className="px-4 py-2.5">Session</td>
            </tr>
          </tbody>
        </table>
      </div>
    </LegalSection>

    <LegalSection title="3. Cookies de mesure d'audience">
      <p>
        Ces cookies nous permettent de mesurer l'audience du site et de comprendre comment les
        visiteurs l'utilisent (pages visitées, durée des visites, sources de trafic). Ces
        informations nous aident à améliorer le service.
      </p>
      <p>
        Ces cookies sont déposés uniquement avec votre consentement.
        Les données collectées sont agrégées et anonymisées.
      </p>
    </LegalSection>

    <LegalSection title="4. Cookies marketing">
      <p>
        Streamnco n'utilise actuellement pas de cookies à des fins de ciblage publicitaire
        ou de remarketing. Si cette pratique devait évoluer, la présente politique serait
        mise à jour et votre consentement sollicité au préalable.
      </p>
    </LegalSection>

    <LegalSection title="5. Gestion du consentement">
      <p>
        Vous pouvez à tout moment gérer vos préférences en matière de cookies :
      </p>
      <ul className="ml-4 list-disc space-y-1.5">
        <li>
          <span className="font-medium text-foreground/80">Via les paramètres de votre navigateur :</span>{" "}
          la plupart des navigateurs proposent une option permettant de refuser les cookies.
          Consultez l'aide de votre navigateur pour connaître la marche à suivre.
        </li>
        <li>
          <span className="font-medium text-foreground/80">Via notre interface de gestion des cookies :</span>{" "}
          disponible depuis le lien "Gestion des cookies" en bas de page.
        </li>
      </ul>
      <p>
        Le refus des cookies non essentiels n'affecte pas l'accès aux fonctionnalités
        principales du service.
      </p>
    </LegalSection>

    <LegalSection title="6. Contact">
      <p>
        Pour toute question relative à notre politique de cookies, vous pouvez nous contacter
        à l'adresse suivante : <span className="text-foreground/80">[Email de contact]</span>
      </p>
      <p>Dernière mise à jour : avril 2026.</p>
    </LegalSection>
  </LegalLayout>
);

export default LegalCookiesPage;
