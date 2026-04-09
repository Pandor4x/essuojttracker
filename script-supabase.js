// Supabase Configuration
const SUPABASE_URL = "https://oliggyodywpajiwzsoft.supabase.co";
const SUPABASE_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9saWdneW9keXdwYWppd3pzb2Z0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MjY1ODEsImV4cCI6MjA5MTMwMjU4MX0.tE5s7Q-NWd8Cz4jlOIOdr6Z68v8n8HNp9jHnur1VPLk";

// Initialize Supabase client
const { createClient } = window.supabase;
const supabase = createClient(SUPABASE_URL, SUPABASE_API_KEY);

let users = [];
let logs = [];
let currentUser = null;

// Load data on page load
async function loadData(){
  await loadUsers();
  await loadLogs();
  const stored = localStorage.getItem('currentUser');
  if(stored) currentUser = JSON.parse(stored);
}

async function loadUsers(){
  const { data, error } = await supabase.from('users').select('*');
  if(error) {
    console.error('Error loading users:', error);
    users = [];
  } else {
    users = data || [];
  }
}

async function loadLogs(){
  const { data, error } = await supabase.from('logs').select('*');
  if(error) {
    console.error('Error loading logs:', error);
    logs = [];
  } else {
    logs = data || [];
  }
}

async function save(){
  // Data is saved directly to Supabase, no need for localStorage
}

async function register(){
  let studentNumber = document.getElementById('studentNumber').value;
  let name = document.getElementById('name').value;
  let email = document.getElementById('email').value;
  let password = document.getElementById('password').value;
  let location = document.getElementById('location').value;
  let file = document.getElementById('picture').files[0];

  if(!studentNumber || !name || !email || !password || !location) return alert('Please fill all fields');
  if(!/^(\d{2}-\d{5}|ad-minss)$/.test(studentNumber)) return alert('Student number must be in format XX-XXXXX (or ad-minss for admin)');
  
  // Check if user exists
  const { data: existing } = await supabase.from('users').select('id').eq('student_number', studentNumber).single();
  if(existing) return alert('Student number already exists');

  let role = studentNumber === 'ad-minss' ? 'admin' : 'student';
  let approved = role === 'admin' ? true : false;
  let picture = null;

  if(file){
    const reader = new FileReader();
    reader.onload = async function(){
      picture = reader.result;
      
      const { data, error } = await supabase.from('users').insert([{
        student_number: studentNumber,
        name: name,
        email: email,
        password: password,
        role: role,
        picture: picture,
        approved: approved,
        registration_date: new Date().toLocaleDateString(),
        location: location,
        is_active: false
      }]);

      if(error) {
        console.error('Error registering user:', error);
        alert('Registration failed: ' + error.message);
      } else {
        alert('Registered successfully! Waiting for admin approval.');
        window.location.href = 'login.html';
      }
    }
    reader.readAsDataURL(file);
  } else {
    const { data, error } = await supabase.from('users').insert([{
      student_number: studentNumber,
      name: name,
      email: email,
      password: password,
      role: role,
      picture: null,
      approved: approved,
      registration_date: new Date().toLocaleDateString(),
      location: location,
      is_active: false
    }]);

    if(error) {
      console.error('Error registering user:', error);
      alert('Registration failed: ' + error.message);
    } else {
      alert('Registered successfully! Waiting for admin approval.');
      window.location.href = 'login.html';
    }
  }
}

async function login(){
  let studentNumber = document.getElementById('studentNumber').value;
  let password = document.getElementById('password').value;

  const { data, error } = await supabase.from('users').select('*').eq('student_number', studentNumber).eq('password', password).single();
  
  if(error || !data) return alert('Invalid login');
  
  let user = data;
  if(user.role === 'student' && !user.approved) return alert('Your account is pending admin approval');

  currentUser = user;
  localStorage.setItem('currentUser', JSON.stringify(currentUser));
  
  await supabase.from('users').update({ is_active: true, last_active: new Date().toISOString() }).eq('id', user.id);

  if(user.role === 'admin') window.location.href = 'admindashboard.html';
  else window.location.href = 'studentdashboard.html';
}

async function logout(){
  if(currentUser){
    await supabase.from('users').update({ is_active: false }).eq('id', currentUser.id);
  }
  currentUser = null;
  localStorage.removeItem('currentUser');
  window.location.href = 'login.html';
}

