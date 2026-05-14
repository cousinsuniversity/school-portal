// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDhE0CtfujSQoTjVTD7uNJXrEFaNyp4hzQ",
  authDomain: "school-enrollment-system-356e2.firebaseapp.com",
  databaseURL: "https://school-enrollment-system-356e2-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "school-enrollment-system-356e2",
  storageBucket: "school-enrollment-system-356e2.firebasestorage.app",
  messagingSenderId: "445983385148",
  appId: "1:445983385148:web:55a608ebb987e2c7c94539"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();
const storage = firebase.storage();
let studentsRef = database.ref('students');
let usersRef = database.ref('users');
let applicationsRef = database.ref('applications');
let enrollmentsRef = database.ref('enrollments');
let subjectsRef = database.ref('subjects');
let coursesRef = database.ref('courses');
let gradesRef = database.ref('grades');
let currentUser = null;
let currentApplication = null;
let currentEnrollment = null;
let availableSubjects = [];
let selectedSubjects = [];

auth.signOut().then(() => console.log("Auto-login disabled")).catch(()=>{});

// Loading Functions
function showLoading(msg) { 
    const el = document.getElementById('loadingOverlay'); 
    const textEl = document.getElementById('loadingText');
    if(textEl) textEl.innerText = msg;
    if(el) el.style.display = 'flex'; 
}
function hideLoading() { 
    const el = document.getElementById('loadingOverlay'); 
    if(el) el.style.display = 'none'; 
}

