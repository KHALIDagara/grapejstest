class AiController < ApplicationController
  before_action :authenticate_user!
  before_action :set_page

  # POST /pages/:page_id/ai/chat
  def chat
    # Build context from page attributes and selected element
    context = build_context

    # Add user message to history
    user_message = params[:message]
    messages = build_messages(context, user_message)

    # Call OpenRouter API
    response = call_openrouter(messages)

    if response[:error]
      render json: { error: response[:error] }, status: :unprocessable_entity
    else
      # Store the conversation in the page messages
      store_message(user_message, response[:assistant_message], response[:tool_calls])

      render json: {
        message: response[:assistant_message],
        tool_calls: response[:tool_calls]
      }
    end
  end

  private

  def set_page
    @page = current_user.pages.find(params[:page_id])
  rescue ActiveRecord::RecordNotFound
    render json: { error: "Page not found" }, status: :not_found
  end

  def build_context
    {
      page: @page.attributes_for_context,
      selected_element: params[:selected_element],
      dom_tree: params[:dom_tree]
    }
  end

  def build_messages(context, user_message)
    system_prompt = build_system_prompt(context)

    messages = [{ role: "system", content: system_prompt }]

    # Add conversation history (last 10 messages)
    history = @page.messages.last(10)
    history.each do |msg|
      messages << { role: msg["role"], content: msg["content"] } if msg["role"].in?(%w[user assistant])
    end

    # Add current user message
    messages << { role: "user", content: user_message }

    messages
  end

  def build_system_prompt(context)
    <<~PROMPT
      You are an AI assistant helping users build web pages using GrapesJS editor.
      You help modify and create page content through tool calls.

      ## Current Page Context
      - Page ID: #{context[:page][:id]}
      - Page Name: #{context[:page][:name]}
      - Theme: #{context[:page][:theme].to_json}
      - Has existing content: #{context[:page][:has_content]}

      #{selected_element_context(context[:selected_element])}

      #{dom_tree_context(context[:dom_tree])}

      ## Available Tools
      You MUST use tool calls to make changes. Never output raw HTML in your response.

      1. `style_element` - Apply CSS styles to the selected component
         - styles: Object with CSS properties (camelCase)
         - recursive: Boolean, apply to all children too

      2. `update_inner_content` - Replace the innerHTML of selected component
         - html: The new HTML content (sanitized)

      3. `append_component` - Add a new child component to selection
         - html: HTML of the new component

      4. `generate_whole_page` - Replace entire page content
         - html: Full page HTML
         - css: Associated CSS

      5. `delete_component` - Remove the selected component

      6. `add_class` - Add a CSS class to selected component
         - className: The class name to add

      7. `insert_sibling_before` / `insert_sibling_after` - Add sibling elements
         - html: HTML of the sibling component

      ## Theme Guidelines
      When creating or styling elements, use these theme values for consistency:
      - Primary Color: #{context[:page][:theme]["primaryColor"]}
      - Secondary Color: #{context[:page][:theme]["secondaryColor"]}
      - Font Family: #{context[:page][:theme]["fontFamily"]}
      - Border Radius: #{context[:page][:theme]["borderRadius"]}

      ## Rules
      - Always use the theme colors and fonts for new elements
      - Be concise in responses
      - One tool call per action
      - Explain briefly what you're doing
    PROMPT
  end

  def selected_element_context(element)
    return "" unless element.present?

    <<~CONTEXT
      ## Currently Selected Element
      - Tag: #{element["tagName"]}
      - ID: #{element["id"]}
      - Classes: #{element["classes"]}
      - HTML Preview: #{element["html"]&.truncate(500)}
    CONTEXT
  end

  def dom_tree_context(tree)
    return "" unless tree.present?

    <<~CONTEXT
      ## Page DOM Structure (3 levels)
      ```
      #{tree}
      ```
    CONTEXT
  end

  def call_openrouter(messages)
    api_key = ENV["OPENROUTER_API_KEY"]
    model = ENV.fetch("AI_MODEL", "google/gemini-2.0-flash-exp:free")

    unless api_key.present?
      return { error: "OpenRouter API key not configured" }
    end

    conn = Faraday.new(url: "https://openrouter.ai") do |f|
      f.request :json
      f.response :json
      f.adapter Faraday.default_adapter
    end

    response = conn.post("/api/v1/chat/completions") do |req|
      req.headers["Authorization"] = "Bearer #{api_key}"
      req.headers["Content-Type"] = "application/json"
      req.headers["HTTP-Referer"] = ENV.fetch("SITE_URL", "http://localhost:3000")
      req.body = {
        model: model,
        messages: messages,
        tools: ai_tools,
        tool_choice: "auto"
      }
    end

    if response.success?
      body = response.body
      choice = body.dig("choices", 0, "message")

      {
        assistant_message: choice["content"],
        tool_calls: choice["tool_calls"]&.map do |tc|
          {
            id: tc["id"],
            name: tc.dig("function", "name"),
            arguments: JSON.parse(tc.dig("function", "arguments") || "{}")
          }
        end
      }
    else
      { error: "API request failed: #{response.status}" }
    end
  rescue Faraday::Error => e
    { error: "Network error: #{e.message}" }
  rescue JSON::ParserError => e
    { error: "Invalid response: #{e.message}" }
  end

  def store_message(user_message, assistant_message, tool_calls)
    messages = @page.messages || []

    messages << { role: "user", content: user_message, timestamp: Time.current.iso8601 }

    if assistant_message.present? || tool_calls.present?
      messages << {
        role: "assistant",
        content: assistant_message,
        tool_calls: tool_calls,
        timestamp: Time.current.iso8601
      }
    end

    @page.update(messages: messages)
  end

  def ai_tools
    [
      {
        type: "function",
        function: {
          name: "style_element",
          description: "Apply CSS styles to the currently selected component",
          parameters: {
            type: "object",
            properties: {
              styles: {
                type: "object",
                description: "CSS properties in camelCase (e.g., backgroundColor, fontSize)"
              },
              recursive: {
                type: "boolean",
                description: "Apply styles to all child elements too"
              }
            },
            required: ["styles"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "update_inner_content",
          description: "Replace the innerHTML of the selected component",
          parameters: {
            type: "object",
            properties: {
              html: {
                type: "string",
                description: "The new HTML content"
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
          description: "Add a new child component to the selected element",
          parameters: {
            type: "object",
            properties: {
              html: {
                type: "string",
                description: "HTML of the new component to add"
              }
            },
            required: ["html"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "generate_whole_page",
          description: "Replace the entire page content with new HTML",
          parameters: {
            type: "object",
            properties: {
              html: {
                type: "string",
                description: "Full page HTML content"
              },
              css: {
                type: "string",
                description: "Associated CSS styles"
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
          description: "Remove the currently selected component",
          parameters: {
            type: "object",
            properties: {}
          }
        }
      },
      {
        type: "function",
        function: {
          name: "add_class",
          description: "Add a CSS class to the selected component",
          parameters: {
            type: "object",
            properties: {
              className: {
                type: "string",
                description: "The CSS class name to add"
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
          description: "Insert a new component before the selected element",
          parameters: {
            type: "object",
            properties: {
              html: {
                type: "string",
                description: "HTML of the sibling component"
              }
            },
            required: ["html"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "insert_sibling_after",
          description: "Insert a new component after the selected element",
          parameters: {
            type: "object",
            properties: {
              html: {
                type: "string",
                description: "HTML of the sibling component"
              }
            },
            required: ["html"]
          }
        }
      }
    ]
  end
end
