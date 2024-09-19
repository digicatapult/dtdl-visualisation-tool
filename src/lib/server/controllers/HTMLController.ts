import { Readable } from 'node:stream'
import { Controller } from 'tsoa'

export type HTML = Readable

export abstract class HTMLController extends Controller {
  public async html(element: JSX.Element): Promise<HTML> {
    this.setHeader('Content-Type', 'text/html')
    return Readable.from(Buffer.from(await element, 'utf8'))
  }
}
