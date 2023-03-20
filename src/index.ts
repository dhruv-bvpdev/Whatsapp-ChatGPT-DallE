import qrcode from 'qrcode-terminal'
import { Client, Message, Events, LocalAuth } from 'whatsapp-web.js'
import * as cli from './cli/ui'
import constants from './constants'
import { handleIncomingMessage } from './handlers/message'

//* Entrypoint
const start = async () => {
  cli.printIntro()

  //* Whatsapp Client
  const client = new Client({
    puppeteer: {
      args: ['--no-sandbox']
    },
    authStrategy: new LocalAuth({
      clientId: undefined,
      dataPath: constants.sessionPath
    })
  })

  //* Whatsapp auth
  client.on(Events.QR_RECEIVED, (qr: string) => {
    qrcode.generate(qr, { small: true }, (qrcode: string) => {
      cli.printQRCode(qrcode)
    })
  })

  //* Whatsapp loading
  client.on(Events.LOADING_SCREEN, percent => {
    if (percent == '0') {
      cli.printLoading()
    }
  })

  //* Whatsapp Authenticated
  client.on(Events.AUTHENTICATED, () => {
    cli.printAuthenticated()
  })

  //* Whatsapp Authentication Failure
  client.on(Events.AUTHENTICATION_FAILURE, () => {
    cli.printAuthenticationFailure()
  })

  //* Whatsapp ready
  client.on(Events.READY, () => {
    cli.printOutro()
  })

  //* Whatsapp message
  client.on(Events.MESSAGE_RECEIVED, async (message: any) => {
    // Ignore if message is from status broadcast
    if (message.from == constants.statusBroadcast) return

    // Ignore if it's a quoted message, (e.g. Bot reply)
    if (message.hasQuotedMsg) return
    await handleIncomingMessage(message)
  })

  //* reply to own message
  client.on(Events.MESSAGE_CREATE, async (message: Message) => {
    //* Ignore if message is from status broadcast
    if (message.from == constants.statusBroadcast) return

    //* Ignore if it's a quoted message, (e.g. Bot reply)
    if (message.hasQuotedMsg) return

    //* Ignore if it's not from me
    if (!message.fromMe) return

    await handleIncomingMessage(message)
  })

  //* Whatsapp Initialization
  client.initialize()
}

start()
