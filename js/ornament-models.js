// The case and its four keepsakes are original offline meshes. Bake coloured parts
// together so a full set on the depot spruce doesn't cost a draw call per icing dot.
const OrnamentModels = (() => {
  const T = THREE, pi = Math.PI, cream = '#fff1ce', gold = '#ecb755', pine = '#237363', ruby = '#bd414c';
  function star(n,r,inner) {
    return Array.from({length:2*n},(_,i)=>{const a=pi/2+i*pi/n, d=i%2?inner:r; return [Math.cos(a)*d,Math.sin(a)*d];});
  }
  function loop(k,y) {
    const p=[]; for(let i=0;i<=12;i++){const a=i*pi/6;p.push([.048*Math.sin(a),y+.068*(1-Math.cos(a)),0]);} k.line(gold,p,.010);
  }
  function make(id) {
    const k=modelKit();
    if(id==='gingerbread') {
      // Cut biscuit silhouette, pressed sugar eyes, pearl buttons and piped cuffs.
      const biscuit='#bf773c';
      k.shape(biscuit,[[0,.16],[-.12,.20],[-.26,.26],[-.35,.24],[-.37,.17],[-.34,.11],[-.18,.015],[-.16,-.09],[-.25,-.30],[-.23,-.365],[-.16,-.39],[-.09,-.36],[0,-.20],[.11,-.36],[.18,-.39],[.25,-.35],[.25,-.28],[.16,-.08],[.18,.02],[.33,.10],[.37,.17],[.35,.24],[.28,.26],[.12,.19]],.08,0,0,-.04,0,.022);
      k.ball(biscuit,0,.265,0,.166,.165,.079); loop(k,.42);
      for(const s of [-1,1]) {
        k.ball(cream,s*.058,.297,.072,.021,.025,.011);
        k.line(cream,[[s*.267,.214,.062],[s*.248,.184,.064],[s*.273,.156,.063],[s*.25,.126,.062]],.012);
        k.line(cream,[[s*.10,-.285,.062],[s*.14,-.268,.063],[s*.166,-.293,.063],[s*.21,-.276,.062]],.012);
      }
      k.line(cream,[[-.067,.249,.07],[-.034,.220,.076],[0,.213,.078],[.036,.22,.076],[.07,.25,.07]],.010);
      k.ball(ruby,0,.066,.075,.036,.036,.019); k.ball(pine,0,-.034,.075,.031,.031,.018);
      k.shape('#e7876c',[[-.086,.15],[-.008,.122],[.088,.15],[.081,.08],[.005,.113],[-.081,.08]],.01,0,0,.068);
    } else if(id==='deer') {
      const antler='#b8793b';
      for(const s of [-1,1]) {
        k.line(antler,[[s*.09,.13,0],[s*.19,.245,0],[s*.21,.38,-.016],[s*.17,.47,-.025]],.026);
        k.line(gold,[[s*.195,.29,0],[s*.286,.36,0],[s*.31,.432,0]],.019);
        k.rod(antler,[s*.183,.23,0],[s*.11,.323,-.01],.021);
        k.ball('#ba8050',s*.19,.12,0,.064,.145,.043,0,0,-s*.94);
        k.ball('#f1b598',s*.20,.127,.036,.031,.105,.014,0,0,-s*.94);
      }
      k.shape('#b47745',[[-.167,.12],[-.137,-.09],[-.084,-.24],[0,-.30],[.083,-.24],[.14,-.09],[.166,.12],[.108,.18],[-.105,.18]],.09,0,0,-.045,0,.025);
      k.ball('#ebbf91',0,-.173,.062,.121,.104,.046); k.ball('#ca3f43',0,-.145,.107,.061,.046,.033);
      for(const s of [-1,1]) { k.ball('#352d2c',s*.075,.027,.068,.024,.030,.014); k.ball(cream,s*.071,.037,.079,.008,.008,.006); }
      loop(k,.184);
    } else if(id==='fir') {
      k.box('#a86d40',0,-.292,0,.114,.18,.09);
      k.shape('#288475',[[0,.364],[-.18,.144],[-.102,.148],[-.257,-.045],[-.16,-.029],[-.31,-.247],[-.15,-.225],[0,-.255],[.17,-.22],[.31,-.247],[.16,-.029],[.255,-.045],[.10,.148],[.178,.144]],.084,0,0,-.043,0,.013);
      k.line(gold,[[-.12,.139,.056],[-.041,.105,.056],[.045,.092,.056],[.113,.098,.056]],.012);
      k.line(gold,[[-.181,-.071,.056],[-.081,-.104,.056],[.041,-.113,.056],[.184,-.090,.056]],.012);
      for(const [x,y,c] of [[-.075,.152,cream],[.088,.035,ruby],[-.118,-.025,'#e693a1'],[.086,-.152,cream],[-.16,-.175,ruby]]) k.ball(c,x,y,.061,.026,.026,.019);
      k.shape('#ffce58',star(5,.078,.035),.026,0,.335,.014,0,.003);loop(k,.395);
    } else if(id==='bauble') {
      k.ball('#bd3348',0,-.031,0,.285,.30,.285);
      // Gilded belt and a raised compass star on each side of the lacquered glass.
      k.cyl('#e2aa52',0,-.034,0,.287,.075); k.cyl('#882e43',0,-.034,0,.289,.040);
      for(const z of [-1,1]) k.shape('#ffde90',star(8,.122,.052),.012,0,-.035,z*.289,0,.003);
      k.ball('#f19091',-.104,.105,.211,.035,.078,.012,-.38,-.20,-.44);
      k.cyl('#d7953c',0,.266,0,.084,.083); k.cyl('#f2c579',0,.303,0,.094,.029); loop(k,.316);
    } else throw Error('Unknown ornament: '+id);
    return k.finish('ornament-'+id);
  }

  function caseRig() {
    const group=new T.Group(),hinge=new T.Group(),cargo=new T.Group(); group.name='Ёлочный ларец'; hinge.name='LidHinge'; cargo.name='Ornament tray'; group.add(hinge,cargo);
    const b=modelKit(),l=modelKit(),w=1.13,d=.706,top=1.20;
    const outline=(x,z)=>[[-x+.16,-z],[x-.16,-z],[x,-z+.16],[x,z-.16],[x-.16,z],[-x+.16,z],[-x,z-.16],[-x,-z+.16]];
    function slab(k,c,y,h,x,z,dz=0) { k.shape(c,outline(x,z).map(([xx,zz])=>[xx,-zz]),h,0,y,dz,-pi/2,.009); }
    function walls(k,c,y,h,th,x,z,dz=0) {
      const pts=outline(x,z); pts.forEach(([ax,az],i)=>{const [bx,bz]=pts[(i+1)%8];
        k.box(c,(ax+bx)/2,y,dz+(az+bz)/2,Math.hypot(bx-ax,bz-az)+.016,h,th,0,-Math.atan2(bz-az,bx-ax)); });
    }
    const teal='#18565b',edge='#b28044',velvet='#753346';
    for(const x of [-.81,.81]) for(const z of [-.48,.48]) b.cyl(edge,x,.067,z,.107,.115);
    slab(b,'#264b4a',.098,.082,w,d); walls(b,teal,.665,1.01,.106,w-.042,d-.042);
    for(const y of [.20,.28,1.07,1.16]) walls(b,y===.28||y===1.07?'#5a9990':edge,y,.032,.040,w+.002,d+.002);
    // Lifted velvet tray, two crossing dividers and corner rivets.
    slab(b,velvet,.745,.103,w-.10,d-.105); b.box('#a0616b',0,.907,0,.027,.14,1.15); b.box('#a0616b',0,.907,0,2.06,.14,.027);
    for(const s of [-1,1]) {
      for(const y of [.40,.91]) b.ball(gold,s*.866,y,d+.003,.037,.037,.015);
      for(const z of [-.18,.18]) b.rod(edge,[s*w,.69,z],[s*(w+.088),.65,z],.026);
      b.rod(gold,[s*(w+.088),.65,-.18],[s*(w+.088),.65,.18],.026);
      b.box('#357374',s*.67,.68,d+.004,.25,.043,.018); b.box('#357374',s*.60,.595,d+.004,.19,.025,.018);
    }
    b.shape(edge,[[0,.29],[.344,0],[0,-.29],[-.344,0]],.025,0,.684,d-.002,0,.009);
    b.shape('#235b5a',[[0,.248],[.302,0],[0,-.248],[-.302,0]],.024,0,.684,d+.026,0,.004);
    b.shape(cream,[[0,.171],[-.084,.037],[-.045,.044],[-.132,-.088],[-.028,-.083],[-.028,-.135],[.028,-.135],[.028,-.083],[.132,-.088],[.045,.044],[.084,.037]],.014,0,.684,d+.053,0,.003);
    hinge.position.set(0,top,-d); slab(l,edge,.010,.052,w+.03,d+.025,d);slab(l,'#276b69',.072,.115,w+.022,d+.017,d);
    // Cream envelope in the lid, folded seams in relief, finished with a red wax seal.
    slab(l,'#e7d4ad',.19,.034,w-.083,d-.075,d);
    for(const sx of [-1,1]) for(const sz of [-1,1]) l.rod('#bd986b',[sx*.994,.231,d+sz*.561],[0,.235,d-.022],.013);
    l.cyl('#90364a',0,.258,d,.170,.050); l.cyl(ruby,0,.285,d,.141,.032);
    l.shape('#f7cd78',star(6,.097,.042),.009,0,.306,d,-pi/2,.002);
    l.box(edge,0,-.070,2*d+.012,.142,.188,.067); l.ball(gold,0,-.119,2*d+.06,.045,.044,.018);
    slab(l,'#854455',-.022,.024,w-.073,d-.06,d);
    for(const [i,id] of ['gingerbread','deer','fir','bauble'].entries()) {
      const toy=make(id); toy.rotation.set(-pi*.42,0,(i%2?1:-1)*.13);toy.scale.setScalar(id==='bauble'?.70:.78);
      toy.position.set(i%2?.51:-.51,id==='bauble'?1.026:.937,i<2?.30:-.29);cargo.add(toy);
    }
    group.add(b.finish('Enamel case')); hinge.add(l.finish('Wax-sealed envelope lid'));
    return {group,hinge,cargo,bulbs:[],glow:null};
  }

  // Permanent numbered positions, independent of the ornament type (as on the tree desk).
  function dress(tree,onTree) {
    const branches = [[.04,.74],[-.78,.49],[.92,.49],[.11,.27]].map(([yaw,height],i) => {
      const g = new T.Group(); g.name = 'tree-slot-'+(i+1);
      g.position.set(...onTree(height,yaw,.045)); g.rotation.set(.04,yaw,0); g.scale.setScalar(.50);
      tree.add(g); return g;
    });
    return slots => {
      let changed = false;
      branches.forEach((branch,i) => {
        const id = slots[i], old = branch.children[0];
        if ((old?.userData.ornament ?? null) === id) return;
        if (old) { branch.remove(old); old.geometry.dispose(); old.material.dispose(); }
        if (id) { const toy=make(id); toy.userData.ornament=id; branch.add(toy); }
        changed = true;
      });
      return changed;
    };
  }
  return { make, caseRig, dress };
})();
