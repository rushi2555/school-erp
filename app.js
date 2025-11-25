/* SchoolMate — Modern & Colorful full frontend ERP
   - Login-first (email + phone OTP demo)
   - Roles: admin/principal, teacher, student
   - Students: can view own profile, marks, attendance, announcements, rate teacher (ratings visible only to principal)
   - Teachers: can make announcements, mark attendance for assigned classes, add marks for subjects they teach
   - Principal: full access, can view ratings
   - LocalStorage persistence
*/

// ------- Utilities -------
const LS = 'schoolmate_modern_v1';
const mount = id => document.getElementById(id);
const uid = (p='id') => p + '_' + Math.random().toString(36).slice(2,9);
const nowISO = () => new Date().toISOString();
const showToast = (t) => {
  const box = document.createElement('div'); box.className = 'toast'; box.innerText = t;
  mount('toasts').appendChild(box);
  setTimeout(()=> box.remove(), 3200);
};

// ------- Default State -------
function defaultState(){
  return {
    users:[
      {id:'u_admin', role:'admin', name:'Principal', email:'principal@school.edu', phone:'9999000000', password:'admin123'},
      {id:'u_t1', role:'teacher', name:'Ms. Priya', email:'priya@school.edu', phone:'9123456780', password:'teach123', subjectIds:[], classIds:['c_10A']},
      {id:'u_s1', role:'student', name:'Aman Singh', email:'aman@school.edu', phone:'9876500001', password:'stud123', classId:'c_10A'}
    ],
    students:[],
    teachers:[],
    classes:[],
    subjects:[],
    attendance:[], // {id,classId,date,records:[{studentId,present}]}
    grades:[], // {id,classId,subjectId,studentId,marks}
    announcements:[],
    ratings:[], // {id,teacherId,subjectId,studentId,rating,comment,date}
    pendingOtp:null,
    loggedIn:null
  };
}

// ------- Load/Save -------
let state;
try { const raw = localStorage.getItem(LS); state = raw ? JSON.parse(raw) : defaultState(); } catch(e){ state = defaultState(); }
function save(){ localStorage.setItem(LS, JSON.stringify(state)); }

// ------- Seed defaults -------
(function seed(){
  if(state.classes.length===0) state.classes = [{id:'c_10A',name:'Class 10A'},{id:'c_10B',name:'Class 10B'}];
  if(state.subjects.length===0){
    state.subjects = [{id:uid('sub'), name:'Mathematics'},{id:uid('sub'), name:'Science'},{id:uid('sub'), name:'English'}];
  }
  // sync teachers/students arrays from users (simple)
  state.teachers = state.users.filter(u=>u.role==='teacher').map(u=>({id:u.id,name:u.name,email:u.email,subjectIds:u.subjectIds||[],classIds:u.classIds||[]}));
  state.students = state.users.filter(u=>u.role==='student').map(u=>({id:u.id,name:u.name,roll:'R-'+(100+Math.floor(Math.random()*900)),email:u.email,classId:u.classId||state.classes[0].id}));
  save();
})();

// ------- DOM roots -------
const menuEl = mount('menu');
const sideProfile = mount('sideProfile');
const topActions = mount('topActions');
const main = mount('main');

// ------- Render helpers -------
function renderMenu(){
  const role = state.loggedIn ? state.loggedIn.role : 'guest';
  const items = [
    {id:'dash', label:'Dashboard', show:true},
    {id:'students', label:'Students', show: role!=='student'},
    {id:'teachers', label:'Teachers', show: role==='admin' || role==='teacher'},
    {id:'classes', label:'Classes', show: role!=='guest'},
    {id:'attendance', label:'Attendance', show: role!=='student'},
    {id:'grades', label:'Grades', show: role!=='guest'},
    {id:'announcements', label:'Announcements', show:true},
    {id:'ratings', label:'Ratings', show: role==='admin'},
    {id:'settings', label:'Settings', show: role==='admin'}
  ];
  menuEl.innerHTML = items.filter(i=>i.show).map(i=>`<div class="mitem" data-id="${i.id}">${i.label}</div>`).join('');
  document.querySelectorAll('.mitem').forEach(it=> it.onclick = ()=> {
    document.querySelectorAll('.mitem').forEach(x=>x.classList.remove('active'));
    it.classList.add('active');
    navigate(it.dataset.id);
  });
  const def = document.querySelector('.mitem[data-id="dash"]');
  if(def) def.classList.add('active');
}

