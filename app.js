/* SchoolMate — frontend-only School Management system (localStorage) */
/* Features: login, dashboard, students/teachers/classes, attendance, grades, announcements, import/export */

const LS = 'schoolmate_v1';

// helpers
const el = q => document.querySelector(q);
const byId = id => document.getElementById(id);
const mount = id => document.getElementById(id);
const uid = (p='id') => p+'_'+Math.random().toString(36).slice(2,9);
const nowISO = () => new Date().toISOString();
const showToast = (t) => {
    const box = document.createElement('div'); box.className = 'toast'; box.innerText = t;
    mount('toasts').appendChild(box);
    setTimeout(()=> box.remove(), 3200);
};

// Restrict page access - redirect to login if not logged in
function requireLogin(){
    if(!state.loggedIn){ renderLogin(); return false; }
    return true;
}

// initial state factory
function defaultState(){
  return {
    users:[
      {id:'u_admin',role:'admin',name:'Principal',email:'principal@school.edu',password:'admin123'},
      {id:'u_t1',role:'teacher',name:'Ms. Priya',email:'priya@school.edu',password:'teach123'},
      {id:'u_s1',role:'student',name:'Aman Singh',email:'aman@school.edu',password:'stud123'}
    ],
    students:[],
    teachers:[],
    classes:[],
    subjects:[],
    attendance:[], // {id, classId, date, records:[{studentId, present}]}
    grades:[], // {id, classId, subjectId, studentId, marks}
    announcements:[],
    loggedIn: null
  };
}

// load & save
let state;
try {
  const raw = localStorage.getItem(LS);
  state = raw ? JSON.parse(raw) : defaultState();
} catch(e) { state = defaultState(); }
function save() { localStorage.setItem(LS, JSON.stringify(state)); }

// seed sample data
(function seed(){
  if(state.students.length === 0){
    state.students = [
      {id: uid('s'),name:'Aman Singh',roll:'S-001',email:'aman@school.edu',classId:'c_10A'},
      {id: uid('s'),name:'Neha Verma',roll:'S-002',email:'neha@school.edu',classId:'c_10A'},
      {id: uid('s'),name:'Kabir Khan',roll:'S-003',email:'kabir@school.edu',classId:'c_10B'}
    ];
  }
  if(state.classes.length === 0){
    state.classes = [
      {id:'c_10A',name:'Class 10A'},
      {id:'c_10B',name:'Class 10B'}
    ];
  }
  if(state.subjects.length === 0){
    state.subjects = [
      {id: uid('sub'), name:'Mathematics'},
      {id: uid('sub'), name:'Science'},
      {id: uid('sub'), name:'English'}
    ];
  }
  if(state.teachers.length === 0){
    state.teachers = [
      {id: uid('t'), name:'Ms. Priya', email:'priya@school.edu', subjectIds: [state.subjects[0].id]},
      {id: uid('t'), name:'Mr. Arjun', email:'arjun@school.edu', subjectIds: [state.subjects[1].id]}
    ];
  }
  save();
})();

// DOM roots
const menuEl = mount('menu');
const sideProfile = mount('sideProfile');
const topActions = mount('topActions');
const main = mount('main');

// render helpers
function renderMenu(){
  const role = state.loggedIn ? state.loggedIn.role : 'guest';
  const items = [
    {id:'dash', label:'Dashboard', show:true},
    {id:'students', label:'Students', show: role !== 'student'},
    {id:'teachers', label:'Teachers', show: role === 'admin' || role === 'teacher'},
    {id:'classes', label:'Classes', show: role !== 'guest'},
    {id:'attendance', label:'Attendance', show: role !== 'student' && role !== 'guest'},
    {id:'grades', label:'Grades', show: role !== 'guest'},
    {id:'announcements', label:'Announcements', show: true},
    {id:'settings', label:'Settings', show: role === 'admin'}
  ];
  menuEl.innerHTML = items.filter(i=>i.show).map(i=>`<div class="mitem" data-id="${i.id}">${i.label}</div>`).join('');
  document.querySelectorAll('.mitem').forEach(it => it.onclick = () => {
    document.querySelectorAll('.mitem').forEach(x=>x.classList.remove('active'));
    it.classList.add('active');
    navigate(it.dataset.id);
  });
  const defaultItem = document.querySelector('.mitem[data-id="dash"]');
  if(defaultItem) { defaultItem.classList.add('active'); }
}

