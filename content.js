/*// content.js
class EmotionAnalyzer {
  constructor() {
    this.isInitialized = false;
    this.isAnalyzing = false;
    this.modelPath = chrome.runtime.getURL("models");
    this.stats = {
      totalParticipants: 0,
      camerasOff: 0,
      camerasOffParticipants: [],
      emotions: {
        happy: 0,
        sad: 0,
        angry: 0,
        neutral: 0,
        surprised: 0,
        fearful: 0,
        disgusted: 0,
      },
    };
  }

  async initialize() {
    try {
      await faceapi.nets.tinyFaceDetector.loadFromUri(this.modelPath);
      await faceapi.nets.faceExpressionNet.loadFromUri(this.modelPath);
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error("Failed to initialize models:", error);
      return false;
    }
  }

  createUI() {
    const panel = document.createElement("div");
    panel.className = "emotion-control-panel";
    panel.innerHTML = `
      <div class="control-container">
        <div class="button-container">
          <button id="startAnalysis" class="control-button start">Start Analysis</button>
          <button id="stopAnalysis" class="control-button stop" disabled>Stop</button>
        </div>
        <div class="stats-container">
          <div id="participantStats"></div>
          <div id="emotionStats"></div>
          <div id="camerasOffList"></div>
        </div>
      </div>
    `;
    document.body.appendChild(panel);
    this.bindEvents();
  }

  bindEvents() {
    document
      .getElementById("startAnalysis")
      .addEventListener("click", () => this.start());
    document
      .getElementById("stopAnalysis")
      .addEventListener("click", () => this.stop());

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type === "GET_STATS") {
        sendResponse({ stats: this.stats });
      }
      return true;
    });
  }

  findParticipantInfo(element) {
    const container = element.closest("[data-participant-id]");
    if (!container) return null;

    // Try multiple possible selectors for name and email
    const nameSelectors = [
      "[data-self-name]",
      "[data-participant-name]",
      '[data-participant-id] div[role="button"]',
      "[data-participant-id] span",
    ];

    const emailSelectors = [
      "[data-participant-email]",
      '[aria-label*="@"]',
      '[data-participant-id] div[role="button"]',
    ];

    let name = "Unknown";
    let email = "Email not available";

    // Find name
    for (const selector of nameSelectors) {
      const element = container.querySelector(selector);
      if (element) {
        name = element.textContent.trim();
        break;
      }
    }

    // Find email
    for (const selector of emailSelectors) {
      const element = container.querySelector(selector);
      if (element) {
        const possibleEmail =
          element.getAttribute("aria-label") ||
          element.getAttribute("data-participant-email") ||
          element.textContent;
        if (possibleEmail && possibleEmail.includes("@")) {
          email = possibleEmail.trim();
          break;
        }
      }
    }

    return {
      name,
      email,
      id: container.dataset.participantId,
    };
  }

  updateUI() {
    const participantStats = document.getElementById("participantStats");
    const emotionStats = document.getElementById("emotionStats");
    const camerasOffList = document.getElementById("camerasOffList");

    participantStats.innerHTML = `
      <div class="stats-item">
        <span>Total Participants:</span>
        <span>${this.stats.totalParticipants}</span>
      </div>
      <div class="stats-item">
        <span>Cameras Off:</span>
        <span>${this.stats.camerasOff}</span>
      </div>
      <div class="stats-item">
        <span>Cameras On:</span>
        <span>${this.stats.totalParticipants - this.stats.camerasOff}</span>
      </div>
    `;

    emotionStats.innerHTML = Object.entries(this.stats.emotions)
      .map(
        ([emotion, count]) => `
        <div class="stats-item">
          <span>${emotion}:</span>
          <span>${count}</span>
        </div>
      `
      )
      .join("");

    if (this.stats.camerasOffParticipants.length > 0) {
      camerasOffList.innerHTML = `
        <div class="cameras-off-header">Participants with Camera Off:</div>
        ${this.stats.camerasOffParticipants
          .map(
            (participant) => `
          <div class="cameras-off-item">
            <div>${participant.name}</div>
            <div class="participant-email">${participant.email}</div>
          </div>
        `
          )
          .join("")}
      `;
    } else {
      camerasOffList.innerHTML = "";
    }
  }

  async start() {
    if (!this.isInitialized) {
      const success = await this.initialize();
      if (!success) return;
    }

    this.isAnalyzing = true;
    document.getElementById("startAnalysis").disabled = true;
    document.getElementById("stopAnalysis").disabled = false;
    this.analyze();
  }

  stop() {
    this.isAnalyzing = false;
    document.getElementById("startAnalysis").disabled = false;
    document.getElementById("stopAnalysis").disabled = true;
  }

  async analyze() {
    while (this.isAnalyzing) {
      try {
        // Find all participants
        const participants = document.querySelectorAll("[data-participant-id]");
        this.stats.totalParticipants = participants.length;

        // Reset cameras off list
        this.stats.camerasOffParticipants = [];

        // Check each participant
        participants.forEach((participant) => {
          const cameraOff =
            participant.querySelector('[data-camera-off="true"]') !== null;
          if (cameraOff) {
            const info = this.findParticipantInfo(participant);
            if (info) {
              this.stats.camerasOffParticipants.push(info);
            }
          }
        });

        this.stats.camerasOff = this.stats.camerasOffParticipants.length;

        // Reset emotion counts
        Object.keys(this.stats.emotions).forEach(
          (key) => (this.stats.emotions[key] = 0)
        );

        // Analyze video feeds
        const videos = document.querySelectorAll("video");
        for (const video of videos) {
          if (video.videoWidth > 0 && video.videoHeight > 0) {
            const detection = await faceapi
              .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
              .withFaceExpressions();

            if (detection) {
              const dominantEmotion = Object.entries(
                detection.expressions
              ).reduce((a, b) => (a[1] > b[1] ? a : b))[0];
              this.stats.emotions[dominantEmotion]++;
            }
          }
        }

        this.updateUI();
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error("Analysis error:", error);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }
}

// Initialize when the page loads
window.addEventListener("load", () => {
  const analyzer = new EmotionAnalyzer();
  analyzer.createUI();
});
*/
// content.js
class EmotionAnalyzer {
  constructor() {
    this.isInitialized = false;
    this.isAnalyzing = false;
    this.isDragging = false;
    this.isMinimized = false;
    this.position = { x: 20, y: 20 };
    this.modelPath = chrome.runtime.getURL("models");
    this.stats = {
      totalParticipants: 0,
      camerasOff: 0,
      camerasOffParticipants: [],
      emotions: {
        happy: 0,
        sad: 0,
        angry: 0,
        neutral: 0,
        surprised: 0,
        fearful: 0,
        disgusted: 0,
      },
    };
    // Emoji mapping for emotions
    this.emotionEmojis = {
      happy: "😊",
      sad: "😢",
      angry: "😠",
      neutral: "😐",
      surprised: "😲",
      fearful: "😨",
      disgusted: "🤢",
    };
  }

