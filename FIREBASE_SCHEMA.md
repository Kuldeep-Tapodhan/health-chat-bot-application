# Firebase Data Model - Detailed Schema

## Collection: users

**Purpose**: Store user profile information and role-based access control

**Document ID**: Firebase Auth UID

**Schema**:
```typescript
{
  uid: string;                    // Firebase Auth UID (matches document ID)
  email: string;                  // User's email address
  displayName: string;            // User's full name
  role: 'user' | 'admin';         // Role for access control
  photoURL?: string;              // Profile picture URL
  phoneNumber?: string;           // Phone number (optional)
  createdAt: Timestamp;           // Account creation timestamp
  updatedAt: Timestamp;           // Last profile update
  lastLogin: Timestamp;           // Last login timestamp
  isActive: boolean;              // Account status (for admin control)
  preferences: {
    notifications: boolean;       // Email notifications enabled
    theme: 'light' | 'dark';      // UI theme preference
  };
}
```

**Indexes**:
- `role` (ascending)
- `isActive` (ascending)
- `createdAt` (descending)

**Example Document**:
```json
{
  "uid": "abc123xyz",
  "email": "john.doe@example.com",
  "displayName": "John Doe",
  "role": "user",
  "photoURL": "https://example.com/photo.jpg",
  "phoneNumber": "+1234567890",
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-20T14:45:00Z",
  "lastLogin": "2025-01-25T09:15:00Z",
  "isActive": true,
  "preferences": {
    "notifications": true,
    "theme": "dark"
  }
}
```

---

## Collection: chatSessions

**Purpose**: Store chat session metadata

**Document ID**: Auto-generated

**Schema**:
```typescript
{
  userId: string;                 // Reference to users/{userId}
  sessionId: string;              // Unique session identifier
  title: string;                  // Session title (auto-generated from first message)
  createdAt: Timestamp;           // Session creation time
  updatedAt: Timestamp;           // Last message time
  messageCount: number;           // Total messages in session
  isActive: boolean;              // Whether session is still active
}
```

**Indexes**:
- `userId` (ascending), `createdAt` (descending)
- `userId` (ascending), `isActive` (ascending)

**Example Document**:
```json
{
  "userId": "abc123xyz",
  "sessionId": "session_001",
  "title": "Headache and fever symptoms",
  "createdAt": "2025-01-25T10:00:00Z",
  "updatedAt": "2025-01-25T10:15:00Z",
  "messageCount": 8,
  "isActive": true
}
```

### Subcollection: messages

**Path**: `chatSessions/{sessionId}/messages/{messageId}`

**Schema**:
```typescript
{
  messageId: string;              // Unique message identifier
  role: 'user' | 'assistant';     // Message sender
  content: string;                // Message text
  timestamp: Timestamp;           // Message timestamp
  metadata?: {
    model: string;                // AI model used (e.g., "gpt-4", "biomistral")
    tokens?: number;              // Token count (if available)
  };
}
```

**Example Document**:
```json
{
  "messageId": "msg_001",
  "role": "user",
  "content": "I have a headache and mild fever. What should I do?",
  "timestamp": "2025-01-25T10:00:00Z"
}
```

---

## Collection: medicalReports

**Purpose**: Store uploaded medical reports and analysis results

**Document ID**: Auto-generated

**Schema**:
```typescript
{
  reportId: string;               // Unique report identifier
  userId: string;                 // Reference to users/{userId}
  fileName: string;               // Original file name
  fileUrl: string;                // Firebase Storage download URL
  fileType: string;               // 'pdf' | 'image' | 'text'
  uploadedAt: Timestamp;          // Upload timestamp
  analyzedAt?: Timestamp;         // Analysis completion timestamp
  status: 'pending' | 'analyzing' | 'completed' | 'failed';
  analysis?: {
    summary: string;              // Brief summary of findings
    findings: string[];           // List of key findings
    recommendations: string[];    // Medical recommendations
    confidence: number;           // AI confidence score (0-1)
  };
}
```

**Indexes**:
- `userId` (ascending), `uploadedAt` (descending)
- `userId` (ascending), `status` (ascending)