function showDashboard(){
  let displayName = currentUser.name || (currentUser.role === 'admin' ? 'ADMIN' : 'STUDENT');
  let displayText = displayName;
  if(currentUser.student_number) displayText += ` (${currentUser.student_number})`;
  document.getElementById('role').innerText = displayText;
  let picElement = document.getElementById('profilePic');
  if(currentUser.picture){
    picElement.src = currentUser.picture;
    picElement.style.display = 'inline-block';
  } else {
    picElement.style.display = 'none';
  }
}

async function addLog(){
  let date = document.getElementById('date').value;
  let task = document.getElementById('task').value;
  let hours = document.getElementById('hours').value;
  let file = document.getElementById('image').files[0];

  if(!date || !task || !hours) return alert('Please fill all fields');

  if(file){
    let reader = new FileReader();
    reader.onload = async function(){
      const { data, error } = await supabase.from('logs').insert([{
        user_id: currentUser.id,
        email: currentUser.email,
        date: date,
        task: task,
        hours: parseInt(hours),
        proof: reader.result,
        status: 'Pending'
      }]);

      if(error) {
        console.error('Error adding log:', error);
        alert('Failed to add log: ' + error.message);
      } else {
        await loadLogs();
        renderLogs();
        document.getElementById('date').value = '';
        document.getElementById('task').value = '';
        document.getElementById('hours').value = '';
        document.getElementById('image').value = '';
      }
    }
    reader.readAsDataURL(file);
  } else {
    const { data, error } = await supabase.from('logs').insert([{
      user_id: currentUser.id,
      email: currentUser.email,
      date: date,
      task: task,
      hours: parseInt(hours),
      proof: null,
      status: 'Pending'
    }]);

    if(error) {
      console.error('Error adding log:', error);
      alert('Failed to add log: ' + error.message);
    } else {
      await loadLogs();
      renderLogs();
      document.getElementById('date').value = '';
      document.getElementById('task').value = '';
      document.getElementById('hours').value = '';
      document.getElementById('image').value = '';
    }
  }
}

function renderLogs(){
  let table = document.getElementById('logs');
  table.innerHTML='';
  let total=0;
  let isAdmin = window.location.pathname.includes('admindashboard.html');

  logs.filter(l=> currentUser.role==='admin' || l.email===currentUser.email)
  .forEach((l,i)=>{
    if(!isAdmin && l.status === 'Approved') total+=Number(l.hours);

    let studentName = '';
    if(isAdmin){
      let user = users.find(u=>u.email===l.email);
      studentName = user ? (user.name || l.email) : l.email;
      if(user && user.student_number) studentName += ` (${user.student_number})`;
    }

    let row = '<tr>';
    if(isAdmin) row += `<td>${user && user.picture ? `<img src="${user.picture}" style="width:30px; height:30px; border-radius:50%; margin-right:10px;">` : ''}${studentName}</td>`;
    row += `<td>${l.date}</td>
    <td>${l.task}</td>
    <td>${l.hours}</td>
    <td>${l.proof?'<img src="'+l.proof+'">':''}</td>
    <td>${l.status}</td>`;
    if(isAdmin && l.status === 'Pending'){
      row += `<td><button onclick="approveLog('${l.id}')" style="background:#22c55e; margin-right:5px;">Approve</button><button onclick="rejectLog('${l.id}')" style="background:#ef4444;">Reject</button></td>`;
    } else if(!isAdmin && l.status === 'Pending'){
      row += `<td><button onclick="deleteLog('${l.id}')" style="background:#ef4444;">Delete</button></td>`;
    } else {
      row += `<td></td>`;
    }
    row += '</tr>';
    table.innerHTML += row;
  });

  // progress only for students
  if(!isAdmin){
    let percent = (total/500)*100;
    document.getElementById('bar').style.width = percent+'%';
    document.getElementById('total').innerText = total;
  }
}

async function renderPendingUsers(){
  let table = document.getElementById('pendingUsers');
  if(!table) return;
  table.innerHTML='<tr><th>Student Number</th><th>Name</th><th>Email</th><th>Picture</th><th>Registration Date</th><th>Action</th></tr>';

  users.filter(u=>u.role==='student' && !u.approved).forEach((u,i)=>{
    let row = `<tr>
    <td>${u.student_number}</td>
    <td>${u.name}</td>
    <td>${u.email}</td>
    <td>${u.picture?'<img src="'+u.picture+'" style="width:50px; height:50px; border-radius:50%;">':'No Picture'}</td>
    <td>${u.registration_date}</td>
    <td>
      <button onclick="approveUser('${u.student_number}')" style="background:#22c55e; margin-right:5px;">Approve</button>
      <button onclick="rejectUser('${u.student_number}')" style="background:#ef4444;">Reject</button>
    </td>
    </tr>`;
    table.innerHTML += row;
  });
}

