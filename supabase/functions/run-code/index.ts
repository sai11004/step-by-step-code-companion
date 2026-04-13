import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PISTON_URL = "https://emkc.org/api/v2/piston/execute";

const LANG_CONFIG: Record<string, { language: string; version: string }> = {
  python: { language: "python", version: "3.10.0" },
  java: { language: "java", version: "15.0.2" },
  cpp: { language: "c++", version: "10.2.0" },
  javascript: { language: "javascript", version: "18.15.0" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, language } = await req.json();

    if (!code || !language) {
      return new Response(JSON.stringify({ error: "Missing code or language" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const config = LANG_CONFIG[language];
    if (!config) {
      return new Response(JSON.stringify({ error: `Unsupported language: ${language}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const filename = language === 'java' ? 'Main.java'
      : language === 'cpp' ? 'main.cpp'
      : language === 'python' ? 'main.py'
      : 'main.js';

    const response = await fetch(PISTON_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language: config.language,
        version: config.version,
        files: [{ name: filename, content: code }],
        compile_timeout: 10000,
        run_timeout: 10000,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Piston error:", response.status, text);
      return new Response(JSON.stringify({ error: "Code execution service unavailable. Please try again." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();

    // Check for compile errors
    if (result.compile && result.compile.code !== 0) {
      return new Response(JSON.stringify({
        output: "",
        error: result.compile.stderr || result.compile.output || "Compilation failed",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      output: result.run?.stdout || "",
      stderr: result.run?.stderr || "",
      error: result.run?.code !== 0 ? (result.run?.stderr || "Runtime error") : "",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("run-code error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
