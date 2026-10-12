// Credits: https://github.com/websockets/ws

const { WebSocketServer, WebSocket } = require('ws')
const jwt = require('jsonwebtoken')
const { findBoard } = require('./store')

const rooms = new Map()

function leaveRoom(socket) {
    const room = rooms.get(socket.boardId)

    if (room) {
        room.delete(socket)
        if (room.size === 0) {
            rooms.delete(socket.boardId)
        }
    }
    socket.boardId = null
}

function broadcast(boardId, message, exceptSocket = null) {
    const room = rooms.get(boardId)

    if (!room) {
        return
    }

    const data = JSON.stringify({ ...message, board_id: boardId })

    for (const client of room) {
        if (client !== exceptSocket && client.readyState === WebSocket.OPEN) {
            client.send(data)
        }
    }
}

const toNumber = (value) => Number.isFinite(Number(value)) ? Math.round(Number(value)) : undefined

async function handleMessage(socket, message) {
    if (message.type === 'join') {
        const boardId = Number(message.board_id)

        const board = findBoard(boardId, socket.user.sub)

        leaveRoom(socket)

        if (!board) {
            return
        }

        socket.boardId = boardId
        if (!rooms.has(boardId)) {
            rooms.set(boardId, new Set())
        }
        rooms.get(boardId).add(socket)
        return
    }

    if (!socket.boardId) {
        return
    }

    if (message.type === 'note_moving') {
        broadcast(socket.boardId, {
            type: 'note_moving',
            id: toNumber(message.id),
            x: toNumber(message.x),
            y: toNumber(message.y),
            width: toNumber(message.width),
            height: toNumber(message.height)
        }, socket)
    }

    if (message.type === 'note_typing' && typeof message.content === 'string') {
        broadcast(socket.boardId, {
            type: 'note_typing',
            id: toNumber(message.id),
            content: message.content.slice(0, 5000)
        }, socket)
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

        socket.boardId = null

        socket.on('message', async (raw) => {
            try {
                await handleMessage(socket, JSON.parse(raw))
            } catch (error) {
                console.log(`WebSocket message failed: ${error.message}`)
            }
        })

        socket.on('close', () => leaveRoom(socket))
    })
}

module.exports = { setupRealtime, broadcast }