/**
 * Integrations Composable
 *
 * Provides third-party integration management for the self-building app.
 * Supports various integration categories including data sources, auth providers,
 * communication tools, storage, and automation services.
 */

// Integration categories
export type IntegrationCategory = 'data' | 'auth' | 'communication' | 'storage' | 'automation' | 'analytics'

// Integration status
export type IntegrationStatus = 'available' | 'connected' | 'error' | 'configuring'

// Base integration definition
export interface IntegrationDefinition {
  id: string
  name: string
  description: string
  icon: string
  category: IntegrationCategory
  provider: string
  features: string[]
  authType: 'oauth' | 'api_key' | 'webhook' | 'none'
  configFields?: Array<{
    key: string
    label: string
    type: 'text' | 'password' | 'url' | 'select' | 'boolean'
    required?: boolean
    placeholder?: string
    options?: Array<{ value: string; label: string }>
  }>
  webhookSupport?: boolean
  docsUrl?: string
}

// Connected integration instance
export interface ConnectedIntegration {
  id: string
  integrationId: string
  name: string
  status: IntegrationStatus
  config: Record<string, any>
  credentials?: {
    accessToken?: string
    refreshToken?: string
    apiKey?: string
    expiresAt?: number
  }
  syncSettings?: {
    enabled: boolean
    interval: number
    lastSync?: number
    direction: 'import' | 'export' | 'bidirectional'
  }
  mappings?: Array<{
    sourceField: string
    targetField: string
    transform?: string
  }>
  createdAt: number
  updatedAt: number
}

// Webhook event
export interface WebhookEvent {
  id: string
  integrationId: string
  eventType: string
  payload: Record<string, any>
  receivedAt: number
  processed: boolean
}

