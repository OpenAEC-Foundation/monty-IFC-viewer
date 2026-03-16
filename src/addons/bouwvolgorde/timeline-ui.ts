import { PhaseManager } from "./phase-manager";

export function createTimelineUI(manager: PhaseManager): HTMLElement {
  const container = document.createElement("div");
  container.id = "bouwvolgorde-timeline";

  // Phase label
  const label = document.createElement("div");
  label.className = "bv-label";
  label.textContent = `Fase 1 van ${manager.phaseCount}`;

  // Controls row
  const controls = document.createElement("div");
  controls.className = "bv-controls";

  const prevBtn = createButton("\u25C0", "Vorige fase");
  const playBtn = createButton("\u25B6", "Afspelen");
  const nextBtn = createButton("\u25B6", "Volgende fase");
  nextBtn.textContent = "\u25B6";
  // Fix: prev/next icons
  prevBtn.innerHTML = `<svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"/></svg>`;
  nextBtn.innerHTML = `<svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"/></svg>`;
  playBtn.innerHTML = `<svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path d="M6.3 2.841A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/></svg>`;
  playBtn.classList.add("bv-play-btn");

  const resetBtn = createButton("", "Reset");
  resetBtn.innerHTML = `<svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path fill-rule="evenodd" d="M4.755 10.059a7.5 7.5 0 0112.548-3.364l1.903 1.903H14.25a.75.75 0 000 1.5h6.5a.75.75 0 00.75-.75v-6.5a.75.75 0 00-1.5 0v3.293l-1.643-1.643A9 9 0 012.818 9.14a.75.75 0 001.937.918zM15.245 9.941a7.5 7.5 0 01-12.548 3.364L.794 11.402H5.75a.75.75 0 000-1.5h-6.5a.75.75 0 00-.75.75v6.5a.75.75 0 001.5 0v-3.293l1.643 1.643A9 9 0 0017.182 10.86a.75.75 0 00-1.937-.918z" clip-rule="evenodd"/></svg>`;
  resetBtn.title = "Reset bouwvolgorde";

  // Slider
  const slider = document.createElement("input");
  slider.type = "range";
  slider.min = "0";
  slider.max = String(manager.phaseCount - 1);
  slider.value = "0";
  slider.className = "bv-slider";

  // Speed control
  const speedLabel = document.createElement("span");
  speedLabel.className = "bv-speed-label";
  speedLabel.textContent = "1s";

  // Wire up events
  let playInterval: ReturnType<typeof setInterval> | null = null;
  let speed = 1000;

  function updateLabel(): void {
    const phase = manager.currentPhase;
    label.textContent = `Fase ${phase + 1} van ${manager.phaseCount} — Mark ${manager.currentPhaseName}`;
    slider.value = String(phase);
  }

  function stopPlay(): void {
    if (playInterval) {
      clearInterval(playInterval);
      playInterval = null;
      playBtn.innerHTML = `<svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path d="M6.3 2.841A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/></svg>`;
      playBtn.classList.remove("active");
    }
  }

  prevBtn.addEventListener("click", () => {
    stopPlay();
    manager.prev();
    updateLabel();
  });

  nextBtn.addEventListener("click", () => {
    stopPlay();
    manager.next();
    updateLabel();
  });

  playBtn.addEventListener("click", () => {
    if (playInterval) {
      stopPlay();
    } else {
      // If at end, start from beginning
      if (manager.currentPhase >= manager.phaseCount - 1) {
        manager.setPhase(0);
        updateLabel();
      }
      playBtn.innerHTML = `<svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><rect x="5" y="4" width="3" height="12" rx="1"/><rect x="12" y="4" width="3" height="12" rx="1"/></svg>`;
      playBtn.classList.add("active");
      playInterval = setInterval(() => {
        if (!manager.next()) {
          stopPlay();
        }
        updateLabel();
      }, speed);
    }
  });

  resetBtn.addEventListener("click", () => {
    stopPlay();
    manager.reset();
    label.textContent = "Bouwvolgorde gereset";
    slider.value = "0";
  });

  slider.addEventListener("input", () => {
    stopPlay();
    manager.setPhase(parseInt(slider.value, 10));
    updateLabel();
  });

  // Speed toggle on label click
  const speeds = [2000, 1000, 500, 250];
  const speedLabels = ["2s", "1s", "0.5s", "0.25s"];
  let speedIndex = 1;
  speedLabel.addEventListener("click", () => {
    speedIndex = (speedIndex + 1) % speeds.length;
    speed = speeds[speedIndex];
    speedLabel.textContent = speedLabels[speedIndex];
    // Restart play if running
    if (playInterval) {
      stopPlay();
      playBtn.click();
    }
  });

  controls.appendChild(prevBtn);
  controls.appendChild(playBtn);
  controls.appendChild(nextBtn);
  controls.appendChild(resetBtn);
  controls.appendChild(speedLabel);

  container.appendChild(label);
  container.appendChild(slider);
  container.appendChild(controls);

  // Initialize at phase 0
  manager.setPhase(0);
  updateLabel();

  return container;
}

function createButton(text: string, title: string): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.className = "bv-btn";
  btn.textContent = text;
  btn.title = title;
  return btn;
}
