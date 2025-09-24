# AMP-Script Errors and Root Causes

This document summarizes all errors encountered while trying to inject dynamic content into AMP pages using `amp-script`, their root causes, and recommended fixes.

---

## 1. Script hash not found / incorrect

**Error:**

```
hook.js:608 amp-script Script hash not found or incorrect for amp-script[src="..."]
```

**Cause:**

* AMP requires a SHA384 hash of external scripts for security.
* During development, this check can be bypassed using `data-ampdevmode`.

**Fix:**

* Add `<meta name="amp-script-src" content="sha384-...">` with correct hash.
* Or add `data-ampdevmode` to `<amp-script>` for testing.

---

## 2. Illegal mutation / blocked DOM updates

**Error:**

```
[amp-script] Blocked attempts to modify DOM element children, innerHTML, or the like. For variable-sized <amp-script> containers, a user action has to happen first.
amp-script[src="..."].js was terminated due to illegal mutation.
```

**Cause:**

1. AMP treats elements written directly in HTML (`<h2>`, `<div class="card">`) as **authored nodes**. Mutating these nodes (changing children, innerHTML, or styles) is blocked.
2. `<amp-script>` with variable or `auto` size: AMP requires user interaction to allow mutations unless width and height are fixed.

**Fix:**

* Only mutate **placeholder divs** inside the `<amp-script>` subtree, not authored nodes.
* Give `<amp-script>` a fixed `width` and `height`.
* Avoid `.innerHTML` and inline style changes from JS. Use CSS instead.

---

## 3. Mutations blocked on variable-sized container

**Error:**

```
Blocked N attempts to modify DOM element attributes or styles. For variable-sized <amp-script> containers, a user action has to happen first.
```

**Cause:**

* `<amp-script>` with `layout="fixed"` but `width="auto"` or insufficient `height` makes AMP treat it as variable-sized.
* AMP blocks mutations on variable-sized containers on load.

**Fix:**

* Use numeric `width` and `height` for `<amp-script>`.
* Ensure height is sufficient to fit all dynamic content.

---

## 4. CORS issues for external scripts

**Cause:**

* AMP scripts loaded from external sources require proper CORS headers (`Access-Control-Allow-Origin`).
* Without this, script fails to load.

**Fix:**

* Host script on server with CORS headers (e.g., Netlify, GitHub Pages with correct headers).
* During development, inline scripts with `type="text/plain" target="amp-script"` bypass CORS issues.

---

## Summary of Root Causes

1. **Authored nodes**: Elements directly in HTML cannot be safely mutated by amp-script.
2. **Variable-sized containers**: AMP blocks mutations unless width and height are fixed.
3. **Style/attribute mutations**: AMP restricts inline style changes from JS.
4. **Script hash / CORS**: AMP requires hash for external scripts and proper CORS headers.

---

## Recommended Best Practices

1. Use **placeholder divs** for dynamic content inside `<amp-script>`.
2. Keep authored content outside `<amp-script>` if it needs to stay immutable.
3. Set **fixed width and height** on `<amp-script>` to allow safe DOM mutations on page load.
4. Apply **styles via CSS**, not JS.
5. For external scripts:

   * Ensure correct SHA384 hash or use `data-ampdevmode`.
   * Serve with proper CORS headers.
6. Consider **one amp-script per placeholder div** for complex pages to avoid variable-size issues.

---

## Example Safe Usage

```html
<div class="card">
  <h2>Article Title</h2>
  <amp-img src="..." width="600" height="300"></amp-img>
  <amp-script layout="fixed" width="300" height="50" src="widget.js">
    <div class="price"></div>
  </amp-script>
</div>
```

* JS inside amp-script only updates `.price` div with `textContent`.
* No mutations to `<h2>` or `<amp-img>`.
