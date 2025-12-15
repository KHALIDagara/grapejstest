//utils/aiTools.js

export const AI_TOOLS = [
  {
    type: "function",
    function: {
      name: "style_element",
      description: "Apply CSS styles to the currently selected element. Use this for visual changes like 'make it red', 'add rounded corners', 'modernize', 'fix spacing'.",
      parameters: {
        type: "object",
        properties: {
          css: {
            type: "object",
            description: "A JSON object of CSS properties (e.g., {'border-radius': '10px', 'background-color': '#000'})",
            additionalProperties: { type: "string" } 
          }
        },
        required: ["css"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_inner_content",
      description: "Replace the text or inner HTML structure of the selected element. Use this to change text, add icons inside a button, or change the layout *inside* a container. NEVER use this to wrap the selected element itself.",
      parameters: {
        type: "object",
        properties: {
          html: {
            type: "string",
            description: "The new inner HTML string."
          }
        },
        required: ["html"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "append_component",
      description: "Insert a NEW component (like a button, image, or text) *inside* the selected element at the end.",
      parameters: {
        type: "object",
        properties: {
          component: {
            type: "string",
            description: "HTML string of the new component to add."
          }
        },
        required: ["component"]
      }
    }
  }
];
