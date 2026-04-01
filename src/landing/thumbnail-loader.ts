import type { Project } from "./projects-config";

/**
 * Try to load Speckle preview image for a project.
 * On success: show image, hide placeholder.
 * On failure: placeholder SVG stays visible.
 */
export function loadThumbnail(img: HTMLImageElement, ph: Element, project: Project): void {
  img.src = `${project.speckleBase}/preview/${project.id}`;
  img.onload = () => { img.classList.add("ok"); ph.classList.add("gone"); };
  img.onerror = () => { /* placeholder stays visible */ };
}

/**
 * Generate a unique isometric box SVG placeholder per project.
 * Color varies by project ID hash.
 */
export function mkPlaceholder(project: Project): string {
  const h = [...project.id].reduce((a, c) => a + c.charCodeAt(0), 0);
  const hues = [
    ["#EFF6FF", "#BFDBFE"],
    ["#F0FDF4", "#BBF7D0"],
    ["#F5F3FF", "#DDD6FE"],
    ["#FFF7ED", "#FED7AA"],
    ["#ECFEFF", "#A5F3FC"],
  ];
  const [bg, stroke] = hues[h % hues.length];
  const ox = 110 + (h % 60), oy = 40 + (h % 30);
  const w = 90 + (h % 40), d = 28 + (h % 14), ht = 70 + (h % 30);

  return `<svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
    <rect width="320" height="180" fill="${bg}"/>
    <defs><pattern id="p${h % 9999}" width="18" height="18" patternUnits="userSpaceOnUse">
      <path d="M18 0L0 0 0 18" fill="none" stroke="${stroke}" stroke-width="0.4" opacity="0.6"/>
    </pattern></defs>
    <rect width="320" height="180" fill="url(#p${h % 9999})"/>
    <rect x="${ox}" y="${oy + d}" width="${w}" height="${ht}" fill="white" fill-opacity="0.7" stroke="${stroke}" stroke-width="1.2"/>
    <polygon points="${ox},${oy + d} ${ox + w},${oy + d} ${ox + w + d},${oy} ${ox + d},${oy}" fill="white" fill-opacity="0.5" stroke="${stroke}" stroke-width="1.2"/>
    <polygon points="${ox + w},${oy + d} ${ox + w + d},${oy} ${ox + w + d},${oy + ht} ${ox + w},${oy + ht + d}" fill="white" fill-opacity="0.3" stroke="${stroke}" stroke-width="1.2"/>
    <line x1="${ox - 12}" y1="${oy + d}" x2="${ox - 12}" y2="${oy + ht + d}" stroke="#E8722A" stroke-width="1" stroke-dasharray="3,2" opacity="0.7"/>
    <text x="160" y="172" text-anchor="middle" fill="${stroke}" font-family="Outfit,sans-serif" font-size="8" font-weight="700" letter-spacing="0.14em" opacity="0.8">${project.id.slice(0, 14).toUpperCase()}</text>
  </svg>`;
}
