# Cloud-Based POS System

A modern Point of Sale (POS) system built with React.js, Node.js, Express, PostgreSQL, and AWS.

## Project Structure
- `/frontend` - React.js frontend application
- `/backend` - Node.js/Express backend server

## Prerequisites
- Node.js (v14 or higher)
- PostgreSQL
- AWS Account

## Getting Started

### Backend Setup
1. Navigate to the backend directory:
```bash
cd backend
npm install
```

2. Create a .env file with your database configuration:
```
DB_HOST=localhost
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=pos_db
PORT=5000
```

3. Start the server:
```bash
npm start
```

### Frontend Setup
1. Navigate to the frontend directory:
```bash
cd frontend
npm install
```

2. Start the development server:
```bash
npm start
```

## Features
- User Authentication
- Product Management
- Order Processing
- Basic Sales Dashboard
