import { Controller } from "@hotwired/stimulus"

// Flash Controller
// Auto-dismisses flash messages after timeout
export default class extends Controller {
  static values = {
    timeout: { type: Number, default: 3000 }
  }

  connect() {
    setTimeout(() => {
      this.dismiss()
    }, this.timeoutValue)
  }

  dismiss() {
    this.element.classList.add('opacity-0', 'transition-opacity', 'duration-300')
    setTimeout(() => {
      this.element.remove()
    }, 300)
  }
}