function showToast(msg, type) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed; top: 20px; right: 20px; background: ${type === 'success' ? '#28a745' : '#dc3545'};
        color: white; padding: 15px 20px; border-radius: 10px; z-index: 999999;
        font-family: 'Segoe UI', sans-serif; font-size: 14px; box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        animation: slideIn 0.3s ease; max-width: 400px;
    `;
    toast.innerHTML = `<div style="display:flex; align-items:center; gap:10px;">
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <span>${msg}</span>
    </div>`;
    document.body.appendChild(toast);
    setTimeout(() => { if(toast.parentNode) toast.remove(); }, 4000);
}

// Splash screen hide
window.addEventListener('load', () => {
    setTimeout(() => {
        const splash = document.getElementById('splashScreen');
        if(splash) {
            splash.style.opacity = '0';
            setTimeout(() => {
                splash.style.display = 'none';
                document.getElementById('mainContainer').style.display = 'block';
            }, 500);
        }
    }, 1500);
});

// ==================== AUTH ====================
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault(); showLoading('Logging in...');
    try {
        await auth.signInWithEmailAndPassword(
            document.getElementById('loginEmail').value,
            document.getElementById('loginPassword').value
        );
        showToast('Login successful!', 'success');
    } catch (error) { showToast(error.message, 'error'); } 
    finally { hideLoading(); }
});

document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pwd = document.getElementById('regPassword').value;
    const confirm = document.getElementById('regConfirmPassword').value;
    if(pwd !== confirm) return showToast('Passwords do not match', 'error');
    showLoading('Creating account...');
    try {
        const cred = await auth.createUserWithEmailAndPassword(
            document.getElementById('regEmail').value, pwd
        );
        await usersRef.child(cred.user.uid).set({
            name: document.getElementById('regName').value,
            email: document.getElementById('regEmail').value,
            createdAt: Date.now()
        });
        showToast('Registration successful!', 'success');
    } catch(error) { showToast(error.message, 'error'); } 
    finally { hideLoading(); }
});

// ==================== LOGOUT ====================
document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await auth.signOut();
    location.reload();
});

// ==================== TAB NAVIGATION ====================
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', function() {
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        this.classList.add('active');
        const tabId = this.dataset.tab;
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        const targetTab = document.getElementById(`${tabId}Tab`);
        if(targetTab) targetTab.classList.add('active');
    });
});

// ==================== REGISTRATION FORM (Personal Info ONLY) ====================
document.getElementById('enrollmentForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if(!currentUser) return showToast('Please login', 'error');
    if(currentApplication) return showToast('Application already submitted', 'error');
    
    const data = {
        userId: currentUser.uid,
        fullName: document.getElementById('fullName').value.trim(),
        dob: document.getElementById('dob').value,
        gender: document.getElementById('gender').value,
        email: document.getElementById('email').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        address: document.getElementById('address').value.trim(),
        parentName: document.getElementById('parentName').value.trim(),
        parentPhone: document.getElementById('parentPhone').value.trim(),
        previousSchool: document.getElementById('previousSchool').value || '',
        enrollmentDate: Date.now(),
        status: 'pending',
        applicationStatus: 'Pending Review'
    };
    if(!data.fullName || !data.email) return showToast('Fill required fields', 'error');
    showLoading('Submitting registration...');
    try {
        await applicationsRef.push().set(data);
        showToast('Registration submitted! Pending approval.', 'success');
        document.getElementById('enrollmentForm').reset();
        await loadStudentData();
        document.querySelector('.nav-item[data-tab="dashboard"]').click();
    } catch(e) { showToast('Error: '+e.message, 'error'); } 
    finally { hideLoading(); }
});

// ==================== SUBJECT SELECTION FOR ENROLLMENT ====================
async function loadAvailableSubjectsForStudent() {
    if(!currentApplication || currentApplication.status !== 'approved') return;
    
    showLoading('Loading available subjects...');
    try {
        const level = currentApplication.educationLevel;
        const course = currentApplication.strandCourse;
        const year = currentApplication.yearLevel;
        
        // Query subjects from catalog
        const subjectsSnapshot = await subjectsRef.once('value');
        const subjectsList = [];
        subjectsSnapshot.forEach(snap => {
            const subject = snap.val();
            if(subject.level === level && subject.course === course && subject.year === year) {
                subjectsList.push({
                    id: snap.key,
                    name: subject.name,
                    units: subject.units,
                    semester: subject.semester
                });
            }
        });
        availableSubjects = subjectsList;
        
        // Display subjects in the enrollment tab for selection
        displaySubjectSelection();
    } catch(e) { console.error(e); }
    finally { hideLoading(); }
}

function displaySubjectSelection() {
    const subjectsContainer = document.getElementById('subjectsSelectionContainer');
    if(!subjectsContainer) return;
    
    if(availableSubjects.length === 0) {
        subjectsContainer.innerHTML = '<p>No subjects available for your course/level yet. Please contact admin.</p>';
        return;
    }
    
    // Group by semester
    const semesterMap = new Map();
    availableSubjects.forEach(subj => {
        if(!semesterMap.has(subj.semester)) semesterMap.set(subj.semester, []);
        semesterMap.get(subj.semester).push(subj);
    });
    
    let html = '<div class="subjects-grid">';
    semesterMap.forEach((subjects, semester) => {
        html += `<div class="card" style="margin-bottom:20px;"><h4>${semester}</h4>`;
        subjects.forEach(subj => {
            const isSelected = selectedSubjects.some(s => s.id === subj.id);
            html += `
                <div class="subject-item">
                    <input type="checkbox" id="subj_${subj.id}" ${isSelected ? 'checked' : ''} 
                           onchange="toggleSubjectSelection('${subj.id}', '${subj.name}', '${subj.units}', '${subj.semester}')">
                    <label for="subj_${subj.id}"><strong>${subj.name}</strong> (${subj.units} units)</label>
                </div>
            `;
        });
        html += `</div>`;
    });
    html += `</div>
             <button id="saveEnrollmentSubjectsBtn" class="btn btn-success" style="margin-top:20px;">
                 <i class="fas fa-save"></i> Save Subject Enrollment
             </button>`;
    subjectsContainer.innerHTML = html;
    
    // Attach event listener
    document.getElementById('saveEnrollmentSubjectsBtn')?.addEventListener('click', saveEnrollmentSubjects);
}

window.toggleSubjectSelection = function(subjectId, subjectName, units, semester) {
    const index = selectedSubjects.findIndex(s => s.id === subjectId);
    if(index === -1) {
        selectedSubjects.push({ id: subjectId, name: subjectName, units: units, semester: semester });
    } else {
        selectedSubjects.splice(index, 1);
    }
};

async function saveEnrollmentSubjects() {
    if(!currentUser || !currentApplication) return;
    if(selectedSubjects.length === 0) {
        showToast('Please select at least one subject', 'error');
        return;
    }
    
    showLoading('Saving enrollment...');
    try {
        const enrollmentData = {
            userId: currentUser.uid,
            studentName: currentApplication.fullName,
            educationLevel: currentApplication.educationLevel,
            yearLevel: currentApplication.yearLevel,
            strandCourse: currentApplication.strandCourse,
            subjects: selectedSubjects,
            term: 'Trimester 1',
            schoolYear: '2025-2026',
            status: 'active',
            enrollmentDate: Date.now()
        };
        
        // Check if enrollment already exists
        const existingEnrollment = await enrollmentsRef.orderByChild('userId').equalTo(currentUser.uid).once('value');
        if(existingEnrollment.exists()) {
            // Update existing
            existingEnrollment.forEach(async snap => {
                await enrollmentsRef.child(snap.key).update(enrollmentData);
            });
        } else {
            await enrollmentsRef.push().set(enrollmentData);
        }
        
        showToast('Subjects enrolled successfully!', 'success');
        await loadStudentData(); // Refresh to show My Enrollment tab
        document.querySelector('.nav-item[data-tab="myEnrollment"]')?.click();
    } catch(e) {
        showToast('Error: ' + e.message, 'error');
    } finally {
        hideLoading();
    }
}

// ==================== LOAD STUDENT DASHBOARD ====================
async function loadStudentData() {
    if(!currentUser) return;
    showLoading('Loading your data...');
    try {
        const userSnap = await usersRef.child(currentUser.uid).once('value');
        const userName = userSnap.val()?.name || 'Student';
        document.getElementById('profileName').innerText = userName;
        document.getElementById('welcomeName').innerText = userName;
        
        // Get application
        const appSnap = await applicationsRef.orderByChild('userId').equalTo(currentUser.uid).once('value');
        const enrollmentSnap = await enrollmentsRef.orderByChild('userId').equalTo(currentUser.uid).once('value');
        
        // Load enrollment if exists
        if(enrollmentSnap.exists()) {
            enrollmentSnap.forEach(snap => {
                currentEnrollment = snap.val();
                currentEnrollment.id = snap.key;
            });
        }
        
        if(appSnap.exists()) {
            appSnap.forEach(snap => {
                currentApplication = snap.val();
                currentApplication.id = snap.key;
            });
            
            const status = currentApplication.status;
            document.getElementById('profileStatus').innerText = status === 'approved' ? 'ENROLLED' : 'PENDING';
            document.getElementById('profileStatus').className = `profile-status ${status === 'approved' ? 'status-approved' : 'status-pending'}`;
            
            const dashboardInfo = document.getElementById('dashboardInfo');
            if(status === 'approved') {
                dashboardInfo.innerHTML = `
                    <div class="enrollment-summary" style="background:#d4edda; padding:20px; border-radius:10px;">
                        <p><strong>✅ Status: ENROLLED</strong></p>
                        <p>Education Level: ${currentApplication.educationLevel || 'N/A'}</p>
                        <p>Year Level: ${currentApplication.yearLevel || 'N/A'}</p>
                        <p>Course/Strand: ${currentApplication.strandCourse || 'N/A'}</p>
                        <p>You can now select your subjects for the current term.</p>
                    </div>
                `;
                
                // Show Enrollment Nav Item (for subject selection)
                document.getElementById('enrollmentNavItem').style.display = 'flex';
                document.getElementById('myEnrollmentNavItem').style.display = 'flex';
                
                // Load available subjects for selection
                await loadAvailableSubjectsForStudent();
                
                // Display enrolled subjects in My Enrollment tab
                if(currentEnrollment && currentEnrollment.subjects) {
                    displayEnrolledSubjects(currentEnrollment.subjects);
                }
            } else {
                dashboardInfo.innerHTML = `<div class="enrollment-summary" style="background:#fff3cd; padding:20px; border-radius:10px;">
                    <p><strong>⏳ Status: PENDING REVIEW</strong></p>
                    <p>Your registration is being processed. Please wait for admin approval.</p>
                </div>`;
                document.getElementById('enrollmentNavItem').style.display = 'none';
                document.getElementById('myEnrollmentNavItem').style.display = 'none';
            }
        } else {
            document.getElementById('profileStatus').innerText = 'NOT ENROLLED';
            document.getElementById('dashboardInfo').innerHTML = '<p>Please complete the Registration form.</p>';
            document.getElementById('enrollmentNavItem').style.display = 'flex';
            document.getElementById('myEnrollmentNavItem').style.display = 'none';
        }
        
        await loadGrades();
        await loadDocuments();
        
    } catch(e) { console.error(e); } 
    finally { hideLoading(); }
}

function displayEnrolledSubjects(subjects) {
    const container = document.getElementById('myEnrollmentList');
    if(!container) return;
    
    if(!subjects || subjects.length === 0) {
        container.innerHTML = '<p>No subjects enrolled yet. Please select subjects from the Enrollment tab.</p>';
        return;
    }
    
    let html = '<div class="subjects-grid">';
    subjects.forEach(subj => {
        html += `
            <div class="subject-item">
                <i class="fas fa-book"></i>
                <div><strong>${subj.name}</strong><br><small>${subj.units} units | ${subj.semester || 'Trimester 1'}</small></div>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}

