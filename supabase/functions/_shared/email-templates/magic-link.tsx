/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Ton lien de connexion {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src="https://poblhczgdbnfunroshul.supabase.co/storage/v1/object/public/email-assets/streamnco-logo.png" alt="Streamnco" width="140" style={logo} />
        <Heading style={h1}>Ton lien de connexion</Heading>
        <Text style={text}>
          Clique sur le bouton ci-dessous pour te connecter à {siteName}. Ce lien expire rapidement pour des raisons de sécurité.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Me connecter
        </Button>
        <Text style={footer}>
          Si tu n'as pas demandé ce lien, ignore simplement cet email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = { backgroundColor: '#ffffff', fontFamily: '"DM Sans", Helvetica, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '520px' }
const logo = { margin: '0 0 28px', display: 'block' }
const h1 = { fontSize: '24px', fontWeight: 700 as const, color: '#121417', margin: '0 0 16px', lineHeight: '1.25' }
const text = { fontSize: '15px', color: '#4b5563', lineHeight: '1.6', margin: '0 0 24px' }
const button = {
  backgroundColor: '#89FD3A',
  color: '#121417',
  fontSize: '15px',
  fontWeight: 600 as const,
  borderRadius: '10px',
  padding: '13px 22px',
  textDecoration: 'none',
  display: 'inline-block',
}
const footer = { fontSize: '12px', color: '#9ca3af', margin: '36px 0 0', lineHeight: '1.5' }
