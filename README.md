# WoM-2026 WebSocket API

JWT-authorized realtime messaging for the Notes App. Each message is broadcast
to every active connection belonging to the same authenticated user. No database
is required.

The root URL serves the interactive documentation page:

```text
http://localhost:4000/
```

## Features

- JWT authentication using the shared `JWT_SECRET`
- Private broadcast rooms based on the JWT `sub` claim
- JSON messages with delivery acknowledgements
- Explicit authentication close codes
- Static API documentation at `/`
- Docker support for local development and deployment

## Requirements

- Node.js 24 or later
- npm

## Configuration

Create a `.env` file in the project root. Keep secrets out of version control.

```env
JWT_SECRET="replace-with-the-secret-shared-by-the-login-api"
PORT=4000
MODE=development
FRONTEND_ORIGIN="http://localhost:5500"
```

`JWT_SECRET` must be identical to the secret used by the Login API. The JWT
must contain a `sub` claim identifying the user.

## Installation

```bash
npm install
```

## Running locally

Start the service:

```bash
npm start
```

Start with Nodemon:

```bash
npm run dev
```

The service listens on `http://localhost:4000/` and accepts WebSocket
connections at `ws://localhost:4000/?token=<your-jwt>`.

Generate a development token:

```bash
npm run token -- local-user 1h
```

## WebSocket protocol

### Connect

Pass the JWT as the `token` query parameter:

```js
const socket = new WebSocket(
	`ws://localhost:4000/?token=${token}`
)
```

The server verifies the token, reads its `sub` claim, and adds the connection
to that user's room. Connections with a different `sub` never receive each
other's messages.

### Send a message

Send any valid JSON value. The sender's message is delivered to every other
open connection in the same room:

```json
{
	"type": "note.updated",
	"message": "Hello from the client"
}
```

The sender receives an acknowledgement containing the number of recipients:

```json
{
	"type": "ack",
	"clients": 2
}
```

Malformed JSON does not close the connection. It returns:

```json
{
	"type": "error",
	"message": "Invalid JSON message"
}
```

## Close codes

| Code | Reason | Meaning |
| --- | --- | --- |
| `4001` | `ACCESS_TOKEN_MISSING` | No `token` query parameter was provided. |
| `4001` | `ACCESS_TOKEN_EXPIRED` | The JWT has expired. |
| `4001` | `ACCESS_TOKEN_INVALID` | The JWT is invalid or has no `sub` claim. |
| `403` | `Origin not allowed` | The request origin does not match `FRONTEND_ORIGIN`. |

## Testing

With the service running and `JWT_SECRET` configured, run:

```bash
npm run test:websocket
```

The test opens two connections for one user and a third connection for another
user, then verifies same-user delivery, acknowledgements, and isolation.

## Docker

Build and start the service with Docker Compose:

```bash
docker compose up --build
```

The container exposes port `4000`. Provide `JWT_SECRET`, `PORT`, `MODE`, and
`FRONTEND_ORIGIN` through the environment used by Docker Compose.

## Project structure

```text
src/
|-- realtime.js       WebSocket authentication and room broadcasting
|-- server.js         Express entry point and static docs server
`-- static/index.html Interactive API documentation page
scripts/token.js      Development JWT generator
test-websocket.js     Integration test for authenticated broadcasting
```

## Related services

- Login API: `https://wom-2026-login.onrender.com`
- WebSocket API: `wss://your-host.example/?token=<your-jwt>`