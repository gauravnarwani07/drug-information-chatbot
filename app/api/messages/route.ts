import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/auth-options';
import { Chat } from '@/models/Chat';
import { connectToDatabase } from '@/lib/mongodb';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    
    // Find or create a chat for the user
    let chat = await Chat.findOne({ userEmail: session.user.email });
    
    if (!chat) {
      chat = await Chat.create({
        userEmail: session.user.email,
        messages: []
      });
    }

    return NextResponse.json({ messages: chat.messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messages }: { messages: Message[] } = await request.json();
    
    await connectToDatabase();
    
    // Update or create chat with new messages
    const chat = await Chat.findOneAndUpdate(
      { userEmail: session.user.email },
      { messages },
      { upsert: true, new: true }
    );

    return NextResponse.json({ messages: chat.messages });
  } catch (error) {
    console.error('Error saving messages:', error);
    return NextResponse.json(
      { error: 'Failed to save messages' },
      { status: 500 }
    );
  }
} 