  async initialize() {
    try {
      await faceapi.nets.tinyFaceDetector.loadFromUri(this.modelPath);
      await faceapi.nets.faceExpressionNet.loadFromUri(this.modelPath);
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error("Failed to initialize models:", error);
      return false;
    }
  }

  createUI() {
    this.container = document.createElement("div");
    this.container.className = "emotion-analyzer";
    this.container.style.left = `${this.position.x}px`;
    this.container.style.top = `${this.position.y}px`;
    this.updateUI();
    document.body.appendChild(this.container);
    this.setupDragging();
  }

  updateUI() {
    if (this.isMinimized) {
      this.container.innerHTML = `
        <div class="analyzer-minimized">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1a73e8" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
            <line x1="9" y1="9" x2="9.01" y2="9"/>
            <line x1="15" y1="9" x2="15.01" y2="9"/>
          </svg>
        </div>
      `;
    } else {
      this.container.innerHTML = `
        <div class="analyzer-panel">
          <div class="analyzer-header">
            <div class="analyzer-title">Meet Emotion Analyzer</div>
            <button class="minimize-button">−</button>
          </div>
          
          <button class="btn control-button ${
            this.isAnalyzing ? "stop-button" : "start-button"
          }">
            ${this.isAnalyzing ? "Stop Analysis" : "Start Analysis"}
          </button>

          <div class="stats-section">
            <div class="stats-header">Participants</div>
            <div class="stats-item">
              <span>Total:</span>
              <span>${this.stats.totalParticipants}</span>
            </div>
          </div>

          <div class="stats-section emotion-grid">
            <div class="stats-header">Emotions</div>
            ${Object.entries(this.stats.emotions)
              .map(
                ([emotion, count]) => `
                <div class="emotion-bubble ${count > 0 ? "active" : ""}">
                  <div class="emotion-emoji" data-emotion="${emotion}">${
                  this.emotionEmojis[emotion]
                }</div>
                  <div class="emotion-count">${count}</div>
                  <div class="emotion-label">${emotion}</div>
                </div>
              `
              )
              .join("")}
          </div>

          ${
            this.stats.camerasOffParticipants.length > 0
              ? `
            <div class="stats-section">
              <div class="stats-header">Cameras Off List</div>
              <div class="cameras-off-list">
                ${this.stats.camerasOffParticipants
                  .map(
                    (participant) => `
                  <div class="cameras-off-item">
                    <div>${participant.name}</div>
                    <div class="participant-email">${participant.email}</div>
                  </div>
                `
                  )
                  .join("")}
              </div>
            </div>
          `
              : ""
          }
        </div>
      `;
    }

    this.bindEvents();
  }

