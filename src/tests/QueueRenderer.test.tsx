import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { QueueRenderer } from "../presentation/components/QueueRenderer";
import type { TetrominoType } from "../domain/tetris/Cell";

describe("QueueRenderer", () => {
  it.each([
    ["default preview", ["I", "O", "T", "S", "Z"], 5],
    ["compressed preview", ["I", "O", "T"], 3],
    ["wide preview", ["I", "O", "T", "S", "Z", "J"], 6],
    ["deep preview", ["I", "O", "T", "S", "Z", "J", "L"], 7],
  ] satisfies Array<[string, TetrominoType[], number]>)("renders all pieces for %s", (_label, nextPieces, expectedCount) => {
    const markup = renderToStaticMarkup(<QueueRenderer nextPieces={nextPieces} />);

    expect(markup.match(/class="queue-piece"/g)).toHaveLength(expectedCount);
  });
});
