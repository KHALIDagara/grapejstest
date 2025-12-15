import { useState } from 'react';
import DOMPurify from 'dompurify';

export function useAI(editor) { // Pass the GrapesJS editor instance
  const [isThinking, setIsThinking] = useState(false);

  // --- 1. CONTEXT GATHERER ---
  // Grabs the "Vibe" of the page without sending 5000 lines of code
  const getPageContext = () => {
    if (!editor) return "No context available.";
    
    // Get all text on the page to understand the "Topic" (Yoga, Coffee, Tech?)
    const pageText = editor.Canvas.getBody().innerText.slice(0, 1000); 
    
    // Get a structural map (Simple DOM tree)
    const wrapper = editor.getWrapper();
    const structure = wrapper.find('section').map(comp => comp.get('tagName') + (comp.getId() ? `#${comp.getId()}` : '')).join(' > ');

    return `Page Topic: ${pageText.replace(/\n/g, ' ')}\nPage Structure: ${structure}`;
  };

  // --- 2. EXECUTION ENGINE ---
  // Applies the JSON instructions deterministically
  const executeCommand = (command, selectedComponent) => {
    console.log("AI Command:", command);

    switch (command.action) {
      case 'STYLE':
        // Strict Mode: Apply styles directly to the component model
        // This guarantees NO HTML wrappers are added
        selectedComponent.addStyle(command.payload);
        break;

      case 'UPDATE_CONTENT':
        // Updates the INNER content (e.g., changing text inside a div)
        // Keeps the parent wrapper intact
        const cleanHtml = DOMPurify.sanitize(command.payload, { FORCE_BODY: true });
        selectedComponent.components(cleanHtml); 
        break;

      case 'INSERT':
        // Appends a new component inside the selected one
        const cleanComponent = DOMPurify.sanitize(command.payload, { FORCE_BODY: true });
        selectedComponent.append(cleanComponent);
        break;
        
      default:
        console.warn("Unknown AI Action");
    }
  };

  const generateResponse = async (userText, history, selectedContext, pageTheme, onComplete) => {
    if (!userText.trim()) return;
    setIsThinking(true);

    // Get the selected component from GrapesJS directly if possible
    const selectedComponent = editor.getSelected();
    
    if (!selectedComponent) {
      setIsThinking(false);
      return;
    }

    // Calculate DOM Path (e.g. Body > Section > Div > Button)
    let domPath = [];
    let curr = selectedComponent;
    while(curr && curr !== editor.getWrapper()) {
        domPath.unshift(curr.get('tagName'));
        curr = curr.parent();
    }
    const pathString = domPath.join(' > ');

    // --- 3. THE SMART PROMPT ---
    const systemPrompt = `
      ROLE: You are a JSON-based Web Builder Engine.
      
      GLOBAL PAGE CONTEXT:
      "${getPageContext()}"

      CURRENT SELECTION:
      - Type: <${selectedContext.tagName}>
      - Location in Page: ${pathString}
      - Current HTML Content: 
        \`\`\`html
        ${selectedContext.currentHTML}
        \`\`\`

      USER INSTRUCTION: "${userText}"

      LOGIC RULES:
      1. If the user wants to change colors, fonts, spacing, or alignment -> Use action "STYLE".
      2. If the user wants to change the text or replace inner elements -> Use action "UPDATE_CONTENT".
      3. If the user wants to add a NEW element inside this one -> Use action "INSERT".

      RESPONSE FORMAT (STRICT JSON ONLY):
      
      If Action is STYLE:
      {
        "action": "STYLE",
        "payload": { "background-color": "#ff0000", "border-radius": "10px", ... }
      }

      If Action is UPDATE_CONTENT (Refining what is inside):
      {
        "action": "UPDATE_CONTENT",
        "payload": "<h2 style='...'>New Title</h2><p>New text</p>" 
      }
      (NOTE: Do NOT include the root tag <${selectedContext.tagName}> in the payload, only what goes INSIDE it.)

      If Action is INSERT (Adding new child):
      {
        "action": "INSERT",
        "payload": "<button style='...'>Click Me</button>"
      }

      CRITICAL: return ONLY valid JSON. No markdown. No text.
    `;

    try {
      // (Using non-streaming request for JSON reliability)
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-exp:free', // Flash models are great for JSON
          messages: [
              { role: 'system', content: systemPrompt }
              // (History is less relevant for "Commands", but you can add it if needed)
          ]
        })
      });

      const data = await response.json(); // Assuming your API returns the full JSON object now
      
      // Parse the AI's "Thought"
      let aiCommand;
      try {
          // Sometimes LLMs wrap JSON in ```json blocks
          const rawJson = data.content.replace(/```json/g, '').replace(/```/g, '').trim();
          aiCommand = JSON.parse(rawJson);
      } catch (e) {
          console.error("AI returned invalid JSON", data.content);
          return;
      }

      // Execute the deterministic action
      executeCommand(aiCommand, selectedComponent);
      
      setIsThinking(false);
      if (onComplete) onComplete("Done"); // Notify UI

    } catch (error) {
      console.error(error);
      setIsThinking(false);
    }
  };

  return { isThinking, generateResponse };
}
