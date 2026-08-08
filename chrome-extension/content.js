// Content script to extract job information from web pages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractJobInfo') {
    const jobInfo = extractJobInformation();
    sendResponse({ data: jobInfo });
  }
  return true;
});

function extractJobInformation() {
  // Try to extract job information from common job sites
  const selectors = {
    // LinkedIn
    linkedin: {
      title: '.job-details-jobs-unified-top-card__job-title, .topcard__title',
      company: '.job-details-jobs-unified-top-card__company-name, .topcard__org-name',
      location: '.job-details-jobs-unified-top-card__bullet, .topcard__flavor--bullet',
      description: '.jobs-description__content, .description__text'
    },
    // Indeed
    indeed: {
      title: '.jobsearch-JobInfoHeader-title, h1.jobTitle',
      company: '[data-company-name="true"], .jobsearch-InlineCompanyRating-companyHeader',
      location: '[data-testid="job-location"], .jobsearch-JobInfoHeader-subtitle',
      description: '#jobDescriptionText, .jobsearch-jobDescriptionText'
    },
    // Welcome to the Jungle
    wttj: {
      title: 'h1[data-testid="job-title"]',
      company: '[data-testid="company-name"]',
      location: '[data-testid="job-location"]',
      description: '[data-testid="job-description"]'
    },
    // Generic fallback
    generic: {
      title: 'h1, [class*="title" i][class*="job" i]',
      company: '[class*="company" i], [class*="employer" i]',
      location: '[class*="location" i], [class*="place" i]',
      description: '[class*="description" i], [class*="detail" i], main, article'
    }
  };
  
  // Detect site and use appropriate selectors
  const hostname = window.location.hostname;
  let siteSelectors = selectors.generic;
  
  if (hostname.includes('linkedin.com')) {
    siteSelectors = selectors.linkedin;
  } else if (hostname.includes('indeed.')) {
    siteSelectors = selectors.indeed;
  } else if (hostname.includes('welcometothejungle.com')) {
    siteSelectors = selectors.wttj;
  }
  
  // Extract information
  const title = extractText(siteSelectors.title);
  const company = extractText(siteSelectors.company);
  const location = extractText(siteSelectors.location);
  const description = extractText(siteSelectors.description);
  
  return {
    title: cleanText(title),
    company: cleanText(company),
    location: cleanText(location),
    description: cleanText(description, 500)
  };
}

function extractText(selector) {
  try {
    const element = document.querySelector(selector);
    return element ? element.textContent : '';
  } catch (e) {
    return '';
  }
}

function cleanText(text, maxLength = 200) {
  if (!text) return '';
  
  // Remove extra whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  // Remove special characters at start/end
  text = text.replace(/^[•\-–—:|]+\s*/, '').replace(/\s*[•\-–—:|]+$/, '');
  
  // Truncate if needed
  if (maxLength && text.length > maxLength) {
    text = text.substring(0, maxLength) + '...';
  }
  
  return text;
}

// Add visual indicator when hovering over job elements
let indicator = null;

function showIndicator() {
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 999999;
      animation: slideIn 0.3s ease;
    `;
    indicator.textContent = '💼 JobApp - Prêt à extraire';
    document.body.appendChild(indicator);
    
    setTimeout(() => {
      if (indicator) {
        indicator.remove();
        indicator = null;
      }
    }, 3000);
  }
}

// Show indicator on page load for job sites
if (window.location.hostname.match(/linkedin|indeed|welcometothejungle|monster|glassdoor/)) {
  window.addEventListener('load', showIndicator);
}
