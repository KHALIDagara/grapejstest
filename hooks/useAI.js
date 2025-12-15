import { useState } from 'react';
import DOMPurify from 'dompurify';
import { AI_TOOLS } from '../utils/aiTools'; // Import the tools definition

export function useAI(editor) {
  const [isThinking, setIsThinking] = useState(false);

  // --- HELPER: Get Global Context (Yoga vs Coffee vs Tech) ---
  const getGlobalContext = () => {
    if (!editor) return "";
    // Grab the first 500 chars of text to give the AI a "vibe check"
    const rawText = editor.Canvas.getBody().innerText.slice(0, 500).replace(/\n/g, ' ');
    return rawText ? `PAGE CONTEXT (The user is building this): "${rawText}..."` : "";
  };

  // --- HELPER: Execute the Tool ---
  const executeTool = (toolName, args, selectedComponent) => {
    console.log(`🔧 AI Executing Tool: ${toolName}`, args);

    switch (toolName) {
      case 'style_element':
        // STRICT: Applies CSS directly to the model. 
        // Impossible for AI to break HTML structure here.
        selectedComponent.addStyle(args.css);
        break;

      case 'update_inner_content':
        // SAFE: Sanitize and replace ONLY inner content.
        // Prevents wrapper hallucination.
        const cleanContent = DOMPurify.sanitize(args.html, { 
          FORCE_BODY: true,
          ADD_ATTR: ['style', 'class'] 
        });
        selectedComponent.components(cleanContent);
        break;

      case 'append_component':
        // Append new child safely
        const cleanChild = DOMPurify.sanitize(args.component, { 
          FORCE_BODY: true,
          ADD_ATTR: ['style', 'class'] 
        });
        selectedComponent.append(cleanChild);
        break;

      default:
        console.warn("Unknown tool called:", toolName);
    }
  };

  const generateResponse = async (userText, onComplete) => {
    if (!userText.trim() || !editor) return;
    
    const selectedComponent = editor.getSelected();
    if (!selectedComponent) {
      alert("Please select an element first.");
      return;
    }

    setIsThinking(true);

    // 1. Construct the System Prompt
    const tagName = selectedComponent.get('tagName');
    const currentClasses = selectedComponent.getClasses().join(' ');
    const globalContext = getGlobalContext();
    
    // We send the Current HTML so the AI knows what it's editing, 
    // BUT we force it to use tools to change it.
    const currentHtml = selectedComponent.toHTML(); 

    const systemPrompt = `
      You are an expert Web Builder Assistant using GrapesJS.
      ${globalContext}
      
      CURRENT SELECTION:
      - Tag: <${tagName}>
      - Classes: ${currentClasses}
      - HTML: \`\`\`${currentHtml}\`\`\`
      
      USER GOAL: "${userText}"
      
      INSTRUCTIONS:
      1. Analyze the goal. 
      2. If visual (colors, spacing, layout), use 'style_element'.
      3. If content (text, inner structure), use 'update_inner_content'.
      4. If adding new items, use 'append_component'.
      5. DO NOT output raw markdown or text. CALL A FUNCTION.
    `;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-exp:free', // Use a smart model (Gemini 2.0, GPT-4o)
          messages: [{ role: 'system', content: systemPrompt }],
          tools: AI_TOOLS,       // <--- Send the strict rules
          tool_choice: "auto"    // Let AI decide which tool matches
        })
      });

      const data = await response.json();
      
      // 2. Parse the Response
      const choice = data.choices[0];
      const message = choice.message;

      // 3. Check for Tool Calls
      if (message.tool_calls && message.tool_calls.length > 0) {
        // The AI might return multiple steps (e.g., style AND update text)
        for (const toolCall of message.tool_calls) {
          const fnName = toolCall.function.name;
          let fnArgs = {};
          
          try {
            fnArgs = JSON.parse(toolCall.function.arguments);
          } catch (e) {
            console.error("Failed to parse AI arguments", e);
            continue;
          }

          // Execute on GrapesJS
          executeTool(fnName, fnArgs, selectedComponent);
        }
        
        if (onComplete) onComplete("Changes applied.");
      } else {
        // Fallback: AI just talked instead of acting
        console.warn("AI did not trigger a tool:", message.content);
        if (onComplete) onComplete(message.content); // Show text to user
      }

    } catch (error) {
      console.error("AI Integration Error:", error);
      if (onComplete) onComplete("Error: " + error.message);
    } finally {
      setIsThinking(false);
    }
  };

  return { isThinking, generateResponse };
}
