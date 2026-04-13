

# Code Visualizer & Compiler App — Implementation Plan

## Overview
Build a full-featured code compiler with step-by-step visualization, AI-powered explanations, and a polished dark-themed IDE experience. Monaco Editor on the left, visualization/output on the right, with three modes: **Visualize**, **Explain**, and **Output**.

---

## Phase 1: Core Layout & Editor Setup
- **Monaco Editor** integration with minimap, word wrap, adjustable font size (12–20px), and tab size settings
- **Language selector** displayed vertically on the left sidebar with icons for Python, JavaScript, Java, C++
- **Two-column split layout**: editor left, output/visualization right
- **Three tab switcher** at the top of the right panel: Visualize | Explain | Output
- **Dark theme** using the specified color system (#0d1117 background, #4d9eff blue, #f5a623 amber, etc.)
- **Settings toolbar** above editor for font size, tab size, word wrap toggle

## Phase 2: Output / Compiler Tab
- **Run button** that executes code and displays output
- For **JavaScript**: execute in a sandboxed Function/eval with captured console.log
- For **Python/Java/C++**: use an edge function that calls the **Piston API** (free code execution API supporting 70+ languages) — no native compilers needed
- Handle **compile-time and runtime errors** gracefully with clear error messages
- Show execution time

## Phase 3: Execution Engine (Step-by-Step Tracer)
- **JavaScript**: Client-side AST-based interpreter using `acorn` parser — walk the AST node by node, maintaining a simulated scope/memory, capturing state at each line
- **Python/Java/C++**: Client-side simulation engine that parses common patterns (variable assignments, loops, conditionals, function calls, array operations) and generates step traces
- Each step captures: line number, variables, arrays, call stack, loop state, changed variables, swap detection, comparison indices, condition results, and console output
- The tracer handles: for/while loops, if/else, function calls, recursion, array operations, variable assignments

## Phase 4: Visualization Renderer
- **Variable boxes**: colored cards (blue=normal, amber=changed, purple=pointer, green=done) with pop animation on change
- **Array visualization**: horizontal cells with index labels, blue for comparing, amber for swapping (with smooth CSS animation), green for sorted/done
- **Call stack**: stacked frames showing function name and parameters, purple highlight for active frame
- **Loop tracker**: dot indicators showing iteration progress (done vs remaining)
- **Condition badge**: green ✓ for true, red ✗ for false
- **Current line highlight** in editor synced with visualization step

## Phase 5: Controls & Auto-Visualization
- **Control bar**: Back, Step Forward, Play All, Reset buttons + speed selector (slow/normal/fast/ultra)
- **Progress bar** + step counter (e.g., "12 / 45")
- **Auto-visualization**: debounced (400ms) — as user types, visualization updates automatically
- **Line highlighting** in Monaco editor to show current executing line

## Phase 6: Explain Mode (AI-Powered)
- **Edge function** using Lovable AI (gemini-3-flash-preview) for streaming explanations
- When stepping through code in Explain mode, each step triggers a streamed AI explanation (2-3 sentences, plain English, referencing actual values)
- **Q&A chat panel** below the explanation — user can ask questions about the current step
- Chat maintains context of recent steps and conversation history
- Visualization renders FIRST, explanation streams in AFTER
- No time/space complexity, no jargon — friendly tutor tone

## Phase 7: Polish & Integration
- Smooth transitions between tabs
- Starter code templates for each language
- Responsive layout adjustments
- Error boundaries and loading states
- Language-appropriate icons and syntax highlighting

---

## Tech Stack
- **Monaco Editor** for the code editor
- **Acorn** for JavaScript AST parsing
- **Lovable AI** (edge function) for Explain mode
- **Piston API** (via edge function) for actual code execution (Output tab)
- **Framer Motion** for smooth visualization animations
- Dark theme with the exact color palette specified

