type Props = {
  fastChainCount?: number;
  isFastState?: boolean;
};

export function FastChainIndicator({ fastChainCount = 0, isFastState = false }: Props) {
  return (
    <section className={`fast-chain-indicator ${isFastState ? "active" : "inactive"}`} aria-label="Fast chain">
      <span>FAST CHAIN</span>
      <strong>{fastChainCount}</strong>
      <em>{isFastState ? "FAST ACTIVE" : "FAST READY"}</em>
    </section>
  );
}
