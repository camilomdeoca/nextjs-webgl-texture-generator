import { ReactNode, useEffect, useState } from "react";

type UnmountOnConditionDelayedParams = {
  showCondition: boolean,
  children: ReactNode,
  delay?: number,
};

export function UnmountOnConditionDelayed({
  showCondition,
  children,
  delay,
}: UnmountOnConditionDelayedParams) {
  if (delay === undefined) {
    delay = 170; // --default-transition-duration value
  }

  const [shouldRender, setShouldRender] = useState(false);
  // TODO: Add mount animation.
  if (showCondition && !shouldRender) setShouldRender(true);
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (!showCondition && shouldRender) {
      timeoutId = setTimeout(() => setShouldRender(false), delay);
    }
    return () => clearTimeout(timeoutId);
  }, [delay, shouldRender, showCondition]);
  return shouldRender && children;
}
