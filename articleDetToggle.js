(async function bootstrapPriceWidget() {
  // ---- Local State ----
  const signalDiv = document.getElementById("zzazz-signal-div");
  const trackingId = signalDiv?.getAttribute("zzazz-t-id");
  const BASE_URL = "https://beta.a.zzazz.com/event";
  const ENABLE_API = `https://cdn.zzazz.com/widget-rules/${trackingId}.json`;
  const PRICE_API = "https://beta.v.zzazz.com/v3/price";

  let session = { user_id: null, event_id: null };
  let eventQueue = [];
  let sessionReady = false;
  let flushing = false;
  let lastPrice = null;
  let widgetVisible = false;
  let pollTimeOut = null;
  let polledUrl = null;
  let pageVisitTime = null;
  let isPriced = false;

  // ---- Utils ----
  const getBrowserDimensions = () => ({
    width: window?.innerWidth || 0,
    height: window?.innerHeight || 0,
  });

  const getDeviceDimensions = () => ({
    width: window?.screen?.width || 0,
    height: window?.screen?.height || 0,
  });

  const updateSession = ({ user_id, event_id }) => {
    if (user_id && !session.user_id) session.user_id = user_id;
    if (event_id && !session.event_id) {
      session.event_id = event_id;
      sessionReady = true;
      flushEventQueue();
    }
  };

  function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func.apply(this, args);
      }, delay);
    };
  }

  const handleScroll = debounce(() => {
    sendScrollEvent();
  }, 500);

  const handleClick = debounce((e) => {
    sendClickEvent(e);
  }, 500);

  window.addEventListener("scroll", handleScroll);
  window.addEventListener("click", handleClick);

  // ---- Event Sender ----
  async function sendEvent(type, extraPayload = {}) {
    const payload = {
      type,
      ...extraPayload,
      id: session.event_id,
      pageId: session.event_id,
    };
    const headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
      "tracking-id": `${trackingId}`,
      ...(session.user_id && { "user-id": session.user_id }),
    };

    try {
      const res = await fetch(BASE_URL, {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      return { ok: res.ok, data };
    } catch (err) {
      console.error(`Failed to send event ${type}:`, err);
      return { ok: false, data: null };
    }
  }

  // ---- Queue ----
  function queueEvent(type, payload = {}) {
    eventQueue.push({ type, payload });
    flushEventQueue();
  }

  async function flushEventQueue() {
    if (!sessionReady || flushing) return;
    flushing = true;
    while (eventQueue.length) {
      const { type, payload } = eventQueue.shift();
      await sendEvent(type, payload);
    }
    flushing = false;
  }

  // ---- Event Wrappers ----
  async function sendPageViewEvent(url) {
    clearTimeout(pollTimeOut);
    polledUrl = url;
    isPriced = false;
    pageVisitTime = new Date().getTime();
    const payload = {
      browser: getBrowserDimensions(),
      device: getDeviceDimensions(),
      url: url,
      referrer: document.referrer,
    };

    const { ok, data } = await sendEvent("pageview", payload);
    if (ok && data) updateSession(data);
    sendPollEvent(url);
  }

  async function sendPollEvent(url) {
    if (url === polledUrl) {
      let waitTime =
        new Date().getTime() - pageVisitTime > 600000 ? 60000 : 5000;
      try {
        await sendEvent("poll");
      } catch (err) {
        console.error(err);
      } finally {
        pollTimeOut = setTimeout(() => sendPollEvent(url), waitTime);
      }
    }
  }

  async function sendPriceEvent(data) {
    // if (polledUrl && data.url.includes(polledUrl) && !isPriced) {
    if (!isPriced) {
      if (!sessionReady) return queueEvent("price", data);
      try {
        await sendEvent("price", data);
        isPriced = true;
      } catch (err) {
        console.log(err);
      }
    }
  }

  async function sendScrollEvent() {
    // if (window.location.href === this.polledUrl) {
    try {
      const payload = {
        scrollPosition: window?.scrollY || 0,
        browser: getBrowserDimensions(),
        device: getDeviceDimensions(),
      };
      await sendEvent("scroll", payload);
    } catch (err) {
      console.log(err);
    }
    // }
  }

  function getElementUrl(el) {
    if (!el) return null;

    if (el.tagName === "A" && el.href) return el.href;
    if (el.tagName === "BUTTON" && el.formAction) return el.formAction;
    if (el.tagName === "BUTTON" && el.getAttribute("data-url"))
      return el.getAttribute("data-url");

    // Manual fallback for closest()
    let parent = el.parentNode;
    while (parent) {
      const tag = parent.tagName;
      if (tag === "A" && parent.href) return parent.href;
      if (tag === "BUTTON" && parent.formAction) return parent.formAction;
      if (tag === "BUTTON" && parent.getAttribute("data-url"))
        return parent.getAttribute("data-url");
      parent = parent.parentNode;
    }

    return null;
  }

  async function sendClickEvent(event) {
    // if (window.location.href === this.polledUrl) {
    try {
      const clickedEl = event?.target;
      const payload = {
        browser: getBrowserDimensions(),
        device: getDeviceDimensions(),
        element: {
          tag: clickedEl?.tagName?.toLowerCase() || null,
          url: getElementUrl(clickedEl) || null,
          position: {
            x: event?.pageX || 0,
            y: event?.pageY || 0,
          },
        },
      };
      await sendEvent("click", payload);
    } catch (err) {
      console.log(err);
    }
    // }
  }

  // ---- Remote Enable ----
  async function isPillEnabled() {
    try {
      const res = await fetch(`${ENABLE_API}?dt=${Date.now()}`);
      const data = await res.json();
      return data.showWidget === true;
    } catch (err) {
      console.error("Enable API error:", err);
      return false;
    }
  }

  // ---- Price Logic ----
  async function injectPriceArticleLevel() {
    const articleUrl = signalDiv?.getAttribute("data-url");
    if (!articleUrl) return;

    try {
      const res = await fetch(`${PRICE_API}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: [articleUrl], currency: "inr" }),
      });

      const data = await res.json();
      const priceData = data[articleUrl];

      if (!priceData || isNaN(priceData.qap)) {
        signalDiv.classList.add("hidden");
        widgetVisible = false;
        return;
      }

      const price = priceData.qap.toFixed(2);
      sendPriceEvent({
        url: articleUrl,
        price: priceData.qap,
        currency: "inr",
      });

      const priceEl = document.getElementById("zzazz-price");
      const trendElUp = document.getElementById("zzazz-trend-up");
      const trendElDown = document.getElementById("zzazz-trend-down");

      priceEl.firstChild.textContent = `${price} `;

      if (!widgetVisible) {
        signalDiv.classList.remove("hidden");
        widgetVisible = true;
      }

      if (lastPrice !== null) {
        trendElUp.style.display = price >= lastPrice ? "flex" : "none";
        trendElDown.style.display = price < lastPrice ? "flex" : "none";
      }
      lastPrice = price;
    } catch (err) {
      console.error("Price fetch error:", err);
      signalDiv.classList.add("hidden");
    }
  }

  // ---- Bootstrap ----
  const enabled = await isPillEnabled();
  if (!enabled) {
    console.warn("Price pill disabled remotely.");
    signalDiv?.classList.add("hidden");
    return;
  }

  console.log("Price pill enabled by remote rules.");
  sendPageViewEvent(window.location.origin);
  injectPriceArticleLevel();
  setInterval(injectPriceArticleLevel, 3000);
})();
