// Content Script for Campus Drive Tracker Chrome Extension
// Extracts email content from the active Gmail page

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "GET_EMAIL_TEXT") {
    try {
      // 1. Try to extract email subject
      let subject = "";
      const subjectElement = document.querySelector("h1.hP");
      if (subjectElement) {
        subject = subjectElement.innerText.trim();
      } else {
        // Fallback: Use document title (typically "Subject - user@gmail.com - Gmail")
        subject = document.title
          .replace(/\s*-\s*[^@\s]+@[^@\s]+\.[a-zA-Z]+\s*-\s*Gmail$/i, "")
          .replace(/\s*-\s*Gmail$/i, "")
          .trim();
      }

      // 2. Try to extract email body text (Gmail message container class '.a3s')
      let bodyText = "";
      const emailBodies = document.querySelectorAll(".a3s");
      
      if (emailBodies && emailBodies.length > 0) {
        // Find the visible one (useful in threaded views)
        for (const el of emailBodies) {
          if (el.offsetWidth > 0 || el.offsetHeight > 0) {
            bodyText = el.innerText;
            break;
          }
        }
        // Fallback to the last thread if none are visibly detected as offset
        if (!bodyText) {
          bodyText = emailBodies[emailBodies.length - 1].innerText;
        }
      }

      // Fallback 1: Try Gmail primary layout role="main"
      if (!bodyText) {
        const mainContent = document.querySelector('[role="main"]');
        if (mainContent) {
          bodyText = mainContent.innerText;
        }
      }

      // Fallback 2: Full inner text
      if (!bodyText) {
        bodyText = document.body.innerText;
      }

      // 3. Extract selected text (if the user highlighted something specific)
      const selectedText = window.getSelection().toString().trim();

      sendResponse({
        success: true,
        subject: subject,
        body: bodyText,
        selectedText: selectedText
      });
    } catch (error) {
      console.error("Campus Drive Tracker content script error:", error);
      sendResponse({
        success: false,
        error: error.message
      });
    }
  }
  return true; // Keep message channel open for async response
});