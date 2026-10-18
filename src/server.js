const express = require('express')
const cors = require('cors')

require('dotenv').config()

const app = express()
const PORT = process.env.PORT || 4000
const allowedOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:3000'

if (!allowedOrigin) {
    throw new Error('FRONTEND_ORIGIN is missing')
}

app.use(cors({
    origin: allowedOrigin
}))

app.use(express.json())

app.use('/', express.static(__dirname + '/static'))

const { setupRealtime } = require('./realtime')

const server = app.listen(PORT, () => {
    console.log(`Running on ${PORT}`)
})

setupRealtime(server)