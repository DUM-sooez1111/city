(() => {
  'use strict';
  const canvas = document.getElementById('world');
  const ctx = canvas.getContext('2d');
  const $ = (id) => document.getElementById(id);
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const WORLD = { w: 1280, h: 720 };
  const sites = [
    { id:'banana', name:'바나나 농장', icon:'🍌', x:485, y:505, cost:100, base:9, color:'#e7c845', built:false, level:0 },
    { id:'lumber', name:'벌목장', icon:'🪵', x:720, y:500, cost:180, base:15, color:'#c88643', built:false, level:0 },
    { id:'mine', name:'석재 광산', icon:'⛏', x:900, y:470, cost:420, base:32, color:'#8c9497', built:false, level:0 },
    { id:'port', name:'무역 항구', icon:'⚓', x:260, y:470, cost:760, base:55, color:'#4996b9', built:false, level:0 },
  ];
  const state = Object.assign({ coins:250, wood:0, bananas:0, stone:0, xp:0, level:1, totalEarned:0, quest:0, sound:true, boostUntil:0, trucks:{}, roadLevel:1 }, JSON.parse(localStorage.getItem('idle-island-save') || '{}'));
  if (state.sites) sites.forEach((s,i) => Object.assign(s,state.sites[i] || {}));
  let scale=1, offsetX=0, offsetY=0, t=0, last=performance.now(), saveTimer=0, focused=null;

  function resize(){
    const r=canvas.getBoundingClientRect(); canvas.width=Math.round(r.width*DPR); canvas.height=Math.round(r.height*DPR);
    scale=Math.max(r.width/WORLD.w,r.height/WORLD.h); const cameraX=r.width<r.height&&state.level<3?535:WORLD.w/2; offsetX=r.width/2-cameraX*scale; offsetY=(r.height-WORLD.h*scale)/2;
    ctx.setTransform(DPR*scale,0,0,DPR*scale,DPR*offsetX,DPR*offsetY);
  }
  window.addEventListener('resize',resize); resize();
  const path=(draw,fill,stroke='#29454a',width=3)=>{ctx.beginPath();draw();if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.lineJoin='round';ctx.stroke()}};
  const rr=(x,y,w,h,r)=>{ctx.beginPath();ctx.roundRect(x,y,w,h,r)};
  function tree(x,y,s=1,c='#579638'){ctx.fillStyle='#79562f';ctx.fillRect(x-3*s,y,6*s,15*s);ctx.beginPath();ctx.arc(x,y-2*s,13*s,0,7);ctx.arc(x-8*s,y+3*s,9*s,0,7);ctx.arc(x+8*s,y+3*s,9*s,0,7);ctx.fillStyle=c;ctx.fill();ctx.strokeStyle='#315b2d';ctx.lineWidth=2;ctx.stroke()}
  function road(points,width=36){ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#e8d6ca';ctx.lineWidth=width+12;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.stroke();ctx.strokeStyle='#82878a';ctx.lineWidth=width;ctx.stroke();ctx.strokeStyle='#d5d5c9';ctx.lineWidth=3;ctx.setLineDash([12,12]);ctx.stroke();ctx.setLineDash([]);ctx.lineCap='butt'}
  function building(x,y,w,h,color,roof='#f4e7d4'){ctx.save();ctx.translate(x,y);ctx.fillStyle='#4e6b6e55';ctx.fillRect(-w/2+8,-h/2+10,w,h);path(()=>ctx.rect(-w/2,-h/2,w,h),color,'#304e54',3);path(()=>{ctx.moveTo(-w/2-5,-h/2);ctx.lineTo(0,-h/2-18);ctx.lineTo(w/2+5,-h/2);ctx.lineTo(w/2-1,-h/2+12);ctx.lineTo(-w/2+1,-h/2+12);ctx.closePath()},roof,'#304e54',3);ctx.fillStyle='#85cbea';ctx.fillRect(-w/2+8,-8,13,17);ctx.fillRect(w/2-21,-8,13,17);ctx.strokeStyle='#304e54';ctx.strokeRect(-w/2+8,-8,13,17);ctx.strokeRect(w/2-21,-8,13,17);ctx.restore()}
  function drawWater(){ctx.fillStyle='#46c6ef';ctx.fillRect(0,0,WORLD.w,WORLD.h);ctx.globalAlpha=.16;ctx.strokeStyle='white';ctx.lineWidth=3;for(let y=35;y<WORLD.h;y+=42){ctx.beginPath();for(let x=-40;x<WORLD.w+40;x+=60){ctx.moveTo(x+(y%80),y);ctx.quadraticCurveTo(x+15+(y%80),y-5,x+31+(y%80),y)}ctx.stroke()}ctx.globalAlpha=1}
  function drawIsland(){
    path(()=>{ctx.moveTo(80,0);ctx.bezierCurveTo(50,90,115,155,85,245);ctx.bezierCurveTo(48,354,102,418,70,530);ctx.bezierCurveTo(135,662,290,700,455,677);ctx.bezierCurveTo(575,710,732,690,850,648);ctx.bezierCurveTo(1000,670,1190,610,1280,520);ctx.lineTo(1280,0);ctx.closePath()},'#a9cf6d','#f1dab4',17);
    ctx.save();path(()=>{ctx.moveTo(78,0);ctx.bezierCurveTo(50,90,115,155,85,245);ctx.bezierCurveTo(48,354,102,418,70,530);ctx.bezierCurveTo(135,662,290,700,455,677)},null,'#fff0c9',5);ctx.restore();
    // forest patches
    [[130,85],[180,60],[235,110],[1060,95],[1120,70],[1180,125],[1020,180],[580,90],[650,65],[720,110],[1080,560],[1140,530],[1190,575],[570,600],[630,625]].forEach((p,i)=>tree(p[0],p[1],1.15,i%3===0?'#4d8e35':'#659f3c'));
    road([[0,190],[180,190],[300,240],[425,260],[560,350],[730,365],[875,425],[1040,440],[1280,365]],42);
    road([[565,350],[575,205],[670,120],[820,0]],34); road([[875,425],[900,530],[985,640]],32); road([[300,240],[230,340],[260,470]],30);
    // rail line
    ctx.strokeStyle='#4f5960';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(0,135);ctx.lineTo(190,135);ctx.quadraticCurveTo(260,135,310,185);ctx.lineTo(410,220);ctx.stroke();ctx.strokeStyle='#d6d1bd';ctx.lineWidth=2;ctx.setLineDash([8,7]);ctx.stroke();ctx.setLineDash([]);
    for(let x=0;x<200;x+=16){ctx.fillStyle='#5c5145';ctx.fillRect(x,127,3,16)}
    // bridge and dock
    ctx.fillStyle='#757e82';ctx.fillRect(220,390,72,170);ctx.strokeStyle='#3a5158';ctx.strokeRect(220,390,72,170);ctx.fillStyle='#d3c3a4';for(let y=400;y<550;y+=18)ctx.fillRect(226,y,60,8);
    ctx.fillStyle='#637b80';ctx.fillRect(85,525,180,26);ctx.fillRect(85,580,130,22);ctx.strokeStyle='#314d54';ctx.strokeRect(85,525,180,26);ctx.strokeRect(85,580,130,22);
    // The game begins on one small southern peninsula. The mainland opens as the island levels up.
  }
  function drawScenery(){
    // factory and farm plots
    building(570,175,86,58,'#ded9cc','#da9a48');ctx.fillStyle='#7b8d91';ctx.fillRect(600,115,13,45);ctx.strokeStyle='#304e54';ctx.strokeRect(600,115,13,45);
    path(()=>ctx.ellipse(485,505,105,70,0,0,7),'#8ac557','#5d8c3c',3);
    for(let row=0;row<4;row++)for(let col=0;col<6;col++){const x=435+col*19+(row%2)*6,y=472+row*20;ctx.fillStyle='#8b622f';ctx.fillRect(x-1,y,3,8);ctx.fillStyle='#e5c42e';ctx.beginPath();ctx.arc(x-5,y,5,0,7);ctx.arc(x+5,y,5,0,7);ctx.fill()}
    building(720,500,65,48,'#c99a58','#855624');
    // lumber yard logs
    for(let i=0;i<7;i++){ctx.fillStyle='#9d612f';ctx.fillRect(758+(i%3)*13,470+Math.floor(i/3)*11,28,8);ctx.strokeStyle='#5f3e24';ctx.strokeRect(758+(i%3)*13,470+Math.floor(i/3)*11,28,8)}
    // mine
    path(()=>{ctx.moveTo(832,475);ctx.lineTo(875,402);ctx.lineTo(965,420);ctx.lineTo(1002,500);ctx.lineTo(945,560);ctx.lineTo(850,540);ctx.closePath()},'#777b76','#4e5554',4);
    path(()=>{ctx.moveTo(878,476);ctx.quadraticCurveTo(902,440,928,476);ctx.lineTo(928,520);ctx.lineTo(878,520);ctx.closePath()},'#34434a','#202d31',4);
    ctx.strokeStyle='#d29531';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(885,512);ctx.lineTo(885,463);ctx.lineTo(921,463);ctx.lineTo(921,512);ctx.stroke();
    building(1080,335,80,58,'#d7d4c7','#e09249'); building(1150,410,62,48,'#d69b5c','#a65c34');
    // airport locked
    ctx.fillStyle='#b9b9ae';ctx.fillRect(1070,15,150,45);ctx.strokeStyle='#647477';ctx.strokeRect(1070,15,150,45);ctx.fillStyle='#f7f4df';ctx.fillRect(1085,35,120,4);ctx.font='bold 17px Nunito';ctx.fillStyle='#455a60';ctx.fillText('✈  LEVEL 8',1090,47);
  }
  function drawSite(s){
    if(s.built){
      ctx.fillStyle='#fff';ctx.strokeStyle='#304e54';ctx.lineWidth=3;ctx.beginPath();ctx.arc(s.x,s.y-75,25,0,7);ctx.fill();ctx.stroke();ctx.font='22px serif';ctx.textAlign='center';ctx.fillText(s.icon,s.x,s.y-67);ctx.font='900 12px Nunito';ctx.fillStyle='#263f45';ctx.fillText(`Lv.${s.level}`,s.x,s.y-97);
      const pulse=1+Math.sin(t*3+s.x)*.08;ctx.save();ctx.translate(s.x+32,s.y-62);ctx.scale(pulse,pulse);ctx.fillStyle='#ffe03e';ctx.strokeStyle='white';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,12,0,7);ctx.fill();ctx.stroke();ctx.restore();
    } else {
      const pulse=1+Math.sin(t*2+s.x)*.06;ctx.save();ctx.translate(s.x,s.y-68);ctx.scale(pulse,pulse);ctx.fillStyle='#fffdf0';ctx.strokeStyle='#304e54';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,29,0,7);ctx.fill();ctx.stroke();ctx.fillStyle='#72c941';ctx.beginPath();ctx.arc(0,0,21,0,7);ctx.fill();ctx.fillStyle='white';ctx.font='900 25px Nunito';ctx.textAlign='center';ctx.fillText('+',0,9);ctx.restore();
    }
  }
  function drawVehicles(){
    const roadSpeed=1+(state.roadLevel-1)*.22,u=(t*.035*roadSpeed)%1;let x=300+(1040-300)*u,y=240+(440-240)*u;const topLevel=Math.max(1,...sites.filter(s=>s.built).map(s=>s.level)),tier=Math.min(4,Math.floor(topLevel/15));const colors=['#4b91dc','#f0b62d','#e94f47','#7651b5','#303b42'];const lengths=[25,29,34,39,45];ctx.save();ctx.translate(x,y);ctx.rotate(.22);ctx.fillStyle=colors[tier];ctx.strokeStyle='#2c4950';ctx.lineWidth=2;ctx.fillRect(-lengths[tier]/2,-8,lengths[tier],16);ctx.strokeRect(-lengths[tier]/2,-8,lengths[tier],16);ctx.fillStyle='#d9eff3';ctx.fillRect(-lengths[tier]/2+5,-6,8,12);if(tier>=2){ctx.fillStyle='#f4d97f';ctx.fillRect(3,-6,lengths[tier]/2-5,12)}ctx.restore();
    if(state.roadLevel>1){ctx.save();ctx.translate(0,Math.sin(t*5)*2);ctx.fillStyle='#efc52d';ctx.font='900 22px Nunito';for(let i=0;i<Math.min(5,state.roadLevel);i++)ctx.fillText('›',280+i*65,416+i*4);ctx.restore()}
    const shipX=90+((t*18)%260);ctx.save();ctx.translate(shipX,615);ctx.fillStyle='#c75142';path(()=>{ctx.moveTo(-28,-10);ctx.lineTo(28,-10);ctx.lineTo(19,12);ctx.lineTo(-20,12);ctx.closePath()},'#c95547','#314d54',3);ctx.fillStyle='#e5e2d1';ctx.fillRect(-14,-22,24,13);ctx.restore();
  }
  function drawLockedFog(){
    if(state.level>=3)return;
    ctx.save();
    ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(WORLD.w,0);ctx.lineTo(WORLD.w,330);ctx.bezierCurveTo(980,375,760,335,590,390);ctx.bezierCurveTo(410,430,220,345,0,395);ctx.closePath();ctx.clip();
    const fog=ctx.createRadialGradient(535,330,35,535,250,520);fog.addColorStop(0,'rgba(30,52,38,.52)');fog.addColorStop(.55,'rgba(22,41,37,.72)');fog.addColorStop(1,'rgba(13,28,33,.86)');ctx.fillStyle=fog;ctx.fillRect(0,0,WORLD.w,430);
    ctx.globalAlpha=.24;for(let i=0;i<14;i++){ctx.fillStyle='#0b2224';ctx.beginPath();ctx.arc(80+i*94,90+(i%4)*66,65+(i%3)*20,0,7);ctx.fill()}ctx.globalAlpha=1;
    ctx.textAlign='center';ctx.fillStyle='white';ctx.font='900 46px serif';ctx.fillText('☝',535,238);ctx.font='900 25px Nunito';ctx.fillText('✦   ✦',535,183);ctx.font='900 13px Nunito';ctx.fillText('LEVEL 3에서 본섬 해금',535,276);
    ctx.restore();
    ctx.save();ctx.strokeStyle='#b6ec63';ctx.globalAlpha=.6;ctx.lineWidth=5;ctx.shadowColor='#64d33d';ctx.shadowBlur=18;ctx.beginPath();ctx.moveTo(0,395);ctx.bezierCurveTo(220,345,410,430,590,390);ctx.bezierCurveTo(760,335,980,375,WORLD.w,330);ctx.stroke();ctx.restore();
  }
  function draw(){ctx.setTransform(DPR*scale,0,0,DPR*scale,DPR*offsetX,DPR*offsetY);drawWater();drawIsland();drawScenery();sites.forEach(drawSite);drawVehicles();drawLockedFog();}
  function update(dt){
    t+=dt; const boost=Date.now()<state.boostUntil?2:1; const incomePerSecond=sites.filter(s=>s.built).reduce((n,s)=>n+facilityIncome(s)/facilityTime(s),0)*boost; state.coins+=incomePerSecond*dt; state.totalEarned+=incomePerSecond*dt;
    saveTimer+=dt;if(saveTimer>3){save();saveTimer=0}updateHUD();
  }
  function loop(now){const dt=Math.min((now-last)/1000,.05);last=now;update(dt);draw();requestAnimationFrame(loop)}requestAnimationFrame(loop);
  function save(){state.sites=sites.map(({built,level})=>({built,level}));localStorage.setItem('idle-island-save',JSON.stringify(state))}
  function fmt(n){if(n>=1e6)return(n/1e6).toFixed(2)+'m';if(n>=1e3)return(n/1e3).toFixed(2)+'k';return Math.floor(n).toLocaleString('ko-KR')}
  function milestoneCount(s){return Math.floor(s.level/15)}
  function facilityIncome(s){return s.base*s.level*Math.pow(1.5,milestoneCount(s))*(state.trucks[s.id]||1)}
  function facilityTime(s){return Math.max(2,(16-s.level*.35)/Math.pow(1.5,milestoneCount(s)))}
  function updateHUD(){
    $('coins').textContent=fmt(state.coins);$('wood').textContent=fmt(state.wood);$('bananas').textContent=fmt(state.bananas);$('playerLevel').textContent=state.level;$('xpText').textContent=`${state.xp} / ${state.level*100} XP`;
    const remain=Math.max(0,Math.ceil((state.boostUntil-Date.now())/1000));$('boostTime').textContent=remain?`${String(Math.floor(remain/60)).padStart(2,'0')}:${String(remain%60).padStart(2,'0')}`:'10:00';$('speedBoost').classList.toggle('active',remain>0);const roadCost=Math.round(2000*Math.pow(1.65,state.roadLevel-1));$('roadLevel').textContent=`ROAD Lv.${state.roadLevel}`;$('roadCost').textContent=state.roadLevel>=10?'MAX':`● ${fmt(roadCost)}`;$('roadUpgrade').classList.toggle('max',state.roadLevel>=10);
    const quest=sites.find(s=>!s.built);$('questText').textContent=quest?`${quest.name} 건설`:'섬 수입 10,000 달성';const p=quest?(state.coins/quest.cost)*100:(state.totalEarned/10000)*100;$('questBar').style.width=Math.min(100,p)+'%';$('questReward').textContent=quest?`+${Math.round(quest.cost*.4)}`:'+500';
  }
  function screenToWorld(clientX,clientY){const r=canvas.getBoundingClientRect();return{x:(clientX-r.left-offsetX)/scale,y:(clientY-r.top-offsetY)/scale}}
  canvas.addEventListener('pointerup',(e)=>{if(!$('welcome').classList.contains('closed'))return;const p=screenToWorld(e.clientX,e.clientY);const s=sites.find(x=>Math.hypot(p.x-x.x,p.y-(x.y-55))<55);if(!s){if(state.level<3&&p.y<400)toast('본섬은 레벨 3에 해금됩니다');return}if(!s.built){focused=s;openBuild()}else{collect(s,e.clientX,e.clientY);openFacility(s)}});
  function collect(s,x,y){const gain=Math.max(10,Math.round(facilityIncome(s)*3));state.coins+=gain;state.xp+=4; if(s.id==='banana')state.bananas+=s.level;if(s.id==='lumber')state.wood+=s.level;if(state.xp>=state.level*100){state.xp-=state.level*100;state.level++;toast(`섬 레벨 ${state.level} 달성!`)}popIncome(x,y,`+${gain}`);save()}
  function popIncome(x,y,text){const n=document.createElement('span');n.className='income-pop';n.textContent=text;n.style.left=x+'px';n.style.top=y+'px';$('incomeLayer').appendChild(n);setTimeout(()=>n.remove(),1000)}
  function toast(msg){const el=$('toast');el.textContent=msg;el.classList.add('show');clearTimeout(el._timer);el._timer=setTimeout(()=>el.classList.remove('show'),1800)}
  function openSheet(title,eyebrow,html){$('sheetTitle').textContent=title;$('sheetEyebrow').textContent=eyebrow;$('sheetContent').innerHTML=html;$('sheet').classList.remove('hidden')}
  function card(s){const next=s.built?Math.round(s.cost*Math.pow(1.55,s.level)):s.cost,unlock=({banana:1,lumber:2,mine:3,port:5}[s.id]);return `<article class="build-card ${state.level<unlock?'locked':''}"><span class="card-art">${s.icon}</span><h3>${s.name}</h3><p>${state.level<unlock?`섬 레벨 ${unlock}에 개방`:s.built?`Lv.${s.level} · ${fmt(facilityIncome(s))} / ${facilityTime(s).toFixed(1)}초`:`생산 시설을 건설합니다.`}</p><button data-build="${s.id}" ${state.coins<next||state.level<unlock?'disabled':''}>${state.level<unlock?'🔒 LOCKED':`${s.built?'UPGRADE':'BUILD'} · ● ${fmt(next)}`}</button></article>`}
  function bindBuildButtons(){document.querySelectorAll('[data-build]').forEach(b=>b.onclick=()=>build(b.dataset.build))}
  function openBuild(){openSheet(focused?focused.name:'섬 개발','ISLAND DEVELOPMENT',focused?card(focused):sites.map(card).join(''));bindBuildButtons()}
  function openFacility(s){
    focused=s;$('sheet').classList.add('hidden');$('facilityIcon').textContent=s.icon;$('facilityName').textContent=s.name;$('facilityLevel').textContent=`LV.${s.level}`;$('facilityStars').textContent='★'.repeat(Math.min(5,milestoneCount(s)))+'☆'.repeat(Math.max(0,5-milestoneCount(s)));$('facilityIncome').textContent=fmt(facilityIncome(s));$('facilityTime').textContent=facilityTime(s).toFixed(1)+'초';const cost=Math.round(s.cost*Math.pow(1.55,s.level));$('facilityUpgrade').textContent=`● ${fmt(cost)}`;$('facilityUpgrade').disabled=state.coins<cost;const trucks=state.trucks[s.id]||1;$('truckCount').textContent=`${trucks}/3`;$('truckUpgrade').textContent=`● ${fmt(900*trucks*trucks)}`;$('truckUpgrade').disabled=trucks>=3;$('perfectChance').textContent=Math.min(50,5+s.level*2)+'%';const tier=Math.min(4,milestoneCount(s)),within=s.level%15;const tierIcons=['🚙','🚚','🚛','🚒','🏎️'],tierNames=['소형 화물차','중형 화물차','대형 윙바디','고성능 운송차','마스터 트럭'];$('truckPreview').textContent=tierIcons[tier];$('truckTierName').textContent=tierNames[tier];$('evolutionText').textContent=tier===4?'MAX':`${within} / 15`;$('evolutionBar').style.width=(tier===4?100:within/15*100)+'%';$('milestoneBonus').textContent=milestoneCount(s)?`마일스톤 ${milestoneCount(s)}단계 · 수익/속도 ×${Math.pow(1.5,milestoneCount(s)).toFixed(2)}`:'15레벨 달성 시 트럭 진화 · 수익과 생산 속도 +50%';$('facilityPanel').classList.remove('hidden');
    $('facilityUpgrade').onclick=()=>{build(s.id);openFacility(s)};$('truckUpgrade').onclick=()=>upgradeTruck(s);
  }
  function upgradeTruck(s){const n=state.trucks[s.id]||1,c=900*n*n;if(n>=3)return;if(state.coins<c)return toast('코인이 부족합니다');state.coins-=c;state.trucks[s.id]=n+1;toast('트럭 업그레이드!');save();openFacility(s)}
  function build(id){const s=sites.find(x=>x.id===id),unlock=({banana:1,lumber:2,mine:3,port:5}[s.id]);if(state.level<unlock)return toast(`섬 레벨 ${unlock}에 개방됩니다`);const cost=s.built?Math.round(s.cost*Math.pow(1.55,s.level)):s.cost;if(state.coins<cost)return toast('코인이 부족합니다');state.coins-=cost;s.built=true;s.level++;state.xp+=25;focused=null;save();toast(s.level%15===0?`${s.name} 마일스톤! 트럭 진화 · 수익/속도 +50%`:`${s.name} ${s.level===1?'건설 완료!':'업그레이드!'}`);openBuild()}
  function openTrade(){const income=Math.round(sites.filter(s=>s.built).reduce((n,s)=>n+facilityIncome(s)/facilityTime(s)*10,0));openSheet('해외 무역','OVERSEAS TRADE',`<div class="wide-card"><span>🚢</span><div><h3>화물선</h3><p>10초마다 자동으로 상품을 운송합니다.</p></div><b>+${income}</b></div><div class="wide-card"><span>📦</span><div><h3>즉시 수출</h3><p>바나나와 목재를 코인으로 교환합니다.</p></div><button id="sellGoods">SELL</button></div>`);$('sellGoods').onclick=()=>{const gain=state.bananas*18+state.wood*24;if(!gain)return toast('수출할 상품이 없습니다');state.coins+=gain;state.bananas=0;state.wood=0;toast(`상품 판매 +${gain}`);save();openTrade()}}
  function openResearch(){openSheet('Upgrade','RESEARCH',sites.map(s=>`<article class="build-card ${!s.built?'locked':''}"><span class="card-art">${s.icon}</span><h3>${s.name} Profit</h3><p>영구 생산량 +10%</p><button ${!s.built||state.coins<100*s.level?'disabled':''} data-research="${s.id}">GET · ● ${100*Math.max(1,s.level)}</button></article>`).join(''));document.querySelectorAll('[data-research]').forEach(b=>b.onclick=()=>{const s=sites.find(x=>x.id===b.dataset.research),c=100*s.level;if(state.coins<c)return;state.coins-=c;s.base=Math.round(s.base*1.1);toast('연구 완료!');save();openResearch()})}
  function openMap(){openSheet('새로운 섬','ISLAND EXPLORATION',`<div class="wide-card"><span>🏝️</span><div><h3>Emerald Bay</h3><p>현재 개발 중인 무역의 섬</p></div><b>NOW</b></div><div class="wide-card" style="filter:grayscale(1);opacity:.65"><span>🌋</span><div><h3>Volcano Port</h3><p>섬 레벨 8에 개방</p></div><b>🔒</b></div>`)}
  function openGuide(){openSheet('가이드북','MAYOR HANDBOOK',`<article class="guide-section"><span class="guide-number">1</span><h3>작은 섬에서 시작</h3><p>생산 시설을 건설하고 원형 아이콘을 눌러 수익을 모으세요. 어두운 그늘 지역은 표시된 섬 레벨에 도달하면 열립니다.</p></article><article class="guide-section"><span class="guide-number">2</span><h3>15레벨 마일스톤</h3><p>시설이 15레벨 오를 때마다 트럭 외형이 진화하고, 그 시설의 생산 수익과 생산 속도가 각각 50%씩 누적 강화됩니다.</p></article><article class="guide-section"><span class="guide-number">3</span><h3>도로 업그레이드</h3><p>오른쪽의 ROAD 버튼에서 코인을 사용하면 모든 차량 속도가 레벨당 22% 빨라집니다. 최고 레벨은 10입니다.</p></article><article class="guide-section"><span class="guide-number">4</span><h3>10분 부스트</h3><p>게임을 시작하면 10분 동안 생산 수익이 2배가 됩니다. 타이머가 끝난 뒤 부스트 버튼으로 다시 시작할 수 있습니다.</p></article><article class="guide-section"><span class="guide-number">5</span><h3>자동 저장</h3><p>건설, 업그레이드, 코인과 자원은 이 브라우저에 자동으로 저장됩니다.</p></article>`)}
  function upgradeRoad(){if(state.roadLevel>=10)return toast('도로가 최고 레벨입니다');const cost=Math.round(2000*Math.pow(1.65,state.roadLevel-1));if(state.coins<cost)return toast('도로 업그레이드 코인이 부족합니다');state.coins-=cost;state.roadLevel++;toast(`도로 Lv.${state.roadLevel} · 차량 속도 증가!`);save()}
  document.querySelectorAll('.dock-action').forEach(b=>b.onclick=()=>{document.querySelectorAll('.dock-action').forEach(x=>x.classList.remove('active'));b.classList.add('active');({build:openBuild,trade:openTrade,research:openResearch,map:openMap}[b.dataset.panel]||openBuild)()});
  $('mainBuildButton').onclick=openBuild;$('closeSheet').onclick=()=>$('sheet').classList.add('hidden');$('startButton').onclick=()=>{$('welcome').classList.add('closed');if(Date.now()>=state.boostUntil)state.boostUntil=Date.now()+600000;toast('10분 생산 부스트가 시작되었습니다!');save()};
  $('closeFacility').onclick=()=>$('facilityPanel').classList.add('hidden');$('speedBoost').onclick=()=>{if(Date.now()<state.boostUntil)return toast('10분 부스트가 진행 중입니다');state.boostUntil=Date.now()+600000;toast('10분 동안 생산 수익 2배!');save()};$('roadUpgrade').onclick=upgradeRoad;$('guideButton').onclick=openGuide;
  $('settingsButton').onclick=()=>{state.sound=!state.sound;toast(`효과음 ${state.sound?'켜짐':'꺼짐'}`);save()};updateHUD();
})();
