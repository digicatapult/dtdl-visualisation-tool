import express from 'express'
import { container } from 'tsyringe'
import { Env } from '../../env/index.js'
import { posthogIdCookie } from '../../models/cookieNames.js'

// UUID v4 pattern for validation
const UUID_PATTERN = /^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-4[0-9A-Fa-f]{3}-[89ABab][0-9A-Fa-f]{3}-[0-9A-Fa-f]{12}$/

export const PostHogScript = ({ req }: { req?: express.Request }): JSX.Element => {
  const env = container.resolve(Env)
  const enabled = env.get('POSTHOG_ENABLED')
  const key = env.get('NEXT_PUBLIC_POSTHOG_KEY')
  const host = env.get('NEXT_PUBLIC_POSTHOG_HOST')

  if (!enabled || !key || !host) {
    return <></>
  }

  // Get the PostHog ID from cookie to bootstrap the client with the same distinctId
  // Validate it's a proper UUID to prevent any potential XSS issues
  const posthogId = req?.signedCookies?.[posthogIdCookie]
  const isValidUuid = typeof posthogId === 'string' && UUID_PATTERN.test(posthogId)
  const bootstrapConfig = isValidUuid ? `,bootstrap:{distinctID:${JSON.stringify(posthogId)}}` : ''

  // Use JSON.stringify for safe escaping of all values interpolated into JavaScript
  const script = `
    !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys onSessionId".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
    posthog.init(${JSON.stringify(key)},{api_host:${JSON.stringify(host)},autocapture:true,capture_pageview:true,capture_pageleave:true${bootstrapConfig}})
  `

  return <script>{script}</script>
}
