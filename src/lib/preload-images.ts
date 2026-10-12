const requested = new Set<string>()

// Starts downloading images into the browser cache ahead of time, so dropdowns and previews that
// render them later (e.g. a menu picker that only mounts on open) show them instantly.
export function preloadImages(urls: (string | null | undefined)[]) {
  for (const url of urls) {
    if (!url || requested.has(url)) continue
    requested.add(url)
    const img = new Image()
    img.decoding = "async"
    img.src = url
  }
}
