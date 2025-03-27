'use client';

import { useState, useEffect } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { Message } from '@/types/chat';

export default function Home() {
  const { data: session, status } = useSession({
    required: false,
    onUnauthenticated() {
      localStorage.removeItem('next-auth.session-token');
    },
  });

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Load chat history
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      loadChat();
    } else if (status === 'unauthenticated') {
      const savedMessages = localStorage.getItem('chatMessages');
      if (savedMessages) {
        setMessages(JSON.parse(savedMessages));
      }
    }
  }, [session, status]);

  // Save chat history
  useEffect(() => {
    if (status === 'unauthenticated') {
      localStorage.setItem('chatMessages', JSON.stringify(messages));
    }
  }, [messages, status]);

  const loadChat = async () => {
    try {
      const response = await fetch('/api/chats');
      if (!response.ok) throw new Error('Failed to load chat');
      const data = await response.json();
      setMessages(data.messages);
    } catch (error) {
      console.error('Error loading chat:', error);
    }
  };

  const saveChat = async (messages: Message[]) => {
    if (status !== 'authenticated' || !session?.user) return;

    try {
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
      });
      if (!response.ok) throw new Error('Failed to save chat');
    } catch (error) {
      console.error('Error saving chat:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input.trim() };
    const updatedMessages = [...messages, userMessage];
    
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response');
      }

      const data = await response.json();
      const assistantMessage: Message = { role: 'assistant', content: data.content };
      const finalMessages = [...updatedMessages, assistantMessage];
      
      setMessages(finalMessages);
      
      if (status === 'authenticated' && session?.user) {
        await saveChat(finalMessages);
      }
    } catch (error) {
      const errorMessage: Message = {
        role: 'assistant',
        content: error instanceof Error ? error.message : 'Sorry, something went wrong. Please try again.',
      };
      const finalMessages = [...updatedMessages, errorMessage];
      setMessages(finalMessages);
      if (status === 'authenticated' && session?.user) {
        await saveChat(finalMessages);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = (message: Message, index: number) => {
    const isUser = message.role === 'user';
    
    return (
      <div key={index} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-[80%] rounded-lg p-3 ${isUser ? 'bg-blue-500 text-white' : 'bg-white text-gray-900'}`}>
          <div className="whitespace-pre-wrap">
            {message.content.split('\n').map((line, i) => {
              if (line.match(/^[A-Z\s:]+$/)) {
                return (
                  <div key={i} className="font-bold text-lg mt-4 mb-2">
                    {line}
                  </div>
                );
              }
              if (line.trim().startsWith('•')) {
                return (
                  <div key={i} className="ml-4">
                    {line}
                  </div>
                );
              }
              return <div key={i}>{line}</div>;
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Drug Information & Recommendations</h1>
          <div className="flex items-center space-x-4">
            {status === 'authenticated' && session ? (
              <>
                <span className="text-gray-700">{session.user?.email}</span>
                <button
                  onClick={() => signOut()}
                  className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <button
                onClick={() => signIn('google')}
                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
              >
                Sign in with Google
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">Welcome to Drug Information Assistant</h2>
              <p className="text-gray-600 mb-4">
                Ask me about medications, their uses, side effects, and recommendations.
              </p>
              <p className="text-sm text-gray-500">
                {status === 'authenticated' && session ? 'Your chat history will be saved across devices.' : 'Your chat history will be saved in your browser.'}
              </p>
            </div>
          )}
          {messages.map(renderMessage)}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white text-gray-900 rounded-lg p-3">
                Thinking...
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <form onSubmit={handleSubmit} className="flex space-x-4">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 pl-4"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading}
              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </form>
        </div>
      </footer>
    </div>
  );
} 