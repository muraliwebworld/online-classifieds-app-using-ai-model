import React from 'react';

interface HomeProps {
  onNavigate: (view: 'search' | 'post') => void;
}

export const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  return (
    <div style={styles.container}>
      {/* Hero Banner Section */}
      <div style={styles.hero}>
        <h1 style={styles.heroTitle}>Discover Anything with AI-Powered Search</h1>
        <p style={styles.heroSubtitle}>
          Find local items instantly using natural language prompts or post your own listings securely with real-time vector indexing.
        </p>
        <div style={styles.buttonGroup}>
          <button style={styles.primaryButton} onClick={() => onNavigate('search')}>
            Try AI Chat Search
          </button>
          <button style={styles.secondaryButton} onClick={() => onNavigate('post')}>
            Post an Ad
          </button>
        </div>
      </div>

      {/* Feature Highlights Grid */}
      <div style={styles.featuresGrid}>
        <div style={styles.featureCard}>
          <h3 style={styles.featureTitle}>Semantic RAG Search</h3>
          <p style={styles.featureText}>Ask complex questions like &quot;cheap iPhone near Mumbai under 1.5 lakhs&quot; and get precise context matches.</p>
        </div>
        <div style={styles.featureCard}>
          <h3 style={styles.featureTitle}>Instant Vector Sync</h3>
          <p style={styles.featureText}>Every ad posted is automatically vectorized via Together AI and upserted into Qdrant for lightning-fast lookups.</p>
        </div>
        <div style={styles.featureCard}>
          <h3 style={styles.featureTitle}>Real-Time LLM Streaming</h3>
          <p style={styles.featureText}>Powered by Groq&apos;s Llama 3 models delivering rapid conversational answers straight to your browser.</p>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '40px 20px',
    fontFamily: 'Inter, sans-serif',
  },
  hero: {
    textAlign: 'center',
    padding: '60px 20px',
    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    borderRadius: '16px',
    marginBottom: '40px',
  },
  heroTitle: { fontSize: '36px', fontWeight: 800, color: '#1a1a1a', margin: '0 0 16px 0' },
  heroSubtitle: { fontSize: '16px', color: '#555', maxWidth: '600px', margin: '0 auto 24px auto', lineHeight: '1.5' },
  buttonGroup: { display: 'flex', justifyContent: 'center', gap: '16px' },
  primaryButton: { padding: '12px 24px', backgroundColor: '#007fff', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '15px' },
  secondaryButton: { padding: '12px 24px', backgroundColor: '#ffffff', color: '#007fff', border: '1px solid #007fff', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '15px' },
  featuresGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' },
  featureCard: { padding: '24px', borderRadius: '12px', backgroundColor: '#ffffff', border: '1px solid #eaeaea', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' },
  featureTitle: { fontSize: '18px', fontWeight: 600, color: '#222', margin: '0 0 10px 0' },
  featureText: { fontSize: '14px', color: '#666', lineHeight: '1.4', margin: 0 },
};