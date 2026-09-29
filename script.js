/**
 * The Breathing Pacer - Core Interaction, Multiple Patterns, Pure Rain Audio & Soft Breath Cues
 */

// Breathing Pattern Presets
const PATTERNS = {
  balance: {
    id: 'balance',
    name: '4-2-4 Balance',
    inhale: 4000,
    hold: 2000,
    exhale: 4000,
    rest: 2000,
    subtitle: 'Gentle balance: 4s inhale · 2s hold · 4s exhale · 2s rest',
    tag: '4s Inhale · 2s Hold · 4s Exhale · 2s Rest'
  },
  sleep: {
    id: 'sleep',
    name: '4-7-8 Sleep',
    inhale: 4000,
    hold: 7000,
    exhale: 8000,
    rest: 1000,
    subtitle: 'Dr. Weil 4-7-8 sleep rhythm: 4s inhale · 7s hold · 8s exhale · 1s rest',
    tag: '4s Inhale · 7s Hold · 8s Exhale · 1s Rest'
  },
  box: {
    id: 'box',
    name: '4-4-4 Box',
    inhale: 4000,
    hold: 4000,
    exhale: 4000,
    rest: 4000,
    subtitle: 'Square focus: 4s inhale · 4s hold · 4s exhale · 4s rest',
    tag: '4s Inhale · 4s Hold · 4s Exhale · 4s Rest'
  },
  calm: {
    id: 'calm',
    name: '4-6 Calm',
    inhale: 4000,
    hold: 0,
    exhale: 6000,
    rest: 2000,
    subtitle: 'Extended exhale: 4s inhale · 6s exhale · 2s rest',
    tag: '4s Inhale · 6s Exhale · 2s Rest'
  }
};

// DOM Elements
const toggleBtn = document.getElementById('toggleBtn');
const btnText = document.getElementById('btnText');
const iconPlay = document.querySelector('.icon-play');
const iconStop = document.querySelector('.icon-stop');

const instructionText = document.getElementById('instruction');
const patternSubtitle = document.getElementById('patternSubtitle');
const rhythmTag = document.getElementById('rhythmTag');
const pacerContainer = document.querySelector('.pacer-container');
const circle = document.getElementById('circle');
const cycleCountDisplay = document.getElementById('cycleCount');

const themeToggle = document.getElementById('themeToggle');
const moonIcon = document.querySelector('.moon-icon');
const sunIcon = document.querySelector('.sun-icon');

const soundToggle = document.getElementById('soundToggle');
const soundOnIcon = document.querySelector('.sound-on-icon');
const soundOffIcon = document.querySelector('.sound-off-icon');

const dynamicAnimStyle = document.getElementById('dynamicAnimStyle');
const modePills = document.querySelectorAll('.mode-pill');
const timerChips = document.querySelectorAll('.timer-chip');
const countdownDisplay = document.getElementById('countdownDisplay');
const countdownDigits = document.getElementById('countdownDigits');

const completionOverlay = document.getElementById('completionOverlay');
const completionCloseBtn = document.getElementById('completionCloseBtn');

// Ambient Audio (Real Rain Sound)
const bgmAudio = document.getElementById('bgmAudio');
bgmAudio.volume = 0.28; // Comfortable natural rain sound volume

// Application State
let currentMode = 'balance';
let isRunning = false;
let isMuted = false;
let isDarkMode = false;
let sessionDuration = 0; // 0 = Free / unlimited, otherwise seconds
let remainingSeconds = 0;
let completedCycles = 0;

let loopInterval = null;
let holdTimeout = null;
let exhaleTimeout = null;
let restTimeout = null;
let timerInterval = null;

// Web Audio API context for warm, whisper-soft breath cues
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Plays a whisper-soft, warm acoustic cue designed for eyes-closed breathing.
 * - Completely free of harsh metallic frequencies, clicks, or startling tones.
 * - Low-pass filtered below 420Hz so it feels like a soft warm hum in the rain.
 * - Inhale: soft rising tone (opening lungs)
 * - Hold: delicate stillness harmonic
 * - Exhale: soft descending tone (releasing breath)
 * - Rest: deep, grounded quiet pause
 */
