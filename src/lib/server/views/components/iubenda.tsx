import { container } from 'tsyringe'
import { Env } from '../../env/index.js'

export const IubendaScript = (): JSX.Element => {
  const env = container.resolve(Env)
  const enabled = env.get('IUBENDA_ENABLED')
  const widgetId = env.get('IUBENDA_WIDGET_ID')

  if (!enabled || !widgetId) {
    return <></>
  }

  // Security Note: Loading Iubenda widget from CDN without SRI (Subresource Integrity)
  // This is a conscious decision as:
  // 1. Iubenda is a trusted third-party privacy compliance service
  // 2. The widget requires dynamic updates for legal/regulatory compliance changes
  // 3. SRI would break functionality when Iubenda updates their widget
  // 4. The widget is opt-in via IUBENDA_ENABLED environment variable (default: false)
  // Alternative mitigations: CSP headers should be configured at infrastructure level
  return <script type="text/javascript" src={`https://embeds.iubenda.com/widgets/${widgetId}.js`}></script>
}
