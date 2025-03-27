import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { connectToDatabase } from '@/lib/mongodb';
import { Chat } from '@/models/Chat';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    
    // Find or create chat for the user
    let chat = await Chat.findOne({ userId: session.user.email });
    
    if (!chat) {
      chat = await Chat.create({
        userId: session.user.email,
        messages: [],
      });
    }

    return NextResponse.json({ messages: chat.messages });
  } catch (error) {
    console.error('Error fetching chat:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat' },
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

    const { messages } = await request.json();
    
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Invalid messages format' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    
    // Update or create chat for the user
    const chat = await Chat.findOneAndUpdate(
      { userId: session.user.email },
      { 
        $set: { messages },
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ messages: chat.messages });
  } catch (error) {
    console.error('Error saving chat:', error);
    return NextResponse.json(
      { error: 'Failed to save chat' },
      { status: 500 }
    );
  }
} 