function renderTopActions(){
  topActions.innerHTML = '';
  if(state.loggedIn){
    const name = document.createElement('div'); name.className = 'small'; name.innerText = `${state.loggedIn.name} (${state.loggedIn.role})`;
    const logout = document.createElement('button'); logout.className='btn ghost'; logout.innerText='Logout'; logout.onclick = ()=> { state.loggedIn = null; save(); render(); showToast('Logged out'); };
    topActions.appendChild(name);
    topActions.appendChild(logout);
  } else {
    const loginBtn = document.createElement('button'); loginBtn.className='btn primary'; loginBtn.innerText='Login'; loginBtn.onclick = ()=> renderLogin();
    topActions.appendChild(loginBtn);
  }
}

function renderSideProfile(){
  if(state.loggedIn){
    sideProfile.innerHTML = `<div class="avatar">${state.loggedIn.name.charAt(0)}</div><div class="name">${state.loggedIn.name}</div><div class="small">${state.loggedIn.email}</div>`;
  } else {
    sideProfile.innerHTML = `<div class="avatar">SM</div><div class="name">SchoolMate</div><div class="small">Sign in to manage</div>`;
  }
}

// navigation
function navigate(page){
  switch(page){
    case 'dash': renderDashboard(); break;
    case 'students': renderStudents(); break;
    case 'teachers': renderTeachers(); break;
    case 'classes': renderClasses(); break;
    case 'attendance': renderAttendance(); break;
    case 'grades': renderGrades(); break;
    case 'announcements': renderAnnouncements(); break;
    case 'settings': renderSettings(); break;
    default: renderDashboard();
  }
}

// render whole app
function render(){
  renderMenu();
  renderTopActions();
  renderSideProfile();
  navigate('dash');
}

// Login page
function renderLogin(){
  const tpl = document.getElementById('login-template').content.cloneNode(true);
  main.innerHTML = '';
  main.appendChild(tpl);
  document.getElementById('li_btn').onclick = () => {
    const e = document.getElementById('li_email').value.trim();
    const p = document.getElementById('li_pass').value;
    if(!e || !p){ showToast('Enter email & password'); return; }
    const user = state.users.find(u => u.email === e && u.password === p);
    if(!user){ showToast('Invalid credentials'); return; }
    state.loggedIn = user; save(); render(); showToast('Welcome, ' + user.name);
  };
  document.getElementById('demoBtn').onclick = ()=> {
    document.getElementById('li_email').value = 'principal@school.edu';
    document.getElementById('li_pass').value = 'admin123';
  };
}

// Dashboard
function renderDashboard(){
  const totalStudents = state.students.length;
  const totalTeachers = state.teachers.length;
  const totalClasses = state.classes.length;
  const totalAnnouncements = state.announcements.length;
  const recent = state.announcements.slice().reverse().slice(0,5);

  main.innerHTML = `
    <section class="card">
      <div class="header-row">
        <h2>Dashboard</h2>
        <div class="controls">
          <button class="btn ghost" onclick="exportAll()">Export</button>
          <button class="btn ghost" onclick="importAll()">Import</button>
        </div>
      </div>
      <div class="kpis" style="margin-top:12px">
        <div class="kpi"><h4>Students</h4><p>${totalStudents}</p></div>
        <div class="kpi"><h4>Teachers</h4><p>${totalTeachers}</p></div>
        <div class="kpi"><h4>Classes</h4><p>${totalClasses}</p></div>
        <div class="kpi"><h4>Announcements</h4><p>${totalAnnouncements}</p></div>
      </div>
    </section>

    <section class="card">
      <h3>Recent Announcements</h3>
      ${recent.length ? `<ul>${recent.map(a=>`<li>${new Date(a.date).toLocaleString()} — ${a.title}</li>`).join('')}</ul>` : '<div class="empty">No announcements yet</div>'}
    </section>
  `;
}

