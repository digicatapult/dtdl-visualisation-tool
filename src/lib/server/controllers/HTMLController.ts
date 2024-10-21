import { Readable } from 'node:stream'
import { Controller } from 'tsoa'
import { concatStreams } from '../utils/streams.js'

export type HTML = Readable
type ReadableArray = [Readable, ...Readable[]]

const jsxToReadable = async (el: JSX.Element): Promise<Readable> => Readable.from(Buffer.from(await el))

export abstract class HTMLController extends Controller {
  public async html(element: JSX.Element, ...oobElements: JSX.Element[]): Promise<HTML> {
    this.setHeader('Content-Type', 'text/html')
    const toReadableArray: ReadableArray = [
      await jsxToReadable(element),
      ...(await Promise.all(oobElements.map(jsxToReadable))),
    ]
    return concatStreams(...toReadableArray)
  }
}
