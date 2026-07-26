// useEscapeClose.js
/*
  FILE: useEscapeClose.js
  LAYMAN (Tropang Ex): Yung shared Modal component natin, sumasara na kapag
  pinindot ang Escape. Pero maraming pages ang may sariling hand-rolled modals
  (mga `modal-overlay` divs) na hindi marunong makinig sa Escape. Itong hook ang
  nagtuturo sa kanila: isang tawag per page, bigay mo ang listahan ng modals mo
  (pinaka-ibabaw muna), at kapag Escape — isasara lang ang PINAKA-IBABAW na bukas.
  Hindi lahat sabay-sabay, para hindi biglang mawala pati yung parent modal.

  TECHNICAL: Single document-level keydown subscription (mounted once), reading
  the pairs through a ref so the list is always render-fresh without
  re-subscribing. Pairs are [isOpen, close] evaluated in priority order — first
  open pair wins, mirroring stacking order (confirm steps before their parent
  modals). Close functions should be the SAME handlers the modal's Cancel/✕
  button calls, including any in-flight guards, so Escape can never do more
  than a click already could.
*/
import { useEffect, useRef } from 'react';

/*
  Function Name: useEscapeClose

  LAYMAN (Tropang Ex):
  Ipasa mo ang mga modal ng page — [bukas ba?, paano isara] — nakaayos mula
  pinaka-ibabaw. Pag Escape, sasara yung unang bukas sa listahan. Yun lang.

  TECHNICAL:
  Subscribes once on mount; the handler walks the latest pairs (via ref) and
  invokes the first open pair's close fn, then stops. No-op when nothing is open.

  PARAMS:
  - pairs — Array<[boolean, () => void]> in stacking priority (topmost first).
            Truthy non-boolean gates (e.g. an object state) are accepted.

  RETURNS:
  Nothing. Side-effect-only hook.
*/
export default function useEscapeClose(pairs) {
  const pairsRef = useRef(pairs);
  pairsRef.current = pairs;

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      for (const [open, close] of pairsRef.current) {
        if (open) {
          close?.();
          return;
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
}
