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

      case 'insert_sibling_before': {
        const parent = selectedComponent.parent();
        if (!parent) return "Error: Cannot insert before root element.";
        const index = parent.components().indexOf(selectedComponent);
        const cleanSibling = DOMPurify.sanitize(args.component, { FORCE_BODY: true, ADD_ATTR: ['style', 'class'] });
        parent.append(cleanSibling, { at: index });
        return "Component inserted before.";
      }

      case 'insert_sibling_after': {
        const parent = selectedComponent.parent();
        if (!parent) return "Error: Cannot insert after root element.";
        const index = parent.components().indexOf(selectedComponent);
        const cleanSibling = DOMPurify.sanitize(args.component, { FORCE_BODY: true, ADD_ATTR: ['style', 'class'] });
        parent.append(cleanSibling, { at: index + 1 });
        return "Component inserted after.";
      }

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
      ROLE: You are an AI assistant controlling a GrapesJS visual web editor. You can modify the page by calling tools.

      PAGE STRUCTURE:
      \`\`\`html
      ${getPageContext(editor)}
      \`\`\`

      CURRENT SELECTION: ${isWrapper ? "ENTIRE PAGE (body wrapper)" : `<${selectedModel.get('tagName')}> element`}
      ${!isWrapper ? `SELECTION HTML:\n\`\`\`html\n${selectedModel.toHTML()}\n\`\`\`` : ""}

      USER REQUEST: "${userText}"

      ---
      TOOL SELECTION RULES (FOLLOW STRICTLY):

      1.  **To ADD a new element** (image, button, section, etc.) -> Use \`append_component\`.
          - This inserts a NEW child element at the END of the selected element.
          - Provide the full HTML for the new component (e.g., \`<img src="..." />\`).

      2.  **To CHANGE existing text or inner structure** -> Use \`update_inner_content\`.
          - This REPLACES the innerHTML of the selected element.
          - Use ONLY for text changes or restructuring *inside* the element.

      3.  **To STYLE the selected element** (colors, fonts, spacing, borders) -> Use \`style_element\`.
          - Provide a JSON object of CSS properties.

      4.  **To DELETE the selected element** -> Use \`delete_component\`.

      5.  **To GENERATE a WHOLE NEW PAGE** (only if user asks for "landing page", "website") -> Use \`generate_whole_page\`.

      ---
      EXAMPLES:
      - User: "add an image" -> Call \`append_component\` with \`{ "component": "<img src='https://placehold.co/600x400' alt='Placeholder' style='max-width: 100%; border-radius: 8px;' />" }\`
      - User: "make this button red" -> Call \`style_element\` with \`{ "css": {"background-color": "red"} }\`
      - User: "change the title to Welcome" -> Call \`update_inner_content\` with \`{ "html": "Welcome" }\`
      - User: "delete this section" -> Call \`delete_component\`.
      - User: "add a header before this" -> Call \`insert_sibling_before\` with \`{ "component": "<h1>Header</h1>" }\`.
      - User: "add a footer after this" -> Call \`insert_sibling_after\` with \`{ "component": "<footer>Footer content</footer>" }\`.

      IMPORTANT:
      - Call ONLY ONE tool per response.
      - Use \`insert_sibling_before\`/\`insert_sibling_after\` when adding elements AS SIBLINGS (before/after), use \`append_component\` when adding elements AS CHILDREN (inside).
      - Use modern CSS (flexbox, grid, good spacing, rounded corners).
      - For images, use placeholder URLs like https://placehold.co/600x400 unless the user specifies a URL.
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

      console.log(`📥 [Client] Response Status: ${response.status} ${response.statusText}`);

      const data = await response.json();
      console.log("📥 [Client] Response Data:", JSON.stringify({
        id: data.id,
        model: data.model,
        usage: data.usage,
        choicesCount: data.choices?.length,
        finishReason: data.choices?.[0]?.finish_reason,
        hasToolCalls: !!data.choices?.[0]?.message?.tool_calls,
        hasContent: !!data.choices?.[0]?.message?.content
      }, null, 2));

      const choice = data.choices[0];
      const message = choice.message;

      let finalUserMessage = "";

      if (message.tool_calls && message.tool_calls.length > 0) {
        console.log(`🔧 [Client] Processing ${message.tool_calls.length} tool call(s)`);
        for (const toolCall of message.tool_calls) {
          const fnName = toolCall.function.name;
          let fnArgs = {};
          try { fnArgs = JSON.parse(toolCall.function.arguments); } catch (e) {
            console.error("❌ [Client] Failed to parse tool arguments:", toolCall.function.arguments);
          }

          // Pass 'editor' to executeTool for page-level ops
          const result = executeTool(fnName, fnArgs, selectedModel, editor);
          console.log(`✅ [Client] Tool '${fnName}' result: ${result}`);
          finalUserMessage += result + " ";
        }
      }
      else if (message.content) {
        console.log("💬 [Client] LLM returned text content (no tool call)");
        finalUserMessage = message.content;
      } else {
        console.log("⚠️ [Client] LLM returned empty response");
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
