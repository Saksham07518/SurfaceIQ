import { useEffect } from 'react'

/**
 * SEOHelmet — updates document <head> per page.
 * Usage: <SEOHelmet title="Assets" description="..." />
 */
export default function SEOHelmet({ title, description, canonical }) {
  const fullTitle = title
    ? `${title} — SurfaceIQ`
    : 'SurfaceIQ — External Attack Surface Monitoring'

  const fullDesc = description ||
    'Monitor your external attack surface. Discover subdomains, analyse TLS certificates, and track vulnerabilities in real time.'

  useEffect(() => {
    document.title = fullTitle

    setMeta('name', 'description', fullDesc)
    setMeta('property', 'og:title', fullTitle)
    setMeta('property', 'og:description', fullDesc)

    if (canonical) {
      let link = document.querySelector('link[rel="canonical"]')
      if (!link) {
        link = document.createElement('link')
        link.rel = 'canonical'
        document.head.appendChild(link)
      }
      link.href = canonical
    }
  }, [fullTitle, fullDesc, canonical])

  return null
}

function setMeta(attrName, attrValue, content) {
  let el = document.querySelector(`meta[${attrName}="${attrValue}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attrName, attrValue)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}