// ==================== GRADES ====================
async function loadGrades() {
    if(!currentUser) return;
    const gradesSnapshot = await gradesRef.orderByChild('studentId').equalTo(currentUser.uid).once('value');
    const gradesList = [];
    gradesSnapshot.forEach(snap => gradesList.push(snap.val()));
    
    const gradesContainer = document.getElementById('gradesList');
    const gradeSummary = document.getElementById('gradeSummary');
    
    if(gradesList.length > 0) {
        let passed = 0, failed = 0;
        let html = '<div style="background:#f8f9fa; padding:10px; border-radius:8px; margin-bottom:10px;"><div style="display:flex; justify-content:space-between; font-weight:bold;"><div>Subject</div><div>Grade</div><div>Remarks</div></div></div>';
        
        gradesList.forEach(g => {
            html += `<div style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #eee;">
                <div><strong>${g.subject}</strong></div>
                <div>${g.numericalGrade}% (${g.letterGrade})</div>
                <div class="${g.remarks === 'PASSED' ? 'grade-pass' : 'grade-fail'}">${g.remarks}</div>
            </div>`;
            if(g.remarks === 'PASSED') passed++;
            else failed++;
        });
        
        gradesContainer.innerHTML = html;
        gradeSummary.innerHTML = `<div style="margin-top:20px; padding:15px; background:#f8f9fa; border-radius:10px;">
            <p><strong>Summary:</strong> Passed: ${passed} | Failed: ${failed}</p>
            <p><strong>Academic Status:</strong> ${failed > 0 ? 'IRREGULAR' : 'REGULAR'}</p>
        </div>`;
    } else {
        gradesContainer.innerHTML = '<p>No grades available yet.</p>';
    }
}

