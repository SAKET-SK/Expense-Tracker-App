# Architecture Document

## System Architecture
```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Browser   │ ◄─────► │   Express   │ ◄─────► │   MongoDB   │
│  (Frontend) │  HTTP   │  (Backend)  │  Query  │  (Database) │
└─────────────┘         └─────────────┘         └─────────────┘
                               │
                               │ API Call
                               ▼
                        ┌─────────────┐
                        │  Groq API   │
                        │ (Llama LLM) │
                        └─────────────┘
```

## Folder Structure

```
expense-tracker/
├── backend/
│   ├── server.js
│   ├── models/
│   │   ├── User.js
│   │   └── Transaction.js
│   ├── routes/
│   │   ├── auth.js
│   │   └── transactions.js
│   ├── middleware/
│   │   └── auth.js
│   ├── .env
│   └── package.json
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── README.md
└── ARCHITECTURE.md   (this file)
```

## Component Details

### 1. Frontend (Vanilla HTML/CSS/JS)
- **Purpose**: User interface for interaction
- **Key Files**:
  - `index.html` - Single page application
  - `style.css` - Responsive styling
  - `app.js` - Client-side logic, API calls
- **Libraries**: Chart.js for visualizations
- **Storage**: LocalStorage for JWT token

### 2. Backend (Node.js + Express)
- **Purpose**: Business logic and API server
- **Key Components**:
  - `server.js` - Express app initialization
  - `routes/` - API endpoint handlers
  - `models/` - Mongoose schemas
  - `middleware/` - JWT authentication
- **Port**: 5000

### 3. Database (MongoDB)
- **Purpose**: Persistent data storage
- **Collections**:
  - `users` - User accounts
  - `transactions` - Expense records

### 4. AI Service (Groq Llama 3.1)
- **Purpose**: Intelligent expense categorization
- **Model**: llama-3.1-70b-versatile
- **Integration**: REST API via groq-sdk
- **Fallback**: "Other" category if AI fails

## Data Flow

### Upload & Categorization Flow:
```
1. User uploads CSV file
   ↓
2. Multer receives file → saves to /uploads
   ↓
3. Papaparse parses CSV → extracts rows
   ↓
4. For each transaction:
   - Extract: date, description, amount, type
   - Call Groq API with description & amount
   - Receive category from AI
   - Store in MongoDB
   ↓
5. Delete temporary file
   ↓
6. Return success + transaction count
   ↓
7. Frontend refreshes dashboard
```

### Authentication Flow:
```
1. User enters credentials
   ↓
2. Backend validates against MongoDB
   ↓
3. If valid: Generate JWT token (7-day expiry)
   ↓
4. Frontend stores token in LocalStorage
   ↓
5. All subsequent requests include:
   Header: Authorization: Bearer <token>
```

## Database Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  name: String,
  email: String (unique, lowercase),
  password: String (bcrypt hashed),
  createdAt: Date,
  updatedAt: Date
}
```

### Transactions Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  date: Date,
  description: String,
  amount: Number,
  category: String,
  type: String (enum: ['debit', 'credit']),
  createdAt: Date,
  updatedAt: Date
}
```

## API Endpoints

### Auth Routes
| Method | Endpoint           | Purpose        | Auth Required |
|--------|--------------------|----------------|---------------|
| POST   | /api/auth/register | Create account | No            |
| POST   | /api/auth/login    | Login user     | No            |

### Transaction Routes
| Method | Endpoint                  | Purpose              | Auth Required |
|--------|---------------------------|----------------------|---------------|
| POST   | /api/transactions/upload  | Upload CSV           | Yes           |
| GET    | /api/transactions         | Get all transactions | Yes           |
| GET    | /api/transactions/summary | Get category summary | Yes           |
| DELETE | /api/transactions/all     | Delete all           | Yes           |

## Security Considerations

1. **Password Security**
   - Bcrypt hashing (10 rounds)
   - Never stored in plain text

2. **Authentication**
   - JWT with 7-day expiry
   - Token stored in LocalStorage
   - Middleware validates on protected routes

3. **File Upload Security**
   - Only CSV files accepted
   - 10MB size limit
   - Files deleted after processing
   - No direct file execution

4. **API Security**
   - CORS enabled for specific origin
   - Input validation on all endpoints
   - MongoDB injection prevention (Mongoose)

5. **Environment Variables**
   - Secrets in .env file
   - Not committed to version control

## Performance Optimizations

1. **CSV Processing**
   - Streaming parse with Papaparse
   - Batch insert to MongoDB (insertMany)

2. **AI Categorization**
   - Low temperature (0.3) for consistent results
   - Max 10 tokens to reduce latency
   - Fallback mechanism for failures

3. **Database Queries**
   - Indexed fields: userId, date
   - Aggregation pipeline for summary

4. **Frontend**
   - Chart.js canvas rendering (hardware accelerated)
   - Lazy loading of transactions
   - LocalStorage caching

## Scalability Considerations

### Current Limitations:
- Single server instance
- No caching layer
- Sequential AI categorization

### Future Improvements:
- **Horizontal Scaling**: Load balancer + multiple backend instances
- **Caching**: Redis for frequently accessed data
- **Queue System**: Bull/BullMQ for async CSV processing
- **CDN**: Static asset delivery
- **Database**: Replica sets for read scaling

## Error Handling Strategy

1. **Frontend**
   - Try-catch blocks for all API calls
   - User-friendly error messages
   - Loading states during async operations

2. **Backend**
   - Express error middleware
   - Mongoose validation errors
   - HTTP status codes (400, 401, 500)

3. **Database**
   - Connection retry logic
   - Graceful shutdown handling

## Testing Strategy

### Manual Testing:
- User registration/login flows
- CSV upload with various formats
- AI categorization accuracy
- Chart rendering
- Export functionality

### Automated Testing (Future):
- Jest for unit tests
- Supertest for API integration tests
- Cypress for E2E testing

## Technology Justification

| Technology     | Reason                                       |
|----------------|----------------------------------------------|
| **Vanilla JS** | Simple, no build process, fast development   |
| **Express**    | Lightweight, flexible, large ecosystem       |
| **MongoDB**    | Flexible schema, easy aggregation, JSON-like |
| **JWT**        | Stateless auth, scalable                     |
| **Groq Llama** | Fast inference, free tier, good accuracy     |
| **Chart.js**   | Simple API, good documentation, lightweight  |

## Known Limitations

1. No real-time updates (requires WebSocket)
2. Client-side routing not implemented (single page)
3. No offline support
4. AI categorization accuracy depends on description quality
5. No automated tests included