async function approveUser(studentNumber){
  const { error } = await supabase.from('users').update({ approved: true }).eq('student_number', studentNumber);
  
  if(error) {
    console.error('Error approving user:', error);
    alert('Failed to approve user');
  } else {
    await loadUsers();
    alert('User approved!');
    await renderPendingUsers();
  }
}

async function rejectUser(studentNumber){
  if(confirm('Are you sure you want to reject this user registration? This will permanently remove their account.')){
    const { error } = await supabase.from('users').delete().eq('student_number', studentNumber);
    
    if(error) {
      console.error('Error rejecting user:', error);
      alert('Failed to reject user');
    } else {
      await loadUsers();
      alert('User registration rejected and removed!');
      await renderPendingUsers();
    }
  }
}

async function renderApprovedStudents(){
  let table = document.getElementById('approvedStudents');
  if(!table) return;
  table.innerHTML = '';
  users.filter(u=>u.role==='student' && u.approved).forEach(u=>{
    let row = `<tr>
    <td>${u.picture ? `<img src="${u.picture}" style="width:30px; height:30px; border-radius:50%; margin-right:10px;">` : ''}${u.name}</td>
    <td>${u.student_number}</td>
    <td>${u.email}</td>
    <td>${u.location}</td>
    <td><button onclick="removeStudentAccount('${u.student_number}')" style="background:#ef4444; color:white; border:none; padding:6px 10px; border-radius:6px; cursor:pointer;">Remove</button></td>
    </tr>`;
    table.innerHTML += row;
  });
}

async function removeStudentAccount(studentNumber){
  if(!confirm('Remove this student account and all related logs?')) return;
  
  const { data: user, error: userError } = await supabase.from('users').select('email').eq('student_number', studentNumber).eq('role', 'student').single();
  
  if(userError) return alert('Student not found.');
  
  await supabase.from('logs').delete().eq('email', user.email);
  await supabase.from('users').delete().eq('student_number', studentNumber).eq('role', 'student');
  
  await loadUsers();
  await loadLogs();
  await updateAdminOverview();
  if(document.getElementById('approvedStudents')) await renderApprovedStudents();
  if(document.getElementById('logs')) renderLogs();
  alert('Student account removed.');
}

async function approveLog(logId){
  const { error } = await supabase.from('logs').update({ status: 'Approved' }).eq('id', logId);
  
  if(error) {
    console.error('Error approving log:', error);
  } else {
    await loadLogs();
    renderLogs();
    alert('Log approved!');
  }
}

async function rejectLog(logId){
  const { error } = await supabase.from('logs').delete().eq('id', logId);
  
  if(error) {
    console.error('Error rejecting log:', error);
  } else {
    await loadLogs();
    renderLogs();
    alert('Log rejected and removed!');
  }
}

async function deleteLog(logId){
  if(confirm('Delete this log?')){
    const { error } = await supabase.from('logs').delete().eq('id', logId);
    
    if(error) {
      console.error('Error deleting log:', error);
    } else {
      await loadLogs();
      renderLogs();
    }
  }
}

