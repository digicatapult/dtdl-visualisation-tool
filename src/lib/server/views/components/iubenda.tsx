import { container } from 'tsyringe'
import { Env } from '../../env/index.js'

export const IubendaScript = (): JSX.Element => {
  const env = container.resolve(Env)
  const enabled = env.get('IUBENDA_ENABLED')
  const widgetId = env.get('IUBENDA_WIDGET_ID')

  if (!enabled || !widgetId) {
    return <></>
  }

  return <script type="text/javascript" src={`https://embeds.iubenda.com/widgets/${widgetId}.js`}></script>
}
