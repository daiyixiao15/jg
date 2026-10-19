(function(root){
  'use strict';
  function create(options={}){
    const makeImage=options.makeImage||(()=>new Image());
    const schedule=options.schedule||(fn=>requestAnimationFrame(fn));
    const records=new Map();
    let generation=0,current=null,ready=false,queue=[],active=0;
    function load(file,priority){
      const known=records.get(file);
      if(known)return known.promise;
      const record={status:'loading',promise:null};
      records.set(file,record);
      record.promise=new Promise(resolve=>{
        const image=makeImage();
        record.image=image; // Retain decoded pixels for upcoming portrait swaps.
        image.decoding='async';image.fetchPriority=priority;
        let settled=false;
        function finish(ok){if(settled)return;settled=true;image.onload=null;image.onerror=null;record.status=ok?'ready':'failed';resolve(ok);}
        image.onload=()=>{
          if(typeof image.decode==='function')image.decode().then(()=>finish(true),()=>finish(image.naturalWidth>0));
          else finish(true);
        };
        image.onerror=()=>finish(false);
        image.src='assets/'+file;
      });
      return record.promise;
    }
    function drain(){
      if(!ready)return;
      while(active<2&&queue.length){
        const file=queue.shift();
        if(file===current||records.has(file))continue;
        active++;
        load(file,'low').then(()=>{active--;drain();});
      }
    }
    function update(file,candidates=[]){
      const token=++generation;
      current=file||null;ready=false;
      queue=[...new Set(candidates)].filter(name=>name&&name!==current);
      schedule(()=>{
        if(token!==generation)return;
        const wait=current?load(current,'high'):Promise.resolve(true);
        wait.then(ok=>{
          if(token!==generation||!ok)return;
          // Allow the decoded current background to paint before background work.
          schedule(()=>{if(token===generation){ready=true;drain();}});
        });
      });
    }
    return {update};
  }
  root.GameBackgroundLoader={create};
})(globalThis);
