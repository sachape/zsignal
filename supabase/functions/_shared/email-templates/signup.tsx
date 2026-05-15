/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Confirme ton adresse email pour {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar} />
        <Text style={brand}>{siteName}</Text>
        <Heading style={h1}>Confirme ton adresse email</Heading>
        <Text style={text}>
          Merci d'avoir créé un compte sur{' '}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          . Confirme ton adresse ({recipient}) pour activer ton compte et lancer ta première analyse.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Confirmer mon email
        </Button>
        <Text style={footer}>
          Si tu n'es pas à l'origine de cette inscription, ignore simplement cet email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: '"DM Sans", Helvetica, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '520px' }
const brandBar = { width: '40px', height: '4px', backgroundColor: '#89FD3A', borderRadius: '2px', margin: '0 0 20px' }
const brand = { fontSize: '13px', fontWeight: 600 as const, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: '#121417', margin: '0 0 28px' }
const h1 = { fontSize: '24px', fontWeight: 700 as const, color: '#121417', margin: '0 0 16px', lineHeight: '1.25' }
const text = { fontSize: '15px', color: '#4b5563', lineHeight: '1.6', margin: '0 0 24px' }
const link = { color: '#121417', textDecoration: 'underline' }
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
