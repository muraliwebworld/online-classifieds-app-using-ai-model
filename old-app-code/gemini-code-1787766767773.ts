import React, { useState } from 'react';

export const PostListing: React.FC<{ token: string; onSuccess: () => void }> = ({ token, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    location: '',
    category: 'Electronics',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/listings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create listing');

      alert('Ad posted successfully and indexed into Vector DB!');
      setFormData({ title: '', description: '', price: '', location: '', category: 'Electronics' });
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.card}>
      <h2 style={styles.heading}>Post a New Classified Ad</h2>
      {error && <p style={styles.error}>{error}</p>}
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.field}>
          <label style={styles.label}>Title</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            placeholder="e.g., iPhone 14 Pro - Great Condition"
            style={styles.input}
          />
        </div>

        <div style={styles.row}>
          <div style={{ ...styles.field, flex: 1 }}>
            <label style={styles.label}>Price (INR)</label>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              required
              placeholder="120000"
              style={styles.input}
            />
          </div>
          <div style={{ ...styles.field, flex: 1, marginLeft: '12px' }}>
            <label style={styles.label}>Category</label>
            <select name="category" value={formData.category} onChange={handleChange} style={styles.input}>
              <option value="Electronics">Electronics</option>
              <option value="Vehicles">Vehicles</option>
              <option value="Real Estate">Real Estate</option>
              <option value="Home & Garden">Home & Garden</option>
            </select>
          </div>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Location</label>
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleChange}
            required
            placeholder="e.g., Mumbai"
            style={styles.input}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
            rows={4}
            placeholder="Provide condition, specs, or background details..."
            style={{ ...styles.input, resize: 'vertical' }}
          />
        </div>

        <button type="submit" disabled={loading} style={styles.button}>
          {loading ? 'Embedding & Publishing...' : 'Post Ad'}
        </button>
      </form>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  card: {
    maxWidth: '550px',
    margin: '40px auto',
    padding: '30px',
    borderRadius: '12px',
    backgroundColor: '#ffffff',
    boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
    fontFamily: 'Inter, sans-serif',
  },
  heading: { margin: '0 0 20px 0', fontSize: '22px', color: '#111' },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  row: { display: 'flex', width: '100%' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', fontWeight: 600, color: '#444' },
  input: { padding: '10px 14px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '14px', outline: 'none' },
  button: { padding: '12px', backgroundColor: '#007fff', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', marginTop: '10px' },
  error: { color: '#d93838', backgroundColor: '#fde8e8', padding: '10px', borderRadius: '6px', fontSize: '13px' },
};