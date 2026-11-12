/* FitFlow member / trainer portal. Every request goes to the Apps Script web app, which checks the session token. */
(()=>{'use strict';
const $=id=>document.getElementById(id), API=window.SHEET_API_URL||'', PAY=window.PAYMENT_INFO||{};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad=n=>String(n).padStart(2,'0');
const today=()=>{const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`};
const nowStr=()=>{const d=new Date();return `${today()} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`};
const date=s=>s?new Date(s.slice(0,10)+'T12:00:00').toLocaleDateString('th-TH',{day:'2-digit',month:'short',year:'numeric'}):'–';
const dt=s=>s?date(s)+' · '+s.slice(11,16):'–', money=v=>Number(v||0).toLocaleString('th-TH',{style:'currency',currency:'THB',maximumFractionDigits:0});
const pill=(t,c='green')=>`<span class="pill pill-${c}">${esc(t)}</span>`;
const store={get(){try{return localStorage.getItem('ff_user_token')||''}catch{return ''}},set(v){try{v?localStorage.setItem('ff_user_token',v):localStorage.removeItem('ff_user_token')}catch{}}};
let token=store.get(),me=null,tab='home',lastLoad=0;

/* ---------- helpers ---------- */
function toast(text,error=false){const x=$('toast');x.textContent=(error?'⚠ ':'✓ ')+text;x.style.background=error?'#b94c4e':'#1e5145';x.classList.add('show');clearTimeout(window._tt);window._tt=setTimeout(()=>x.classList.remove('show'),3600)}
async function call(action,body={}){
 let r;
 try{r=await fetch(API,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,token,...body})}).then(x=>x.json())}
 catch{throw Error('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่อีกครั้ง')}
 if(!r.ok){if(r.auth){signOut();throw Error('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่')}throw Error(r.error||'เกิดข้อผิดพลาด')}
 return r}
function signOut(){token='';store.set('');me=null;closeModal();showAuth('login')}
function showAuth(which){$('appView').hidden=true;$('authView').hidden=false;$('loginForm').hidden=which!=='login';$('regForm').hidden=which!=='reg';$('tabLogin').classList.toggle('on',which==='login');$('tabReg').classList.toggle('on',which==='reg')}
function closeModal(){$('modalRoot').innerHTML=''}

/* ---------- validation (mirrors the server) ---------- */
const NAME_RE=/^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u,EMAIL_RE=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,PHONE_RE=/^0\d{8,9}$/;
const pwOk=v=>v.length>=8&&v.length<=64&&/[A-Za-z]/.test(v)&&/\d/.test(v);
const rules={
 l_email:v=>!v?'กรุณากรอกอีเมล':!EMAIL_RE.test(v)?'รูปแบบอีเมลไม่ถูกต้อง':'',
 l_password:v=>v?'':'กรุณากรอกรหัสผ่าน',
 first_name:v=>!v?'กรุณากรอกชื่อ':!NAME_RE.test(v)?'ชื่อต้องเป็นตัวอักษรเท่านั้น':'',
 last_name:v=>!v?'กรุณากรอกนามสกุล':!NAME_RE.test(v)?'นามสกุลต้องเป็นตัวอักษรเท่านั้น':'',
 phone:v=>!v?'กรุณากรอกเบอร์โทรศัพท์':!/^\d+$/.test(v)?'เบอร์โทรต้องเป็นตัวเลขเท่านั้น':!PHONE_RE.test(v)?'ต้องเป็นตัวเลข 9-10 หลัก ขึ้นต้นด้วย 0':'',
 email:v=>!v?'กรุณากรอกอีเมล':!EMAIL_RE.test(v)?'รูปแบบอีเมลไม่ถูกต้อง เช่น name@example.com':'',
 date_of_birth:v=>!v?'กรุณาเลือกวันเกิด':(v>today()||v<'1900-01-01')?'วันเกิดไม่ถูกต้อง':'',
 password:v=>!v?'กรุณากรอกรหัสผ่าน':!pwOk(v)?'ต้องยาว 8 ตัวขึ้นไป และมีทั้งตัวอักษรและตัวเลข':'',
 password2:v=>v!==$('password').value?'รหัสผ่านไม่ตรงกัน':''
};
const val=id=>{const el=$(id),v=el.value;if(id==='l_email'||id==='email')return v.trim().toLowerCase();if(el.type==='password'||el.type==='date'||el.tagName==='SELECT')return v;return v.replace(/\s+/g,' ').trim()};
function err(id,msg){const el=$(id),e=document.querySelector(`[data-err="${id}"]`);if(e)e.textContent=msg;el.classList.toggle('bad',!!msg)}
const check=id=>{const m=rules[id](val(id));err(id,m);return !m};
function checkAll(ids){let first=null;ids.forEach(id=>{if(!check(id)&&!first)first=id});if(first)$(first).focus();return !first}
function showMsg(id,t){const m=$(id);m.textContent=t;m.hidden=!t}

document.addEventListener('input',e=>{const t=e.target,k=t.dataset&&t.dataset.kind;
 if(k==='digits')t.value=t.value.replace(/\D/g,'').slice(0,10);
 if(k==='name')t.value=t.value.replace(/[^\p{L}\p{M} .'-]/gu,'');
 if(t.classList&&t.classList.contains('bad')&&rules[t.id])check(t.id)});
document.addEventListener('focusout',e=>{const id=e.target.id;if(rules[id]&&e.target.closest('form')&&!e.target.closest('[hidden]')&&e.target.value!=='')check(id)});

/* ---------- auth screens ---------- */
$('tabLogin').onclick=()=>showAuth('login');
$('tabReg').onclick=()=>showAuth('reg');
const role=()=>$('regForm').querySelector('input[name=role]:checked').value;
function applyRole(){const r=role();$('regForm').querySelectorAll('[data-for]').forEach(el=>{el.hidden=el.dataset.for!==r});showMsg('regMsg','')}
$('regForm').querySelectorAll('input[name=role]').forEach(i=>i.addEventListener('change',applyRole));
$('date_of_birth').max=today();

$('loginForm').addEventListener('submit',async e=>{e.preventDefault();showMsg('loginMsg','');
 if(!checkAll(['l_email','l_password']))return;
 const b=e.target.querySelector('button[type=submit]');b.disabled=true;
 try{const r=await call('login',{email:val('l_email'),password:$('l_password').value});token=r.token;store.set(token);$('l_password').value='';tab=r.role==='trainer'?'thome':'home';await loadMe()}
 catch(x){showMsg('loginMsg',x.message)}finally{b.disabled=false}});

$('regForm').addEventListener('submit',async e=>{e.preventDefault();showMsg('regMsg','');
 if(e.target.elements.website.value)return;
 const r=role(),ids=r==='member'?['first_name','last_name','email','phone','date_of_birth','password','password2']:['first_name','last_name','email','phone','password','password2'];
 if(!checkAll(ids))return;
 const data={};ids.filter(i=>i!=='password2').forEach(i=>data[i]=val(i));
 const b=e.target.querySelector('button[type=submit]');b.disabled=true;
 try{const res=await call('register',{role:r,data});token=res.token;store.set(token);tab=r==='trainer'?'thome':'home';e.target.reset();applyRole();await loadMe();toast('สมัครใช้งานเรียบร้อย ยินดีต้อนรับ')}
 catch(x){showMsg('regMsg',x.message)}finally{b.disabled=false}});

/* ---------- load + render ---------- */
async function loadMe(quiet){
 try{me=await call('me');lastLoad=Date.now();renderApp()}
 catch(x){if(!quiet){showAuth('login');showMsg('loginMsg',x.message)}}}

const NAV={member:[['home','ภาพรวม'],['plans','สมัครแพ็กเกจ'],['classes','จองคลาส'],['history','ประวัติของฉัน']],trainer:[['thome','ภาพรวม'],['tclasses','คลาสของฉัน']]};
function renderApp(){
 $('authView').hidden=true;$('appView').hidden=false;
 const p=me.profile;$('whoName').textContent=p.first_name+' '+p.last_name;$('whoRole').textContent=me.role==='trainer'?'เทรนเนอร์ · โทร '+p.phone:'ผู้ใช้ · '+p.email;
 const tabs=NAV[me.role];if(!tabs.some(t=>t[0]===tab))tab=tabs[0][0];
 $('pNav').innerHTML=tabs.map(t=>`<button type="button" data-tab="${t[0]}" class="${t[0]===tab?'on':''}">${t[1]}</button>`).join('');
 $('pContent').innerHTML=({home,plans,classes,history,thome,tclasses})[tab]()}

const table=(heads,rows,empty)=>rows.length?`<div class="table-wrap"><table><thead><tr>${heads.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`:`<div class="empty"><div class="empty-icon">◌</div><strong>${empty}</strong></div>`;
const panel=(title,body)=>`<div class="panel"><div class="panel-header"><h2 class="panel-title">${title}</h2></div>${body}</div>`;
const STATE={valid:['ใช้งานได้','green'],upcoming:['ยังไม่เริ่ม','gray'],expired:['หมดอายุ','red'],cancelled:['ยกเลิกแล้ว','red'],inactive:['ปิดใช้งาน','gray'],unpaid:['ยังไม่ชำระ','amber']};
const PAYS={paid:['ชำระแล้ว','green'],pending:['รอตรวจสลิป','amber'],rejected:['สลิปถูกปฏิเสธ','red'],unpaid:['ยังไม่ชำระ','amber']};
const PSTAT={paid:['อนุมัติแล้ว','green'],pending:['รอตรวจสอบ','amber'],rejected:['ปฏิเสธ','red'],cancelled:['ยกเลิก','gray'],refunded:['คืนเงิน','gray']};
const mp=(m,k)=>{const x=m[k]||[k,'gray'];return pill(x[0],x[1])};

function home(){
 const valid=me.subscriptions.find(s=>s.state==='valid'),pend=me.payments.filter(x=>x.payment_status==='pending').length,rej=me.payments.filter(x=>x.payment_status==='rejected').length;
 const up=me.bookings.filter(b=>b.booking_status==='booked'&&b.starts_at&&b.starts_at>nowStr());
 let banner='';
 if(rej)banner=`<div class="banner warn">มีสลิปที่ถูกปฏิเสธ ${rej} รายการ — ไปที่ “ประวัติของฉัน” เพื่อแนบสลิปใหม่</div>`;
 else if(!valid&&pend)banner=`<div class="banner ok">ส่งสลิปแล้ว ${pend} รายการ รอเจ้าหน้าที่ตรวจสอบ เมื่ออนุมัติแล้วจะจองคลาสได้</div>`;
 else if(!valid)banner=`<div class="banner warn">คุณยังไม่มีแพ็กเกจที่ใช้งานได้ — ไปที่ “สมัครแพ็กเกจ” เพื่อเลือกแพ็กเกจและแนบสลิปการโอนเงิน</div>`;
 return `<h1>สวัสดี คุณ${esc(me.profile.first_name)}</h1><p class="sub">ภาพรวมสมาชิกของคุณ</p>${banner}
 <div class="cards"><div class="card"><h3>แพ็กเกจปัจจุบัน</h3><div class="big">${valid?esc(valid.plan_name):'–'}</div><p>${valid?'ใช้งานได้ถึง '+date(valid.end_date):'ยังไม่มีแพ็กเกจที่ใช้งานได้'}</p></div>
 <div class="card"><h3>สลิปรอตรวจสอบ</h3><div class="big">${pend}</div><p>รายการที่ส่งแล้วและรอการอนุมัติ</p></div>
 <div class="card"><h3>คลาสที่จองไว้</h3><div class="big">${up.length}</div><p>คลาสที่ยังไม่ถึงเวลา</p></div></div>
 ${panel('คลาสที่จองไว้',table(['คลาส','วันเวลา','สถานที่'],up.map(b=>[esc(b.class_name),dt(b.starts_at),esc(b.location)]),'ยังไม่มีคลาสที่จองไว้'))}`}

function plans(){
 return `<h1>สมัครแพ็กเกจ</h1><p class="sub">เลือกแพ็กเกจ โอนเงิน แล้วแนบสลิป เจ้าหน้าที่จะตรวจสอบและอนุมัติ</p>
 <div class="plans-grid">${me.plans.map(p=>`<article class="plan"><div class="plan-head"><strong>${esc(p.plan_name)}</strong></div><div class="plan-price">${money(p.price)}<small> / ${p.duration_days} วัน</small></div><p>${esc(p.description)}</p><button type="button" class="btn btn-primary" data-act="subscribe" data-id="${p.plan_id}">สมัครแพ็กเกจนี้ →</button></article>`).join('')||'<div class="empty"><strong>ยังไม่มีแพ็กเกจให้สมัคร</strong></div>'}</div>`}

function classes(){
 const banner=me.can_book?`<div class="banner ok">แพ็กเกจของคุณใช้งานได้ถึง ${date(me.valid_until)} — จองคลาสได้เลย</div>`:`<div class="banner warn">จองคลาสได้เมื่อมีแพ็กเกจที่ชำระเงินและได้รับการอนุมัติแล้วเท่านั้น</div>`;
 return `<h1>จองคลาส</h1><p class="sub">คลาสที่เปิดให้จอง</p>${banner}`+panel('ตารางคลาส',table(['คลาส','ผู้ฝึกสอน','วันเวลา','สถานที่','ที่นั่ง','จัดการ'],me.classes.map(c=>{
  const full=c.booked>=c.capacity;
  const act=c.my_booking_id?`<button type="button" class="btn btn-secondary sm" data-act="cancel-booking" data-id="${c.my_booking_id}">ยกเลิกการจอง</button>`:`<button type="button" class="btn btn-primary sm" data-act="book" data-id="${c.class_id}" ${(!me.can_book||full)?'disabled':''}>${full?'เต็ม':'จองคลาส'}</button>`;
  return [`<div class="main-cell">${esc(c.class_name)}</div>`,esc(c.trainer),dt(c.starts_at),esc(c.location),`${c.booked} / ${c.capacity}`+(c.my_booking_id?' '+pill('จองแล้ว','green'):''),act]}),'ตอนนี้ยังไม่มีคลาสที่เปิดให้จอง'))}

function history(){
 const subs=table(['แพ็กเกจ','ช่วงวันที่','สถานะ','จัดการ'],me.subscriptions.map(s=>[`<div class="main-cell">${esc(s.plan_name)}</div><div class="minor">#${s.subscription_id} · ${money(s.price)}</div>`,date(s.start_date)+' – '+date(s.end_date),`<div class="pays">${mp(STATE,s.state)}${s.subscription_status==='cancelled'?'':mp(PAYS,s.payment)}</div>`,(s.subscription_status!=='cancelled'&&s.payment!=='paid')?`<button type="button" class="btn btn-secondary sm" data-act="cancel-sub" data-id="${s.subscription_id}">ยกเลิก</button>`:'–']),'ยังไม่เคยสมัครแพ็กเกจ');
 const pays=table(['อ้างอิง','แพ็กเกจ','จำนวน','วันที่','สถานะ','จัดการ'],me.payments.map(p=>[esc(p.reference_no||'#'+p.payment_id),esc(p.plan_name),`<strong>${money(p.amount)}</strong>`,dt(p.payment_date),mp(PSTAT,p.payment_status),p.payment_status==='rejected'?`<button type="button" class="btn btn-primary sm" data-act="resubmit" data-id="${p.payment_id}">แนบสลิปใหม่</button>`:'–']),'ยังไม่มีรายการชำระเงิน');
 const books=table(['คลาส','วันเวลา','สถานะ','จัดการ'],me.bookings.map(b=>[esc(b.class_name),dt(b.starts_at),pill(b.booking_status==='booked'?'จองแล้ว':'ยกเลิก',b.booking_status==='booked'?'green':'red'),(b.booking_status==='booked'&&b.starts_at>nowStr())?`<button type="button" class="btn btn-secondary sm" data-act="cancel-booking" data-id="${b.booking_id}">ยกเลิกการจอง</button>`:'–']),'ยังไม่เคยจองคลาส');
 return `<h1>ประวัติของฉัน</h1><p class="sub">การสมัครแพ็กเกจ การชำระเงิน และการจองคลาส</p>${panel('การสมัครแพ็กเกจ',subs)}${panel('การชำระเงิน',pays)}${panel('การจองคลาส',books)}`}

const APPR={approved:['อนุมัติแล้ว','green'],pending:['รอแอดมินอนุมัติ','amber'],rejected:['ไม่อนุมัติ','red']};
function thome(){
 const cs=me.classes,ok=cs.filter(c=>c.approval_status==='approved'),pend=cs.filter(c=>c.approval_status==='pending').length,rej=cs.filter(c=>c.approval_status==='rejected').length;
 const up=ok.filter(c=>!c.past),students=up.reduce((v,c)=>v+c.booked,0);
 let banner='';
 if(rej)banner=`<div class="banner warn">มีคลาสที่ไม่ได้รับอนุมัติ ${rej} คลาส — ดูที่ “คลาสของฉัน” ลบแล้วสร้างใหม่ได้</div>`;
 else if(pend)banner=`<div class="banner ok">ส่งคลาสให้แอดมินแล้ว ${pend} คลาส รออนุมัติ เมื่ออนุมัติแล้วสมาชิกจะเห็นและจองได้</div>`;
 else if(!cs.length)banner=`<div class="banner warn">คุณยังไม่มีคลาส — ไปที่ “คลาสของฉัน” เพื่อสร้างคลาสและส่งให้แอดมินอนุมัติ</div>`;
 return `<h1>สวัสดี ครู${esc(me.profile.first_name)}</h1><p class="sub">ภาพรวมการสอนของคุณ</p>${banner}
 <div class="cards"><div class="card"><h3>คลาสที่เปิดสอนได้</h3><div class="big">${up.length}</div><p>อนุมัติแล้วและยังไม่ถึงเวลา</p></div>
 <div class="card"><h3>รออนุมัติ</h3><div class="big">${pend}</div><p>คลาสที่ส่งให้แอดมินตรวจสอบ</p></div>
 <div class="card"><h3>ผู้จองทั้งหมด</h3><div class="big">${students}</div><p>จากคลาสที่ยังไม่ถึงเวลา</p></div></div>
 ${panel('คลาสที่กำลังจะมาถึง',table(['คลาส','วันเวลา','สถานที่','ผู้จอง'],up.map(c=>[esc(c.class_name),dt(c.starts_at),esc(c.location),`${c.booked} / ${c.capacity}`]),'ยังไม่มีคลาสที่อนุมัติแล้ว'))}`}
function tclasses(){
 const rows=me.classes.map(c=>{const a=APPR[c.approval_status]||APPR.approved;
  return [`<div class="main-cell">${esc(c.class_name)}</div>`+(c.past?`<div class="minor">ผ่านมาแล้ว</div>`:''),dt(c.starts_at),esc(c.location),mp(APPR,c.approval_status||'approved'),`${c.booked} / ${c.capacity}`,c.members.length?c.members.map(esc).join(', '):'–',c.booked?'–':`<button type="button" class="btn btn-secondary sm" data-act="delete-class" data-id="${c.class_id}">ลบคลาส</button>`]});
 return `<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap;margin-bottom:6px"><div><h1>คลาสของฉัน</h1><p class="sub" style="margin:0 0 16px">สร้างคลาสแล้วส่งให้แอดมินอนุมัติ ก่อนที่สมาชิกจะเห็นและจองได้</p></div><button type="button" class="btn btn-primary" data-act="new-class">＋ สร้างคลาส</button></div>`
 +panel('คลาสทั้งหมดของฉัน',table(['คลาส','วันเวลา','สถานที่','สถานะ','ผู้จอง','รายชื่อ','จัดการ'],rows,'ยังไม่มีคลาส — กด “สร้างคลาส” เพื่อเริ่ม'))}

/* ---------- modals ---------- */
function modal(title,body,submit,onSubmit){
 $('modalRoot').innerHTML=`<div class="modal-layer"><div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="modal-head"><h2>${esc(title)}</h2><button type="button" class="icon-button" data-close aria-label="ปิด">✕</button></div><form id="mForm" novalidate><div class="modal-body">${body}<div class="msg" id="mMsg" hidden></div></div><div class="modal-footer"><button type="button" class="btn btn-secondary" data-close>ยกเลิก</button><button type="submit" class="btn btn-primary" id="mSubmit">${esc(submit)}</button></div></form></div></div>`;
 $('mForm').addEventListener('submit',async e=>{e.preventDefault();const b=$('mSubmit'),old=b.textContent;b.disabled=true;b.textContent='กำลังดำเนินการ…';showMsg('mMsg','');
  try{await onSubmit(e.target);closeModal()}catch(x){showMsg('mMsg',x.message||String(x));b.disabled=false;b.textContent=old}});
 const f=$('mForm').querySelector('input,select');if(f)f.focus()}

async function compress(file){
 if(!/^image\/(jpeg|png|webp)$/.test(file.type))throw Error('ไฟล์ต้องเป็นรูปภาพ JPG, PNG หรือ WebP');
 let bmp;try{bmp=await createImageBitmap(file)}catch{throw Error('เปิดรูปนี้ไม่ได้ กรุณาเลือกรูปอื่น')}
 let scale=Math.min(1,900/Math.max(bmp.width,bmp.height)),q=.72;
 for(let i=0;i<10;i++){
  const c=document.createElement('canvas');c.width=Math.max(1,Math.round(bmp.width*scale));c.height=Math.max(1,Math.round(bmp.height*scale));
  const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.drawImage(bmp,0,0,c.width,c.height);
  const url=c.toDataURL('image/jpeg',q),b64=url.split(',')[1];
  if(b64.length<=140000)return{mime:'image/jpeg',data:b64,preview:url};
  q-=.08;if(q<.4){q=.6;scale*=.8}}
 throw Error('รูปใหญ่เกินไป กรุณาครอปหรือเลือกรูปที่เล็กลง')}
const slipField=()=>`<div class="field full"><label for="slipFile">แนบสลิปการโอนเงิน</label><input id="slipFile" type="file" accept="image/jpeg,image/png,image/webp"><div class="small">รูป JPG / PNG / WebP ระบบจะย่อรูปให้อัตโนมัติ</div><img id="slipPrev" class="slip-prev" alt="ตัวอย่างสลิป" hidden></div>`;
function wireSlip(set){$('slipFile').addEventListener('change',async e=>{const f=e.target.files[0];set(null);$('slipPrev').hidden=true;showMsg('mMsg','');if(!f)return;
 try{const s=await compress(f);set(s);$('slipPrev').src=s.preview;$('slipPrev').hidden=false}catch(x){showMsg('mMsg',x.message);e.target.value=''}})}

function subscribeModal(planId){
 const p=me.plans.find(x=>x.plan_id===Number(planId));if(!p)return;let slip=null;
 const has=PAY.accountNumber||PAY.promptpay;
 const info=has?[PAY.bank&&'ธนาคาร: <b>'+esc(PAY.bank)+'</b>',PAY.accountName&&'ชื่อบัญชี: <b>'+esc(PAY.accountName)+'</b>',PAY.accountNumber&&'เลขที่บัญชี: <b>'+esc(PAY.accountNumber)+'</b>',PAY.promptpay&&'พร้อมเพย์: <b>'+esc(PAY.promptpay)+'</b>'].filter(Boolean).join('<br>'):'ยังไม่ได้ตั้งค่าบัญชีรับเงิน กรุณาติดต่อเจ้าหน้าที่เพื่อขอเลขบัญชีก่อนโอน';
 modal('สมัครแพ็กเกจ '+p.plan_name,`<div class="form-grid"><div class="field full"><div class="banner ok" style="margin:0">${esc(p.plan_name)} · ${p.duration_days} วัน · ยอดที่ต้องโอน <b>${money(p.price)}</b></div></div>
 <div class="field full"><label for="startDate">วันเริ่มต้นแพ็กเกจ</label><input id="startDate" type="date" min="${today()}" value="${today()}" required></div>
 <div class="field full"><label>โอนเงินเข้าบัญชี</label><div class="paybox">${info}</div></div>${slipField()}</div>`,'ส่งสลิปและสมัครแพ็กเกจ',async()=>{
  const sd=$('startDate').value;if(!sd||sd<today())throw Error('กรุณาเลือกวันเริ่มต้นที่ไม่ใช่วันที่ผ่านมาแล้ว');
  if(!slip)throw Error('กรุณาแนบสลิปการโอนเงิน');
  await call('subscribe',{plan_id:p.plan_id,start_date:sd,slip:{mime:slip.mime,data:slip.data}});
  tab='history';await loadMe();toast('ส่งสลิปแล้ว รอเจ้าหน้าที่ตรวจสอบ')});
 wireSlip(s=>slip=s)}

function resubmitModal(payId){let slip=null;
 modal('แนบสลิปใหม่',`<div class="form-grid"><div class="field full"><div class="banner warn" style="margin:0">สลิปเดิมถูกปฏิเสธ กรุณาแนบสลิปที่ชัดเจนและยอดเงินตรงกับแพ็กเกจ</div></div>${slipField()}</div>`,'ส่งสลิปใหม่',async()=>{
  if(!slip)throw Error('กรุณาแนบสลิปการโอนเงิน');
  await call('resubmitSlip',{payment_id:Number(payId),slip:{mime:slip.mime,data:slip.data}});await loadMe();toast('ส่งสลิปใหม่แล้ว รอเจ้าหน้าที่ตรวจสอบ')});
 wireSlip(s=>slip=s)}

function passwordModal(){
 modal('เปลี่ยนรหัสผ่าน',`<div class="form-grid"><div class="field full"><label for="oldPw">รหัสผ่านเดิม</label><input id="oldPw" type="password" autocomplete="current-password"></div><div class="field full"><label for="newPw">รหัสผ่านใหม่</label><input id="newPw" type="password" autocomplete="new-password" maxlength="64"><div class="small">8 ตัวขึ้นไป มีตัวอักษรและตัวเลข</div></div><div class="field full"><label for="newPw2">ยืนยันรหัสผ่านใหม่</label><input id="newPw2" type="password" autocomplete="new-password" maxlength="64"></div></div>`,'บันทึก',async()=>{
  const o=$('oldPw').value,n=$('newPw').value;
  if(!o)throw Error('กรุณากรอกรหัสผ่านเดิม');if(!pwOk(n))throw Error('รหัสผ่านใหม่ต้องยาว 8 ตัวขึ้นไป และมีทั้งตัวอักษรและตัวเลข');if(n!==$('newPw2').value)throw Error('รหัสผ่านใหม่ไม่ตรงกัน');
  await call('changePassword',{old_password:o,new_password:n});toast('เปลี่ยนรหัสผ่านแล้ว')})}

function newClassModal(){
 const nowL=nowStr().slice(0,16).replace(' ','T');
 modal('สร้างคลาสใหม่',`<div class="form-grid"><div class="field full"><div class="banner ok" style="margin:0">คลาสที่สร้างจะอยู่ในสถานะ “รอแอดมินอนุมัติ” สมาชิกจะเห็นและจองได้หลังอนุมัติ</div></div>
 <div class="field full"><label for="cName">ชื่อคลาส</label><input id="cName" type="text" maxlength="100"></div>
 <div class="field"><label for="cStart">เวลาเริ่ม</label><input id="cStart" type="datetime-local" min="${nowL}"></div>
 <div class="field"><label for="cEnd">เวลาสิ้นสุด</label><input id="cEnd" type="datetime-local" min="${nowL}"></div>
 <div class="field"><label for="cCap">จำนวนที่นั่ง</label><input id="cCap" type="number" min="1" max="200" step="1" value="10"></div>
 <div class="field"><label for="cLoc">สถานที่ / ห้อง</label><input id="cLoc" type="text" maxlength="100"></div></div>`,'ส่งให้แอดมินอนุมัติ',async()=>{
  const name=$('cName').value.replace(/\s+/g,' ').trim(),loc=$('cLoc').value.replace(/\s+/g,' ').trim(),s=$('cStart').value,e=$('cEnd').value,cap=Number($('cCap').value);
  if(!name)throw Error('กรุณากรอกชื่อคลาส');if(!loc)throw Error('กรุณากรอกสถานที่');if(!s||!e)throw Error('กรุณาเลือกเวลาเริ่มและเวลาสิ้นสุด');
  const S=s.replace('T',' ')+':00',E=e.replace('T',' ')+':00';
  if(S<=nowStr())throw Error('เวลาเริ่มต้องเป็นเวลาในอนาคต');if(E<=S)throw Error('เวลาสิ้นสุดต้องหลังเวลาเริ่ม');
  if(!Number.isInteger(cap)||cap<1||cap>200)throw Error('จำนวนที่นั่งต้องเป็นจำนวนเต็ม 1-200');
  await call('trainerCreateClass',{class_name:name,location:loc,starts_at:S,ends_at:E,capacity:cap});
  tab='tclasses';await loadMe();toast('ส่งคลาสให้แอดมินอนุมัติแล้ว')})}

/* ---------- events ---------- */
document.addEventListener('click',async e=>{
 if(e.target.closest('[data-close]')||e.target.classList.contains('modal-layer')){closeModal();return}
 const t=e.target.closest('[data-tab]');if(t){tab=t.dataset.tab;renderApp();return}
 const a=e.target.closest('[data-act]');if(!a||a.disabled)return;const id=a.dataset.id;
 try{
  if(a.dataset.act==='new-class')return newClassModal();
  if(a.dataset.act==='delete-class'){if(!confirm('ลบคลาสนี้?'))return;a.disabled=true;await call('trainerDeleteClass',{class_id:Number(id)});await loadMe();toast('ลบคลาสแล้ว')}
  if(a.dataset.act==='subscribe')return subscribeModal(id);
  if(a.dataset.act==='resubmit')return resubmitModal(id);
  if(a.dataset.act==='book'){a.disabled=true;await call('book',{class_id:Number(id)});await loadMe();toast('จองคลาสเรียบร้อยแล้ว')}
  if(a.dataset.act==='cancel-booking'){if(!confirm('ยืนยันการยกเลิกการจอง?'))return;a.disabled=true;await call('cancelBooking',{booking_id:Number(id)});await loadMe();toast('ยกเลิกการจองแล้ว')}
  if(a.dataset.act==='cancel-sub'){if(!confirm('ยืนยันการยกเลิกการสมัครแพ็กเกจนี้?'))return;a.disabled=true;await call('cancelSubscription',{subscription_id:Number(id)});await loadMe();toast('ยกเลิกการสมัครแล้ว')}
 }catch(x){toast(x.message||String(x),true);a.disabled=false}});
$('logoutBtn').onclick=()=>{signOut();toast('ออกจากระบบแล้ว')};
$('pwBtn').onclick=passwordModal;
window.addEventListener('focus',()=>{if(me&&!$('modalRoot').innerHTML&&Date.now()-lastLoad>10000)loadMe(true)});

/* ---------- start ---------- */
applyRole();
if(!API){showAuth('login');showMsg('loginMsg','ระบบยังไม่ได้เชื่อมต่อฐานข้อมูล กรุณาแจ้งผู้ดูแล')}
else if(token){loadMe()}
else showAuth(location.hash==='#register'?'reg':'login');
})();
