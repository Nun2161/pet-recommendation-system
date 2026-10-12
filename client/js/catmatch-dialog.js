"use strict";
window.CatMatchDialog = (() => {
  let root;
  function ensure(){
    if(root) return root;
    root=document.createElement("div");root.className="catmatch-dialog-root";root.hidden=true;
    root.innerHTML=`<div class="catmatch-dialog-backdrop"></div><section class="catmatch-dialog-card" role="dialog" aria-modal="true" aria-labelledby="cmDialogTitle"><div class="catmatch-dialog-petals" aria-hidden="true">${"<span></span>".repeat(6)}</div><div class="catmatch-dialog-icon" id="cmDialogIcon">✓</div><h2 id="cmDialogTitle"></h2><p id="cmDialogMessage"></p><textarea class="catmatch-dialog-input" id="cmDialogInput" hidden></textarea><div class="catmatch-dialog-actions"><button class="catmatch-dialog-button secondary" id="cmDialogCancel" type="button">ยกเลิก</button><button class="catmatch-dialog-button primary" id="cmDialogConfirm" type="button">ตกลง</button></div></section>`;
    // Portal outside <body> so Admin/Farm page zoom and containment cannot clip the overlay.
    document.documentElement.appendChild(root);
    root.style.setProperty("position", "fixed", "important");
    root.style.setProperty("inset", "0", "important");
    root.style.setProperty("width", "100vw", "important");
    root.style.setProperty("height", "100dvh", "important");
    root.style.setProperty("margin", "0", "important");
    return root;
  }
  function open({title="แจ้งเตือน",message="",icon="✓",confirmText="ตกลง",cancelText="ยกเลิก",showCancel=false,danger=false,input=false,inputValue="",placeholder=""}={}){
    const el=ensure(), card=el.querySelector(".catmatch-dialog-card"), titleEl=el.querySelector("#cmDialogTitle"), msg=el.querySelector("#cmDialogMessage"), ico=el.querySelector("#cmDialogIcon"), ok=el.querySelector("#cmDialogConfirm"), cancel=el.querySelector("#cmDialogCancel"), field=el.querySelector("#cmDialogInput");
    titleEl.textContent=title;msg.textContent=message;ico.textContent=icon;ok.textContent=confirmText;cancel.textContent=cancelText;cancel.hidden=!showCancel;ok.className=`catmatch-dialog-button ${danger?"danger":"primary"}`;field.hidden=!input;field.value=inputValue;field.placeholder=placeholder;el.hidden=false;document.body.style.overflow="hidden";card.focus?.();
    return new Promise(resolve=>{let done=false;const finish=(value)=>{if(done)return;done=true;el.hidden=true;document.body.style.overflow="";ok.onclick=cancel.onclick=el.querySelector(".catmatch-dialog-backdrop").onclick=null;document.removeEventListener("keydown",key);resolve(value)};const key=e=>{if(e.key==="Escape"&&showCancel)finish(input?null:false);if(e.key==="Enter"&&!input)finish(input?field.value:true)};ok.onclick=()=>finish(input?field.value:true);cancel.onclick=()=>finish(input?null:false);el.querySelector(".catmatch-dialog-backdrop").onclick=()=>{if(showCancel)finish(input?null:false)};document.addEventListener("keydown",key);setTimeout(()=>input?field.focus():ok.focus(),70)});
  }
  return {alert:(message,opts={})=>open({...opts,message,showCancel:false}),confirm:(message,opts={})=>open({...opts,title:opts.title||"ยืนยันการดำเนินการ",message,showCancel:true,icon:opts.icon||"?"}),prompt:(message,opts={})=>open({...opts,title:opts.title||"กรอกข้อมูล",message,showCancel:true,input:true,icon:opts.icon||"✎",confirmText:opts.confirmText||"ยืนยัน"})};
})();