// Students page
function renderStudents(){
  main.innerHTML = `
    <section class="card">
      <div class="header-row"><h2>Students</h2>
        <div class="controls">
          <input id="s_search" class="input" placeholder="Search by name or roll" />
          <button id="addStudent" class="btn primary"><span class="ico">+</span> Add Student</button>
          <button class="btn ghost" onclick="exportJSON(state.students,'students.json')">Export</button>
        </div>
      </div>

      <div class="card" style="margin-top:12px">
        <table class="table" id="studentsTable">
          <thead><tr><th>Roll</th><th>Name</th><th>Class</th><th>Email</th><th>Actions</th></tr></thead>
          <tbody></tbody>
        </table>
      </div>
    </section>
  `;
  const tbody = document.querySelector('#studentsTable tbody');
  function populate(filter=''){
    const rows = state.students.filter(s => (s.name + ' ' + s.roll).toLowerCase().includes(filter.toLowerCase()));
    tbody.innerHTML = rows.map(s => {
      const cls = state.classes.find(c=>c.id===s.classId)?.name || '-';
      return `<tr>
        <td>${s.roll || '-'}</td><td>${s.name}</td><td>${cls}</td><td>${s.email||'-'}</td>
        <td>
          <button class="btn ghost" data-act="edit" data-id="${s.id}">Edit</button>
          <button class="btn danger" data-act="del" data-id="${s.id}">Delete</button>
        </td>
      </tr>`;
    }).join('');
    attachStudentActions();
  }
  function attachStudentActions(){
    document.querySelectorAll('button[data-act="edit"]').forEach(b => b.onclick = e => {
      const id = e.target.dataset.id; showStudentForm(state.students.find(s=>s.id===id));
    });
    document.querySelectorAll('button[data-act="del"]').forEach(b => b.onclick = e => {
      const id = e.target.dataset.id;
      if(confirm('Delete student?')) {
        state.students = state.students.filter(s => s.id !== id);
        save(); populate(document.getElementById('s_search').value||''); showToast('Student deleted');
      }
    });
  }

  populate();
  document.getElementById('s_search').oninput = (e) => populate(e.target.value);
  document.getElementById('addStudent').onclick = () => showStudentForm();
}

function showStudentForm(student){
  const isEdit = !!student;
  const modal = document.createElement('div'); modal.className='card';
  modal.style.maxWidth='640px';
  modal.innerHTML = `
    <h3>${isEdit?'Edit':'Add'} Student</h3>
    <div class="form-grid">
      <input id="f_roll" class="input" placeholder="Roll" />
      <input id="f_name" class="input" placeholder="Name" />
      <select id="f_class" class="input">${state.classes.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}</select>
      <input id="f_email" class="input" placeholder="Email" />
      <div></div>
      <div class="row" style="margin-top:6px">
        <button id="saveStu" class="btn primary">Save</button>
        <button id="cancelStu" class="btn ghost">Cancel</button>
      </div>
    </div>
  `;
  main.prepend(modal);
  if(isEdit){
    document.getElementById('f_roll').value = student.roll || '';
    document.getElementById('f_name').value = student.name;
    document.getElementById('f_class').value = student.classId;
    document.getElementById('f_email').value = student.email || '';
  }
  document.getElementById('cancelStu').onclick = ()=> modal.remove();
  document.getElementById('saveStu').onclick = ()=> {
    const roll = document.getElementById('f_roll').value.trim();
    const name = document.getElementById('f_name').value.trim();
    const classId = document.getElementById('f_class').value;
    const email = document.getElementById('f_email').value.trim();
    if(!name){ alert('Name required'); return; }
    if(isEdit){
      Object.assign(student, {roll, name, classId, email});
    } else {
      state.students.push({id:uid('s'), roll, name, classId, email});
    }
    save(); modal.remove(); renderStudents(); showToast('Saved');
  };
}

// Teachers page
function renderTeachers(){
  if(!(state.loggedIn && (state.loggedIn.role === 'admin' || state.loggedIn.role === 'teacher'))){
    main.innerHTML = `<section class="card"><div class="empty">You don't have permission to view teachers.</div></section>`; return;
  }
  main.innerHTML = `
    <section class="card">
      <div class="header-row"><h2>Teachers</h2>
        <div class="controls">
          <button id="addTeacher" class="btn primary"><span class="ico">+</span> Add</button>
          <button class="btn ghost" onclick="exportJSON(state.teachers,'teachers.json')">Export</button>
        </div>
      </div>
      <div class="card" style="margin-top:12px">
        <table class="table" id="teachersTable">
          <thead><tr><th>Name</th><th>Email</th><th>Subjects</th><th>Actions</th></tr></thead>
          <tbody></tbody>
        </table>
      </div>
    </section>
  `;
  const tbody = document.querySelector('#teachersTable tbody');
  function populate(){
    tbody.innerHTML = state.teachers.map(t => {
      const subs = (t.subjectIds || []).map(id => state.subjects.find(s=>s.id===id)?.name).filter(Boolean).join(', ');
      return `<tr><td>${t.name}</td><td>${t.email||'-'}</td><td>${subs||'-'}</td>
        <td>
          <button class="btn ghost" data-act="edit" data-id="${t.id}">Edit</button>
          <button class="btn danger" data-act="del" data-id="${t.id}">Delete</button>
        </td></tr>`;
    }).join('');
    attachActions();
  }
  function attachActions(){
    document.querySelectorAll('button[data-act="edit"]').forEach(b=> b.onclick = e => {
      const t = state.teachers.find(x=>x.id===e.target.dataset.id);
      showTeacherForm(t);
    });
    document.querySelectorAll('button[data-act="del"]').forEach(b=> b.onclick = e => {
      if(confirm('Delete teacher?')) {
        state.teachers = state.teachers.filter(x=>x.id!==e.target.dataset.id); save(); populate(); showToast('Deleted');
      }
    });
  }
  populate();
  document.getElementById('addTeacher').onclick = ()=> showTeacherForm();
}

