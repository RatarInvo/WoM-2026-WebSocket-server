const { WebSocketServer, WebSocket } = require('ws')
const jwt = require('jsonwebtoken')

const rooms = new Map()

function leaveRoom(socket) {
    const room = rooms.get(socket.userId)

    if (!room) {
        return
    }

    room.delete(socket)

    if (room.size === 0) {
        rooms.delete(socket.userId)
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
        if (client !== sender && client.readyState === WebSocket.OPEN) {
            client.send(data)
            count++
        }
    }

    return count
}

function setupRealtime(server) {
    const allowedOrigins = (
        process.env.FRONTEND_ORIGIN ||
        'http://localhost:5500'
    )
        .split(',')
        .map((origin) => origin.trim())

    const wss = new WebSocketServer({
        server,
        verifyClient: ({ origin }, done) => {
            if (!allowedOrigins.includes(origin)) {
                done(
                    false,
                    403,
                    'Origin not allowed'
                )
                return
            }

            done(true)
        }
    })

    wss.on('connection', (socket, req) => {
        const requestUrl = new URL(
            req.url,
            'http://localhost'
        )

        const token = requestUrl.searchParams.get(
            'token'
        )

        if (!token) {
            socket.close(
                4001,
                'ACCESS_TOKEN_MISSING'
            )
            return
        }

        let user

        try {
            user = jwt.verify(
                token,
                process.env.JWT_SECRET
            )
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                socket.close(
                    4001,
                    'ACCESS_TOKEN_EXPIRED'
                )
                return
            }

            socket.close(
                4001,
                'ACCESS_TOKEN_INVALID'
            )
            return
        }

        if (
            user.sub === undefined ||
            user.sub === null
        ) {
            socket.close(
                4001,
                'ACCESS_TOKEN_INVALID'
            )
            return
        }

        socket.user = user
        socket.userId = String(user.sub)

        if (!rooms.has(socket.userId)) {
            rooms.set(
                socket.userId,
                new Set()
            )
        }

        rooms.get(socket.userId).add(socket)

        socket.on('message', (raw) => {
            try {
                const message = JSON.parse(
                    raw.toString()
                )

                const clients = broadcast(
                    socket.userId,
                    message,
                    socket
                )

                socket.send(JSON.stringify({
                    type: 'ack',
                    clients
                }))
            } catch (error) {
                socket.send(JSON.stringify({
                    type: 'error',
                    message: 'Invalid JSON message'
                }))
            }
        })

        socket.on('close', () => {
            leaveRoom(socket)
        })
    })
}

module.exports = {
    setupRealtime,
    broadcast
}