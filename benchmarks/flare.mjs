import { FlareHost } from '@flare-ts/core'
import { node } from '@flare-ts/core/node'
import { schema, str } from '@flare-ts/lib/schema'

const HelloSchema = schema({ hello: str })

const host = new FlareHost(node)
host.http.get('/', { response: { 200: HelloSchema } }, () => ({ hello: 'world' }))

host.build().run({ port: 3000, host: '127.0.0.1' })
