# Fintech Expense Classification & Reporting Tool

AI-Powered expense tracker that automatically categorizes bank transactions using Groq's Llama LLM and visualizes spending patterns.

## 🚀 Features

- ✅ **User Authentication** - Secure login/register with JWT
- ✅ **CSV Upload** - Drag & drop bank statement upload
- ✅ **AI Categorization** - Automatic expense classification using Groq Llama 3.1
- ✅ **Interactive Dashboard** - Real-time charts and spending analysis
- ✅ **Date Filtering** - Filter transactions by custom date ranges
- ✅ **Export Reports** - Download data as CSV or PDF
- ✅ **Responsive Design** - Works on desktop, tablet, and mobile

## 🛠️ Tech Stack

**Frontend:**
- HTML5, CSS3, Vanilla JavaScript
- Chart.js for data visualization
- No framework dependencies for simplicity

**Backend:**
- Node.js + Express.js
- MongoDB (NoSQL database)
- JWT for authentication
- Groq SDK (Llama 3.1 LLM for AI categorization)
- Papaparse for CSV parsing

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud)
- Groq API Key (free at https://console.groq.com)

For Login :
Please create a new user.
If wanted to create an existing one then id : "saketkhopkar910@gamil.com" and password : "Ssk@1340o"

## ⚙️ Installation

### Backend Setup
```bash
cd backend
npm install
```

Create `.env` file:
```env
MONGODB_URI=mongodb://localhost:27017/expense-tracker
JWT_SECRET=your_secret_key_here
GROQ_API_KEY=your_groq_api_key_here
PORT=5000
```

### Start MongoDB
```bash
# If using local MongoDB
mongod
```

### Start Backend Server
```bash
npm run dev
# Server runs on http://localhost:5000
```

### Start Frontend
```bash
cd ../frontend
# Open index.html in browser or use:
python -m http.server 8000
# Frontend runs on http://localhost:8000
```

## 📊 CSV Format

The app supports various Indian bank CSV formats. Your CSV should contain columns like:

- **Date** (any format)
- **Description/Narration** (transaction details)
- **Amount** (numeric)
- **Type** (Credit/Debit) - optional

Example:
```csv
Date,Description,Amount,Type
2024-01-15,Swiggy Food Order,450,Debit
2024-01-16,Salary Credit,50000,Credit
2024-01-17,Electricity Bill Payment,1200,Debit
```

## 🤖 AI Categorization

The app uses **Groq's Llama 3.1 70B** model to intelligently categorize expenses into:

- Food
- Transport
- Utilities
- Shopping
- Entertainment
- Healthcare
- Education
- Bills
- Other

## 🎯 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Transactions
- `POST /api/transactions/upload` - Upload CSV file
- `GET /api/transactions` - Get all transactions (with optional date filters)
- `GET /api/transactions/summary` - Get spending summary by category
- `DELETE /api/transactions/all` - Delete all user transactions

## 🔒 Security Features

- Password hashing with bcrypt
- JWT token-based authentication
- CORS enabled for frontend-backend communication
- Input validation and sanitization
- Secure file upload handling

## 🚧 Edge Cases Handled

1. **Malformed CSV Files** - Error handling with user-friendly messages
2. **Duplicate Transactions** - Allowed (user can delete manually)
3. **Large Files** - 10MB limit with progress indicator
4. **Session Expiry** - Token-based auth with 7-day validity
5. **AI Categorization Failure** - Fallback to "Other" category
6. **Empty CSV** - Validation before processing

## 🧪 Testing

### Manual Testing Steps:

1. **Register/Login**
   - Create new account
   - Login with credentials
   - Verify JWT token storage

2. **CSV Upload**
   - Upload sample CSV
   - Verify AI categorization
   - Check transaction count

3. **Dashboard**
   - View pie chart
   - View bar chart
   - Check summary cards

4. **Filters**
   - Apply date range filter
   - Verify filtered results
   - Clear filters

5. **Export**
   - Export as CSV
   - Export as PDF (print)

## 📈 Future Enhancements

- Budget setting and alerts
- Recurring transaction detection
- Multi-currency support
- Monthly comparison reports
- Email notifications
- Mobile app (React Native)
- Bank API integration

## 👨‍💻 Developer

**Saket Khopkar**
- Email: saketkhopkar910@gmail.com
- LinkedIn: [linkedin.com/in/saket-khopkar](https://linkedin.com/in/saket-khopkar/)
- GitHub: [github.com/SAKET-SK](https://github.com/SAKET-SK)

## 🙏 Acknowledgments

- Groq for providing free LLM API
- Chart.js for visualization library
- MongoDB for database solution