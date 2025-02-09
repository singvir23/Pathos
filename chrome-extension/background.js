// background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'ANALYZE_FRAME') {
      console.log('🎬 Background: Received analyze request');
      
      // Handle the analysis
      handleAnalysis(request.frame)
        .then(result => {
          console.log('✅ Background: Analysis completed:', result);
          sendResponse(result);
        })
        .catch(error => {
          console.error('❌ Background: Analysis error:', error);
          sendResponse({ 
            success: false, 
            error: error.message 
          });
        });
      
      return true; // Keep the message channel open for async response
    }
  });
  
  async function handleAnalysis(frameData) {
    if (!frameData) {
      throw new Error('No frame data received');
    }
  
    console.log('📊 Background: Frame data length:', frameData.length);
    
    try {
      const response = await fetch('http://localhost:3002/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Origin': chrome.runtime.getURL(''),
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ frame: frameData })
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const data = await response.json();
      return {
        success: true,
        data: data
      };
    } catch (error) {
      console.error('Error during fetch:', error);
      throw error;
    }
  }
  
  // Listen for content script installation
  chrome.runtime.onInstalled.addListener(() => {
    console.log('Background service worker installed');
  });