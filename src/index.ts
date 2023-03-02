import dotenv from 'dotenv'
import qrcode from 'qrcode-terminal'
import { Client, Message } from 'whatsapp-web.js'
import { handleMessageGPT } from './gpt'
import { handleMessageDALLE } from './dalle'

//* Environment variables
dotenv.config()

//* Prefixes
const prefixEnabled = process.env.PREFIX_ENABLED == 'true'
const shouldReplySelf = process.env.REPLY_SELF == 'true'
const gptPrefix = process.env.GPT_PREFIX || '!gpt'
const dallePrefix = process.env.GPT_PREFIX || '!dalle'

//* Whatsapp Client
const client = new Client({
  puppeteer: {
    args: ['--no-sandbox']
  }
})

//* sends message
async function sendMessage(message: Message) {
  const messageString = message.body

  if (messageString.length == 0) return

  if (!prefixEnabled) {
    //* GPT (only <prompt>)
    await handleMessageGPT(message, messageString)
    return
  }

  //* GPT (!gpt <prompt>)
  if (messageString.startsWith(gptPrefix)) {
    const prompt = messageString.substring(gptPrefix.length + 1)
    await handleMessageGPT(message, prompt)
    return
  }

  //* DALLE (!dalle <prompt>)
  if (messageString.startsWith(dallePrefix)) {
    const prompt = messageString.substring(dallePrefix.length + 1)
    await handleMessageDALLE(message, prompt)
    return
  }
}

//* Entrypoint
const start = async () => {
  //* Whatsapp auth
  client.on('qr', (qr: string) => {
    console.log('[Whatsapp ChatGPT] Scan this QR code in whatsapp to log in:')
    qrcode.generate(qr, { small: true })
  })

  //* Whatsapp ready
  client.on('ready', () => {
    console.log('[Whatsapp ChatGPT] Client is ready!')
  })

  //* Whatsapp message
  client.on('message', async (message: Message) => {
    if (message.from == 'status@broadcast') return
    await sendMessage(message)
  })

  //* reply to own message
  client.on('message_create', async (message: Message) => {
    if (message.fromMe && shouldReplySelf) {
      await sendMessage(message)
    }
  })

  //* Whatsapp Initialization
  client.initialize()
}

start()
