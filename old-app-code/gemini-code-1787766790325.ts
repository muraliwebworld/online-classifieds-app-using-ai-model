// src/components/ChatSearch.tsx
import React, { useState, useRef, useEffect } from 'react';

interface AdListing {
  id: string;
  title: string;
  price: number;
  location: string;
  description: string;
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

  // Auto-scroll chat to bottom on new messages
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    const userText = query;
    setQuery('');
    
    // Add user message to state
    setMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setIsLoading(true);

    // Add initial empty bot message to update via stream
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
        throw new Error('Failed to fetch AI response');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
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
                
                // Update stream in real-time
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
            } catch (err) {
              // Ignore partial JSON chunks parse errors during streaming
            }
          }
        }
      }
    } catch (error) {
      console.error('Streaming error:', error);
      setMessages((prev) => {
        const updated = [...prev];
        const lastIndex = updated.length - 1;
        updated[lastIndex] = {
          sender: 'bot',
          text: 'Sorry, I encountered an issue retrieving the listings. Please try again.',
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
        <h3>Classifieds AI Assistant</h3>
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
                color: msg.sender === 'user' ? '#fff' : '#333',
              }}
            >
              <p style={{ margin: 0, whitespace: 'pre-wrap' }}>{msg.text}</p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div style={styles.typingIndicator}>
            <span>AI is searching listings...</span>
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
          Send
        </button>
      </form>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '600px',
    margin: '20px auto',
    border: '1px solid #ddd',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    height: '600px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    fontFamily: 'sans-serif',
  },
  header: {
    padding: '12px 20px',
    borderBottom: '1px solid #eee',
    backgroundColor: '#f8f9fa',
  },
  chatBox: {
    flex: 1,
    padding: '15px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  messageWrapper: {
    display: 'flex',
  },
  bubble: {
    maxWidth: '80%',
    padding: '10px 14px',
    borderRadius: '12px',
    lineHeight: '1.4',
    fontSize: '14px',
  },
  typingIndicator: {
    fontSize: '12px',
    color: '#888',
    fontStyle: 'italic',
  },
  inputForm: {
    display: 'flex',
    padding: '12px',
    borderTop: '1px solid #eee',
  },
  input: {
    flex: 1,
    padding: '10px',
    borderRadius: '4px',
    border: '1px solid #ccc',
    outline: 'none',
  },
  button: {
    marginLeft: '10px',
    padding: '10px 20px',
    backgroundColor: '#007fff',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
};