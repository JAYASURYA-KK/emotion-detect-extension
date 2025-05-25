// content.js
let isRunning = false;
let isMinimized = false;
const emotions = [
  "happy",
  "sad",
  "angry",
  "neutral",
  "surprised",
  "disgusted",
  "fearful",
];
let currentDetection = null;
const SCAN_INTERVAL = 1000; // Changed from 2000ms to 1000ms (1 second)
let lastScanTime = 0;
let emojiButton = null;
let modelsLoaded = false;

// Initialize new detection
function initializeDetection() {
  currentDetection = {
    counts: emotions.reduce((acc, emotion) => {
      acc[emotion] = 0;
      return acc;
    }, {}),
    totalParticipants: 0,
    timestamp: new Date().toLocaleTimeString(),
  };
}

// Create emoji button
function createEmojiButton() {
  const button = document.createElement("div");
  button.id = "emotion-detector-emoji";
  button.textContent = "😊";
  button.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    font-size: 24px;
    cursor: pointer;
    z-index: 10001;
    background: white;
    border-radius: 50%;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    user-select: none;
  `;

  // Make emoji draggable
  makeDraggable(button);

  // Toggle display on click
  button.addEventListener("click", () => {
    toggleDisplayBox();
  });

  document.body.appendChild(button);
  return button;
}

// Make an element draggable
function makeDraggable(element) {
  let pos1 = 0,
    pos2 = 0,
    pos3 = 0,
    pos4 = 0;

  element.onmousedown = dragMouseDown;

  function dragMouseDown(e) {
    e.preventDefault();
    // Get mouse position at start
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e.preventDefault();
    // Calculate new position
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    // Set element's new position
    element.style.top = element.offsetTop - pos2 + "px";
    element.style.left = element.offsetLeft - pos1 + "px";
  }

  function closeDragElement() {
    // Stop moving when mouse button is released
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

// Create floating display box
function createDisplayBox() {
  const box = document.createElement("div");
  box.id = "emotion-detector-box";
  box.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: white;
    border: 2px solid #4285f4;
    border-radius: 8px;
    padding: 15px;
    z-index: 10000;
    font-family: Arial, sans-serif;
    width: 250px;
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    transition: all 0.3s ease;
  `;
  return box;
}

// Toggle display box visibility
function toggleDisplayBox() {
  let box = document.getElementById("emotion-detector-box");

  if (!box && isRunning) {
    // Create box if it doesn't exist
    box = createDisplayBox();
    document.body.appendChild(box);
    isMinimized = false;
    updateDisplay();
  } else if (box) {
    if (isMinimized) {
      // Restore box
      box.style.height = "auto";
      box.style.width = "250px";
      box.style.padding = "15px";
      isMinimized = false;
      updateDisplay();
    } else {
      // Minimize box
      box.style.height = "10px";
      box.style.width = "50px";
      box.style.padding = "5px";
      box.innerHTML = "";
      isMinimized = true;
    }
  }
}

// Update display with emojis for each emotion
function updateDisplay() {
  let box = document.getElementById("emotion-detector-box");

  if (box && currentDetection && !isMinimized) {
    const emotionEmojis = {
      happy: "😊",
      sad: "😢",
      angry: "😠",
      neutral: "😐",
      surprised: "😮",
      disgusted: "🤢",
      fearful: "😨",
    };

    box.innerHTML = `
      <div style="margin-bottom: 12px; border-bottom: 1px solid #eee; padding-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
        <div style="font-weight: bold; color: #4285f4; font-size: 16px;">
          Meet Emotion Scanner
        </div>
        <div style="display: flex; gap: 5px;">
          <button id="minimize-btn" style="border: none; background: #f1f3f4; border-radius: 4px; cursor: pointer; padding: 2px 5px; font-size: 12px;">_</button>
        </div>
      </div>
      
      <div style="font-size: 14px; color: #666;">
        Last Scan: ${currentDetection.timestamp}
      </div>
      <div style="font-size: 14px; color: #666; margin-top: 4px; margin-bottom: 12px;">
        Total Participants: ${currentDetection.totalParticipants}
      </div>
      
      <div style="font-weight: bold; margin-bottom: 8px;">Current Emotions:</div>
      ${emotions
        .map(
          (emotion) => `
        <div style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 4px 0;
          ${
            currentDetection.counts[emotion] > 0
              ? "color: #4285f4; font-weight: bold;"
              : "color: #666;"
          }
        ">
          <span style="display: flex; align-items: center;">
            <span style="margin-right: 5px; font-size: 16px;">${
              emotionEmojis[emotion]
            }</span>
            <span style="text-transform: capitalize;">${emotion}:</span>
          </span>
          <span>${currentDetection.counts[emotion]}</span>
        </div>
      `
        )
        .join("")}
      
      <div style="margin-top: 12px; font-size: 12px; color: #666; text-align: center;">
        Scanning every 1 second...
      </div>
    `;

    // Add minimize button functionality
    document.getElementById("minimize-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      toggleDisplayBox();
    });
  }
}

