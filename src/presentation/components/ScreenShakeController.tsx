import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { CombatFeedbackEvent } from "../../domain/combat/CombatFeedbackEvent";
import { ScreenShakeService } from "../services/ScreenShakeService";

type Props = {
  event?: CombatFeedbackEvent;
  enabled?: boolean;
  children: (style: CSSProperties) => ReactNode;
};

export function ScreenShakeController({ event, enabled = true, children }: Props) {
  const service = useMemo(() => new ScreenShakeService(), []);
  const [style, setStyle] = useState<CSSProperties>({});
  const frameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (frameRef.current !== undefined) window.cancelAnimationFrame(frameRef.current);
    if (!enabled) {
      setStyle({});
      return;
    }

    const config = service.configFor(event);
    if (!config) {
      setStyle({});
      return;
    }

    const startedAt = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startedAt;
      if (elapsed >= config.durationMs) {
        setStyle({});
        return;
      }
      const frame = service.frameAt(elapsed, config);
      setStyle({
        transform: `translate3d(${frame.x.toFixed(2)}px, ${frame.y.toFixed(2)}px, 0) rotate(${frame.rotationDeg.toFixed(3)}deg)`,
      });
      frameRef.current = window.requestAnimationFrame(tick);
    };

    frameRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== undefined) window.cancelAnimationFrame(frameRef.current);
    };
  }, [enabled, event, service]);

  return <>{children(style)}</>;
}
