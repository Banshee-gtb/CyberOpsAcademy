import { corsHeaders } from '../_shared/cors.ts';

const apiKey = Deno.env.get('ONSPACE_AI_API_KEY') ?? '';
const baseUrl = Deno.env.get('ONSPACE_AI_BASE_URL') ?? '';

interface TestCase {
  input: string;
  expected: string;
  description: string;
}

interface EvalRequest {
  code: string;
  language: string;
  testCases: TestCase[];
  challengeDescription?: string;
  starterCode?: string;
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { code, language, testCases, challengeDescription, starterCode } = await req.json() as EvalRequest;

    if (!code || !language) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: code, language' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build the evaluation prompt
    const systemPrompt = `You are an expert ${language} code evaluator for a cybersecurity training platform called CyberNinja.

Your job is to analyze submitted code and evaluate it against test cases. You must:

1. **Read the code carefully** and understand what it does
2. **Mentally execute** each test case through the code logic
3. **Determine pass/fail** for each test case based on whether the code would produce the expected output
4. **Identify bugs, logic errors, edge cases** the code misses
5. **Provide specific, helpful feedback** — not vague suggestions

IMPORTANT RULES:
- Be strict but fair. If the code has a clear logical path to the correct answer, mark it as passing.
- If the code just has "pass" or is essentially the starter code unchanged, ALL tests fail.
- If the code has syntax errors, ALL tests fail.
- Focus on whether the LOGIC is correct, not minor style issues.
- For cybersecurity-related code, check for real-world accuracy of security concepts.

You MUST respond in this exact JSON format and nothing else:
{
  "overall": "pass" | "fail" | "partial",
  "score": <number 0-100>,
  "testResults": [
    {
      "testIndex": <number>,
      "passed": <boolean>,
      "actualOutput": "<what the code would actually return/output>",
      "feedback": "<specific explanation of why it passed or failed>"
    }
  ],
  "codeQuality": {
    "hasImplementation": <boolean>,
    "hasSyntaxErrors": <boolean>,
    "hasReturnStatement": <boolean>,
    "linesOfCode": <number>,
    "complexity": "simple" | "moderate" | "complex"
  },
  "feedback": "<overall feedback - 2-4 sentences about the solution quality, what was done well, and what could be improved>",
  "suggestions": ["<specific improvement suggestion 1>", "<specific improvement suggestion 2>"],
  "securityNotes": "<any cybersecurity-relevant observations about the code, if applicable>"
}`;

    const userPrompt = `## Challenge Description
${challengeDescription || 'No description provided.'}

## Starter Code (Original)
\`\`\`${language}
${starterCode || 'N/A'}
\`\`\`

## Submitted Code
\`\`\`${language}
${code}
\`\`\`

## Test Cases
${testCases?.map((tc, i) => `### Test ${i + 1}: ${tc.description}
- Input: ${tc.input}
- Expected Output: ${tc.expected}`).join('\n\n') || 'No test cases provided.'}

Evaluate this code submission. Mentally execute each test case and determine if the code would produce the expected output. Respond with the JSON evaluation.`;

    console.log('Evaluating code submission...');

    const aiResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('OnSpace AI error:', errText);
      return new Response(
        JSON.stringify({ error: `AI evaluation failed: ${errText}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content ?? '';

    console.log('AI response received, parsing...');

    // Extract JSON from response (handle markdown code blocks)
    let evaluation;
    try {
      const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, rawContent];
      const jsonStr = (jsonMatch[1] || rawContent).trim();
      evaluation = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error('Failed to parse AI response:', rawContent);
      // Fallback: return a basic evaluation
      evaluation = {
        overall: 'fail',
        score: 0,
        testResults: testCases?.map((_, i) => ({
          testIndex: i,
          passed: false,
          actualOutput: 'Unable to evaluate',
          feedback: 'AI evaluation parsing failed. Please try again.',
        })) || [],
        codeQuality: {
          hasImplementation: code !== starterCode,
          hasSyntaxErrors: false,
          hasReturnStatement: code.includes('return'),
          linesOfCode: code.split('\n').filter((l: string) => l.trim() && !l.trim().startsWith('#')).length,
          complexity: 'simple',
        },
        feedback: 'The evaluation could not be parsed. Please try submitting again.',
        suggestions: ['Ensure your code is syntactically correct', 'Make sure all test cases are handled'],
        securityNotes: '',
      };
    }

    return new Response(
      JSON.stringify(evaluation),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('evaluate-code error:', err);
    return new Response(
      JSON.stringify({ error: `Server error: ${(err as Error).message}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
