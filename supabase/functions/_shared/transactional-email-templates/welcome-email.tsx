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
const SITE_URL = 'https://streamnco.com'
const LOGO_URL =
  'https://poblhczgdbnfunroshul.supabase.co/storage/v1/object/public/email-assets/streamnco-logo.png'

interface WelcomeEmailProps {
  displayName?: string
}

const WelcomeEmail = ({ displayName }: WelcomeEmailProps) => {
  const greeting = displayName ? `Salut ${displayName},` : 'Salut,'
  return (
    <Html lang="fr" dir="ltr">
      <Head />
      <Preview>
        Identifie ce qui freine ta chaîne et découvre quoi améliorer en priorité.
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Img src={LOGO_URL} alt={SITE_NAME} width="140" style={logo} />

          <Heading style={h1}>Bienvenue dans {SITE_NAME}</Heading>

          <Text style={greetingText}>{greeting}</Text>

          <Text style={text}>
            Ta chaîne ne manque pas forcément d'effort. Elle manque surtout de clarté.
          </Text>

          <Text style={text}>
            {SITE_NAME} analyse ta chaîne Twitch pour t'aider à comprendre ce qui bloque ta
            progression : rythme de live, structure, contenu, positionnement, momentum et
            potentiel de monétisation.
          </Text>

          <Section style={card}>
            <Text style={cardTitle}>Ce que tu vas pouvoir faire</Text>
            <Text style={bullet}>
              <span style={dot}>›</span> Obtenir ton StreamScore et comprendre où tu en es vraiment
            </Text>
            <Text style={bullet}>
              <span style={dot}>›</span> Identifier ton blocage principal sans passer des heures dans tes stats
            </Text>
            <Text style={bullet}>
              <span style={dot}>›</span> Suivre ton évolution live après live
            </Text>
            <Text style={bullet}>
              <span style={dot}>›</span> Comparer ta chaîne à d'autres streamers de ta catégorie
            </Text>
            <Text style={bulletLast}>
              <span style={dot}>›</span> Recevoir un plan d'action clair chaque semaine
            </Text>
          </Section>

          <Text style={text}>
            Le but n'est pas de te noyer dans des chiffres. Le but est simple : savoir quoi
            améliorer en premier pour progresser plus vite.
          </Text>

          <Section style={ctaWrap}>
            <Button style={button} href={`${SITE_URL}/dashboard`}>
              Ouvrir mon cockpit
            </Button>
          </Section>

          <Text style={secondary}>
            Commence par lancer ou consulter ton diagnostic. En quelques minutes, tu sauras
            quelle action prioritaire peut faire avancer ta chaîne cette semaine.
          </Text>

          <Hr style={hr} />

          <Text style={footer}>
            Tu reçois cet email parce que tu as créé un compte {SITE_NAME}.
            <br />
            Si ce n'était pas toi, tu peux ignorer cet email.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: WelcomeEmail,
  subject: 'Bienvenue sur Streamnco — ton premier diagnostic t\'attend',
  displayName: 'Welcome email',
  previewData: { displayName: 'Alex' },
} satisfies TemplateEntry

export default WelcomeEmail

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
  fontSize: '28px',
  fontWeight: 700 as const,
  color: INK,
  margin: '0 0 20px',
  lineHeight: '1.2',
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
