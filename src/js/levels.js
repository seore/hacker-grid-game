/**
 * Characters:
 *  . = empty
 *  S = source (fixed vertical)
 *  T = target (fixed vertical)
 *  | = vertical straight
 *  - = horizontal straight
 *  L = corner up-right
 *  R = corner right-down
 *  J = corner down-left
 *  7 = corner left-up
 */

const LEVELS = [
  // Level 1
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

  // Level 2
  {
    id: 2,
    name: "Offset Signal",
    size: 5,
    layout: [
      ".....",
      ".S|..",  
      ".LJ..",  
      "..T..", 
      ".....",
    ],
    parMoves: 8,
  },

  // Level 3
  {
    id: 3,
    name: "Twisted Loop",
    size: 5,
    layout: [
      "..S..",  
      "..|..",  
      "..L-R",  
      "....|",  
      "....T",  
    ],
    parMoves: 12,
  },

  // Level 4
  {
    id: 4,
    name: "Crossed Paths",
    size: 6,
    layout: [
      ".S....",  
      ".|....",  
      ".L-J..",  
      "...|..",  
      "...|..",  
      "...T..",  
    ],
    parMoves: 16,
  },

  // Level 5
  {
    id: 5,
    name: "Signal Maze",
    size: 6,
    layout: [
      "..S...",
      "..|...",
      "..L--R",
      ".....|",
      "...J-7",
      "...T..",
    ],
    parMoves: 18,
  },

  // Level 6
  {
    id: 6,
    name: "Long Circuit",
    size: 7,
    layout: [
      "...S...",
      "...|...",
      "...L--R",
      "......|",
      "......|",
      "...7--7",
      "...T...",
    ],
    parMoves: 22,
  },

  // Level 7
  {
    id: 7,
    name: "Deep Access",
    size: 7,
    layout: [
      ".S.....",
      ".|.....",
      ".L--R..",
      "....|..",
      "....L-J",
      "......|",
      "......T",
    ],
    parMoves: 26,
  },
];
