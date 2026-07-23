# ShopVerse E-commerce Backend

## Setup

1. Copy the example environment file:
   ```powershell
   copy .env.example .env
   ```

2. Install dependencies:
   ```powershell
   npm install
   ```

3. Set `MONGO_URI` in `.env` if you need a custom MongoDB connection string.
   - Default value is: `mongodb://127.0.0.1:27017/shopverse`

4. Start the server:
   ```powershell
   npm start
   ```

## MongoDB

This project uses `mongoose` for MongoDB integration.

- Connection logic is located in `db.js`
- The server loads the connection before starting in `server.js`
- Default database name: `shopverse`

## Environment Variables

The following variables are supported in `.env`:

- `MONGO_URI` - MongoDB connection string
- `JWT_SECRET` - JSON Web Token secret
- `ADMIN_EMAIL` - default admin email
- `ADMIN_PASSWORD` - default admin password
- `PORT` - server port

## Notes

- A default admin account is created automatically on first successful database connection if one does not already exist.
- If you want to use MongoDB Atlas or another hosted service, update `MONGO_URI` accordingly.
