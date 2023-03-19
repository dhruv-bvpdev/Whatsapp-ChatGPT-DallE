import qrcode from 'qrcode-terminal'
import { Client, Message, Events } from 'whatsapp-web.js'
import { handleMessageGPT } from './handlers/gpt'
import { handleMessageDALLE } from './handlers/dalle'
import { handleMessageAICONFIG } from './ai-config'
import { startsWithIgnoreCase } from './utils'
import * as cli from './cli/ui'
import config from './config'

//* Whatsapp status (status@broadcast)
const statusBroadcast = 'status@broadcast'

//* Whatsapp Client
const client = new Client({
  puppeteer: {
    args: ['--no-sandbox']
  }
})

//* Handles message
async function handleIncomingMessage(message: Message) {
  const messageString = message.body

  if (!config.prefixEnabled) {
    //* GPT (only <prompt>)
    await handleMessageGPT(message, messageString)
    return
  }

  //* GPT (!gpt <prompt>)
  if (startsWithIgnoreCase(messageString, config.gptPrefix)) {
    const prompt = messageString.substring(config.gptPrefix.length + 1)
    await handleMessageGPT(message, prompt)
    return
  }

  //* DALLE (!dalle <prompt>)
  if (startsWithIgnoreCase(messageString, config.dallePrefix)) {
    const prompt = messageString.substring(config.dallePrefix.length + 1)
    await handleMessageDALLE(message, prompt)
    return
  }

  //* Config (!dalle <prompt>)
  if (messageString.startsWith(config.aiConfigPrefix)) {
    const prompt = messageString.substring(config.aiConfigPrefix.length + 1) //! Possible Error Point
    await handleMessageAICONFIG(message, prompt)
    return
  }
}

//* Entrypoint
const start = async () => {
  cli.printIntro()

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

  //* Whatsapp ready
  client.on(Events.READY, () => {
    cli.printOutro()
  })

  //* Whatsapp message
  client.on(Events.MESSAGE_RECEIVED, async (message: any) => {
    // Ignore if message is from status broadcast
    if (message.from == statusBroadcast) return

    // Ignore if message is empty or media
    if (message.body.length == 0) return
    if (message.hasMedia) return

    // Ignore if it's a quoted message, (e.g. GPT reply)
    if (message.hasQuotedMsg) return
    await handleIncomingMessage(message)
  })

  //* reply to own message
  client.on(Events.MESSAGE_CREATE, async (message: Message) => {
    //* Ignore if message is from status broadcast
    if (message.from == statusBroadcast) return

    //* Ignore if message is empty or media
    if (message.body.length == 0) return
    if (message.hasMedia) return

    //* Ignore if it's a quoted message, (e.g. GPT reply)
    if (message.hasQuotedMsg) return

    //* Ignore if it's not from me
    if (!message.fromMe) return

    await handleIncomingMessage(message)
  })

  //* Whatsapp Initialization
  client.initialize()
}

start()