async function renderLocationMonitoring(){
  let table = document.getElementById('locationTable');
  if(!table) return;

  let isProfileView = window.profileView || false;
  let header = document.getElementById('tableHeader');
  if(header){
    header.innerHTML = isProfileView ? '<tr><th>Student Name</th><th>Student ID</th><th>Location</th><th>Total Hours</th><th>Profile</th></tr>' : '<tr><th>Student Name</th><th>Student ID</th><th>Location</th><th>Status</th><th>Last Active</th></tr>';
  }

  table.innerHTML = isProfileView ? '<tr><th>Student Name</th><th>Student ID</th><th>Location</th><th>Total Hours</th><th>Profile</th></tr>' : '<tr><th>Student Name</th><th>Student ID</th><th>Location</th><th>Status</th><th>Last Active</th></tr>';

  let filterValue = document.getElementById('filterLocation') ? document.getElementById('filterLocation').value : '';
  let filteredUsers = users.filter(u=>u.role==='student' && u.approved);

  if(filterValue){
    filteredUsers = filteredUsers.filter(u=>u.location === filterValue);
  }

  filteredUsers.forEach((u)=>{
    if(isProfileView){
      let totalHours = logs.filter(l=>l.email === u.email && l.status === 'Approved').reduce((sum, l)=>sum + Number(l.hours), 0);
      let row = `<tr>
      <td><a href="#" onclick="showStudentProfile('${u.email}')" style="color:#3b82f6; text-decoration:none;">${u.picture ? `<img src="${u.picture}" style="width:30px; height:30px; border-radius:50%; margin-right:10px;">` : ''}${u.name}</a></td>
      <td>${u.student_number}</td>
      <td>${u.location}</td>
      <td>${totalHours}</td>
      <td><button onclick="showStudentProfile('${u.email}')" style="background:#3b82f6; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">View Profile</button></td>
      </tr>`;
      table.innerHTML += row;
    } else {
      let statusIndicator = u.is_active ? '<span style="color:#22c55e; font-weight:bold;">● ACTIVE</span>' : '<span style="color:#ef4444;">● Offline</span>';
      let row = `<tr>
      <td><a href="#" onclick="showStudentProfile('${u.email}')" style="color:#3b82f6; text-decoration:none;">${u.picture ? `<img src="${u.picture}" style="width:30px; height:30px; border-radius:50%; margin-right:10px;">` : ''}${u.name}</a></td>
      <td>${u.student_number}</td>
      <td>${u.location}</td>
      <td>${statusIndicator}</td>
      <td>${u.last_active || 'N/A'}</td>
      </tr>`;
      table.innerHTML += row;
    }
  });
}

function showStudentProfile(email){
  let user = users.find(u=>u.email === email);
  if(!user) return;

  let studentLogs = logs.filter(l=>l.email === email);
  let totalHours = studentLogs.filter(l=>l.status === 'Approved').reduce((sum, l)=>sum + Number(l.hours), 0);
  let pendingHours = studentLogs.filter(l=>l.status === 'Pending').reduce((sum, l)=>sum + Number(l.hours), 0);

  let historyRows = studentLogs.length ? studentLogs.map(l=>`
    <tr>
      <td style="border:1px solid #ddd; padding:8px;">${l.date}</td>
      <td style="border:1px solid #ddd; padding:8px;">${l.task}</td>
      <td style="border:1px solid #ddd; padding:8px;">${l.hours}</td>
      <td style="border:1px solid #ddd; padding:8px;">${l.status}</td>
      <td style="border:1px solid #ddd; padding:8px;">${l.proof ? `<a href="#" onclick="showFullProof('${l.proof}')" style="display:inline-block;">` + `<img src="${l.proof}" style="max-width:100px; cursor:pointer; border-radius:6px;">` + `</a>` : 'No proof'}</td>
    </tr>
  `).join('') : `
    <tr>
      <td colspan="5" style="padding:16px; text-align:center; color:#555;">No log history available.</td>
    </tr>
  `;

  let profileHTML = `
    <div id="profileModal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.75); z-index:2000; display:flex; align-items:center; justify-content:center; padding:20px;">
      <div style="background:#fff; color:#111; width:100%; max-width:760px; max-height:90%; overflow:auto; border-radius:16px; box-shadow:0 24px 60px rgba(0,0,0,0.35); padding:24px; position:relative;">
        <button onclick="closeProfileModal()" style="position:absolute; top:16px; right:16px; width:32px; height:32px; border:none; border-radius:50%; background:#ef4444; color:#fff; cursor:pointer; font-weight:bold;">×</button>
        <h2 style="margin-top:0; margin-bottom:18px; display:inline-block;">Student Profile</h2>
        <button onclick="downloadStudentHistory('${email}')" style="margin-left:16px; padding:8px 14px; background:#2563eb; color:#fff; border:none; border-radius:8px; cursor:pointer; font-size:14px;">Download History</button>
        <div style="display:grid; grid-template-columns:140px 1fr; gap:20px; align-items:start; margin-bottom:20px;">
          ${user.picture ? `<img src="${user.picture}" style="width:140px; height:140px; object-fit:cover; border-radius:18px;">` : `<div style="width:140px; height:140px; background:#f3f4f6; border-radius:18px; display:flex; align-items:center; justify-content:center; color:#6b7280; font-size:14px;">No Photo</div>`}
          <div style="display:grid; gap:8px; font-size:15px;">
            <p><strong>Name:</strong> ${user.name}</p>
            <p><strong>Student ID:</strong> ${user.student_number}</p>
            <p><strong>Email:</strong> ${user.email}</p>
            <p><strong>Location:</strong> ${user.location}</p>
            <p><strong>Registration Date:</strong> ${user.registration_date}</p>
            <p><strong>Total Hours:</strong> ${totalHours}/500</p>
            <p><strong>Pending Hours:</strong> ${pendingHours}</p>
          </div>
        </div>
        <h3 style="margin-bottom:12px;">Log History</h3>
        <table style="width:100%; border-collapse:collapse; font-size:14px;">
          <thead>
            <tr>
              <th style="border:1px solid #ddd; padding:10px; text-align:left; background:#f9fafb;">Date</th>
              <th style="border:1px solid #ddd; padding:10px; text-align:left; background:#f9fafb;">Task</th>
              <th style="border:1px solid #ddd; padding:10px; text-align:left; background:#f9fafb;">Hours</th>
              <th style="border:1px solid #ddd; padding:10px; text-align:left; background:#f9fafb;">Status</th>
              <th style="border:1px solid #ddd; padding:10px; text-align:left; background:#f9fafb;">Proof</th>
            </tr>
          </thead>
          <tbody>
            ${historyRows}
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', profileHTML);
}

function closeProfileModal(){
  const modal = document.getElementById('profileModal');
  if(modal) modal.remove();
}

function showFullProof(src){
  let proofHTML = `
    <div id="proofModal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.95); z-index:3000; display:flex; align-items:center; justify-content:center; padding:20px;">
      <div style="position:relative; width:100%; height:100%; display:flex; align-items:center; justify-content:center;">
        <button onclick="document.getElementById('proofModal')?.remove()" style="position:absolute; top:20px; right:20px; width:40px; height:40px; border:none; border-radius:50%; background:#ef4444; color:#fff; font-size:20px; cursor:pointer; z-index:2;">×</button>
        <img src="${src}" style="max-width:95%; max-height:95%; width:auto; height:auto; object-fit:contain; border-radius:12px; box-shadow:0 16px 40px rgba(0,0,0,0.5);" />
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', proofHTML);
}

