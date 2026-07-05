// clipboard.js
/*
  FILE: clipboard.js
  LAYMAN (Tropang Ex): Yung "Copy" buttons natin (copy share link, copy credential ID)
    dati umaasa lang sa modern na navigator.clipboard. Problema: sa plain HTTP (hindi HTTPS
    o localhost) WALA ang API na 'yon — undefined siya — kaya nag-e-error yung button
    ("Cannot read properties of undefined (reading 'writeText')"). Itong helper naglalagay
    ng backup na paraan (yung lumang textarea + execCommand trick) para gumana ang copy
    kahit saang deployment, HTTP man o HTTPS.
  TECHNICAL: Single async helper. Tries the Clipboard API only when it actually exists AND
    the page is a secure context (writeText is undefined on insecure origins in Chrome), then
    falls back to a hidden-textarea + document.execCommand('copy'). Never throws — resolves to
    a boolean so callers can toast success/failure. Callers: profilePage.js copy buttons.
  OUTLINE:
    CLIPBOARD
      - copyToClipboard(text)   copy text to the clipboard with an HTTP-safe legacy fallback
*/

/*
  Function Name: copyToClipboard

  LAYMAN (Tropang Ex):
  Bigyan mo ng text, kokopyahin niya sa clipboard ng user. Susubukan muna niya yung modern
  na paraan; kung hindi available (HTTP deployment), gagamitin yung backup. Babalik siya ng
  true kung nag-copy, false kung talagang hindi kaya — para makapag-toast ka ng tama.

  TECHNICAL:
  Prefers navigator.clipboard.writeText guarded by (navigator.clipboard && isSecureContext);
  on absence or rejection, falls back to a temporary off-screen <textarea> + select() +
  document.execCommand('copy'). Swallows all errors and returns a boolean.

  PARAMS:
  - text — the string to copy (coerced via String(); null/undefined -> '').

  RETURNS:
  Promise<boolean> — true if the copy succeeded, false otherwise. Never rejects.

  STEPS
    Step 1 — Try the modern API
      Layman    : Gamitin yung bagong clipboard kung meron at secure ang page.
      Technical : Guard on navigator.clipboard + window.isSecureContext; await writeText.
    Step 2 — Legacy fallback
      Layman    : Kung wala, gumawa ng tagong textbox, i-select, tapos i-"copy".
      Technical : Off-screen textarea + select() + execCommand('copy'); clean up the node.

  EXAMPLE
    const ok = await copyToClipboard('https://site/profile/abc');
    if (ok) showToast('Copied.'); else showToast('Failed to copy.', 'danger');
*/
export async function copyToClipboard(text) {
  const value = String(text ?? '');

  // Step 1 — modern Clipboard API (only defined on secure origins: HTTPS or localhost).
  if (
    typeof navigator !== 'undefined' &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === 'function' &&
    (typeof window === 'undefined' || window.isSecureContext !== false)
  ) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // fall through to the legacy path (permissions blocked, etc.)
    }
  }

  // Step 2 — legacy fallback that works on plain HTTP.
  try {
    const ta = document.createElement('textarea');
    ta.value = value;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-9999px';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, value.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
