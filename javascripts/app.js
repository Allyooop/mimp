(function() {
  var anchoredLink, assets, assetsChanged, browserCompatibleDocumentParser, browserSupportsPushState, cacheCurrentPage, changePage, constrainPageCacheTo, createDocument, crossOriginLink, currentState, executeScriptTags, extractAssets, extractLink, extractTitleAndBody, fetchHistory, fetchReplacement, handleClick, ignoreClick, initialized, installClickHandlerLast, intersection, noTurbolink, nonHtmlLink, nonStandardClick, pageCache, recallScrollPosition, referer, reflectNewUrl, reflectRedirectedUrl, rememberCurrentAssets, rememberCurrentState, rememberCurrentUrl, rememberInitialPage, resetScrollPosition, samePageLink, triggerEvent, visit,
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  initialized = false;

  currentState = null;

  referer = document.location.href;

  assets = [];

  pageCache = [];

  createDocument = null;

  visit = function(url) {
    if (browserSupportsPushState) {
      cacheCurrentPage();
      reflectNewUrl(url);
      return fetchReplacement(url);
    } else {
      return document.location.href = url;
    }
  };

  fetchReplacement = function(url) {
    var xhr;
    triggerEvent('page:fetch');
    xhr = new XMLHttpRequest;
    xhr.open('GET', url, true);
    xhr.setRequestHeader('Accept', 'text/html, application/xhtml+xml, application/xml');
    xhr.setRequestHeader('X-XHR-Referer', referer);
    xhr.onload = (function(_this) {
      return function() {
        var doc;
        doc = createDocument(xhr.responseText);
        if (assetsChanged(doc)) {
          return document.location.href = url;
        } else {
          changePage.apply(null, extractTitleAndBody(doc));
          reflectRedirectedUrl(xhr);
          resetScrollPosition();
          return triggerEvent('page:load');
        }
      };
    })(this);
    xhr.onabort = function() {
      return console.log('Aborted turbolink fetch!');
    };
    return xhr.send();
  };

  fetchHistory = function(state) {
    var page;
    cacheCurrentPage();
    if (page = pageCache[state.position]) {
      changePage(page.title, page.body);
      recallScrollPosition(page);
      return triggerEvent('page:restore');
    } else {
      return fetchReplacement(document.location.href);
    }
  };

  cacheCurrentPage = function() {
    rememberInitialPage();
    pageCache[currentState.position] = {
      url: document.location.href,
      body: document.body,
      title: document.title,
      positionY: window.pageYOffset,
      positionX: window.pageXOffset
    };
    return constrainPageCacheTo(10);
  };

  constrainPageCacheTo = function(limit) {
    return delete pageCache[currentState.position - limit];
  };

  changePage = function(title, body) {
    document.title = title;
    document.documentElement.replaceChild(body, document.body);
    executeScriptTags();
    currentState = window.history.state;
    return triggerEvent('page:change');
  };

  executeScriptTags = function() {
    var i, len, ref, ref1, results, script;
    ref = document.body.getElementsByTagName('script');
    results = [];
    for (i = 0, len = ref.length; i < len; i++) {
      script = ref[i];
      if ((ref1 = script.type) === '' || ref1 === 'text/javascript') {
        results.push(eval(script.innerHTML));
      }
    }
    return results;
  };

  reflectNewUrl = function(url) {
    if (url !== document.location.href) {
      referer = document.location.href;
      return window.history.pushState({
        turbolinks: true,
        position: currentState.position + 1
      }, '', url);
    }
  };

  reflectRedirectedUrl = function(xhr) {
    var location;
    if ((location = xhr.getResponseHeader('X-XHR-Current-Location'))) {
      return window.history.replaceState(currentState, '', location);
    }
  };

  rememberCurrentUrl = function() {
    return window.history.replaceState({
      turbolinks: true,
      position: window.history.length - 1
    }, '', document.location.href);
  };

  rememberCurrentState = function() {
    return currentState = window.history.state;
  };

  rememberCurrentAssets = function() {
    return assets = extractAssets(document);
  };

  rememberInitialPage = function() {
    if (!initialized) {
      rememberCurrentUrl();
      rememberCurrentState();
      createDocument = browserCompatibleDocumentParser();
      return initialized = true;
    }
  };

  recallScrollPosition = function(page) {
    return window.scrollTo(page.positionX, page.positionY);
  };

  resetScrollPosition = function() {
    return window.scrollTo(0, 0);
  };

  triggerEvent = function(name) {
    var event;
    event = document.createEvent('Events');
    event.initEvent(name, true, true);
    return document.dispatchEvent(event);
  };

  extractAssets = function(doc) {
    var i, len, node, ref, results;
    ref = doc.head.childNodes;
    results = [];
    for (i = 0, len = ref.length; i < len; i++) {
      node = ref[i];
      if (node.src || node.href) {
        results.push(node.src || node.href);
      }
    }
    return results;
  };

  assetsChanged = function(doc) {
    return intersection(extractAssets(doc), assets).length !== assets.length;
  };

  intersection = function(a, b) {
    var i, len, ref, results, value;
    if (a.length > b.length) {
      ref = [b, a], a = ref[0], b = ref[1];
    }
    results = [];
    for (i = 0, len = a.length; i < len; i++) {
      value = a[i];
      if (indexOf.call(b, value) >= 0) {
        results.push(value);
      }
    }
    return results;
  };

  extractTitleAndBody = function(doc) {
    var title;
    title = doc.querySelector('title');
    return [title != null ? title.textContent : void 0, doc.body];
  };

  browserCompatibleDocumentParser = function() {
    var createDocumentUsingParser, createDocumentUsingWrite, ref, testDoc;
    createDocumentUsingParser = function(html) {
      return (new DOMParser).parseFromString(html, 'text/html');
    };
    createDocumentUsingWrite = function(html) {
      var doc;
      doc = document.implementation.createHTMLDocument('');
      doc.open('replace');
      doc.write(html);
      doc.close;
      return doc;
    };
    if (window.DOMParser) {
      testDoc = createDocumentUsingParser('<html><body><p>test');
    }
    if ((testDoc != null ? (ref = testDoc.body) != null ? ref.childNodes.length : void 0 : void 0) === 1) {
      return createDocumentUsingParser;
    } else {
      return createDocumentUsingWrite;
    }
  };

  installClickHandlerLast = function(event) {
    if (!event.defaultPrevented) {
      document.removeEventListener('click', handleClick);
      return document.addEventListener('click', handleClick);
    }
  };

  handleClick = function(event) {
    var link;
    if (!event.defaultPrevented) {
      link = extractLink(event);
      if (link.nodeName === 'A' && !ignoreClick(event, link)) {
        visit(link.href);
        return event.preventDefault();
      }
    }
  };

  extractLink = function(event) {
    var link;
    link = event.target;
    while (!(link === document || link.nodeName === 'A')) {
      link = link.parentNode;
    }
    return link;
  };

  samePageLink = function(link) {
    return link.href === document.location.href;
  };

  crossOriginLink = function(link) {
    return location.protocol !== link.protocol || location.host !== link.host;
  };

  anchoredLink = function(link) {
    return ((link.hash && link.href.replace(link.hash, '')) === location.href.replace(location.hash, '')) || (link.href === location.href + '#');
  };

  nonHtmlLink = function(link) {
    return link.href.match(/\.[a-z]+(\?.*)?$/g) && !link.href.match(/\.html?(\?.*)?$/g);
  };

  noTurbolink = function(link) {
    var ignore;
    while (!(ignore || link === document)) {
      ignore = link.getAttribute('data-no-turbolink') != null;
      link = link.parentNode;
    }
    return ignore;
  };

  nonStandardClick = function(event) {
    return event.which > 1 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
  };

  ignoreClick = function(event, link) {
    return crossOriginLink(link) || anchoredLink(link) || nonHtmlLink(link) || noTurbolink(link) || nonStandardClick(event);
  };

  browserSupportsPushState = window.history && window.history.pushState && window.history.replaceState && window.history.state !== void 0;

  if (browserSupportsPushState) {
    rememberCurrentAssets();
    document.addEventListener('click', installClickHandlerLast, true);
    window.addEventListener('popstate', function(event) {
      var ref;
      if ((ref = event.state) != null ? ref.turbolinks : void 0) {
        return fetchHistory(event.state);
      }
    });
  }

  this.Turbolinks = {
    visit: visit
  };

}).call(this);
