const express = require('express')
const cors = require('cors')

const app = express()
require('dotenv').config()

const PORT = process.env.PORT || 4000

app.use(cors())
app.use(express.json())

app.use('/', express.static(__dirname + '/static'))

const notesRouter = require('./routes/notes')
const boardsRouter = require('./routes/boards')

app.use('/notes', notesRouter)
app.use('/boards', boardsRouter)

app.use((error, req, res, next) => {
    if (error.type === 'entity.parse.failed') {
        return res.status(400).json({ msg: 'Invalid JSON in request body' })
    }

    console.error(`${req.method} ${req.originalUrl} failed:`, error)
    res.status(500).json({ msg: 'Something went wrong on the server. Please try again.' })
})

const { setupRealtime } = require('./realtime')

const server = app.listen(PORT, () => {
    console.log(`Running on ${PORT}`)
})

setupRealtime(server)