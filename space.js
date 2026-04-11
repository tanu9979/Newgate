const tileSize=32,rows=16,columns=16;
const boardWidth=tileSize*columns,boardHeight=tileSize*rows;
let board,ctx;

const ALIEN_TYPES=[
    {src:'./alien-yellow.png',points:100,img:null},
    {src:'./alien.png',points:200,img:null},
    {src:'./alien-cyan.png',points:300,img:null},
    {src:'./alien-magenta.png',points:500,img:null},
];
let shipImg;
let ship;
const shipVelocityX=tileSize;

let alienArray=[],alienWidth=tileSize*2,alienHeight=tileSize;
let alienRows,alienColumns,alienCount=0,alienVelocityX=1;
let bulletArray=[],bulletVelocityY=-10;
let alienBullets=[],alienShootTimer=0,alienShootInterval=90;
let score=0,level=1,gameState='start';
let highScore=parseInt(localStorage.getItem('spaceHigh'))||0;
let stars=[];

function initStars(){
    stars=[];
    for(let i=0;i<80;i++) stars.push({x:Math.random()*boardWidth,y:Math.random()*boardHeight,
        r:Math.random()*1.4+0.3,speed:Math.random()*0.4+0.1});
}
function drawStars(){
    stars.forEach(s=>{
        s.y+=s.speed;if(s.y>boardHeight){s.y=0;s.x=Math.random()*boardWidth;}
        ctx.fillStyle=`rgba(255,255,255,${0.25+Math.random()*0.4})`;
        ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill();
    });
}
function updateHUD(){
    document.getElementById('score-display').textContent=score;
    document.getElementById('level-display').textContent=level;
    document.getElementById('high-display').textContent=highScore;
    document.getElementById('lives-display').textContent='♦'.repeat(ship.lives);
}
function showOverlay(title,msg,btn,scoreText){
    document.getElementById('overlay-title').textContent=title;
    document.getElementById('overlay-msg').textContent=msg;
    document.getElementById('overlay-btn').textContent=btn;
    const se=document.getElementById('overlay-score');
    se.textContent=scoreText||'';se.style.display=scoreText?'block':'none';
    document.getElementById('overlay').style.display='flex';
}
function hideOverlay(){document.getElementById('overlay').style.display='none';}
function resetShip(){
    ship={x:tileSize*columns/2-tileSize,y:tileSize*rows-tileSize*2,
          width:tileSize*2,height:tileSize,lives:3,invincible:false,invTimer:0};
}
function createAliens(){
    alienArray=[];
    for(let c=0;c<alienColumns;c++) for(let r=0;r<alienRows;r++){
        const t=ALIEN_TYPES[Math.min(r,ALIEN_TYPES.length-1)];
        alienArray.push({img:t.img,points:t.points,
            x:tileSize+c*alienWidth,y:tileSize+r*alienHeight,
            width:alienWidth,height:alienHeight,alive:true,wobble:Math.random()*6});
    }
    alienCount=alienArray.length;
}
function alienShoot(){
    const alive=alienArray.filter(a=>a.alive);
    if(!alive.length) return;
    const s=alive[Math.floor(Math.random()*alive.length)];
    alienBullets.push({x:s.x+s.width/2-2,y:s.y+s.height,width:4,height:12,speed:3+level*0.3,used:false});
}
function startGame(){
    score=0;level=1;alienRows=2;alienColumns=3;alienVelocityX=1;alienShootInterval=90;
    bulletArray=[];alienBullets=[];resetShip();createAliens();updateHUD();hideOverlay();gameState='playing';
}
function loseLife(){
    ship.lives--;updateHUD();
    if(ship.lives<=0){
        gameState='gameover';
        if(score>highScore){highScore=score;localStorage.setItem('spaceHigh',highScore);}
        updateHUD();
        showOverlay('GAME OVER','The aliens have won...','TRY AGAIN','SCORE: '+score+' | LEVEL: '+level);
        return;
    }
    ship.invincible=true;ship.invTimer=120;
    bulletArray=[];alienBullets=[];
    ship.x=tileSize*columns/2-tileSize;
}
let frame=0;
function update(){
    requestAnimationFrame(update);frame++;
    ctx.clearRect(0,0,boardWidth,boardHeight);
    drawStars();
    if(gameState!=='playing') return;
    if(ship.invincible){
        ship.invTimer--;if(ship.invTimer<=0) ship.invincible=false;
        if(Math.floor(frame/4)%2===0) ctx.drawImage(shipImg,ship.x,ship.y,ship.width,ship.height);
    } else ctx.drawImage(shipImg,ship.x,ship.y,ship.width,ship.height);

    let edge=false;
    for(let a of alienArray){
        if(!a.alive) continue;
        a.x+=alienVelocityX;a.wobble+=0.05;
        if(a.x+a.width>=boardWidth||a.x<=0) edge=true;
        ctx.drawImage(a.img,a.x,a.y+Math.sin(a.wobble)*2,a.width,a.height);
        if(a.y>=ship.y){loseLife();return;}
    }
    if(edge){alienVelocityX*=-1;for(let a of alienArray) a.y+=alienHeight;}

    alienShootTimer++;
    if(alienShootTimer>=alienShootInterval){alienShootTimer=0;alienShoot();}

    for(let b of alienBullets){
        b.y+=b.speed;
        ctx.fillStyle='#ff4455';ctx.shadowColor='#ff4455';ctx.shadowBlur=6;
        ctx.fillRect(b.x,b.y,b.width,b.height);ctx.shadowBlur=0;
        if(!ship.invincible&&!b.used&&detectCollision(b,ship)){b.used=true;loseLife();return;}
    }
    alienBullets=alienBullets.filter(b=>!b.used&&b.y<boardHeight);

    for(let bullet of bulletArray){
        bullet.y+=bulletVelocityY;
        ctx.fillStyle='rgba(0,255,255,0.95)';ctx.shadowColor='#00ffff';ctx.shadowBlur=8;
        ctx.fillRect(bullet.x,bullet.y,bullet.width,bullet.height);ctx.shadowBlur=0;
        for(let a of alienArray){
            if(!bullet.used&&a.alive&&detectCollision(bullet,a)){
                bullet.used=true;a.alive=false;alienCount--;score+=a.points;
                if(score>highScore){highScore=score;localStorage.setItem('spaceHigh',highScore);}
                updateHUD();
            }
        }
    }
    bulletArray=bulletArray.filter(b=>!b.used&&b.y>0);
    if(alienCount===0){
        level++;score+=alienColumns*alienRows*100;
        alienColumns=Math.min(alienColumns+1,columns/2-2);
        alienRows=Math.min(alienRows+1,rows-4);
        alienVelocityX=alienVelocityX>0?1+level*0.15:-(1+level*0.15);
        alienShootInterval=Math.max(40,90-level*5);
        bulletArray=[];alienBullets=[];
        if(score>highScore){highScore=score;localStorage.setItem('spaceHigh',highScore);}
        createAliens();updateHUD();
    }
}
document.addEventListener('keydown',e=>{
    if(gameState!=='playing') return;
    if(e.code==='ArrowLeft'&&ship.x-shipVelocityX>=0) ship.x-=shipVelocityX;
    if(e.code==='ArrowRight'&&ship.x+shipVelocityX+ship.width<=boardWidth) ship.x+=shipVelocityX;
    if(e.code.startsWith('Arrow')) e.preventDefault();
});
document.addEventListener('keyup',e=>{
    if(gameState!=='playing'||e.code!=='Space') return;
    e.preventDefault();
    bulletArray.push({x:ship.x+ship.width/2-2,y:ship.y,width:4,height:tileSize/2,used:false});
});
document.getElementById('overlay-btn').addEventListener('click',startGame);
function detectCollision(a,b){
    return a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
}
window.onload=function(){
    board=document.getElementById('board');
    board.width=boardWidth;board.height=boardHeight;ctx=board.getContext('2d');
    shipImg=new Image();shipImg.src='./ship.png';
    let loaded=0;
    function onLoad(){loaded++;if(loaded===ALIEN_TYPES.length+1){initStars();resetShip();updateHUD();requestAnimationFrame(update);}}
    shipImg.onload=onLoad;
    ALIEN_TYPES.forEach(t=>{t.img=new Image();t.img.src=t.src;t.img.onload=onLoad;});
    showOverlay('SPACE INVADERS','Defend Earth from the alien invasion!','START GAME',null);
};
