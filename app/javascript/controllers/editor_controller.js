import { Controller } from "@hotwired/stimulus"

// GrapesJS Editor Controller
// Manages editor initialization, storage, and page switching
export default class extends Controller {
  static values = {
    pageId: Number,
    storeUrl: String,
    loadUrl: String,
    pages: Array
  }

  static targets = ["pagesList"]

  connect() {
    this.editor = null
    this.theme = {}
    this.selectedComponent = null

    // Wait for GrapesJS to be available
    this.initializeEditor()
  }

  disconnect() {
    if (this.editor) {
      this.editor.destroy()
    }
  }

  initializeEditor() {
    // Check if GrapesJS is loaded
    if (typeof grapesjs === 'undefined') {
      setTimeout(() => this.initializeEditor(), 100)
      return
    }

    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content

    this.editor = grapesjs.init({
      container: '#gjs',
      height: '100%',
      width: 'auto',
      fromElement: false,

      // Storage configuration - remote storage to Rails backend
      storageManager: {
        type: 'remote',
        autosave: true,
        autoload: true,
        stepsBeforeSave: 10,
        options: {
          remote: {
            urlStore: this.storeUrlValue,
            urlLoad: this.loadUrlValue,
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': csrfToken,
              'Accept': 'application/json'
            },
            fetchOptions: opts => ({
              ...opts,
              credentials: 'same-origin'
            }),
            // Transform data before storing
            onStore: (data, editor) => {
              // Get HTML/CSS for all pages
              const pagesHtml = editor.Pages.getAll().map(page => {
                const component = page.getMainComponent()
                return {
                  html: editor.getHtml({ component }),
                  css: editor.getCss({ component })
                }
              })
              return { ...data, pagesHtml }
            }
          }
        }
      },

      // Plugins
      plugins: ['gjs-blocks-basic'],
      pluginsOpts: {
        'gjs-blocks-basic': {}
      },

      // Canvas styling
      canvas: {
        styles: [
          'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
        ]
      },

      // Panel configuration
      panels: {
        defaults: []
      },

      // Block manager categories
      blockManager: {
        appendTo: '.gjs-blocks-cs'
      },

      // Style manager
      styleManager: {
        appendTo: '.gjs-styles-cs'
      }
    })

    // Add custom panels/buttons
    this.setupPanels()

    // Setup event listeners
    this.setupEventListeners()

    // Store reference globally for chat controller
    window.grapesEditor = this.editor
  }

  setupPanels() {
    // Add save button to options panel
    this.editor.Panels.addButton('options', {
      id: 'save-page',
      className: 'fa fa-save',
      label: 'Save',
      command: 'store-data',
      active: false
    })

    // Add AI chat toggle button
    this.editor.Panels.addButton('options', {
      id: 'ai-chat',
      className: 'fa fa-comments',
      label: 'AI',
      command: {
        run: () => this.dispatch('sidebar:show', { detail: { tab: 'chat' } }),
        stop: () => {}
      },
      active: false
    })

    // Add theme settings button
    this.editor.Panels.addButton('options', {
      id: 'theme-settings',
      className: 'fa fa-palette',
      label: 'Theme',
      command: {
        run: () => this.dispatch('sidebar:show', { detail: { tab: 'theme' } }),
        stop: () => {}
      },
      active: false
    })
  }

  setupEventListeners() {
    // Component selection - update AI context
    this.editor.on('component:selected', component => {
      this.selectedComponent = component
      this.updateSelectionContext(component)
    })

    this.editor.on('component:deselected', () => {
      this.selectedComponent = null
      this.updateSelectionContext(null)
    })

    // Storage events
    this.editor.on('storage:store', () => {
      console.log('Project saved')
    })

    this.editor.on('storage:error', (err) => {
      console.error('Storage error:', err)
    })

    // Page events
    this.editor.on('page:select', page => {
      console.log('Page selected:', page.id)
    })
  }

  updateSelectionContext(component) {
    // Dispatch event for chat controller
    const context = component ? {
      tagName: component.get('tagName'),
      id: component.getId(),
      classes: component.getClasses().join(' '),
      html: component.toHTML().substring(0, 500)
    } : null

    this.dispatch('selection:changed', { detail: { context } })
  }

  // Get simplified DOM tree for AI context
  getDomTree(depth = 3) {
    const wrapper = this.editor.getWrapper()
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

  // Create new page
  createPage(event) {
    event.preventDefault()
    const name = prompt('Enter page name:', 'New Page')
    if (!name) return

    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content

    fetch('/pages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
        'Accept': 'application/json'
      },
      body: JSON.stringify({ page: { name } }),
      credentials: 'same-origin'
    })
    .then(response => response.json())
    .then(data => {
      // Navigate to new page
      window.location.href = `/pages/${data.id}`
    })
    .catch(err => console.error('Error creating page:', err))
  }

  // Select existing page
  selectPage(event) {
    const pageId = event.currentTarget.dataset.pageId
    if (pageId) {
      window.location.href = `/pages/${pageId}`
    }
  }

  // Delete page
  deletePage(event) {
    event.stopPropagation()
    const pageId = event.currentTarget.dataset.pageId
    if (!pageId || !confirm('Delete this page?')) return

    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content

    fetch(`/pages/${pageId}`, {
      method: 'DELETE',
      headers: {
        'X-CSRF-Token': csrfToken,
        'Accept': 'application/json'
      },
      credentials: 'same-origin'
    })
    .then(() => {
      // Remove from list or reload
      event.currentTarget.closest('.page-item')?.remove()
    })
    .catch(err => console.error('Error deleting page:', err))
  }

  // Update theme
  updateTheme(event) {
    const key = event.currentTarget.dataset.themeKey
    const value = event.currentTarget.value
    this.theme[key] = value

    // Save theme to server
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content

    fetch(`/pages/${this.pageIdValue}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
        'Accept': 'application/json'
      },
      body: JSON.stringify({ page: { theme: this.theme } }),
      credentials: 'same-origin'
    })
    .catch(err => console.error('Error updating theme:', err))

    // Dispatch for AI context
    this.dispatch('theme:changed', { detail: { theme: this.theme } })
  }

  // Execute AI tool calls on the editor
  executeToolCall(toolCall) {
    if (!this.editor || !toolCall) return

    const { name, arguments: args } = toolCall
    const selected = this.editor.getSelected()

    switch (name) {
      case 'style_element':
        if (selected && args.styles) {
          selected.addStyle(args.styles)
          if (args.recursive) {
            this.applyStylesRecursively(selected, args.styles)
          }
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
          this.editor.setComponents(args.html)
          if (args.css) {
            this.editor.setStyle(args.css)
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

  applyStylesRecursively(component, styles) {
    component.components().forEach(child => {
      child.addStyle(styles)
      this.applyStylesRecursively(child, styles)
    })
  }
}
