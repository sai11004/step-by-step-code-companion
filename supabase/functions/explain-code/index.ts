import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { step, code, language, question, chatHistory, recentSteps } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const vars = Object.entries(step.memory?.variables || {})
      .map(([k, v]) => `${k} = ${JSON.stringify(v)}`)
      .join(', ');
    const arrays = Object.entries(step.memory?.arrays || {})
      .map(([k, v]) => `${k} = [${(v as any[]).join(', ')}]`)
      .join(', ');
    const stackNames = (step.callStack || []).map((f: any) => f.name).join(' → ');

    let userMessage: string;

    if (question) {
      // Q&A mode
      const recentLines = (recentSteps || [])
        .map((s: any) => `Line ${s.lineNumber}: ${s.lineCode}`)
        .join('\n');

      userMessage = `
The programmer is at step ${step.step}, line ${step.lineNumber}: "${step.lineCode}"
Language: ${language}
Variables: ${vars || 'none'}
Arrays: ${arrays || 'none'}
Call stack: ${stackNames || 'main'}

Recent execution:
${recentLines}

Full code:
${code}

Question: ${question}

Answer clearly using actual values. Keep it short.`;
    } else {
      // Explain mode
      userMessage = `
Step ${step.step}, line ${step.lineNumber}: ${step.lineCode}
Language: ${language}
Variables: ${vars || 'none yet'}
Arrays: ${arrays || 'none yet'}
Call stack: ${stackNames || 'main'}
${step.conditionResult !== null ? `Condition evaluated to: ${step.conditionResult}` : ''}
${step.swapAnimation ? `Swap happened between indices ${step.swapAnimation[0]} and ${step.swapAnimation[1]}` : ''}
${step.returnValue !== null ? `Return value: ${step.returnValue}` : ''}

Explain what just happened at this line in plain, simple English. Mention the actual values. Keep it to 2-3 sentences.`;
    }

    const messages = [];
    if (question && chatHistory) {
      for (const msg of chatHistory.slice(-6)) {
        messages.push({ role: msg.role === 'user' ? 'user' : 'assistant', content: msg.text });
      }
    }
    messages.push({ role: 'user', content: userMessage });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a friendly programming tutor built into a code visualizer.
Your job is to explain exactly what just happened at the current line.
Rules:
- Keep it SHORT: 2-3 sentences max
- Use SIMPLE words. No jargon.
- Mention the ACTUAL VALUES from the code (not abstract descriptions)
- Tell what changed AND why it changed
- DO NOT mention time complexity, space complexity, or Big O notation
- DO NOT use mathematical formulas
- Speak like you are explaining to a friend who is learning to code`,
          },
          ...messages,
        ],
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const explanation = data.choices?.[0]?.message?.content || "Could not generate explanation.";

    return new Response(JSON.stringify({ explanation }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("explain-code error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
