/* SaviorFit ragdoll exercise figures (3D mannequin) -- lazy-loaded by the Add this exercise popup. Exposes window.R3, window.RDMap, window.Ragdoll. */
(function(){
/* ---- engine ---- */
/* Ragdoll exercise figure: tiny 2D side-view skeleton drawn as SVG.
   A motion = two poses (A -> B -> A). Poses use hip position, torso angle and
   IK targets for hands / feet. See motions.js for the catalogue. */
(function(g){
var FL = 212, D = {tor:60, ua:34, fa:32, th:44, sh:42, hd:11};
var GOLD = '#f2b134', SK = '#d7dbe0', SKD = '#8f959e', BG = '#14161a', PAD = '#2a2d33', PADS = '#4a4f58';
function lerp(a,b,t){ return a+(b-a)*t; }
function mix(A,B,t){
  var o = {}, k, a, b;
  for (k in B) if (A[k] === undefined) o[k] = B[k];
  for (k in A){
    a = A[k]; b = (B && B[k] !== undefined) ? B[k] : a;
    if (a instanceof Array) o[k] = a.map(function(v,i){ return typeof v === 'number' ? lerp(v, b[i], t) : v; });
    else if (typeof a === 'number') o[k] = lerp(a, b, t); else o[k] = a;
  }
  return o;
}
function ik(a,b,l1,l2,s){
  var dx = b[0]-a[0], dy = b[1]-a[1], d = Math.sqrt(dx*dx+dy*dy) || 0.001, ux = dx/d, uy = dy/d;
  var dd = Math.min(d, l1+l2-0.05), x = (l1*l1-l2*l2+dd*dd)/(2*dd), h = Math.sqrt(Math.max(l1*l1-x*x,0));
  return { mid:[a[0]+ux*x-uy*h*s, a[1]+uy*x+ux*h*s], end:[a[0]+ux*dd, a[1]+uy*dd] };
}
function kin(p){
  var ta = p.tor*Math.PI/180, t = [Math.sin(ta), -Math.cos(ta)], n = [-t[1], t[0]];
  var H = [p.hx, p.hy], sh = p.sh || 0;
  var S = [H[0]+t[0]*D.tor, H[1]+t[1]*D.tor - sh];
  var ha = (p.tor + (p.nk||0))*Math.PI/180, hv = [Math.sin(ha), -Math.cos(ha)];
  var C = [S[0]+hv[0]*(4+D.hd), S[1]+hv[1]*(4+D.hd)];
  var hand;
  if (p.as !== undefined){ var asr = p.as*Math.PI/180, asl = p.al || 64; hand = [S[0]+asl*Math.sin(asr), S[1]+asl*Math.cos(asr)]; }
  else if (p.hl) hand = [S[0]+t[0]*p.hl[0]+n[0]*p.hl[1], S[1]+t[1]*p.hl[0]+n[1]*p.hl[1]];
  else if (p.hs) hand = [S[0]+p.hs[0], S[1]+p.hs[1]];
  else if (p.hh) hand = [H[0]+p.hh[0], H[1]+p.hh[1]];
  else hand = p.hd;
  var sy = g.RD3D ? 0 : 1, fh = p.hd2 ? p.hd2 : [hand[0]-5*sy, hand[1]-1*sy];
  var arm = ik(S, hand, D.ua, D.fa, p.eb), armF = ik(S, fh, D.ua, D.fa, p.eb2 === undefined ? p.eb : p.eb2);
  var ft = p.ft, ft2 = p.ft2 || [ft[0]-9*sy, ft[1]];
  var leg = ik(H, ft, D.th, D.sh, p.kb), legF = ik(H, ft2, D.th, D.sh, p.kb2 === undefined ? p.kb : p.kb2);
  var fa = (p.fa||0)*Math.PI/180, fa2 = (p.fa2 === undefined ? p.fa||0 : p.fa2)*Math.PI/180;
  return { H:H, S:S, C:C, t:t, n:n, hv:hv, hand:arm.end, elb:arm.mid, handF:armF.end, elbF:armF.mid,
           ank:leg.end, knee:leg.mid, ankF:legF.end, kneeF:legF.mid, fa:fa, fa2:fa2 };
}
function f1(v){ return Math.round(v*10)/10; }
function cap(a,b,w,c){ return '<line x1="'+f1(a[0])+'" y1="'+f1(a[1])+'" x2="'+f1(b[0])+'" y2="'+f1(b[1])+'" stroke="'+c+'" stroke-width="'+w+'" stroke-linecap="round"/>'; }
function circ(c,r,f,s,sw){ return '<circle cx="'+f1(c[0])+'" cy="'+f1(c[1])+'" r="'+r+'" fill="'+f+'"'+(s?' stroke="'+s+'" stroke-width="'+(sw||1.6)+'"':'')+'/>'; }
function lerp2(a,b,t){ return [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t]; }
function ell(c,rx,ry,deg,f,o){ return '<ellipse cx="'+f1(c[0])+'" cy="'+f1(c[1])+'" rx="'+rx+'" ry="'+ry+'" transform="rotate('+f1(deg)+' '+f1(c[0])+' '+f1(c[1])+')" fill="'+f+'" opacity="'+o+'"/>'; }
function shape(s){
  if (s.k === 'r') return '<rect x="'+s.x+'" y="'+s.y+'" width="'+s.w+'" height="'+s.h+'" rx="'+(s.r||2)+'" fill="'+(s.f||PAD)+'" stroke="'+(s.s||PADS)+'" stroke-width="1.2"/>';
  if (s.k === 'l') return cap(s.a, s.b, s.w||6, s.c||PAD);
  if (s.k === 'c') return circ([s.x,s.y], s.r, s.f||PAD, s.s||PADS);
  return '';
}
// gold muscle highlight on the body
function hilite(m, K, o, p){
  var out = '', f = GOLD, t = K.t, n = K.n, ang = Math.atan2(t[1],t[0])*180/Math.PI;
  function onT(u,off){ return [K.H[0]+t[0]*D.tor*u+n[0]*off, K.H[1]+t[1]*D.tor*u+n[1]*off - (p.sh||0)*u]; }
  function seg(a,b,u0,u1,w,op){ var A = lerp2(a,b,u0), B = lerp2(a,b,u1); return '<line x1="'+f1(A[0])+'" y1="'+f1(A[1])+'" x2="'+f1(B[0])+'" y2="'+f1(B[1])+'" stroke="'+f+'" stroke-width="'+w+'" stroke-linecap="round" opacity="'+op+'"/>'; }
  var M = {
    chest: function(){ return ell(onT(0.78,6),15,9,ang,f,o); },
    back: function(){ return ell(onT(0.6,-7),22,8,ang,f,o); },
    abs: function(){ return ell(onT(0.3,8),16,8,ang,f,o); },
    traps: function(){ return ell(onT(0.97,-4),11,7,ang,f,o) + ell([K.S[0]+K.hv[0]*3,K.S[1]+K.hv[1]*3],7,5,ang,f,o); },
    shoulders: function(){ return circ([K.S[0]+n[0]*2,K.S[1]+n[1]*2],9,f).replace('/>',' opacity="'+o+'"/>'); },
    biceps: function(){ return seg(K.S,K.elb,.18,.82,13,o) + seg(K.S,K.elbF,.18,.82,13,o*.45); },
    triceps: function(){ return seg(K.S,K.elb,.18,.82,13,o) + seg(K.S,K.elbF,.18,.82,13,o*.45); },
    forearms: function(){ return seg(K.elb,K.hand,.12,.88,11,o) + seg(K.elbF,K.handF,.12,.88,11,o*.45); },
    quads: function(){ return seg(K.H,K.knee,.12,.88,18,o) + seg(K.H,K.kneeF,.12,.88,18,o*.45); },
    hamstrings: function(){ return seg(K.H,K.knee,.12,.88,18,o) + seg(K.H,K.kneeF,.12,.88,18,o*.45); },
    glutes: function(){ return circ([K.H[0]-n[0]*5,K.H[1]-n[1]*5],14,f).replace('/>',' opacity="'+o+'"/>'); },
    calves: function(){ return seg(K.knee,K.ank,.1,.85,14,o) + seg(K.kneeF,K.ankF,.1,.85,14,o*.45); }
  };
  return M[m] ? M[m]() : '';
}
function foot(a, fa, w, c){ var toe = [a[0]+Math.cos(fa)*15, a[1]+Math.sin(fa)*15]; return cap([a[0]-3,a[1]+1.5], toe, 7, c); }
function drawProp(spec, p, K, Hn){
  var kind = spec.prop, out = '', pr = p.pr, hand = K.hand, r = spec.pr || (kind === 'db' ? 8.5 : (kind === 'bar' ? 17 : 5));
  if (p.ph) pr = [K.H[0]+p.ph[0], K.H[1]+p.ph[1]];
  if (p.ps) pr = [K.S[0]+p.ps[0], K.S[1]+p.ps[1]];
  var at = pr || hand;
  if (spec.attach && K[spec.attach]) at = K[spec.attach];
  if (kind === 'bar' || kind === 'ez'){
    out += circ(at, r, '#22252b', GOLD, 2.6) + circ(at, r*0.68, 'none', '#5a606b', 1.4) + circ(at, 3, '#8a909b');
  } else if (kind === 'db'){
    out += circ(K.handF, r, '#22252b', GOLD, 2) ; out += circ(hand, r, '#22252b', GOLD, 2.2);
  } else if (kind === 'cable'){
    var a = spec.anchor; out += cap(a, at, 1.4, '#c9ced6') + circ(a, 4, PAD, GOLD, 1.4) + circ(at, 3.2, GOLD);
  } else if (kind === 'lever'){
    out += cap(spec.pivot, at, 5, '#3a3e46') + circ(spec.pivot, 5, PAD, PADS) + circ(at, 4.2, GOLD);
  } else if (kind === 'grip'){
    out += circ(at, 4, GOLD);
  } else if (kind === 'wheel'){
    out += circ(at, 8, '#22252b', GOLD, 2.4) + circ(at, 2.4, '#8a909b');
  } else if (kind === 'pad'){
    out += circ(at, 8, '#2a2d33', GOLD, 1.8);
  } else if (kind === 'sled'){
    var dx = K.ank[0]-K.H[0], dy = K.ank[1]-K.H[1], l = Math.sqrt(dx*dx+dy*dy) || 1, ux = dx/l, uy = dy/l, q = [K.ank[0]+ux*5, K.ank[1]+uy*5], pp = [-uy, ux];
    out += cap([q[0]-pp[0]*24,q[1]-pp[1]*24],[q[0]+pp[0]*24,q[1]+pp[1]*24],7,'#3a3e46') + cap([q[0]-pp[0]*20,q[1]-pp[1]*20],[q[0]+pp[0]*20,q[1]+pp[1]*20],2,GOLD);
  }
  if (spec.rope && kind === 'cable') out += '';
  return out;
}
function render(spec, u, time){
  var p = spec.gen ? spec.gen(time||0) : mix(spec.A, spec.B, u), K = kin(p), o = '', i;
  o += '<rect x="-300" y="-300" width="900" height="700" fill="'+BG+'"/><rect x="-300" y="'+FL+'" width="900" height="200" fill="#1a1c21"/><line x1="-300" y1="'+FL+'" x2="600" y2="'+FL+'" stroke="#3c4048" stroke-width="2"/>';
  o += '<ellipse cx="150" cy="'+(FL+1)+'" rx="95" ry="4" fill="#000" opacity=".35"/>';
  (spec.scene ? spec.scene(K, p, time||0) : []).forEach(function(s){ o += shape(s); });
  // far limbs
  o += cap(K.H, K.kneeF, 13, SKD) + cap(K.kneeF, K.ankF, 10, SKD) + foot(K.ankF, K.fa2, 7, SKD);
  o += cap(K.S, K.elbF, 10, SKD) + cap(K.elbF, K.handF, 8.5, SKD);
  // torso, neck, head
  o += cap(K.H, K.S, 26, SK) + cap([K.S[0]+K.hv[0]*2,K.S[1]+K.hv[1]*2],[K.S[0]+K.hv[0]*6,K.S[1]+K.hv[1]*6],10,SK);
  o += circ(K.C, D.hd, SK) + circ([K.C[0]+K.n[0]*5.5+K.hv[0]*1, K.C[1]+K.n[1]*5.5+K.hv[1]*1], 1.5, BG);
  // near leg
  o += cap(K.H, K.knee, 15, SK) + cap(K.knee, K.ank, 11.5, SK) + foot(K.ank, K.fa, 7.5, SK);
  if (spec.prop === 'sled' || spec.prop === 'lever' || spec.prop === 'cable') o += drawProp(spec, p, K);
  // far arm over torso? draw prop plate between far and near arm for bars
  if (spec.prop === 'bar' || spec.prop === 'ez' || spec.prop === 'db' || spec.prop === 'wheel' || spec.prop === 'grip' || spec.prop === 'pad') o += drawProp(spec, p, K);
  // near arm
  o += cap(K.S, K.elb, 11, SK) + cap(K.elb, K.hand, 9.5, SK);
  // muscle highlight
  var pulse = 0.5 + 0.2*Math.sin((time||0)*5);
  if (spec.muscle) o += hilite(spec.muscle, K, pulse, p);
  // joints
  [K.knee, K.elb].forEach(function(j){ o += circ(j, 3.6, BG, GOLD, 1.5); });
  o += circ(K.H, 3.2, BG, GOLD, 1.4) + circ(K.S, 3.2, BG, GOLD, 1.4);
  // hand cap
  o += circ(K.hand, 4.6, SK, GOLD, 1.3);
  return o;
}
// cycle: pose parameter over time
function phase(time, spec){
  var T = spec.tempo || [1.1, 0.25, 1.1, 0.25], tot = T[0]+T[1]+T[2]+T[3], x = time % tot;
  function sm(v){ v = Math.max(0,Math.min(1,v)); return v*v*(3-2*v); }
  if (x < T[0]) return sm(x/T[0]);
  x -= T[0]; if (x < T[1]) return 1;
  x -= T[1]; if (x < T[2]) return 1-sm(x/T[2]);
  return 0;
}
var live = [];
var io = (typeof IntersectionObserver !== 'undefined') ? new IntersectionObserver(function(es){ es.forEach(function(e){ var it = e.target.__rd; if (it) it.vis = e.isIntersecting; }); }, {rootMargin:'80px'}) : null;
var running = false;
var lastT = 0;
function tick(now){
  if (now - lastT < 30){ requestAnimationFrame(tick); return; }
  lastT = now; var any = false;
  for (var i = 0; i < live.length; i++){
    var it = live[i]; if (!it.el.isConnected) { live.splice(i--,1); continue; }
    if (it.vis === false || it.paused) continue;
    any = true;
    var t = now/1000, u = it.still != null ? it.still : phase(t, it.spec);
    it.svg.innerHTML = render(it.spec, u, t);
  }
  if (live.length) requestAnimationFrame(tick); else running = false;
}
function fitBox(spec){
  var xs = [], ys = [];
  [spec.A, mix(spec.A, spec.B, 1), mix(spec.A, spec.B, 0.5)].forEach(function(p){
    var K = kin(p);
    [K.H,K.S,K.C,K.knee,K.ank,K.hand,K.elb,K.kneeF,K.ankF].forEach(function(q){ xs.push(q[0]); ys.push(q[1]); });
    if (p.ps) { xs.push(K.S[0]+p.ps[0]); ys.push(K.S[1]+p.ps[1]); }
    if (spec.prop === 'bar' || spec.prop === 'ez') { xs.push(K.hand[0]-20, K.hand[0]+20); ys.push(K.hand[1]-20); }
  });
  (spec.fit || []).forEach(function(q){ xs.push(q[0]); ys.push(q[1]); });
  if (spec.scene){ var K0 = kin(spec.A); spec.scene(K0, spec.A).forEach(function(s){ if (s.a){ xs.push(s.a[0], s.b[0]); ys.push(s.a[1], s.b[1]); } else if (s.x !== undefined){ xs.push(s.x, s.x+(s.w||0)); ys.push(s.y, s.y+(s.h||0)); } }); }
  ys.push(FL + 6);
  var x0 = Math.min.apply(0,xs)-24, x1 = Math.max.apply(0,xs)+24, y0 = Math.min.apply(0,ys)-22, y1 = Math.max.apply(0,ys);
  var w = Math.max(x1-x0, (y1-y0)*300/262, 170), h = w*262/300, cx = (x0+x1)/2;
  if (w > 300){ w = 300; h = 262; }
  var vx = cx - w/2, vy = y1 - h + 8;
  return vx.toFixed(1)+' '+vy.toFixed(1)+' '+w.toFixed(1)+' '+h.toFixed(1);
}
function mount(el, spec, opts){
  opts = opts || {};
  var svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox', fitBox(spec)); svg.setAttribute('width','100%'); svg.style.display = 'block';
  el.innerHTML = ''; el.appendChild(svg);
  var it = { el:el, svg:svg, spec:spec, vis: io ? false : true, still: opts.still != null ? opts.still : null };
  if (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches && it.still == null) it.still = 0;
  el.__rd = it; live.push(it);
  svg.innerHTML = render(spec, it.still != null ? it.still : 0, 0);
  if (io) io.observe(el);
  if (!running){ running = true; requestAnimationFrame(tick); }
  return it;
}
g.Ragdoll = { render:render, mount:mount, kin:kin, mix:mix, phase:phase, fitBox:fitBox, FL:FL, D:D };
})(window);
;
/* ---- motions ---- */
/* Motion catalogue: each returns {A,B,prop,muscle,...}. Coordinates are in the 300x240 figure box (floor y=212). */
(function(g){
var FL = 212, F = [150,206];
function ST(o){ return Object.assign({hx:150,hy:121,tor:0,ft:[150,206],kb:-1,eb:1,nk:0,hl:[-62,4]}, o||{}); }
function SEAT(o){ return Object.assign({hx:140,hy:158,tor:-4,ft:[186,206],kb:-1,eb:1,nk:0,hl:[-62,4]}, o||{}); }
var PADC = '#2a2d33', PADS = '#4a4f58';
function benchScene(K){
  var b = [-K.n[0]*17, -K.n[1]*17], a = [K.H[0]-K.t[0]*10+b[0], K.H[1]-K.t[1]*10+b[1]], c = [K.S[0]+K.t[0]*24+b[0], K.S[1]+K.t[1]*24+b[1]];
  var out = [{k:'l',a:a,b:[a[0],FL],w:5,c:'#3a3e46'},{k:'l',a:c,b:[c[0],FL],w:5,c:'#3a3e46'},{k:'l',a:a,b:c,w:10,c:PADC}];
  if (K.t[1] > 0.1){ // decline: bench runs on under the legs, ankles hooked under a roller
    var d = [-K.t[0], -K.t[1]], e = [a[0]+d[0]*84, a[1]+d[1]*84];
    out.push({k:'l',a:a,b:e,w:10,c:PADC},{k:'l',a:e,b:[e[0],FL],w:5,c:'#3a3e46'},{k:'l',a:[K.ank[0]-3,K.ank[1]-11],b:[K.ank[0]+3,K.ank[1]-11],w:9,c:'#3a3e46'});
  }
  return out;
}
function seatScene(x,y,backTop){
  return function(){ return [{k:'l',a:[x+8,y+8],b:[x+8,FL],w:5,c:'#3a3e46'},{k:'r',x:x-22,y:y,w:60,h:9,r:4},{k:'l',a:[x-26,y+2],b:[x-34,backTop||70],w:9,c:PADC}]; };
}
function rack(){ return []; }
function pullBar(y){ return [{k:'l',a:[100,y],b:[200,y],w:5,c:'#5a606b'},{k:'l',a:[100,y],b:[100,y-2],w:2,c:'#5a606b'}]; }
var M = {};

// ---------- chest ----------
M.bench = function(inc, prop, muscle, close){
  var a = -90 + inc, hy = inc < 0 ? 140 : 152, S = {hx:218,hy:hy,tor:a,ft:inc<0?[296,119]:[262,206],kb:-1,eb:1,nk:0,hl:[4,64],lz:0.08,hz:close?-0.08:0.1,ez:close?-0.02:0.08};
  var sp = {A:S, B:{hl:[-12,16],ez:close?0.0:0.16}, prop:prop, muscle:muscle||'chest', scene:benchScene};
  return sp;
};
M.machineBench = function(){
  return {A:SEAT({tor:-6,hl:[-4,20]}), B:{hl:[-4,62]}, prop:'lever', pivot:[118,156], muscle:'chest', scene:function(){
    var o = seatScene(138,166,60)();
    o.push({k:'r',x:56,y:52,w:36,h:152,r:4},{k:'r',x:52,y:44,w:44,h:10,r:3},
      {k:'l',a:[74,70],b:[74,196],w:3,c:'#6b717c'},{k:'l',a:[62,98],b:[86,98],w:4,c:'#d94b4b'},
      {k:'l',a:[60,FL-3],b:[190,FL-3],w:6,c:'#2b2e35'},
      {k:'l',a:[128,174],b:[158,FL-3],w:5,c:'#3a3e46'},
      {k:'l',a:[118,150],b:[118,166],w:7,c:'#2b2e35'});
    return o; }};
};
M.fly = function(){ // lying DB fly
  return {A:{hx:218,hy:152,tor:-90,ft:[262,206],kb:-1,eb:-1,nk:0,hl:[2,16],fl:92,lz:0.08}, B:{hl:[0,64],fl:-8}, prop:'db', muscle:'chest', scene:benchScene, tempo:[1.5,0.3,1.5,0.3], wide:true};
};
M.cableFly = function(kind){
  var low = kind === 'Incline', high = kind === 'Decline';
  var anc = low ? [100,200] : (high ? [100,24] : [100,92]);
  var fe0 = low ? -34 : (high ? 34 : -4), fe1 = low ? 30 : (high ? -36 : -8);
  return {A:ST({tor:10,hl:[-6,10],eb:1,hy:122,fl:84,fe:fe0}), B:ST({tor:10,hl:[-14,56],hy:122,fl:6,fe:fe1}), prop:'cable', anchor:anc, twin:true, wide:true, tempo:[1.3,0.3,1.3,0.3], muscle:'chest', scene:function(){ return [{k:'l',a:[anc[0]-8,anc[1]],b:[anc[0]-8,FL],w:8,c:'#33363d'}]; }};
};
M.pecDeck = function(){
  return {A:SEAT({tor:-4,hl:[-2,2],fl:78,fd:1}), B:{hl:[-6,50],fl:8}, prop:'lever', pivot:[140,40], wide:true, tempo:[1.4,0.3,1.4,0.3], muscle:'chest', scene:seatScene(138,166,60)};
};
M.cablePress = function(){
  return {A:ST({tor:8,hy:122,hl:[-6,22]}), B:ST({tor:8,hy:122,hl:[-6,62]}), prop:'cable', anchor:[40,72], twin:true, colTop:22, muscle:'chest', scene:function(){ return [{k:'l',a:[32,22],b:[32,FL],w:8,c:'#33363d'}]; }};
};
M.pushup = function(){
  var hd=[203,205], ft=[60,205];
  return {A:{hx:138,hy:169,tor:65.7,ft:ft,kb:-1,eb:1,nk:-40,hd:hd}, B:{hx:145,hy:187,tor:81.3}, muscle:'chest'};
};
M.dips = function(muscle){
  var bars = function(){ return [{k:'l',a:[112,130],b:[196,130],w:5,c:'#5a606b'},{k:'l',a:[116,130],b:[116,FL],w:5,c:'#3a3e46'},{k:'l',a:[192,130],b:[192,FL],w:5,c:'#3a3e46'}]; };
  return {A:{hx:140,hy:123,tor:10,ft:[106,160],kb:-1,eb:1,nk:0,hd:[150,127]}, B:{hx:139.5,hy:141,tor:18,ft:[104,176]}, muscle:muscle||'triceps', scene:bars};
};

// ---------- back ----------
M.pullup = function(){
  return {A:{hx:150,hy:148,tor:0,ft:[122,184],kb:-1,eb:1,nk:0,hd:[160,22]}, B:{hy:108,ft:[122,144]}, muscle:'back', scene:function(){ return [{k:'l',a:[100,20],b:[204,20],w:5,c:'#5a606b'},{k:'l',a:[100,20],b:[100,FL],w:4,c:'#2b2e35'},{k:'l',a:[204,20],b:[204,FL],w:4,c:'#2b2e35'}]; }};
};
M.hang = function(){
  return {A:{hx:150,hy:140,tor:0,ft:[122,178],kb:-1,eb:1,nk:0,hd:[158,14]}, B:{hy:144,ft:[122,182]}, muscle:'forearms', tempo:[1.4,0.1,1.4,0.1], scene:function(){ return [{k:'l',a:[100,12],b:[204,12],w:5,c:'#5a606b'},{k:'l',a:[100,12],b:[100,FL],w:4,c:'#2b2e35'},{k:'l',a:[204,12],b:[204,FL],w:4,c:'#2b2e35'}]; }};
};
M.pulldown = function(machine){
  var ex = {A:SEAT({hx:138,tor:-2,hl:[62,12],eb:1}), B:{tor:-10,hl:[-12,24],eb:1}, prop:'cable', anchor:[170,14], muscle:'back',
    scene:function(){ return [{k:'l',a:[170,10],b:[170,14],w:4,c:'#5a606b'},{k:'l',a:[150,10],b:[210,10],w:6,c:'#33363d'},{k:'l',a:[205,10],b:[205,FL],w:8,c:'#33363d'},{k:'r',x:138-22,y:166,w:60,h:9,r:4},{k:'l',a:[138+8,175],b:[138+8,FL],w:5,c:'#3a3e46'},{k:'l',a:[168,144],b:[188,148],w:9,c:PADC},{k:'l',a:[178,146],b:[178,100],w:3,c:'#33363d'}]; }};
  return ex;
};
M.rowBent = function(prop, muscle){
  return {A:{hx:120,hy:122,tor:54,ft:[150,206],kb:-1,eb:1,nk:-35,hs:[6,58]}, B:{hs:[-18,26]}, prop:prop, muscle:muscle||'back'};
};
M.rowSeated = function(machine){
  var base = {hx:128,hy:160,tor:-2,ft:[196,192],kb:-1,eb:1,nk:0,hs:[60,22]};
  return {A:base, B:{tor:-12,hs:[8,28]}, prop:machine?'lever':'cable', anchor:[262,128], pivot:[230,125], muscle:'back',
    scene:function(K){ var o=[{k:'r',x:100,y:168,w:56,h:9,r:4},{k:'l',a:[108,176],b:[108,FL],w:5,c:'#3a3e46'},{k:'l',a:[200,200],b:[216,184],w:6,c:'#3a3e46'},{k:'l',a:[262,100],b:[262,FL],w:8,c:'#33363d'}]; if (machine && K) o.push({k:'l',a:[K.S[0]+13,K.S[1]+14],b:[K.S[0]+13,K.S[1]+46],w:9,c:PADC},{k:'l',a:[K.S[0]+13,K.S[1]+46],b:[K.S[0]+13,FL],w:5,c:'#3a3e46'}); return o; }};
};
M.rowOne = function(){
  return {A:{hx:112,hy:122,tor:75,ft:[112,206],kb:-1,eb:1,nk:-40,hs:[4,54],hd2:[190,142]}, B:{hs:[-20,20]}, prop:'db', muscle:'back',
    scene:function(){ return [{k:'r',x:150,y:150,w:90,h:9,r:4},{k:'l',a:[160,159],b:[160,FL],w:5,c:'#3a3e46'},{k:'l',a:[230,159],b:[230,FL],w:5,c:'#3a3e46'}]; }};
};
M.pullover = function(){ // standing straight-arm pulldown: arms stay straight and sweep an arc from overhead-forward down to the thighs
  var A = ST({hx:146,hy:126,tor:18,ft:[150,206],hl:undefined,as:146}), B = {as:14};
  return {A:A, B:B, prop:'cable', anchor:[214,10], muscle:'back', tempo:[1.4,0.3,1.4,0.3], scene:function(){ return [{k:'l',a:[224,8],b:[224,FL],w:8,c:'#33363d'},{k:'l',a:[204,10],b:[226,10],w:5,c:'#33363d'}]; }};
};
M.deadlift = function(sumo, prop){
  return {A:{hx:sumo?124:118,hy:sumo?158:150,tor:sumo?52:62,ft:[150,206],kb:-1,eb:1,nk:-30,hd:[sumo?170:172,190]}, B:ST({hl:undefined,hd:[158,130]}), prop:prop||'bar', muscle:'back', pr:17};
};

// ---------- shoulders ----------
M.ohp = function(prop, seated, arnold){
  var A = seated ? SEAT({tor:-3,hl:[-6,arnold?16:10],eb:1}) : ST({hl:[-4,arnold?14:10],eb:1});
  var B = seated ? {hl:[62,4]} : {hl:[62,4]};
  var sp = {A:A, B:B, prop:prop, muscle:'shoulders'};
  if (seated) sp.scene = seatScene(138,166,64);
  if (prop === 'cable') sp.anchor = [60,205];
  if (prop === 'lever') sp.pivot = [102,116];
  return sp;
};
M.latRaise = function(prop){
  var sp = {A:ST({hl:[-60,6],eb:1,zs:0}), B:ST({hl:[-2,44],eb:1,zs:0.32}), prop:prop, muscle:'shoulders'};
  if (prop === 'cable') sp.anchor = [100,200];
  if (prop === 'lever'){ sp.A = SEAT({tor:-3,hl:[-58,8],zs:0}); sp.B = {hl:[-4,44],eb:1,zs:0.32}; sp.pivot = [100,110]; sp.scene = seatScene(138,166,64); }
  return sp;
};
M.frontRaise = function(prop){
  var sp = {A:ST({hl:[-62,10],eb:1}), B:ST({hl:[2,62],eb:1}), prop:prop, muscle:'shoulders'};
  if (prop === 'cable') sp.anchor = [60,205];
  return sp;
};
M.rearFly = function(prop){
  if (prop === 'cable') return {A:ST({tor:6,hl:undefined,hs:[60,6],eb:1}), B:{hs:[16,4]}, prop:'cable', anchor:[232,72], muscle:'shoulders', tempo:[1.3,0.3,1.3,0.3], scene:function(){ return [{k:'l',a:[226,22],b:[226,FL],w:8,c:'#33363d'}]; }};
  var sp = {A:{hx:118,hy:138,tor:66,ft:[150,206],kb:-1,eb:1,nk:-40,hs:[8,60],zs:0}, B:{hs:[-4,16],eb:1,zs:0.3}, prop:prop, muscle:'shoulders'};
  return sp;
};

M.facePull = function(){
  return {A:ST({tor:-4,hl:[-2,60],eb:1}), B:ST({tor:-4,hl:[22,16],eb:-1}), prop:'cable', anchor:[250,60], muscle:'shoulders', scene:function(){ return [{k:'l',a:[256,50],b:[256,FL],w:8,c:'#33363d'}]; }};
};
M.shrug = function(prop){
  var sp = {A:ST({hl:[-62,4]}), B:{sh:10}, prop:prop, muscle:'traps', tempo:[0.6,0.35,0.9,0.2]};
  if (prop === 'cable') sp.anchor = [150,205];
  return sp;
};
M.upright = function(prop){
  return {A:ST({hl:[-62,6],eb:1,eo:[2,34]}), B:{hl:[-18,18],eo:[6,-10]}, prop:prop, muscle:'traps'};
};

// ---------- arms ----------
M.curl = function(prop, kind){
  var A = ST({hl:[-62,4],eb:1}), B = {hl:[-8,32]}, sp = {A:A, B:B, prop:prop, muscle:'biceps'};
  if (prop === 'bar' || prop === 'ez') sp.pr = 14;
  if (prop === 'cable') sp.anchor = [210,204];
  if (kind === 'preacher'){
    sp.A = SEAT({hx:128,hy:158,tor:14,hl:[-30,50]}); sp.B = {hl:[-6,30]};
    sp.scene = function(K){ var p0 = [K.S[0]+K.n[0]*14-K.t[0]*4, K.S[1]+K.n[1]*14-K.t[1]*4], p1 = [K.S[0]+K.n[0]*52-K.t[0]*56, K.S[1]+K.n[1]*52-K.t[1]*56]; return [{k:'r',x:106,y:166,w:50,h:9,r:4},{k:'l',a:[114,175],b:[114,FL],w:5,c:'#3a3e46'},{k:'l',a:p0,b:p1,w:13,c:PADC},{k:'l',a:[p1[0]-6,p1[1]],b:[p1[0]-14,FL],w:5,c:'#3a3e46'}]; };
  }
  if (kind === 'conc'){
    sp.A = SEAT({hx:138,hy:158,tor:58,hl:undefined,hd:[184,193],ft:[188,206],nk:-14}); sp.B = {hd:[200,134]};
    sp.scene = function(){ return [{k:'r',x:114,y:166,w:62,h:9,r:4},{k:'l',a:[122,175],b:[122,FL],w:5,c:'#3a3e46'},{k:'l',a:[168,175],b:[168,FL],w:5,c:'#3a3e46'}]; };
  }
  return sp;
};
M.pushdown = function(){
  return {A:ST({hl:[-22,22],eb:1}), B:ST({hl:[-58,8],eb:1}), prop:'cable', anchor:[190,14], muscle:'triceps', scene:function(){ return [{k:'l',a:[190,10],b:[190,FL],w:8,c:'#33363d'},{k:'l',a:[160,10],b:[220,10],w:6,c:'#33363d'}]; }};
};
M.skull = function(prop){
  return {A:{hx:218,hy:152,tor:-90,ft:[262,206],kb:-1,eb:1,nk:0,hl:[14,62]}, B:{hl:[26,22],eb:1}, prop:prop, muscle:'triceps', scene:benchScene, pr:15};
};
M.overheadExt = function(prop){
  var sp = {A:ST({hl:[64,2],eb:1}), B:{hl:[8,-24],eb:1}, prop:prop, muscle:'triceps'};
  if (prop === 'cable') sp.anchor = [60,200];
  return sp;
};
M.kickback = function(prop){
  var sp = {A:{hx:120,hy:122,tor:62,ft:[150,206],kb:-1,eb:1,nk:-35,hs:[-34,36]}, B:{hs:[-64,6]}, prop:prop, muscle:'triceps'};
  if (prop === 'cable') sp.anchor = [240,205];
  return sp;
};
M.wrist = function(prop){
  var sp = {A:SEAT({tor:24,hd:[190,152],eb:1,hl:undefined}), B:{hd:[192,138]}, prop:prop, muscle:'forearms',
    scene:function(){ return [{k:'r',x:114,y:166,w:62,h:9,r:4},{k:'l',a:[122,175],b:[122,FL],w:5,c:'#3a3e46'},{k:'l',a:[168,175],b:[168,FL],w:5,c:'#3a3e46'}]; }};
  delete sp.A.hl;
  if (prop === 'cable') sp.anchor = [250,206];
  return sp;
};

// ---------- core ----------
M.crunch = function(){
  return {A:{hx:210,hy:198,tor:-90,ft:[246,206],kb:-1,eb:1,nk:0,hs:[-12,-6]}, B:{tor:-58,nk:-6}, muscle:'abs', tempo:[0.8,0.2,0.8,0.2]};
};
M.plank = function(){
  return {A:{hx:132,hy:181,tor:80,ft:[48,204],kb:-1,eb:1,nk:-60,hd:[226,205]}, B:{hy:178}, muscle:'abs', tempo:[1.4,0.2,1.4,0.2]};
};
M.legRaise = function(){
  return {A:{hx:150,hy:140,tor:0,ft:[128,178],kb:-1,eb:-1,nk:0,hd:[152,16]}, B:{tor:-6,ft:[234,138]}, muscle:'abs', scene:function(){ return [{k:'l',a:[100,12],b:[204,12],w:5,c:'#5a606b'},{k:'l',a:[100,12],b:[100,FL],w:4,c:'#2b2e35'},{k:'l',a:[204,12],b:[204,FL],w:4,c:'#2b2e35'}]; }};
};
M.cableCrunch = function(){
  return {A:{hx:140,hy:160,tor:0,ft:[96,205],kb:-1,eb:-1,nk:0,hl:[2,16]}, B:{tor:55,hy:164,hl:[-4,12]}, prop:'cable', anchor:[160,14], muscle:'abs',
    scene:function(){ return [{k:'l',a:[160,10],b:[160,FL],w:8,c:'#33363d'},{k:'r',x:150,y:196,w:40,h:10,r:3}]; }};
};
M.pallof = function(){
  return {A:ST({tor:2,hl:[-2,16]}), B:ST({tor:2,hl:[-2,60]}), prop:'cable', anchor:[262,96], muscle:'abs', scene:function(){ return [{k:'l',a:[262,86],b:[262,FL],w:8,c:'#33363d'}]; }};
};
M.twist = function(){
  return {A:{hx:150,hy:196,tor:-38,ft:[222,168],kb:-1,eb:1,nk:0,hl:[-8,26]}, B:{hl:[-16,16]}, prop:'db', muscle:'abs', tempo:[0.7,0.1,0.7,0.1]};
};
M.abWheel = function(){
  return {A:{hx:104,hy:162,tor:55,ft:[62,205],kb:-1,eb:1,nk:-30,hd:[150,197]}, B:{hx:148,hy:187,tor:82,hd:[258,203],nk:-50,ft:[68,205]}, prop:'wheel', muscle:'abs'};
};

// ---------- legs ----------
M.squat = function(kind){
  var A = ST({tor:2,hl:undefined}), B = ST({hx:112,hy:168,tor:36});
  var sp = {A:A, B:B, muscle:'quads'};
  delete sp.A.hl; delete B.hl;
  if (kind === 'back'){ A.hs=[-4,-2]; sp.prop='bar'; sp.ps=[-8,-4]; sp.pr=15; A.eb=-1; }
  else if (kind === 'front'){ A.hs=[12,2]; sp.prop='bar'; sp.ps=[10,0]; sp.pr=15; A.eb=-1; }
  else { A.hs=[14,12]; sp.prop='db'; A.eb=1; }
  sp.A = A; sp.B = {hx:112,hy:168,tor:36};
  if (kind === 'goblet') sp.B.tor = 28;
  return sp;
};
M.legPress = function(calf){
  if (calf) return M.calfPress();
  var A = {hx:118,hy:172,tor:-52,ft:[188,125],kb:-1,eb:1,nk:0,hd:[100,152],fa:-122}, B = {ft:[150,148]};
  return {A:A, B:B, prop:'sled', lp:true, muscle:'quads', scene:function(K){
    var bx = -K.n[0]*17, by = -K.n[1]*17, H = K.H, S = K.S, t = K.t;
    return [{k:'l',a:[96,186],b:[236,96],w:6,c:'#33363d'},
      {k:'l',a:[H[0]-t[0]*10+bx, H[1]-t[1]*10+by],b:[S[0]+t[0]*26+bx, S[1]+t[1]*26+by],w:10,c:PADC},
      {k:'l',a:[H[0]-4+bx*0.55, H[1]+by*0.55+2],b:[H[0]+22+bx*0.55, H[1]-5+by*0.55],w:9,c:PADC}]; }};
};
M.calfPress = function(){
  return {A:{hx:126,hy:160,tor:-12,ft:[210,152],kb:-1,eb:1,nk:0,hd:[136,150],fa:-14}, B:{fa:30}, muscle:'calves', tempo:[0.9,0.3,0.9,0.3],
    scene:function(K){ var o = seatScene(138,166,64)(); o.push({k:'r',x:226,y:112,w:7,h:84,r:2},{k:'l',a:[229,196],b:[229,FL],w:6,c:'#2b2e35'},{k:'l',a:[150,FL-5],b:[240,FL-5],w:6,c:'#2b2e35'},{k:'l',a:[150,176],b:[132,184],w:6,c:'#3a3e46'}); return o; }};
};
M.lunge = function(prop){
  var A = ST({hx:143,hy:121,tor:0,ft:[168,206],ft2:[118,206],hl:[-62,4]}), B = {hx:143,hy:156,tor:3,ft:[186,206],ft2:[94,204],fa2:-35};
  var sp = {A:A, B:B, prop:prop, muscle:'quads'};
  if (prop === 'bar'){ delete A.hl; A.hs=[-4,-2]; A.eb=-1; sp.ps=[-8,-4]; sp.pr=15; }
  if (prop === 'none'){ delete A.hl; A.hs=[12,26]; A.eb=1; }
  return sp;
};
M.bulgarian = function(prop, muscle){
  var A = ST({hx:150,hy:128,tor:0,ft:[178,206],ft2:[96,170],hl:[-62,4]}), B = {hx:146,hy:154,tor:6,ft:[182,206],ft2:[96,168],fa2:-60};
  return {A:A, B:B, prop:prop==='db'?'db':'none', muscle:muscle||'quads', scene:function(){ return [{k:'r',x:62,y:172,w:46,h:9,r:3},{k:'l',a:[70,181],b:[70,FL],w:5,c:'#3a3e46'},{k:'l',a:[100,181],b:[100,FL],w:5,c:'#3a3e46'}]; }};
};
M.legExt = function(){
  return {A:{hx:128,hy:160,tor:-8,ft:[176,206],kb:-1,eb:1,nk:0,hd:[132,162]}, B:{ft:[213,152]}, prop:'pad', attach:'ank', muscle:'quads',
    scene:function(){ return [{k:'r',x:100,y:168,w:60,h:9,r:4},{k:'l',a:[108,177],b:[108,FL],w:5,c:'#3a3e46'},{k:'l',a:[104,166],b:[94,92],w:9,c:PADC}]; }};
};
M.legCurlSeated = function(){
  return {A:{hx:128,hy:160,tor:-8,ft:[213,160],kb:-1,eb:1,nk:0,hd:[132,162]}, B:{ft:[174,206]}, prop:'pad', attach:'ank', muscle:'hamstrings',
    scene:function(K){
      var u = [K.knee[0]-K.H[0], K.knee[1]-K.H[1]], l = Math.sqrt(u[0]*u[0]+u[1]*u[1]) || 1; u = [u[0]/l, u[1]/l];
      var nr = [u[1], -u[0]], pa = [K.H[0]+u[0]*20+nr[0]*12, K.H[1]+u[1]*20+nr[1]*12], pb = [K.knee[0]-u[0]*6+nr[0]*12, K.knee[1]-u[1]*6+nr[1]*12], pm = [(pa[0]+pb[0])/2, (pa[1]+pb[1])/2], top = [pm[0]+2, pm[1]-30];
      return [{k:'l',a:pa,b:pb,w:9,c:PADC},{k:'l',a:[pm[0]+nr[0]*4,pm[1]+nr[1]*4],b:top,w:5,c:'#3a3e46'},{k:'l',a:top,b:[top[0]-36,top[1]-2],w:5,c:'#3a3e46'},
        {k:'r',x:100,y:168,w:60,h:9,r:4},{k:'l',a:[108,177],b:[108,FL],w:5,c:'#3a3e46'},{k:'l',a:[104,166],b:[94,92],w:9,c:PADC}]; }};
};
M.legCurlLying = function(){
  return {A:{hx:196,hy:150,tor:90,ft:[112,152],kb:-1,eb:-1,nk:-30,hd:[250,160]}, B:{ft:[156,108],kb:-1}, prop:'pad', attach:'ank', muscle:'hamstrings',
    scene:function(){ return [{k:'l',a:[80,170],b:[262,170],w:10,c:PADC},{k:'l',a:[96,170],b:[96,FL],w:5,c:'#3a3e46'},{k:'l',a:[240,170],b:[240,FL],w:5,c:'#3a3e46'}]; }};
};
M.nordic = function(){
  return {A:{hx:150,hy:162,tor:0,ft:[108,205],kb:-1,eb:1,nk:0,hs:[16,26],hl:undefined}, B:{hx:191,hy:186,tor:70,hs:[6,36]}, muscle:'hamstrings', tempo:[1.5,0.3,1.0,0.3],
    scene:function(){ return [{k:'r',x:132,y:204,w:36,h:6,r:3}]; }};
};
M.rdl = function(prop, kind){
  var A = ST({hl:[-62,4]}), B = {hx:122,hy:128,tor:64,nk:-20}, sp = {A:A, B:B, prop:prop, muscle:'hamstrings'};
  delete A.hl; A.hs=[3,62]; B.hs=[-12,62];
  if (kind === 'gm'){ A.hs=[-4,-2]; B.hs=[-4,-2]; A.eb=-1; B.eb=-1; sp.ps=[-8,-4]; sp.pr=15; sp.prop='bar'; }
  if (prop === 'cable'){ sp.anchor = [40,200]; }
  return sp;
};
M.hipThrust = function(prop, muscle){
  var A = {hx:178,hy:192,tor:-46,ft:[236,206],kb:-1,eb:1,nk:-10,hh:[10,-8]}, B = {hx:195,hy:150,tor:-90};
  var sp = {A:A, B:B, prop:prop, muscle:muscle||'glutes', scene:function(){ return [{k:'r',x:70,y:166,w:62,h:10,r:4},{k:'l',a:[80,176],b:[80,FL],w:5,c:'#3a3e46'},{k:'l',a:[122,176],b:[122,FL],w:5,c:'#3a3e46'}]; }};
  if (prop === 'bar' || prop === 'ez'){ sp.ph = [0,-12]; sp.pr = 15; }
  if (prop === 'cable'){ sp.anchor = [200,206]; sp.ph = [0,-12]; }
  if (prop === 'lever'){ sp.pivot = [262,150]; }
  return sp;
};
M.bridge = function(){
  return {A:{hx:190,hy:199,tor:-90,ft:[236,206],kb:-1,eb:1,nk:0,hd:[192,206]}, B:{hx:179,hy:166,tor:-125,nk:35}, muscle:'glutes', tempo:[0.8,0.45,0.8,0.2]};
};
M.glutKick = function(){
  return {A:{hx:150,hy:124,tor:28,ft:[160,206],ft2:[148,176],kb:-1,eb:1,nk:-20,hd:[196,100]}, B:{ft2:[92,160]}, prop:'cable', anchor:[200,206], muscle:'glutes', attach:'ankF',
    scene:function(){ return [{k:'l',a:[204,90],b:[204,FL],w:10,c:'#33363d'}]; }};
};
M.calf = function(prop){
  var A = ST({hl:undefined,hs:[-4,0]}), B = {hy:111,ft:[150,196],fa:42,fa2:42};
  var sp = {A:A, B:B, muscle:'calves'};
  A.fa = 0; A.fa2 = 0;
  if (prop === 'bar'){ A.hs=[-4,-2]; A.eb=-1; sp.prop='bar'; sp.ps=[-8,-4]; sp.pr=15; }
  else if (prop === 'db'){ delete A.hs; A.hl=[-62,4]; sp.prop='db'; sp.pr=8.5; }
  else if (prop === 'lever'){ A.hs=[12,16]; A.eb=1; sp.prop='pad'; sp.ps=[-2,-9]; sp.scene=function(K){ return [{k:'r',x:128,y:205,w:52,h:7,r:3},{k:'l',a:[K.S[0]-18,K.S[1]-8],b:[K.S[0]-18,FL],w:7,c:'#33363d'},{k:'l',a:[K.S[0]-18,K.S[1]-8],b:[K.S[0]+6,K.S[1]-8],w:6,c:'#33363d'}]; }; }
  return sp;
};
M.calfSeated = function(){
  return {A:SEAT({tor:2,hd:[188,150],hl:undefined,fa:0,fa2:0}), B:{ft:[186,196],fa:42,fa2:42}, prop:'pad', muscle:'calves',
    scene:function(K){ var o=seatScene(138,166,70)(); o.push({k:'l',a:[K.knee[0]-16,K.knee[1]-9],b:[K.knee[0]+4,K.knee[1]-9],w:10,c:PADC},{k:'r',x:K.ank[0]-6,y:K.ank[1]+4,w:36,h:6,r:3}); return o; }};
};

// ---------- cardio (continuous, time-driven motions: spec.gen(t) returns the pose; spec.scene3 / spec.dyn3 build the 3D machine) ----------
var DEG = Math.PI/180, GOLD = '#f2b134';
function sm01(v){ v = Math.max(0,Math.min(1,v)); return v*v*(3-2*v); }
function shoulderOf(hx,hy,tor){ return [hx+Math.sin(tor*DEG)*60, hy-Math.cos(tor*DEG)*60]; }
function armFar(S,ang,len){ return [S[0]+len*Math.sin(ang*DEG), S[1]+len*Math.cos(ang*DEG)]; }
// one foot on a walking / running stride: stance (foot slides back on the ground) then swing (foot lifts and returns forward)
function stride(ph,o){
  ph = ph - Math.floor(ph);
  if (ph < o.st){ var k = ph/o.st; return {p:[o.hx+o.xf+(o.xb-o.xf)*k, o.g], a:-8+o.toe*sm01((k-0.45)/0.55)}; }
  var q = (ph-o.st)/(1-o.st);
  return {p:[o.hx+o.xb+(o.xf-o.xb)*sm01(q), o.g-o.lift*Math.sin(Math.PI*q)], a:o.toe*0.7*(1-sm01(q*1.2)) - 8*sm01(q)};
}
function gaitGen(o){
  return function(t){
    var ph = (t/o.T) % 1, f1 = stride(ph,o), f2 = stride(ph+0.5,o);
    var hy = o.hy + o.bob*Math.cos(4*Math.PI*(ph-o.mid));
    var S = shoulderOf(o.hx,hy,o.tor), sw = Math.cos(2*Math.PI*ph)*o.arm;
    return {hx:o.hx,hy:hy,tor:o.tor,ft:f1.p,fa:f1.a,ft2:f2.p,fa2:f2.a,kb:-1,kb2:-1,eb:1,eb2:1,nk:0,as:-sw,al:o.al,hd2:armFar(S,sw,o.al),lz:0.02,hz:0.0,ez:0.12};
  };
}
var RUN = {T:0.66,hx:150,hy:123,g:206,xf:30,xb:-36,lift:30,st:0.38,toe:34,bob:3.2,mid:0.19,tor:9,arm:62,al:44};
var WALK = {T:1.05,hx:150,hy:122,g:206,xf:26,xb:-26,lift:9,st:0.62,toe:26,bob:1.8,mid:0.25,tor:2,arm:26,al:58};
function cardioSpec(gen,extra,T){
  var sp = {gen:gen, T:T, stillT:T*0.12, A:gen(0), B:gen(T*0.5), muscle:'quads'};
  return Object.assign(sp,extra||{});
}
function groundSpeed(o){ return (o.xf-o.xb)/(o.st*o.T); }
// floor markers that slide back at exactly the speed the planted foot moves (so the feet don't skate)
function dashes(o,y,zs,len){
  var v = groundSpeed(o), gap = 70;
  return function(E,t){ for (var i = 0; i < 6; i++){ var x = ((i*gap - v*t) % (gap*6) + gap*6) % (gap*6) - 40; zs.forEach(function(z){ E.box(E.P(x,y,z), len*0.01, 0.004, 0.03, E.GOLDM); }); } };
}
M.run = function(){
  var sp = cardioSpec(gaitGen(RUN),{muscle:'quads',wide:true,fit:[[80,206],[230,206],[150,60]]},RUN.T);
  var dz = dashes(RUN,FL+0.4,[-0.55,0.55],16);
  sp.dyn3 = function(E,K,p,t){ dz(E,t); };
  sp.scene3 = function(){};
  sp.scene = function(K,p,t){ var v = groundSpeed(RUN), o=[]; for (var i=0;i<6;i++){ var x=((i*70 - v*(t||0)) % 420 + 420) % 420 - 60; o.push({k:'l',a:[x,FL+4],b:[x+16,FL+4],w:3,c:GOLD}); } return o; };
  return sp;
};
M.walk = function(){
  var sp = cardioSpec(gaitGen(WALK),{muscle:'calves',wide:true,fit:[[80,206],[230,206],[150,60]]},WALK.T);
  var dz = dashes(WALK,FL+0.4,[-0.55,0.55],16);
  sp.dyn3 = function(E,K,p,t){ dz(E,t); };
  sp.scene3 = function(){};
  sp.scene = function(K,p,t){ var v = groundSpeed(WALK), o=[]; for (var i=0;i<6;i++){ var x=((i*70 - v*(t||0)) % 420 + 420) % 420 - 60; o.push({k:'l',a:[x,FL+4],b:[x+16,FL+4],w:3,c:GOLD}); } return o; };
  return sp;
};
// ---- treadmill: same stride on a belt (belt top y=200), console + handrails in front
var TRD = Object.assign({}, RUN, {T:0.74,hx:140,hy:109,g:194,xf:28,xb:-32,lift:26,st:0.4,bob:2.6,tor:7});
M.treadmill = function(){
  var gen = gaitGen(TRD), v = groundSpeed(TRD);
  var sp = cardioSpec(gen,{muscle:'quads',wide:true,fit:[[60,203],[240,203],[226,70]]},TRD.T);
  sp.scene = function(K,p,t){
    var o = [{k:'l',a:[64,203],b:[236,203],w:9,c:'#2b2e35'},{k:'l',a:[76,208],b:[76,FL],w:5,c:'#3a3e46'},{k:'l',a:[226,208],b:[226,FL],w:5,c:'#3a3e46'},
      {k:'l',a:[232,203],b:[226,84],w:7,c:'#3a3e46'},{k:'r',x:208,y:72,w:42,h:20,r:5},{k:'l',a:[226,110],b:[190,118],w:4,c:'#5a606b'}];
    for (var i = 0; i < 7; i++){ var x = ((i*26 - v*(t||0)) % 182 + 182) % 182 + 62; o.push({k:'l',a:[x,198.5],b:[x+8,198.5],w:2,c:'#555b66'}); }
    return o;
  };
  sp.scene3 = function(E){
    var P = E.P, z = 0.31;
    E.box(P(150,203,0), 1.74, 0.06, 0.56, E.DARK);                       // belt deck
    [-1,1].forEach(function(s){
      E.box(P(150,205,s*z), 1.74, 0.09, 0.06, E.METAL);                  // side rails
      E.rod(P(76,208,s*z), P(76,FL,s*z), 0.02, E.DARK); E.rod(P(226,208,s*z), P(226,FL,s*z), 0.02, E.DARK);
      E.rod(P(232,205,s*z), P(226,88,s*z), 0.024, E.METAL);              // uprights
      E.rod(P(226,112,s*z), P(188,119,s*z), 0.018, E.METAL);             // handrails
    });
    E.rod(P(188,119,-z), P(188,119,z), 0.016, E.METAL);
    E.box(P(224,82,0), 0.2, 0.15, 0.7, E.DARK, 0.25); E.box(P(227,82.5,0), 0.02, 0.1, 0.5, E.GOLDM, 0.25);
  };
  sp.dyn3 = function(E,K,p,t){   // belt slats sliding back at foot speed
    for (var i = 0; i < 7; i++){ var x = ((i*26 - v*t) % 182 + 182) % 182 + 62; E.box(E.P(x,200.2,0), 0.035, 0.004, 0.5, E.METAL); }
  };
  return sp;
};
// ---- stationary bike: foot on a crank circle, hands on the bars
var BIKE = {T:0.9,BB:[160,180],R:17,hx:110,hy:128,tor:38,hand:[200,106],sad:[108,136]};
M.bike = function(){
  var o = BIKE;
  var gen = function(t){
    var th = (t/o.T)*2*Math.PI, f1 = [o.BB[0]+o.R*Math.cos(th), o.BB[1]+o.R*Math.sin(th)], f2 = [o.BB[0]-o.R*Math.cos(th), o.BB[1]-o.R*Math.sin(th)];
    var hy = o.hy + 0.8*Math.sin(2*th);
    return {hx:o.hx,hy:hy,tor:o.tor,ft:f1,ft2:f2,fa:-4,fa2:-4,kb:-1,kb2:-1,eb:1,eb2:1,nk:-10,hd:o.hand,hd2:[o.hand[0],o.hand[1]],lz:0.03,hz:0.0,ez:0.06};
  };
  var sp = cardioSpec(gen,{muscle:'quads',wide:true,fit:[[80,210],[236,210],[200,92]]},BIKE.T);
  sp.scene = function(){ return [{k:'l',a:[96,FL-3],b:[226,FL-3],w:6,c:'#2b2e35'},{k:'l',a:[124,186],b:[198,176],w:6,c:'#3a3e46'},{k:'l',a:[126,188],b:[108,138],w:5,c:'#3a3e46'},{k:'r',x:92,y:132,w:30,h:7,r:3},
    {k:'l',a:[198,176],b:[202,106],w:6,c:'#3a3e46'},{k:'c',x:202,y:176,r:24},{k:'l',a:[194,104],b:[210,104],w:5,c:'#5a606b'}]; };
  sp.scene3 = function(E){
    var P = E.P;
    E.rod(P(124,186,0), P(198,176,0), 0.03, E.DARK);                    // spine
    E.rod(P(126,188,0), P(108,138,0), 0.026, E.METAL);                   // seat post
    E.box(P(104,134,0), 0.3, 0.05, 0.2, E.DARK, 0.12);                   // saddle
    E.rod(P(198,176,0), P(202,106,0), 0.03, E.DARK);                     // front post
    E.cylz(P(202,172,0), 0.24, 0.07, E.PLATE); E.cylz(P(202,172,0.036), 0.215, 0.01, E.GOLDM);   // flywheel
    E.rod(P(202,106,-0.22), P(202,106,0.22), 0.018, E.METAL);            // handlebar
    E.ball(P(202,106,-0.22), 0.03, E.DARK); E.ball(P(202,106,0.22), 0.03, E.DARK);
    E.box(P(108,209,0), 0.06, 0.04, 0.62, E.DARK); E.box(P(222,209,0), 0.06, 0.04, 0.62, E.DARK); E.rod(P(108,209,0), P(222,209,0), 0.02, E.DARK);
    E.cylz(P(o.BB[0],o.BB[1],0), 0.03, 0.34, E.METAL);                   // crank axle
  };
  sp.dyn3 = function(E,K,p,t){
    var P = E.P, bb = o.BB;
    [[K.ank,0.14],[K.ankF,-0.14]].forEach(function(q){ E.rod(P(bb[0],bb[1],q[1]), P(q[0][0],q[0][1],q[1]), 0.016, E.METAL); E.box(P(q[0][0],q[0][1]+2,q[1]), 0.13, 0.025, 0.09, E.DARK); });
    var a = t*6; E.rod(P(202+Math.cos(a)*20,172+Math.sin(a)*20,0.04), P(202-Math.cos(a)*20,172-Math.sin(a)*20,0.04), 0.007, E.GOLDM);
  };
  return sp;
};
// ---- rowing machine: legs, then body, then arms; and back
var ROW = {T:2.4};
M.rower = function(){
  var gen = function(t){
    var c = (t/ROW.T) % 1, s = c < 0.4 ? sm01(c/0.4) : 1 - sm01((c-0.4)/0.6);          // 0 = catch, 1 = finish
    var Lg = sm01(s/0.55), Bd = sm01((s-0.3)/0.55), Ar = sm01((s-0.62)/0.38);
    var hx = 168 + (122-168)*Lg, hy = 170 + (176-170)*Lg, tor = 26 + (-24-26)*Bd;
    var hs = [62 + (26-62)*Ar, 32 + (22-32)*Ar];
    return {hx:hx,hy:hy,tor:tor,ft:[204,182],ft2:[204,182],fa:-30,fa2:-30,kb:-1,kb2:-1,eb:1,eb2:1,nk:-6*(1-Bd),hs:hs,lz:0.04,hz:0.0,ez:0.1};
  };
  var sp = cardioSpec(gen,{muscle:'back',wide:true,fit:[[40,206],[246,206],[200,100]]},ROW.T);
  sp.scene = function(K){ return [{k:'l',a:[52,200],b:[234,200],w:6,c:'#4a4f58'},{k:'r',x:K.H[0]-14,y:K.H[1]+6,w:30,h:7,r:3},{k:'c',x:234,y:172,r:24},{k:'l',a:[206,186],b:[214,176],w:5,c:'#3a3e46'}]; };
  sp.scene3 = function(E){
    var P = E.P;
    E.box(P(142,200,0), 1.9, 0.045, 0.1, E.METAL);                      // rail
    E.box(P(54,206,0), 0.07, 0.1, 0.5, E.DARK); E.box(P(228,206,0), 0.07, 0.1, 0.5, E.DARK);
    E.cylz(P(234,170,0), 0.28, 0.14, E.PLATE); E.cylz(P(234,170,0.075), 0.255, 0.012, E.GOLDM);
    E.rod(P(228,206,-0.2), P(228,170,-0.2), 0.02, E.DARK); E.rod(P(228,206,0.2), P(228,170,0.2), 0.02, E.DARK);
    [-1,1].forEach(function(s){ E.box(P(208,184,s*0.15), 0.2, 0.03, 0.1, E.DARK, -0.5); });   // foot plates
  };
  sp.dyn3 = function(E,K,p,t){
    var P = E.P, h = K.hand;
    E.box(P(K.H[0],188,0), 0.26, 0.045, 0.2, E.DARK);                    // sliding seat
    E.rod(P(h[0],h[1],-0.22), P(h[0],h[1],0.22), 0.016, E.GOLDM);        // handle
    E.rod(P(h[0],h[1],0), P(234,170,0), 0.006, E.METAL);                 // chain to the flywheel
  };
  return sp;
};
// ---- elliptical: feet on pedals moving in long ovals, hands on swinging handles
var ELL = {T:1.15,hx:150,hy:98,tor:3,xc:152,yc:178,a:26,b:9};
M.elliptical = function(){
  var o = ELL;
  var gen = function(t){
    var th = (t/o.T)*2*Math.PI, c = Math.cos(th), s = Math.sin(th), S = shoulderOf(o.hx,o.hy,o.tor);
    var f1 = [o.xc+o.a*c, o.yc+o.b*s], f2 = [o.xc-o.a*c, o.yc-o.b*s];
    var an = 38*Math.cos(th+Math.PI) , hn = [188-16*c, 78+0], hf = [188+16*c, 78];
    return {hx:o.hx,hy:o.hy+1.2*Math.sin(2*th),tor:o.tor,ft:f1,ft2:f2,fa:-4+10*c,fa2:-4-10*c,kb:-1,kb2:-1,eb:1,eb2:1,nk:0,hd:hn,hd2:hf,lz:0.03,hz:0.0,ez:0.1};
  };
  var sp = cardioSpec(gen,{muscle:'glutes',wide:true,fit:[[64,208],[240,208],[206,50]]},ELL.T);
  sp.scene = function(){ return [{k:'l',a:[70,FL-5],b:[232,FL-5],w:6,c:'#2b2e35'},{k:'l',a:[212,FL-5],b:[210,66],w:7,c:'#3a3e46'},{k:'r',x:192,y:52,w:40,h:18,r:5},{k:'c',x:92,y:178,r:14}]; };
  sp.scene3 = function(E){
    var P = E.P, z = 0.3;
    E.box(P(150,208,0), 1.7, 0.06, 0.08, E.DARK);
    E.box(P(72,206,0), 0.07, 0.07, 0.7, E.DARK); E.box(P(228,206,0), 0.07, 0.07, 0.7, E.DARK);
    [-1,1].forEach(function(s){ E.rod(P(222,206,s*0.22), P(210,64,s*0.22), 0.026, E.METAL); E.cylz(P(92,178,s*0.2), 0.14, 0.05, E.PLATE); });
    E.box(P(206,56,0), 0.24, 0.14, 0.62, E.DARK, 0.15); E.box(P(209,56.5,0), 0.02, 0.09, 0.45, E.GOLDM, 0.15);
    E.rod(P(92,178,-0.2), P(92,178,0.2), 0.02, E.METAL);
  };
  sp.dyn3 = function(E,K,p,t){
    var P = E.P, piv = [210,70];
    [[K.ank,0.16,K.hand],[K.ankF,-0.16,K.handF]].forEach(function(q){
      E.rod(P(92,178,q[1]*1.2), P(q[0][0]-2,q[0][1]+3,q[1]), 0.018, E.METAL);                   // crank-linked pedal arm
      E.box(P(q[0][0],q[0][1]+4,q[1]), 0.2, 0.03, 0.13, E.DARK);                                 // pedal
      E.rod(P(piv[0],piv[1],q[1]*1.4), P(q[2][0],q[2][1],q[1]*1.25), 0.018, E.METAL);            // handle arm
      E.ball(P(q[2][0],q[2][1],q[1]*1.25), 0.03, E.GOLDM);
    });
  };
  return sp;
};
// ---- stair climber: two pedals going up and down in turn, hands on the rails
var STR = {T:1.4,hx:146,hy:96,tor:6,yc:178,amp:15,hand:[198,96]};
M.stairs = function(){
  var o = STR;
  var gen = function(t){
    var th = (t/o.T)*2*Math.PI, s = Math.sin(th), f1 = [o.hx+22, o.yc+o.amp*s], f2 = [o.hx+22, o.yc-o.amp*s];
    return {hx:o.hx,hy:o.hy+1.5*Math.cos(th),tor:o.tor,ft:f1,ft2:f2,fa:-3,fa2:-3,kb:-1,kb2:-1,eb:1,eb2:1,nk:0,hd:o.hand,hd2:[o.hand[0],o.hand[1]],lz:0.03,hz:0.0,ez:0.08};
  };
  var sp = cardioSpec(gen,{muscle:'glutes',wide:true,fit:[[80,210],[240,210],[210,60]]},STR.T);
  sp.scene = function(){ return [{k:'l',a:[90,FL-5],b:[230,FL-5],w:8,c:'#2b2e35'},{k:'l',a:[216,FL-5],b:[214,70],w:7,c:'#3a3e46'},{k:'r',x:196,y:56,w:36,h:18,r:5},{k:'l',a:[186,100],b:[214,100],w:4,c:'#5a606b'}]; };
  sp.scene3 = function(E){
    var P = E.P;
    E.box(P(160,208,0), 1.5, 0.07, 0.62, E.DARK);
    [-1,1].forEach(function(s){ E.rod(P(220,206,s*0.3), P(214,72,s*0.3), 0.026, E.METAL); E.rod(P(214,102,s*0.3), P(184,102,s*0.3), 0.018, E.METAL); });
    E.box(P(212,64,0), 0.22, 0.14, 0.7, E.DARK, 0.2); E.box(P(215,64.5,0), 0.02, 0.09, 0.5, E.GOLDM, 0.2);
  };
  sp.dyn3 = function(E,K,p,t){
    var P = E.P;
    [[K.ank,0.14],[K.ankF,-0.14]].forEach(function(q){
      E.box(P(q[0][0]+4,q[0][1]+5,q[1]), 0.3, 0.035, 0.18, E.DARK);
      E.rod(P(q[0][0]-14,208,q[1]), P(q[0][0]-14,q[0][1]+5,q[1]), 0.014, E.METAL);              // piston
    });
  };
  return sp;
};
// ---- jump rope: small hops, rope turning overhead -> under the feet each hop
var JR = {T:0.5,hx:150,g:206,hy0:122};
M.rope = function(){
  var gen = function(t){
    var rho = (t/JR.T) % 1, lift = 11*Math.pow(Math.sin(Math.PI*rho),2), wr = 2*Math.PI*rho;
    var hy = JR.hy0 - lift, S = shoulderOf(JR.hx,hy,0), hc = [S[0]+26+4*Math.cos(wr), S[1]+52+4*Math.sin(wr)];
    return {hx:JR.hx,hy:hy,tor:0,ft:[JR.hx+4,JR.g-lift*1.2],ft2:[JR.hx-4,JR.g-lift*1.2],fa:14*(lift/11),fa2:14*(lift/11),kb:-1,kb2:-1,eb:1,eb2:1,nk:0,hd:hc,hd2:hc,lz:0.03,hz:0.1,ez:0.14};
  };
  var sp = cardioSpec(gen,{muscle:'calves',fit:[[100,14],[200,214]]},JR.T);
  sp.scene = function(K,p,t){
    var rho = ((t||0)/JR.T) % 1, ang = Math.PI/2 - 2*Math.PI*rho, c = [K.hand[0], K.hand[1]], R = 94;
    return [{k:'l',a:c,b:[c[0]+R*Math.cos(ang), c[1]-R*Math.sin(ang)],w:2.4,c:GOLD}];
  };
  sp.scene3 = function(){};
  sp.dyn3 = function(E,K,p,t){
    var P = E.P, rho = (t/JR.T) % 1, ang = Math.PI/2 - 2*Math.PI*rho, R = 94, hc = K.hand, z0 = 0.2, prev = null;
    for (var i = 0; i <= 14; i++){
      var s = -1 + i/7, bulge = Math.sqrt(Math.max(0,1-s*s)), pt = P(hc[0]+R*bulge*Math.cos(ang), hc[1]-R*bulge*Math.sin(ang), z0*s);
      if (prev) E.rod(prev, pt, 0.008, E.GOLDM); prev = pt;
    }
    [-1,1].forEach(function(sg){ E.ball(P(hc[0],hc[1],sg*z0), 0.03, E.DARK); });
  };
  return sp;
};

g.RDM = M;
})(window);
;
/* ---- map ---- */
/* name -> motion spec. Equipment decides the prop (barbell / dumbbell / cable / machine). */
(function(g){
var M = g.RDM;
function pr(e, cableOk){ e = (e||'').toLowerCase(); return e === 'dumbbell' ? 'db' : e === 'cable' ? 'cable' : e === 'machine' ? 'lever' : e === 'ez-bar' ? 'ez' : e === 'barbell' ? 'bar' : 'none'; }
var TABLE = [
  [/^Treadmill$/, function(){ var s = M.treadmill(); s.stillT = s.T*0.3; return s; }],
  [/^Stationary Bike$/, function(){ var s = M.bike(); s.stillT = s.T*0.12; return s; }],
  [/^Rowing Machine$/, function(){ var s = M.rower(); s.stillT = s.T*0.25; return s; }],
  [/^Elliptical$/, function(){ var s = M.elliptical(); s.stillT = s.T*0.3; return s; }],
  [/^Stair Climber$/, function(){ var s = M.stairs(); s.stillT = s.T*0.12; return s; }],
  [/^Running \(Outdoor\)$/, function(){ var s = M.run(); s.stillT = s.T*0.3; return s; }],
  [/^Walking$/, function(){ var s = M.walk(); s.stillT = s.T*0.55; return s; }],
  [/^Jump Rope$/, function(){ var s = M.rope(); s.stillT = s.T*0.3; return s; }],
  [/^Close-Grip Bench/, function(){ return M.bench(0,'bar','triceps',true); }],
  [/^Barbell Bench Press/, function(n,e){ return M.bench(0,'bar'); }],
  [/^Dumbbell Bench Press/, function(){ return M.bench(0,'db'); }],
  [/^Machine Bench Press/, function(){ return M.machineBench(); }],
  [/Incline Bench Press/, function(n,e){ return M.bench(40, e==='Dumbbell'?'db':'bar'); }],
  [/Decline Bench Press/, function(n,e){ return M.bench(-15, e==='Dumbbell'?'db':'bar'); }],
  [/^Dumbbell Chest Fly/, function(){ return M.fly(); }],
  [/^Cable Chest Fly \((\w+)\)/, function(n){ return M.cableFly(/\((\w+)\)/.exec(n)[1]); }],
  [/^Machine Chest Fly/, function(){ return M.pecDeck(); }],
  [/^Push-ups/, function(){ return M.pushup(); }],
  [/^Dips/, function(n,e,m){ return M.dips(m === 'Chest' ? 'chest' : 'triceps'); }],
  [/^Cable Chest Press/, function(){ return M.cablePress(); }],
  [/^Pull-ups/, function(){ return M.pullup(); }],
  [/^Lat Pulldown|^Undergrip Lat Pulldown|^Machine Lat Pulldown/, function(){ return M.pulldown(); }],
  [/^Machine Row/, function(){ return M.rowSeated(true); }],
  [/^Seated Cable Row|^Single-Arm Cable Row/, function(){ return M.rowSeated(false); }],
  [/Dumbbell Row/, function(){ return M.rowOne(); }],
  [/^T-Bar Row/, function(){ var s = M.rowBent('lever'); s.pivot = [22,201]; return s; }],
  [/Barbell Row/, function(){ return M.rowBent('bar'); }],
  [/^Cable Pullover/, function(){ return M.pullover(); }],
  [/^Deadlift/, function(){ return M.deadlift(false); }],
  [/^Sumo Deadlift/, function(){ return M.deadlift(true); }],
  [/Arnold Press/, function(){ return M.ohp('db', true, true); }],
  [/Shoulder Press/, function(n,e){ return M.ohp(pr(e), true); }],
  [/Lateral Raise/, function(n,e){ return M.latRaise(pr(e)); }],
  [/Front Raise/, function(n,e){ return M.frontRaise(pr(e)); }],
  [/Rear Delt Fly/, function(n,e){ return M.rearFly(pr(e)); }],
  [/^Face Pull/, function(){ return M.facePull(); }],
  [/Shrug/, function(n,e){ return M.shrug(pr(e)); }],
  [/Upright Row/, function(n,e){ return M.upright(pr(e)); }],
  [/Preacher Curl/, function(n,e){ return M.curl(pr(e),'preacher'); }],
  [/Concentration Curl/, function(){ return M.curl('db','conc'); }],
  [/Tricep Pushdown|Tricep Rope Pushdown/, function(){ return M.pushdown(); }],
  [/Skull Crushers/, function(n,e){ return M.skull(pr(e)); }],
  [/Overhead Extension/, function(n,e){ return M.overheadExt(pr(e)); }],
  [/Tricep Kickback/, function(n,e){ return M.kickback(pr(e)); }],
  [/Wrist Curl/, function(n,e){ return M.wrist(pr(e)); }],
  [/^Dead Hang/, function(){ return M.hang(); }],
  [/^Crunches/, function(){ return M.crunch(); }],
  [/^Plank/, function(){ return M.plank(); }],
  [/^Hanging Leg Raise/, function(){ return M.legRaise(); }],
  [/^Cable Crunch/, function(){ return M.cableCrunch(); }],
  [/^Pallof/, function(){ return M.pallof(); }],
  [/^Russian Twist/, function(){ return M.twist(); }],
  [/^Ab Wheel/, function(){ return M.abWheel(); }],
  [/^Back Squat/, function(){ return M.squat('back'); }],
  [/^Front Squat/, function(){ return M.squat('front'); }],
  [/Goblet Squat/, function(){ return M.squat('goblet'); }],
  [/^Leg Press/, function(){ return M.legPress(false); }],
  [/^Calf Press/, function(){ return M.calfPress(); }],
  [/Bulgarian/, function(n,e,m){ return M.bulgarian(e==='Dumbbell'?'db':'none', m==='Glutes'?'glutes':'quads'); }],
  [/Lunges/, function(n,e){ return M.lunge(e==='Barbell'?'bar':e==='Dumbbell'?'db':'none'); }],
  [/^Leg Extension/, function(){ return M.legExt(); }],
  [/^Seated Leg Curl/, function(){ return M.legCurlSeated(); }],
  [/^Lying Leg Curl/, function(){ return M.legCurlLying(); }],
  [/^Nordic Curl/, function(){ return M.nordic(); }],
  [/Good Morning/, function(){ return M.rdl('bar','gm'); }],
  [/Romanian Deadlift|Stiff-Leg Deadlift/, function(n,e){ return M.rdl(e==='Dumbbell'?'db':'bar'); }],
  [/Cable Pull-Through/, function(){ return M.rdl('cable'); }],
  [/Hip Thrust/, function(n,e){ return M.hipThrust(pr(e)); }],
  [/^Glute Bridge/, function(){ return M.bridge(); }],
  [/Glute Kickback/, function(){ return M.glutKick(); }],
  [/Seated Calf Raise/, function(){ return M.calfSeated(); }],
  [/Standing Calf Raise/, function(n,e){ return M.calf(e==='Barbell'?'bar':e==='Dumbbell'?'db':'lever'); }],
  [/Curl$/, function(n,e){ return M.curl(pr(e)); }]
];

var FORMS = [];
function F(re, p, m){ FORMS.push({re:re, p:p, m:m}); }
// ---- 3D form (grip width z, elbow flare ez, stance lz, dumbbell axis, cables, bars) ----
F(/^Machine Bench Press/, {A:{hz:.12,ez:.18,lz:.12}, B:{hz:.12,ez:.1}});
F(/^Push-ups/, {A:{hz:.1,ez:.1,lz:.03}, B:{ez:.22}});
F(/^Dips/, {A:{hz:.12,ez:.12}, B:{ez:.24}, S:{dipBars:true}}, 'Chest');
F(/^Dips/, {A:{hz:.1,ez:.02}, B:{ez:.03}, S:{dipBars:true}}, 'Triceps');
F(/^Cable Chest Press/, {A:{hz:.1,ez:.08}, B:{ez:.12}});
F(/^Pull-ups/, {A:{hz:.26,ez:.24}, B:{ez:.3}});
F(/^(Lat Pulldown|Machine Lat Pulldown)/, {A:{hz:.26,ez:.2,lz:.05}, B:{ez:.14}, S:{gw:.95}});
F(/^Undergrip Lat Pulldown/, {A:{hz:.05,ez:.02,lz:.05}, B:{ez:0}, S:{gw:.5}});
F(/^(Barbell Row|Overgrip Barbell Row)/, {A:{hz:.1,ez:.05,lz:.06}, B:{ez:.16}});
F(/^Undergrip Barbell Row/, {A:{hz:.03,ez:0,lz:.06}, B:{ez:0}});
F(/^Close Grip Barbell Row/, {A:{hz:-.06,ez:-.03,lz:.06}, B:{ez:-.02}});
F(/^T-Bar Row/, {A:{hz:-.1,ez:-.05,lz:.12}, B:{ez:-.04}, S:{solo:true}});
F(/Dumbbell Row/, {A:{lz:.06}, S:{single:true,dbAxis:'x'}});
F(/^Machine Row/, {A:{hz:.08,ez:.04}, B:{ez:.1}});
F(/^Seated Cable Row/, {A:{hz:-.1,ez:-.05,lz:.12}, B:{ez:-.03}, S:{gw:.16}});
F(/^Single-Arm Cable Row/, {A:{hz:0,ez:-.02,lz:.12,hd2:[176,150]}, S:{gw:.12}});
F(/^Cable Pullover/, {A:{hz:.06,ez:.04,lz:.05}, S:{gw:.42}});
F(/^Deadlift/, {A:{lz:.06,hz:.1,ez:.1}});
F(/^Sumo Deadlift/, {A:{lz:.24,hz:-.08,ez:-.1}});
F(/Shoulder Press/, {A:{hz:.12,ez:.12,lz:.04}, B:{ez:.08}});
F(/^Arnold Press/, {A:{hz:-.04,ez:.02}, B:{hz:.1,ez:.1}});
F(/Lateral Raise/, {A:{fl:0,fb:'lat'}, B:{fl:88}, S:{wide:true,dbAxis:'x'}});
F(/^Cable Lateral Raise/, {S:{twin:true,cross:true,anchor:[150,204]}});
F(/Lateral Raise/, {A:{fq:-1}, B:{fq:-1}});
F(/^Machine Lateral Raise/, {A:{fm:1,fe:0}, B:{fm:1,fe:0}, S:{prop:'none'}});
F(/^Dumbbell Rear Delt Fly/, {A:{fl:0,fb:'lat',fq:-1}, B:{fl:84,fb:'lat',fq:-1}, S:{wide:true,dbAxis:'x'}});
F(/^Cable Rear Delt Fly/, {A:{fl:6}, B:{fl:96}, S:{twin:true,cross:true,colTop:22,wide:true}});
F(/^Face Pull/, {A:{hz:.06,ez:.03,eo:[30,6]}, B:{hz:.16,ez:.34,eo:[-6,3]}, S:{gw:.2}});
F(/^Barbell Shrug/, {A:{hz:.16,ez:.1,lz:.04}});
F(/^(Dumbbell|Cable) Shrug/, {A:{hz:.06,ez:.04,lz:.04}, S:{dbAxis:'x'}});
F(/Upright Row/, {A:{hz:0,ez:.02,lz:.04}, B:{hz:0,ez:.22,eo:[6,-10]}});
F(/^Dumbbell Hammer Curl/, {S:{dbAxis:'x'}});
F(/^Cable Hammer Curl/, {S:{gw:.2}});
F(/^Cable Curl/, {S:{gw:.45}});
F(/Concentration Curl/, {A:{lz:.26,hz:-.06,ez:-.04}, B:{hz:-.06,ez:-.04}, S:{single:true}});
F(/^Tricep Pushdown/, {S:{gw:.45}});
F(/^Tricep Rope Pushdown/, {A:{hz:-.08}, B:{hz:.12}, S:{gw:.2}});
F(/Skull Crushers/, {B:{ez:-.03}, S:{dbAxis:'x'}});
F(/Overhead Extension/, {A:{hz:-.15,ez:-.1}, S:{dbMode:'center',dbAxis:'y',gw:.2}});
F(/Tricep Kickback/, {S:{single:true,dbAxis:'x'}});
F(/Wrist Curl/, {A:{hz:.04,ez:0,lz:.1}});
F(/^Dead Hang/, {A:{hz:.26,ez:.24}});
F(/^Crunches/, {A:{hz:-.1,ez:.2,lz:.06}});
F(/^Hanging Leg Raise/, {A:{hz:.15,ez:.1}});
F(/^Cable Crunch/, {A:{hz:-.12,ez:.2}, S:{gw:.2}});
F(/^Pallof/, {A:{hz:-.17,ez:-.1,lz:.1}, S:{anchorZ:.95,gw:.1}});
F(/^Russian Twist/, {A:{hz:-.15,ez:-.08,hoz:-.3,lz:.06}, B:{hoz:.3}, S:{dbMode:'center',dbAxis:'z'}});
F(/^Back Squat/, {A:{lz:.14,hz:.22,ez:.14}});
F(/^Front Squat/, {A:{lz:.14,hz:.04}});
F(/Goblet Squat/, {A:{lz:.12,hz:-.14,ez:-.08}, S:{dbMode:'center',dbAxis:'y'}});
F(/^Leg Press/, {A:{lz:.12}});
F(/Lunges/, {A:{lz:.06}, S:{dbAxis:'x'}});
F(/Bulgarian/, {A:{lz:.06}, S:{dbAxis:'x'}});
F(/Romanian|Stiff-Leg/, {A:{lz:.05,hz:.1,ez:.1}, S:{dbAxis:'x'}});
F(/Good Morning/, {A:{lz:.1,hz:.2,ez:.16}});
F(/Hip Thrust/, {A:{lz:.06,hz:.1}});
F(/^(Machine|Cable) Hip Thrust/, {A:{hz:-.08}});
F(/^Glute Bridge/, {A:{lz:.06}});
F(/Pull-Through/, {A:{lz:.14}, S:{gw:.2}});
F(/Standing Calf Raise/, {A:{lz:.06}, S:{dbAxis:'x'}});
F(/Seated Calf Raise/, {A:{lz:.08}});
F(/Leg Extension|Leg Curl/, {A:{lz:.04}});
g.RDMap = function(name, equip, muscle){
  for (var i = 0; i < TABLE.length; i++) if (TABLE[i][0].test(name)){
    var s = TABLE[i][1](name, equip, muscle); s.id = name;
    FORMS.forEach(function(f){ if (f.re.test(name) && (!f.m || f.m === muscle)){ Object.assign(s.A, f.p.A || {}); s.B = s.B || {}; Object.assign(s.B, f.p.B || {}); Object.assign(s, f.p.S || {}); } });
    return s;
  }
  return null;
};
})(window);
;
/* ---- ragdoll3d ---- */
/* 3D mannequin driven by the same motion templates (A -> B poses, IK) as the 2D figures.
   One shared renderer; call R3.show(spec) to switch exercise. Needs THREE r128 + OrbitControls. */
(function(g){
g.RD3D = true;
var FL = 212, U = 0.01;                       // 1 px of the 2D layout = 0.01 world units
function P(x,y,z){ return new THREE.Vector3((x-150)*U, (FL-y)*U, z||0); }
var BODY = new THREE.MeshStandardMaterial({color:0xb9bfc7, roughness:0.6, metalness:0.0});
var BODYF = new THREE.MeshStandardMaterial({color:0x8c929b, roughness:0.65});
var DARK = new THREE.MeshStandardMaterial({color:0x3c4049, roughness:0.7});
var METAL = new THREE.MeshStandardMaterial({color:0x6b717c, roughness:0.4, metalness:0.6});
var PLATE = new THREE.MeshStandardMaterial({color:0x1d1f24, roughness:0.5, metalness:0.3});
var GOLDM = new THREE.MeshStandardMaterial({color:0xf2b134, roughness:0.35, metalness:0.2, emissive:0x3a2600});
var HI = new THREE.MeshBasicMaterial({color:0xf2b134, transparent:true, opacity:0.55, depthWrite:false, polygonOffset:true, polygonOffsetFactor:-2, polygonOffsetUnits:-2});
var CYL = new THREE.CylinderGeometry(1,1,1,18,1,true), SPH = new THREE.SphereGeometry(1,18,14);
var UP = new THREE.Vector3(0,1,0);
var BOX1 = new THREE.BoxGeometry(1,1,1);
// helpers handed to cardio machine builders (spec.scene3 = static machine, spec.dyn3 = moving parts, redrawn every frame)
function envFor(group){
  function rod(a,b,r,mat){ var c = Cap(mat||DARK); setCap(c,a,b,r); group.add(c); return c; }
  function box(mid,sx,sy,sz,mat,rotZ){ var m = new THREE.Mesh(BOX1, mat||DARK); m.scale.set(sx,sy,sz); m.position.copy(mid); if (rotZ) m.rotation.z = rotZ; group.add(m); return m; }
  function cylz(pos,rad,len,mat){ var m = new THREE.Mesh(CYL, mat||DARK); m.scale.set(rad,len,rad); m.rotation.x = Math.PI/2; m.position.copy(pos); group.add(m); return m; }
  function ball(pos,r,mat){ var b = Ball(mat||DARK, r); b.position.copy(pos); group.add(b); return b; }
  return {P:P, rod:rod, box:box, cylz:cylz, ball:ball, DARK:DARK, METAL:METAL, GOLDM:GOLDM, PLATE:PLATE, V:V};
}

// capsule between two points; rx = radius in the figure plane, rz = radius across the body
function Cap(mat){
  var grp = new THREE.Group(), cyl = new THREE.Mesh(CYL, mat), s0 = new THREE.Mesh(SPH, mat), s1 = new THREE.Mesh(SPH, mat);
  grp.add(cyl, s0, s1); grp.userData = {cyl:cyl, s0:s0, s1:s1}; return grp;
}
var _d = new THREE.Vector3(), _m = new THREE.Vector3();
function setCap(c, a, b, rx, rz){
  rz = rz === undefined ? rx : rz;
  _d.subVectors(b, a); var len = _d.length() || 0.0001; _d.divideScalar(len);
  _m.addVectors(a, b).multiplyScalar(0.5); c.position.copy(_m); c.quaternion.setFromUnitVectors(UP, _d);
  var u = c.userData; u.cyl.scale.set(rx, len, rz); u.s0.position.set(0,-len/2,0); u.s1.position.set(0,len/2,0);
  u.s0.scale.set(rx,rx,rz); u.s1.scale.set(rx,rx,rz); c.visible = true;
}
function Ball(mat, r){ var m = new THREE.Mesh(SPH, mat); m.scale.setScalar(r); return m; }

var V = null;       // viewer state
function init(canvasHost, opts){
  opts = opts || {};
  var renderer = new THREE.WebGLRenderer({antialias:true, alpha:false});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, 1.5)); renderer.outputEncoding = THREE.sRGBEncoding;
  canvasHost.appendChild(renderer.domElement); renderer.domElement.style.display = 'block'; renderer.domElement.style.touchAction = 'none';
  var scene = new THREE.Scene(); scene.background = new THREE.Color(0x14161a);
  var cam = new THREE.PerspectiveCamera(36, 1, 0.05, 50);
  var ctl = new THREE.OrbitControls(cam, renderer.domElement); ctl.enablePan = false; ctl.enableDamping = true; ctl.dampingFactor = 0.08; ctl.rotateSpeed = 0.8; ctl.minPolarAngle = 0.3; ctl.maxPolarAngle = 1.62;
  var key = new THREE.DirectionalLight(0xffffff, 1.2); key.position.set(2,3,2.5);
  var fill = new THREE.DirectionalLight(0xaeb8c2, 0.7); fill.position.set(-3,1.2,-2);
  scene.add(key, fill, new THREE.HemisphereLight(0x8a8f99, 0x2a2c31, 0.9));
  var floor = new THREE.Mesh(new THREE.CircleGeometry(2.6, 48), new THREE.MeshBasicMaterial({color:new THREE.Color(0x1a1c21).convertSRGBToLinear()}));
  floor.rotation.x = -Math.PI/2; floor.position.y = -0.002; scene.add(floor);
  var ring = new THREE.Mesh(new THREE.RingGeometry(1.5,1.512,64), new THREE.MeshBasicMaterial({color:0xf2b134, transparent:true, opacity:0.35, side:THREE.DoubleSide}));
  ring.rotation.x = -Math.PI/2; ring.position.y = 0.001; scene.add(ring);
  // brand mark painted on the floor in front of the figure
  (function(){
    var cv = document.createElement('canvas'); cv.width = 1024; cv.height = 128;
    var tex = new THREE.CanvasTexture(cv); tex.anisotropy = 4;
    function paint(){
      var c = cv.getContext('2d'); c.clearRect(0,0,1024,128);
      c.font = '700 84px Oswald, Impact, "Arial Narrow", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      var txt = '@SAVIORFITLOGGER.APP', px = 84; c.font = '700 ' + px + 'px Oswald, Impact, "Arial Narrow", sans-serif';
      var tw = c.measureText(txt).width; if (tw > 940){ px = Math.floor(px*940/tw); c.font = '700 ' + px + 'px Oswald, Impact, "Arial Narrow", sans-serif'; }
      c.fillStyle = 'rgba(242,177,52,0.62)'; c.fillText(txt, 512, 66); tex.needsUpdate = true;
    }
    paint(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(paint);
    var mark = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.1625), new THREE.MeshBasicMaterial({map:tex, transparent:true, depthWrite:false, polygonOffset:true, polygonOffsetFactor:-3, polygonOffsetUnits:-3}));
    var MA = 0.75; mark.rotation.set(-Math.PI/2, MA, 0, 'YXZ'); mark.position.set(Math.sin(MA)*0.62, 0.004, Math.cos(MA)*0.62); mark.renderOrder = 1; scene.add(mark);
  })();
  var rig = new THREE.Group(); scene.add(rig);              // body parts
  var props = new THREE.Group(); scene.add(props);          // exercise props (rebuilt per exercise)
  var mk = function(mat){ var c = Cap(mat); rig.add(c); return c; };
  var B = { torso:mk(BODY), neck:mk(BODY), thighN:mk(BODY), shinN:mk(BODY), thighF:mk(BODYF), shinF:mk(BODYF), uaN:mk(BODY), faN:mk(BODY), uaF:mk(BODYF), faF:mk(BODYF),
            pelvis:mk(BODY), shN:mk(BODY), shF:mk(BODYF), footN:mk(BODY), footF:mk(BODYF) };
  B.head = Ball(BODY, 0.115); rig.add(B.head);
  B.joints = []; for (var i = 0; i < 8; i++){ var j = Ball(GOLDM, 0.032); rig.add(j); B.joints.push(j); }
  B.handN = Ball(BODY, 0.042); B.handF = Ball(BODYF, 0.042); rig.add(B.handN, B.handF);
  var hi = []; for (i = 0; i < 6; i++){ var h = Cap(HI); h.visible = false; rig.add(h); hi.push(h); }
  V = { renderer:renderer, scene:scene, cam:cam, ctl:ctl, rig:rig, props:props, B:B, hi:hi, spec:null, t0:0, host:canvasHost, swing:true, last:0, raf:0 };
  ctl.addEventListener('start', function(){ V.swing = false; });
  function resize(){ var w = canvasHost.clientWidth, h = canvasHost.clientHeight; if (!w || !h) return; renderer.setSize(w, h); cam.aspect = w/h; cam.updateProjectionMatrix(); frame(V.spec); }
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(resize).observe(canvasHost); else window.addEventListener('resize', resize);
  V.resize = resize; resize();
  V.raf = requestAnimationFrame(loop);
  return V;
}

function frame(spec){
  if (!spec || !V) return;
  var vb = Ragdoll.fitBox(spec).split(' ').map(Number), w = Math.max(vb[2]/100, spec.wide ? 1.9 : 1.2), h = Math.max(vb[3]/100, 1.0);
  var cx = (vb[0]+vb[2]/2-150)/100, cy = (FL-(vb[1]+vb[3]*0.55))/100 ;
  var fv = V.cam.fov*Math.PI/360, asp = V.cam.aspect || 1;
  var dist = Math.max(h/(2*Math.tan(fv)), w/(2*Math.tan(fv)*asp))*1.05 + 0.5;
  V.dist = dist; V.tgt = new THREE.Vector3(cx, Math.max(cy, 0.45), 0); V.ctl.target.copy(V.tgt);
  V.baseAz = 0.75; setAz(V.baseAz); V.ctl.update();
}
function setAz(a){ var d = V.dist, el = 0.2; V.cam.position.set(V.tgt.x + Math.sin(a)*Math.cos(el)*d, V.tgt.y + Math.sin(el)*d, V.tgt.z + Math.cos(a)*Math.cos(el)*d); V.cam.lookAt(V.tgt); }

function clearProps(){ while (V.props.children.length){ var c = V.props.children.pop(); V.props.remove(c); } V.props.children.length = 0; }
function addRod(a, b, r, mat){ var c = Cap(mat); setCap(c, a, b, r); V.props.add(c); return c; }
function addBox(mid, sx, sy, sz, mat, rotZ){ var m = new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz), mat || DARK); m.position.copy(mid); if (rotZ) m.rotation.z = rotZ; V.props.add(m); return m; }
function buildScene(spec){
  clearProps();
  if (spec.scene3){ spec.scene3(envFor(V.props)); return; }
  if (!spec.scene) return;
  if (spec.dipBars){ [-1,1].forEach(function(sg){ addRod(P(112,130,sg*0.32), P(196,130,sg*0.32), 0.022, METAL); [116,192].forEach(function(px){ addRod(P(px,130,sg*0.32), P(px,FL,sg*0.32), 0.02, DARK); }); }); return; }
  if (spec.lp){   // 45-degree leg press: rails and base on both sides of the lifter, back pad and seat on the centre line
    var Ks = Ragdoll.kin(spec.A), sh0 = spec.scene(Ks, spec.A);
    [-1,1].forEach(function(sg){ var z = sg*0.56; addRod(P(96,186,z), P(236,96,z), 0.032, METAL); addRod(P(90,FL-5,z), P(210,FL-5,z), 0.03, DARK); addRod(P(214,112,z), P(214,FL-5,z), 0.028, DARK); addRod(P(96,186,z), P(96,FL-5,z), 0.028, DARK); });
    addRod(P(90,FL-5,-0.56), P(90,FL-5,0.56), 0.03, DARK); addRod(P(210,FL-5,-0.56), P(210,FL-5,0.56), 0.03, DARK);
    var bp = sh0.filter(function(s){ return s.k === 'l' && s.w === 10; })[0]; if (bp){ var mid = [(bp.a[0]+bp.b[0])/2, (bp.a[1]+bp.b[1])/2]; [-0.24,0.24].forEach(function(z){ addRod(P(bp.b[0]+4,bp.b[1]+4,z), P(70,FL-5,z), 0.026, DARK); addRod(P(mid[0],mid[1],z), P(110,FL-5,z), 0.024, DARK); }); addRod(P(70,FL-5,-0.56), P(70,FL-5,0.56), 0.028, DARK); [-1,1].forEach(function(sg){ addRod(P(70,FL-5,sg*0.56), P(96,FL-5,sg*0.56), 0.028, DARK); }); }
    sh0.forEach(function(s){ if (s.k === 'l' && s.w >= 8){ var c = Cap(DARK); setCap(c, P(s.a[0],s.a[1],0), P(s.b[0],s.b[1],0), s.w/200, 0.2); V.props.add(c); } });
    return;
  }
  var K0 = Ragdoll.kin(spec.A), shapes = spec.scene(K0, spec.A), frameBar = null;
  shapes.forEach(function(s){ if (s.k === 'l' && s.w <= 6 && Math.abs(s.a[1]-s.b[1]) < 4 && Math.abs(s.a[0]-s.b[0]) > 60 && s.a[1] < FL-60) frameBar = s; });
  var seenPost = {};
  if (spec.twin){ var top = spec.colTop !== undefined ? spec.colTop : spec.anchor[1]; [-1,1].forEach(function(sg){ var tx = spec.anchor[0]; addBox(P(tx-6, (top+FL)/2 - 0, sg*0.9), 0.1, (FL-top+14)*U, 0.18, DARK); }); if (spec.colTop !== undefined){ addRod(P(spec.anchor[0]-6, top-4, -0.9), P(spec.anchor[0]-6, top-4, 0.9), 0.035, DARK); addRod(P(spec.anchor[0]-6, FL-3, -0.9), P(spec.anchor[0]-6, FL-3, 0.9), 0.03, DARK); } return; }
  shapes.forEach(function(s){
    if (s.k === 'l'){
      var vertical = Math.abs(s.a[0]-s.b[0]) < 6, thin = s.w <= 6.5;
      if (frameBar && thin){
        var mx = (frameBar.a[0]+frameBar.b[0])/2;
        if (s === frameBar){ addRod(P(mx,s.a[1],-0.5), P(mx,s.a[1],0.5), 0.022, METAL); }
        else if (vertical && !seenPost[Math.round(s.a[1])]){ seenPost[Math.round(s.a[1])] = 1; [-0.52,0.52].forEach(function(z){ addRod(P(mx,s.a[1],z), P(mx,FL,z), 0.022, DARK); }); }
        return;
      }
      if (thin){ [-0.16,0.16].forEach(function(z){ addRod(P(s.a[0],s.a[1],z), P(s.b[0],s.b[1],z), s.w/200, DARK); }); return; }
      var depth = s.w >= 9 ? 0.36 : 0.2;
      var a = P(s.a[0],s.a[1],0), b = P(s.b[0],s.b[1],0), c = Cap(DARK); setCap(c, a, b, s.w/200, depth/2); V.props.add(c);
    } else if (s.k === 'r'){
      addBox(P(s.x+s.w/2, s.y+s.h/2, 0), s.w*U, s.h*U, 0.38, DARK);
    } else if (s.k === 'c'){
      var bl = Ball(DARK, s.r*U); bl.position.copy(P(s.x,s.y,0)); V.props.add(bl);
    }
  });
}
function buildProps(spec, K, p, t){
  // dynamic props (follow the hands): rebuilt cheaply each frame from a small pool
  var pool = V.dyn || (V.dyn = new THREE.Group()); if (!pool.parent) V.scene.add(pool);
  while (pool.children.length) pool.remove(pool.children[0]);
  if (spec.dyn3){ spec.dyn3(envFor(pool), K, p, t); return; }
  var kind = spec.prop; if (!kind || kind === 'none') return;
  if (p.fd && V.h3){      // pec deck: vertical pads on the forearms, lever arms back to a pivot
    var pv0 = P(K.S[0]-22, K.S[1]+12, 0); var pb0 = Ball(DARK, 0.05); pb0.position.copy(pv0); pool.add(pb0);
    V.h3.forEach(function(hh){ var E = hh[0], H = hh[1]; var mid = E.clone().add(H).multiplyScalar(0.5); var pd = new THREE.Mesh(CYL, GOLDM); pd.scale.set(0.05, E.distanceTo(H)*1.05, 0.05); pd.position.copy(mid); pool.add(pd);
      var c = Cap(DARK); setCap(c, pv0, E, 0.02); pool.add(c); });
    return;
  }
  var th3 = V.h3 || (spec.twin ? [[null, P(K.hand[0],K.hand[1],0.2+(p.hz !== undefined ? p.hz : (p.zs||0))+(p.hoz||0))],[null, P(K.handF[0],K.handF[1],-0.2-(p.hz !== undefined ? p.hz : (p.zs||0))+(p.hoz||0))]] : null);
  if (spec.twin && th3){  // cable crossover: one cable from each side tower to each hand
    th3.forEach(function(hh, i){ var sg = (i === 0 ? 1 : -1) * (spec.cross ? -1 : 1), an3 = P(spec.anchor[0], spec.anchor[1], sg*0.9); rod(an3, hh[1], 0.007, METAL); var hb = Ball(GOLDM, 0.034); hb.position.copy(hh[1]); pool.add(hb); var pu = Ball(GOLDM, 0.03); pu.position.copy(an3); pool.add(pu); });
    return;
  }
  var pr = null; if (p.ph) pr = [K.H[0]+p.ph[0], K.H[1]+p.ph[1]]; if (p.ps) pr = [K.S[0]+p.ps[0], K.S[1]+p.ps[1]];
  var at = pr || K.hand; if (spec.attach && K[spec.attach]) at = K[spec.attach];
  var A3 = P(at[0],at[1],0), r = (spec.pr || (kind === 'db' ? 8.5 : 17))*U*1.15;
  function cyl(pos, rad, len, mat){ var m = new THREE.Mesh(CYL, mat); m.scale.set(rad,len,rad); m.rotation.x = Math.PI/2; m.position.copy(pos); pool.add(m); return m; }
  function rod(a,b,rad,mat){ var c = Cap(mat); setCap(c,a,b,rad); pool.add(c); }
  if (kind === 'bar' || kind === 'ez'){
    cyl(A3, 0.018, 1.6, METAL);
    [-1,1].forEach(function(sd){ [0.58,0.65].forEach(function(zz){ var pl = cyl(new THREE.Vector3(A3.x,A3.y,sd*zz), r, 0.055, PLATE); });
      cyl(new THREE.Vector3(A3.x,A3.y,sd*0.71), 0.035, 0.03, GOLDM); });
  } else if (kind === 'db'){
    var ax = spec.dbAxis || 'z', hzo2 = p.hz !== undefined ? p.hz : (p.zs||0), hoz2 = p.hoz || 0;
    var orient = function(m){ if (ax === 'x') m.rotation.set(0,0,Math.PI/2); else if (ax === 'y') m.rotation.set(0,0,0); else m.rotation.set(Math.PI/2,0,0); };
    var oneDb = function(c){ orient(cyl(c, 0.02, 0.2, METAL)); [-0.085,0.085].forEach(function(dd){ var pc = c.clone(); if (ax === 'x') pc.x += dd; else if (ax === 'y') pc.y += dd; else pc.z += dd; orient(cyl(pc, r*0.95, 0.045, PLATE)); }); };
    var hands = V.h3 ? V.h3.map(function(hh){ return hh[1]; }) : [P(K.hand[0],K.hand[1],0.2+hzo2+hoz2), P(K.handF[0],K.handF[1],-0.2-hzo2+hoz2)];
    if (spec.dbMode === 'center') oneDb(hands[0].clone().add(hands[1]).multiplyScalar(0.5));
    else if (spec.single) oneDb(hands[0]);
    else hands.forEach(oneDb);
  } else if (kind === 'cable'){
    var an = P(spec.anchor[0],spec.anchor[1],spec.anchorZ||0); rod(an, A3, 0.007, METAL); cyl(A3, 0.014, spec.gw||0.42, GOLDM);
    var pb = Ball(GOLDM, 0.03); pb.position.copy(an); pool.add(pb);
  } else if (kind === 'lever' && spec.solo){
    var pv = P(spec.pivot[0],spec.pivot[1],0); rod(pv, A3, 0.022, DARK); cyl(A3, 0.016, 0.3, GOLDM); var pb2 = Ball(DARK, 0.045); pb2.position.copy(pv); pool.add(pb2);
  } else if (kind === 'lever'){
    var hzl = p.hz !== undefined ? p.hz : (p.zs||0), hol = p.hoz || 0;
    var lh = V.h3 ? V.h3.map(function(hh){ return hh[1]; }) : [P(K.hand[0],K.hand[1],0.2+hzl+hol), P(K.handF[0],K.handF[1],-0.2-hzl+hol)];
    lh.forEach(function(h){ var pv2 = P(spec.pivot[0], spec.pivot[1], h.z*1.12); rod(pv2, h, 0.026, DARK); var gb = Ball(GOLDM, 0.036); gb.position.copy(h); pool.add(gb); var pb3 = Ball(DARK, 0.04); pb3.position.copy(pv2); pool.add(pb3); });
  } else if (kind === 'wheel'){
    var w = cyl(A3, 0.09, 0.12, PLATE); 
  } else if (kind === 'pad'){
    cyl(A3, 0.065, 0.34, DARK);
  } else if (kind === 'sled'){
    var dx = K.ank[0]-K.H[0], dy = K.ank[1]-K.H[1], l = Math.sqrt(dx*dx+dy*dy)||1, q = P(K.ank[0]+dx/l*5, K.ank[1]+dy/l*5, 0);
    var box = new THREE.Mesh(new THREE.BoxGeometry(0.06,0.5,0.62), DARK); box.position.copy(q); box.rotation.z = Math.atan2(-dy, dx); pool.add(box); [-1,1].forEach(function(sd){ var pl = cyl(new THREE.Vector3(q.x-dx/l*0.1,q.y-dy/l*0.1,sd*0.62), 0.21, 0.07, PLATE); });
  }
}
var _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3();
function pose(spec, u, t){
  var p = spec.gen ? spec.gen(t) : Ragdoll.mix(spec.A, spec.B, u), K = Ragdoll.kin(p), B = V.B;
  var ZS = 0.2, ZH = 0.1;       // shoulder / hip half width
  var Hn = P(K.H[0],K.H[1],0), Sn = P(K.S[0],K.S[1],0);
  setCap(B.torso, P(K.H[0]+(K.S[0]-K.H[0])*0.06, K.H[1]+(K.S[1]-K.H[1])*0.06, 0), P(K.H[0]+(K.S[0]-K.H[0])*0.98, K.H[1]+(K.S[1]-K.H[1])*0.98,0), 0.125, 0.185);
  setCap(B.pelvis, P(K.H[0],K.H[1],-0.1), P(K.H[0],K.H[1],0.1), 0.115, 0.115); B.pelvis.visible = true;
  // pelvis capsule along z: reorient manually
  B.pelvis.quaternion.setFromUnitVectors(UP, new THREE.Vector3(0,0,1)); B.pelvis.position.copy(P(K.H[0],K.H[1],0)); B.pelvis.userData.cyl.scale.set(0.115,0.2,0.115); B.pelvis.userData.s0.position.set(0,-0.1,0); B.pelvis.userData.s1.position.set(0,0.1,0); B.pelvis.userData.s0.scale.setScalar(0.115); B.pelvis.userData.s1.scale.setScalar(0.115);
  var nk = P(K.S[0]+K.hv[0]*3, K.S[1]+K.hv[1]*3,0), hd = P(K.C[0],K.C[1],0);
  setCap(B.neck, nk, hd, 0.05); B.head.position.copy(hd);
  // shoulders (across the body)
  [[B.shN, ZS],[B.shF,-ZS]].forEach(function(s){ setCap(s[0], P(K.S[0],K.S[1],s[1]*0.0-0.0), P(K.S[0],K.S[1],s[1]), 0.0001, 0.0001); s[0].visible = false; });
  // legs
  var lz = p.lz || 0; V._legs = [];
  function leg(th, sh, ft, hipz, knee, ank, fa, mat){
    var sg = hipz > 0 ? 1 : -1, kz = hipz + sg*lz*0.5, az = hipz + sg*lz;
    var Hh = P(K.H[0],K.H[1],hipz), Kn = P(knee[0],knee[1],kz), An = P(ank[0],ank[1],az);
    setCap(th, Hh, Kn, 0.075, 0.075); setCap(sh, Kn, An, 0.058, 0.058);
    var toe = P(ank[0]+Math.cos(fa)*15, ank[1]+Math.sin(fa)*15, az); (V._legs = V._legs || []).push([Hh, Kn, An, toe]); setCap(ft, P(ank[0]-3,ank[1]+1,az), toe, 0.036, 0.05);
  }
  leg(B.thighN,B.shinN,B.footN, ZH, K.knee, K.ank, K.fa);
  leg(B.thighF,B.shinF,B.footF, -ZH, K.kneeF, K.ankF, K.fa2);
  // arms (near = +z shoulder, far = -z shoulder)
  var zs = p.zs || 0, hzo = p.hz !== undefined ? p.hz : zs, ezo = p.ez !== undefined ? p.ez : zs*0.5, hoz = p.hoz || 0;
  function arm(ua, fa, z, elb, hand){ if (p.eo) elb = [K.S[0]+p.eo[0], K.S[1]+p.eo[1]]; var sg = z > 0 ? 1 : -1, Sh = P(K.S[0],K.S[1],z), El = P(elb[0],elb[1],z+sg*ezo+hoz*0.5), Hd = P(hand[0],hand[1],z+sg*hzo+hoz); setCap(ua, Sh, El, 0.052, 0.052); setCap(fa, El, Hd, 0.044, 0.044); return [Sh,El,Hd]; }
  var an = arm(B.uaN,B.faN,ZS,K.elb,K.hand), af = arm(B.uaF,B.faF,-ZS,K.elbF,K.handF);
  B.handN.position.copy(an[2]); B.handF.position.copy(af[2]);
  V.h3 = null;
  if (p.fl !== undefined){     // chest fly family: arms swing in the side-to-side plane around the torso's front direction
    var th = p.fl*Math.PI/180, fe = (p.fe||0)*Math.PI/180, deck = !!p.fd, R = 0.64, l1 = 0.34, l2 = 0.32, hs = [];
    var n3 = new THREE.Vector3(K.n[0], -K.n[1], 0).normalize(), lat = (p.fb === 'lat'), b0 = lat ? new THREE.Vector3(0,-1,0) : n3;
    [1,-1].forEach(function(sg, idx){
      var S3 = P(K.S[0],K.S[1],sg*ZS), Y = new THREE.Vector3(0,1,0);
      var dir = b0.clone().multiplyScalar(Math.cos(th)).add(new THREE.Vector3(0,0,sg*Math.sin(th))).normalize().multiplyScalar(Math.cos(fe)).add(Y.clone().multiplyScalar(Math.sin(fe))).normalize();
      var E3, H3;
      if (p.fm){ E3 = S3.clone().add(dir.clone().multiplyScalar(l1)); H3 = E3.clone().add(new THREE.Vector3(Math.cos(0.0)*l2*0.97, 0.02, -sg*0.04)); }
      else if (deck){ E3 = S3.clone().add(dir.clone().multiplyScalar(l1)); H3 = E3.clone().add(new THREE.Vector3(0,l2,0)); }
      else {
        H3 = S3.clone().add(dir.clone().multiplyScalar(R));
        var d = H3.clone().sub(S3), dl = d.length(), u = d.clone().divideScalar(dl), x = (l1*l1-l2*l2+dl*dl)/(2*dl), h = Math.sqrt(Math.max(l1*l1-x*x,0));
        var pole = b0.clone().multiplyScalar((lat ? Math.sin(th) : -Math.sin(th))*(p.fq||1)).add(new THREE.Vector3(0,0,sg*Math.cos(th))); pole.sub(u.clone().multiplyScalar(pole.dot(u))).normalize();
        E3 = S3.clone().add(u.clone().multiplyScalar(x)).add(pole.multiplyScalar(h));
      }
      var ua = idx ? B.uaF : B.uaN, fa = idx ? B.faF : B.faN; setCap(ua, S3, E3, 0.052, 0.052); setCap(fa, E3, H3, 0.044, 0.044);
      (idx ? B.handF : B.handN).position.copy(H3); hs.push([E3, H3]);
    });
    V.h3 = hs; an[1] = hs[0][0]; af[1] = hs[1][0]; an[2] = hs[0][1]; af[2] = hs[1][1];
  }
  var js = [P(K.knee[0],K.knee[1],ZH+lz*0.5), P(K.kneeF[0],K.kneeF[1],-ZH-lz*0.5), an[1], af[1], an[0], af[0], P(K.H[0],K.H[1],ZH), P(K.H[0],K.H[1],-ZH)];
  B.joints.forEach(function(j,i){ j.position.copy(js[i]); });
  buildProps(spec, K, p, t);
  if (V.body){ V.body.update({H:Hn, S:Sn, hd:hd, arms:[an, af], legs:V._legs}); }
  // gold muscle highlight
  var hi = V.hi; hi.forEach(function(h){ h.visible = false; });
  var m = spec.muscle, pulse = 0.5 + 0.2*Math.sin(t*5); HI.opacity = pulse;
  function limb(i, a, b, z, u0, u1, r){ var A = P(a[0]+(b[0]-a[0])*u0, a[1]+(b[1]-a[1])*u0, z), Bp = P(a[0]+(b[0]-a[0])*u1, a[1]+(b[1]-a[1])*u1, z); setCap(hi[i], A, Bp, r, r); }
  var tv = K.t, nv = K.n;
  function onT(u, off, z){ return P(K.H[0]+tv[0]*60*u+nv[0]*off, K.H[1]+tv[1]*60*u+nv[1]*off-(p.sh||0)*u, z||0); }
  function limb3(i, a, b, u0, u1, rr){ setCap(hi[i], a.clone().lerp(b,u0), a.clone().lerp(b,u1), rr, rr); }
  if (m === 'biceps' || m === 'triceps'){ limb3(0,an[0],an[1],.16,.84,0.066); limb3(1,af[0],af[1],.16,.84,0.066); }
  else if (m === 'forearms'){ limb3(0,an[1],an[2],.12,.9,0.056); limb3(1,af[1],af[2],.12,.9,0.056); }
  else if (m === 'quads' || m === 'hamstrings'){ limb(0,K.H,K.knee,ZH,.12,.9,0.088); limb(1,K.H,K.kneeF,-ZH,.12,.9,0.088); }
  else if (m === 'calves'){ limb(0,K.knee,K.ank,ZH,.1,.85,0.07); limb(1,K.kneeF,K.ankF,-ZH,.1,.85,0.07); }
  else if (m === 'shoulders'){ setCap(hi[0], P(K.S[0],K.S[1],ZS), P(K.S[0],K.S[1]+0.001*100,ZS), 0.085, 0.085); setCap(hi[1], P(K.S[0],K.S[1],-ZS), P(K.S[0],K.S[1]+0.1,-ZS), 0.085, 0.085); }
  else if (m === 'glutes'){ setCap(hi[0], P(K.H[0]-nv[0]*5,K.H[1]-nv[1]*5,0.09), P(K.H[0]-nv[0]*5,K.H[1]-nv[1]*5+0.1,0.09), 0.1, 0.1); setCap(hi[1], P(K.H[0]-nv[0]*5,K.H[1]-nv[1]*5,-0.09), P(K.H[0]-nv[0]*5,K.H[1]-nv[1]*5+0.1,-0.09), 0.1, 0.1); }
  else if (m === 'chest'){ setCap(hi[0], onT(.74,8,0.09), onT(.84,8,0.09), 0.062, 0.1); setCap(hi[1], onT(.74,8,-0.09), onT(.84,8,-0.09), 0.062, 0.1); }
  else if (m === 'abs'){ setCap(hi[0], onT(.14,9,0), onT(.5,9,0), 0.055, 0.12); }
  else if (m === 'back'){ setCap(hi[0], onT(.45,-9,0), onT(.8,-9,0), 0.058, 0.16); }
  else if (m === 'traps'){ setCap(hi[0], onT(.8,-8,0), onT(1.0,-5,0), 0.06, 0.13); }
}
function loop(now){
  V.raf = requestAnimationFrame(loop);
  if (!V.spec || (V.vis === false) || V.paused || !V.host.isConnected) return;
  var t = now/1000, u = Ragdoll.phase(t, V.spec);
  pose(V.spec, u, t);
  if (V.swing && V.baseAz !== undefined){ setAz(V.baseAz + 0.6*Math.sin(t*0.35)); }
  V.ctl.update();
  V.renderer.render(V.scene, V.cam);
}
function show(spec){ V.paused = false; V.spec = spec; buildScene(spec); V.swing = true; frame(spec); }
function snap(spec,u,az,tt){ V.spec = spec; buildScene(spec); frame(spec); V.swing=false; setAz(az === undefined ? V.baseAz : az); pose(spec,u,tt===undefined?(spec.stillT!==undefined?spec.stillT:0.6):tt); V.ctl.update(); V.renderer.render(V.scene,V.cam); return V.renderer.domElement.toDataURL('image/jpeg',0.8); }
function setBody(b){   // b = RDBody.make(...) result, or null to go back to the capsule mannequin
  if (V.body){ V.scene.remove(V.body.mesh); }
  V.body = b || null;
  if (b){ V.scene.add(b.mesh); }
  V.rig.visible = !b;
}
g.R3 = { init:init, show:show, snap:snap, setBody:setBody, get V(){ return V; } };
})(window);
;
})();
