(() => {
  "use strict";

  const boardEl = document.getElementById("board");
  const turnText = document.getElementById("turnText");
  const statusText = document.getElementById("statusText");
  const resetBtn = document.getElementById("resetBtn");

  const files = ["a","b","c","d","e","f","g","h"];
  const pieceSymbols = {
    w: { k:"♔", q:"♕", r:"♖", b:"♗", n:"♘", p:"♙" },
    b: { k:"♚", q:"♛", r:"♜", b:"♝", n:"♞", p:"♟" }
  };

  let state;
  let selected = null;
  let legalTargets = [];
  let gameOver = false;

  function initialBoard() {
    return [
      [
        {c:"b",t:"r"},{c:"b",t:"n"},{c:"b",t:"b"},{c:"b",t:"q"},
        {c:"b",t:"k"},{c:"b",t:"b"},{c:"b",t:"n"},{c:"b",t:"r"}
      ],
      Array(8).fill(null).map(() => ({c:"b",t:"p"})),
      Array(8).fill(null),
      Array(8).fill(null),
      Array(8).fill(null),
      Array(8).fill(null),
      Array(8).fill(null).map(() => ({c:"w",t:"p"})),
      [
        {c:"w",t:"r"},{c:"w",t:"n"},{c:"w",t:"b"},{c:"w",t:"q"},
        {c:"w",t:"k"},{c:"w",t:"b"},{c:"w",t:"n"},{c:"w",t:"r"}
      ]
    ];
  }

  function newGame() {
    state = {
      board: initialBoard(),
      turn: "w",
      castling: { wK:true, wQ:true, bK:true, bQ:true },
      enPassant: null,
      halfmove: 0,
      fullmove: 1,
      history: []
    };
    selected = null;
    legalTargets = [];
    gameOver = false;
    render();
    updateStatus();
  }

  function cloneBoard(board) {
    return board.map(row => row.map(p => p ? {...p} : null));
  }

  function inside(r,c) {
    return r >= 0 && r < 8 && c >= 0 && c < 8;
  }

  function opposite(color) {
    return color === "w" ? "b" : "w";
  }

  function squareName(r,c) {
    return files[c] + (8-r);
  }

  function parseSquare(s) {
    return [8 - Number(s[1]), files.indexOf(s[0])];
  }

  function findKing(board, color) {
    for (let r=0;r<8;r++) {
      for (let c=0;c<8;c++) {
        const p = board[r][c];
        if (p && p.c === color && p.t === "k") return [r,c];
      }
    }
    return null;
  }

  function isSquareAttacked(board, r, c, byColor) {
    // Pawns
    const pawnRow = byColor === "w" ? r + 1 : r - 1;
    for (const dc of [-1,1]) {
      const pc = c + dc;
      if (inside(pawnRow,pc)) {
        const p = board[pawnRow][pc];
        if (p && p.c === byColor && p.t === "p") return true;
      }
    }

    // Knights
    const knightSteps = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
    for (const [dr,dc] of knightSteps) {
      const rr=r+dr, cc=c+dc;
      if (inside(rr,cc)) {
        const p=board[rr][cc];
        if (p && p.c===byColor && p.t==="n") return true;
      }
    }

    // Kings
    for (let dr=-1;dr<=1;dr++) {
      for (let dc=-1;dc<=1;dc++) {
        if (!dr && !dc) continue;
        const rr=r+dr, cc=c+dc;
        if (inside(rr,cc)) {
          const p=board[rr][cc];
          if (p && p.c===byColor && p.t==="k") return true;
        }
      }
    }

    // Rooks / Queens
    const straight = [[-1,0],[1,0],[0,-1],[0,1]];
    for (const [dr,dc] of straight) {
      let rr=r+dr, cc=c+dc;
      while (inside(rr,cc)) {
        const p=board[rr][cc];
        if (p) {
          if (p.c===byColor && (p.t==="r" || p.t==="q")) return true;
          break;
        }
        rr+=dr; cc+=dc;
      }
    }

    // Bishops / Queens
    const diagonal = [[-1,-1],[-1,1],[1,-1],[1,1]];
    for (const [dr,dc] of diagonal) {
      let rr=r+dr, cc=c+dc;
      while (inside(rr,cc)) {
        const p=board[rr][cc];
        if (p) {
          if (p.c===byColor && (p.t==="b" || p.t==="q")) return true;
          break;
        }
        rr+=dr; cc+=dc;
      }
    }

    return false;
  }

  function inCheck(board, color) {
    const king = findKing(board,color);
    if (!king) return true;
    return isSquareAttacked(board, king[0], king[1], opposite(color));
  }

  function pseudoMoves(r,c, includeCastle=true) {
    const board = state.board;
    const p = board[r][c];
    if (!p) return [];

    const moves = [];
    const add = (rr,cc,extra={}) => {
      if (!inside(rr,cc)) return;
      const target=board[rr][cc];
      if (!target) moves.push({from:[r,c],to:[rr,cc],...extra});
      else if (target.c !== p.c && target.t !== "k") moves.push({from:[r,c],to:[rr,cc],capture:true,...extra});
    };

    if (p.t === "p") {
      const dir = p.c === "w" ? -1 : 1;
      const startRow = p.c === "w" ? 6 : 1;
      const promotionRow = p.c === "w" ? 0 : 7;

      if (inside(r+dir,c) && !board[r+dir][c]) {
        moves.push({from:[r,c],to:[r+dir,c],promotion:r+dir===promotionRow});
        if (r===startRow && !board[r+2*dir][c]) {
          moves.push({from:[r,c],to:[r+2*dir,c],doublePawn:true});
        }
      }

      for (const dc of [-1,1]) {
        const rr=r+dir, cc=c+dc;
        if (!inside(rr,cc)) continue;
        const target=board[rr][cc];
        if (target && target.c !== p.c && target.t !== "k") {
          moves.push({from:[r,c],to:[rr,cc],capture:true,promotion:rr===promotionRow});
        } else if (state.enPassant && state.enPassant[0]===rr && state.enPassant[1]===cc) {
          moves.push({from:[r,c],to:[rr,cc],enPassant:true,capture:true});
        }
      }
      return moves;
    }

    if (p.t === "n") {
      for (const [dr,dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) add(r+dr,c+dc);
      return moves;
    }

    if (p.t === "b" || p.t === "r" || p.t === "q") {
      const dirs = [];
      if (p.t==="b" || p.t==="q") dirs.push([-1,-1],[-1,1],[1,-1],[1,1]);
      if (p.t==="r" || p.t==="q") dirs.push([-1,0],[1,0],[0,-1],[0,1]);

      for (const [dr,dc] of dirs) {
        let rr=r+dr, cc=c+dc;
        while (inside(rr,cc)) {
          const target=board[rr][cc];
          if (!target) moves.push({from:[r,c],to:[rr,cc]});
          else {
            if (target.c!==p.c && target.t!=="k") moves.push({from:[r,c],to:[rr,cc],capture:true});
            break;
          }
          rr+=dr; cc+=dc;
        }
      }
      return moves;
    }

    if (p.t === "k") {
      for (let dr=-1;dr<=1;dr++) for (let dc=-1;dc<=1;dc++) {
        if (dr || dc) add(r+dr,c+dc);
      }

      if (includeCastle && !inCheck(board,p.c)) {
        const row = p.c==="w" ? 7 : 0;
        const kingSide = p.c==="w" ? state.castling.wK : state.castling.bK;
        const queenSide = p.c==="w" ? state.castling.wQ : state.castling.bQ;

        if (r===row && c===4 && kingSide &&
            board[row][5]===null && board[row][6]===null &&
            board[row][7] && board[row][7].c===p.c && board[row][7].t==="r" &&
            !isSquareAttacked(board,row,5,opposite(p.c)) &&
            !isSquareAttacked(board,row,6,opposite(p.c))) {
          moves.push({from:[r,c],to:[row,6],castle:"K"});
        }

        if (r===row && c===4 && queenSide &&
            board[row][1]===null && board[row][2]===null && board[row][3]===null &&
            board[row][0] && board[row][0].c===p.c && board[row][0].t==="r" &&
            !isSquareAttacked(board,row,3,opposite(p.c)) &&
            !isSquareAttacked(board,row,2,opposite(p.c))) {
          moves.push({from:[r,c],to:[row,2],castle:"Q"});
        }
      }
      return moves;
    }

    return moves;
  }

  function applyMoveToBoard(board, move, promotionType="q") {
    const next = cloneBoard(board);
    const [fr,fc]=move.from;
    const [tr,tc]=move.to;
    const p = next[fr][fc];
    next[fr][fc]=null;

    if (move.enPassant) {
      next[fr][tc]=null;
    }

    next[tr][tc] = {...p};

    if (move.promotion) {
      next[tr][tc].t = promotionType;
    }

    if (move.castle === "K") {
      next[tr][5]=next[tr][7];
      next[tr][7]=null;
    } else if (move.castle === "Q") {
      next[tr][3]=next[tr][0];
      next[tr][0]=null;
    }

    return next;
  }

  function legalMovesFor(r,c) {
    const p=state.board[r][c];
    if (!p || p.c!==state.turn) return [];

    const pseudo=pseudoMoves(r,c,true);
    return pseudo.filter(move => {
      const next=applyMoveToBoard(state.board,move,"q");
      return !inCheck(next,p.c);
    });
  }

  function allLegalMoves(color) {
    const originalTurn=state.turn;
    state.turn=color;
    const result=[];
    for (let r=0;r<8;r++) for (let c=0;c<8;c++) {
      const p=state.board[r][c];
      if (p && p.c===color) result.push(...legalMovesFor(r,c));
    }
    state.turn=originalTurn;
    return result;
  }

  function makeMove(move) {
    const p=state.board[move.from[0]][move.from[1]];
    const captured=state.board[move.to[0]][move.to[1]];

    let promotionType="q";
    if (move.promotion) {
      const answer=(prompt("Promosi pion:\n\nQ = Patih\nR = Benteng\nB = Gajah\nN = Kuda","Q")||"Q").toLowerCase();
      promotionType=["q","r","b","n"].includes(answer) ? answer : "q";
    }

    state.board=applyMoveToBoard(state.board,move,promotionType);

    if (p.t==="k") {
      if (p.c==="w") { state.castling.wK=false; state.castling.wQ=false; }
      else { state.castling.bK=false; state.castling.bQ=false; }
    }

    if (p.t==="r") {
      if (move.from[0]===7 && move.from[1]===0) state.castling.wQ=false;
      if (move.from[0]===7 && move.from[1]===7) state.castling.wK=false;
      if (move.from[0]===0 && move.from[1]===0) state.castling.bQ=false;
      if (move.from[0]===0 && move.from[1]===7) state.castling.bK=false;
    }

    if (captured && captured.t==="r") {
      if (move.to[0]===7 && move.to[1]===0) state.castling.wQ=false;
      if (move.to[0]===7 && move.to[1]===7) state.castling.wK=false;
      if (move.to[0]===0 && move.to[1]===0) state.castling.bQ=false;
      if (move.to[0]===0 && move.to[1]===7) state.castling.bK=false;
    }

    state.enPassant=null;
    if (p.t==="p" && Math.abs(move.to[0]-move.from[0])===2) {
      state.enPassant=[(move.to[0]+move.from[0])/2, move.from[1]];
    }

    if (p.t==="p" || captured) state.halfmove=0;
    else state.halfmove++;

    if (state.turn==="b") state.fullmove++;
    state.turn=opposite(state.turn);

    selected=null;
    legalTargets=[];
    render();
    updateStatus();
  }

  function render() {
    boardEl.innerHTML="";

    for (let r=0;r<8;r++) {
      for (let c=0;c<8;c++) {
        const square=document.createElement("div");
        square.className="square " + ((r+c)%2===0 ? "light":"dark");
        square.dataset.r=r;
        square.dataset.c=c;
        square.title=squareName(r,c);

        if (selected && selected[0]===r && selected[1]===c) {
          square.classList.add("selected");
        }

        const target=legalTargets.some(m=>m.to[0]===r && m.to[1]===c);
        if (target) {
          if (state.board[r][c]) square.classList.add("capture");
          else square.classList.add("possible");
        }

        const p=state.board[r][c];
        if (p) {
          const piece=document.createElement("span");
          piece.className="piece " + (p.c==="w" ? "white-piece":"black-piece");
          piece.textContent=pieceSymbols[p.c][p.t];
          square.appendChild(piece);
        }

        square.addEventListener("click",()=>clickSquare(r,c));
        boardEl.appendChild(square);
      }
    }

    const king=findKing(state.board,state.turn);
    if (king && inCheck(state.board,state.turn)) {
      const checkSquare=document.querySelector(`[data-r="${king[0]}"][data-c="${king[1]}"]`);
      if (checkSquare) checkSquare.classList.add("check");
    }
  }

  function clickSquare(r,c) {
    if (gameOver) return;

    const p=state.board[r][c];

    if (!selected) {
      if (p && p.c===state.turn) {
        selected=[r,c];
        legalTargets=legalMovesFor(r,c);
        render();
      }
      return;
    }

    const chosen=legalTargets.find(m=>m.to[0]===r && m.to[1]===c);

    if (chosen) {
      makeMove(chosen);
      return;
    }

    if (p && p.c===state.turn) {
      selected=[r,c];
      legalTargets=legalMovesFor(r,c);
      render();
      return;
    }

    selected=null;
    legalTargets=[];
    render();
  }

  function updateStatus() {
    const colorName=state.turn==="w" ? "Putih" : "Hitam";
    const moves=allLegalMoves(state.turn);
    const check=inCheck(state.board,state.turn);

    turnText.textContent=colorName;

    if (moves.length===0 && check) {
      gameOver=true;
      const winner=state.turn==="w" ? "Hitam" : "Putih";
      statusText.textContent=`Skakmat! ${winner} menang 👑`;
      return;
    }

    if (moves.length===0) {
      gameOver=true;
      statusText.textContent="Seri — stalemate 🤝";
      return;
    }

    if (state.halfmove>=100) {
      gameOver=true;
      statusText.textContent="Seri — aturan 50 langkah 🤝";
      return;
    }

    if (check) {
      statusText.textContent=`Skak! ${colorName} harus berhati-hati ⚠️`;
    } else {
      statusText.textContent="Permainan berlangsung";
    }
  }

  resetBtn.addEventListener("click",newGame);
  newGame();
})();
