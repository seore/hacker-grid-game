/**
 * Characters:
 *  . = empty
 *  S = source (fixed vertical)
 *  T = target (fixed vertical)
 *  | = vertical straight
 *  - = horizontal straight
 *  L/R/J/7 = any corner (rotatable)
 *  X = 4-way cross junction
 *  Y = 3-way T-junction (rotatable)
 */

const LEVELS = [
  {
    id: 1,
    name: "Tutorial Link",
    size: 5,
    layout: [
      ".....",
      "..S..",
      "..|..",
      "..T..",
      ".....",
    ],
    parMoves: 4,
  },
  {
    id: 2,
    name: "Grid Boot",
    size: 5,
    layout: [
      ".SYX.",
      ".YXX.",
      ".X.X.",
      ".X.Y.",
      ".YXT.",
    ],
    parMoves: 14,
  },
  {
    id: 3,
    name: "Forked Lines",
    size: 5,
    layout: [
      ".SXY.",
      ".X.Y.",
      ".YXX.",
      ".X.Y.",
      ".TXY.",
    ],
    parMoves: 18,
  },
  {
    id: 4,
    name: "Core Loop",
    size: 6,
    layout: [
      ".SXY..",
      ".XXX..",
      ".XYXY.",
      ".XXXX.",
      "..YXT.",
      "......",
    ],
    parMoves: 24,
  },
  {
    id: 5,
    name: "Signal Web",
    size: 6,
    layout: [
      ".SXXXX",
      ".YXYXY",
      "XXYXXX",
      "YXYXYX",
      "XXXYYT",
      "......",
    ],
    parMoves: 30,
  },
  {
    id: 6,
    name: "Overload",
    size: 7,
    layout: [
      "..SXXXX",
      ".YXYXYX",
      "XXYXXYX",
      "YXYXXYX",
      "XXYXYXX",
      "YXXYXYT",
      ".......",
    ],
    parMoves: 38,
  },
  {
    id: 7,
    name: "Deep Access",
    size: 7,
    layout: [
      "SXXYXXX",
      "YXYXYXY",
      "XXYXXYX",
      "YXXYXXX",
      "XXYXYXY",
      "YXYXXYT",
      ".......",
    ],
    parMoves: 44,
  },
];
