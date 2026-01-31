import { useState, useEffect } from 'react';
import './App.css';

interface FeedbackItem {
  id: number;
  content: string;
  source: string;
  sentiment: string;
  category: string;
  priority: number;
  project_name: string;
  ai_recommendation: string;
  metadata: any;
  created_at: string;
}

interface Analytics {
  total: number;
  breakdown: any[];
  priorityDistribution: any[];
  projectDistribution: any[];
  topIssues: any[];
}

function App() {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSource, setSelectedSource] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [newFeedback, setNewFeedback] = useState({
    content: '',
    source: 'email',
    project_id: 1
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [selectedSource, selectedCategory]);

  async function loadData() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedSource) params.append('source', selectedSource);
      if (selectedCategory) params.append('category', selectedCategory);

      const feedbackRes = await fetch(`/api/feedback?${params}`);
      const feedbackData = await feedbackRes.json();
      setFeedback(Array.isArray(feedbackData) ? feedbackData : []);

      const analyticsRes = await fetch('/api/analytics');
      const analyticsData = await analyticsRes.json();
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function generateMockData() {
    try {
      const res = await fetch('/api/feedback/bulk', { method: 'POST' });
      const data = await res.json();
      alert(`✅ Generated ${data.created} feedback items successfully!`);
      loadData();
    } catch (error) {
      console.error('Error generating mock data:', error);
      alert('❌ Failed to generate mock data');
    }
  }

  async function submitFeedback() {
    if (!newFeedback.content.trim()) {
      alert('⚠️ Please enter feedback content');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFeedback)
      });

      if (res.ok) {
        alert('✅ Feedback submitted successfully!');
        setShowModal(false);
        setNewFeedback({ content: '', source: 'email', project_id: 1 });
        loadData();
      } else {
        alert('❌ Failed to submit feedback');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('❌ Error submitting feedback');
    } finally {
      setSubmitting(false);
    }
  }

  const getPriorityBadge = (priority: number) => {
    if (priority >= 4) return { bg: '#fee2e2', color: '#dc2626', label: 'Critical' };
    if (priority === 3) return { bg: '#fed7aa', color: '#ea580c', label: 'High' };
    if (priority === 2) return { bg: '#fef3c7', color: '#d97706', label: 'Medium' };
    return { bg: '#d1fae5', color: '#059669', label: 'Low' };
  };

  const getSentimentBadge = (sentiment: string) => {
    if (sentiment === 'positive') return { bg: '#d1fae5', color: '#059669', icon: '😊' };
    if (sentiment === 'negative') return { bg: '#fee2e2', color: '#dc2626', icon: '😞' };
    return { bg: '#e5e7eb', color: '#6b7280', icon: '😐' };
  };

  const getCategoryBadge = (category: string) => {
    if (category === 'bug') return { bg: '#fee2e2', color: '#dc2626', icon: '🐛' };
    if (category === 'feature') return { bg: '#dbeafe', color: '#2563eb', icon: '✨' };
    if (category === 'question') return { bg: '#e9d5ff', color: '#9333ea', icon: '❓' };
    return { bg: '#e5e7eb', color: '#6b7280', icon: '💬' };
  };

  const getSourceIcon = (source: string) => {
    const icons: Record<string, string> = {
      github: '🐙',
      discord: '💬',
      email: '📧',
      twitter: '🐦',
      slack: '💼'
    };
    return icons[source] || '📝';
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(180deg, #f9fafb 0%, #ffffff 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>
      {/* Cloudflare-Style Header */}
      <header style={{
        background: '#fff',
        borderBottom: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '1rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: 'linear-gradient(135deg, #F6821F 0%, #FF9E4A 100%)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
            }}>
              🍊
            </div>
            <div>
              <h1 style={{ 
                margin: 0, 
                fontSize: '1.5rem', 
                fontWeight: '700',
                background: 'linear-gradient(135deg, #F6821F 0%, #FF6B35 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '-0.025em'
              }}>
                Feedback Hub
              </h1>
              <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem', fontWeight: '500' }}>
                AI-Powered Feedback Intelligence
              </p>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={generateMockData}
              style={{
                padding: '0.625rem 1.25rem',
                background: 'linear-gradient(135deg, #F6821F 0%, #FF9E4A 100%)',
                border: 'none',
                borderRadius: '6px',
                color: '#fff',
                fontWeight: '600',
                fontSize: '0.875rem',
                cursor: 'pointer',
                boxShadow: '0 4px 6px -1px rgb(246 130 31 / 0.3)',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 10px 15px -3px rgb(246 130 31 / 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgb(246 130 31 / 0.3)';
              }}
            >
              <span>🎲</span>
              Generate Mock Data
            </button>

            <button
              onClick={() => setShowModal(true)}
              style={{
                padding: '0.625rem 1.25rem',
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                color: '#374151',
                fontWeight: '600',
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f9fafb';
                e.currentTarget.style.borderColor = '#d1d5db';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#fff';
                e.currentTarget.style.borderColor = '#e5e7eb';
              }}
            >
              <span>➕</span>
              Add Feedback
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '2rem'
      }}>
        {/* Stats Cards - Cloudflare Style */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          <div style={{
            background: '#fff',
            padding: '1.5rem',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
            transition: 'all 0.3s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 10px 15px -3px rgb(0 0 0 / 0.1)';
            e.currentTarget.style.transform = 'translateY(-4px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 1px 3px 0 rgb(0 0 0 / 0.1)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: '600' }}>Total Feedback</span>
              <span style={{ fontSize: '1.5rem' }}>📊</span>
            </div>
            <div style={{ 
              fontSize: '2.5rem', 
              fontWeight: '700', 
              background: 'linear-gradient(135deg, #F6821F 0%, #FF6B35 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '0.5rem'
            }}>
              {analytics?.total || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '600' }}>
              ↗ Active monitoring
            </div>
          </div>

          <div style={{
            background: '#fff',
            padding: '1.5rem',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
            transition: 'all 0.3s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 10px 15px -3px rgb(0 0 0 / 0.1)';
            e.currentTarget.style.transform = 'translateY(-4px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 1px 3px 0 rgb(0 0 0 / 0.1)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: '600' }}>High Priority</span>
              <span style={{ fontSize: '1.5rem' }}>🚨</span>
            </div>
            <div style={{ 
              fontSize: '2.5rem', 
              fontWeight: '700', 
              color: '#dc2626',
              marginBottom: '0.5rem'
            }}>
              {analytics?.priorityDistribution?.find((p: any) => p.priority >= 4)?.count || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: '600' }}>
              ⚠ Requires attention
            </div>
          </div>

          <div style={{
            background: '#fff',
            padding: '1.5rem',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
            transition: 'all 0.3s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 10px 15px -3px rgb(0 0 0 / 0.1)';
            e.currentTarget.style.transform = 'translateY(-4px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 1px 3px 0 rgb(0 0 0 / 0.1)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: '600' }}>Bug Reports</span>
              <span style={{ fontSize: '1.5rem' }}>🐛</span>
            </div>
            <div style={{ 
              fontSize: '2.5rem', 
              fontWeight: '700', 
              color: '#ea580c',
              marginBottom: '0.5rem'
            }}>
              {analytics?.breakdown?.filter((b: any) => b.category === 'bug').reduce((sum: number, b: any) => sum + b.count, 0) || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#f97316', fontWeight: '600' }}>
              🔍 Under investigation
            </div>
          </div>
        </div>

        {/* Filters - Cloudflare Style */}
        <div style={{
          background: '#fff',
          padding: '1.25rem 1.5rem',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
          marginBottom: '2rem',
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>Filters:</span>
          
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            style={{
              padding: '0.5rem 2.5rem 0.5rem 1rem',
              background: '#f9fafb',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              color: '#374151',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s',
              appearance: 'none',
              backgroundImage: 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e")',
              backgroundPosition: 'right 0.5rem center',
              backgroundRepeat: 'no-repeat',
              backgroundSize: '1.5em 1.5em'
            }}
          >
            <option value="">All Sources</option>
            <option value="github">🐙 GitHub</option>
            <option value="discord">💬 Discord</option>
            <option value="email">📧 Email</option>
            <option value="twitter">🐦 Twitter</option>
            <option value="slack">💼 Slack</option>
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{
              padding: '0.5rem 2.5rem 0.5rem 1rem',
              background: '#f9fafb',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              color: '#374151',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s',
              appearance: 'none',
              backgroundImage: 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e")',
              backgroundPosition: 'right 0.5rem center',
              backgroundRepeat: 'no-repeat',
              backgroundSize: '1.5em 1.5em'
            }}
          >
            <option value="">All Categories</option>
            <option value="bug">🐛 Bugs</option>
            <option value="feature">✨ Features</option>
            <option value="question">❓ Questions</option>
            <option value="feedback">💬 Feedback</option>
          </select>

          {(selectedSource || selectedCategory) && (
            <button
              onClick={() => {
                setSelectedSource('');
                setSelectedCategory('');
              }}
              style={{
                padding: '0.5rem 1rem',
                background: '#f3f4f6',
                border: 'none',
                borderRadius: '6px',
                color: '#6b7280',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              ✕ Clear filters
            </button>
          )}
        </div>

        {/* Feedback List - Cloudflare Style */}
        {loading ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '4rem',
            background: '#fff',
            borderRadius: '12px',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
            <div style={{ color: '#6b7280', fontWeight: '500' }}>Loading feedback...</div>
          </div>
        ) : feedback.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '4rem',
            background: '#fff',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)'
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📭</div>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#111827', fontSize: '1.25rem', fontWeight: '600' }}>
              No feedback yet
            </h3>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
              Click "Generate Mock Data" to populate with sample feedback
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {feedback.map((item) => {
              let parsedMetadata = null;
              try {
                parsedMetadata = typeof item.metadata === 'string' 
                  ? JSON.parse(item.metadata) 
                  : item.metadata;
              } catch (e) {
                console.error('Failed to parse metadata:', e);
              }

              const priorityBadge = getPriorityBadge(item.priority);
              const sentimentBadge = getSentimentBadge(item.sentiment);
              const categoryBadge = getCategoryBadge(item.category);

              return (
                <div
                  key={item.id}
                  style={{
                    background: '#fff',
                    padding: '1.5rem',
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
                    transition: 'all 0.2s',
                    borderLeft: `4px solid ${priorityBadge.color}`
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 10px 15px -3px rgb(0 0 0 / 0.1)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 1px 3px 0 rgb(0 0 0 / 0.1)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {/* Header with badges */}
                  <div style={{
                    display: 'flex',
                    gap: '0.5rem',
                    marginBottom: '1rem',
                    flexWrap: 'wrap',
                    alignItems: 'center'
                  }}>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      background: priorityBadge.bg,
                      color: priorityBadge.color
                    }}>
                      {priorityBadge.label}
                    </span>

                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      background: sentimentBadge.bg,
                      color: sentimentBadge.color,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}>
                      <span>{sentimentBadge.icon}</span>
                      {item.sentiment}
                    </span>

                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      background: categoryBadge.bg,
                      color: categoryBadge.color,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}>
                      <span>{categoryBadge.icon}</span>
                      {item.category}
                    </span>

                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      background: '#f3f4f6',
                      color: '#4b5563',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}>
                      <span>{getSourceIcon(item.source)}</span>
                      {item.source}
                    </span>

                    <span style={{
                      marginLeft: 'auto',
                      fontSize: '0.75rem',
                      color: '#9ca3af',
                      fontWeight: '500'
                    }}>
                      {new Date(item.created_at).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </div>

                  {/* Content */}
                  <p style={{
                    lineHeight: '1.6',
                    color: '#374151',
                    marginBottom: '1rem',
                    fontSize: '0.9375rem'
                  }}>
                    {item.content}
                  </p>

                  {/* AI Recommendation */}
                  {item.ai_recommendation && item.ai_recommendation.trim() !== '' && (
                    <div style={{
                      padding: '1rem',
                      background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                      borderRadius: '8px',
                      border: '1px solid #bfdbfe',
                      marginTop: '1rem'
                    }}>
                      <div style={{ 
                        fontSize: '0.75rem', 
                        color: '#1e40af', 
                        marginBottom: '0.5rem',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <span>💡</span>
                        AI Recommendation
                      </div>
                      <div style={{ 
                        fontSize: '0.875rem', 
                        color: '#1e3a8a', 
                        lineHeight: '1.6',
                        fontWeight: '500'
                      }}>
                        {item.ai_recommendation}
                      </div>
                    </div>
                  )}

                  {/* Fix Suggestion */}
                  {parsedMetadata?.fix_suggestion && parsedMetadata.fix_suggestion.trim() !== '' && (
                    <div style={{
                      padding: '1rem',
                      background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                      borderRadius: '8px',
                      border: '1px solid #bbf7d0',
                      marginTop: '0.75rem'
                    }}>
                      <div style={{ 
                        fontSize: '0.75rem', 
                        color: '#15803d', 
                        marginBottom: '0.5rem',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <span>🔧</span>
                        Suggested Fix
                      </div>
                      <div style={{ 
                        fontSize: '0.875rem', 
                        color: '#166534', 
                        lineHeight: '1.6',
                        fontWeight: '500'
                      }}>
                        {parsedMetadata.fix_suggestion}
                      </div>
                    </div>
                  )}

                  {/* Links */}
                  {parsedMetadata?.links && parsedMetadata.links.length > 0 && (
                    <div style={{
                      marginTop: '0.75rem',
                      display: 'flex',
                      gap: '0.5rem',
                      flexWrap: 'wrap'
                    }}>
                      {parsedMetadata.links.map((link: any, idx: number) => (
                        <a
                          key={idx}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            padding: '0.375rem 0.75rem',
                            background: '#f9fafb',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            color: '#4b5563',
                            textDecoration: 'none',
                            fontWeight: '600',
                            border: '1px solid #e5e7eb',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#f3f4f6';
                            e.currentTarget.style.borderColor = '#d1d5db';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#f9fafb';
                            e.currentTarget.style.borderColor = '#e5e7eb';
                          }}
                        >
                          <span>🔗</span>
                          {link.type}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal - Cloudflare Style */}
      {showModal && (
        <div
          onClick={() => setShowModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '2rem',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: '16px',
              padding: '2rem',
              maxWidth: '600px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
              position: 'relative',
              animation: 'slideUp 0.3s ease-out'
            }}
          >
            <button
              onClick={() => setShowModal(false)}
              style={{
                position: 'absolute',
                top: '1.5rem',
                right: '1.5rem',
                background: '#f3f4f6',
                border: 'none',
                borderRadius: '8px',
                width: '36px',
                height: '36px',
                cursor: 'pointer',
                fontSize: '1.25rem',
                color: '#6b7280',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#e5e7eb';
                e.currentTarget.style.color = '#374151';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f3f4f6';
                e.currentTarget.style.color = '#6b7280';
              }}
            >
              ✕
            </button>

            <h2 style={{ 
              marginTop: 0, 
              marginBottom: '0.5rem', 
              color: '#111827',
              fontSize: '1.5rem',
              fontWeight: '700'
            }}>
              ✨ Add New Feedback
            </h2>
            <p style={{ 
              margin: '0 0 1.5rem 0', 
              color: '#6b7280',
              fontSize: '0.875rem'
            }}>
              Submit feedback to help us improve our products
            </p>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontSize: '0.875rem', 
                color: '#374151',
                fontWeight: '600'
              }}>
                Source
              </label>
              <select
                value={newFeedback.source}
                onChange={(e) => setNewFeedback({ ...newFeedback, source: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: '#f9fafb',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  color: '#374151',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <option value="email">📧 Email</option>
                <option value="github">🐙 GitHub</option>
                <option value="discord">💬 Discord</option>
                <option value="twitter">🐦 Twitter</option>
                <option value="slack">💼 Slack</option>
              </select>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontSize: '0.875rem', 
                color: '#374151',
                fontWeight: '600'
              }}>
                Feedback Content
              </label>
              <textarea
                value={newFeedback.content}
                onChange={(e) => setNewFeedback({ ...newFeedback, content: e.target.value })}
                placeholder="Describe your feedback, bug report, or feature request..."
                rows={6}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: '#f9fafb',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  color: '#374151',
                  fontSize: '0.875rem',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  transition: 'all 0.2s'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#F6821F';
                  e.currentTarget.style.outline = 'none';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(246, 130, 31, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#d1d5db';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  color: '#374151',
                  fontWeight: '600',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f9fafb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#fff';
                }}
              >
                Cancel
              </button>
              <button
                onClick={submitFeedback}
                disabled={submitting}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: submitting ? '#d1d5db' : 'linear-gradient(135deg, #F6821F 0%, #FF9E4A 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontWeight: '600',
                  fontSize: '0.875rem',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  boxShadow: submitting ? 'none' : '0 4px 6px -1px rgb(246 130 31 / 0.3)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (!submitting) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 10px 15px -3px rgb(246 130 31 / 0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = submitting ? 'none' : '0 4px 6px -1px rgb(246 130 31 / 0.3)';
                }}
              >
                {submitting ? '⏳ Submitting...' : '✨ Submit Feedback'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

export default App;