export function useIntegrations() {
  const { currentOrganization } = useOrganizations()

  // Built-in integration definitions
  const availableIntegrations: IntegrationDefinition[] = [
    // Data integrations
    {
      id: 'airtable',
      name: 'Airtable',
      description: 'Sync data with Airtable bases and tables',
      icon: 'simple-icons:airtable',
      category: 'data',
      provider: 'Airtable',
      features: ['Import tables', 'Export records', 'Real-time sync', 'Field mapping'],
      authType: 'api_key',
      configFields: [
        { key: 'apiKey', label: 'API Key', type: 'password', required: true },
        { key: 'baseId', label: 'Base ID', type: 'text', required: true },
      ],
      docsUrl: 'https://airtable.com/developers/web/api/introduction',
    },
    {
      id: 'notion',
      name: 'Notion',
      description: 'Connect with Notion databases and pages',
      icon: 'simple-icons:notion',
      category: 'data',
      provider: 'Notion',
      features: ['Import databases', 'Sync pages', 'Block support'],
      authType: 'oauth',
      docsUrl: 'https://developers.notion.com/',
    },
    {
      id: 'google-sheets',
      name: 'Google Sheets',
      description: 'Import and export data from Google Sheets',
      icon: 'simple-icons:googlesheets',
      category: 'data',
      provider: 'Google',
      features: ['Import spreadsheets', 'Export data', 'Real-time sync'],
      authType: 'oauth',
      docsUrl: 'https://developers.google.com/sheets/api',
    },
    {
      id: 'postgres',
      name: 'PostgreSQL',
      description: 'Connect to PostgreSQL databases',
      icon: 'simple-icons:postgresql',
      category: 'data',
      provider: 'PostgreSQL',
      features: ['Query data', 'Sync tables', 'Schema import'],
      authType: 'api_key',
      configFields: [
        { key: 'connectionString', label: 'Connection String', type: 'password', required: true },
      ],
    },

    // Auth integrations
    {
      id: 'google-auth',
      name: 'Google Auth',
      description: 'Enable Google sign-in for your users',
      icon: 'simple-icons:google',
      category: 'auth',
      provider: 'Google',
      features: ['OAuth 2.0', 'Profile sync', 'SSO'],
      authType: 'oauth',
      configFields: [
        { key: 'clientId', label: 'Client ID', type: 'text', required: true },
        { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      ],
    },
    {
      id: 'github-auth',
      name: 'GitHub Auth',
      description: 'Enable GitHub sign-in for your users',
      icon: 'simple-icons:github',
      category: 'auth',
      provider: 'GitHub',
      features: ['OAuth 2.0', 'Profile sync', 'Organization access'],
      authType: 'oauth',
      configFields: [
        { key: 'clientId', label: 'Client ID', type: 'text', required: true },
        { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      ],
    },
    {
      id: 'microsoft-auth',
      name: 'Microsoft Auth',
      description: 'Enable Microsoft/Azure AD sign-in',
      icon: 'simple-icons:microsoft',
      category: 'auth',
      provider: 'Microsoft',
      features: ['OAuth 2.0', 'Azure AD', 'SSO'],
      authType: 'oauth',
    },

    // Communication integrations
    {
      id: 'slack',
      name: 'Slack',
      description: 'Send notifications and updates to Slack',
      icon: 'simple-icons:slack',
      category: 'communication',
      provider: 'Slack',
      features: ['Notifications', 'Slash commands', 'Interactive messages'],
      authType: 'oauth',
      webhookSupport: true,
      docsUrl: 'https://api.slack.com/',
    },
    {
      id: 'discord',
      name: 'Discord',
      description: 'Connect with Discord servers and channels',
      icon: 'simple-icons:discord',
      category: 'communication',
      provider: 'Discord',
      features: ['Webhooks', 'Bot integration', 'Notifications'],
      authType: 'webhook',
      webhookSupport: true,
      configFields: [
        { key: 'webhookUrl', label: 'Webhook URL', type: 'url', required: true },
      ],
    },
    {
      id: 'email-smtp',
      name: 'Email (SMTP)',
      description: 'Send emails via custom SMTP server',
      icon: 'lucide:mail',
      category: 'communication',
      provider: 'Custom',
      features: ['Transactional emails', 'Templates', 'Attachments'],
      authType: 'api_key',
      configFields: [
        { key: 'host', label: 'SMTP Host', type: 'text', required: true },
        { key: 'port', label: 'Port', type: 'text', required: true, placeholder: '587' },
        { key: 'username', label: 'Username', type: 'text', required: true },
        { key: 'password', label: 'Password', type: 'password', required: true },
      ],
    },
    {
      id: 'sendgrid',
      name: 'SendGrid',
      description: 'Send emails via SendGrid',
      icon: 'simple-icons:sendgrid',
      category: 'communication',
      provider: 'Twilio',
      features: ['Transactional emails', 'Templates', 'Analytics'],
      authType: 'api_key',
      configFields: [
        { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      ],
    },

    // Storage integrations
    {
      id: 'aws-s3',
      name: 'AWS S3',
      description: 'Store files in Amazon S3 buckets',
      icon: 'simple-icons:amazons3',
      category: 'storage',
      provider: 'Amazon',
      features: ['File upload', 'CDN', 'Presigned URLs'],
      authType: 'api_key',
      configFields: [
        { key: 'accessKeyId', label: 'Access Key ID', type: 'text', required: true },
        { key: 'secretAccessKey', label: 'Secret Access Key', type: 'password', required: true },
        { key: 'bucket', label: 'Bucket Name', type: 'text', required: true },
        { key: 'region', label: 'Region', type: 'text', required: true, placeholder: 'us-east-1' },
      ],
    },
    {
      id: 'cloudflare-r2',
      name: 'Cloudflare R2',
      description: 'S3-compatible object storage',
      icon: 'simple-icons:cloudflare',
      category: 'storage',
      provider: 'Cloudflare',
      features: ['File upload', 'CDN', 'Zero egress fees'],
      authType: 'api_key',
      configFields: [
        { key: 'accountId', label: 'Account ID', type: 'text', required: true },
        { key: 'accessKeyId', label: 'Access Key ID', type: 'text', required: true },
        { key: 'secretAccessKey', label: 'Secret Access Key', type: 'password', required: true },
        { key: 'bucket', label: 'Bucket Name', type: 'text', required: true },
      ],
    },
    {
      id: 'google-drive',
      name: 'Google Drive',
      description: 'Connect to Google Drive for file storage',
      icon: 'simple-icons:googledrive',
      category: 'storage',
      provider: 'Google',
      features: ['File sync', 'Folder organization', 'Sharing'],
      authType: 'oauth',
    },

    // Automation integrations
    {
      id: 'zapier',
      name: 'Zapier',
      description: 'Connect with 5000+ apps via Zapier',
      icon: 'simple-icons:zapier',
      category: 'automation',
      provider: 'Zapier',
      features: ['Triggers', 'Actions', 'Multi-step zaps'],
      authType: 'webhook',
      webhookSupport: true,
      docsUrl: 'https://zapier.com/developer',
    },
    {
      id: 'make',
      name: 'Make (Integromat)',
      description: 'Visual automation platform',
      icon: 'simple-icons:integromat',
      category: 'automation',
      provider: 'Make',
      features: ['Scenarios', 'Webhooks', 'Data transformation'],
      authType: 'webhook',
      webhookSupport: true,
    },
    {
      id: 'n8n',
      name: 'n8n',
      description: 'Self-hosted workflow automation',
      icon: 'simple-icons:n8n',
      category: 'automation',
      provider: 'n8n',
      features: ['Self-hosted', 'Webhooks', 'Custom nodes'],
      authType: 'webhook',
      webhookSupport: true,
    },

    // Analytics integrations
    {
      id: 'google-analytics',
      name: 'Google Analytics',
      description: 'Track user behavior and analytics',
      icon: 'simple-icons:googleanalytics',
      category: 'analytics',
      provider: 'Google',
      features: ['Page views', 'Events', 'Conversions'],
      authType: 'api_key',
      configFields: [
        { key: 'measurementId', label: 'Measurement ID', type: 'text', required: true, placeholder: 'G-XXXXXXXXXX' },
      ],
    },
    {
      id: 'posthog',
      name: 'PostHog',
      description: 'Product analytics and feature flags',
      icon: 'simple-icons:posthog',
      category: 'analytics',
      provider: 'PostHog',
      features: ['Analytics', 'Session replay', 'Feature flags'],
      authType: 'api_key',
      configFields: [
        { key: 'apiKey', label: 'API Key', type: 'password', required: true },
        { key: 'host', label: 'Host', type: 'url', placeholder: 'https://app.posthog.com' },
      ],
    },
    {
      id: 'plausible',
      name: 'Plausible',
      description: 'Privacy-friendly web analytics',
      icon: 'simple-icons:plausibleanalytics',
      category: 'analytics',
      provider: 'Plausible',
      features: ['Privacy-first', 'Lightweight', 'No cookies'],
      authType: 'api_key',
      configFields: [
        { key: 'domain', label: 'Domain', type: 'text', required: true },
        { key: 'apiKey', label: 'API Key', type: 'password' },
      ],
    },
  ]

  // Group integrations by category
  const integrationsByCategory = computed(() => {
    const grouped: Record<string, IntegrationDefinition[]> = {
      data: [],
      auth: [],
      communication: [],
      storage: [],
      automation: [],
      analytics: [],
    }

    for (const integration of availableIntegrations) {
      const category = grouped[integration.category]
      if (category) {
        category.push(integration)
      }
    }

    return grouped
  })

  // All available integrations
  const allIntegrations = computed(() => availableIntegrations)

  // Get integration definition by ID
  const getIntegrationById = (id: string): IntegrationDefinition | undefined => {
    return availableIntegrations.find((i) => i.id === id)
  }

  // Create a new connected integration instance
  const createConnectedIntegration = (integrationId: string, name?: string): ConnectedIntegration => {
    const definition = getIntegrationById(integrationId)
    return {
      id: crypto.randomUUID(),
      integrationId,
      name: name || definition?.name || 'New Integration',
      status: 'configuring',
      config: {},
      syncSettings: {
        enabled: false,
        interval: 3600000, // 1 hour default
        direction: 'import',
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
  }

  // Validate integration configuration
  const validateIntegrationConfig = (
    integration: ConnectedIntegration
  ): { valid: boolean; errors: string[] } => {
    const errors: string[] = []
    const definition = getIntegrationById(integration.integrationId)

    if (!definition) {
      errors.push('Unknown integration type')
      return { valid: false, errors }
    }

    // Check required config fields
    if (definition.configFields) {
      for (const field of definition.configFields) {
        if (field.required && !integration.config[field.key]) {
          errors.push(`${field.label} is required`)
        }
      }
    }

    return { valid: errors.length === 0, errors }
  }

  // Category metadata
  const categoryMeta: Record<IntegrationCategory, { label: string; icon: string; description: string }> = {
    data: { label: 'Data Sources', icon: 'lucide:database', description: 'Connect external data sources' },
    auth: { label: 'Authentication', icon: 'lucide:shield', description: 'Enable social login providers' },
    communication: { label: 'Communication', icon: 'lucide:message-square', description: 'Notifications and messaging' },
    storage: { label: 'Storage', icon: 'lucide:hard-drive', description: 'File and media storage' },
    automation: { label: 'Automation', icon: 'lucide:zap', description: 'Workflow automation tools' },
    analytics: { label: 'Analytics', icon: 'lucide:bar-chart-2', description: 'Track usage and behavior' },
  }

  return {
    // Integration definitions
    availableIntegrations,
    integrationsByCategory,
    allIntegrations,
    getIntegrationById,

    // Connected integration operations
    createConnectedIntegration,
    validateIntegrationConfig,

    // Metadata
    categoryMeta,

    // Context
    currentOrganization,
  }
}