function renderTopActions(){
  topActions.innerHTML = '';
  if(state.loggedIn){
    const info = document.createElement('div'); info.className='small'; info.innerText = `${state.loggedIn.name} (${state.loggedIn.role})`;
    const logout = document.createElement('button'); logout.className='btn ghost'; logout.innerText='Logout'; logout.onclick = ()=> { state.loggedIn = null; save(); boot(); showToast('Logged out'); };
    topActions.appendChild(info); topActions.appendChild(logout);
  } else {
    const loginBtn = document.createElement('button'); loginBtn.className='btn primary'; loginBtn.innerText='Login'; loginBtn.onclick = ()=> renderLogin();
    topActions.appendChild(loginBtn);
  }
}

function renderSideProfile(){
  if(state.loggedIn){
    sideProfile.innerHTML = `<div class="avatar">${state.loggedIn.name.charAt(0)}</div><div class="name">${state.loggedIn.name}</div><div class="small">${state.loggedIn.email || state.loggedIn.phone || ''}</div>`;
  } else {
    sideProfile.innerHTML = `<div class="avatar">SM</div><div class="name">SchoolMate</div><div class="small">Please login</div>`;
  }
}

// ------- Navigation -------
function navigate(page){
  if(!state.loggedIn) return renderLogin();
  if(state.loggedIn.role === 'student' && page === 'dash'){ renderStudentDashboard(); return; }
  switch(page){
    case 'dash': renderDashboard(); break;
    case 'students': renderStudents(); break;
    case 'teachers': renderTeachers(); break;
    case 'classes': renderClasses(); break;
    case 'attendance': renderAttendance(); break;
    case 'grades': renderGrades(); break;
    case 'announcements': renderAnnouncements(); break;
    case 'ratings': renderRatings(); break;
    case 'settings': renderSettings(); break;
    default: renderDashboard();
  }
}

// ------- Boot / Render -------
function boot(){
  renderMenu(); renderTopActions(); renderSideProfile();
  if(!state.loggedIn) renderLogin(); else navigate('dash');
}
boot();

