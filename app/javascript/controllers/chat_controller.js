import { Controller } from "@hotwired/stimulus"

// Chat Controller
// Manages AI chat functionality and tool execution
export default class extends Controller {
  static values = {
    url: String
  }

  static targets = ["messages", "input", "context"]

  connect() {
    this.selectedContext = null
    this.theme = {}

    // Listen for selection changes from editor
    this.element.addEventListener('selection:changed', this.handleSelectionChange.bind(this))
    this.element.addEventListener('theme:changed', this.handleThemeChange.bind(this))
  }

  handleSelectionChange(event) {
    this.selectedContext = event.detail.context
    this.updateContextDisplay()
  }

  handleThemeChange(event) {
    this.theme = event.detail.theme || {}
  }

  updateContextDisplay() {
    if (!this.hasContextTarget) return

    if (this.selectedContext) {
      const { tagName, id, classes } = this.selectedContext
      let display = `Selected: <${tagName}>`
      if (id) display += `#${id}`
      if (classes) display += `.${classes.split(' ').join('.')}`
      this.contextTarget.textContent = display
      this.contextTarget.classList.remove('text-slate-500')
      this.contextTarget.classList.add('text-blue-400')
    } else {
      this.contextTarget.textContent = 'No element selected'
      this.contextTarget.classList.remove('text-blue-400')
      this.contextTarget.classList.add('text-slate-500')
    }
  }

  handleKeydown(event) {
    // Send on Enter (without Shift)
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      this.send()
    }
  }

  async send() {
    const message = this.inputTarget.value.trim()
    if (!message) return

    // Clear input
    this.inputTarget.value = ''

    // Add user message to UI
    this.addMessage('user', message)

    // Get editor context
    const editor = window.grapesEditor
    const domTree = editor ? this.getDomTree(editor) : null

    // Send to server
    try {
      const response = await this.sendMessage(message, domTree)

      if (response.error) {
        this.addMessage('assistant', `Error: ${response.error}`)
        return
      }

      // Add assistant response
      if (response.message) {
        this.addMessage('assistant', response.message)
      }

      // Execute tool calls
      if (response.tool_calls && response.tool_calls.length > 0) {
        this.executeToolCalls(response.tool_calls)
      }
    } catch (error) {
      console.error('Chat error:', error)
      this.addMessage('assistant', 'Sorry, there was an error processing your request.')
    }
  }

  async sendMessage(message, domTree) {
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content

    const response = await fetch(this.urlValue, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        message,
        selected_element: this.selectedContext,
        dom_tree: domTree,
        theme: this.theme
      }),
      credentials: 'same-origin'
    })

    return response.json()
  }

  addMessage(role, content) {
    if (!this.hasMessagesTarget) return

    const messageDiv = document.createElement('div')
    messageDiv.className = `chat-message ${role}`
    messageDiv.textContent = content
    this.messagesTarget.appendChild(messageDiv)

    // Scroll to bottom
    this.messagesTarget.scrollTop = this.messagesTarget.scrollHeight
  }

  executeToolCalls(toolCalls) {
    const editor = window.grapesEditor
    if (!editor) return

    // Get the editor controller to execute tool calls
    const editorController = this.application.getControllerForElementAndIdentifier(
      this.element,
      'editor'
    )

    toolCalls.forEach(toolCall => {
      console.log('Executing tool:', toolCall.name, toolCall.arguments)

      if (editorController) {
        editorController.executeToolCall(toolCall)
      } else {
        // Fallback: execute directly
        this.executeToolCallDirect(editor, toolCall)
      }
    })
  }

  executeToolCallDirect(editor, toolCall) {
    const { name, arguments: args } = toolCall
    const selected = editor.getSelected()

    switch (name) {
      case 'style_element':
        if (selected && args.styles) {
          selected.addStyle(args.styles)
        }
        break

      case 'update_inner_content':
        if (selected && args.html) {
          selected.components(args.html)
        }
        break

      case 'append_component':
        if (selected && args.html) {
          selected.append(args.html)
        }
        break

      case 'generate_whole_page':
        if (args.html) {
          editor.setComponents(args.html)
          if (args.css) {
            editor.setStyle(args.css)
          }
        }
        break

      case 'delete_component':
        if (selected) {
          selected.remove()
        }
        break

      case 'add_class':
        if (selected && args.className) {
          selected.addClass(args.className)
        }
        break

      case 'insert_sibling_before':
        if (selected && args.html) {
          const parent = selected.parent()
          const index = parent.components().indexOf(selected)
          parent.components().add(args.html, { at: index })
        }
        break

      case 'insert_sibling_after':
        if (selected && args.html) {
          const parent = selected.parent()
          const index = parent.components().indexOf(selected)
          parent.components().add(args.html, { at: index + 1 })
        }
        break
    }
  }

  getDomTree(editor, depth = 3) {
    const wrapper = editor.getWrapper()
    return this.buildTree(wrapper, depth)
  }

  buildTree(component, depth, indent = 0) {
    if (depth <= 0) return ''

    const tag = component.get('tagName') || 'div'
    const classes = component.getClasses().join('.')
    const id = component.getId()
    const prefix = '  '.repeat(indent)
    let line = `${prefix}<${tag}`
    if (id) line += `#${id}`
    if (classes) line += `.${classes}`
    line += '>'

    const children = component.components()
    if (children.length > 0 && depth > 1) {
      line += '\n'
      children.forEach(child => {
        line += this.buildTree(child, depth - 1, indent + 1)
      })
      line += `${prefix}</${tag}>\n`
    } else {
      line += `</${tag}>\n`
    }

    return line
  }
}
