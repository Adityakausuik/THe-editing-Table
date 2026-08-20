# Architecture

## Client

- React with Vite
- React Router for application routing
- Tailwind CSS for styling tokens and utilities
- Framer Motion installed for future animation work

## Server

- Express application under `server/src`
- Mongoose connection helper under `server/src/config/db.js`
- JWT authentication middleware under `server/src/middleware/auth.js`
- RBAC middleware under `server/src/middleware/rbac.js`
- Central error handler under `server/src/middleware/errorHandler.js`

## Shared

Role constants live in `shared/constants.js` so later client and server code can share stable identifiers.
