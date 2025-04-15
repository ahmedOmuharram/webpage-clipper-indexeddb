# Webpage Clipper - IndexedDB Demo Extension

A simple Chrome extension that demonstrates IndexedDB by allowing users to clip and save webpage content. This extension creates a sidebar where you can view and manage your clipped webpages.

## Features

- Clip webpages with a single click
- Store page title, URL, timestamp, and content text
- View all clipped pages in a sidebar
- Delete individual clips or clear all clips
- Demonstrates IndexedDB database operations and schema design

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the extension directory
5. The Webpage Clipper extension should now be installed and ready to use

## Usage

1. Click the extension icon in your toolbar to open the popup
2. Click "Clip Current Page" to save the current webpage
3. Click "Open Clipped Pages" to view your saved clips in the sidebar
4. In the sidebar, you can:
   - View all your clipped pages
   - Click on URLs to open the original pages
   - Delete individual clips using the × button
   - Clear all clips using the "Clear All" button

## Code Structure

- `manifest.json`: Extension configuration (Manifest V3)
- `popup.html/popup.js`: UI when clicking the extension icon
- `sidebar.html/sidebar.js`: The sidebar panel interface
- `content.js`: Script to extract webpage content
- `background.js`: Background service worker
- `utils/db.js`: IndexedDB utility functions

## Architecture and Separation of Concerns

The extension follows a clean separation of concerns pattern to make the codebase maintainable and the IndexedDB implementation clear:

1. **Data Layer (`utils/db.js`)**
   - Contains ALL IndexedDB-specific code
   - Manages database connection, schema definition, and migrations
   - Provides a clean API for CRUD operations through `window.WebpageClipperDB`
   - Handles all direct interactions with IndexedDB
   - Abstracts away IndexedDB complexity from the rest of the application

   ```javascript
   // This code at the end of db.js creates a global object called WebpageClipperDB
   window.WebpageClipperDB = {
     init: initDB,                     // Function to initialize the database
     addPage: addClippedPage,          // Function to add a new page to the database
     getAllPages: getAllClippedPages,  // Function to get all saved pages
     deletePage: deleteClippedPage,    // Function to delete a specific page
     clearAllPages: clearAllClippedPages // Function to delete all pages
   };
   ```

   **How This Works:**
   
   Imagine this as creating a "toolbox" named `WebpageClipperDB` that contains all the tools needed to work with our database. We:
   
   1. Create the toolbox on the `window` object so it's available everywhere in the extension
   2. Put specific tools (functions) inside with easy-to-understand names
   3. Each tool does one specific job (like "add a page" or "delete a page")
   4. Other parts of the extension can now use these tools without knowing the complicated details
   
   For example, when the sidebar needs to show all clipped pages, it simply calls:
   ```javascript
   WebpageClipperDB.getAllPages().then(pages => {
     // Now we can display the pages
   });
   ```
   The sidebar doesn't need to know HOW the data is fetched from IndexedDB, just that it will get the data.

2. **UI Layer (`sidebar.js`, `popup.js`)**
   - Never interacts directly with IndexedDB
   - Uses the API exposed by the data layer
   - Responsible for rendering data and handling user interactions
   - Example: `sidebar.js` calls `WebpageClipperDB.getAllPages()` without knowledge of how data is stored

3. **Content Script (`content.js`)**
   - Responsible for extracting page content
   - Prepares data to be stored but doesn't interact with IndexedDB
   - Sends data to background script for storage

4. **Coordination Layer (`background.js`)**
   - Coordinates communication between different components
   - Routes messages between content scripts and sidebar
   - Doesn't directly interact with IndexedDB

This architecture provides several benefits:
- **Maintainability**: Database changes only need to be made in one file
- **Clarity**: Clear separation between data storage and UI logic
- **Testability**: Components can be tested in isolation
- **Scalability**: Easy to add new features or modify existing ones

## IndexedDB Implementation

The extension uses IndexedDB for persistent client-side storage. Key aspects of the implementation:

- Database creation and schema definition in `utils/db.js`
- CRUD operations for managing clipped pages
- Asynchronous nature of IndexedDB with Promises
- Indexes for optimized queries

## Learning Activity: Adding New Metadata Columns

This activity will guide you through adding new metadata columns to the database to store additional information about clipped webpages.

### Background

Our current database schema stores:
- `id`: Auto-incrementing unique identifier
- `title`: The webpage title
- `url`: The full URL of the webpage
- `timestamp`: When the page was clipped
- `content`: The first 100 words of page content

Let's add two new metadata fields:
1. `wordCount`: The total number of words on the page
2. `readingTime`: Estimated reading time in minutes (calculated by dividing word count by 150 words per minute, for example)

