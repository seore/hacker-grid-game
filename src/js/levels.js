// src/js/levels.js

/**
 * Characters:
 *  . = empty
 *  S = source
 *  T = target
 *  | = vertical straight
 *  - = horizontal straight
 *  L = corner up-right
 *  R = corner right-down
 *  J = corner down-left
 *  7 = corner left-up
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
    name: "Offset Signal",
    size: 5,
    layout: [
      ".....",
      ".S-..",
      ".|L..",
      ".|.T.",
      ".....",
    ],
    parMoves: 8,
  },
  {
    id: 3,
    name: "Twisted Loop",
    size: 5,
    layout: [
      "S-7..",
      ".|.L.",
      ".L.JT",
      ".J-..",
      ".....",
    ],
    parMoves: 10,
  },
  {
    id: 4,
    name: "Crossed Paths",
    size: 6,
    layout: [
      "S-7...",
      ".|.L..",
      ".L-JT.",
      ".|.|..",
      ".J-7..",
      "......",
    ],
    parMoves: 14,
  },
];