function showTeacherForm(teacher){
  const isEdit = !!teacher;
  const modal = document.createElement('div'); modal.className='card';
  modal.style.maxWidth='640px';
  modal.innerHTML = `
    <h3>${isEdit?'Edit':'Add'} Teacher</h3>
    <div class="form-grid">
      <input id="t_name" class="input" placeholder="Name" />
      <input id="t_email" class="input" placeholder="Email" />
      <select id="t_subs" class="input" multiple>${state.subjects.map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}</select>
      <div></div>
      <div class="row" style="margin-top:6px">
        <button id="saveTeach" class="btn primary">Save</button>
        <button id="cancelTeach" class="btn ghost">Cancel</button>
      </div>
    </div>
  `;
  main.prepend(modal);
  if(isEdit){
    document.getElementById('t_name').value = teacher.name;
    document.getElementById('t_email').value = teacher.email || '';
    Array.from(document.getElementById('t_subs').options).forEach(o => { if((teacher.subjectIds||[]).includes(o.value)) o.selected = true; });
  }
  document.getElementById('cancelTeach').onclick = ()=> modal.remove();
  document.getElementById('saveTeach').onclick = ()=> {
    const name = document.getElementById('t_name').value.trim();
    const email = document.getElementById('t_email').value.trim();
    const subs = Array.from(document.getElementById('t_subs').selectedOptions).map(o=>o.value);
    if(!name){ alert('Name required'); return; }
    if(isEdit){ Object.assign(teacher, {name, email, subjectIds: subs}); }
    else { state.teachers.push({id: uid('t'), name, email, subjectIds: subs}); }
    save(); modal.remove(); renderTeachers(); showToast('Saved');
  };
}

// Classes page
function renderClasses(){
  main.innerHTML = `
    <section class="card">
      <div class="header-row"><h2>Classes</h2>
        <div class="controls">
          <button id="addClass" class="btn primary">+ Add Class</button>
        </div>
      </div>
      <div class="card" style="margin-top:12px">
        <table class="table" id="classesTable">
          <thead><tr><th>Class</th><th>Actions</th></tr></thead>
          <tbody></tbody>
        </table>
      </div>
    </section>
  `;
  const tbody = document.querySelector('#classesTable tbody');
  function populate(){
    tbody.innerHTML = state.classes.map(c => `<tr><td>${c.name}</td><td>
      <button class="btn ghost" data-act="edit" data-id="${c.id}">Edit</button>
      <button class="btn danger" data-act="del" data-id="${c.id}">Delete</button>
    </td></tr>`).join('');
    attach();
  }
  function attach(){
    document.querySelectorAll('button[data-act="edit"]').forEach(b=>b.onclick = e => {
      const c = state.classes.find(x=>x.id===e.target.dataset.id); showClassForm(c);
    });
    document.querySelectorAll('button[data-act="del"]').forEach(b=>b.onclick = e => {
      if(confirm('Delete class?')){ state.classes = state.classes.filter(x=>x.id!==e.target.dataset.id); save(); populate(); showToast('Deleted'); }
    });
  }
  populate();
  document.getElementById('addClass').onclick = ()=> showClassForm();
}
function showClassForm(c){
  const isEdit = !!c;
  const modal = document.createElement('div'); modal.className='card'; modal.style.maxWidth='640px';
  modal.innerHTML = `<h3>${isEdit?'Edit':'Add'} Class</h3>
    <div class="form-grid">
      <input id="cl_name" class="input" placeholder="Class name (e.g. Class 10A)" />
      <div></div><div></div>
      <div class="row" style="margin-top:6px">
        <button id="saveCl" class="btn primary">Save</button>
        <button id="cancelCl" class="btn ghost">Cancel</button>
      </div>
    </div>`;
  main.prepend(modal);
  if(isEdit) document.getElementById('cl_name').value = c.name;
  document.getElementById('cancelCl').onclick = ()=> modal.remove();
  document.getElementById('saveCl').onclick = ()=> {
    const name = document.getElementById('cl_name').value.trim();
    if(!name){ alert('Name required'); return; }
    if(isEdit) c.name = name; else state.classes.push({id: uid('c'), name});
    save(); modal.remove(); renderClasses(); showToast('Saved');
  };
}