// ------- LOGIN (Email + Phone OTP demo) -------
function renderLogin(){
  const tpl = document.getElementById('login-template').content.cloneNode(true);
  main.innerHTML = ''; main.appendChild(tpl);

  const tabEmail = document.getElementById('tabEmail'), tabPhone = document.getElementById('tabPhone');
  const emailBlock = document.getElementById('loginEmailBlock'), phoneBlock = document.getElementById('loginPhoneBlock');

  function showEmail(){ tabEmail.classList.remove('ghost'); tabEmail.classList.add('primary'); tabPhone.classList.remove('primary'); tabPhone.classList.add('ghost'); emailBlock.style.display='block'; phoneBlock.style.display='none'; }
  function showPhone(){ tabPhone.classList.remove('ghost'); tabPhone.classList.add('primary'); tabEmail.classList.remove('primary'); tabEmail.classList.add('ghost'); emailBlock.style.display='none'; phoneBlock.style.display='block'; }

  tabEmail.onclick = showEmail; tabPhone.onclick = showPhone; showEmail();

  document.getElementById('li_btn').onclick = ()=> {
    const e = document.getElementById('li_email').value.trim(); const p = document.getElementById('li_pass').value;
    if(!e || !p){ showToast('Enter email & password'); return; }
    const user = state.users.find(u=>u.email===e && u.password===p);
    if(!user){ showToast('Invalid credentials'); return; }
    state.loggedIn = user; save(); boot(); showToast('Welcome, ' + user.name);
  };

  document.getElementById('demoBtn').onclick = ()=> { document.getElementById('li_email').value='principal@school.edu'; document.getElementById('li_pass').value='admin123'; };

  // Phone OTP demo
  const sendOtpBtn = document.getElementById('sendOtpBtn'), verifyOtpBtn = document.getElementById('verifyOtpBtn'), cancelOtpBtn = document.getElementById('cancelOtpBtn'), otpArea = document.getElementById('otpArea');
  sendOtpBtn.onclick = ()=> {
    const phone = document.getElementById('li_phone').value.trim().replace(/\D/g,'');
    if(!phone || phone.length < 7){ showToast('Enter valid phone'); return; }
    const code = (Math.floor(100000 + Math.random()*900000)).toString();
    state.pendingOtp = { phone, code, expires: Date.now() + 5*60*1000 }; save();
    showToast('Demo OTP: ' + code); otpArea.style.display = 'block'; document.getElementById('li_otp').value = ''; setTimeout(()=> document.getElementById('li_otp').focus(),200);
  };
  verifyOtpBtn.onclick = ()=> {
    const otp = document.getElementById('li_otp').value.trim();
    if(!state.pendingOtp){ showToast('No OTP requested'); return; }
    if(Date.now() > state.pendingOtp.expires){ showToast('OTP expired'); state.pendingOtp = null; save(); return; }
    if(otp !== state.pendingOtp.code){ showToast('Invalid OTP'); return; }
    const phone = state.pendingOtp.phone;
    let user = state.users.find(u => u.phone && u.phone.replace(/\D/g,'') === phone);
    if(!user){
      // create student account automatically (demo)
      const newu = { id: uid('u'), role: 'student', name: 'Student ' + phone.slice(-4), email:'', phone, password:'' };
      state.users.push(newu);
      state.students.push({ id: newu.id, name: newu.name, roll: 'R-' + (100 + Math.floor(Math.random()*900)), email:'', classId: state.classes[0].id });
      showToast('Created student account for ' + phone);
      user = newu;
    }
    state.loggedIn = user; state.pendingOtp = null; save(); boot(); showToast('Welcome, ' + user.name);
  };
  cancelOtpBtn.onclick = ()=> { state.pendingOtp = null; save(); otpArea.style.display='none'; showToast('OTP cancelled'); };
  document.getElementById('useEmailBtn').onclick = ()=> tabEmail.click();
}

// ------- DASHBOARD -------
function renderDashboard(){
  const totalStudents = state.students.length, totalTeachers = state.teachers.length, totalClasses = state.classes.length;
  const recent = state.announcements.slice().reverse().slice(0,5);
  main.innerHTML = `
    <section class="card">
      <div class="header-row"><h2>Dashboard</h2><div class="controls"><button class="btn ghost" onclick="exportAll()">Export</button><button class="btn ghost" onclick="importAll()">Import</button></div></div>
      <div class="kpis" style="margin-top:12px">
        <div class="kpi"><h4>Students</h4><p>${totalStudents}</p></div>
        <div class="kpi"><h4>Teachers</h4><p>${totalTeachers}</p></div>
        <div class="kpi"><h4>Classes</h4><p>${totalClasses}</p></div>
      </div>
    </section>
    <section class="card"><h3>Recent Announcements</h3>${recent.length?'<ul>'+recent.map(a=>`<li>${new Date(a.date).toLocaleString()} — ${a.title}</li>`).join('')+'</ul>':'<div class="empty">No announcements</div>'}</section>
  `;
}

