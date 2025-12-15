import { useState } from 'react';
import DOMPurify from 'dompurify';
import { AI_TOOLS } from '../utils/aiTools';

export function useAI() {
  const [isThinking, setIsThinking] = useState(false);

  // --- HELPER: recursive DOM tree for context ---
  const getSimplifiedDomTree = (component, depth = 0) => {
    if (!component || depth > 3) return ""; // Limit depth to avoid token overflow

    const tagName = component.get('tagName') || 'div';
    const classes = component.getClasses().join(' ');
    const id = component.getId();
    const type = component.get('type') || '';

    let info = `<${tagName}`;
    if (id) info += ` id="${id}"`;
    if (classes) info += ` class="${classes}"`;
    if (type && type !== 'default') info += ` type="${type}"`;
    info += `>`;

    // Don't recurse for text nodes, just show content preview
    if (component.is('text')) {
      const text = component.get('content') || "";
      info += text.substring(0, 50) + (text.length > 50 ? "..." : "");
    } else {
      const children = component.get('components');
      if (children && children.length > 0) {
        children.forEach(child => {
          info += getSimplifiedDomTree(child, depth + 1);
        });
      }
    }

    info += `</${tagName}>`;
    return info;
  };

  const getPageContext = (editor) => {
    if (!editor) return "";
    const wrapper = editor.getWrapper();
    return getSimplifiedDomTree(wrapper);
  }

  // --- HELPER: Execute Tool ---
  const executeTool = (toolName, args, selectedComponent, editor) => {
    console.log(`🔧 [DEBUG] Executing Tool: ${toolName}`, args);

    // Safety check for tools that require a selection
    if (!selectedComponent && toolName !== 'generate_whole_page') {
      return "Error: No component selected for this operation.";
    }

    switch (toolName) {
      case 'style_element':
        selectedComponent.addStyle(args.css);
        return "Styles updated.";

      case 'update_inner_content':
        const cleanContent = DOMPurify.sanitize(args.html, { FORCE_BODY: true, ADD_ATTR: ['style', 'class'] });
        selectedComponent.components(cleanContent);
        return "Content updated.";

      case 'append_component':
        const cleanChild = DOMPurify.sanitize(args.component, { FORCE_BODY: true, ADD_ATTR: ['style', 'class'] });
        selectedComponent.append(cleanChild);
        return "Component appended.";

      case 'generate_whole_page':
        if (!editor) return "Error: Editor not found.";
        const cleanPage = DOMPurify.sanitize(args.html, { FORCE_BODY: true, ADD_ATTR: ['style', 'class'] });
        editor.setComponents(cleanPage); // Replaces everything in the wrapper
        return "Page generated successfully.";

      case 'delete_component':
        if (selectedComponent === editor.getWrapper()) return "Error: Cannot delete the page wrapper.";
        selectedComponent.remove();
        return "Component deleted.";

      case 'add_class':
        selectedComponent.addClass(args.className);
        return `Class '${args.className}' added.`;

      default:
        return "Unknown command.";
    }
  };

  // --- MAIN FUNCTION ---
  const generateResponse = async (editor, userText, history, selectedContext, onStreamUpdate, onComplete) => {
    console.log("🚀 [DEBUG] generateResponse STARTED");

    if (!userText.trim() || !editor) {
      if (onStreamUpdate) onStreamUpdate("Error: Editor not ready.");
      return;
    }

    setIsThinking(true);

    // 1. Determine Target: Selection OR Wrapper (Body)
    // If selectedContext is passed (from React state), use that to find the component
    // But better to ask the editor directly for the *live* selected model
    const selectedModel = editor.getSelected() || editor.getWrapper();
    const isWrapper = selectedModel === editor.getWrapper();

    let systemPrompt = `
      You are an expert Web Designer & Developer using GrapesJS.
      
      PAGE CONTEXT (Structure):
      \`\`\`html
      ${getPageContext(editor)}
      \`\`\`

      CURRENT TARGET: ${isWrapper ? "ENTIRE PAGE (Wrapper)" : `<${selectedModel.get('tagName')}>`}
      ${!isWrapper ? `TARGET HTML: \`\`\`${selectedModel.toHTML()}\`\`\`` : ""}

      User Goal: "${userText}"

      GUIDELINES:
      1. If the user wants a full page (landing page, website), use 'generate_whole_page'.
      2. If modifying a specific element (button, box), use 'style_element' or 'update_inner_content'.
      3. Use 'append_component' to add new sections or elements.
      4. BE VISUAL. Use modern CSS (Flexbox, Grid, rounded corners, good spacing).
    `;

    try {
      const payload = {
        model: process.env.NEXT_PUBLIC_AI_MODEL || 'google/gemini-2.0-flash-exp:free',
        messages: [{ role: 'system', content: systemPrompt }, ...history],
        tools: AI_TOOLS,
        tool_choice: "auto"
      };

      console.log("📤 [Client] Sending Payload:", JSON.stringify({
        ...payload,
        messages: [
          ...payload.messages.slice(0, 1), // System prompt
          { role: '...', content: `(${payload.messages.length - 1} more messages)` }
        ]
      }, null, 2));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`❌ [Client] API Error ${response.status}:`, errText);
        throw new Error(`API Error: ${response.statusText} - ${errText}`);
      }

      const data = await response.json();
      const choice = data.choices[0];
      const message = choice.message;

      let finalUserMessage = "";

      if (message.tool_calls && message.tool_calls.length > 0) {
        for (const toolCall of message.tool_calls) {
          const fnName = toolCall.function.name;
          let fnArgs = {};
          try { fnArgs = JSON.parse(toolCall.function.arguments); } catch (e) { }

          // Pass 'editor' to executeTool for page-level ops
          const result = executeTool(fnName, fnArgs, selectedModel, editor);
          finalUserMessage += result + " ";
        }
      }
      else if (message.content) {
        finalUserMessage = message.content;
      } else {
        finalUserMessage = "Done.";
      }

      if (onStreamUpdate) onStreamUpdate(finalUserMessage);
      if (onComplete) onComplete(finalUserMessage);

    } catch (error) {
      console.error("❌ [DEBUG] AI Error:", error);
      if (onStreamUpdate) onStreamUpdate("Sorry, something went wrong.");
    } finally {
      setIsThinking(false);
    }
  };

  return { isThinking, generateResponse };
}