function downloadStudentHistory(email){
  let studentLogs = logs.filter(l=>l.email === email);
  if(!studentLogs.length){
    alert('No log history available for this student.');
    return;
  }

  let csvRows = [
    ['Date','Task','Hours','Status','Proof']
  ];

  studentLogs.forEach(l=>{
    csvRows.push([
      l.date,
      l.task.replace(/"/g, '""'),
      l.hours,
      l.status,
      l.proof ? 'Yes' : 'No'
    ]);
  });

  let csvContent = csvRows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  let blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  let link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${email.replace(/[^a-z0-9]/gi, '_')}_log_history.csv`;
  link.click();
}

function exportPDF(){
  let content = 'OJT REPORT\nTotal Hours: '+document.getElementById('total').innerText;
  let blob = new Blob([content], { type: 'text/plain' });
  let link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'ojt-report.txt';
  link.click();
}

async function updateAdminOverview(){
  let approvedStudents = users.filter(u=>u.role==='student' && u.approved).length;
  let pendingStudents = users.filter(u=>u.role==='student' && !u.approved).length;
  
  document.getElementById('totalStudents').innerText = approvedStudents;
  document.getElementById('pendingCount').innerText = pendingStudents;
}

// Check login on page load
window.onload = async function(){
  await loadData();
  
  if((window.location.pathname.includes('studentdashboard.html') || window.location.pathname.includes('admindashboard.html')) && !currentUser){
    window.location.href = 'login.html';
  }
  if((window.location.pathname.includes('login.html') || window.location.pathname.includes('register.html')) && currentUser){
    if(currentUser.role === 'admin') window.location.href = 'admindashboard.html';
    else window.location.href = 'studentdashboard.html';
  }
  if(window.location.pathname.includes('studentdashboard.html')){
    showDashboard();
    renderLogs();
  }
  if(window.location.pathname.includes('admindashboard.html')){
    showDashboard();
    updateAdminOverview();
    await renderApprovedStudents();
    renderLogs();
  }
  if(window.location.pathname.includes('loginapprove.html')){
    await renderPendingUsers();
  }
  if(window.location.pathname.includes('taskapprove.html')){
    await renderLocationMonitoring();
  }
}
