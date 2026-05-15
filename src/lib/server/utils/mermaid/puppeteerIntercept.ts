/**
 * Puppeteer doesn't allow importing ESM modules from `file://` URLs.
 * We serve them via a fake HTTPS origin instead — the same approach used by
 * @mermaid-js/mermaid-cli in its puppeteerIntercept.js module.
 */

import { readFile } from 'node:fs/promises'
import url from 'node:url'

import type { HTTPRequest } from 'puppeteer'

export const INTERCEPT_ORIGIN = 'https://mermaid-elk-intercept.invalid'

export function fileUrlToInterceptUrl(fileUrl: URL): string {
  return `${INTERCEPT_ORIGIN}${fileUrl.pathname}`
}

export async function interceptRequestHandler(request: HTTPRequest): Promise<void> {
  let parsedReqUrl: URL
  try {
    parsedReqUrl = new URL(request.url())
  } catch {
    await request.continue()
    return
  }
  if (parsedReqUrl.origin !== INTERCEPT_ORIGIN) {
    await request.continue()
    return
  }
  const filePath = url.fileURLToPath(new URL(parsedReqUrl.pathname, 'file://'))
  try {
    await request.respond({
      status: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      contentType: 'application/javascript',
      body: await readFile(filePath),
    })
  } catch {
    await request.abort()
  }
}
