import { useEffect } from "react"
import { useLocation, useNavigationType } from "react-router-dom"

// A single-page app keeps the browser's scroll position when the route changes, so clicking a footer
// link left the new page scrolled to wherever the old one was. This resets it on every link click.
function ScrollToTop() {
  const { pathname, hash } = useLocation()
  const navigationType = useNavigationType()

  useEffect(() => {
    // Linking to a section (e.g. /privacy-policy#cookies): jump to it. Also covers opening such a link
    // fresh, where the browser's own anchor jump runs before the page has rendered.
    if (hash) {
      const target = document.getElementById(decodeURIComponent(hash.slice(1)))
      if (target) {
        target.scrollIntoView()
        return
      }
    }
    // Back/forward: leave it to the browser, which restores where the visitor was.
    if (navigationType === "POP") return
    window.scrollTo(0, 0)
  }, [pathname, hash, navigationType])

  return null
}

export { ScrollToTop }
