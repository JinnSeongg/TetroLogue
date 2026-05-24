type Props = {
  canContinue: boolean;
  onStartRun: () => void;
  onContinueRun: () => void;
};

export function MainMenuScreen({ canContinue, onStartRun, onContinueRun }: Props) {
  return (
    <main className="menu-screen">
      <section className="menu-hero">
        <p className="eyebrow">Tetris Roguelike Prototype</p>
        <h1>TetroLogue</h1>
        <p className="menu-copy">Clear lines, turn the result into damage, collect relics, and reach the boss.</p>
        <div className="menu-actions">
          <button className="primary-button" onClick={onStartRun}>
            Start Run
          </button>
          <button onClick={onContinueRun} disabled={!canContinue}>
            Continue
          </button>
        </div>
      </section>
    </main>
  );
}
