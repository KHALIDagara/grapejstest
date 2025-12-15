import { useState } from 'react';
import DOMPurify from 'dompurify';
import { AI_TOOLS } from '../utils/aiTools'; 

export function useAI(editor) {
  const [isThinking, setIsThinking] = useState(false);

  // --- HELPER: Context ---
  const getGlobalContext = () => {
    if (!editor) return "";
    const rawText = editor.Canvas.getBody().innerText.slice(0, 500).replace(/\n/g, ' ');
    return rawText ? `PAGE CONTEXT: "${rawText}..."` : "";
  };

  // --- HELPER: Execute Tool ---
  const executeTool = (toolName, args, selectedComponent) => {
    console.log(`🔧 [DEBUG] Executing Tool: ${toolName}`, args);
    switch (toolName) {
      case 'style_element':
        selectedComponent.addStyle(args.css);
        return "I've updated the styles for you."; 
      case 'update_inner_content':
        const cleanContent = DOMPurify.sanitize(args.html, { FORCE_BODY: true, ADD_ATTR: ['style', 'class'] });
        selectedComponent.components(cleanContent);
        return "I've updated the content.";
      case 'append_component':
        const cleanChild = DOMPurify.sanitize(args.component, { FORCE_BODY: true, ADD_ATTR: ['style', 'class'] });
        selectedComponent.append(cleanChild);
        return "I've added the new component.";
      default:
        return "I tried to run a command but couldn't understand it.";
    }
  };

  // --- MAIN FUNCTION ---
  const generateResponse = async (userText, history, selectedContext, onStreamUpdate, onComplete) => {
    console.log("🚀 [DEBUG] generateResponse STARTED");
    if (!userText.trim() || !editor) {
        console.warn("⚠️ [DEBUG] Missing userText or Editor");
        return;
    }
    
    setIsThinking(true);

    const selectedComponent = editor.getSelected();
    
    // Default system prompt
    let systemPrompt = "You are a helpful AI web builder assistant.";
    
    if (selectedComponent) {
        const tagName = selectedComponent.get('tagName');
        const currentHtml = selectedComponent.toHTML(); 
        systemPrompt = `
          You are an expert Web Builder.
          ${getGlobalContext()}
          CURRENT SELECTION: <${tagName}>
          HTML: \`\`\`${currentHtml}\`\`\`
          USER GOAL: "${userText}"
          INSTRUCTIONS: Use the provided tools to modify the component.
        `;
    }

    try {
      console.log("1. [DEBUG] Sending fetch request...");
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-exp:free', 
          messages: [{ role: 'system', content: systemPrompt }, ...history], 
          tools: AI_TOOLS,       
          tool_choice: "auto"    
        })
      });

      console.log("2. [DEBUG] Response Status:", response.status);

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("3. [DEBUG] Raw API Data:", data);

      // Validate structure
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
         console.error("❌ [DEBUG] Unexpected API Structure", data);
         throw new Error("Invalid API Response Structure");
      }

      const choice = data.choices[0];
      const message = choice.message;
      
      console.log("4. [DEBUG] AI Message Content:", message.content);
      console.log("5. [DEBUG] AI Tool Calls:", message.tool_calls);

      let finalUserMessage = "";

      // CASE 1: AI Used a Tool
      if (message.tool_calls && message.tool_calls.length > 0) {
        if (!selectedComponent) {
            finalUserMessage = "Please select an element on the canvas first so I can modify it.";
        } else {
            for (const toolCall of message.tool_calls) {
              const fnName = toolCall.function.name;
              let fnArgs = {};
              try {
                fnArgs = JSON.parse(toolCall.function.arguments);
              } catch (e) { console.error("JSON Parse Error", e); }
              
              finalUserMessage = executeTool(fnName, fnArgs, selectedComponent);
            }
        }
      } 
      // CASE 2: AI just talked
      else if (message.content) {
        finalUserMessage = message.content;
      } else {
        console.warn("⚠️ [DEBUG] No content and No tool calls found.");
        finalUserMessage = "Done (No output).";
      }

      console.log("6. [DEBUG] Final Message to UI:", finalUserMessage);

      // Trigger UI updates
      if (onStreamUpdate) {
          console.log("7. [DEBUG] Calling onStreamUpdate");
          onStreamUpdate(finalUserMessage);
      } else {
          console.warn("⚠️ [DEBUG] onStreamUpdate is MISSING or undefined");
      }

      if (onComplete) {
          console.log("8. [DEBUG] Calling onComplete");
          onComplete(finalUserMessage);
      }

    } catch (error) {
      console.error("❌ [DEBUG] CATCH BLOCK:", error);
      const errorMsg = "Sorry, something went wrong.";
      if (onStreamUpdate) onStreamUpdate(errorMsg);
      if (onComplete) onComplete(errorMsg);
    } finally {
      setIsThinking(false);
    }
  };

  return { isThinking, generateResponse };
}
