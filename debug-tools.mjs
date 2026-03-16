import { chromium } from "playwright";

const url = "http://localhost:3000/?project=6aa8af2d3e";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

page.on("console", (msg) => console.log(`[${msg.type()}] ${msg.text()}`));
page.on("pageerror", (err) => console.log(`[PAGE ERROR] ${err.message}`));

await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
await page.waitForFunction(
  () => document.getElementById("loading-indicator")?.style.display === "none",
  { timeout: 120000 }
).catch(() => console.log("Timeout"));
await page.waitForTimeout(2000);

// ===== DEBUG SECTION BOX =====
console.log("\n=== SECTION BOX DEBUG ===");

// Check what methods/properties SectionTool has
const sectionInfo = await page.evaluate(() => {
  const w = window;
  // Access viewer instance through the viewer
  const container = document.getElementById("viewer-container");
  const canvas = container?.querySelector("canvas");
  return {
    containerExists: !!container,
    canvasExists: !!canvas,
  };
});
console.log("DOM:", JSON.stringify(sectionInfo));

// Click section box and capture any errors
console.log("Clicking section-box...");
await page.click('[data-tool="section-box"]');
await page.waitForTimeout(2000);
await page.screenshot({ path: "debug-section-on.png" });

// Check if button is active
const sectionActive = await page.$eval('[data-tool="section-box"]', el => el.classList.contains("active"));
console.log(`Section button active: ${sectionActive}`);

// Try to see if section planes are visible in the scene
const sectionVisible = await page.evaluate(() => {
  // Look for section-related DOM elements or canvas changes
  const canvases = document.querySelectorAll("canvas");
  return { canvasCount: canvases.length };
});
console.log("Canvases:", JSON.stringify(sectionVisible));

// Toggle off
await page.click('[data-tool="section-box"]');
await page.waitForTimeout(500);

// ===== DEBUG RESET =====
console.log("\n=== RESET (HOME) DEBUG ===");

// First, activate some tools to test reset
console.log("Activating explode...");
await page.click('[data-tool="explode"]');
await page.waitForTimeout(2000);
await page.screenshot({ path: "debug-before-reset.png" });

const explodeActive = await page.$eval('[data-tool="explode"]', el => el.classList.contains("active"));
const sliderVisible = await page.$("#explode-slider-container");
console.log(`Explode active: ${explodeActive}, slider visible: ${sliderVisible !== null}`);

// Now click reset
console.log("Clicking reset...");
await page.click('[data-tool="reset-filters"]');
await page.waitForTimeout(2000);
await page.screenshot({ path: "debug-after-reset.png" });

// Check if everything was deactivated
const afterReset = await page.evaluate(() => {
  const activeButtons = document.querySelectorAll(".toolbar-btn.active");
  const slider = document.getElementById("explode-slider-container");
  return {
    activeButtonCount: activeButtons.length,
    activeButtonIds: Array.from(activeButtons).map(b => b.dataset.tool),
    sliderExists: slider !== null,
  };
});
console.log("After reset:", JSON.stringify(afterReset));

// Also check if the view actually reset (zoom to fit)
console.log("\nChecking if view is back to normal...");
await page.screenshot({ path: "debug-reset-final.png" });

await browser.close();
console.log("\nDone!");
