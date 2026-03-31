export const createMarkdownMathSourceDocument = (markdown: string, headerHeight: number = 0, footerHeight: number = 0) => {
  return String.raw`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1"
  />
  <style>
    body {
      margin: 0;
      padding: 24px;
      padding-top: calc(24px + ${headerHeight}px);
      padding-bottom: calc(24px + ${footerHeight}px);
      background: rgb(246, 238, 219);
      color: #1a1a1a;
      font-family:
        -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      line-height: 1.7;
    }

    #content {
      min-height: 100%;
    }

    h1,
    h2,
    h3,
    h4,
    h5,
    h6 {
      margin-top: 0;
      margin-bottom: 16px;
      color: #1a1a1a;
      font-weight: 600;
    }

    h1 {
      font-size: 2em;
    }

    h2 {
      font-size: 1.5em;
    }

    h3 {
      font-size: 1.25em;
    }

    p {
      margin-bottom: 16px;
    }

    code {
      background: rgba(45, 90, 45, 0.12);
      padding: 2px 6px;
      border-radius: 6px;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    }

    pre {
      background: #f6f8fa;
      border-radius: 6px;
      padding: 16px;
      overflow-x: auto;
      margin-bottom: 16px;
    }

    pre code {
      background: none;
      padding: 0;
    }

    blockquote {
      border-left: 4px solid #1a1a1a;
      margin: 0 0 16px 0;
      padding-left: 16px;
      opacity: 0.9;
      font-style: italic;
    }

    ul,
    ol {
      margin-bottom: 16px;
      padding-left: 24px;
    }

    li {
      margin-bottom: 4px;
    }

    hr {
      border: none;
      border-top: 1px solid #e1e4e8;
      margin: 24px 0;
    }

    .MathJax {
      font-size: 1.1em !important;
    }
  </style>

  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>

  <script>
    window.MathJax = {
      loader: {
        load: ['a11y/semantic-enrich', 'a11y/explorer']
      },
      tex: {
        inlineMath: [['$', '$'], ['\\(', '\\)']],
        displayMath: [['$$', '$$'], ['\\[', '\\]']],
        processEscapes: true,
        processEnvironments: true
      },
      options: {
        enableAssistiveMml: true,
        menuOptions: {
          settings: {
            assistiveMml: true,
            explorer: true
          }
        }
      },
      sre: {
        locale: 'en',
        domain: 'clearspeak',
        style: 'default'
      },
      startup: {
        typeset: false
      }
    };
  </script>

  <script
    id="MathJax-script"
    async
    src="https://cdn.jsdelivr.net/npm/mathjax@4/tex-mml-chtml.js"
  ></script>
</head>
<body>
  <div id="content"></div>

  <script>
    window.__MATH_A11Y_STATUS__ = {
      markedLoaded: false,
      mathJaxPresent: false,
      startupReady: false,
      typesetResolved: false,
      mjxContainerCount: 0,
      semanticSpeechCount: 0,
      ariaLabelCount: 0,
      firstAriaLabel: '',
      firstSemanticSpeech: '',
      error: null
    };

    function log() {
      // Removed debug logging
    }

    function fail(error) {
      window.__MATH_A11Y_STATUS__.error = String(
        error && error.message ? error.message : error
      );
      console.error('[markdown-math-preview] FAILED:', error);

      var content = document.getElementById('content');
      if (content) {
        content.innerHTML =
          '<p style="color: red;">Error rendering markdown/math preview</p>';
      }
    }

    function decodeHtmlEntities(text) {
      var textarea = document.createElement('textarea');
      textarea.innerHTML = text;
      return textarea.value;
    }

    function normalizeSpeechText(text) {
      return String(text || '')
        .replace(/<mark[^>]*>/g, ' ')
        .replace(/<\/mark>/g, ' ')
        .replace(/<break[^>]*>/g, ' ')
        .replace(/<\/?prosody[^>]*>/g, ' ')
        .replace(/<\/?say-as[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    function getMathSpeechText(container) {
      var mjxMath = container.querySelector('mjx-math');

      var speechNone =
        (mjxMath && mjxMath.getAttribute('data-semantic-speech-none')) ||
        container.getAttribute('data-semantic-speech-none');

      if (speechNone) {
        return normalizeSpeechText(decodeHtmlEntities(speechNone));
      }

      var mjxSpeech = container.querySelector('mjx-speech[aria-label]');
      if (mjxSpeech) {
        return normalizeSpeechText(
          String(mjxSpeech.getAttribute('aria-label') || '').replace(
            /,\s*math\s*$/i,
            ''
          )
        );
      }

      var speech =
        (mjxMath && mjxMath.getAttribute('data-semantic-speech')) ||
        container.getAttribute('data-semantic-speech');

      if (speech) {
        return normalizeSpeechText(decodeHtmlEntities(speech));
      }

      var existingAria = container.getAttribute('aria-label');
      if (existingAria) {
        return normalizeSpeechText(existingAria);
      }

      return '';
    }

    function applyMathAccessibility(root) {
      var containers = root.querySelectorAll('mjx-container');
      var ariaLabelCount = 0;
      var firstAriaLabel = '';
      var firstSemanticSpeech = '';

      containers.forEach(function (container) {
        var speechText = getMathSpeechText(container);

        var semanticNode =
          container.querySelector('mjx-math[data-semantic-speech]') ||
          container.querySelector('[data-semantic-speech]');

        if (!firstSemanticSpeech && semanticNode) {
          firstSemanticSpeech =
            semanticNode.getAttribute('data-semantic-speech') || '';
        }

        if (speechText) {
          container.setAttribute('aria-label', speechText);
          container.setAttribute('tabindex', '0');

          // Override role=application if explorer inserted it.
          // We want a simpler, screen-reader-friendly fallback.
          container.setAttribute('role', 'img');

          ariaLabelCount += 1;
          if (!firstAriaLabel) {
            firstAriaLabel = speechText;
          }
        }
      });

      window.__MATH_A11Y_STATUS__.ariaLabelCount = ariaLabelCount;
      window.__MATH_A11Y_STATUS__.firstAriaLabel = firstAriaLabel;
      window.__MATH_A11Y_STATUS__.firstSemanticSpeech = firstSemanticSpeech;
    }

    function escapeHtml(text) {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }

    function protectMath(source) {
      var math = [];

      function store(match) {
        var token = 'MATHBLOCK' + math.length + 'TOKEN';
        math.push(match);
        return token;
      }

      var protectedSource = source
        .replace(/\\\[[\s\S]*?\\\]/g, store)
        .replace(/\$\$[\s\S]*?\$\$/g, store)
        .replace(/\\\([\s\S]*?\\\)/g, store)
        .replace(/\$(?!\$)(?:\\.|[^$\n])+\$/g, store)
        .replace(/\\begin\{([a-zA-Z*]+)\}[\s\S]*?\\end\{\1\}/g, store);

      return {
        protectedSource: protectedSource,
        math: math
      };
    }

    function restoreMath(html, math) {
      var restoredHtml = html;
      var hasTokens = true;

      while (hasTokens) {
        hasTokens = false;
        restoredHtml = restoredHtml.replace(/MATHBLOCK(\d+)TOKEN/g, function (_, index) {
          hasTokens = true;
          return escapeHtml(math[Number(index)]);
        });
      }

      return restoredHtml;
    }

    function waitForMathJax(timeoutMs) {
      return new Promise(function (resolve, reject) {
        var start = Date.now();

        function check() {
          window.__MATH_A11Y_STATUS__.mathJaxPresent = !!window.MathJax;
          window.__MATH_A11Y_STATUS__.typesetPromisePresent =
            !!window.MathJax &&
            typeof window.MathJax.typesetPromise === 'function';
          window.__MATH_A11Y_STATUS__.startupReady =
            !!window.MathJax &&
            !!window.MathJax.startup &&
            !!window.MathJax.startup.promise;

          if (window.__MATH_A11Y_STATUS__.typesetPromisePresent) {
            if (
              window.MathJax.startup &&
              window.MathJax.startup.promise &&
              typeof window.MathJax.startup.promise.then === 'function'
            ) {
              window.MathJax.startup.promise.then(resolve).catch(reject);
              return;
            }

            resolve();
            return;
          }

          if (Date.now() - start > timeoutMs) {
            reject(new Error('Timed out waiting for MathJax'));
            return;
          }

          setTimeout(check, 50);
        }

        check();
      });
    }

    (function render() {
      try {
        log('STEP 1: starting markdown render');

        if (!window.marked || typeof window.marked.parse !== 'function') {
          throw new Error('marked failed to load');
        }

        window.__MATH_A11Y_STATUS__.markedLoaded = true;
        log('STEP 2: marked loaded');

        var markdown = ${JSON.stringify(markdown)};
        
        // Pre-process: Add double spaces at end of lines for single line breaks
        markdown = markdown.replace(/([^\n])\n([^\n])/g, '$1  \n$2');
        
        log('STEP 3: markdown length', markdown.length);

        var protectedMath = protectMath(markdown);
        log('STEP 4: protected source created');

        var html = window.marked.parse(protectedMath.protectedSource);
        log('STEP 5: parsed html created');

        html = restoreMath(html, protectedMath.math);
        log('STEP 6: restored html created');

        var content = document.getElementById('content');
        content.innerHTML = html;
        log('STEP 7: content assigned');

        log('STEP 8: waiting for MathJax');
        waitForMathJax(10000)
          .then(function () {
            log('STEP 9: MathJax ready');
            return window.MathJax.typesetPromise([content]);
          })
          .then(function () {
            window.__MATH_A11Y_STATUS__.typesetResolved = true;
            log('STEP 10: typeset resolved');

            applyMathAccessibility(content);

            window.__MATH_A11Y_STATUS__.mjxContainerCount =
              document.querySelectorAll('mjx-container').length;

            window.__MATH_A11Y_STATUS__.semanticSpeechCount =
              document.querySelectorAll('[data-semantic-speech]').length;

            log(
              'STEP 11: accessibility applied',
              'mjx-container count =', window.__MATH_A11Y_STATUS__.mjxContainerCount,
              'semantic-speech count =', window.__MATH_A11Y_STATUS__.semanticSpeechCount,
              'aria-label count =', window.__MATH_A11Y_STATUS__.ariaLabelCount
            );

            log('First aria-label:', window.__MATH_A11Y_STATUS__.firstAriaLabel);
            log('First semantic speech:', window.__MATH_A11Y_STATUS__.firstSemanticSpeech);
          })
          .catch(function (error) {
            fail(error);
          });
      } catch (error) {
        fail(error);
      }
    })();
  </script>
</body>
</html>`;
};

export default createMarkdownMathSourceDocument;
