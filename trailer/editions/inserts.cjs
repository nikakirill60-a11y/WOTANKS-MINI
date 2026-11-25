// Actual first battle and first unlock, in a new offline guest session.
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url'),assert=require('node:assert/strict');
const {chromium}=require('../../tests/node_modules/playwright-core'),root=path.resolve(__dirname,'../..');
(async()=>{const out=path.resolve(process.argv[2]),extra=path.join(out,'inserts'),frames=path.join(out,'frames','first');fs.mkdirSync(extra,{recursive:true});fs.mkdirSync(frames,{recursive:true});
 const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});try{
 const p=await b.newPage({offline:true,viewport:{width:1280,height:720},reducedMotion:'reduce'});await p.goto(pathToFileURL(path.join(root,'index.html')).href);const click=n=>p.getByRole('button',{name:n,exact:true}).click();
 await p.evaluate(()=>localStorage.setItem('ct_progress_v1',JSON.stringify({owned:['MS1'],selected:'MS1',XP:500,settings:{volume:0}})));await click('ГОСТЬ');
 await p.evaluate(async()=>{const g=GameState;document.getElementById('map-select').value='city';document.getElementById('train-nat-select').value='germany';fillEnemySelect();document.getElementById('enemy-select').value='LTR';
 const init=WeatherEngine.initWeatherForBattle;WeatherEngine.initWeatherForBattle=function(a){init.call(this,a);this.currentWeather='clear';};g.controlMode='mobile';if(!await startTraining())throw Error('No first battle');stopBattleLoop();stopPerfMonitor();
 let now=1800,ticks=0;BattleClock.now=()=>now;BattleClock.date=()=>100000+now;document.getElementById('mobile-controls').classList.remove('show');document.body.classList.remove('mobile-mode');
 window.firstFrame=i=>{while(ticks<Math.floor(i/24*60)){now=1800+(++ticks)*1000/60;update();}const p=g.player,e=g.units[1];p.lookAtPoint(e.x,e.y,e.aimHeight);p.slewSight(Math.PI,Math.PI);if(i===30||i===99){if(!p.fire(0))throw Error('No MS-1 shot');}BattleView.syncCamera();BattleView.aim();BattleView.draw();updateHUD();};});
 for(let i=0;i<124;i++){await p.evaluate(i=>firstFrame(i),i);await p.screenshot({path:path.join(frames,String(i).padStart(3,'0')+'.jpg'),type:'jpeg',quality:89});}
 const damage=await p.evaluate(()=>{const n=GameState.battleDmg;backToGarage();return n;});assert.ok(damage>0);await click('Дерево развития');await p.getByLabel('Показать ветку').selectOption('IS7');
 await click('Исследовать: Т-26');const state=await p.evaluate(()=>({id:GameState.selected,xp:GameState.XP,owned:GameState.owned}));assert.equal(state.id,'T26');assert.ok(state.owned.includes('T26'));await p.screenshot({path:path.join(extra,'tree.jpg'),type:'jpeg',quality:94});
 fs.writeFileSync(path.join(frames,'notes.json'),JSON.stringify({id:'MS1',damage,next:state}));console.log('First sortie and real XP research:',damage,state);
 }finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
