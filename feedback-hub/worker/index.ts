import { Hono } from 'hono';
import { cors } from 'hono/cors';

interface Env {
  DB: D1Database;
  AI: any;
  CACHE: KVNamespace;
}

const app = new Hono<{ Bindings: Env }>();

app.use('/*', cors());

app.get('/api/health', (c) => {
  return c.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    bindings: {
      db: !!c.env.DB,
      ai: !!c.env.AI,
      cache: !!c.env.CACHE
    }
  });
});

app.get('/api/projects', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM projects ORDER BY name').all();
    return c.json(results);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return c.json({ error: 'Failed to fetch projects' }, 500);
  }
});

// ============================================
// Helper Functions
// ============================================

function generateSimpleSummary(content: string): string {
  const words = content.split(' ');
  if (words.length <= 10) return content;
  return words.slice(0, 12).join(' ') + '...';
}

function generateRecommendation(category: string, priority: number): string {
  if (priority >= 4) {
    return `Critical: ${category === 'bug' ? 'Fix immediately' : 'High-priority request'}`;
  } else if (priority === 3) {
    return `Important: Schedule ${category === 'bug' ? 'bug fix' : 'feature'} for next sprint`;
  } else if (category === 'feature') {
    return 'Consider for future roadmap';
  }
  return 'Monitor and respond to user';
}

