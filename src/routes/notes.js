const express = require('express')
const router = express.Router()
const authorize = require('../middleware/authorize')
const { broadcast } = require('../realtime')
const {
    createNote,
    deleteNote,
    findNote,
    findBoard,
    listNotes,
    updateNote
} = require('../store')

router.use(authorize)

const boardIdFromRequest = (value) => {
    const boardId = Number(value)
    return Number.isInteger(boardId) && boardId > 0 ? boardId : null
}

router.get('/', async (req, res) => {
    try {
        const notes = listNotes(req.authUser.sub)

        return res.json(notes)
    } catch (error) {
        console.error('Could not fetch notes:', error)
        return res.status(500).json({ msg: 'Could not fetch notes' })
    }
})

router.get('/:id', async (req, res) => {
    const noteId = Number(req.params.id)

    if (!Number.isInteger(noteId)) {
        return res.status(400).json({ msg: 'Invalid note id' })
    }

    try {
        const note = findNote(noteId, req.authUser.sub)

        if (!note) {
            return res.status(404).json({ msg: 'Note not found' })
        }

        return res.json({
            ...note,
            board: { id: note.board_id, name: findBoard(note.board_id, req.authUser.sub).name }
        })
    } catch (error) {
        console.error('Could not fetch note:', error)
        return res.status(500).json({ msg: 'Could not fetch note' })
    }
})

router.post('/', async (req, res) => {
    if (!req.authUser || !req.authUser.sub) {
        return res.status(401).json({ msg: 'Unauthorized' })
    }

    const noteText = req.body?.note
    const boardId = boardIdFromRequest(req.body?.board_id)

    if (!noteText || !noteText.trim()) {
        return res.status(400).json({ msg: 'Note text is required' })
    }

    if (!boardId) {
        return res.status(400).json({ msg: 'board_id is required' })
    }

    try {
        const board = findBoard(boardId, req.authUser.sub)

        if (!board) {
            return res.status(403).json({ msg: 'No access to board' })
        }

        const note = createNote({
            author_id: req.authUser.sub,
            board_id: boardId,
            note: noteText.trim()
        })

        broadcast(boardId, { type: 'note_created', note })

        return res.status(201).json({
            user: req.authUser.name,
            msg: 'Note created',
            id: note.id
        })
    } catch (error) {
        console.error('Could not create note:', error)
        return res.status(500).json({ msg: 'Could not create note' })
    }
})

router.put('/:id', async (req, res) => {
    const noteId = Number(req.params.id)

    if (!Number.isInteger(noteId)) {
        return res.status(400).json({ msg: 'Invalid note id' })
    }

    const data = {}

    if (req.body?.note !== undefined) {
        if (typeof req.body.note !== 'string' || !req.body.note.trim()) {
            return res.status(400).json({ msg: 'Note text can not be empty' })
        }
        data.note = req.body.note.trim()
    }

    const layoutFields = {
        x: { column: 'pos_x', min: 0, max: 100000 },
        y: { column: 'pos_y', min: 0, max: 100000 },
        width: { column: 'width', min: 50, max: 5000 },
        height: { column: 'height', min: 50, max: 5000 },
        color: { column: 'color', min: 0, max: 20 }
    }

    for (const [field, rule] of Object.entries(layoutFields)) {
        if (req.body?.[field] === undefined) {
            continue
        }

        const value = Math.round(Number(req.body[field]))

        if (!Number.isFinite(value) || value < rule.min || value > rule.max) {
            return res.status(400).json({ msg: `Invalid ${field}` })
        }
        data[rule.column] = value
    }

    if (Object.keys(data).length === 0) {
        return res.status(400).json({ msg: 'Nothing to update' })
    }

    try {
        const existingNote = findNote(noteId, req.authUser.sub)

        if (!existingNote) {
            return res.status(404).json({ msg: 'Note not found' })
        }

        const note = updateNote(noteId, data)

        broadcast(note.board_id, { type: 'note_updated', note })

        return res.json({
            msg: 'Note updated',
            id: note.id,
            updatedNote: note
        })
    } catch (error) {
        console.error('Could not update note:', error)
        return res.status(500).json({ msg: 'Could not update note' })
    }
})

router.delete('/:id', async (req, res) => {
    const noteId = Number(req.params.id)

    if (!Number.isInteger(noteId)) {
        return res.status(400).json({ msg: 'Invalid note id' })
    }

    try {
        const existingNote = findNote(noteId, req.authUser.sub)

        if (!existingNote) {
            return res.status(404).json({ msg: 'Note not found' })
        }

        const note = deleteNote(noteId)

        broadcast(note.board_id, { type: 'note_deleted', id: note.id })

        return res.json({
            msg: 'Note deleted',
            id: note.id
        })
    } catch (error) {
        console.error('Could not delete note:', error)
        return res.status(500).json({ msg: 'Could not delete note' })
    }
})


module.exports = router