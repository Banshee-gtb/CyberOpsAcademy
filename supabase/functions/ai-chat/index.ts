import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('ONSPACE_AI_API_KEY');
    const baseUrl = Deno.env.get('ONSPACE_AI_BASE_URL');
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!apiKey || !baseUrl) {
      console.error('Missing OnSpace AI configuration');
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      console.error('Auth error:', userError?.message);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { messages, conversationId } = await req.json();
    console.log(`AI chat request from user ${user.id}, messages: ${messages.length}`);

    // Build system prompt for CyberNinja AI
    const systemMessage = {
      role: 'system',
      content: `You are CyberNinja AI — an expert cybersecurity mentor and ethical hacking instructor. You help learners from beginner to expert level.

Your personality:
- Professional but approachable
- You explain complex concepts clearly with real-world analogies
- You encourage hands-on practice and ethical behavior
- You never provide instructions for illegal activities — only authorized penetration testing
- You use cybersecurity terminology accurately
- You give code examples when relevant (Python, Bash, etc.)

Topics you cover:
- Network security (TCP/IP, firewalls, IDS/IPS, VPNs)
- Web application security (OWASP Top 10, XSS, SQLi, CSRF)
- Linux administration and command line
- Cryptography (symmetric, asymmetric, hashing, PKI)
- Penetration testing methodology
- Malware analysis and reverse engineering
- Social engineering awareness
- Incident response and forensics
- Cloud security (AWS, Azure, GCP)
- CTF challenge hints and techniques

Always emphasize: Get proper authorization before testing. Ethical hacking means having explicit written permission.`
    };

    // Stream response
    const aiResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [systemMessage, ...messages],
        stream: true,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('OnSpace AI error:', errText);
      return new Response(JSON.stringify({ error: `AI error: ${errText}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Forward the SSE stream
    return new Response(aiResponse.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (err) {
    console.error('Edge function error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
