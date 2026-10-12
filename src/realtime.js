// Credits: https://github.com/websockets/ws

const { WebSocketServer, WebSocket } = require('ws')
const jwt = require('jsonwebtoken')

const rooms = new Map()

function leaveRoom(socket) {
    const room = rooms.get(socket.userId)

    if (room) {
        room.delete(socket)
        if (room.size === 0) {
            rooms.delete(socket.userId)
        }
    }
}

function broadcast(userId, message) {
    const room = rooms.get(userId)

    if (!room) {
        return
    }

    const data = JSON.stringify(message)

    for (const client of room) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(data)
        }
    }
}

function setupRealtime(server) {
    const wss = new WebSocketServer({ server })

    wss.on('connection', (socket, req) => {
        const token = new URL(req.url, 'https://people.arcada.fi/~berglual/').searchParams.get('token')

        try {
            socket.user = jwt.verify(token, process.env.JWT_SECRET)
        } catch (error) {
            return socket.close(4001, 'Authorization failed')
        }

        if (socket.user.sub === undefined || socket.user.sub === null) {
            return socket.close(4001, 'Authorization failed')
        }

        socket.userId = String(socket.user.sub)
        if (!rooms.has(socket.userId)) {
            rooms.set(socket.userId, new Set())
        }
        rooms.get(socket.userId).add(socket)

        socket.on('message', async (raw) => {
            try {
                broadcast(socket.userId, JSON.parse(raw))
            } catch (error) {
                console.log(`WebSocket message failed: ${error.message}`)
            }
        })

        socket.on('close', () => leaveRoom(socket))
    })
}

module.exports = { setupRealtime, broadcast }