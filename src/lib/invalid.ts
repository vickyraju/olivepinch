// Red-box style for a group of choices (tiles, calendar) left unanswered after the customer tried to continue.
// Input/Select/PhoneInput already style their own aria-invalid state.
export const INVALID_BOX =
  "aria-[invalid=true]:rounded-xl aria-[invalid=true]:bg-coral-50 aria-[invalid=true]:p-2 aria-[invalid=true]:ring-1 aria-[invalid=true]:ring-destructive"

// Once the red state has painted, bring the first unanswered field into view.
export function scrollToFirstInvalid() {
  setTimeout(() => {
    const first = document.querySelector<HTMLElement>('[aria-invalid="true"]')
    first?.scrollIntoView({ block: "center", behavior: "smooth" })
    first?.focus({ preventScroll: true })
  }, 50)
}
