// This script runs in the MAIN world to monkey-patch fetch and intercept LeetCode's API calls.

// In-memory cache to cross-reference data when a submission succeeds
const questionCache: Record<string, any> = {};
const submissionCache: Record<string, { code: string, lang: string }> = {};

// Helper to extract questionData from response
const processGraphQLResponse = (data: any) => {
  if (data?.data?.question) {
    const q = data.data.question;
    if (q.questionId) {
      console.log('LC Companion: Cached question details for', q.title);
      questionCache[q.questionId] = q;
    }
  }
};

// Helper to process check polling
const processCheckResponse = (data: any) => {
  if (data) {
    console.log('LC Companion: Polled check status ->', data.state, data.status_msg);
    if (data.state === 'SUCCESS') {
      const qId = data.question_id;
      const questionData = questionCache[qId];
      const submitData = submissionCache[qId];

      if (data.status_msg === 'Accepted' || data.status_code === 10) {
        if (!submitData) {
          console.log('LC Companion: Run success detected, but no submission cached. Ignoring.');
          return;
        }
        console.log('LC Companion: ACCEPTED! Dispatching event...');
        window.postMessage({
          type: 'LC_COMPANION_ACCEPTED',
          payload: {
            question: questionData || { title: 'Unknown', difficulty: 'Medium', questionFrontendId: '0' },
            submission: data,
            code: submitData?.code,
            lang: submitData?.lang
          }
        }, '*');
      } else if (data.status_msg !== 'Pending' && data.status_msg !== 'Compiling') {
        console.log(`LC Companion: FAILED (${data.status_msg})! Dispatching event...`);
        window.postMessage({
          type: 'LC_COMPANION_FAILED',
          payload: {
            question: questionData || { title: 'Unknown', difficulty: 'Medium', questionFrontendId: '0' },
            submission: data,
            code: submitData?.code,
            lang: submitData?.lang
          }
        }, '*');
      }
    }
  }
};

// --- FETCH INTERCEPTOR ---
const originalFetch = window.fetch;
window.fetch = async function (...args) {
  const url = args[0] instanceof Request ? args[0].url : args[0];
  const options = args[1] || {};

  if (typeof url === 'string') {
    // Log every request to find the polling URL
    if (url.includes('/submit/') || url.includes('check') || url.includes('/submissions/')) {
      console.log('LC Companion: [FETCH_DEBUG]', url);
    }
  }

  if (typeof url === 'string' && url.includes('/submit/')) {
    try {
      if (options.body && typeof options.body === 'string') {
        const bodyObj = JSON.parse(options.body);
        if (bodyObj.question_id && bodyObj.typed_code) {
          console.log('LC Companion: (FETCH) Caught code submission for question_id', bodyObj.question_id);
          submissionCache[bodyObj.question_id] = { code: bodyObj.typed_code, lang: bodyObj.lang || 'unknown' };
        }
      }
    } catch (e) {}
  }

  const response = await originalFetch.apply(this, args);
  const clone = response.clone();

  if (typeof url === 'string' && url.includes('/graphql')) {
    try {
      if (options.body && typeof options.body === 'string') {
        const reqBody = JSON.parse(options.body);
        if (reqBody.operationName === 'questionDetail') {
          clone.json().then(processGraphQLResponse).catch(() => {});
        } else if (reqBody.operationName === 'submissionDetails') {
          // Just in case they poll via GraphQL
          clone.json().then(data => {
            console.log('LC Companion: [GRAPHQL_POLL_DEBUG] submissionDetails:', data);
          }).catch(() => {});
        }
      }
    } catch (e) {}
  }

  if (typeof url === 'string' && url.includes('check')) {
    console.log('LC Companion: [CHECK_DEBUG] Intercepted check URL:', url);
    try { clone.json().then(data => {
      console.log('LC Companion: [CHECK_DEBUG] Check response:', data);
      processCheckResponse(data);
    }).catch(e => console.error(e)); } catch (e) {}
  }

  return response;
};

// --- XHR INTERCEPTOR ---
const originalXHR = window.XMLHttpRequest;
(window as any).XMLHttpRequest = function() {
  const xhr = new originalXHR();
  let url = '';
  let requestBody: string | null = null;
  
  const originalOpen = xhr.open;
  xhr.open = function(...args: any[]) {
    url = typeof args[1] === 'string' ? args[1] : (args[1] as any).toString();
    
    if (url.includes('/submit/') || url.includes('check') || url.includes('/submissions/')) {
      console.log('LC Companion: [XHR_DEBUG]', url);
    }
    
    return (originalOpen as any).apply(this, args);
  };
  
  const originalSend = xhr.send;
  xhr.send = function(body) {
    if (typeof body === 'string') requestBody = body;
    
    if (url.includes('/submit/') && requestBody) {
       try {
         const bodyObj = JSON.parse(requestBody);
         if (bodyObj.question_id && bodyObj.typed_code) {
           console.log('LC Companion: (XHR) Caught code submission for question_id', bodyObj.question_id);
           submissionCache[bodyObj.question_id] = { code: bodyObj.typed_code, lang: bodyObj.lang || 'unknown' };
         }
       } catch (e) {}
    }
    
    xhr.addEventListener('load', function() {
      if (url.includes('/graphql') && requestBody) {
         try {
           const reqBody = JSON.parse(requestBody);
           if (reqBody.operationName === 'questionDetail') {
             const data = JSON.parse(xhr.responseText);
             processGraphQLResponse(data);
           }
         } catch (e) {}
      } else if (url.includes('check')) {
         console.log('LC Companion: [CHECK_DEBUG_XHR] Intercepted check URL:', url);
         try {
           const data = JSON.parse(xhr.responseText);
           console.log('LC Companion: [CHECK_DEBUG_XHR] Check response:', data);
           processCheckResponse(data);
         } catch (e) {}
      }
    });

    return originalSend.apply(this, [body]);
  };
  
  return xhr;
};

// Try to parse NEXT_DATA for initial load just in case GraphQL isn't fetched
window.addEventListener('load', () => {
  try {
    const nextData = document.getElementById('__NEXT_DATA__');
    if (nextData && nextData.textContent) {
      const data = JSON.parse(nextData.textContent);
      // It's buried in dehydratedState queries, try finding it:
      const queries = data?.props?.pageProps?.dehydratedState?.queries || [];
      for (const q of queries) {
        if (q?.state?.data?.question && q.state.data.question.questionId) {
          console.log('LC Companion: Found question in __NEXT_DATA__');
          processGraphQLResponse({ data: { question: q.state.data.question } });
        }
      }
    }
  } catch(e) {
    console.error('LC Companion: Error parsing NEXT_DATA', e);
  }
});

console.log('LC Companion: Fetch & XHR interceptors injected');