// Scan and detect emotions with improved accuracy
async function scanEmotions() {
  if (!isRunning) return;

  const videos = document.querySelectorAll("video");

  // Reset counts for new scan
  initializeDetection();

  for (const video of videos) {
    if (video.readyState === 4) {
      try {
        const detections = await faceapi
          .detectAllFaces(
            video,
            new faceapi.TinyFaceDetectorOptions({
              inputSize: 416,
              scoreThreshold: 0.5,
            })
          )
          .withFaceExpressions();

        if (detections && detections.length > 0) {
          currentDetection.totalParticipants += detections.length;

          detections.forEach((detection) => {
            if (detection && detection.expressions) {
              // Find the dominant emotion with a confidence threshold
              const confidenceThreshold = 0.2; // Minimum confidence to consider an emotion
              let dominantEmotion = "neutral";
              let highestConfidence = 0;

              for (const [emotion, confidence] of Object.entries(
                detection.expressions
              )) {
                if (
                  confidence > confidenceThreshold &&
                  confidence > highestConfidence
                ) {
                  highestConfidence = confidence;
                  dominantEmotion = emotion;
                }
              }

              if (emotions.includes(dominantEmotion)) {
                currentDetection.counts[dominantEmotion]++;
              }
            }
          });
        }
      } catch (error) {
        console.error("Detection error:", error);
      }
    }
  }

  updateDisplay();
}

// Main detection loop with improved rate limiting
function detectEmotions() {
  if (!isRunning) return;

  const currentTime = Date.now();

  // Only scan every SCAN_INTERVAL milliseconds
  if (currentTime - lastScanTime >= SCAN_INTERVAL) {
    scanEmotions().then(() => {
      lastScanTime = Date.now();

      // Schedule next detection
      if (isRunning) {
        setTimeout(detectEmotions, SCAN_INTERVAL);
      }
    });
  } else {
    // If not enough time has passed, check again soon
    setTimeout(detectEmotions, 100);
  }
}

// Load models with retry mechanism
async function loadModels() {
  if (modelsLoaded) return true;

  try {
    console.log("Loading face detection models...");
    const modelPath = chrome.runtime.getURL("models");

    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(modelPath),
      faceapi.nets.faceExpressionNet.loadFromUri(modelPath),
    ]);

    console.log("Models loaded successfully");
    modelsLoaded = true;
    return true;
  } catch (error) {
    console.error("Error loading models:", error);

    // Retry after a short delay
    return new Promise((resolve) => {
      setTimeout(async () => {
        const result = await loadModels();
        resolve(result);
      }, 1000);
    });
  }
}

// Handle messages from popup
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  switch (request.command) {
    case "start":
      if (!isRunning) {
        isRunning = true;
        lastScanTime = 0;
        initializeDetection();

        // Create emoji button if it doesn't exist
        if (!emojiButton) {
          emojiButton = createEmojiButton();
        }

        const success = await loadModels();
        if (success) {
          detectEmotions();
        } else {
          alert(
            "Failed to load emotion detection models. Please reload the page and try again."
          );
          isRunning = false;
        }
      }
      break;

    case "stop":
      isRunning = false;
      const box = document.getElementById("emotion-detector-box");
      if (box) box.remove();
      if (emojiButton) {
        emojiButton.remove();
        emojiButton = null;
      }
      break;

    case "reset":
      initializeDetection();
      updateDisplay();
      break;
  }
});

// Initialize on load
initializeDetection();