function playSoftBreathCue(phase) {
  if (isMuted) return;

  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Master cue volume: whisper-soft level (~6% gain), seamlessly sitting under the rain
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.065, now);

    // Warm acoustic low-pass filter: eliminates all sharp highs & clicks
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(420, now);

    const osc = ctx.createOscillator();
    const envGain = ctx.createGain();
    osc.type = 'sine';

    if (phase === 'inhale') {
      // Gentle rising breath swell (220Hz -> 262Hz: A3 to C4)
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(262, now + 0.4);
      envGain.gain.setValueAtTime(0, now);
      envGain.gain.linearRampToValueAtTime(0.12, now + 0.08); // 80ms soft feather attack
      envGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
    } else if (phase === 'hold') {
      // Gentle steady harmonic (330Hz: E4, quiet suspension)
      osc.frequency.setValueAtTime(330, now);
      envGain.gain.setValueAtTime(0, now);
      envGain.gain.linearRampToValueAtTime(0.08, now + 0.06);
      envGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
    } else if (phase === 'exhale') {
      // Gentle descending release swell (262Hz -> 196Hz: C4 to G3)
      osc.frequency.setValueAtTime(262, now);
      osc.frequency.exponentialRampToValueAtTime(196, now + 0.45);
      envGain.gain.setValueAtTime(0, now);
      envGain.gain.linearRampToValueAtTime(0.11, now + 0.08);
      envGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.3);
    } else if (phase === 'rest') {
      // Grounding warm resting tone (164Hz: E3, calm pause)
      osc.frequency.setValueAtTime(164, now);
      envGain.gain.setValueAtTime(0, now);
      envGain.gain.linearRampToValueAtTime(0.09, now + 0.07);
      envGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.0);
    }

    osc.connect(envGain);
    envGain.connect(filter);
    filter.connect(masterGain);
    masterGain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 1.4);
  } catch (err) {
    // Graceful silent ignore if audio context is unavailable
  }
}

/**
 * Starts ambient rain background audio loop immediately
 */
function playBGM() {
  if (isMuted) return;

  try {
    bgmAudio.currentTime = 0;
    const promise = bgmAudio.play();
    if (promise !== undefined) {
      promise.catch((err) => {
        console.info("Ambient rain audio note:", err.message);
      });
    }
  } catch (err) {
    console.warn("BGM playback error:", err);
  }
}

/**
 * Immediately stops ambient audio with zero delay
 */
function stopBGM() {
  try {
    bgmAudio.pause();
    bgmAudio.currentTime = 0;
  } catch (err) {
    console.warn("BGM stop error:", err);
  }
}

/**
 * Dynamically generates CSS keyframes for the active breathing pattern
 */
function updateDynamicKeyframes(pattern) {
  const total = pattern.inhale + pattern.hold + pattern.exhale + pattern.rest;
  const totalSec = total / 1000;
  
  const p1 = ((pattern.inhale / total) * 100).toFixed(2);
  const p2 = (((pattern.inhale + pattern.hold) / total) * 100).toFixed(2);
  const p3 = (((pattern.inhale + pattern.hold + pattern.exhale) / total) * 100).toFixed(2);
  
  document.documentElement.style.setProperty('--current-cycle-duration', `${totalSec}s`);

  const css = `
    @keyframes organicBreatheLoop {
      0% {
        transform: scale(1);
        box-shadow: 0 14px 35px var(--circle-shadow), 0 0 22px var(--circle-glow);
        animation-timing-function: cubic-bezier(0.37, 0, 0.2, 1);
      }
      ${p1}% {
        transform: scale(1.58);
        box-shadow: 0 24px 60px rgba(56, 189, 248, 0.38), 0 0 70px rgba(110, 231, 183, 0.65);
        animation-timing-function: linear;
      }
      ${p2}% {
        transform: scale(1.58);
        box-shadow: 0 24px 60px rgba(56, 189, 248, 0.38), 0 0 70px rgba(110, 231, 183, 0.65);
        animation-timing-function: cubic-bezier(0.37, 0, 0.2, 1);
      }
      ${p3}% {
        transform: scale(1);
        box-shadow: 0 14px 35px var(--circle-shadow), 0 0 22px var(--circle-glow);
        animation-timing-function: linear;
      }
      100% {
        transform: scale(1);
        box-shadow: 0 14px 35px var(--circle-shadow), 0 0 22px var(--circle-glow);
      }
    }

    @keyframes outerHaloPulse {
      0% { transform: scale(1); opacity: 0.25; animation-timing-function: cubic-bezier(0.37, 0, 0.2, 1); }
      ${p1}% { transform: scale(2.05); opacity: 0.65; animation-timing-function: linear; }
      ${p2}% { transform: scale(2.05); opacity: 0.65; animation-timing-function: cubic-bezier(0.37, 0, 0.2, 1); }
      ${p3}% { transform: scale(1); opacity: 0.25; animation-timing-function: linear; }
      100% { transform: scale(1); opacity: 0.25; }
    }

    @keyframes innerHaloPulse {
      0% { transform: scale(1); opacity: 0.3; animation-timing-function: cubic-bezier(0.37, 0, 0.2, 1); }
      ${p1}% { transform: scale(1.75); opacity: 0.7; animation-timing-function: linear; }
      ${p2}% { transform: scale(1.75); opacity: 0.7; animation-timing-function: cubic-bezier(0.37, 0, 0.2, 1); }
      ${p3}% { transform: scale(1); opacity: 0.3; animation-timing-function: linear; }
      100% { transform: scale(1); opacity: 0.3; }
    }
  `;

  dynamicAnimStyle.textContent = css;
}