// ==================== DOCUMENTS ====================
async function loadDocuments() {
    if(!currentApplication) return;
    const torStatus = document.getElementById('torStatus');
    const moralStatus = document.getElementById('moralStatus');
    if(torStatus && currentApplication.torFile) {
        torStatus.innerText = 'Uploaded';
        torStatus.className = 'document-status doc-uploaded';
    }
    if(moralStatus && currentApplication.goodMoralFile) {
        moralStatus.innerText = 'Uploaded';
        moralStatus.className = 'document-status doc-uploaded';
    }
}

let currentDocType = null;
document.getElementById('uploadTorBtn')?.addEventListener('click', () => {
    currentDocType = 'tor';
    document.getElementById('docUpload').click();
});
document.getElementById('uploadMoralBtn')?.addEventListener('click', () => {
    currentDocType = 'moral';
    document.getElementById('docUpload').click();
});
document.getElementById('docUpload')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if(!file || !currentUser || !currentApplication) return;
    showLoading('Uploading...');
    try {
        const storageRef = storage.ref(`documents/${currentUser.uid}/${currentDocType}_${Date.now()}`);
        await storageRef.put(file);
        const url = await storageRef.getDownloadURL();
        const update = {};
        if(currentDocType === 'tor') {
            update.torFile = url;
            update.torStatus = 'uploaded';
        } else {
            update.goodMoralFile = url;
            update.goodMoralStatus = 'uploaded';
        }
        await applicationsRef.child(currentApplication.id).update(update);
        showToast('Document uploaded!', 'success');
        await loadDocuments();
    } catch(err) { showToast('Upload failed', 'error'); }
    finally { hideLoading(); }
});

// ==================== AUTH STATE ====================
auth.onAuthStateChanged(async (user) => {
    if(user) {
        currentUser = user;
        document.getElementById('authSection').style.display = 'none';
        document.getElementById('studentPortal').style.display = 'block';
        document.getElementById('logoutBtn').style.display = 'block';
        await loadStudentData();
    } else {
        currentUser = null;
        currentApplication = null;
        document.getElementById('authSection').style.display = 'block';
        document.getElementById('studentPortal').style.display = 'none';
        document.getElementById('logoutBtn').style.display = 'none';
    }
});

// Payment info placeholder
document.getElementById('paymentInfo').innerHTML = '<p>Payment details will be available after enrollment.</p>';