and if you want to try a more challenging task:
3. `favicon`: The website's favicon URL

### Step 1: Update the Database Schema

1. Open `utils/db.js`
2. Locate the `request.onupgradeneeded` function
3. Increment the DB_VERSION constant:
   ```javascript
   const DB_VERSION = 2; // Increment from 1 to 2
   ```
4. Notice that we don't need to create additional indexes for these new fields since we won't be querying by them

### Step 2: Modify the Content Extraction Logic

1. Open `content.js`
2. Update the `extractTextContent` function to count words:
   ```javascript
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
   ```
3. Update the `clipCurrentPage` function to include the favicon:
   ```javascript
   function clipCurrentPage() {
     // Get favicon URL (if available)
     let faviconUrl = '';
     const faviconLink = document.querySelector('link[rel="icon"], link[rel="shortcut icon"]');
     if (faviconLink) {
       faviconUrl = faviconLink.href;
     }
     
     // Extract text content with metrics
     const textData = extractTextContent(document);
     
     const pageData = {
       title: document.title,
       url: window.location.href,
       timestamp: new Date().toISOString(),
       content: textData.content,
       favicon: faviconUrl,
       wordCount: textData.wordCount,
       readingTime: textData.readingTime
     };
     
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
   ```

### Step 3: Update the Sidebar UI

1. Open `sidebar.html` and add CSS for the new metadata display:
   ```css
   .clip-metadata {
     display: flex;
     gap: 15px;
     font-size: 11px;
     color: #666;
     margin-top: 5px;
   }
   
   .metadata-item {
     display: flex;
     align-items: center;
     gap: 3px;
   }
   
   .favicon {
     width: 16px;
     height: 16px;
     margin-right: 5px;
   }
   ```

2. Open `sidebar.js` and update the template in the `renderClippedPages` function:
   ```javascript
   clipItem.innerHTML = `
     <div class="clip-title">
       ${page.favicon ? `<img src="${page.favicon}" class="favicon" onerror="this.style.display='none'">` : ''}
       ${page.title}
     </div>
     <a href="${page.url}" class="clip-url" target="_blank">${page.url}</a>
     <div class="clip-date">${formatDate(page.timestamp)}</div>
     ${page.wordCount ? `
     <div class="clip-metadata">
       <div class="metadata-item">Words: ${page.wordCount}</div>
       <div class="metadata-item">Reading time: ${page.readingTime} min</div>
     </div>
     ` : ''}
     <div class="clip-content">${page.content}</div>
     <button class="delete-btn" data-id="${page.id}">×</button>
   `;
   ```

### Step 4: Handling Data Migration (Optional)

*This step is optional and only needed if you want to handle data migration for existing clipped pages. It can be simpler to simply wipe the database and start fresh.*

Since we've increased the database version, we need to handle data migration for existing clipped pages. In a production application, you'd add migration code in the `onupgradeneeded` event handler.

1. Update the `onupgradeneeded` handler in `utils/db.js`:
   ```javascript
   request.onupgradeneeded = (event) => {
     const db = event.target.result;
     const oldVersion = event.oldVersion;
     
     if (oldVersion < 1) {
       // Initial schema creation
       const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
       store.createIndex('url', 'url', { unique: false });
       store.createIndex('timestamp', 'timestamp', { unique: false });
       console.log('Database schema created');
     }
     
     if (oldVersion < 2) {
       // Migration to version 2: Add new metadata fields
       // (we don't need to explicitly create columns in IndexedDB as it's schema-less)
       console.log('Migrated to schema version 2');
     }
   };
   ```

### Step 5: Testing the Changes

1. Update the extension by reloading it in Chrome
2. Clip a new webpage
3. Open the sidebar to see your clipped page with the new metadata

### Bonus: The Favicon

Adding the favicon to the database requires a few more steps, because the data type is not textual:

1. Fetching the favicon image
2. Converting to Blob/Base64
3. Storing the binary data
4. Updating the DB schema to handle larger objects

### Conclusion

You've successfully added new metadata columns to your IndexedDB database! This demonstrates the power and flexibility of IndexedDB for storing structured data in browser extensions.

Key takeaways:
- IndexedDB uses a versioning system for schema migrations
- IndexedDB is schema-less, allowing you to add new properties without altering the database structure
- Database version changes trigger the `onupgradeneeded` event, which is where you handle migrations

## Additional Learning

To further enhance this extension, consider implementing:
- Page categorization and tagging
- Full-text search functionality
- Export/import capabilities
- Reading mode for clipped content
- Screenshot capture and storage
