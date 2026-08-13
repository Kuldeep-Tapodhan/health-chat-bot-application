# Health AI Assistant - Next.js Frontend

Modern, premium web UI for the Health Chatbot powered by BioMistral-7B.

## Features

✨ **Premium Design**
- Modern gradient-based UI with smooth animations
- Dark mode support
- Responsive layout
- Beautiful glassmorphism effects

💬 **Chat Interface**
- Real-time messaging with the AI
- Example prompts for quick start
- Message history
- Loading states with animations
- Error handling

⚙️ **Customizable Settings**
- Adjustable max tokens (50-300)
- Temperature control (0.1-1.0)
- Top-p sampling (0.1-1.0)
- Settings panel with live updates

🎨 **User Experience**
- Smooth scrolling
- Auto-resize textarea
- Keyboard shortcuts (Enter to send, Shift+Enter for new line)
- Character counter
- Model status indicator

## Prerequisites

- Node.js 18+ installed
- Flask backend running on `http://localhost:5000`

## Setup

### 1. Install Dependencies

```bash
cd health-chatbot-app
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### 3. Start Flask Backend

In a separate terminal:

```bash
cd ../backend
python app.py
```

The backend should be running on `http://localhost:5000`

## Usage

1. **Start a Conversation**: Click on an example prompt or type your own medical question
2. **Adjust Settings**: Click the settings icon to customize generation parameters
3. **New Chat**: Click "New Chat" to start a fresh conversation
4. **View History**: See your recent conversations in the sidebar

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **Backend**: Flask API (Python)

## Project Structure

```
health-chatbot-app/
├── src/
│   └── app/
│       ├── layout.tsx       # Root layout with metadata
│       ├── page.tsx          # Main chat interface
│       └── globals.css       # Global styles
├── public/                   # Static assets
├── package.json             # Dependencies
└── tsconfig.json            # TypeScript config
```

## API Integration

The frontend connects to the Flask backend at `http://localhost:5000/api/chat/message`.

**Request Format:**
```json
{
  "message": "What are the symptoms of diabetes?",
  "sessionId": "session_123",
  "userId": "user_demo",
  "maxTokens": 150,
  "temperature": 0.7,
  "topP": 0.9
}
```

**Response Format:**
```json
{
  "success": true,
  "response": "Diabetes symptoms include...",
  "messageId": "msg_456",
  "metadata": {
    "model": "BioMistral-7B-4bit",
    "tokensGenerated": 87,
    "inferenceTime": 2.3
  }
}
```

## Building for Production

```bash
npm run build
npm start
```

## Troubleshooting

### Backend Connection Error

If you see "Failed to connect to the server":
1. Make sure the Flask backend is running on port 5000
2. Check that `model_loader.py` is complete (not truncated)
3. Verify the backend loaded the model successfully

### CORS Issues

The Flask backend has CORS enabled for `http://localhost:3000`. If deploying to a different domain, update the `CORS_ORIGINS` in the backend `.env` file.

## Customization

### Colors

The UI uses Tailwind CSS. To customize colors, edit the gradient classes in `page.tsx`:
- Primary gradient: `from-blue-600 to-indigo-600`
- Success gradient: `from-emerald-50 to-teal-50`

### Fonts

The app uses Geist Sans and Geist Mono fonts (loaded in `layout.tsx`). To change fonts, update the font imports.

## License

This project is part of the Health Assistance application.