// Attendance page
function renderAttendance(){
  if(!(state.loggedIn && (state.loggedIn.role === 'admin' || state.loggedIn.role === 'teacher'))) {
    main.innerHTML = `<section class="card"><div class="empty">You don't have permission to mark attendance.</div></section>`; return;
  }
  main.innerHTML = `
    <section class="card">
      <div class="header-row"><h2>Attendance</h2>
        <div class="controls">
          <select id="att_class" class="input">${state.classes.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}</select>
          <input id="att_date" class="input" type="date" value="${new Date().toISOString().slice(0,10)}" />
          <button id="loadAtt" class="btn primary">Load</button>
        </div>
      </div>
      <div id="attList" class="card" style="margin-top:12px"></div>
    </section>
  `;
  document.getElementById('loadAtt').onclick = () => loadAttendance(document.getElementById('att_class').value, document.getElementById('att_date').value);
  loadAttendance(document.getElementById('att_class').value, document.getElementById('att_date').value);
}
function loadAttendance(classId, dateStr){
  const listWrap = document.getElementById('attList');
  const students = state.students.filter(s=>s.classId===classId);
  const att = state.attendance.find(a=>a.classId===classId && a.date===dateStr);
  let records = att ? att.records : students.map(s=>({studentId:s.id, present:true}));
  listWrap.innerHTML = `
    <h4>Class: ${state.classes.find(c=>c.id===classId)?.name || '-'} — Date: ${dateStr}</h4>
    <div style="margin-top:8px">
      <button id="saveAtt" class="btn primary">Save Attendance</button>
    </div>
    <table class="table" style="margin-top:8px">
      <thead><tr><th>Roll</th><th>Name</th><th>Present</th></tr></thead>
      <tbody>
        ${students.map(s => {
          const rec = records.find(r=>r.studentId===s.id);
          return `<tr>
            <td>${s.roll||'-'}</td><td>${s.name}</td>
            <td><input type="checkbox" data-id="${s.id}" ${rec && rec.present ? 'checked' : ''} /></td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  `;
  document.getElementById('saveAtt').onclick = () => {
    const rows = Array.from(listWrap.querySelectorAll('input[type=checkbox]'));
    const newRec = rows.map(r => ({studentId: r.dataset.id, present: r.checked}));
    const existingIndex = state.attendance.findIndex(a=>a.classId===classId && a.date===dateStr);
    if(existingIndex>=0) state.attendance[existingIndex].records = newRec;
    else state.attendance.push({id: uid('att'), classId, date: dateStr, records: newRec});
    save(); showToast('Attendance saved');
  };
}

// Grades page
function renderGrades(){
  main.innerHTML = `
    <section class="card">
      <div class="header-row"><h2>Grades</h2>
        <div class="controls">
          <select id="g_class" class="input">${state.classes.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}</select>
          <select id="g_subject" class="input">${state.subjects.map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}</select>
          <button id="loadGrades" class="btn primary">Load</button>
        </div>
      </div>
      <div id="gradesList" class="card" style="margin-top:12px"></div>
    </section>
  `;
  document.getElementById('loadGrades').onclick = ()=> loadGrades(document.getElementById('g_class').value, document.getElementById('g_subject').value);
  loadGrades(document.getElementById('g_class').value, document.getElementById('g_subject').value);
}
function loadGrades(classId, subjectId){
  const wrap = document.getElementById('gradesList');
  const students = state.students.filter(s=>s.classId===classId);
  wrap.innerHTML = `
    <h4>Class: ${state.classes.find(c=>c.id===classId)?.name || '-'} — Subject: ${state.subjects.find(ss=>ss.id===subjectId)?.name || '-'}</h4>
    <table class="table" style="margin-top:8px">
      <thead><tr><th>Roll</th><th>Name</th><th>Marks</th></tr></thead>
      <tbody>
        ${students.map(s => {
          const g = state.grades.find(x=>x.classId===classId && x.subjectId===subjectId && x.studentId===s.id);
          return `<tr>
            <td>${s.roll||'-'}</td><td>${s.name}</td>
            <td><input type="number" min="0" max="100" data-id="${s.id}" value="${g?g.marks:''}" /></td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
    <div style="margin-top:8px"><button id="saveGrades" class="btn primary">Save Marks</button></div>
  `;
  document.getElementById('saveGrades').onclick = () => {
    const inputs = Array.from(wrap.querySelectorAll('input[type=number]'));
    inputs.forEach(inp => {
      const studentId = inp.dataset.id;
      const marks = parseFloat(inp.value) || 0;
      const existing = state.grades.find(g => g.classId===classId && g.subjectId===subjectId && g.studentId===studentId);
      if(existing) existing.marks = marks; else state.grades.push({id: uid('g'), classId, subjectId, studentId, marks});
    });
    save(); showToast('Grades saved');
  };
}

// Announcements
function renderAnnouncements(){
  main.innerHTML = `
    <section class="card">
      <div class="header-row"><h2>Announcements</h2>
        <div class="controls">
          <button id="addAnn" class="btn primary">+ New</button>
        </div>
      </div>
      <div class="card" style="margin-top:12px">
        <table class="table" id="annsTable">
          <thead><tr><th>Date</th><th>Title</th><th>Body</th></tr></thead>
          <tbody>${state.announcements.slice().reverse().map(a=>`<tr><td>${new Date(a.date).toLocaleString()}</td><td>${a.title}</td><td>${a.body}</td></tr>`).join('')}</tbody>
        </table>
      </div>
    </section>
  `;
  document.getElementById('addAnn').onclick = () => {
    const modal = document.createElement('div'); modal.className='card'; modal.style.maxWidth='640px';
    modal.innerHTML = `<h3>New Announcement</h3>
      <input id="an_title" class="input" placeholder="Title" />
      <textarea id="an_body" class="input" placeholder="Message" rows="4"></textarea>
      <div style="margin-top:8px"><button id="saveAn" class="btn primary">Publish</button> <button id="cancelAn" class="btn ghost">Cancel</button></div>`;
    main.prepend(modal);
    document.getElementById('cancelAn').onclick = ()=> modal.remove();
    document.getElementById('saveAn').onclick = ()=> {
      const title = document.getElementById('an_title').value.trim();
      const body = document.getElementById('an_body').value.trim();
      if(!title) { alert('Title required'); return; }
      state.announcements.push({id: uid('a'), title, body, date: nowISO()});
      save(); modal.remove(); renderAnnouncements(); showToast('Announcement published');
    };
  };
}

// Settings: import/export/reset
function renderSettings(){
  main.innerHTML = `
    <section class="card">
      <h2>Settings & Data</h2>
      <div class="card">
        <h4>Export / Import</h4>
        <div class="controls">
          <button class="btn ghost" onclick="exportAll()">Export Full Data</button>
          <button class="btn ghost" onclick="importAll()">Import Full Data</button>
          <button class="btn danger" onclick="clearAll()">Clear Local Data</button>
        </div>
        <p class="small">Export creates a JSON file of full application state. Import will replace current data.</p>
      </div>
    </section>
  `;
}

function exportJSON(obj, name='export.json'){
  const blob = new Blob([JSON.stringify(obj, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

function exportAll(){
  exportJSON(state, 'schoolmate-full-export.json');
  showToast('Export started');
}

function importAll(){
  const input = document.createElement('input'); input.type='file'; input.accept='application/json';
  input.onchange = e => {
    const file = e.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const obj = JSON.parse(ev.target.result);
        if(!obj) throw new Error('Invalid file');
        if(!confirm('Import will replace current data. Continue?')) return;
        state = obj; save(); render(); showToast('Import successful');
      } catch(err) { alert('Invalid JSON file'); }
    };
    reader.readAsText(file);
  };
  input.click();
}

function clearAll(){
  if(!confirm('Clear all local data?')) return;
  localStorage.removeItem(LS); state = defaultState(); save(); render(); showToast('Cleared');
}

// initial render & auto-login principal for quick demo (not automatic)
render();

// Expose some functions for HTML inline usage (export/import)
window.exportAll = exportAll;
window.importAll = importAll;
window.exportJSON = exportJSON;
window.renderLogin = renderLogin;
window.clearAll = clearAll;
