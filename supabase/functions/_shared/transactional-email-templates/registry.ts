/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as welcomeEmail } from './welcome-email.tsx'
import { template as upsellUnpaid3Days } from './upsell-unpaid-3-days.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'welcome-email': welcomeEmail,
  'upsell-unpaid-3-days': upsellUnpaid3Days,
}
