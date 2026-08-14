export interface ArtSize {
  readonly dotsWidth: number;
  readonly dotsHeight: number;
  readonly rows: number;
}

export const minColumns = 8;
// Backwards-compatible advisory ceiling: this is the browser slider maximum,
// not a hard engine limit. artSize()/makeArt() intentionally accept larger values.
export const maxColumns = 2048;

export const artSize = (width: number, height: number, columns = 96): ArtSize => {
  const cols = Math.max(minColumns, Math.round(columns));
  const dotsWidth = cols * 2;
  const rawHeight = Math.max(4, Math.round(dotsWidth * height / width));
  const dotsHeight = Math.max(4, Math.round(rawHeight / 4) * 4);
  return { dotsWidth, dotsHeight, rows: dotsHeight / 4 };
};
