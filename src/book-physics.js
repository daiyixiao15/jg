(function(root){
  'use strict';
  // A thick-paper plate represented by coupled, fixed-length hinge chains.
  // Rows allow the lifted corner to lag behind the rest of the sheet.
  const COUNT=24,ROWS=8;
  const paperTextures=new Map();
  function paperTexture(image,key){
    if(paperTextures.has(key))return paperTextures.get(key);
    const paper=root.document.createElement('canvas');paper.width=image.width;paper.height=image.height;
    const ctx=paper.getContext('2d'),w=paper.width,h=paper.height;
    ctx.drawImage(image,0,0);
    // Match the resting spread's outer-edge (2%) and top/bottom (5%) masks.
    ctx.globalCompositeOperation='destination-in';
    const horizontal=ctx.createLinearGradient(0,0,w,0);
    for(const [at,color] of [[0,'transparent'],[.02,'#000'],[.98,'#000'],[1,'transparent']])horizontal.addColorStop(at,color);
    ctx.fillStyle=horizontal;ctx.fillRect(0,0,w,h);
    const vertical=ctx.createLinearGradient(0,0,0,h);
    for(const [at,color] of [[0,'transparent'],[.05,'#000'],[.95,'#000'],[1,'transparent']])vertical.addColorStop(at,color);
    ctx.fillStyle=vertical;ctx.fillRect(0,0,w,h);
    ctx.globalCompositeOperation='destination-over';ctx.fillStyle='#f3e8ce';ctx.fillRect(0,0,w,h);
    // Only retain the two most recent spreads to limit mobile texture memory.
    paperTextures.set(key,paper);while(paperTextures.size>2)paperTextures.delete(paperTextures.keys().next().value);
    return paper;
  }
  function sheet(){return {angles:new Float64Array(COUNT*ROWS),velocity:new Float64Array(COUNT*ROWS)};}
  function step(body,progress,dt){
    const old=body.angles.slice(),ease=progress*progress*(3-2*progress),drive=Math.PI*ease;
    const lift=Math.sin(Math.PI*progress);
    for(let row=0;row<ROWS;row++)for(let i=0;i<COUNT;i++){
      const k=row*COUNT+i,u=i/(COUNT-1),v=row/(ROWS-1);
      // Broad shallow arch, with a small delayed lower outside corner.
      const bend=.24*lift*Math.sin(Math.PI*u);
      const corner=.14*lift*u*u*(v-.5);
      const target=drive+bend+corner;
      const neighbor=(old[row*COUNT+Math.max(0,i-1)]+old[row*COUNT+Math.min(COUNT-1,i+1)]+old[Math.max(0,row-1)*COUNT+i]+old[Math.min(ROWS-1,row+1)*COUNT+i])/4;
      body.velocity[k]+=((target-old[k])*190+(neighbor-old[k])*85-body.velocity[k]*25)*dt;
      body.angles[k]=Math.max(0,Math.min(Math.PI+.004,old[k]+body.velocity[k]*dt));
    }
  }
  function mountCanvas(canvas,from,to,done){
    const ctx=canvas.getContext('2d');if(!ctx){done();return ()=>{};}
    const rect=canvas.getBoundingClientRect(),w=rect.width,h=rect.height,H=h/1.4,margin=H*.2,half=w/2,depth=w*3.5;
    const ratio=Math.min(root.devicePixelRatio||1,1.5);canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);ctx.scale(ratio,ratio);ctx.translate(0,margin);
    let cancelled=false,frame=0,start=null,last=null;const body=sheet();
    function triangle(img,src,dst){
      const [a,b,c]=src,[p,q,r]=dst,den=(b.x-a.x)*(c.y-a.y)-(c.x-a.x)*(b.y-a.y);if(Math.abs(den)<.001)return;
      const A=((q.x-p.x)*(c.y-a.y)-(r.x-p.x)*(b.y-a.y))/den,B=((q.y-p.y)*(c.y-a.y)-(r.y-p.y)*(b.y-a.y))/den;
      const C=((r.x-p.x)*(b.x-a.x)-(q.x-p.x)*(c.x-a.x))/den,D=((r.y-p.y)*(b.x-a.x)-(q.y-p.y)*(c.x-a.x))/den;
      // Slightly overlap raster clip edges to remove antialiasing cracks.
      const points=[p,q,r],sign=((q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x))>0?1:-1;
      const grow=(point,index)=>{const prev=points[(index+2)%3],next=points[(index+1)%3],dx1=point.x-prev.x,dy1=point.y-prev.y,dx2=next.x-point.x,dy2=next.y-point.y,l1=Math.hypot(dx1,dy1)||1,l2=Math.hypot(dx2,dy2)||1;
        const n1={x:sign*dy1/l1,y:-sign*dx1/l1},n2={x:sign*dy2/l2,y:-sign*dx2/l2},scale=.55/Math.max(.015,1+n1.x*n2.x+n1.y*n2.y);
        return {x:point.x+(n1.x+n2.x)*scale,y:point.y+(n1.y+n2.y)*scale};};
      const [P,Q,R]=points.map(grow);ctx.save();ctx.beginPath();ctx.moveTo(P.x,P.y);ctx.lineTo(Q.x,Q.y);ctx.lineTo(R.x,R.y);ctx.closePath();ctx.clip();
      ctx.transform(A,B,C,D,p.x-A*a.x-C*a.y,p.y-B*a.x-D*a.y);ctx.drawImage(img,0,0);ctx.restore();
    }
    function paint(oldImage,newImage){
      ctx.clearRect(0,-margin,w,h);ctx.drawImage(oldImage,0,0,oldImage.width/2,oldImage.height,0,0,half,H);ctx.drawImage(newImage,newImage.width/2,0,newImage.width/2,newImage.height,half,0,half,H);
      const grid=[];for(let row=0;row<ROWS;row++){const y=row/(ROWS-1)*H,line=[{x:half,y,z:0}];for(let i=0;i<COUNT;i++){const p=line[i],a=body.angles[row*COUNT+i];line.push({x:p.x+Math.cos(a)*half/COUNT,y,z:p.z+Math.sin(a)*half/COUNT});}grid.push(line);}
      const project=p=>{const scale=depth/(depth-p.z);return {x:half+(p.x-half)*scale,y:H/2+(p.y-H/2)*scale};};
      ctx.save();ctx.beginPath();const outline=[...grid[0],...grid.map(line=>line[COUNT]),...grid[ROWS-1].slice().reverse()];outline.forEach((p,i)=>{i?ctx.lineTo(p.x+p.z*.04,p.y+p.z*.015):ctx.moveTo(p.x,p.y);});ctx.closePath();ctx.shadowColor='#3e302033';ctx.shadowBlur=14;ctx.fillStyle='#3e30200c';ctx.fill();ctx.restore();
      const cells=[];for(let row=0;row<ROWS-1;row++)for(let i=0;i<COUNT;i++){const a=grid[row][i],b=grid[row][i+1],c=grid[row+1][i+1],d=grid[row+1][i];cells.push({row,i,a,b,c,d,z:(a.z+b.z+c.z+d.z)/4});}cells.sort((a,b)=>a.z-b.z);
      for(const {row,i,a,b,c,d} of cells){const back=(body.angles[row*COUNT+i]+body.angles[(row+1)*COUNT+i])/2>Math.PI/2,img=back?newImage:oldImage,sx=u=>back?(1-u)*img.width/2:(1+u)*img.width/2;const x0=sx(i/COUNT),x1=sx((i+1)/COUNT),y0=row/(ROWS-1)*img.height,y1=(row+1)/(ROWS-1)*img.height;
        triangle(img,[{x:x0,y:y0},{x:x1,y:y0},{x:x1,y:y1}],[project(a),project(b),project(c)]);triangle(img,[{x:x0,y:y0},{x:x1,y:y1},{x:x0,y:y1}],[project(a),project(c),project(d)]);
      }
      const crease=ctx.createLinearGradient(half-8,0,half+8,0);crease.addColorStop(0,'#35261400');crease.addColorStop(.5,'#35261422');crease.addColorStop(1,'#35261400');ctx.fillStyle=crease;ctx.fillRect(half-8,0,16,H);
    }
    const load=file=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{try{resolve(paperTexture(im,file));}catch(error){reject(error);}};im.onerror=reject;im.src='assets/'+file;});
    Promise.all([load(from),load(to)]).then(([a,b])=>{if(cancelled)return;if(root.matchMedia?.('(prefers-reduced-motion: reduce)').matches){done();return;}paint(a,b);canvas.parentElement?.querySelector('.book-loading-cover')?.remove();function tick(time){if(cancelled)return;if(start===null)start=time;const elapsed=(time-start)/1000,dt=Math.min((time-(last??time))/1000,.035);last=time;for(let t=0;t<dt;t+=1/120)step(body,Math.min(elapsed/1.15,1),Math.min(1/120,dt-t));paint(a,b);if(elapsed>1.15&&body.angles.every((v,i)=>Math.abs(Math.PI-v)<.003&&Math.abs(body.velocity[i])<.025)||elapsed>2.6){done();return;}frame=requestAnimationFrame(tick);}frame=requestAnimationFrame(tick);}).catch(()=>{if(!cancelled)done();});
    return ()=>{cancelled=true;cancelAnimationFrame(frame);};
  }
  function mount(canvas,from,to,done){
    if(root.location?.protocol==='file:')return mountCanvas(canvas,from,to,done);
    const gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false});
    if(!gl)return mountCanvas(canvas,from,to,done);
    const rect=canvas.getBoundingClientRect(),w=Math.max(2,Math.round(rect.width)),h=Math.max(2,Math.round(rect.height));
    const bookHeight=h/1.4,margin=bookHeight*.2,ratio=Math.min(root.devicePixelRatio||1,1.5);
    canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);gl.viewport(0,0,canvas.width,canvas.height);
    let cancelled=false,frame=0,start=null,last=null;const body=sheet();
    const left=w/2,half=w/2,depth=w*3.5;
    function shader(type,source){const sh=gl.createShader(type);gl.shaderSource(sh,source);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(sh));return sh;}
    const program=gl.createProgram();
    gl.attachShader(program,shader(gl.VERTEX_SHADER,`precision mediump float;attribute vec2 pos;attribute vec2 uv;attribute float facing;varying vec2 vUV;varying float vFacing;void main(){gl_Position=vec4(pos,0.,1.);vUV=uv;vFacing=facing;}`));
    gl.attachShader(program,shader(gl.FRAGMENT_SHADER,`precision mediump float;uniform sampler2D oldTex;uniform sampler2D newTex;uniform int mode;uniform float which;uniform float strength;varying vec2 vUV;varying float vFacing;void main(){if(mode==2){float edge=sin(vUV.x*3.14159);float fade=sin(vUV.y*3.14159);gl_FragColor=vec4(.16,.12,.07,strength*edge*fade);return;}vec4 color;if(mode==1){bool back=vFacing<0.;vec2 at=vec2(back?.5-.5*vUV.x:.5+.5*vUV.x,vUV.y);color=back?texture2D(newTex,at):texture2D(oldTex,at);color.rgb*=1.-.075*(1.-abs(vFacing));float grain=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);color.rgb+=(grain-.5)*.009;}else{color=which>.5?texture2D(newTex,vUV):texture2D(oldTex,vUV);}gl_FragColor=color;}`));
    gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));gl.useProgram(program);
    const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    for(const [name,size,offset] of [['pos',2,0],['uv',2,8],['facing',1,16]]){const loc=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,20,offset);}
    const uniforms={};for(const name of ['mode','which','strength'])uniforms[name]=gl.getUniformLocation(program,name);
    gl.uniform1i(gl.getUniformLocation(program,'oldTex'),0);gl.uniform1i(gl.getUniformLocation(program,'newTex'),1);
    gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    const textures=[];
    function texture(img,unit){const t=gl.createTexture();textures.push(t);gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);}
    const vertex=(p,u,v,f=1)=>[p.x/w*2-1,1-(p.y+margin)/h*2,u,v,f];
    function draw(vertices,mode,which=0,strength=0){gl.uniform1i(uniforms.mode,mode);gl.uniform1f(uniforms.which,which);gl.uniform1f(uniforms.strength,strength);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.DYNAMIC_DRAW);gl.drawArrays(gl.TRIANGLES,0,vertices.length/5);}
    function quad(x,y,width,height,u0,u1,mode,which=0,strength=0){const a=vertex({x,y},u0,0),b=vertex({x:x+width,y},u1,0),c=vertex({x:x+width,y:y+height},u1,1),d=vertex({x,y:y+height},u0,1);draw([...a,...b,...c,...a,...c,...d],mode,which,strength);}
    function paint(){
      const H=bookHeight;gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
      quad(0,0,half,H,0,.5,0);quad(half,0,half,H,.5,1,0,1);
      const grid=[],size=half/COUNT;
      for(let row=0;row<ROWS;row++){
        const v=row/(ROWS-1),line=[{x:left,y:v*H,z:0}];
        for(let i=0;i<COUNT;i++){const p=line[i],a=body.angles[row*COUNT+i];line.push({x:p.x+Math.cos(a)*size,y:v*H,z:p.z+Math.sin(a)*size});}grid.push(line);
      }
      const project=p=>{const scale=depth/(depth-p.z);return {x:left+(p.x-left)*scale,y:H/2+(p.y-H/2)*scale};};
      const height=Math.max(...grid.flat().map(p=>p.z)),edge=grid[Math.floor(ROWS/2)][COUNT].x;
      quad(Math.min(left,edge)-14,0,Math.max(28,Math.abs(edge-left)+28),H,0,1,2,0,.055+height/w*.13);
      const cells=[];
      for(let row=0;row<ROWS-1;row++)for(let i=0;i<COUNT;i++){const a=grid[row][i],b=grid[row][i+1],c=grid[row+1][i+1],d=grid[row+1][i];cells.push({row,i,a,b,c,d,z:(a.z+b.z+c.z+d.z)/4});}
      cells.sort((a,b)=>a.z-b.z);const vertices=[];
      for(const {row,i,a,b,c,d} of cells){
        const make=(p,r,u)=>vertex(project(p),u/COUNT,r/(ROWS-1),Math.cos(body.angles[r*COUNT+Math.min(u,COUNT-1)]));
        const A=make(a,row,i),B=make(b,row,i+1),C=make(c,row+1,i+1),D=make(d,row+1,i);
        vertices.push(...A,...B,...C,...A,...C,...D);
      }
      draw(vertices,1);
      quad(half-7,0,14,H,0,1,2,0,.09);
    }
    const load=file=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{const decoded=img.decode?.();Promise.resolve(decoded).catch(()=>{}).then(()=>paperTexture(img,file)).then(resolve,reject);};img.onerror=reject;img.src='assets/'+file;});
    Promise.all([load(from),load(to)]).then(([oldImage,newImage])=>{
      if(cancelled)return;
      if(root.matchMedia?.('(prefers-reduced-motion: reduce)').matches){done();return;}
      texture(oldImage,0);texture(newImage,1);paint();
      canvas.parentElement?.querySelector('.book-loading-cover')?.remove();
      function tick(time){
        if(cancelled)return;if(start===null)start=time;const elapsed=(time-start)/1000;
        const dt=Math.min((time-(last??time))/1000,.035);last=time;
        for(let t=0;t<dt;t+=1/120)step(body,Math.min(elapsed/1.15,1),Math.min(1/120,dt-t));
        paint();
        const settled=elapsed>1.15&&body.angles.every((a,i)=>Math.abs(Math.PI-a)<.003&&Math.abs(body.velocity[i])<.025);
        if(settled||elapsed>2.6){done();return;}frame=requestAnimationFrame(tick);
      }
      frame=requestAnimationFrame(tick);
    }).catch(()=>{if(!cancelled)done();});
    return ()=>{cancelled=true;cancelAnimationFrame(frame);for(const t of textures)gl.deleteTexture(t);gl.deleteBuffer(buffer);gl.deleteProgram(program);};
  }
  root.GameBookPhysics={mount,sheet,step};
})(globalThis);
