require('dotenv').config()

const WebSocket = require('ws')
const jwt = require('jsonwebtoken')

const port = process.env.PORT || 4000
const token = jwt.sign({ sub: 'local-user' }, process.env.JWT_SECRET)
const otherToken = jwt.sign({ sub: 'other-user' }, process.env.JWT_SECRET)
const origin = (process.env.FRONTEND_ORIGIN || 'http://localhost:5500').split(',')[0].trim()

function connect(connectionToken) {
    return new Promise((resolve, reject) => {
        const socket = new WebSocket(`ws://localhost:${port}/?token=${connectionToken}`, { origin })
        socket.once('open', () => resolve(socket))
        socket.once('error', reject)
    })
}

async function run() {
    const first = await connect(token)
    const second = await connect(token)
    const otherUser = await connect(otherToken)
    const receivedByFirst = []
    const receivedBySecond = []
    const receivedByOtherUser = []

    first.on('message', (message) => receivedByFirst.push(message.toString()))
    second.on('message', (message) => receivedBySecond.push(message.toString()))
    otherUser.on('message', (message) => receivedByOtherUser.push(message.toString()))

    const message = JSON.stringify({ type: 'test', message: 'Hello from Node.js' })
    first.send(message)
    await new Promise((resolve) => setTimeout(resolve, 100))

    first.close()
    second.close()
    otherUser.close()

    if (receivedBySecond[0] !== message) {
        throw new Error('Message was not delivered to every connection for the same user')
    }

    if (receivedByFirst[0] !== JSON.stringify({ type: 'ack', clients: 1 })) {
        throw new Error('Sender did not get an acknowledgement with the client count')
    }

    if (receivedByOtherUser.length !== 0) {
        throw new Error('Message was delivered to a different user')
    }

    console.log('WebSocket JWT and user-room broadcast test passed')
}

run().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
})