// ------- STUDENT DASHBOARD & VIEWS -------
function renderStudentDashboard(){
  const stud = state.students.find(s=>s.id === state.loggedIn.id);
  main.innerHTML = `
    <section class="card"><h2>Welcome ${stud.name}</h2><p>Class: ${state.classes.find(c=>c.id===stud.classId)?.name||'-'}</p>
      <div style="margin-top:8px" class="controls">
        <button class="btn ghost" onclick="showRatingForm('${stud.id}')">Rate Teacher</button>
      </div>
    </section>
    <section class="card"><h3>My Marks</h3>${renderStudentMarks(stud.id)}</section>
    <section class="card"><h3>My Attendance</h3>${renderStudentAttendance(stud.id)}</section>
    <section class="card"><h3>Announcements</h3>${state.announcements.length?'<ul>'+state.announcements.slice().reverse().map(a=>`<li>${new Date(a.date).toLocaleString()} — ${a.title}</li>`).join('')+'</ul>':'<div class="empty">No announcements</div>'}</section>
  `;
}

function renderStudents(){
  const role = state.loggedIn.role;
  if(role === 'student'){ // only self
    renderStudentDashboard(); return;
  }
  // admin/teacher => list (limited for teacher?)
  const teacherView = role === 'teacher';
  let rows = state.students;
  if(teacherView){
    // only students in teacher's classes
    const t = state.teachers.find(x=>x.id === state.loggedIn.id);
    if(t && t.classIds) rows = state.students.filter(s=>t.classIds.includes(s.classId));
  }
  main.innerHTML = `<section class="card"><div class="header-row"><h2>Students</h2></div><div class="card" style="margin-top:12px"><table class="table"><thead><tr><th>Roll</th><th>Name</th><th>Class</th><th>Email</th></tr></thead><tbody>${rows.map(s=>`<tr><td>${s.roll}</td><td>${s.name}</td><td>${state.classes.find(c=>c.id===s.classId)?.name||'-'}</td><td>${s.email||'-'}</td></tr>`).join('')}</tbody></table></div></section>`;
}

