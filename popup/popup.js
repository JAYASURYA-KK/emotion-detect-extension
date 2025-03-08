/*// popup/popup.js
document.addEventListener("DOMContentLoaded", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab.url.includes("meet.google.com")) {
    document.body.innerHTML =
      "<p>Please open Google Meet to use this extension</p>";
    return;
  }

  chrome.tabs.sendMessage(tab.id, { type: "GET_STATS" }, (response) => {
    if (response?.stats) {
      const {
        totalParticipants,
        camerasOff,
        emotions,
        camerasOffParticipants,
      } = response.stats;

      document.getElementById("participantStats").innerHTML = `
        <div class="stat-item">
          <span>Total Participants:</span>
          <span>${totalParticipants}</span>
        </div>
        <div class="stat-item">
          <span>Cameras Off:</span>
          <span>${camerasOff}</span>
        </div>
        <div class="stat-item">
          <span>Cameras On:</span>
          <span>${totalParticipants - camerasOff}</span>
        </div>
      `;

      document.getElementById("emotionStats").innerHTML = Object.entries(
        emotions
      )
        .map(
          ([emotion, count]) => `
          <div class="stat-item">
            <span>${emotion}:</span>
            <span>${count}</span>
          </div>
        `
        )
        .join("");

      if (camerasOffParticipants?.length > 0) {
        document.getElementById("camerasOffList").innerHTML = `
          <h4>Participants with Camera Off:</h4>
          ${camerasOffParticipants
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
      }
    } else {
      document.body.innerHTML =
        "<p>No data available. Please start the analysis.</p>";
    }
  });
});
*/
// popup/popup.js
// popup/popup.js
document.addEventListener("DOMContentLoaded", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Emoji mapping for emotions
  const emotionEmojis = {
    happy: "😊",
    sad: "😢",
    angry: "😠",
    neutral: "😐",
    surprised: "😲",
    fearful: "😨",
    disgusted: "🤢",
  };

  if (!tab.url.includes("meet.google.com")) {
    document.getElementById("content").innerHTML = `
      <div class="status-message">
        Please open Google Meet to use this extension
      </div>
    `;
    return;
  }

  const refreshButton = document.getElementById("refreshButton");
  const statsContent = document.getElementById("statsContent");

  async function updateStats() {
    try {
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: "GET_STATS",
      });

      if (response?.stats) {
        const {
          totalParticipants,
          camerasOff,
          emotions,
          camerasOffParticipants,
        } = response.stats;

        statsContent.innerHTML = `
          <div class="section">
            <div class="section-title">Participant Stats</div>
            <div class="stat-item">
              <span class="stat-label">Total Participants</span>
              <span class="stat-value">${totalParticipants}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Cameras On</span>
              <span class="stat-value">${totalParticipants - camerasOff}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Cameras Off</span>
              <span class="stat-value">${camerasOff}</span>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Emotion Distribution</div>
            <div class="emotion-grid">
              ${Object.entries(emotions)
                .map(
                  ([emotion, count]) => `
                <div class="emotion-item">
                  <div class="emotion-emoji">${emotionEmojis[emotion]}</div>
                  <div class="emotion-count">${count}</div>
                  <div class="emotion-label">${emotion}</div>
                </div>
              `
                )
                .join("")}
            </div>
          </div>

          ${
            camerasOffParticipants.length > 0
              ? `
            <div class="section">
              <div class="section-title">Cameras Off List</div>
              <div class="cameras-off-list">
                ${camerasOffParticipants
                  .map(
                    (participant) => `
                  <div class="cameras-off-item">
                    <div class="participant-name">${participant.name}</div>
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
        `;
      } else {
        statsContent.innerHTML = `
          <div class="status-message">
            No data available. Please start the analysis in the Meet window.
          </div>
        `;
      }
    } catch (error) {
      statsContent.innerHTML = `
        <div class="status-message">
          Unable to fetch statistics. Please make sure the analysis is running.
        </div>
      `;
    }
  }

  refreshButton.addEventListener("click", updateStats);
  await updateStats();

  // Auto-refresh every 5 seconds while popup is open
  const refreshInterval = setInterval(updateStats, 5000);

  // Clear interval when popup closes
  window.addEventListener("unload", () => {
    clearInterval(refreshInterval);
  });
});
