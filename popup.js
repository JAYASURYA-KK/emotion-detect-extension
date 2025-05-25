// popup.js
let isDetecting = false;

document
  .getElementById("start-stop-btn")
  .addEventListener("click", async () => {
    const button = document.getElementById("start-stop-btn");
    const status = document.getElementById("status");
    isDetecting = !isDetecting;

    button.textContent = isDetecting ? "Stop Detection" : "Start Detection";
    status.textContent = `Status: ${isDetecting ? "Running" : "Stopped"}`;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {
        command: isDetecting ? "start" : "stop",
      });
    });
  });

document.getElementById("reset-btn").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { command: "reset" });
  });
});
