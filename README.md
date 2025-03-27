# Drug Information & Recommendations Assistant

A Next.js-based web application that provides drug information and recommendations using FDA-approved medication data. The application uses AI to provide structured responses about medications, their uses, side effects, and recommendations.

## Features

- 💊 Drug information and recommendations based on FDA-approved medications
- 🔍 Semantic search across drug labels
- 📱 Responsive design for all devices
- 🔐 Google authentication (optional)
- 💬 Chat interface with message history
- 📝 Local storage for non-authenticated users
- 🔄 Cross-device sync for authenticated users

## Tech Stack

- **Frontend**: Next.js 14, React, TailwindCSS
- **Backend**: Next.js API Routes
- **Database**: MongoDB
- **Authentication**: NextAuth.js with Google Provider
- **AI**: Google's Gemini AI
- **Vector Search**: MongoDB Atlas Vector Search

## Prerequisites

- Node.js 18+ and npm
- MongoDB Atlas account
- Google Cloud Project (for authentication)
- Google AI API key

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
MONGODB_URI=your_mongodb_uri
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_API_KEY=your_google_api_key
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
```

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/drug-info-assistant.git
cd drug-info-assistant
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
# Edit .env.local with your credentials
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. Start the application and navigate to the homepage
2. Type your drug-related query in the chat interface
3. The assistant will provide structured information about medications
4. Optional: Sign in with Google to sync your chat history across devices

## API Endpoints

- `/api/chat` - Handles chat messages and AI responses
- `/api/chats` - Manages chat history for authenticated users
- `/api/auth/[...nextauth]` - Handles authentication

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- FDA for providing drug label data
- Google for Gemini AI and authentication services
- Next.js team for the amazing framework
- MongoDB for the database and vector search capabilities