function extractLinks(content: string): { type: string; url: string }[] {
  const links = [];
  
  // GitHub issues (#123)
  const githubIssue = content.match(/#(\d+)/);
  if (githubIssue) {
    links.push({ type: 'github_issue', url: `https://github.com/org/repo/issues/${githubIssue[1]}` });
  }
  
  // URLs
  const urlPattern = /(https?:\/\/[^\s]+)/g;
  const urls = content.match(urlPattern);
  if (urls) {
    urls.forEach(url => {
      if (url.includes('discord.com')) {
        links.push({ type: 'discord', url });
      } else if (url.includes('github.com')) {
        links.push({ type: 'github', url });
      } else {
        links.push({ type: 'url', url });
      }
    });
  }
  
  return links;
}

function generateAIFixSuggestion(content: string, category: string): string {
  const lowerContent = content.toLowerCase();
  
  if (category === 'bug') {
    if (lowerContent.includes('crash') || lowerContent.includes('crashes')) {
      if (lowerContent.includes('upload')) {
        return 'Add file size validation before upload. Implement chunked upload for files >5MB. Add error boundary to catch upload exceptions.';
      }
      return 'Add try-catch blocks around the crash point. Implement error logging with stack traces. Add null/undefined checks.';
    }
    
    if (lowerContent.includes('not working') || lowerContent.includes('broken')) {
      if (lowerContent.includes('button') || lowerContent.includes('click')) {
        return 'Check event listener bindings. Verify CSS z-index isn\'t blocking clicks. Test across browsers (especially Safari).';
      }
      if (lowerContent.includes('login') || lowerContent.includes('auth')) {
        return 'Verify OAuth flow. Check cookie/session settings. Ensure CORS headers are correct. Test on incognito mode.';
      }
      return 'Debug step-by-step. Check console for errors. Verify API responses. Add detailed error messages.';
    }
    
    if (lowerContent.includes('slow') || lowerContent.includes('timeout')) {
      return 'Add database indexes on queried columns. Implement caching (Redis/KV). Use pagination for large datasets. Add request timeout handling.';
    }
    
    if (lowerContent.includes('token') || lowerContent.includes('expire')) {
      return 'Implement refresh token mechanism. Extend token TTL to 7 days. Add automatic token renewal before expiry. Store refresh tokens securely.';
    }
  }
  
  if (category === 'feature') {
    if (lowerContent.includes('dark mode')) {
      return 'Implement CSS variables for colors. Add theme toggle in settings. Store preference in localStorage. Use prefers-color-scheme media query.';
    }
    if (lowerContent.includes('export') || lowerContent.includes('csv')) {
      return 'Use Papa Parse or csv-stringify library. Add export button in UI. Generate CSV on backend. Implement download via blob URL.';
    }
    return 'Create feature spec doc. Break into smaller tasks. Estimate 2-week sprint. Design mockups first.';
  }
  
  return 'Analyze root cause. Write test cases. Implement fix. Verify across environments.';
}

// ============================================
// API Routes
// ============================================

app.post('/api/feedback', async (c) => {
  try {
    const { project_id, source, content, user_id } = await c.req.json();
    
    if (!source || !content) {
      return c.json({ error: 'source and content are required' }, 400);
    }
    
    console.log('Processing feedback:', { source, content: content.substring(0, 50) });
    
    // Step 1: Sentiment Analysis
    let sentiment = 'neutral';
    let sentimentScore = 0.5;
    
    try {
      const sentimentResponse: any = await c.env.AI.run(
        '@cf/huggingface/distilbert-sst-2-int8',
        { text: content }
      );
      
      if (sentimentResponse && Array.isArray(sentimentResponse) && sentimentResponse[0]) {
        const rawLabel = sentimentResponse[0].label;
        const rawScore = sentimentResponse[0].score;
        
        if (rawLabel === 'POSITIVE') {
          sentiment = 'positive';
          sentimentScore = rawScore;
        } else if (rawLabel === 'NEGATIVE') {
          sentiment = 'negative';
          sentimentScore = rawScore;
        }
      }
      
      console.log('Sentiment analysis:', { sentiment, score: sentimentScore });
    } catch (error) {
      console.error('AI sentiment analysis failed:', error);
    }
    
    // Step 2: Category Classification
    const lowerContent = content.toLowerCase();
    let category = 'feedback';
    
    if (lowerContent.includes('bug') || lowerContent.includes('error') || 
        lowerContent.includes('broken') || lowerContent.includes('crash') ||
        lowerContent.includes('not working') || lowerContent.includes('fail')) {
      category = 'bug';
    } else if (lowerContent.includes('feature') || lowerContent.includes('add') || 
               lowerContent.includes('wish') || lowerContent.includes('please') ||
               lowerContent.includes('would like') || lowerContent.includes('request')) {
      category = 'feature';
    } else if (lowerContent.includes('how') || lowerContent.includes('why') || 
               lowerContent.includes('?') || lowerContent.includes('help')) {
      category = 'question';
    }
    
    // Step 3: Calculate Priority
    let priority = 1;
    
    if (sentiment === 'negative' && category === 'bug') {
      priority = sentimentScore > 0.8 ? 5 : 4;
    } else if (category === 'bug' || sentiment === 'negative') {
      priority = 3;
    } else if (category === 'feature') {
      priority = 2;
    }
    
    // Step 4: AI-Generated Summary
    const aiSummary = generateSimpleSummary(content);
    
    // Step 5: 🚀 REAL AI RECOMMENDATION using Llama 3
    let aiRecommendation = 'Monitor and respond to user';
    try {
      const recommendationPrompt = `You are a product manager. Given this feedback, provide a brief 1-sentence actionable recommendation.

Feedback: "${content}"
Category: ${category}
Priority: ${priority}
Sentiment: ${sentiment}

Recommendation:`;

      const aiResponse: any = await c.env.AI.run('@cf/meta/llama-3-8b-instruct', {
        messages: [
          {
            role: 'system',
            content: 'You are an expert product manager. Provide brief, actionable recommendations in 1 sentence.'
          },
          {
            role: 'user',
            content: recommendationPrompt
          }
        ],
        max_tokens: 100,
        temperature: 0.7
      });
      
      if (aiResponse && aiResponse.response) {
        aiRecommendation = aiResponse.response.trim();
        console.log('AI Recommendation generated:', aiRecommendation.substring(0, 50));
      }
    } catch (error) {
      console.error('AI recommendation generation failed:', error);
      aiRecommendation = generateRecommendation(category, priority);
    }
    
    // Step 6: 🚀 REAL AI FIX SUGGESTION using Llama 3
    let aiFixSuggestion = 'Investigate and address the issue';
    if (category === 'bug') {
      try {
        const fixPrompt = `You are a senior software engineer. Given this bug report, provide a concise technical fix suggestion (2-3 sentences).

Bug: "${content}"
Priority: ${priority}

Technical fix suggestion:`;

        const fixResponse: any = await c.env.AI.run('@cf/meta/llama-3-8b-instruct', {
          messages: [
            {
              role: 'system',
              content: 'You are a senior software engineer. Provide concise, technical fix suggestions in 2-3 sentences.'
            },
            {
              role: 'user',
              content: fixPrompt
            }
          ],
          max_tokens: 150,
          temperature: 0.5
        });
        
        if (fixResponse && fixResponse.response) {
          aiFixSuggestion = fixResponse.response.trim();
          console.log('AI Fix Suggestion generated:', aiFixSuggestion.substring(0, 50));
        }
      } catch (error) {
        console.error('AI fix suggestion generation failed:', error);
        aiFixSuggestion = generateAIFixSuggestion(content, category);
      }
    } else if (category === 'feature') {
      aiFixSuggestion = 'Create feature spec document, prioritize in product roadmap, and assign to engineering team for estimation.';
    } else if (category === 'question') {
      aiFixSuggestion = 'Review documentation for gaps, respond to user with clear answer, and update FAQ section if needed.';
    }
    
    // Step 7: Extract Links
    const links = extractLinks(content);
    
    console.log('Final analysis:', { 
      category, 
      priority, 
      sentiment, 
      recommendation: aiRecommendation.substring(0, 50),
      fixSuggestion: aiFixSuggestion.substring(0, 50)
    });
    
    // Step 8: Save to Database
    const result = await c.env.DB.prepare(`
      INSERT INTO feedback 
      (project_id, source, content, sentiment, category, priority, user_id, ai_summary, ai_recommendation, metadata) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      project_id || 1,
      source,
      content,
      sentiment,
      category,
      priority,
      user_id || 'anonymous',
      aiSummary,
      aiRecommendation,
      JSON.stringify({ fix_suggestion: aiFixSuggestion, links })
    ).run();
    
    // Clear cache
    await c.env.CACHE.delete('feedback:all');
    await c.env.CACHE.delete('analytics');
    await c.env.CACHE.delete('insights');
    
    return c.json({ 
      success: true, 
      id: result.meta.last_row_id,
      analysis: {
        sentiment,
        category,
        priority,
        summary: aiSummary,
        recommendation: aiRecommendation,
        fix_suggestion: aiFixSuggestion,
        links
      }
    });
  } catch (error) {
    console.error('Error creating feedback:', error);
    return c.json({ 
      error: 'Failed to create feedback',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

app.get('/api/feedback', async (c) => {
  try {
    const source = c.req.query('source');
    const category = c.req.query('category');
    const project_id = c.req.query('project_id');
    
    const cacheKey = `feedback:${project_id || 'all'}:${source || 'all'}:${category || 'all'}`;
    const cached = await c.env.CACHE.get(cacheKey);
    if (cached) {
      return c.json(JSON.parse(cached));
    }
    
    let query = `
      SELECT f.*, p.name as project_name 
      FROM feedback f 
      LEFT JOIN projects p ON f.project_id = p.id 
      WHERE 1=1
    `;
    const params: any[] = [];
    
    if (project_id) {
      query += ' AND f.project_id = ?';
      params.push(parseInt(project_id));
    }
    if (source) {
      query += ' AND f.source = ?';
      params.push(source);
    }
    if (category) {
      query += ' AND f.category = ?';
      params.push(category);
    }
    
    query += ' ORDER BY f.priority DESC, f.created_at DESC LIMIT 100';
    
    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    
    await c.env.CACHE.put(cacheKey, JSON.stringify(results), { expirationTtl: 300 });
    
    return c.json(results);
  } catch (error) {
    console.error('Error fetching feedback:', error);
    return c.json({ error: 'Failed to fetch feedback' }, 500);
  }
});

app.get('/api/analytics', async (c) => {
  try {
    const cached = await c.env.CACHE.get('analytics');
    if (cached) {
      return c.json(JSON.parse(cached));
    }
    
    const total = await c.env.DB.prepare('SELECT COUNT(*) as total FROM feedback').first();
    
    const breakdown = await c.env.DB.prepare(`
      SELECT source, sentiment, category, COUNT(*) as count
      FROM feedback
      GROUP BY source, sentiment, category
      ORDER BY count DESC
    `).all();
    
    const priorityDist = await c.env.DB.prepare(`
      SELECT priority, COUNT(*) as count
      FROM feedback
      GROUP BY priority
      ORDER BY priority DESC
    `).all();
    
    const projectDist = await c.env.DB.prepare(`
      SELECT p.name, COUNT(f.id) as count
      FROM projects p
      LEFT JOIN feedback f ON p.id = f.project_id
      GROUP BY p.id, p.name
      ORDER BY count DESC
    `).all();
    
    const topIssues = await c.env.DB.prepare(`
      SELECT content, priority, sentiment, ai_recommendation, created_at
      FROM feedback
      WHERE category = 'bug' AND priority >= 3
      ORDER BY priority DESC, created_at DESC
      LIMIT 5
    `).all();
    
    const response = {
      total: total?.total || 0,
      breakdown: breakdown.results,
      priorityDistribution: priorityDist.results,
      projectDistribution: projectDist.results,
      topIssues: topIssues.results
    };
    
    await c.env.CACHE.put('analytics', JSON.stringify(response), { expirationTtl: 120 });
    
    return c.json(response);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return c.json({ error: 'Failed to fetch analytics' }, 500);
  }
});

app.get('/api/insights', async (c) => {
  try {
    const cached = await c.env.CACHE.get('insights');
    if (cached) {
      return c.json(JSON.parse(cached));
    }
    
    const stats = await c.env.DB.prepare(`
      SELECT 
        category,
        sentiment,
        AVG(priority) as avg_priority,
        COUNT(*) as count
      FROM feedback 
      GROUP BY category, sentiment
      ORDER BY count DESC
    `).all();
    
    const topBugs = await c.env.DB.prepare(`
      SELECT content, priority, ai_recommendation
      FROM feedback
      WHERE category = 'bug'
      ORDER BY priority DESC, created_at DESC
      LIMIT 3
    `).all();
    
    const insights = [];
    
    if (stats.results.length > 0) {
      const bugCount = stats.results.filter((s: any) => s.category === 'bug').reduce((sum: number, s: any) => sum + s.count, 0);
      const negativeCount = stats.results.filter((s: any) => s.sentiment === 'negative').reduce((sum: number, s: any) => sum + s.count, 0);
      
      if (bugCount > 0) {
        insights.push(`📊 ${bugCount} bug reports identified - review top priority issues`);
      }
      if (negativeCount > 0) {
        insights.push(`⚠️ ${negativeCount} negative sentiment feedback - requires attention`);
      }
    }
    
    const response = {
      insights: insights.length > 0 ? insights : ['No significant patterns detected yet'],
      topBugs: topBugs.results,
      breakdown: stats.results,
      totalAnalyzed: stats.results.reduce((sum: number, s: any) => sum + s.count, 0),
      timestamp: new Date().toISOString()
    };
    
    await c.env.CACHE.put('insights', JSON.stringify(response), { expirationTtl: 600 });
    
    return c.json(response);
  } catch (error) {
    console.error('Error generating insights:', error);
    return c.json({ error: 'Failed to generate insights' }, 500);
  }
});

app.post('/api/feedback/bulk', async (c) => {
  try {
    console.log('Starting bulk feedback generation...');
    
    const mockFeedback = [
      // BUGS
      { project_id: 2, source: 'github', content: 'App crashes when uploading files larger than 10MB. Error: out of memory', user_id: 'user1' },
      { project_id: 2, source: 'discord', content: 'Login button broken on Safari mobile. Not working at all!', user_id: 'user2' },
      { project_id: 2, source: 'email', content: 'Push notifications are not working after iOS 17 update. Checked all settings.', user_id: 'user3' },
      { project_id: 4, source: 'github', content: 'API returns 500 error when fetching large datasets. Timing out constantly.', user_id: 'user4' },
      
      // FEATURES
      { project_id: 3, source: 'email', content: 'Please add dark mode feature to the dashboard. My eyes hurt at night!', user_id: 'user5' },
      { project_id: 3, source: 'twitter', content: 'Would love to see CSV export functionality added to reports section', user_id: 'user6' },
      { project_id: 2, source: 'discord', content: 'Feature request: Add biometric authentication for faster login', user_id: 'user7' },
      { project_id: 4, source: 'github', content: 'Please add webhook support for real-time notifications in the API', user_id: 'user8' },
      
      // QUESTIONS
      { project_id: 5, source: 'discord', content: 'How do I configure OAuth2 authentication? The docs are unclear', user_id: 'user9' },
      { project_id: 5, source: 'email', content: 'Why does the API require separate keys for staging vs production?', user_id: 'user10' },
      { project_id: 1, source: 'twitter', content: 'Can someone explain how to enable 2FA? Not finding it in settings', user_id: 'user11' },
      { project_id: 3, source: 'slack', content: 'Help! How to export user data for GDPR compliance?', user_id: 'user12' },
      
      // POSITIVE FEEDBACK
      { project_id: 1, source: 'twitter', content: 'Amazing product! Best thing I used this year. Highly recommend to everyone!', user_id: 'user13' },
      { project_id: 2, source: 'discord', content: 'Love the new dashboard design! So clean and modern. Great work team!', user_id: 'user14' },
      { project_id: 3, source: 'email', content: 'The reporting features are excellent. Exactly what we needed. Thank you!', user_id: 'user15' },
      
      // MORE BUGS
      { project_id: 2, source: 'github', content: 'Search function not returning results for partial matches. Broken filter!', user_id: 'user16' },
      { project_id: 4, source: 'email', content: 'Authentication tokens expire too quickly. Need to re-login every hour which is super annoying', user_id: 'user17' },
      
      // MORE FEATURES
      { project_id: 3, source: 'slack', content: 'Add support for custom themes and branding options please', user_id: 'user18' },
      { project_id: 2, source: 'twitter', content: 'Would be great to have offline mode for the mobile app', user_id: 'user19' },
      
      // MIXED
      { project_id: 5, source: 'discord', content: 'Documentation needs more examples. The current guides are too basic for advanced use cases', user_id: 'user20' },
    ];
    
    let created = 0;
    let failed = 0;
    
    for (const feedback of mockFeedback) {
      try {
        const response = await fetch(new URL('/api/feedback', c.req.url).toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(feedback)
        });
        
        if (response.ok) {
          created++;
          console.log(`Created feedback ${created}/${mockFeedback.length}`);
        } else {
          failed++;
          const errorText = await response.text();
          console.error(`Failed to create feedback: ${errorText}`);
        }
      } catch (error) {
        failed++;
        console.error('Error creating feedback:', error);
      }
    }
    
    console.log(`Bulk creation complete: ${created} created, ${failed} failed`);
    
    return c.json({ 
      success: true, 
      created,
      failed,
      total: mockFeedback.length
    });
  } catch (error) {
    console.error('Error in bulk creation:', error);
    return c.json({ 
      error: 'Failed to create bulk feedback',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

export default app;
