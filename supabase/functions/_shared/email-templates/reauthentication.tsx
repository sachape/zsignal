/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Ton code de vérification</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar} />
        <Text style={brand}>Streamnco</Text>
        <Heading style={h1}>Confirme ta réauthentification</Heading>
        <Text style={text}>Utilise le code ci-dessous pour confirmer ton identité :</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          Ce code expire rapidement. Si tu n'es pas à l'origine de cette demande, ignore cet email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: '"DM Sans", Helvetica, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '520px' }
const brandBar = { width: '40px', height: '4px', backgroundColor: '#89FD3A', borderRadius: '2px', margin: '0 0 20px' }
const brand = { fontSize: '13px', fontWeight: 600 as const, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: '#121417', margin: '0 0 28px' }
const h1 = { fontSize: '24px', fontWeight: 700 as const, color: '#121417', margin: '0 0 16px', lineHeight: '1.25' }
const text = { fontSize: '15px', color: '#4b5563', lineHeight: '1.6', margin: '0 0 24px' }
const codeStyle = {
  fontFamily: '"JetBrains Mono", Courier, monospace',
  fontSize: '28px',
  fontWeight: 700 as const,
  color: '#121417',
  letterSpacing: '0.12em',
  backgroundColor: '#f4f6f4',
  borderRadius: '10px',
  padding: '16px 20px',
  display: 'inline-block',
  margin: '0 0 30px',
}
const footer = { fontSize: '12px', color: '#9ca3af', margin: '36px 0 0', lineHeight: '1.5' }
