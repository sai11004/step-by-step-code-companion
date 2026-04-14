import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const JUDGE0_URL = "https://ce.judge0.com";

const LANG_IDS: Record<string, number> = {
  python: 71,
  java: 62,
  cpp: 54,
  c: 50,          // C (GCC 9.2.0)
  javascript: 63,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, language, stdin } = await req.json();

    if (!code || !language) {
      return new Response(JSON.stringify({ error: "Missing code or language" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const langId = LANG_IDS[language];
    if (!langId) {
      return new Response(JSON.stringify({ error: `Unsupported language: ${language}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const submitRes = await fetch(`${JUDGE0_URL}/submissions?base64_encoded=false&wait=true`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source_code: code,
        language_id: langId,
        stdin: stdin || "",
        cpu_time_limit: 5,
        wall_time_limit: 10,
      }),
    });

    if (!submitRes.ok) {
      const text = await submitRes.text();
      console.error("Judge0 error:", submitRes.status, text);

      if (language === 'javascript') {
        return new Response(JSON.stringify({
          output: "",
          error: "Code execution service is busy. For JavaScript, use the Output tab's built-in runner.",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Code execution service unavailable. Please try again later." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await submitRes.json();
    const statusId = result.status?.id;

    if (statusId === 6) {
      return new Response(JSON.stringify({
        output: "",
        error: result.compile_output || "Compilation failed",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (statusId !== 3) {
      return new Response(JSON.stringify({
        output: result.stdout || "",
        error: result.stderr || result.status?.description || "Execution error",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      output: result.stdout || "",
      stderr: result.stderr || "",
      error: "",
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
