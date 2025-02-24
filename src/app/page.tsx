'use client';

import Chat from '@/components/Chat';
import { useChat } from 'ai/react';

export default function Home() {
  const { messages } = useChat();
  
  return (
    <main className="flex min-h-screen flex-col bg-[#1a1a1a]">
      {messages.length === 0 && (
        <div className="text-center mt-8 relative max-w-5xl mx-auto w-full px-4">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-white text-4xl font-bold">What do you want to eat?</h2>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-sm font-medium text-white bg-[#FF0000] rounded-md hover:bg-[#cc0000] transition-colors"
            >
              Restart Chat
            </button>
          </div>
          <p className="text-gray-400 text-lg">Ask me about restaurants in Amsterdam...</p>
        </div>
      )}
      <Chat showRestartButton={!messages.length} />
    </main>
  );
}
