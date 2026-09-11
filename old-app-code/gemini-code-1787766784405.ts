// src/components/ChatSearch.tsx
import React, { useState, useRef, useEffect } from 'react';

interface AdListing {
  id: string;
  title: string;
  price: number;
  location: string;
  description: string;
  category: string;
}

interface Message {
  sender: 'user' | 'bot';
  text: string;
  listings?: AdListing[];
}

export const ChatSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat window when new content or stream chunks arrive
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    const userText = query;
    setQuery('');

    // Append user input to history
    setMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setIsLoading(true);

    // Initialize placeholder bot message for live streaming updates
    setMessages((prev) => [...prev, { sender: 'bot', text: '' }]);

    try {
      const response = await fetch('http://localhost:5000/api/search/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: userText }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Failed to connect to search stream endpoint');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulatedText = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();

            if (dataStr === '[DONE]') {
              break;
            }

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.content) {
                accumulatedText += parsed.content;

                // Dynamically update the bot's stream response in state
                setMessages((prev) => {
                  const updated = [...prev];
                  const lastIndex = updated.length - 1;
                  updated[lastIndex] = {
                    ...updated[lastIndex],
                    text: accumulatedText,
                  };
                  return updated;
                });
              }
            } catch {
              // Ignore invalid or split JSON fragments during continuous stream
            }
          }
        }
      }
    } catch (error) {
      console.error('SSE Stream Error:', error);
      setMessages((prev) => {
        const updated = [...prev];
        const lastIndex = updated.length - 1;
        updated[lastIndex] = {
          sender: 'bot',
          text: 'Unable to retrieve listings at the moment. Please check your backend connections.',
        };
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h3 style={{ margin: 0, color: '#1a1a1a' }}>Classifieds AI Assistant</h3>
      </header>

      <div style={styles.chatBox}>
        {messages.map((msg, index) => (
          <div
            key={index}
            style={{
              ...styles.messageWrapper,
              justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div
              style={{
                ...styles.bubble,
                backgroundColor: msg.sender === 'user' ? '#007fff' : '#eef2f5',
                color: msg.sender === 'user' ? '#ffffff' : '#222222',
              }}
            >
              <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                {msg.text || (msg.sender === 'bot' && '...')}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div style={styles.typingIndicator}>
            <span>Scanning Vector DB & Generating Response...</span>
          </div>
        )}
        <div ref={chatBottomRef} />
      </div>

      <form onSubmit={handleSearch} style={styles.inputForm}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g., iPhone 14 under 1.5 lakhs in Mumbai"
          style={styles.input}
        />
        <button type="submit" disabled={isLoading} style={styles.button}>
          {isLoading ? 'Searching...' : 'Send'}
        </button>
      </form>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '650px',
    margin: '20px auto',
    border: '1px solid #e0e0e0',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    height: '600px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
    fontFamily: 'Inter, system-ui, sans-serif',
    backgroundColor: '#ffffff',
  },
  header: {
    padding: '16px 20px',
    borderBottom: '1px solid #f0f0f0',
    backgroundColor: '#fafafa',
    borderTopLeftRadius: '12px',
    borderTopRightRadius: '12px',
  },
  chatBox: {
    flex: 1,
    padding: '20px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  messageWrapper: {
    display: 'flex',
  },
  bubble: {
    maxWidth: '82%',
    padding: '12px 16px',
    borderRadius: '12px',
    fontSize: '14px',
  },
  typingIndicator: {
    fontSize: '12px',
    color: '#777',
    fontStyle: 'italic',
    padding: '4px 8px',
  },
  inputForm: {
    display: 'flex',
    padding: '16px',
    borderTop: '1px solid #f0f0f0',
    gap: '10px',
  },
  input: {
    flex: 1,
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #ccc',
    fontSize: '14px',
    outline: 'none',
  },
  button: {
    padding: '12px 24px',
    backgroundColor: '#007fff',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '14px',
  },
};