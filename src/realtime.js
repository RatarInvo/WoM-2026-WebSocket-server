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

function broadcast(userId, message, sender) {
    const room = rooms.get(userId)

    if (!room) {
        return 0
    }

    const data = JSON.stringify(message)
    let count = 0

    for (const client of room) {
        if (
            client !== sender &&
            client.readyState === WebSocket.OPEN
        ) {
            client.send(data)
            count++
        }
    }

    return count
}

function setupRealtime(server) {
    const wss = new WebSocketServer({
        server,
        verifyClient: ({ origin }, done) => {
            console.log('Browser origin:', origin)
            console.log('Allowed origin:', process.env.FRONTEND_ORIGIN)

            if (origin !== process.env.FRONTEND_ORIGIN) {
                done(false, 403, 'Origin not allowed')
                return
            }

            done(true)
        }
    })

    wss.on('connection', (socket, req) => {
        const token = new URL(
            req.url,
            'http://localhost'
        ).searchParams.get('token')

        if (!token) {
            return socket.close(
                4001,
                'ACCESS_TOKEN_MISSING'
            )
        }

        try {
            socket.user = jwt.verify(
                token,
                process.env.JWT_SECRET
            )
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return socket.close(
                    4001,
                    'ACCESS_TOKEN_EXPIRED'
                )
            }

            return socket.close(
                4001,
                'ACCESS_TOKEN_INVALID'
            )
        }

        if (
            socket.user.sub === undefined ||
            socket.user.sub === null
        ) {
            return socket.close(
                4001,
                'ACCESS_TOKEN_INVALID'
            )
        }

        socket.userId = String(socket.user.sub)

        if (!rooms.has(socket.userId)) {
            rooms.set(socket.userId, new Set())
        }

        rooms.get(socket.userId).add(socket)

        socket.on('message', (raw) => {
            try {
                const clients = broadcast(
                    socket.userId,
                    JSON.parse(raw),
                    socket
                )

                socket.send(JSON.stringify({
                    type: 'ack',
                    clients
                }))
            } catch (error) {
                console.log(
                    `WebSocket message failed: ${error.message}`
                )
            }
        })

        socket.on('close', () => leaveRoom(socket))
    })
}

module.exports = {
    setupRealtime,
    broadcast
}