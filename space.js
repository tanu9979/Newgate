const tileSize = 32, rows = 16, columns = 16;
const boardWidth = tileSize * columns, boardHeight = tileSize * rows;

let board, ctx;
let shipImg, alienImg;

const shipWidth = tileSize * 2, shipHeight = tileSize;
let ship = { x: tileSize * columns / 2 - tileSize, y: tileSize * rows - tileSize * 2,
             width: tileSize * 2, height: tileSize };
const shipVelocityX = tileSize;

let alienArray = [], alienWidth = tileSize * 2, alienHeight = tileSize;
let alienRows = 2, alienColumns = 3, alienCount = 0, alienVelocityX = 1;
let bulletArray = [], bulletVelocityY = -10;
let score = 0, gameOver = false;

// Starfield
let stars = [];
function initStars() {
    for (let i = 0; i < 80; i++)
        stars.push({ x: Math.random()*boardWidth, y: Math.random()*boardHeight,
            r: Math.random()*1.4+0.3, speed: Math.random()*0.4+0.1 });
}
function drawStars() {
    stars.forEach(s => {
        s.y += s.speed;
        if (s.y > boardHeight) { s.y = 0; s.x = Math.random()*boardWidth; }
        ctx.fillStyle = `rgba(255,255,255,${0.3+Math.random()*0.5})`;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2); ctx.fill();
    });
}

window.onload = function() {
    board = document.getElementById("board");
    board.width = boardWidth; board.height = boardHeight;
    ctx = board.getContext("2d");
    shipImg = new Image(); shipImg.src = "./ship.png";
    alienImg = new Image(); alienImg.src = "./alien.png";
    alienImg.onload = createAliens;
    initStars();
    requestAnimationFrame(update);
    document.addEventListener("keydown", moveShip);
    document.addEventListener("keyup", shoot);
};

function update() {
    requestAnimationFrame(update);
    ctx.clearRect(0, 0, boardWidth, boardHeight);
    drawStars();
    if (gameOver) {
        ctx.fillStyle="#ff4455"; ctx.font="bold 24px Courier New";
        ctx.fillText("GAME OVER", boardWidth/2-70, boardHeight/2);
        return;
    }
    ctx.drawImage(shipImg, ship.x, ship.y, ship.width, ship.height);
    for (let alien of alienArray) {
        if (!alien.alive) continue;
        alien.x += alienVelocityX;
        if (alien.x + alien.width >= boardWidth || alien.x <= 0) {
            alienVelocityX *= -1; alien.x += alienVelocityX*2;
            for (let a of alienArray) a.y += alienHeight;
        }
        ctx.drawImage(alienImg, alien.x, alien.y, alien.width, alien.height);
        if (alien.y >= ship.y) gameOver = true;
    }
    for (let bullet of bulletArray) {
        bullet.y += bulletVelocityY;
        ctx.fillStyle="white";
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        for (let alien of alienArray) {
            if (!bullet.used && alien.alive && detectCollision(bullet, alien)) {
                bullet.used=true; alien.alive=false; alienCount--; score+=100;
            }
        }
    }
    while (bulletArray.length>0 && (bulletArray[0].used||bulletArray[0].y<0)) bulletArray.shift();
    if (alienCount===0) {
        score += alienColumns*alienRows*100;
        alienColumns = Math.min(alienColumns+1, columns/2-2);
        alienRows = Math.min(alienRows+1, rows-4);
        alienVelocityX = alienVelocityX>0 ? alienVelocityX+0.2 : alienVelocityX-0.2;
        alienArray=[]; bulletArray=[]; createAliens();
    }
    ctx.fillStyle="rgba(0,255,255,0.8)"; ctx.font="14px Courier New";
    ctx.fillText("Score: "+score, 5, 20);
}

function moveShip(e) {
    if (gameOver) return;
    if (e.code==="ArrowLeft"  && ship.x-shipVelocityX>=0) ship.x-=shipVelocityX;
    if (e.code==="ArrowRight" && ship.x+shipVelocityX+ship.width<=boardWidth) ship.x+=shipVelocityX;
}
function shoot(e) {
    if (gameOver||e.code!=="Space") return;
    bulletArray.push({x:ship.x+ship.width/2-2, y:ship.y, width:4, height:tileSize/2, used:false});
}
function createAliens() {
    for (let c=0;c<alienColumns;c++) for (let r=0;r<alienRows;r++)
        alienArray.push({img:alienImg, x:tileSize+c*alienWidth, y:tileSize+r*alienHeight,
            width:alienWidth, height:alienHeight, alive:true});
    alienCount=alienArray.length;
}
function detectCollision(a,b){
    return a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
}
