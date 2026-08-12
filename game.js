(() => {
  'use strict';
  const canvas = document.getElementById('world');
  const ctx = canvas.getContext('2d');
  const $ = (id) => document.getElementById(id);
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const WORLD = { w: 1280, h: 720 };
  const sites = [
    { id:'banana', name:'바나나 농장', icon:'🍌', x:520, y:535, cost:100, base:9, color:'#e7c845', built:false, level:0 },
    { id:'lumber', name:'벌목장', icon:'🪵', x:650, y:540, cost:180, base:15, color:'#c88643', built:false, level:0 },
    { id:'mine', name:'석재 광산', icon:'⛏', x:915, y:300, cost:420, base:32, color:'#8c9497', built:false, level:0 },
    { id:'port', name:'무역 항구', icon:'⚓', x:260, y:470, cost:760, base:55, color:'#4996b9', built:false, level:0 },
  ];
  const state = Object.assign({ coins:250, wood:0, bananas:0, stone:0, xp:0, level:1, levelEarnings:0, totalEarned:0, quest:0, sound:true, boostUntil:0, trucks:{}, roadLevel:1, craneLevel:1, truckLoadLevel:1, activeTruckFleet:0, truckLoads:[], deliveredCargo:0, deliveredValue:0, cargoQueue:0, cargoValueQueue:0, cargoProgress:0 }, JSON.parse(localStorage.getItem('idle-island-save') || '{}'));
  if(!Array.isArray(state.truckLoads))state.truckLoads=[];
  if (state.sites) sites.forEach((s,i) => Object.assign(s,state.sites[i] || {}));
  let scale=1, offsetX=0, offsetY=0, t=0, last=performance.now(), saveTimer=0, focused=null, drag=null, lastShipmentCycle=-1, lastTruckPositions=[], lastShipCargo=0;

  function resize(){
    const r=canvas.getBoundingClientRect(); canvas.width=Math.round(r.width*DPR); canvas.height=Math.round(r.height*DPR);
    scale=Math.max(r.width/WORLD.w,r.height/(r.width<r.height?620:WORLD.h)); const cameraX=r.width<r.height&&state.level<3?350:WORLD.w/2; offsetX=r.width/2-cameraX*scale; offsetY=r.height/2-(WORLD.h/2)*scale;clampCamera();
    ctx.setTransform(DPR*scale,0,0,DPR*scale,DPR*offsetX,DPR*offsetY);
  }
  window.addEventListener('resize',resize); resize();
  const path=(draw,fill,stroke='#29454a',width=3)=>{ctx.beginPath();draw();if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.lineJoin='round';ctx.stroke()}};
  const rr=(x,y,w,h,r)=>{ctx.beginPath();ctx.roundRect(x,y,w,h,r)};
  function tree(x,y,s=1,c='#579638'){ctx.save();ctx.translate(x,y);ctx.fillStyle='#244f3055';ctx.beginPath();ctx.ellipse(5*s,6*s,16*s,13*s,0,0,7);ctx.fill();ctx.fillStyle=c;ctx.strokeStyle='#315b2d';ctx.lineWidth=2;[[-7,-2,10],[7,-3,11],[0,7,12],[0,-10,10]].forEach(p=>{ctx.beginPath();ctx.arc(p[0]*s,p[1]*s,p[2]*s,0,7);ctx.fill();ctx.stroke()});ctx.fillStyle='#79562f';ctx.beginPath();ctx.arc(0,0,3*s,0,7);ctx.fill();ctx.restore()}
  function road(points,width=36){ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#e8d6ca';ctx.lineWidth=width+12;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.stroke();ctx.strokeStyle='#82878a';ctx.lineWidth=width;ctx.stroke();ctx.strokeStyle='#d5d5c9';ctx.lineWidth=3;ctx.setLineDash([12,12]);ctx.stroke();ctx.setLineDash([]);ctx.lineCap='butt'}
  function building(x,y,w,h,color,roof='#f4e7d4'){ctx.save();ctx.translate(x,y);ctx.fillStyle='#29434b44';ctx.beginPath();ctx.roundRect(-w/2+7,-h/2+8,w,h,6);ctx.fill();ctx.fillStyle=color;ctx.strokeStyle='#304e54';ctx.lineWidth=3;ctx.beginPath();ctx.roundRect(-w/2,-h/2,w,h,6);ctx.fill();ctx.stroke();ctx.fillStyle=roof;ctx.beginPath();ctx.roundRect(-w/2+5,-h/2+5,w-10,h-10,4);ctx.fill();ctx.stroke();ctx.strokeStyle='#a77a45';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-w/2+8,0);ctx.lineTo(w/2-8,0);ctx.stroke();ctx.fillStyle='#8ca3a4';ctx.strokeStyle='#304e54';ctx.beginPath();ctx.arc(-w/4,-h/5,6,0,7);ctx.fill();ctx.stroke();ctx.fillStyle='#85cbea';ctx.fillRect(w/8,-h/2+10,w/4,12);ctx.strokeRect(w/8,-h/2+10,w/4,12);ctx.fillStyle='#606f70';ctx.fillRect(-12,h/2-7,24,8);ctx.strokeRect(-12,h/2-7,24,8);ctx.restore()}
  function drawWater(){ctx.fillStyle='#46c6ef';ctx.fillRect(0,0,WORLD.w,WORLD.h);ctx.globalAlpha=.16;ctx.strokeStyle='white';ctx.lineWidth=3;for(let y=35;y<WORLD.h;y+=42){ctx.beginPath();for(let x=-40;x<WORLD.w+40;x+=60){ctx.moveTo(x+(y%80),y);ctx.quadraticCurveTo(x+15+(y%80),y-5,x+31+(y%80),y)}ctx.stroke()}ctx.globalAlpha=1}
  function drawIsland(){
    path(()=>{ctx.moveTo(80,0);ctx.bezierCurveTo(50,90,115,155,85,245);ctx.bezierCurveTo(48,354,102,418,70,530);ctx.bezierCurveTo(135,662,290,700,455,677);ctx.bezierCurveTo(575,710,732,690,850,648);ctx.bezierCurveTo(1000,670,1190,610,1280,520);ctx.lineTo(1280,0);ctx.closePath()},'#a9cf6d','#f1dab4',17);
    ctx.save();path(()=>{ctx.moveTo(78,0);ctx.bezierCurveTo(50,90,115,155,85,245);ctx.bezierCurveTo(48,354,102,418,70,530);ctx.bezierCurveTo(135,662,290,700,455,677)},null,'#fff0c9',5);ctx.restore();
    // forest patches
    [[130,85],[180,60],[235,110],[1060,95],[1120,70],[1180,125],[1020,180],[580,90],[650,65],[720,110],[1080,560],[1140,530],[1190,575],[570,600],[630,625]].forEach((p,i)=>tree(p[0],p[1],1.15,i%3===0?'#4d8e35':'#659f3c'));
    road([[0,190],[180,190],[300,240],[425,260],[560,350],[730,365],[875,425],[1040,440],[1280,365]],42);
    road([[565,350],[575,205],[670,120],[820,0]],34); road([[875,425],[900,530],[985,640]],32); road([[300,240],[230,340],[260,470]],30);
    // Starter-island loop. Trucks use this exact center line until the mainland unlocks.
    road([[300,470],[335,575],[465,650],[625,630],[760,540],[730,470],[610,440],[450,440],[300,470]],28);
    road([[450,440],[520,450]],22);road([[610,440],[650,500]],22);road([[875,425],[915,390]],22);
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
    building(570,175,86,58,'#ded9cc','#da9a48');ctx.fillStyle='#7b8d91';ctx.strokeStyle='#304e54';ctx.lineWidth=3;ctx.beginPath();ctx.arc(606,145,9,0,7);ctx.fill();ctx.stroke();ctx.fillStyle='#bac8c5';ctx.beginPath();ctx.arc(606,145,4,0,7);ctx.fill();
    path(()=>ctx.ellipse(520,535,92,67,0,0,7),'#8ac557','#5d8c3c',3);
    for(let row=0;row<4;row++)for(let col=0;col<6;col++){const x=473+col*17+(row%2)*5,y=500+row*18;ctx.fillStyle='#8b622f';ctx.fillRect(x-1,y,3,8);ctx.fillStyle='#e5c42e';ctx.beginPath();ctx.arc(x-5,y,5,0,7);ctx.arc(x+5,y,5,0,7);ctx.fill()}
    building(650,540,65,48,'#c99a58','#855624');
    // lumber yard logs
    for(let i=0;i<7;i++){ctx.fillStyle='#9d612f';ctx.fillRect(686+(i%3)*13,518+Math.floor(i/3)*11,28,8);ctx.strokeStyle='#5f3e24';ctx.strokeRect(686+(i%3)*13,518+Math.floor(i/3)*11,28,8)}
    // mine
    path(()=>{ctx.moveTo(847,305);ctx.lineTo(890,232);ctx.lineTo(980,250);ctx.lineTo(1017,330);ctx.lineTo(960,390);ctx.lineTo(865,370);ctx.closePath()},'#777b76','#4e5554',4);
    path(()=>{ctx.moveTo(893,306);ctx.quadraticCurveTo(917,270,943,306);ctx.lineTo(943,350);ctx.lineTo(893,350);ctx.closePath()},'#34434a','#202d31',4);
    ctx.strokeStyle='#d29531';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(900,342);ctx.lineTo(900,293);ctx.lineTo(936,293);ctx.lineTo(936,342);ctx.stroke();
    building(1080,335,80,58,'#d7d4c7','#e09249'); building(1170,285,62,48,'#d69b5c','#a65c34');
    // airport locked
    ctx.fillStyle='#b9b9ae';ctx.fillRect(1070,15,150,45);ctx.strokeStyle='#647477';ctx.strokeRect(1070,15,150,45);ctx.fillStyle='#f7f4df';ctx.fillRect(1085,35,120,4);ctx.font='bold 17px Nunito';ctx.fillStyle='#455a60';ctx.fillText('✈  LEVEL 8',1090,47);
    drawUnloadingArea();
  }
  function unloadingContainerPosition(i){return{x:141+(i%4)*16,y:458+Math.floor(i/4)*12}}
  function visibleUnloadingCargo(){const loadTime=craneLoadingTime(),departAt=6+loadTime,phase=t%(departAt+8),total=Math.floor(state.deliveredCargo||0),shipCargo=Math.min(3,total);if(phase<6||phase>=departAt||!shipCargo)return total;const cycle=((phase-6)/loadTime)*shipCargo,staged=Math.min(shipCargo,Math.ceil(cycle));return Math.max(0,total-staged)}
  function drawUnloadingArea(){ctx.save();ctx.fillStyle='#c8c7bd';ctx.strokeStyle='#41545a';ctx.lineWidth=3;ctx.beginPath();ctx.roundRect(125,440,88,62,6);ctx.fill();ctx.stroke();ctx.strokeStyle='#f4f0da';ctx.lineWidth=2;ctx.setLineDash([7,5]);ctx.strokeRect(132,447,74,48);ctx.setLineDash([]);ctx.fillStyle='#42545a';ctx.font='900 9px Nunito';ctx.textAlign='center';ctx.fillText('UNLOADING',169,496);const count=Math.min(12,visibleUnloadingCargo());for(let i=0;i<count;i++){const p=unloadingContainerPosition(i);drawContainer(p.x,p.y,['#e5a12e','#4d9cc3','#ce5d48'][i%3])}ctx.restore()}
  function siteMarkerPosition(s){const positions={banana:[520,390],lumber:[820,555],mine:[1048,225],port:[120,400]},p=positions[s.id]||[s.x,s.y];return{x:p[0],y:p[1]}}
  function siteAnchorPosition(s){const positions={banana:[520,500],lumber:[650,540],mine:[915,300],port:[170,470]},p=positions[s.id]||[s.x,s.y];return{x:p[0],y:p[1]}}
  function drawSitePointer(marker,anchor){const dx=anchor.x-marker.x,dy=anchor.y-marker.y,length=Math.hypot(dx,dy)||1,start=30,end=Math.max(start,length-36);ctx.save();ctx.strokeStyle='#304e54';ctx.lineWidth=3;ctx.setLineDash([5,5]);ctx.beginPath();ctx.moveTo(marker.x+dx/length*start,marker.y+dy/length*start);ctx.lineTo(marker.x+dx/length*end,marker.y+dy/length*end);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#fffdf0';ctx.strokeStyle='#304e54';ctx.beginPath();ctx.arc(marker.x+dx/length*end,marker.y+dy/length*end,4,0,7);ctx.fill();ctx.stroke();ctx.restore()}
  function drawSite(s){
    const marker=siteMarkerPosition(s),anchor=siteAnchorPosition(s);drawSitePointer(marker,anchor);
    if(s.built){
      ctx.fillStyle='#fff';ctx.strokeStyle='#304e54';ctx.lineWidth=3;ctx.beginPath();ctx.arc(marker.x,marker.y,25,0,7);ctx.fill();ctx.stroke();ctx.font='22px serif';ctx.textAlign='center';ctx.fillText(s.icon,marker.x,marker.y+8);ctx.font='900 12px Nunito';ctx.fillStyle='#263f45';ctx.fillText(`Lv.${s.level}`,marker.x,marker.y-22);
      const pulse=1+Math.sin(t*3+s.x)*.08;ctx.save();ctx.translate(marker.x+32,marker.y+13);ctx.scale(pulse,pulse);ctx.fillStyle='#ffe03e';ctx.strokeStyle='white';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,12,0,7);ctx.fill();ctx.stroke();ctx.restore();
      if(s.id!=='port'){const producers=sites.filter(p=>p.built&&p.id!=='port'),index=producers.indexOf(s),waiting=Math.max(0,Math.ceil(((state.cargoQueue||0)-index)/Math.max(1,producers.length))),colors={banana:'#e4c738',lumber:'#9f642d',mine:'#8b9598'};for(let i=0;i<Math.min(3,waiting);i++)drawContainer(s.x-17+i*17,s.y+43,colors[s.id]||'#d88b2d')}
    } else {
      const pulse=1+Math.sin(t*2+s.x)*.06;ctx.save();ctx.translate(marker.x,marker.y);ctx.scale(pulse,pulse);ctx.fillStyle='#fffdf0';ctx.strokeStyle='#304e54';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,29,0,7);ctx.fill();ctx.stroke();ctx.fillStyle='#72c941';ctx.beginPath();ctx.arc(0,0,21,0,7);ctx.fill();ctx.fillStyle='white';ctx.font='900 25px Nunito';ctx.textAlign='center';ctx.fillText('+',0,9);ctx.restore();
    }
  }
  function drawVehicles(){
    const colors=['#4b91dc','#f0b62d','#e94f47','#7651b5','#303b42'];
    const lengths=[25,29,34,39,45];
    const count=activeTruckCount();
    const assignments=truckAssignments();
    for(let i=0;i<count;i++){
      const producer=assignments[i],route=truckRoute(producer);
      const tier=truckAppearanceTier(producer),u=lastTruckPositions[i]??((i*.21)%1);
      const point=routePoint(route,u),next=routePoint(route,(u+.01)%1);
      const cargoColors={banana:'#e4c738',lumber:'#9f642d',mine:'#8b9598'};
      drawTopDownTruck(point.x,point.y,Math.atan2(next.y-point.y,next.x-point.x),tier,colors,lengths,Boolean(state.truckLoads[i]),cargoColors[state.truckLoads[i]?.producerId]||cargoColors[producer?.id]||'#d88b2d');
    }
    if(state.roadLevel>1){ctx.save();ctx.translate(0,Math.sin(t*5)*2);ctx.fillStyle='#efc52d';ctx.font='900 22px Nunito';const arrows=state.level<3?[[355,565],[470,638],[615,618],[710,535]]:[[425,255],[555,345],[725,360],[870,420]];for(let i=0;i<Math.min(arrows.length,state.roadLevel);i++)ctx.fillText('›',arrows[i][0],arrows[i][1]);ctx.restore()}
    drawCargoShip();
  }
  function truckRoute(producer){
    if(producer?.id==='mine')return [[220,470],[230,340],[300,240],[425,260],[560,350],[730,365],[875,425],[915,390],[875,425],[730,365],[560,350],[425,260],[300,240],[230,340]];
    if(producer?.id==='lumber')return [[220,470],[300,470],[450,440],[610,440],[650,485],[610,440],[450,440],[300,470]];
    return [[220,470],[300,470],[450,440],[520,450],[450,440],[300,470]];
  }
  function truckAssignments(){const producers=sites.filter(s=>s.built&&s.id!=='port'),counts=producers.map(s=>(state.trucks[s.id]||1)+milestoneCount(s)),result=[],max=Math.max(0,...counts);for(let slot=0;slot<max&&result.length<12;slot++)for(let i=0;i<producers.length&&result.length<12;i++)if(counts[i]>slot)result.push(producers[i]);return result}
  function availableTruckCount(){return truckAssignments().length}
  function activeTruckCount(){const fleet=availableTruckCount();if(!fleet){state.activeTruckFleet=0;return 0}const desired=Math.min(fleet,Math.max(1,Math.ceil(state.cargoQueue||0)));state.activeTruckFleet=Math.max(Math.min(fleet,state.activeTruckFleet||0),desired);return state.activeTruckFleet}
  function truckAppearanceTier(producer){return Math.min(4,milestoneCount(producer||{level:0}))}
  function truckTierSpeed(tier){return 1+tier*.25}
  function routeLength(points){let total=0;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];total+=Math.hypot(b[0]-a[0],b[1]-a[1])}return total}
  function updateTruckLogistics(dt){const count=activeTruckCount(),roadSpeed=1+(state.roadLevel-1)*.22,assignments=truckAssignments();for(let i=0;i<count;i++){const producer=assignments[i],tier=truckAppearanceTier(producer),route=truckRoute(producer),previous=lastTruckPositions[i]??((i*.21)%1),u=(previous+dt*42*roadSpeed*truckTierSpeed(tier)/routeLength(route))%1;if(previous<.5&&u>=.5&&!state.truckLoads[i]&&(state.cargoQueue||0)>=1){const averageValue=(state.cargoValueQueue||0)/Math.max(1,state.cargoQueue||0);state.cargoQueue-=1;state.cargoValueQueue=Math.max(0,(state.cargoValueQueue||0)-averageValue);state.truckLoads[i]={value:averageValue,producerId:producer?.id||'banana'};toast(`${producer?.name||'생산자'}에서 상자 상차 완료`)}if(u<previous&&state.truckLoads[i]){state.deliveredCargo=(state.deliveredCargo||0)+1;state.deliveredValue=(state.deliveredValue||0)+(state.truckLoads[i].value||0);state.truckLoads[i]=null;toast('트럭 하역 완료 · 화물 1개')}lastTruckPositions[i]=u}lastTruckPositions.length=count}
  function drawTopDownTruck(x,y,angle,tier,colors,lengths,hasCargo,cargoColor){const len=lengths[tier];ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.fillStyle='#26383d';ctx.fillRect(-len/2+3,-11,7,4);ctx.fillRect(-len/2+3,7,7,4);ctx.fillRect(len/2-10,-11,7,4);ctx.fillRect(len/2-10,7,7,4);ctx.fillStyle='#20383f44';ctx.fillRect(-len/2+3,-5,len,16);ctx.fillStyle=colors[tier];ctx.strokeStyle='#263f45';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(-len/2,-8,len,16,4);ctx.fill();ctx.stroke();ctx.fillStyle='#bce5ec';ctx.fillRect(len/2-11,-6,7,12);ctx.strokeRect(len/2-11,-6,7,12);ctx.fillStyle=tier>=2?'#f4d97f':'#d8e1d9';ctx.fillRect(-len/2+3,-5,Math.max(7,len-17),10);ctx.strokeRect(-len/2+3,-5,Math.max(7,len-17),10);if(hasCargo){ctx.fillStyle=cargoColor;ctx.fillRect(-len/2+5,-4,8,8);ctx.strokeRect(-len/2+5,-4,8,8)}ctx.restore()}
  function routePoint(points,progress){const lengths=[];let total=0;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],len=Math.hypot(b[0]-a[0],b[1]-a[1]);lengths.push(len);total+=len}let d=progress*total;for(let i=0;i<lengths.length;i++){if(d<=lengths[i]){const a=points[i],b=points[(i+1)%points.length],p=d/lengths[i];return{x:a[0]+(b[0]-a[0])*p,y:a[1]+(b[1]-a[1])*p}}d-=lengths[i]}return{x:points[0][0],y:points[0][1]}}
  function drawCargoShip(){
    const dockX=30,loadTime=craneLoadingTime(),departAt=6+loadTime,cycle=departAt+8,phase=t%cycle;
    const loading=phase>=6&&phase<departAt;
    const departing=phase>=departAt;
    const shipX=phase<6?-100+(phase/6)*(dockX+100):loading?dockX:dockX-((phase-departAt)/8)*(dockX+130);
    const shipY=545,heading=departing?Math.PI:0;
    const shipCargo=departing?lastShipCargo:Math.min(3,Math.floor(state.deliveredCargo||0));
    const loadProgress=loading?(phase-6)/loadTime:departing?1:0;
    const cargoCycle=loadProgress*Math.max(1,shipCargo),completed=Math.floor(cargoCycle),move=cargoCycle%1;
    const slot=Math.min(Math.max(0,shipCargo-1),completed),carrying=loading&&completed<shipCargo&&move<.62;
    const turnProgress=carrying?move/.62:move>=.62?(move-.62)/.38:0,clampedTurn=Math.max(0,Math.min(1,turnProgress)),smoothTurn=clampedTurn*clampedTurn*(3-2*clampedTurn);
    const loadedCount=Math.min(shipCargo,completed+(loading&&move>=.62?1:0));
    const cargoIndex=Math.max(0,Math.min(11,Math.floor(state.deliveredCargo||0)-completed-1)),cargoColor=['#e5a12e','#4d9cc3','#ce5d48'][cargoIndex%3],source=unloadingContainerPosition(cargoIndex),nextSource=unloadingContainerPosition(Math.max(0,cargoIndex-1)),shipTarget={x:shipX-12+slot*13,y:shipY-4};
    const sourceAngle=Math.atan2(source.y-500,source.x-104),shipAngle=Math.atan2(shipTarget.y-500,shipTarget.x-104),nextSourceAngle=Math.atan2(nextSource.y-500,nextSource.x-104);
    const rotate=(from,to,p)=>from+Math.atan2(Math.sin(to-from),Math.cos(to-from))*p,craneAngle=carrying?rotate(sourceAngle,shipAngle,smoothTurn):move>=.62?rotate(shipAngle,nextSourceAngle,smoothTurn):sourceAngle;
    const sourceBoom=Math.hypot(source.x-104,source.y-500),shipBoom=Math.hypot(shipTarget.x-104,shipTarget.y-500),nextBoom=Math.hypot(nextSource.x-104,nextSource.y-500),craneBoom=carrying?sourceBoom+(shipBoom-sourceBoom)*smoothTurn:move>=.62?shipBoom+(nextBoom-shipBoom)*smoothTurn:sourceBoom;

    if(!loading){const wakeSide=departing?1:-1;ctx.save();ctx.globalAlpha=.65;ctx.strokeStyle='white';ctx.lineWidth=3;for(let i=0;i<3;i++){const wx=shipX+wakeSide*(40+i*11);ctx.beginPath();ctx.moveTo(wx,shipY-8-i*2);ctx.lineTo(wx+wakeSide*10,shipY);ctx.lineTo(wx,shipY+8+i*2);ctx.stroke()}ctx.restore()}
    ctx.save();ctx.translate(shipX,shipY);ctx.rotate(heading);ctx.fillStyle='#263d4350';ctx.beginPath();ctx.ellipse(4,5,39,18,0,0,7);ctx.fill();path(()=>{ctx.moveTo(-34,-14);ctx.lineTo(22,-14);ctx.lineTo(38,0);ctx.lineTo(22,14);ctx.lineTo(-34,14);ctx.closePath()},'#d25748','#314d54',3);ctx.fillStyle='#f1eee0';ctx.strokeStyle='#314d54';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(-28,-10,18,20,3);ctx.fill();ctx.stroke();ctx.fillStyle='#83cce5';ctx.fillRect(-24,-7,7,14);ctx.strokeRect(-24,-7,7,14);for(let i=0;i<loadedCount;i++)drawContainer(-1+i*13,-6,i%2?'#4e9bc3':'#e7a22e');ctx.restore();
    drawHarborCrane(104,500,craneAngle,craneBoom,carrying,cargoColor);
  }
  function drawHarborCrane(baseX,baseY,angle,boom,movingCargo,cargoColor){
    boom=Math.max(38,boom);
    ctx.save();ctx.translate(baseX,baseY);ctx.rotate(angle);
    ctx.globalAlpha=.28;ctx.strokeStyle='#21383e';ctx.lineWidth=11;ctx.beginPath();ctx.moveTo(-22,6);ctx.lineTo(boom,6);ctx.stroke();ctx.globalAlpha=1;
    ctx.fillStyle='#9d6322';ctx.strokeStyle='#3b4c50';ctx.lineWidth=3;ctx.beginPath();ctx.roundRect(-30,-14,22,28,4);ctx.fill();ctx.stroke();
    ctx.fillStyle='#f1a22d';ctx.beginPath();ctx.roundRect(-13,-18,30,36,5);ctx.fill();ctx.stroke();
    ctx.fillStyle='#f8edd1';ctx.beginPath();ctx.roundRect(-8,-13,15,12,2);ctx.fill();ctx.stroke();ctx.fillStyle='#70b9d0';ctx.fillRect(-5,-10,9,6);ctx.strokeRect(-5,-10,9,6);
    for(const y of [-6,6]){ctx.strokeStyle='#533c28';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(7,y);ctx.lineTo(boom,y);ctx.stroke();ctx.strokeStyle='#e78d24';ctx.lineWidth=2.5;ctx.stroke()}
    ctx.strokeStyle='#7a4a20';ctx.lineWidth=2;for(let x=8,n=0;x<boom-5;x+=12,n++){ctx.beginPath();ctx.moveTo(x,n%2?-6:6);ctx.lineTo(Math.min(boom,x+12),n%2?6:-6);ctx.stroke()}
    ctx.fillStyle='#e58d25';ctx.strokeStyle='#3b4c50';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(boom-6,-9,12,18,3);ctx.fill();ctx.stroke();ctx.fillStyle='#36494d';ctx.beginPath();ctx.arc(boom,0,3,0,7);ctx.fill();
    if(movingCargo)drawContainer(boom,0,cargoColor);ctx.restore();
    ctx.save();ctx.fillStyle='#fff7d6';ctx.strokeStyle='#3d4e52';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(baseX-19,baseY-32,38,15,6);ctx.fill();ctx.stroke();ctx.fillStyle='#344b50';ctx.font='900 9px Nunito';ctx.textAlign='center';ctx.fillText(`CRANE ${state.craneLevel}`,baseX,baseY-21);ctx.restore();
  }
  function drawContainer(x,y,color){ctx.fillStyle=color;ctx.strokeStyle='#334c52';ctx.lineWidth=2;ctx.fillRect(x-6,y-5,12,10);ctx.strokeRect(x-6,y-5,12,10);ctx.beginPath();ctx.moveTo(x-2,y-4);ctx.lineTo(x-2,y+4);ctx.moveTo(x+2,y-4);ctx.lineTo(x+2,y+4);ctx.stroke()}
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
    t+=dt;const boost=Date.now()<state.boostUntil?2:1;
    const producers=sites.filter(s=>s.built&&s.id!=='port');const itemRate=producers.reduce((n,s)=>n+dt/(facilityTime(s)+truckLoadingTime()),0)*boost,valueRate=producers.reduce((n,s)=>n+dt*facilityIncome(s)/(facilityTime(s)+truckLoadingTime()),0)*boost;state.cargoProgress=(state.cargoProgress||0)+itemRate;state.cargoValueQueue=(state.cargoValueQueue||0)+valueRate;if(state.cargoProgress>=1){const made=Math.floor(state.cargoProgress);state.cargoQueue=Math.min(50,(state.cargoQueue||0)+made);state.cargoProgress-=made}
    updateTruckLogistics(dt);
    const shipDuration=shipCycleDuration(),shipmentCycle=Math.floor(t/shipDuration),departAt=6+craneLoadingTime();if(t%shipDuration>=departAt&&shipmentCycle>lastShipmentCycle){lastShipmentCycle=shipmentCycle;const shipped=Math.min(3,Math.floor(state.deliveredCargo||0));lastShipCargo=shipped;if(shipped>0){const averageValue=(state.deliveredValue||0)/Math.max(1,state.deliveredCargo||0),payout=Math.max(1,Math.round(averageValue*shipped));state.deliveredCargo-=shipped;state.deliveredValue=Math.max(0,state.deliveredValue-averageValue*shipped);state.coins+=payout;recordEarnings(payout);toast(`화물선 출항 · 화물 ${shipped}개 · +${fmt(payout)}`)}else toast('빈 화물선 출항 · 수익 없음')}
    saveTimer+=dt;if(saveTimer>3){save();saveTimer=0}updateHUD();
  }
  function loop(now){const dt=Math.min((now-last)/1000,.05);last=now;update(dt);draw();requestAnimationFrame(loop)}requestAnimationFrame(loop);
  function save(){state.sites=sites.map(({built,level})=>({built,level}));localStorage.setItem('idle-island-save',JSON.stringify(state))}
  function fmt(n){if(n>=1e6)return(n/1e6).toFixed(2)+'m';if(n>=1e3)return(n/1e3).toFixed(2)+'k';return Math.floor(n).toLocaleString('ko-KR')}
  function milestoneCount(s){return Math.floor(s.level/15)}
  function facilityIncome(s){return s.base*s.level*Math.pow(1.5,milestoneCount(s))*(state.trucks[s.id]||1)}
  function facilityTime(s){return Math.max(2,(16-s.level*.35)/Math.pow(1.5,milestoneCount(s)))}
  function perfectChance(s){return Math.min(100,5+milestoneCount(s))}
  function levelRequirement(level){return 500*Math.pow(3,level-1)}
  function recordEarnings(amount){state.totalEarned+=amount;state.levelEarnings=(state.levelEarnings||0)+amount;let leveled=false;while(state.levelEarnings>=levelRequirement(state.level)){state.levelEarnings-=levelRequirement(state.level);state.level++;leveled=true}if(leveled)toast(`섬 레벨 ${state.level} 달성! 다음 목표 ×3`)}
  function craneLoadingTime(){return Math.max(3,18*Math.pow(.85,(state.craneLevel||1)-1))}
  function craneSpeedMultiplier(){return 18/craneLoadingTime()}
  function craneUpgradeCost(){return Math.round(1500*Math.pow(1.75,(state.craneLevel||1)-1))}
  function truckLoadingTime(){return Math.max(1,6*Math.pow(.85,(state.truckLoadLevel||1)-1))}
  function truckLoadUpgradeCost(){return Math.round(900*Math.pow(1.7,(state.truckLoadLevel||1)-1))}
  function shipCycleDuration(){return 14+craneLoadingTime()}
  function updateHUD(){
    $('coins').textContent=fmt(state.coins);$('wood').textContent=fmt(state.wood);$('bananas').textContent=fmt(state.bananas);$('playerLevel').textContent=state.level;$('xpText').textContent=`${state.xp} / ${state.level*100} XP`;
    $('incomeRate').textContent=Math.floor(state.deliveredCargo||0);
    const remain=Math.max(0,Math.ceil((state.boostUntil-Date.now())/1000));$('boostTime').textContent=remain?`${String(Math.floor(remain/60)).padStart(2,'0')}:${String(remain%60).padStart(2,'0')}`:'10:00';$('speedBoost').classList.toggle('active',remain>0);const roadCost=Math.round(2000*Math.pow(1.65,state.roadLevel-1)),roadAffordable=state.roadLevel<10&&state.coins>=roadCost;$('roadLevel').textContent=`ROAD Lv.${state.roadLevel}`;$('roadCost').textContent=state.roadLevel>=10?'MAX':`● ${fmt(roadCost)}`;$('roadUpgrade').classList.toggle('max',state.roadLevel>=10);$('roadUpgrade').classList.toggle('purchase-ready',roadAffordable);
    const levelGoal=levelRequirement(state.level);$('questText').textContent=`섬 레벨 ${state.level+1} 수익 목표`;$('questBar').style.width=Math.min(100,(state.levelEarnings/levelGoal)*100)+'%';$('questReward').textContent=`${fmt(state.levelEarnings)}/${fmt(levelGoal)}`;
    document.querySelectorAll('[data-purchase-cost]').forEach(button=>{const affordable=button.dataset.max!=='true'&&state.coins>=Number(button.dataset.purchaseCost);button.disabled=!affordable;button.classList.toggle('purchase-ready',affordable)});
  }
  function screenToWorld(clientX,clientY){const r=canvas.getBoundingClientRect();return{x:(clientX-r.left-offsetX)/scale,y:(clientY-r.top-offsetY)/scale}}
  function clampCamera(){const r=canvas.getBoundingClientRect(),worldW=WORLD.w*scale,worldH=WORLD.h*scale;offsetX=Math.min(0,Math.max(r.width-worldW,offsetX));offsetY=Math.min(0,Math.max(r.height-worldH,offsetY))}
  canvas.addEventListener('pointerdown',(e)=>{if(e.pointerType==='mouse'&&e.button!==0)return;drag={id:e.pointerId,startX:e.clientX,startY:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:false};canvas.setPointerCapture(e.pointerId)});
  canvas.addEventListener('pointermove',(e)=>{if(!drag||drag.id!==e.pointerId)return;const total=Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY);if(total>6){drag.moved=true;canvas.classList.add('dragging')}if(!drag.moved)return;offsetX+=e.clientX-drag.lastX;offsetY+=e.clientY-drag.lastY;drag.lastX=e.clientX;drag.lastY=e.clientY;clampCamera()});
  canvas.addEventListener('pointerup',(e)=>{if(!drag||drag.id!==e.pointerId)return;const moved=drag.moved;drag=null;canvas.classList.remove('dragging');if(moved)return;if(!$('welcome').classList.contains('closed'))return;const p=screenToWorld(e.clientX,e.clientY);const s=sites.find(x=>{const marker=siteMarkerPosition(x);return Math.hypot(p.x-marker.x,p.y-marker.y)<55});if(!s){if(state.level<3&&p.y<400)toast('본섬은 레벨 3에 해금됩니다');return}if(!s.built){focused=s;openBuild()}else{collect(s,e.clientX,e.clientY);openFacility(s)}});
  canvas.addEventListener('pointercancel',()=>{drag=null;canvas.classList.remove('dragging')});
  function collect(s,x,y){let value=Math.max(10,Math.round(facilityIncome(s)*3));const perfect=Math.random()*100<perfectChance(s);if(perfect)value*=2;state.cargoQueue=Math.min(50,(state.cargoQueue||0)+1);state.cargoValueQueue=(state.cargoValueQueue||0)+value;if(s.id==='banana')state.bananas+=s.level;if(s.id==='lumber')state.wood+=s.level;if(perfect)toast('완벽 화물! 출항 가격 2배');popIncome(x,y,perfect?'PERFECT CARGO +1':'CARGO +1');save()}
  function popIncome(x,y,text){const n=document.createElement('span');n.className='income-pop';n.textContent=text;n.style.left=x+'px';n.style.top=y+'px';$('incomeLayer').appendChild(n);setTimeout(()=>n.remove(),1000)}
  function toast(msg){const el=$('toast');el.textContent=msg;el.classList.add('show');clearTimeout(el._timer);el._timer=setTimeout(()=>el.classList.remove('show'),1800)}
  function openSheet(title,eyebrow,html){$('sheetTitle').textContent=title;$('sheetEyebrow').textContent=eyebrow;$('sheetContent').innerHTML=html;$('sheet').classList.remove('hidden')}
  function card(s){const next=s.built?Math.round(s.cost*Math.pow(1.55,s.level)):s.cost,unlock=({banana:1,lumber:2,mine:3,port:5}[s.id]);return `<article class="build-card ${state.level<unlock?'locked':''}"><span class="card-art">${s.icon}</span><h3>${s.name}</h3><p>${state.level<unlock?`섬 레벨 ${unlock}에 개방`:s.built?`Lv.${s.level} · ${fmt(facilityIncome(s))} / ${facilityTime(s).toFixed(1)}초`:`생산 시설을 건설합니다.`}</p><button data-build="${s.id}" data-purchase-cost="${next}" data-max="${state.level<unlock}" ${state.coins<next||state.level<unlock?'disabled':''}>${state.level<unlock?'🔒 LOCKED':`${s.built?'UPGRADE':'BUILD'} · ● ${fmt(next)}`}</button></article>`}
  function bindBuildButtons(){document.querySelectorAll('[data-build]').forEach(b=>b.onclick=()=>build(b.dataset.build))}
  function openBuild(){openSheet(focused?focused.name:'섬 개발','ISLAND DEVELOPMENT',focused?card(focused):sites.map(card).join(''));bindBuildButtons()}
  function openFacility(s){
    focused=s;$('sheet').classList.add('hidden');$('facilityIcon').textContent=s.icon;$('facilityName').textContent=s.name;$('facilityLevel').textContent=`LV.${s.level}`;$('facilityStars').textContent='★'.repeat(Math.min(5,milestoneCount(s)))+'☆'.repeat(Math.max(0,5-milestoneCount(s)));$('facilityIncome').textContent=fmt(facilityIncome(s));$('facilityTime').textContent=facilityTime(s).toFixed(1)+'초';const cost=Math.round(s.cost*Math.pow(1.55,s.level));$('facilityUpgrade').textContent=`● ${fmt(cost)}`;$('facilityUpgrade').dataset.purchaseCost=cost;$('facilityUpgrade').dataset.max='false';$('facilityUpgrade').disabled=state.coins<cost;$('facilityUpgrade').classList.toggle('purchase-ready',state.coins>=cost);const trucks=state.trucks[s.id]||1,truckCost=900*trucks*trucks,autoTrucks=milestoneCount(s);$('truckCount').textContent=`${trucks+autoTrucks}대`;$('truckUpgrade').textContent=trucks>=3?'MAX':`● ${fmt(truckCost)}`;$('truckUpgrade').dataset.purchaseCost=truckCost;$('truckUpgrade').dataset.max=String(trucks>=3);$('truckUpgrade').disabled=trucks>=3||state.coins<truckCost;$('truckUpgrade').classList.toggle('purchase-ready',trucks<3&&state.coins>=truckCost);$('perfectChance').textContent=perfectChance(s)+'%';const tier=truckAppearanceTier(s),within=s.level%15;const tierIcons=['▯','▣','▤','▥','◆'],tierNames=['소형 화물차','중형 화물차','대형 윙바디','고성능 운송차','마스터 트럭'];$('truckPreview').textContent=tierIcons[tier];$('truckTierName').textContent=`${tierNames[tier]} · 속도 ×${truckTierSpeed(tier).toFixed(2)}${autoTrucks?` · 자동 +${autoTrucks}대`:''}`;$('evolutionText').textContent=tier===4?'MAX':`${within} / 15`;$('evolutionBar').style.width=(tier===4?100:within/15*100)+'%';$('milestoneBonus').textContent=milestoneCount(s)?`마일스톤 ${milestoneCount(s)}단계 · 수익/생산 ×${Math.pow(1.5,milestoneCount(s)).toFixed(2)} · 차량 속도 ×${truckTierSpeed(tier).toFixed(2)} · 완벽 ${perfectChance(s)}%`:'15레벨 달성 시 트럭 +1대 · 새 외형/차량 속도 +25% · 수익/생산 +50% · 완벽 +1%';$('facilityPanel').classList.remove('hidden');
    $('facilityUpgrade').onclick=()=>{build(s.id);openFacility(s)};$('truckUpgrade').onclick=()=>upgradeTruck(s);
  }
  function upgradeTruck(s){const n=state.trucks[s.id]||1,c=900*n*n;if(n>=3)return;if(state.coins<c)return toast('코인이 부족합니다');state.coins-=c;state.trucks[s.id]=n+1;toast('트럭 업그레이드!');save();openFacility(s)}
  function build(id){const s=sites.find(x=>x.id===id),unlock=({banana:1,lumber:2,mine:3,port:5}[s.id]);if(state.level<unlock)return toast(`섬 레벨 ${unlock}에 개방됩니다`);const cost=s.built?Math.round(s.cost*Math.pow(1.55,s.level)):s.cost;if(state.coins<cost)return toast('코인이 부족합니다');state.coins-=cost;s.built=true;s.level++;state.xp+=25;focused=null;save();toast(s.level%15===0?`${s.name} 마일스톤! 전용 트럭 +1 · 수익/속도 +50%`:`${s.name} ${s.level===1?'건설 완료!':'업그레이드!'}`);openBuild()}
  function openTrade(){const income=Math.round(sites.filter(s=>s.built).reduce((n,s)=>n+facilityIncome(s)/facilityTime(s)*10,0)),craneCost=craneUpgradeCost(),truckCost=truckLoadUpgradeCost(),truckCanBuy=state.truckLoadLevel<10&&state.coins>=truckCost,craneCanBuy=state.craneLevel<10&&state.coins>=craneCost;openSheet('해외 무역','OVERSEAS TRADE',`<div class="wide-card"><span>⌁</span><div><h3>화물선</h3><p>배가 화물을 싣고 출항할 때만 정산 · 하역 ${state.deliveredCargo||0}개</p></div><b>예상 ${income}</b></div><div class="wide-card"><span>▣</span><div><h3>트럭 상차 Lv.${state.truckLoadLevel}</h3><p>물건 1개 상차 ${truckLoadingTime().toFixed(1)}초 · 레벨마다 15% 단축</p></div><button class="purchase-button" id="truckLoadUpgrade" data-purchase-cost="${truckCost}" data-max="${state.truckLoadLevel>=10}" ${truckCanBuy?'':'disabled'}>${state.truckLoadLevel>=10?'MAX':`● ${fmt(truckCost)}`}</button></div><div class="wide-card"><span>✣</span><div><h3>크레인 속도 Lv.${state.craneLevel}</h3><p>속도 ×${craneSpeedMultiplier().toFixed(2)} · 선적 ${craneLoadingTime().toFixed(1)}초 · 레벨마다 15% 단축</p></div><button class="purchase-button" id="craneUpgrade" data-purchase-cost="${craneCost}" data-max="${state.craneLevel>=10}" ${craneCanBuy?'':'disabled'}>${state.craneLevel>=10?'MAX':`속도 UP · ● ${fmt(craneCost)}`}</button></div><div class="wide-card"><span>▦</span><div><h3>보관 자원 화물 등록</h3><p>바나나와 목재를 현금 대신 운송 대기열에 넣습니다.</p></div><button id="queueGoods">LOAD</button></div>`);$('truckLoadUpgrade').onclick=upgradeTruckLoading;$('craneUpgrade').onclick=upgradeCrane;$('queueGoods').onclick=()=>{const count=Math.floor(state.bananas+state.wood),value=state.bananas*18+state.wood*24;if(!count)return toast('등록할 자원이 없습니다');state.cargoQueue=Math.min(50,(state.cargoQueue||0)+count);state.cargoValueQueue=(state.cargoValueQueue||0)+value;state.bananas=0;state.wood=0;toast(`화물 ${count}개 운송 대기 등록`);save();openTrade()}}
  function openResearch(){openSheet('Upgrade','RESEARCH',sites.map(s=>{const cost=100*Math.max(1,s.level);return `<article class="build-card ${!s.built?'locked':''}"><span class="card-art">${s.icon}</span><h3>${s.name} Profit</h3><p>영구 생산량 +10%</p><button ${!s.built||state.coins<cost?'disabled':''} data-research="${s.id}" data-purchase-cost="${cost}" data-max="${!s.built}">GET · ● ${cost}</button></article>`}).join(''));document.querySelectorAll('[data-research]').forEach(b=>b.onclick=()=>{const s=sites.find(x=>x.id===b.dataset.research),c=100*Math.max(1,s.level);if(state.coins<c)return;state.coins-=c;s.base=Math.round(s.base*1.1);toast('연구 완료!');save();openResearch()})}
  function openMap(){openSheet('새로운 섬','ISLAND EXPLORATION',`<div class="wide-card"><span>🏝️</span><div><h3>Emerald Bay</h3><p>현재 개발 중인 무역의 섬</p></div><b>NOW</b></div><div class="wide-card" style="filter:grayscale(1);opacity:.65"><span>🌋</span><div><h3>Volcano Port</h3><p>섬 레벨 8에 개방</p></div><b>🔒</b></div>`)}
  function openGuide(){openSheet('가이드북','MAYOR HANDBOOK',`<article class="guide-section"><span class="guide-number">1</span><h3>작은 섬과 지도</h3><p>모든 시설과 운송수단은 위에서 내려다보는 탑다운 시점입니다. 좌클릭 또는 터치 드래그로 지도를 이동합니다.</p></article><article class="guide-section"><span class="guide-number">2</span><h3>생산자와 트럭</h3><p>트럭은 생산자 앞까지 빈 차로 이동해 상자 하나를 받은 뒤 하역장으로 돌아옵니다. 생산 시설 15레벨마다 전용 트럭이 1대 추가되며, 배차된 트럭은 사라지지 않습니다.</p></article><article class="guide-section"><span class="guide-number">3</span><h3>하역·선적·정산</h3><p>트럭 한 대는 화물 하나를 하역장에 놓고 크레인이 배에 선적합니다. 현금은 화물을 실은 배가 출항할 때만 들어오며 빈 배의 수익은 0입니다.</p></article><article class="guide-section"><span class="guide-number">4</span><h3>운송 업그레이드</h3><p>시설 15레벨마다 해당 생산자의 트럭만 새 외형으로 바뀌고 차량 속도가 25% 증가합니다. 크레인은 처음에는 느리며 해외 무역의 크레인 속도 업그레이드마다 선적 시간이 15% 줄어듭니다.</p></article><article class="guide-section"><span class="guide-number">5</span><h3>섬 레벨</h3><p>선박 출항 수익 목표를 달성하면 섬 레벨이 오릅니다. 다음 목표 금액은 이전 목표의 3배이며, 레벨에 따라 그늘 지역이 해금됩니다.</p></article>`)}
  function openSettings(){openSheet('설정','GAME MENU',`<div class="wide-card"><span>🏪</span><div><h3>시설 건설</h3><p>새 생산 시설을 건설하거나 업그레이드합니다.</p></div><button data-menu="build">OPEN</button></div><div class="wide-card"><span>⚓</span><div><h3>해외 무역</h3><p>생산한 자원을 항구에서 판매합니다.</p></div><button data-menu="trade">OPEN</button></div><div class="wide-card"><span>⚙️</span><div><h3>연구소</h3><p>시설별 영구 생산 보너스를 연구합니다.</p></div><button data-menu="research">OPEN</button></div><div class="wide-card"><span>📖</span><div><h3>가이드북</h3><p>시장님을 위한 게임 이용 방법입니다.</p></div><button data-menu="guide">OPEN</button></div><div class="wide-card"><span>🔊</span><div><h3>효과음</h3><p>${state.sound?'켜짐':'꺼짐'}</p></div><button id="soundToggle">${state.sound?'ON':'OFF'}</button></div>`);document.querySelectorAll('[data-menu]').forEach(b=>b.onclick=()=>({build:openBuild,trade:openTrade,research:openResearch,guide:openGuide}[b.dataset.menu])());$('soundToggle').onclick=()=>{state.sound=!state.sound;save();openSettings()}}
  function upgradeRoad(){if(state.roadLevel>=10)return toast('도로가 최고 레벨입니다');const cost=Math.round(2000*Math.pow(1.65,state.roadLevel-1));if(state.coins<cost)return toast('도로 업그레이드 코인이 부족합니다');state.coins-=cost;state.roadLevel++;toast(`도로 Lv.${state.roadLevel} · 차량 속도 증가!`);save()}
  function upgradeCrane(){if(state.craneLevel>=10)return toast('크레인이 최고 레벨입니다');const cost=craneUpgradeCost();if(state.coins<cost)return toast('크레인 속도 업그레이드 코인이 부족합니다');state.coins-=cost;state.craneLevel++;toast(`크레인 속도 Lv.${state.craneLevel} · ×${craneSpeedMultiplier().toFixed(2)} · 선적 ${craneLoadingTime().toFixed(1)}초`);save();openTrade()}
  function upgradeTruckLoading(){if(state.truckLoadLevel>=10)return toast('트럭 상차가 최고 레벨입니다');const cost=truckLoadUpgradeCost();if(state.coins<cost)return toast('트럭 상차 업그레이드 코인이 부족합니다');state.coins-=cost;state.truckLoadLevel++;toast(`트럭 상차 Lv.${state.truckLoadLevel} · ${truckLoadingTime().toFixed(1)}초`);save();openTrade()}
  document.querySelectorAll('.dock-action').forEach(b=>b.onclick=()=>{document.querySelectorAll('.dock-action').forEach(x=>x.classList.remove('active'));b.classList.add('active');({build:openBuild,trade:openTrade,research:openResearch,map:openMap}[b.dataset.panel]||openBuild)()});
  $('mainBuildButton').onclick=openBuild;$('closeSheet').onclick=()=>$('sheet').classList.add('hidden');$('startButton').onclick=()=>{$('welcome').classList.add('closed');if(Date.now()>=state.boostUntil)state.boostUntil=Date.now()+600000;toast('10분 부스트 시작 · 좌클릭 드래그로 이동');save()};
  $('closeFacility').onclick=()=>$('facilityPanel').classList.add('hidden');$('speedBoost').onclick=()=>{if(Date.now()<state.boostUntil)return toast('10분 부스트가 진행 중입니다');state.boostUntil=Date.now()+600000;toast('10분 동안 생산 수익 2배!');save()};$('roadUpgrade').onclick=upgradeRoad;$('guideButton').onclick=openGuide;
  $('settingsButton').onclick=openSettings;updateHUD();
})();
