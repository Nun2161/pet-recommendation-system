"use strict";
(function setupLegalReturnLink(){
  const params=new URLSearchParams(window.location.search);
  const returnTarget=params.get("return");
  const step=params.get("step")||"3";
  const back=document.querySelector("[data-return-register]");
  if(!back)return;
  const targets={
    "farm-register":[`./farm-register.html?restore=1&step=${encodeURIComponent(step)}`,"← กลับหน้าลงทะเบียนฟาร์ม"],
    "google-onboarding":[`./google-onboarding.html?restore=1&step=${encodeURIComponent(step)}`,"← กลับหน้ากรอกข้อมูล Google"],
    "register":["./register.html?restore=1","← กลับหน้าสมัครสมาชิก"]
  };
  const selected=targets[returnTarget]||["./index.html","← กลับหน้าแรก"];
  back.href=selected[0]; back.textContent=selected[1];
})();
