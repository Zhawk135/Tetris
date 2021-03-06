var gameController = (function () {
    
    const i = { states: [0x0F00, 0x2222, 0x00F0, 0x4444], color: 'cyan'   };
    const j = { states: [0x44C0, 0x8E00, 0x6440, 0x0E20], color: 'blue'   };
    const l = { states: [0x4460, 0x0E80, 0xC440, 0x2E00], color: 'orange' };
    const o = { states: [0xCC00, 0xCC00, 0xCC00, 0xCC00], color: 'yellow' };
    const s = { states: [0x06C0, 0x8C40, 0x6C00, 0x4620], color: 'green'  };
    const t = { states: [0x0E40, 0x4C40, 0x4E00, 0x4640], color: 'purple' };
    const z = { states: [0x0C60, 0x4C80, 0xC600, 0x2640], color: 'red'    };
    const board = {
        nx: 10,
        xy: 20, 
        nu: 5
    }

    const speed = { start: 0.6, decrement: 0.005, min: 0.1 }
    
    var pieces = [];
    var dx, dy, 
    blocks, 
    actions, 
    playing, 
    dt, 
    current, 
    next, 
    score, 
    rows, 
    step;
    
    function eachblock(type, x, y, dir, fn) {
        var bit, result, row = 0, col = 0, blocks = type.blocks[dir];
        for(bit = 0x8000 ; bit > 0 ; bit = bit >> 1) {
            if (blocks & bit) {
            fn(x + col, y + row);
            }
            if (++col === 4) {
            col = 0;
            ++row;
            }
        }
    };

    function occupied(type, x, y, dir) {
        var result = false
        eachblock(type, x, y, dir, function(x, y) {
            if ((x < 0) || (x >= nx) || (y < 0) || (y >= ny) || getBlock(x,y))
            result = true;
        });
        return result;
    };

    function unoccupied(type, x, y, dir) {
        return !occupied(type, x, y, dir);
    };

    function randomPiece() {
        if (pieces.length == 0)
            pieces = [i,i,i,i,j,j,j,j,l,l,l,l,o,o,o,o,s,s,s,s,t,t,t,t,z,z,z,z];
        var type = pieces.splice(random(0, pieces.length-1), 1)[0]; // remove a single piece
        return { type: type, dir: DIR.UP, x: 2, y: 0 };
    };

    function keydown(ev){
        if(playing){
            switch(ev.keyCode) {
                case KEY.LEFT:   actions.push(DIR.LEFT);  break;
                case KEY.RIGHT:  actions.push(DIR.RIGHT); break;
                case KEY.UP:     actions.push(DIR.UP);    break;
                case KEY.DOWN:   actions.push(DIR.DOWN);  break;
                case KEY.ESC:    lose();                  break;
            }
        }
        else if (ev.keyCode == KEY.SPACE) {
            play();
        }
    }

    function handle(action) {
        switch(action) {
            case DIR.LEFT:  move(DIR.LEFT);  break;
            case DIR.RIGHT: move(DIR.RIGHT); break;
            case DIR.UP:    rotate();        break;
            case DIR.DOWN:  drop();          break;
        }
    };

    function move(dir) {
        var x = current.x, y = current.y;
        switch(dir) {
            case DIR.RIGHT: x = x + 1; break;
            case DIR.LEFT:  x = x - 1; break;
            case DIR.DOWN:  y = y + 1; break;
        }
        if (unoccupied(current.type, x, y, current.dir)) {
            current.x = x;
            current.y = y;
            invalidate();
            return true;
        }
        else {
            return false;
        }
    };

    function rotate(dir) {
        var newdir = (current.dir == DIR.MAX ? DIR.MIN : current.dir + 1);
        if (unoccupied(current.type, current.x, current.y, newdir)) {
            current.dir = newdir;
            invalidate();
        }
    };

    function drop() {
        if (!move(DIR.DOWN)) {
            addScore(10);
            dropPiece();
            removeLines();
            setCurrentPiece(next);
            setNextPiece(randomPiece());
            if (occupied(current.type, current.x, current.y, current.dir)) {
            lose();
            }
        }
    };

    function dropPiece() {
        eachblock(current.type, current.x, current.y, current.dir, function(x, y) {
            setBlock(x, y, current.type);
        });
    };

    function setScore(n)            { score = n; invalidateScore(); };
    function addScore(n)            { score = score + n; };
    function setRows(n)             { rows = n; step = Math.max(speed.min, speed.start - (speed.decrement*rows)); invalidateRows(); };
    function addRows(n)             { setRows(rows + n); };
    function getBlock(x,y)          { return (blocks && blocks[x] ? blocks[x][y] : null); };
    function setBlock(x,y,type)     { blocks[x] = blocks[x] || []; blocks[x][y] = type; invalidate(); };
    function setCurrentPiece(piece) { current = piece || randomPiece(); invalidate();     };
    function setNextPiece(piece)    { next    = piece || randomPiece(); invalidateNext(); };

    //Stuff that Draws Stuff
    var invalid = {};

    function invalidate()         { invalid.court  = true; }
    function invalidateNext()     { invalid.next   = true; }
    function invalidateScore()    { invalid.score  = true; }
    function invalidateRows()     { invalid.rows   = true; }

    function draw() {
        ctx.save();
        ctx.lineWidth = 1;
        ctx.translate(0.5, 0.5); // for crisp 1px black lines
        drawCourt();
        drawNext();
        drawScore();
        drawRows();
        ctx.restore();
    };

    function drawCourt() {
        if (invalid.court) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (playing)
            drawPiece(ctx, current.type, current.x, current.y, current.dir);
            var x, y, block;
            for(y = 0 ; y < ny ; y++) {
            for (x = 0 ; x < nx ; x++) {
                if (block = getBlock(x,y))
                drawBlock(ctx, x, y, block.color);
            }
            }
            ctx.strokeRect(0, 0, nx*dx - 1, ny*dy - 1); // court boundary
            invalid.court = false;
        }
    };

    function drawNext() {
        if (invalid.next) {
            var padding = (nu - next.type.size) / 2; // half-arsed attempt at centering next piece display
            uctx.save();
            uctx.translate(0.5, 0.5);
            uctx.clearRect(0, 0, nu*dx, nu*dy);
            drawPiece(uctx, next.type, padding, padding, next.dir);
            uctx.strokeStyle = 'black';
            uctx.strokeRect(0, 0, nu*dx - 1, nu*dy - 1);
            uctx.restore();
            invalid.next = false;
        }
    };

    function drawScore() {
        if (invalid.score) {
            html('score', ("00000" + Math.floor(score)).slice(-5));
            invalid.score = false;
        }
    };

    function drawRows() {
        if (invalid.rows) {
            html('rows', rows);
            invalid.rows = false;
        }
    };

    function drawPiece(ctx, type, x, y, dir) {
        eachblock(type, x, y, dir, function(x, y) {
            drawBlock(ctx, x, y, type.color);
        });
    };

    function drawBlock(ctx, x, y, color) {
        ctx.fillStyle = color;
        ctx.fillRect(x*dx, y*dy, dx, dy);
        ctx.strokeRect(x*dx, y*dy, dx, dy)
    };

    return {
        keydown: keydown, 
        update: update,
        draw: draw,
        players: {}
    }
}); 