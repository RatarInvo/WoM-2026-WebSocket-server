require('dotenv').config()

const jwt = require('jsonwebtoken')

if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is missing, add it to .env')
    process.exit(1)
}

const sub = process.argv[2] || 'local-user'
const expiresIn = process.argv[3] || '1h'

console.log(jwt.sign({ sub }, process.env.JWT_SECRET, { expiresIn }))