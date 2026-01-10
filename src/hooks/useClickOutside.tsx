import { RefObject, useEffect } from "react";

export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  handler: (ev: Event) => void,
) {
  useEffect(() => {

    // Function for click event
    function handleOutsideClick(event: Event) {
      if (!ref.current) return;
      if (!(event.target instanceof Node)) return;
      if (ref.current.contains(event.target)) return;
      console.log("Click outside");
      handler(event);
    }

    // Adding click event listener
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [handler, ref]);
}