/**
 * Updates the instruction text with a soft blur/dissolve transition
 */
function updateInstruction(text) {
  instructionText.classList.add('fade');
  setTimeout(() => {
    instructionText.textContent = text;
    instructionText.classList.remove('fade');
  }, 180);
}

/**
 * Runs a single breath cycle according to the selected pattern
 * Plays a feather-soft whisper cue at each phase transition
 */
function runBreathingCycle() {
  const pattern = PATTERNS[currentMode];

  // Phase 1: Inhale (gentle rising tone)
  updateInstruction('Breathe in...');
  playSoftBreathCue('inhale');

  let elapsed = pattern.inhale;

  // Phase 2: Hold (gentle still harmonic)
  if (pattern.hold > 0) {
    holdTimeout = setTimeout(() => {
      updateInstruction('Hold...');
      playSoftBreathCue('hold');
    }, elapsed);
    elapsed += pattern.hold;
  }

  // Phase 3: Exhale (gentle descending tone)
  exhaleTimeout = setTimeout(() => {
    updateInstruction('Breathe out...');
    playSoftBreathCue('exhale');
  }, elapsed);
  elapsed += pattern.exhale;

  // Phase 4: Rest (grounding calm resting tone)
  if (pattern.rest > 0) {
    restTimeout = setTimeout(() => {
      updateInstruction('Rest...');
      playSoftBreathCue('rest');
    }, elapsed);
  }
}

/**
 * Starts the breathing session
 */
function startPacer() {
  isRunning = true;
  completedCycles = 0;

  getAudioContext();
  playBGM();

  // Update button appearance
  btnText.textContent = 'Stop';
  iconPlay.style.display = 'none';
  iconStop.style.display = 'block';
  toggleBtn.classList.add('btn-stop');
  toggleBtn.setAttribute('aria-label', 'Stop breathing session');

  pacerContainer.classList.remove('easing-out');
  pacerContainer.classList.add('active');

  // Display cycle counter
  cycleCountDisplay.textContent = `Cycles: ${completedCycles}`;
  cycleCountDisplay.style.display = 'inline-block';

  const pattern = PATTERNS[currentMode];
  const cycleDuration = pattern.inhale + pattern.hold + pattern.exhale + pattern.rest;

  runBreathingCycle();

  loopInterval = setInterval(() => {
    completedCycles++;
    cycleCountDisplay.textContent = `Cycles: ${completedCycles}`;
    runBreathingCycle();
  }, cycleDuration);

  // Setup session timer if duration is selected
  if (sessionDuration > 0) {
    remainingSeconds = sessionDuration;
    updateCountdownDisplay(remainingSeconds);
    countdownDisplay.style.display = 'inline-flex';

    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      remainingSeconds--;
      updateCountdownDisplay(remainingSeconds);

      if (remainingSeconds <= 0) {
        completeSessionNaturally();
      }
    }, 1000);
  } else {
    countdownDisplay.style.display = 'none';
  }
}

/**
 * Formats and updates the countdown display
 */
function updateCountdownDisplay(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  countdownDigits.textContent = `${m}:${s}`;
}

/**
 * Gently finishes the session when countdown timer expires
 */
function completeSessionNaturally() {
  clearInterval(timerInterval);
  clearInterval(loopInterval);
  clearTimeout(holdTimeout);
  clearTimeout(exhaleTimeout);
  clearTimeout(restTimeout);

  isRunning = false;

  // Stop ambient rain immediately with zero lag
  stopBGM();

  // Gentle visual ease-out to resting size
  pacerContainer.classList.remove('active');
  pacerContainer.classList.add('easing-out');

  // Reset button state
  btnText.textContent = 'Start';
  iconPlay.style.display = 'block';
  iconStop.style.display = 'none';
  toggleBtn.classList.remove('btn-stop');
  toggleBtn.setAttribute('aria-label', 'Start breathing session');

  updateInstruction('You did great.');
  countdownDisplay.style.display = 'none';

  // Show peaceful completion card after brief pause
  setTimeout(() => {
    completionOverlay.classList.add('show');
  }, 1000);
}

/**
 * Stops the breathing session immediately on manual stop (zero audio delay)
 */
