const express = require('express')
const cors = require('cors')

require('dotenv').config()

const app = express()
const PORT = process.env.PORT || 4000
const allowedOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5500'

app.use(cors({
    origin: allowedOrigin,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}))

app.use(express.json())

const { setupRealtime } = require('./realtime')

const server = app.listen(PORT, () => {
    console.log(
        `WebSocket server running on ws://localhost:${PORT}`
    )
})

setupRealtime(server)