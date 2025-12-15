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
    console.log(`🔧 AI Executing Tool: ${toolName}`, args);
    switch (toolName) {
      case 'style_element':
        selectedComponent.addStyle(args.css);
        return "I've updated the styles for you."; // Return a success message
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
  // We added 'onStreamUpdate' back so your UI updates!
  const generateResponse = async (userText, history, selectedContext, onStreamUpdate, onComplete) => {
    if (!userText.trim() || !editor) return;
    
    setIsThinking(true);

    const selectedComponent = editor.getSelected();
    
    // Default system prompt if nothing selected
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
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-exp:free', 
          messages: [{ role: 'system', content: systemPrompt }, ...history], // Pass history so it remembers "Hi"
          tools: AI_TOOLS,       
          tool_choice: "auto"    
        })
      });

      const data = await response.json();
      const choice = data.choices[0];
      const message = choice.message;

      let finalUserMessage = "";

      // CASE 1: AI Used a Tool
      if (message.tool_calls && message.tool_calls.length > 0) {
        if (!selectedComponent) {
            finalUserMessage = "Please select an element on the canvas first so I can modify it.";
        } else {
            // Execute the tool and get the success message
            for (const toolCall of message.tool_calls) {
              const fnName = toolCall.function.name;
              let fnArgs = {};
              try {
                fnArgs = JSON.parse(toolCall.function.arguments);
              } catch (e) { console.error(e); }
              
              // Run it
              finalUserMessage = executeTool(fnName, fnArgs, selectedComponent);
            }
        }
      } 
      // CASE 2: AI just talked (e.g. "Hi", "What can you do?")
      else if (message.content) {
        finalUserMessage = message.content;
      } else {
        finalUserMessage = "Done.";
      }

      // --- CRITICAL FIX FOR "NOTHING SHOWS" ---
      // We manually trigger the UI update callbacks
      if (onStreamUpdate) onStreamUpdate(finalUserMessage);
      if (onComplete) onComplete(finalUserMessage);

    } catch (error) {
      console.error("AI Error:", error);
      const errorMsg = "Sorry, something went wrong.";
      if (onStreamUpdate) onStreamUpdate(errorMsg);
      if (onComplete) onComplete(errorMsg);
    } finally {
      setIsThinking(false);
    }
  };

  return { isThinking, generateResponse };
}
