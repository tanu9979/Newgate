const tileSize=32,rows=16,columns=16;
const boardWidth=tileSize*columns,boardHeight=tileSize*rows;
let board,ctx;

const ALIEN_TYPES=[
    {src:'./alien-yellow.png',  points:100,img:null},
    {src:'./alien.png',         points:200,img:null},
    {src:'./alien-cyan.png',    points:300,img:null},
    {src:'./alien-magenta.png', points:500,img:null},
];
let shipImg;
let ship;
const shipVelocityX=tileSize;

let alienArray=[],alienWidth=tileSize*2,alienHeight=tileSize;
let alienRows,alienColumns,alienCount=0,alienVelocityX=1;
let bulletArray=[],bulletVelocityY=-10;
let alienBullets=[],alienShootTimer=0,alienShootInterval=90;
let particles=[];
let score=0,level=1,gameState='start';
let highScore=parseInt(localStorage.getItem('spaceHigh'))||0, gamesPlayed=parseInt(localStorage.getItem('spaceGames'))||0;
let stars=[];
let audioCtx=null;

function getAudio(){
    if(!audioCtx) audioCtx=new(window.AudioContext||window.webkitAudioContext)();
    return audioCtx;
}
function playSound(type){
    try{
        const ac=getAudio();
        const o=ac.createOscillator(),g=ac.createGain();
        o.connect(g);g.connect(ac.destination);
        if(type==='shoot'){
            o.frequency.setValueAtTime(880,ac.currentTime);
            o.frequency.exponentialRampToValueAtTime(220,ac.currentTime+0.1);
            g.gain.setValueAtTime(0.08,ac.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+0.1);
            o.start();o.stop(ac.currentTime+0.1);
        } else if(type==='explode'){
            o.type='sawtooth';
            o.frequency.setValueAtTime(180,ac.currentTime);
            o.frequency.exponentialRampToValueAtTime(40,ac.currentTime+0.25);
            g.gain.setValueAtTime(0.12,ac.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+0.25);
            o.start();o.stop(ac.currentTime+0.25);
        } else if(type==='die'){
            o.type='sawtooth';
            o.frequency.setValueAtTime(300,ac.currentTime);
            o.frequency.exponentialRampToValueAtTime(30,ac.currentTime+0.5);
            g.gain.setValueAtTime(0.15,ac.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+0.5);
            o.start();o.stop(ac.currentTime+0.5);
        } else if(type==='levelup'){
            [440,550,660,880].forEach((f,i)=>{
                const oo=ac.createOscillator(),gg=ac.createGain();
                oo.connect(gg);gg.connect(ac.destination);
                oo.frequency.value=f;
                gg.gain.setValueAtTime(0.08,ac.currentTime+i*0.1);
                gg.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+i*0.1+0.15);
                oo.start(ac.currentTime+i*0.1);oo.stop(ac.currentTime+i*0.1+0.15);
            });
        }
    } catch(e){}
}

function initStars(){
    stars=[];
    for(let i=0;i<80;i++) stars.push({x:Math.random()*boardWidth,y:Math.random()*boardHeight,
        r:Math.random()*1.4+0.3,speed:Math.random()*0.4+0.1,phase:Math.random()*6});
}
function drawStars(){
    stars.forEach(s=>{
        s.y+=s.speed;if(s.y>boardHeight){s.y=0;s.x=Math.random()*boardWidth;}
        s.phase+=0.02;
        const alpha=0.3+0.4*Math.abs(Math.sin(s.phase));
        ctx.fillStyle=`rgba(255,255,255,${alpha})`;
        ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fill();
    });
}

function spawnParticles(x,y,color){
    for(let i=0;i<14;i++){
        const a=(Math.PI*2/14)*i+Math.random()*0.3,sp=1.5+Math.random()*3;
        particles.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,
            life:1,decay:0.025+Math.random()*0.025,size:2+Math.random()*2,color});
    }
}
function drawParticles(){
    particles=particles.filter(p=>p.life>0);
    particles.forEach(p=>{
        p.x+=p.vx;p.y+=p.vy;p.vy+=0.06;p.life-=p.decay;
        ctx.globalAlpha=p.life;ctx.fillStyle=p.color;
        ctx.fillRect(p.x-p.size/2,p.y-p.size/2,p.size,p.size);
    });
    ctx.globalAlpha=1;
}

function updateHUD(){
    document.getElementById('score-display').textContent=score;
    document.getElementById('level-display').textContent=level;
    document.getElementById('high-display').textContent=highScore;
    document.getElementById('lives-display').textContent='♦'.repeat(Math.max(0,ship.lives));
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
    bulletArray=[];alienBullets=[];particles=[];
    resetShip();createAliens();updateHUD();hideOverlay();gameState='playing';
}
function loseLife(){
    playSound('die');
    spawnParticles(ship.x+ship.width/2,ship.y+ship.height/2,'#ff8800');
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
    if(gameState!=='playing'){drawParticles();return;}

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
                spawnParticles(a.x+a.width/2,a.y+a.height/2,'#ffff44');
                playSound('explode');
                if(score>highScore){highScore=score;localStorage.setItem('spaceHigh',highScore);}
                updateHUD();
            }
        }
    }
    bulletArray=bulletArray.filter(b=>!b.used&&b.y>0);
    drawParticles();

    if(alienCount===0){
        level++;score+=alienColumns*alienRows*100;
        alienColumns=Math.min(alienColumns+1,columns/2-2);
        alienRows=Math.min(alienRows+1,rows-4);
        alienVelocityX=alienVelocityX>0?1+level*0.15:-(1+level*0.15);
        alienShootInterval=Math.max(38,90-level*5);
        bulletArray=[];alienBullets=[];
        if(score>highScore){highScore=score;localStorage.setItem('spaceHigh',highScore);}
        playSound('levelup');
        canvas_flash();
        createAliens();updateHUD();
    }
}
function canvas_flash(){
    board.style.boxShadow='0 0 50px #00ffff';
    setTimeout(()=>{board.style.boxShadow='0 0 40px rgba(0,100,255,0.25)';},600);
}

document.addEventListener('keydown',e=>{
    if(gameState!=='playing') return;
    if(e.code==='ArrowLeft'&&ship.x-shipVelocityX>=0) ship.x-=shipVelocityX;
    if(e.code==='ArrowRight'&&ship.x+shipVelocityX+ship.width<=boardWidth) ship.x+=shipVelocityX;
    if(e.code.startsWith('Arrow')) e.preventDefault();
});
document.addEventListener('keyup',e=>{
    if(e.code==='Space'){
        e.preventDefault();
        if(gameState==='playing'){
            bulletArray.push({x:ship.x+ship.width/2-2,y:ship.y,width:4,height:tileSize/2,used:false});
            playSound('shoot');
        }
    }
});

// Touch controls
let touchX=null;
document.addEventListener('touchstart',e=>{touchX=e.touches[0].clientX;},{passive:true});
document.addEventListener('touchend',e=>{
    if(touchX===null) return;
    const dx=e.changedTouches[0].clientX-touchX;
    if(gameState==='playing'){
        if(Math.abs(dx)<12){
            bulletArray.push({x:ship.x+ship.width/2-2,y:ship.y,width:4,height:tileSize/2,used:false});
            playSound('shoot');
        } else if(dx<0&&ship.x-shipVelocityX>=0) ship.x-=shipVelocityX;
        else if(dx>0&&ship.x+shipVelocityX+ship.width<=boardWidth) ship.x+=shipVelocityX;
    }
    touchX=null;
},{passive:true});

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
