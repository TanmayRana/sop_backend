# Backend API

A complete authentication system with JWT tokens, bcrypt password hashing, and MongoDB integration.

## Features

- User Registration & Login
- JWT Authentication (Access + Refresh Tokens)
- Password Hashing with bcrypt
- Input Validation
- Error Handling
- Cookie-based Token Storage
- Protected Routes
- User Profile Management

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/refresh-token` - Refresh access token
- `GET /api/auth/profile` - Get user profile (protected)

### Health Check

- `GET /health` - Server health status

## Installation

```bash
npm install
```

## Environment Variables

Create a `.env` file with:

```env
MONGODB_URI=your_mongodb_connection_string
ACCESS_TOKEN_SECRET=your_super_secret_access_token_key_here_min_32_chars
REFRESH_TOKEN_SECRET=your_super_secret_refresh_token_key_here_min_32_chars
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d
NODE_ENV=development
PORT=9000
```

## Usage

```bash
# Development
npm run dev

# Production
npm start
```

## Request Examples

### Register User

```bash
POST /api/auth/register
Content-Type: application/json

{
  "fullname": "John Doe",
  "email": "john@example.com",
  "password": "Password123"
}
```

### Login User

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "Password123"
}
```

### Get Profile

```bash
GET /api/auth/profile
Cookie: accessToken=your_access_token
```

## Project Structure

```
src/
├── controllers/
│   └── auth.controller.js
├── middleware/
│   ├── auth.middleware.js
│   ├── error.middleware.js
│   └── validate.middleware.js
├── models/
│   └── user.models.js
├── routes/
│   └── auth.routes.js
├── utils/
│   └── generateTokens.js
├── config/
│   └── database.js
├── app.js
├── server.js
└── index.js
```

## Dependencies

- express
- mongoose
- jsonwebtoken
- bcryptjs
- express-async-handler
- cookie-parser
- express-validator
- dotenv
- nodemon (dev)
