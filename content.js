/**
 * Content script for the Webpage Clipper extension
 * Extracts page content and sends it to the background script
 */

// Function to extract text content from the DOM
function extractTextContent(doc) {
  // Get all text nodes from the body
  const bodyText = doc.body.innerText || doc.body.textContent || '';
  
  // Count total words
  const words = bodyText.split(/\s+/);
  const wordCount = words.length;
  
  // Calculate estimated reading time (average 200 words per minute)
  const readingTime = Math.ceil(wordCount / 200);
  
  // Limit to first 100 words for content preview
  const firstHundredWords = words.slice(0, 100).join(' ') + (words.length > 100 ? '...' : '');
  
  return {
    content: firstHundredWords,
    wordCount: wordCount,
    readingTime: readingTime
  };
}

// Function to fetch and convert favicon to base64
async function getFaviconAsBase64() {
  try {
    // Try to get favicon from link tag first
    const faviconLink = document.querySelector('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]');
    let faviconUrl = '';
    
    if (faviconLink) {
      faviconUrl = faviconLink.href;
      console.log('Found favicon link:', faviconUrl);
    } else {
      // Fallback to default favicon location
      faviconUrl = new URL('/favicon.ico', window.location.origin).href;
      console.log('Using default favicon location:', faviconUrl);
    }
    
    // Fetch the favicon
    console.log('Fetching favicon from:', faviconUrl);
    const response = await fetch(faviconUrl, { 
      cache: 'no-cache',
      mode: 'no-cors'
    });
    
    if (!response.ok && response.status !== 0) { // status 0 can happen with no-cors
      console.warn('Failed to fetch favicon:', response.status);
      return null;
    }
    
    // Convert to blob
    const blob = await response.blob();
    console.log('Favicon blob size:', blob.size, 'bytes');
    
    // Skip if blob is too small or too large (likely invalid)
    if (blob.size < 10 || blob.size > 100000) {
      console.warn('Favicon blob has suspicious size:', blob.size);
      return null;
    }
    
    // Convert blob to base64
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result;
        console.log('Favicon converted to base64, length:', base64data.length);
        resolve(base64data);
      };
      reader.onerror = () => {
        console.warn('Error reading favicon blob');
        resolve(null);
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn('Error processing favicon:', error);
    return null;
  }
}

// Function to clip the current page
async function clipCurrentPage() {
  console.log('Clipping current page...');
  
  // Get favicon as base64
  const faviconBase64 = await getFaviconAsBase64();
  console.log('Favicon retrieved:', faviconBase64 ? 'success' : 'failed');
  
  // Extract text content with metrics
  const contentData = extractTextContent(document);
  
  const pageData = {
    title: document.title,
    url: window.location.href,
    timestamp: new Date().toISOString(), // Ensure timestamp is added
    content: contentData.content,
    wordCount: contentData.wordCount,
    readingTime: contentData.readingTime,
    favicon: faviconBase64
  };
  
  console.log('Sending page data to background script');
  
  // Send the data to the background script
  chrome.runtime.sendMessage({
    action: 'clipPage',
    data: pageData
  }, response => {
    if (response && response.success) {
      console.log('Page clipped successfully');
    } else {
      console.error('Failed to clip page');
    }
  });
}

// Listen for messages from popup or background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Respond to ping to check if content script is loaded
  if (message.action === 'ping') {
    sendResponse({ success: true });
    return;
  }
  
  if (message.action === 'clipPage') {
    clipCurrentPage();
    sendResponse({ success: true });
  }
});
