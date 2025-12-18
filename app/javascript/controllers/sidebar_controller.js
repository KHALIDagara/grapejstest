import { Controller } from "@hotwired/stimulus"

// Sidebar Controller
// Manages tab switching in the sidebar panel
export default class extends Controller {
  static targets = ["tabContent"]

  connect() {
    // Listen for show events from editor
    this.element.addEventListener('sidebar:show', this.handleShowEvent.bind(this))
  }

  switchTab(event) {
    const tabName = event.currentTarget.dataset.tab
    this.activateTab(tabName)
  }

  activateTab(tabName) {
    // Update tab buttons
    const buttons = this.element.querySelectorAll('.sidebar-tab')
    buttons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName)
    })

    // Update tab content
    const contents = this.element.querySelectorAll('.tab-content')
    contents.forEach(content => {
      content.classList.toggle('active', content.id === `tab-${tabName}`)
    })
  }

  handleShowEvent(event) {
    const { tab } = event.detail
    if (tab) {
      this.activateTab(tab)
    }
  }
}
