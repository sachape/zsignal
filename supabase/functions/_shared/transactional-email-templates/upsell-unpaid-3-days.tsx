/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Streamnco'
const SITE_URL = 'https://streamnco.fr'
const LOGO_URL =
  'https://poblhczgdbnfunroshul.supabase.co/storage/v1/object/public/email-assets/streamnco-logo.png'

interface UpsellUnpaidProps {
  displayName?: string
}

const UpsellUnpaidEmail = ({ displayName }: UpsellUnpaidProps) => {
  const greeting = displayName ? `Salut ${displayName},` : 'Salut,'
  return (
    <Html lang="fr" dir="ltr">
      <Head />
      <Preview>
        Passe au suivi complet pour comprendre quoi améliorer live après live.
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Img src={LOGO_URL} alt={SITE_NAME} width="140" style={logo} />

          <Heading style={h1}>
            Tu as ton diagnostic. Maintenant, il faut suivre ta progression.
          </Heading>

          <Text style={greetingText}>{greeting}</Text>

          <Text style={text}>
            Le premier diagnostic te donne une photo de ta chaîne. C'est utile.
            Mais ce qui fait vraiment progresser, c'est de suivre les bons signaux dans le temps.
          </Text>

          <Text style={text}>
            {SITE_NAME} Pro te permet de comprendre ce qui change après chaque live :
            ton rythme, ton StreamScore, ton contenu, ton positionnement, tes concurrents
            et ton plan d'action de la semaine.
          </Text>

          <Section style={card}>
            <Text style={cardTitle}>Ce que tu débloques avec Pro</Text>
            <Text style={bullet}>
              <span style={dot}>›</span> Analyses illimitées après chaque live
            </Text>
            <Text style={bullet}>
              <span style={dot}>›</span> Évolution de ton StreamScore sur 30, 60 et 90 jours
            </Text>
            <Text style={bullet}>
              <span style={dot}>›</span> Plan d'action personnalisé chaque semaine
            </Text>
            <Text style={bullet}>
              <span style={dot}>›</span> Benchmark concurrents complet
            </Text>
            <Text style={bulletLast}>
              <span style={dot}>›</span> Classements & watchlist pour suivre ta catégorie
            </Text>
          </Section>

          <Text style={text}>
            Sans suivi, tu avances à l'instinct.
            <br />
            Avec {SITE_NAME} Pro, tu sais quoi corriger en premier.
          </Text>

          <Section style={ctaWrap}>
            <Button style={button} href={`${SITE_URL}/pricing`}>
              Débloquer mon suivi complet
            </Button>
          </Section>

          <Text style={secondary}>
            L'offre Fondateur est disponible pour les premiers utilisateurs.
            Tu peux commencer par Pro, sans engagement.
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            Tu reçois cet email parce que tu as créé un compte {SITE_NAME}.
            <br />
            Si tu ne veux pas passer au suivi complet maintenant, tu peux simplement ignorer cet email.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: UpsellUnpaidEmail,
  subject: 'Ta chaîne a déjà assez de signaux. Il manque surtout un plan.',
  displayName: 'Upsell — unpaid 3 days',
  previewData: { displayName: 'Alex' },
} satisfies TemplateEntry

export default UpsellUnpaidEmail

const BRAND = '#89FD3A'
const INK = '#0f1115'
const INK_SOFT = '#3a4150'
const MUTED = '#8a93a3'
const SURFACE = '#f6f8f5'

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '"DM Sans", Helvetica, Arial, sans-serif',
  margin: 0,
  padding: 0,
}
const container = { padding: '40px 28px 32px', maxWidth: '560px' }
const logo = { margin: '0 0 32px', display: 'block' }
const h1 = {
  fontSize: '26px',
  fontWeight: 700 as const,
  color: INK,
  margin: '0 0 20px',
  lineHeight: '1.25',
  letterSpacing: '-0.01em',
}
const greetingText = {
  fontSize: '15px',
  fontWeight: 600 as const,
  color: INK,
  margin: '0 0 16px',
}
const text = {
  fontSize: '15px',
  color: INK_SOFT,
  lineHeight: '1.65',
  margin: '0 0 18px',
}
const card = {
  backgroundColor: SURFACE,
  border: `1px solid #e6ebe1`,
  borderRadius: '14px',
  padding: '22px 24px',
  margin: '12px 0 24px',
}
const cardTitle = {
  fontSize: '13px',
  fontWeight: 700 as const,
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  color: INK,
  margin: '0 0 14px',
}
const bullet = {
  fontSize: '14.5px',
  color: INK,
  lineHeight: '1.55',
  margin: '0 0 10px',
}
const bulletLast = { ...bullet, margin: 0 }
const dot = {
  color: BRAND,
  fontWeight: 700 as const,
  marginRight: '8px',
}
const ctaWrap = { textAlign: 'left' as const, margin: '8px 0 24px' }
const button = {
  backgroundColor: BRAND,
  color: INK,
  fontSize: '15px',
  fontWeight: 700 as const,
  borderRadius: '10px',
  padding: '14px 24px',
  textDecoration: 'none',
  display: 'inline-block',
}
const secondary = {
  fontSize: '14px',
  color: INK_SOFT,
  lineHeight: '1.6',
  margin: '0 0 8px',
}
const hr = {
  borderColor: '#eef0ee',
  borderWidth: '1px 0 0 0',
  borderStyle: 'solid' as const,
  margin: '32px 0 20px',
}
const footer = {
  fontSize: '12px',
  color: MUTED,
  lineHeight: '1.6',
  margin: 0,
}
