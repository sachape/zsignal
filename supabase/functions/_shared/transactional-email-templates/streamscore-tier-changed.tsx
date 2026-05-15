/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Img, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Streamnco'
const SITE_URL = 'https://streamnco.fr'
const LOGO_URL =
  'https://poblhczgdbnfunroshul.supabase.co/storage/v1/object/public/email-assets/streamnco-logo.png'

interface Props {
  previousTier?: string
  currentTier?: string
  previousScore?: number
  currentScore?: number
}

const TIER_LABEL: Record<string, string> = {
  low: 'Émergent',
  mid: 'Confirmé',
  high: 'Avancé',
}

const StreamScoreTierChangedEmail = ({
  previousTier,
  currentTier,
  previousScore,
  currentScore,
}: Props) => {
  const prevLabel = previousTier ? (TIER_LABEL[previousTier] ?? previousTier) : '—'
  const curLabel = currentTier ? (TIER_LABEL[currentTier] ?? currentTier) : '—'
  return (
    <Html lang="fr" dir="ltr">
      <Head />
      <Preview>Ton score indique une nouvelle étape dans ta progression.</Preview>
      <Body style={main}>
        <Container style={container}>
          <Img src={LOGO_URL} alt={SITE_NAME} width="140" style={logo} />

          <Heading style={h1}>Tu viens de passer un cap</Heading>

          <Text style={text}>
            Ton StreamScore vient de changer de palier.
          </Text>

          <Section style={card}>
            <Text style={cardLabel}>Palier StreamScore</Text>
            <Text style={cardScore}>
              {prevLabel} → <span style={scoreHighlight}>{curLabel}</span>
            </Text>
            {previousScore != null && currentScore != null ? (
              <Text style={cardSub}>
                Score : {previousScore} → <strong>{currentScore}</strong>
              </Text>
            ) : null}
          </Section>

          <Text style={text}>
            C'est le bon moment pour regarder ce qui a progressé et choisir ta prochaine
            action prioritaire.
          </Text>

          <Section style={ctaWrap}>
            <Button style={button} href={`${SITE_URL}/dashboard`}>Voir mon cockpit</Button>
          </Section>

          <Hr style={hr} />
          <Text style={footer}>
            Tu reçois cet email parce que ton compte {SITE_NAME} suit l'évolution de ta chaîne.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: StreamScoreTierChangedEmail,
  subject: 'Tu viens de passer un cap sur Streamnco',
  displayName: 'StreamScore — tier changed',
  previewData: { previousTier: 'low', currentTier: 'mid', previousScore: 32, currentScore: 41 },
} satisfies TemplateEntry

export default StreamScoreTierChangedEmail

const BRAND = '#89FD3A'
const INK = '#0f1115'
const INK_SOFT = '#3a4150'
const MUTED = '#8a93a3'
const SURFACE = '#f6f8f5'

const main = { backgroundColor: '#ffffff', fontFamily: '"DM Sans", Helvetica, Arial, sans-serif', margin: 0, padding: 0 }
const container = { padding: '40px 28px 32px', maxWidth: '560px' }
const logo = { margin: '0 0 32px', display: 'block' }
const h1 = { fontSize: '26px', fontWeight: 700 as const, color: INK, margin: '0 0 20px', lineHeight: '1.25', letterSpacing: '-0.01em' }
const text = { fontSize: '15px', color: INK_SOFT, lineHeight: '1.65', margin: '0 0 18px' }
const card = { backgroundColor: SURFACE, border: '1px solid #e6ebe1', borderRadius: '14px', padding: '22px 24px', margin: '12px 0 24px' }
const cardLabel = { fontSize: '12px', fontWeight: 700 as const, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: MUTED, margin: '0 0 8px' }
const cardScore = { fontSize: '22px', fontWeight: 700 as const, color: INK, margin: '0 0 8px' }
const scoreHighlight = { color: INK, backgroundColor: BRAND, padding: '0 8px', borderRadius: '6px' }
const cardSub = { fontSize: '14px', color: INK_SOFT, margin: 0 }
const ctaWrap = { textAlign: 'left' as const, margin: '8px 0 24px' }
const button = { backgroundColor: BRAND, color: INK, fontSize: '15px', fontWeight: 700 as const, borderRadius: '10px', padding: '14px 24px', textDecoration: 'none', display: 'inline-block' }
const hr = { borderColor: '#eef0ee', borderWidth: '1px 0 0 0', borderStyle: 'solid' as const, margin: '32px 0 20px' }
const footer = { fontSize: '12px', color: MUTED, lineHeight: '1.6', margin: 0 }
