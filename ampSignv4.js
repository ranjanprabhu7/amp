(async function bootstrapPriceWidget() {
  // Wait for DOM to exist in non-AMP contexts
  if (document.readyState === "loading") {
    await new Promise(r => document.addEventListener("DOMContentLoaded", r, { once: true }));
  }

  // ---- Helpers to avoid stale refs ----
  const getSignalDiv = () => document.getElementById("zzazz-signal-div");
  const getTrackingId = () => getSignalDiv()?.getAttribute("data-zzazz-t-id") || "";
  const getArticleUrl = () => getSignalDiv()?.getAttribute("data-url") || window?.location?.href || "";

  // ---- Constants ----
  const BASE_URL   = "https://a.zzazz.com/event";
  const ENABLE_API = "https://cdn.zzazz.com/widget-rules/0999894d-399f-4e1f-ac8e-25861d437ce8.json";
  const PRICE_API  = "https://beta.v.zzazz.com/v3/price";

  // ---- Local State ----
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
    width: window?.innerWidth || document?.documentElement?.clientWidth || 0,
    height: window?.innerHeight || document?.documentElement?.clientHeight || 0,
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
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  }

  const handleScroll = debounce(() => { sendScrollEvent(); }, 500);
  const handleClick  = debounce((e) => { sendClickEvent(e); }, 500);

  document.addEventListener("scroll", handleScroll);
  document.addEventListener("click", handleClick);

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
      "tracking-id": getTrackingId(),
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
    pageVisitTime = Date.now();
    const payload = {
      browser: getBrowserDimensions(),
      device: getDeviceDimensions(),
      url,
      referrer: document.referrer || "",
      is_amp: true,
    };

    const { ok, data } = await sendEvent("pageview", payload);
    if (ok && data) updateSession(data);
    sendPollEvent(url);
  }

  async function sendPollEvent(url) {
    if (url === polledUrl) {
      const waitTime = (Date.now() - pageVisitTime > 600000) ? 60000 : 5000;
      try { await sendEvent("poll"); }
      catch (err) { console.error(err); }
      finally { pollTimeOut = setTimeout(() => sendPollEvent(url), waitTime); }
    }
  }

  async function sendPriceEvent(data) {
    if (isPriced) return;
    if (!sessionReady) {
      // queue but do not block further UI updates
      queueEvent("price", data);
      isPriced = true;
      return;
    }
    isPriced = true;
    try { await sendEvent("price", data); }
    catch (err) { console.error(err); isPriced = false; }
  }

  async function sendScrollEvent() {
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
  }

  function getElementUrl(el) {
    if (!el) return null;
    if (el.tagName === "A" && el.href) return el.href;
    if (el.tagName === "BUTTON" && el.formAction) return el.formAction;
    if (el.tagName === "BUTTON" && el.getAttribute("data-url")) return el.getAttribute("data-url");
    let p = el.parentNode;
    while (p) {
      const tag = p.tagName;
      if (tag === "A" && p.href) return p.href;
      if (tag === "BUTTON" && p.formAction) return p.formAction;
      if (tag === "BUTTON" && p.getAttribute("data-url")) return p.getAttribute("data-url");
      p = p.parentNode;
    }
    return null;
  }

  async function sendClickEvent(event) {
    try {
      const clickedEl = event?.target;
      const payload = {
        browser: getBrowserDimensions(),
        device: getDeviceDimensions(),
        element: {
          tag: clickedEl?.tagName?.toLowerCase() || null,
          url: getElementUrl(clickedEl) || null,
          position: { x: event?.pageX || 0, y: event?.pageY || 0 },
        },
      };
      await sendEvent("click", payload);
    } catch (err) {
      console.log(err);
    }
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
  function setPriceText(valueNum) {
    const priceEl = document.getElementById("zzazz-price");
    if (!priceEl) return;
    let tn = priceEl.firstChild;
    if (!tn || tn.nodeType !== Node.TEXT_NODE) {
      tn = document.createTextNode("");
      priceEl.insertBefore(tn, priceEl.firstChild);
    }
    tn.textContent = `${valueNum.toFixed(2)} `;
  }

  async function injectPriceArticleLevel() {
    const signalDiv = getSignalDiv();
    const articleUrl = getArticleUrl();
    if (!signalDiv || !articleUrl) return;

    try {
      const res = await fetch(PRICE_API, {
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

      const priceNum = Number(priceData.qap);
      await sendPriceEvent({ url: articleUrl, qap: priceNum, price: priceData.price, currency: "inr" });

      setPriceText(priceNum);

      const trendElUp = document.getElementById("zzazz-trend-up");
      const trendElDown = document.getElementById("zzazz-trend-down");

      if (!widgetVisible) {
        signalDiv.classList.remove("hidden");
        widgetVisible = true;
      }

      if (lastPrice !== null && trendElUp && trendElDown) {
        trendElUp.style.display = priceNum >= lastPrice ? "flex" : "none";
        trendElDown.style.display = priceNum < lastPrice ? "flex" : "none";
      }
      lastPrice = priceNum;
    } catch (err) {
      console.error("Price fetch error:", err);
      getSignalDiv()?.classList.add("hidden");
    }
  }

  // ---- Bootstrap ----
  const enabled = await isPillEnabled();
  if (!enabled) {
    console.warn("Price pill disabled remotely.");
    getSignalDiv()?.classList.add("hidden");
    return;
  }

  console.log("Price pill enabled by remote rules.");
  sendPageViewEvent(window?.location?.origin || document?.location?.origin || "");
  injectPriceArticleLevel();
  setInterval(injectPriceArticleLevel, 3000);
})();
