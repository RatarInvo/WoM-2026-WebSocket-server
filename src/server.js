const express = require('express')
const cors = require('cors')

const app = express()
require('dotenv').config()

const PORT = process.env.PORT || 4000

app.use(cors())
app.use(express.json())

app.use('/', express.static(__dirname + '/static'))

const { setupRealtime } = require('./realtime')

const server = app.listen(PORT, () => {
    console.log(`Running on ${PORT}`)
})

setupRealtime(server)