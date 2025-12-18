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
          },
          recursive: {
            type: "boolean",
            description: "If true, applies the styles to the selected element AND ALL its descendants. Use this when the user says 'make EVERYTHING inside...' or 'change all fonts'."
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
      description: "Insert a NEW component (like a button, image, or text) *inside* the selected element at the very end of its children. IMPORTANT: Include 'data-gjs-name=\"My Component Name\"' in the HTML to give it a clear name in the Layer Manager.",
      parameters: {
        type: "object",
        properties: {
          component: {
            type: "string",
            description: "HTML string of the new component to add. Example: '<div data-gjs-name=\"Hero Section\">...</div>'"
          }
        },
        required: ["component"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "generate_whole_page",
      description: "Replaces the ENTIRE page content with new HTML. Use this ONLY when the user asks to 'generate a landing page', 'create a website', or completely clear and rebuild the page. IMPORTANT: Use 'data-gjs-name' on main sections.",
      parameters: {
        type: "object",
        properties: {
          html: {
            type: "string",
            description: "The complete HTML structure. Main sections should have naming like <section data-gjs-name=\"Testimonials\">..."
          }
        },
        required: ["html"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "delete_component",
      description: "Remove the currently selected component from the page.",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "add_class",
      description: "Add a CSS class to the selected component. Useful for applying utility classes or pre-defined styles.",
      parameters: {
        type: "object",
        properties: {
          className: {
            type: "string",
            description: "The name of the class to add."
          }
        },
        required: ["className"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "insert_sibling_before",
      description: "Insert a NEW component BEFORE the currently selected element (as a sibling). Use 'data-gjs-name' for semantic naming.",
      parameters: {
        type: "object",
        properties: {
          component: {
            type: "string",
            description: "HTML string of the new component. Example: '<div data-gjs-name=\"Feature\">...</div>'"
          }
        },
        required: ["component"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "insert_sibling_after",
      description: "Insert a NEW component AFTER the currently selected element (as a sibling). Use 'data-gjs-name' for semantic naming.",
      parameters: {
        type: "object",
        properties: {
          component: {
            type: "string",
            description: "HTML string of the new component. Example: '<div data-gjs-name=\"Contact Form\">...</div>'"
          }
        },
        required: ["component"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_image",
      description: "Search for a real image from Unsplash AND apply it to the selected element. This tool searches AND applies in one step - no need for a follow-up tool call.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search keywords describing the image (e.g., 'sunset beach', 'modern office', 'happy team')"
          },
          apply_as: {
            type: "string",
            enum: ["background", "img_append", "img_replace"],
            description: "How to apply the image: 'background' = set as CSS background-image on selected element, 'img_append' = append an <img> tag inside selected element, 'img_replace' = replace selected element's content with an <img> tag"
          },
          color: {
            type: "string",
            enum: ["black_and_white", "black", "white", "yellow", "orange", "red", "purple", "magenta", "green", "teal", "blue"],
            description: "Optional: Filter images by dominant color"
          },
          orientation: {
            type: "string",
            enum: ["landscape", "portrait", "squarish"],
            description: "Optional: Filter images by orientation. Use 'landscape' for wide/banner images, 'portrait' for tall images, 'squarish' for roughly square images."
          }
        },
        required: ["query", "apply_as"]
      }
    }
  }
];