function renderStudentMarks(studentId){
  const rows = state.grades.filter(g=>g.studentId === studentId);
  if(rows.length===0) return '<div class="empty">No marks</div>';
  return `<table class="table"><thead><tr><th>Subject</th><th>Marks</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${state.subjects.find(s=>s.id===r.subjectId)?.name||'-'}</td><td>${r.marks}</td></tr>`).join('')}</tbody></table>`;
}

function renderStudentAttendance(studentId){
  const recs = state.attendance.filter(a=> a.records.some(r=> r.studentId===studentId && r.present));
  if(recs.length===0) return '<div class="empty">No attendance recorded</div>';
  return `<ul>${recs.map(r=>`<li>${r.date} — ${state.classes.find(c=>c.id===r.classId)?.name||'-'}</li>`).join('')}</ul>`;
}

// ------- TEACHERS -------
function renderTeachers(){
  const role = state.loggedIn.role;
  if(role === 'student'){ main.innerHTML = `<section class="card"><div class="empty">No permission to view teachers</div></section>`; return; }
  main.innerHTML = `<section class="card"><div class="header-row"><h2>Teachers</h2></div><div class="card" style="margin-top:12px"><table class="table"><thead><tr><th>Name</th><th>Email</th><th>Subjects</th></tr></thead><tbody>${state.teachers.map(t=>`<tr><td>${t.name}</td><td>${t.email||'-'}</td><td>${(t.subjectIds||[]).map(id=>state.subjects.find(s=>s.id===id)?.name).filter(Boolean).join(', ')||'-'}</td></tr>`).join('')}</tbody></table></div></section>`;
}

// ------- CLASSES -------
function renderClasses(){
  main.innerHTML = `<section class="card"><div class="header-row"><h2>Classes</h2></div><div class="card" style="margin-top:12px"><table class="table"><thead><tr><th>Class</th></tr></thead><tbody>${state.classes.map(c=>`<tr><td>${c.name}</td></tr>`).join('')}</tbody></table></div></section>`;
}

// ------- ATTENDANCE -------
function renderAttendance(){
  const role = state.loggedIn.role;
  if(role === 'student'){ main.innerHTML = `<section class="card"><div class="empty">You don't have permission to mark attendance</div></section>`; return; }
  const permitted = role === 'admin' ? state.classes.map(c=>c.id) : (state.teachers.find(t=>t.id===state.loggedIn.id)?.classIds || []);
  if(!permitted.length){ main.innerHTML = `<section class="card"><div class="empty">No classes assigned</div></section>`; return; }
  main.innerHTML = `<section class="card"><div class="header-row"><h2>Attendance</h2><div class="controls"><select id="att_class" class="input">${permitted.map(cid=>`<option value="${cid}">${state.classes.find(c=>c.id===cid)?.name||cid}</option>`).join('')}</select><input id="att_date" class="input" type="date" value="${new Date().toISOString().slice(0,10)}" /><button id="loadAtt" class="btn primary">Load</button></div></div><div id="attList" class="card" style="margin-top:12px"></div></section>`;
  document.getElementById('loadAtt').onclick = ()=> loadAttendance(document.getElementById('att_class').value, document.getElementById('att_date').value);
  loadAttendance(document.getElementById('att_class').value, document.getElementById('att_date').value);
}
function loadAttendance(classId, dateStr){
  const listWrap = document.getElementById('attList');
  const students = state.students.filter(s=>s.classId === classId);
  const att = state.attendance.find(a=>a.classId===classId && a.date===dateStr);
  let records = att ? att.records : students.map(s=>({studentId:s.id, present:true}));
  listWrap.innerHTML = `<h4>Class: ${state.classes.find(c=>c.id===classId)?.name||'-'} — Date: ${dateStr}</h4><div style="margin-top:8px"><button id="saveAtt" class="btn primary">Save Attendance</button></div><table class="table" style="margin-top:8px"><thead><tr><th>Roll</th><th>Name</th><th>Present</th></tr></thead><tbody>${students.map(s=>`<tr><td>${s.roll||'-'}</td><td>${s.name}</td><td><input type="checkbox" data-id="${s.id}" ${records.find(r=>r.studentId===s.id && r.present)?'checked':''} /></td></tr>`).join('')}</tbody></table>`;
  document.getElementById('saveAtt').onclick = ()=> {
    const rows = Array.from(listWrap.querySelectorAll('input[type=checkbox]'));
    const newRec = rows.map(r=>({studentId: r.dataset.id, present: r.checked}));
    const idx = state.attendance.findIndex(a=>a.classId===classId && a.date===dateStr);
    if(idx>=0) state.attendance[idx].records = newRec; else state.attendance.push({id: uid('att'), classId, date: dateStr, records: newRec});
    save(); showToast('Attendance saved');
  };
}

