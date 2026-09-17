/**
 * Copy-to-clipboard buttons.
 *
 * Markup contract: <button data-copy="#target-selector">Copy</button>
 * The button's label is swapped for a confirmation, then restored. An
 * optional [data-copy-label] child scopes the swap to itself, so an icon
 * sitting beside the text survives the confirmation.
 */
export function initClipboard(root = document) {
  root.querySelectorAll("[data-copy]").forEach(setupCopyButton);
}

function setupCopyButton(button) {
  const label = button.querySelector("[data-copy-label]") ?? button;
  const original = label.textContent;
  let restoreTimer;

  button.addEventListener("click", async () => {
    const source = document.querySelector(button.dataset.copy);
    if (!source) return;

    let ok = true;
    try {
      await navigator.clipboard.writeText(source.textContent.trim());
    } catch {
      // Clipboard API needs a secure context — absent on a plain-http LAN
      // preview — and even in one the browser may simply refuse.
      ok = false;
    }

    label.textContent = ok ? "Copied" : "Press ⌘C";
    clearTimeout(restoreTimer);
    restoreTimer = setTimeout(() => {
      label.textContent = original;
    }, 1600);
  });
}
