'use client';

import { useChat, Message } from 'ai/react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { ChatBubbleLeftIcon, UserCircleIcon } from '@heroicons/react/24/solid';
import ReactMarkdown from 'react-markdown';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

// Update the Map import with logging
const GoogleMap = dynamic(() => {
  console.log('Loading Map component dynamically');
  return import('./Map');
}, { 
  ssr: false,
  loading: () => {
    console.log('Map component is loading...');
    return (
      <div className="w-full h-[300px] rounded-lg bg-[#2a2a2a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
});

// Rate limiter for address detection
const useAddressRateLimit = () => {
  const [lastCheck, setLastCheck] = useState(0);
  const RATE_LIMIT_MS = 2000; // Minimum 2 seconds between checks

  return {
    shouldCheck: () => {
      const now = Date.now();
      if (now - lastCheck >= RATE_LIMIT_MS) {
        setLastCheck(now);
        return true;
      }
      return false;
    }
  };
};

// Function to detect Dutch addresses
const detectAddresses = (text: string): string[] => {
  console.log('Attempting to detect addresses in:', text.substring(0, 100) + '...');
  
  const addressPatterns = [
    // Full addresses with or without postal code
    /([A-Z][a-z]+(?:straat|gracht|laan|plein|weg|dam|kade|singel|steeg|dijk)\s+\d+(?:[a-zA-Z-]*)(?:\s*,\s*\d{4}\s*[A-Z]{2}\s+Amsterdam)?)/gi,
    // Simple street names with numbers
    /\b([A-Z][a-z]+\s+\d+(?:[a-zA-Z-]*)(?:\s*,\s*\d{4}\s*[A-Z]{2}\s+Amsterdam)?)\b/gi,
    // Addresses with 'de' in the name
    /([A-Z][a-z]+\s+de\s+[A-Z][a-z]+(?:straat|gracht|laan|plein|weg|dam|kade|singel|steeg|dijk)?\s+\d+(?:[a-zA-Z-]*)(?:\s*,\s*\d{4}\s*[A-Z]{2}\s+Amsterdam)?)/gi,
    // Singel specific pattern (since it's a common one)
    /\b(Singel\s+\d+(?:[a-zA-Z-]*)(?:\s*,\s*\d{4}\s*[A-Z]{2}\s+Amsterdam)?)\b/gi
  ];

  // Create a map to store unique addresses and their positions
  const uniqueAddresses = new Map<string, number>();

  addressPatterns.forEach(pattern => {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const address = match[0].trim()
        .replace(/\s+/g, ' ')  // Normalize spaces
        .replace(/,\s*/, ', '); // Normalize commas
      
      // Only store this match if we haven't found this address before,
      // or if this match appears earlier in the text
      const existingPos = uniqueAddresses.get(address);
      const currentPos = match.index;
      
      if (existingPos === undefined || currentPos < existingPos) {
        uniqueAddresses.set(address, currentPos);
      }
    }
  });

  // Convert map to array, sorted by position in text
  type AddressEntry = [string, number];
  const entries: AddressEntry[] = Array.from(uniqueAddresses.entries());
  const sorted = entries.sort((a, b) => a[1] - b[1]);
  const results = sorted.map(entry => entry[0]);

  console.log('Final detected addresses:', results);
  return results;
};

// Custom component to render text with highlighted addresses
const TextWithHighlightedAddresses = ({ content }: { content: string }) => {
  const addresses = detectAddresses(content);
  if (addresses.length === 0) return <>{content}</>;

  let lastIndex = 0;
  const parts = [];
  
  addresses.forEach((address, i) => {
    const index = content.indexOf(address, lastIndex);
    if (index > lastIndex) {
      parts.push(<span key={`text-${i}`}>{content.slice(lastIndex, index)}</span>);
    }
    parts.push(
      <span 
        key={`address-${i}`} 
        className="underline decoration-teal-400 decoration-2 cursor-pointer hover:bg-teal-400/10"
        title="Address detected"
      >
        {address}
      </span>
    );
    lastIndex = index + address.length;
  });
  
  if (lastIndex < content.length) {
    parts.push(<span key="text-last">{content.slice(lastIndex)}</span>);
  }
  
  return <>{parts}</>;
};

// Custom components for ReactMarkdown
const components = {
  p: ({ node, children, ...props }: any) => {
    if (typeof children === 'string') {
      return <p {...props}><TextWithHighlightedAddresses content={children} /></p>;
    }
    return <p {...props}>{children}</p>;
  }
};

// Logging hook for address detection
const useAddressLogging = (messages: Message[]) => {
  useEffect(() => {
    console.log('Messages updated:', messages.length, 'messages');
    messages.forEach((message, i) => {
      console.log(`Message ${i}:`, {
        role: message.role,
        contentPreview: message.content?.substring(0, 50) + '...'
      });
      
      if (message.role === 'assistant') {
        const addresses = detectAddresses(message.content);
        if (addresses.length > 0) {
          console.log('Found addresses in message:', {
            messageIndex: i,
            addresses
          });
        }
      }
    });
  }, [messages]);
};

interface ChatProps {
  showRestartButton?: boolean;
}

export default function Chat({ showRestartButton = true }: ChatProps) {
  console.log('Chat component initialized');

  const { messages, input, handleInputChange, handleSubmit, isLoading, setInput, setMessages } = useChat({
    api: '/api/openai/chat',
    initialMessages: [
      {
        id: 'system-1',
        role: 'system',
        content: 'You are an expert on Amsterdam restaurants. When users ask about restaurants, always: 1) Find specific restaurants in Amsterdam that match their description, 2) Explain why you chose each restaurant, and 3) Include the full address for each restaurant. Keep your tone friendly and conversational. If a request is not about restaurants in Amsterdam, politely redirect them to ask about Amsterdam restaurants instead.'
      }
    ],
    onResponse: (response) => {
      console.log('Chat response received:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });
    },
    onFinish: (message) => {
      console.log('Chat message completed:', {
        role: message.role,
        contentPreview: message.content.substring(0, 50) + '...'
      });
    },
    onError: (error) => {
      console.error('Chat error:', error);
      setError(error.message);
    }
  });

  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const rateLimit = useAddressRateLimit();
  
  // Add a basic message log on every render
  useEffect(() => {
    if (!rateLimit.shouldCheck()) return;
    
    console.log('Current chat state:', {
      messageCount: messages.length,
      hasMessages: messages.length > 0,
      isLoading,
      currentInput: input,
      error
    });
  }, [messages, isLoading, input, error]);

  // Add logging hook with rate limiting
  useAddressLogging(messages);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted with input:', input);
    setError(null);

    if (!input.trim()) {
      console.log('Empty input, skipping submission');
      return;
    }

    try {
      console.log('Calling handleSubmit...');
      await handleSubmit(e);
      console.log('Form submission completed successfully');
    } catch (err: any) {
      console.error('Form submission error:', {
        error: err,
        message: err.message,
        stack: err.stack
      });
      setError(err.message || 'An error occurred while sending your message');
    }
  };

  const handleRestart = () => {
    console.log('Restarting chat...');
    try {
      setMessages([]); // Clear messages
      setInput(''); // Clear input
      setError(null); // Clear any errors
      console.log('Chat reset successfully');
    } catch (err) {
      console.error('Error resetting chat:', err);
      setError('Failed to reset chat');
    }
  };

  return (
    <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full">
      {/* Messages */}
      <div className="flex-1 space-y-0 overflow-y-auto">
        {messages
          .filter(message => message.role !== 'system')
          .map((message, i) => {
          const addresses = message.role === 'assistant' ? detectAddresses(message.content) : [];
          
          return (
            <div
              key={i}
              className={`border-b border-gray-700/50 ${
                message.role === 'assistant' ? 'bg-[#1a1a1a]' : ''
              }`}
            >
              <div className="max-w-5xl mx-auto px-4 py-8">
                <div className="flex gap-4">
                  <div className="w-8 h-8 flex-shrink-0">
                    {message.role === 'assistant' ? (
                      <ChatBubbleLeftIcon className="w-8 h-8 text-teal-400" />
                    ) : (
                      <UserCircleIcon className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                  <div className="prose prose-invert flex-1 min-w-0">
                    {message.role === 'assistant' ? (
                      <ReactMarkdown components={components}>
                        {message.content}
                      </ReactMarkdown>
                    ) : (
                      <p>{message.content}</p>
                    )}
                  </div>
                </div>
                {message.role === 'assistant' && addresses.length > 0 && (() => {
                  console.log('Rendering map with addresses:', addresses);
                  return (
                    <div className="mt-4 ml-12">
                      <GoogleMap addresses={addresses} />
                    </div>
                  );
                })()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Input Form */}
      <div className="border-t border-gray-700/50 p-4">
        <div className="max-w-5xl mx-auto">
          <form onSubmit={handleFormSubmit} className="relative">
            <div className="relative flex flex-col gap-2">
              <div className="flex items-center bg-[#2a2a2a] rounded-xl shadow-lg">
                <input
                  value={input}
                  onChange={handleInputChange}
                  placeholder="Ask me anything..."
                  className="flex-1 bg-transparent border-0 focus:ring-0 text-white px-4 py-4"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="absolute right-2 p-2 rounded-lg hover:bg-[#3a3a3a] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
                  )}
                </button>
              </div>
              {error && (
                <div className="text-red-400 text-sm px-2">
                  {error}
                </div>
              )}
            </div>
            <p className="text-xs text-center text-gray-400 mt-2">
              Chat with AI - Dutch addresses will be automatically highlighted
            </p>
          </form>
        </div>
      </div>
    </div>
  );
} 