  setupDragging() {
    let dragStartPos = { x: 0, y: 0 };

    const handleMouseDown = (e) => {
      if (e.button !== 0) return;
      this.isDragging = true;
      dragStartPos = {
        x: e.clientX - this.position.x,
        y: e.clientY - this.position.y,
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    };

    const handleMouseMove = (e) => {
      if (!this.isDragging) return;
      this.position = {
        x: e.clientX - dragStartPos.x,
        y: e.clientY - dragStartPos.y,
      };
      this.container.style.left = `${this.position.x}px`;
      this.container.style.top = `${this.position.y}px`;
    };

    const handleMouseUp = () => {
      this.isDragging = false;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    this.container.addEventListener("mousedown", handleMouseDown);
  }

  bindEvents() {
    if (this.isMinimized) {
      this.container
        .querySelector(".analyzer-minimized")
        .addEventListener("click", () => {
          if (!this.isDragging) {
            this.isMinimized = false;
            this.updateUI();
          }
        });
    } else {
      this.container
        .querySelector(".minimize-button")
        .addEventListener("click", () => {
          this.isMinimized = true;
          this.updateUI();
        });

      this.container
        .querySelector(".control-button")
        .addEventListener("click", () => {
          if (this.isAnalyzing) {
            this.stop();
          } else {
            this.start();
          }
        });

      // Add event listeners for emotion bubbles
      const emotionBubbles = this.container.querySelectorAll(".emotion-bubble");
      emotionBubbles.forEach((bubble) => {
        bubble.addEventListener("click", (e) => {
          const emotion =
            bubble.querySelector(".emotion-emoji").dataset.emotion;
          this.showEmotionDetails(emotion);
        });
      });
    }
  }

  showEmotionDetails(emotion) {
    const participantsWithEmotion = this.getParticipantsWithEmotion(emotion);
    const count = this.stats.emotions[emotion];

    // Create a modal to show participants with this emotion
    const modal = document.createElement("div");
    modal.className = "emotion-details-modal";
    modal.innerHTML = `
      <div class="emotion-details-content">
        <div class="emotion-details-header">
          <h3>${this.emotionEmojis[emotion]} ${emotion} (${count})</h3>
          <button class="close-modal">×</button>
        </div>
        <div class="emotion-details-body">
          ${
            participantsWithEmotion.length > 0
              ? `<div class="participants-list">
              ${participantsWithEmotion
                .map(
                  (p) => `
                <div class="participant-item">
                  <div class="participant-name">${p.name}</div>
                  <div class="participant-email">${p.email}</div>
                </div>
              `
                )
                .join("")}
            </div>`
              : `<p>No participants currently detected with this emotion</p>`
          }
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Add close event
    modal.querySelector(".close-modal").addEventListener("click", () => {
      document.body.removeChild(modal);
    });

    // Close when clicking outside
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
  }

  getParticipantsWithEmotion(emotion) {
    // In a real implementation, you would track which participants have which emotions
    // This is a simplified implementation
    return [];
  }

  findParticipantInfo(element) {
    const container = element.closest("[data-participant-id]");
    if (!container) return null;

    const nameSelectors = [
      "[data-self-name]",
      "[data-participant-name]",
      '[data-participant-id] div[role="button"]',
      "[data-participant-id] span",
    ];

    const emailSelectors = [
      "[data-participant-email]",
      '[aria-label*="@"]',
      '[data-participant-id] div[role="button"]',
    ];

    let name = "Unknown";
    let email = "Email not available";

    for (const selector of nameSelectors) {
      const element = container.querySelector(selector);
      if (element) {
        name = element.textContent.trim();
        break;
      }
    }

    for (const selector of emailSelectors) {
      const element = container.querySelector(selector);
      if (element) {
        const possibleEmail =
          element.getAttribute("aria-label") ||
          element.getAttribute("data-participant-email") ||
          element.textContent;
        if (possibleEmail && possibleEmail.includes("@")) {
          email = possibleEmail.trim();
          break;
        }
      }
    }

    return {
      name,
      email,
      id: container.dataset.participantId,
    };
  }

  async start() {
    if (!this.isInitialized) {
      const success = await this.initialize();
      if (!success) return;
    }

    this.isAnalyzing = true;
    this.updateUI();
    this.analyze();
  }

  stop() {
    this.isAnalyzing = false;
    this.updateUI();
  }

  async analyze() {
    while (this.isAnalyzing) {
      try {
        const participants = document.querySelectorAll("[data-participant-id]");
        this.stats.totalParticipants = participants.length;
        this.stats.camerasOffParticipants = [];

        participants.forEach((participant) => {
          const video = participant.querySelector("video");
          const cameraOff =
            !video || participant.querySelector('[data-camera-off="true"]');

          if (cameraOff) {
            const info = this.findParticipantInfo(participant);
            if (info) {
              this.stats.camerasOffParticipants.push(info);
            }
          }
        });

        this.stats.camerasOff = this.stats.camerasOffParticipants.length;

        Object.keys(this.stats.emotions).forEach(
          (key) => (this.stats.emotions[key] = 0)
        );

        const videos = document.querySelectorAll("video");
        for (const video of videos) {
          if (video.videoWidth > 0 && video.videoHeight > 0) {
            const detection = await faceapi
              .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
              .withFaceExpressions();

            if (detection) {
              const dominantEmotion = Object.entries(
                detection.expressions
              ).reduce((a, b) => (a[1] > b[1] ? a : b))[0];
              this.stats.emotions[dominantEmotion]++;
            }
          }
        }

        this.updateUI();
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error("Analysis error:", error);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }
}

// Initialize when the page loads
window.addEventListener("load", () => {
  const analyzer = new EmotionAnalyzer();
  analyzer.createUI();
});