// ------- GRADES -------
function renderGrades(){
  const classOptions = state.classes.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
  const subjectOptions = state.subjects.map(s=>`<option value="${s.id}">${s.name}</option>`).join('');
  main.innerHTML = `<section class="card"><div class="header-row"><h2>Grades</h2><div class="controls"><select id="g_class" class="input">${classOptions}</select><select id="g_subject" class="input">${subjectOptions}</select><button id="loadGrades" class="btn primary">Load</button></div></div><div id="gradesList" class="card" style="margin-top:12px"></div></section>`;
  document.getElementById('loadGrades').onclick = ()=> loadGrades(document.getElementById('g_class').value, document.getElementById('g_subject').value);
  loadGrades(document.getElementById('g_class').value, document.getElementById('g_subject').value);
}
function loadGrades(classId, subjectId){
  const wrap = document.getElementById('gradesList');
  const students = state.students.filter(s=>s.classId === classId);
  const role = state.loggedIn.role;
  if(role === 'teacher'){
    const teacher = state.teachers.find(t=>t.id === state.loggedIn.id);
    if(!(teacher && (teacher.subjectIds || []).includes(subjectId))){ wrap.innerHTML = `<div class="empty">You are not assigned to this subject.</div>`; return; }
  }
  wrap.innerHTML = `<h4>Class: ${state.classes.find(c=>c.id===classId)?.name||'-'} — Subject: ${state.subjects.find(s=>s.id===subjectId)?.name||'-'}</h4><table class="table" style="margin-top:8px"><thead><tr><th>Roll</th><th>Name</th><th>Marks</th></tr></thead><tbody>${students.map(s=>{ const g = state.grades.find(x=>x.classId===classId && x.subjectId===subjectId && x.studentId===s.id); return `<tr><td>${s.roll||'-'}</td><td>${s.name}</td><td><input type="number" min="0" max="100" data-id="${s.id}" value="${g?g.marks:''}" /></td></tr>`; }).join('')}</tbody></table><div style="margin-top:8px"><button id="saveGrades" class="btn primary">Save Marks</button></div>`;
  document.getElementById('saveGrades').onclick = ()=> {
    const inputs = Array.from(wrap.querySelectorAll('input[type=number]'));
    inputs.forEach(inp => {
      const sid = inp.dataset.id; const marks = parseFloat(inp.value) || 0;
      const existing = state.grades.find(g=>g.classId===classId && g.subjectId===subjectId && g.studentId===sid);
      if(existing) existing.marks = marks; else state.grades.push({id: uid('g'), classId, subjectId, studentId: sid, marks});
    });
    save(); showToast('Grades saved');
  };
}

// ------- ANNOUNCEMENTS -------
function renderAnnouncements(){
  const role = state.loggedIn.role;
  main.innerHTML = `<section class="card"><div class="header-row"><h2>Announcements</h2>${(role==='admin'||role==='teacher')?'<div class="controls"><button id="addAnn" class="btn primary">+ New</button></div>':''}</div><div class="card" style="margin-top:12px"><table class="table"><thead><tr><th>Date</th><th>Title</th><th>By</th></tr></thead><tbody>${state.announcements.slice().reverse().map(a=>`<tr><td>${new Date(a.date).toLocaleString()}</td><td>${a.title}</td><td>${a.by}</td></tr>`).join('')}</tbody></table></div></section>`;
  if(role==='admin' || role==='teacher'){ document.getElementById('addAnn').onclick = ()=> {
    const modal = document.createElement('div'); modal.className='card'; modal.style.maxWidth='640px';
    modal.innerHTML = `<h3>New Announcement</h3><input id="an_title" class="input" placeholder="Title" /><textarea id="an_body" class="input" rows="4" placeholder="Message"></textarea><div style="margin-top:8px"><button id="saveAn" class="btn primary">Publish</button> <button id="cancelAn" class="btn ghost">Cancel</button></div>`;
    main.prepend(modal);
    document.getElementById('cancelAn').onclick = ()=> modal.remove();
    document.getElementById('saveAn').onclick = ()=> {
      const title = document.getElementById('an_title').value.trim(); const body = document.getElementById('an_body').value.trim();
      if(!title){ alert('Title required'); return; }
      state.announcements.push({id: uid('a'), title, body, date: nowISO(), by: state.loggedIn.name});
      save(); modal.remove(); renderAnnouncements(); showToast('Published');
    };
  }; }
}