function stopPacer() {
  isRunning = false;

  // Immediately stop ambient rain sound with zero delay
  stopBGM();

  clearInterval(loopInterval);
  clearInterval(timerInterval);
  clearTimeout(holdTimeout);
  clearTimeout(exhaleTimeout);
  clearTimeout(restTimeout);
  loopInterval = null;
  timerInterval = null;
  holdTimeout = null;
  exhaleTimeout = null;
  restTimeout = null;

  pacerContainer.classList.remove('active');
  pacerContainer.classList.remove('easing-out');

  btnText.textContent = 'Start';
  iconPlay.style.display = 'block';
  iconStop.style.display = 'none';
  toggleBtn.classList.remove('btn-stop');
  toggleBtn.setAttribute('aria-label', 'Start breathing session');

  updateInstruction('Click Start to begin');
  countdownDisplay.style.display = 'none';
}

function togglePacer() {
  if (isRunning) {
    stopPacer();
  } else {
    startPacer();
  }
}

/**
 * Switches the active breathing mode
 */
function setMode(modeKey) {
  if (!PATTERNS[modeKey]) return;
  currentMode = modeKey;
  const pattern = PATTERNS[modeKey];

  modePills.forEach(pill => {
    pill.classList.toggle('active', pill.dataset.mode === modeKey);
  });

  patternSubtitle.textContent = pattern.subtitle;
  rhythmTag.textContent = pattern.tag;

  updateDynamicKeyframes(pattern);

  if (isRunning) {
    stopPacer();
    startPacer();
  }
}

/**
 * Toggles Dark Sleep Mode
 */
function toggleDarkMode() {
  isDarkMode = !isDarkMode;
  document.body.classList.toggle('dark-mode', isDarkMode);

  if (isDarkMode) {
    moonIcon.style.display = 'none';
    sunIcon.style.display = 'block';
    themeToggle.setAttribute('title', 'Light Mode');
  } else {
    moonIcon.style.display = 'block';
    sunIcon.style.display = 'none';
    themeToggle.setAttribute('title', 'Dark Sleep Mode');
  }
}

/**
 * Toggles Sound on/off
 */
function toggleSound() {
  isMuted = !isMuted;
  
  if (isMuted) {
    soundOnIcon.style.display = 'none';
    soundOffIcon.style.display = 'block';
    soundToggle.classList.add('muted');
    soundToggle.setAttribute('title', 'Sound: Muted');
    stopBGM();
  } else {
    soundOnIcon.style.display = 'block';
    soundOffIcon.style.display = 'none';
    soundToggle.classList.remove('muted');
    soundToggle.setAttribute('title', 'Sound: On');
    if (isRunning) {
      playBGM();
    }
  }
}

// Event Listeners
toggleBtn.addEventListener('click', togglePacer);
circle.addEventListener('click', togglePacer);
soundToggle.addEventListener('click', toggleSound);
themeToggle.addEventListener('click', toggleDarkMode);

// Mode Pills selection
modePills.forEach(pill => {
  pill.addEventListener('click', () => {
    setMode(pill.dataset.mode);
  });
});

// Timer Chips selection
timerChips.forEach(chip => {
  chip.addEventListener('click', () => {
    timerChips.forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    sessionDuration = parseInt(chip.dataset.duration, 10);
    
    if (sessionDuration > 0 && !isRunning) {
      updateCountdownDisplay(sessionDuration);
      countdownDisplay.style.display = 'inline-flex';
    } else if (!isRunning) {
      countdownDisplay.style.display = 'none';
    }
  });
});

// Completion modal close
completionCloseBtn.addEventListener('click', () => {
  completionOverlay.classList.remove('show');
  pacerContainer.classList.remove('easing-out');
});

completionOverlay.addEventListener('click', (e) => {
  if (e.target === completionOverlay) {
    completionOverlay.classList.remove('show');
    pacerContainer.classList.remove('easing-out');
  }
});

// Keyboard shortcuts:
// Spacebar: Start / Stop
// M: Toggle Sound
// D: Toggle Dark Sleep Mode
// Escape: Close Completion Modal
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && e.target !== toggleBtn && e.target.tagName !== 'BUTTON') {
    e.preventDefault();
    togglePacer();
  } else if ((e.key === 'm' || e.key === 'M') && e.target.tagName !== 'INPUT') {
    toggleSound();
  } else if ((e.key === 'd' || e.key === 'D') && e.target.tagName !== 'INPUT') {
    toggleDarkMode();
  } else if (e.key === 'Escape' && completionOverlay.classList.contains('show')) {
    completionOverlay.classList.remove('show');
  }
});

// Initialize default pattern keyframes
updateDynamicKeyframes(PATTERNS[currentMode]);
