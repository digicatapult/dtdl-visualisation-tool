import { expect } from 'chai'
import { after, before, describe, it } from 'mocha'
import { once } from 'node:events'
import { Server } from 'node:http'
import { brotliCompressSync, deflateSync, gzipSync } from 'node:zlib'
import request from 'supertest'
import createHttpServer from '../server.js'

describe('request body compression compatibility', () => {
  let server: Server

  before(async () => {
    const app = await createHttpServer()
    app.post('/test/request-body', (req, res) => {
      res.json(req.body)
    })
    server = app.listen(0)
    await once(server, 'listening')
  })

  after(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()))
    })
  })

  const encodings = [
    { name: 'br', compress: brotliCompressSync },
    { name: 'gzip', compress: gzipSync },
    { name: 'deflate', compress: deflateSync },
  ]
  const bodies = [
    { type: 'application/json', value: '{"name":"ontology"}' },
    { type: 'application/x-www-form-urlencoded', value: 'name=ontology' },
  ]

  for (const body of bodies) {
    for (const encoding of encodings) {
      it(`accepts ${encoding.name}-encoded ${body.type} requests`, async () => {
        const compressed = encoding.compress(Buffer.from(body.value))
        const req = request(server)
          .post('/test/request-body')
          .set('Content-Type', body.type)
          .set('Content-Encoding', encoding.name)
          .set('Content-Length', String(compressed.length))
        req.write(compressed)
        const response = await req

        expect(response.status).to.equal(200)
        expect(response.body).to.deep.equal({ name: 'ontology' })
      })
    }
  }
})
