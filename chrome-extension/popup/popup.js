document.getElementById('startDetection').addEventListener('click', () => {
    chrome.runtime.sendMessage({action: 'startDetection'}, (response) => {
      document.getElementById('status').textContent = response.status;
    });
  });