// ------- RATINGS (students rate teacher; principal views) -------
function renderRatings(){
  if(state.loggedIn.role !== 'admin'){ main.innerHTML = `<section class="card"><div class="empty">Only Principal can view ratings.</div></section>`; return; }
  const rows = state.ratings.slice().reverse();
  if(rows.length === 0){ main.innerHTML = `<section class="card"><h2>Ratings</h2><div class="empty">No ratings yet</div></section>`; return; }
  main.innerHTML = `<section class="card"><h2>Ratings (Latest)</h2><div class="card" style="margin-top:12px"><table class="table"><thead><tr><th>Date</th><th>Student</th><th>Teacher</th><th>Subject</th><th>Rating</th><th>Comment</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${new Date(r.date).toLocaleString()}</td><td>${state.students.find(s=>s.id===r.studentId)?.name||'-'}</td><td>${state.teachers.find(t=>t.id===r.teacherId)?.name||'-'}</td><td>${state.subjects.find(s=>s.id===r.subjectId)?.name||'-'}</td><td>${r.rating}</td><td>${r.comment||''}</td></tr>`).join('')}</tbody></table></div></section>`;
}

// Student rating form (exposed on student dashboard)
function showRatingForm(studentId){
  const modal = document.createElement('div'); modal.className='card'; modal.style.maxWidth='640px';
  modal.innerHTML = `<h3>Rate your Subject Teacher</h3><div class="form-grid"><select id="rt_subject" class="input">${state.subjects.map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}</select><select id="rt_teacher" class="input">${state.teachers.map(t=>`<option value="${t.id}">${t.name}</option>`).join('')}</select><input id="rt_rating" class="input" type="number" min="1" max="5" placeholder="Rating 1-5" /><textarea id="rt_comment" class="input" rows="3" placeholder="Comment (optional)"></textarea><div class="row" style="margin-top:6px"><button id="saveRt" class="btn primary">Submit</button><button id="cancelRt" class="btn ghost">Cancel</button></div></div>`;
  main.prepend(modal);
  document.getElementById('cancelRt').onclick = ()=> modal.remove();
  document.getElementById('saveRt').onclick = ()=> {
    const subjectId = document.getElementById('rt_subject').value;
    const teacherId = document.getElementById('rt_teacher').value;
    const rating = parseInt(document.getElementById('rt_rating').value) || 0;
    const comment = document.getElementById('rt_comment').value.trim();
    if(rating < 1 || rating > 5){ alert('Enter rating 1-5'); return; }
    state.ratings.push({id: uid('r'), teacherId, subjectId, studentId, rating, comment, date: nowISO()});
    save(); modal.remove(); showToast('Thanks for your feedback');
  };
}

// ------- SETTINGS / IMPORT / EXPORT -------
function renderSettings(){
  if(state.loggedIn.role !== 'admin'){ main.innerHTML = `<section class="card"><div class="empty">Only Principal can access settings</div></section>`; return; }
  main.innerHTML = `<section class="card"><h2>Settings</h2><div class="card" style="margin-top:12px"><div class="controls"><button class="btn ghost" onclick="exportAll()">Export All</button><button class="btn ghost" onclick="importAll()">Import All</button><button class="btn danger" onclick="clearAll()">Clear Data</button></div></div></section>`;
}

function exportJSON(obj, name='export.json'){ const blob = new Blob([JSON.stringify(obj, null, 2)], {type:'application/json'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }
function exportAll(){ exportJSON(state, 'schoolmate-export.json'); showToast('Export started'); }
function importAll(){ const input = document.createElement('input'); input.type='file'; input.accept='application/json'; input.onchange = e => { const f = e.target.files[0]; if(!f) return; const r = new FileReader(); r.onload = ev => { try { const obj = JSON.parse(ev.target.result); if(!confirm('Import will replace current data. Continue?')) return; state = obj; save(); boot(); showToast('Import successful'); } catch(err) { alert('Invalid JSON'); } }; r.readAsText(f); }; input.click(); }
function clearAll(){ if(!confirm('Clear all local data?')) return; localStorage.removeItem(LS); state = defaultState(); save(); boot(); showToast('Cleared'); }

// ------- Helpers & Exposure -------
renderMenu(); renderTopActions(); renderSideProfile();
if(!state.loggedIn) renderLogin(); else navigate('dash');

window.exportAll = exportAll;
window.importAll = importAll;
window.renderLogin = renderLogin;