**Example Document**:
```json
{
  "reportId": "report_001",
  "userId": "abc123xyz",
  "fileName": "blood_test_jan2025.pdf",
  "fileUrl": "https://firebasestorage.googleapis.com/...",
  "fileType": "pdf",
  "uploadedAt": "2025-01-25T11:00:00Z",
  "analyzedAt": "2025-01-25T11:05:00Z",
  "status": "completed",
  "analysis": {
    "summary": "Blood test results show normal ranges for most parameters.",
    "findings": [
      "Hemoglobin: 14.5 g/dL (Normal)",
      "White Blood Cell Count: 7,200/μL (Normal)",
      "Platelet Count: 250,000/μL (Normal)"
    ],
    "recommendations": [
      "Continue current health regimen",
      "Schedule follow-up in 6 months"
    ],
    "confidence": 0.92
  }
}
```

---

## Collection: hospitals

**Purpose**: Cache hospital data for quick lookups

**Document ID**: Auto-generated or external API ID

**Schema**:
```typescript
{
  hospitalId: string;             // Unique hospital identifier
  name: string;                   // Hospital name
  address: string;                // Full address
  location: {
    latitude: number;             // Latitude coordinate
    longitude: number;            // Longitude coordinate
  };
  phone: string;                  // Contact phone number
  specialties: string[];          // Medical specialties available
  rating?: number;                // User rating (1-5)
  distance?: number;              // Distance from user (calculated on query)
  lastUpdated: Timestamp;         // Last data update
}
```

**Indexes**:
- Geohash index for location-based queries (if using GeoFirestore)

**Example Document**:
```json
{
  "hospitalId": "hosp_001",
  "name": "City General Hospital",
  "address": "123 Main St, City, State 12345",
  "location": {
    "latitude": 40.7128,
    "longitude": -74.0060
  },
  "phone": "+1-555-0100",
  "specialties": [
    "Emergency Care",
    "Cardiology",
    "Orthopedics",
    "Pediatrics"
  ],
  "rating": 4.5,
  "lastUpdated": "2025-01-20T00:00:00Z"
}
```

---

## Collection: analytics

**Purpose**: Store daily analytics for admin dashboard

**Document ID**: Date string (YYYY-MM-DD)

**Schema**:
```typescript
{
  date: string;                   // YYYY-MM-DD format
  totalUsers: number;             // Total registered users
  activeUsers: number;            // Users active on this day
  newUsers: number;               // New registrations
  totalChats: number;             // Total chat sessions
  totalMessages: number;          // Total messages sent
  totalReports: number;           // Total reports uploaded
  reportsByStatus: {
    pending: number;
    completed: number;
    failed: number;
  };
}
```

**Indexes**:
- `date` (descending)

**Example Document**:
```json
{
  "date": "2025-01-25",
  "totalUsers": 1250,
  "activeUsers": 342,
  "newUsers": 15,
  "totalChats": 89,
  "totalMessages": 456,
  "totalReports": 23,
  "reportsByStatus": {
    "pending": 3,
    "completed": 18,
    "failed": 2
  }
}
```

---

## Data Relationships

```
users (1) ──────< (many) chatSessions
                          │
                          └──< (many) messages

users (1) ──────< (many) medicalReports

(No direct relationship with hospitals - cached data)

(Analytics aggregated from all collections)
```

## Query Examples

### Get User's Chat Sessions
```typescript
const sessionsRef = collection(db, 'chatSessions');
const q = query(
  sessionsRef,
  where('userId', '==', userId),
  orderBy('updatedAt', 'desc'),
  limit(10)
);
```

### Get Messages for a Session
```typescript
const messagesRef = collection(db, 'chatSessions', sessionId, 'messages');
const q = query(messagesRef, orderBy('timestamp', 'asc'));
```

### Get User's Reports
```typescript
const reportsRef = collection(db, 'medicalReports');
const q = query(
  reportsRef,
  where('userId', '==', userId),
  where('status', '==', 'completed'),
  orderBy('uploadedAt', 'desc')
);
```

### Get Analytics for Date Range
```typescript
const analyticsRef = collection(db, 'analytics');
const q = query(
  analyticsRef,
  where('date', '>=', startDate),
  where('date', '<=', endDate),
  orderBy('date', 'desc')
);
```

## Storage Structure (Firebase Storage)

```
/medical-reports/{userId}/{reportId}/{filename}
/profile-photos/{userId}/{filename}
```

## Best Practices

1. **Use Timestamps**: Always use Firebase `serverTimestamp()` for consistency
2. **Denormalization**: Store user display names in chat sessions for quick access
3. **Pagination**: Use cursor-based pagination for large collections
4. **Security**: Always validate data on the server side (Cloud Functions)
5. **Indexes**: Create composite indexes for complex queries
6. **Cleanup**: Implement Cloud Functions to delete old data (e.g., inactive sessions)
