const TOKEN_KEY = 'pastebin.token'
const SERVER_KEY = 'pastebin.server'

const pasteInput = document.getElementById('paste')
const logBox = document.getElementById('log')
const statusText = document.getElementById('status')
const reconnectButton = document.getElementById('reconnect')
const settingsDialog = document.getElementById('settings')
const settingsForm = document.getElementById('settings-form')
const settingsMessage = document.getElementById('settings-message')
const tokenInput = document.getElementById('token')
const serverInput = document.getElementById('server')

let socket = null

function defaultServerUrl() {
    if (location.protocol === 'file:') {
        return 'ws://localhost:4000'
    }
    return `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`
}

function serverUrl() {
    return (localStorage.getItem(SERVER_KEY) || defaultServerUrl()).replace(/\/+$/, '')
}

function tokenPayload(token) {
    try {
        return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    } catch (error) {
        return null
    }
}

function log(text) {
    const line = document.createElement('p')
    line.textContent = text
    logBox.append(line)
    logBox.scrollTop = logBox.scrollHeight
}

function setStatus(text, state) {
    statusText.textContent = text
    statusText.className = `status ${state}`
    reconnectButton.hidden = state !== 'closed'
}

function openSettings(message) {
    settingsMessage.textContent = message || ''
    settingsMessage.hidden = !message
    tokenInput.value = localStorage.getItem(TOKEN_KEY) || ''
    serverInput.value = localStorage.getItem(SERVER_KEY) || ''
    serverInput.placeholder = defaultServerUrl()
    if (!settingsDialog.open) {
        settingsDialog.showModal()
    }
}

function connect() {
    const token = localStorage.getItem(TOKEN_KEY)

    if (!token) {
        setStatus('Not logged in', 'closed')
        return openSettings('Paste your JWT to log in.')
    }

    const payload = tokenPayload(token)

    if (!payload) {
        setStatus('Invalid JWT', 'closed')
        return openSettings('That does not look like a JWT. Paste a new JWT to log in.')
    }

    if (payload.exp !== undefined && payload.exp * 1000 <= Date.now()) {
        setStatus('Session expired', 'closed')
        return openSettings('Your session has expired. Paste a new JWT to log in again.')
    }

    if (socket) {
        socket.onclose = null
        socket.close()
    }

    setStatus('Connecting to server...', 'connecting')
    socket = new WebSocket(`${serverUrl()}/?token=${encodeURIComponent(token)}`)

    socket.onopen = () => setStatus('Connected to server', 'open')

    socket.onmessage = (event) => {
        const message = JSON.parse(event.data)

        if (message.type === 'ack') {
            log(`Pasted value sent to ${message.clients} clients`)
        } else if (message.type === 'paste') {
            pasteInput.value = message.text
            log('Received pasted value')
        }
    }

    socket.onclose = (event) => {
        socket = null

        if (event.code === 4001) {
            setStatus('Not authorized', 'closed')
            openSettings('Your session has expired or the JWT is invalid. Paste a new JWT to log in again.')
        } else {
            setStatus('Disconnected from server', 'closed')
        }
    }
}

function send(text) {
    if (!text) {
        return
    }

    if (!socket || socket.readyState !== WebSocket.OPEN) {
        log('Not connected, value was not sent')
        return
    }

    socket.send(JSON.stringify({ type: 'paste', text }))
}

pasteInput.addEventListener('paste', () => setTimeout(() => send(pasteInput.value)))

pasteInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        send(pasteInput.value)
    }
})

pasteInput.addEventListener('focus', () => pasteInput.select())

reconnectButton.addEventListener('click', connect)

document.getElementById('settings-button').addEventListener('click', () => openSettings())

document.getElementById('close-settings').addEventListener('click', () => settingsDialog.close())

document.getElementById('logout').addEventListener('click', () => {
    localStorage.removeItem(TOKEN_KEY)
    if (socket) {
        socket.onclose = null
        socket.close()
        socket = null
    }
    setStatus('Not logged in', 'closed')
    tokenInput.value = ''
})

settingsForm.addEventListener('submit', (event) => {
    event.preventDefault()
    settingsDialog.close()

    localStorage.setItem(TOKEN_KEY, tokenInput.value.trim())

    if (serverInput.value.trim()) {
        localStorage.setItem(SERVER_KEY, serverInput.value.trim())
    } else {
        localStorage.removeItem(SERVER_KEY)
    }

    connect()
})

connect()