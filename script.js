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
let paymentsRef = database.ref('payments');
let currentUser = null;
let currentApplication = null;
let currentEnrollment = null;
let availableSubjects = [];
let selectedSubjects = [];
let currentPaymentReceipt = null;

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

// ==================== REGISTRATION FORM (Personal Info + SHS/College) ====================
// Update year level options based on education level
function updateYearLevelOptions() {
    const level = document.getElementById('educationLevel').value;
    const yearSelect = document.getElementById('yearLevel');
    if (!yearSelect) return;
    yearSelect.innerHTML = '<option value="">Select Year</option>';
    
    if (level === 'SHS') {
        yearSelect.innerHTML += '<option value="Grade 11">Grade 11</option>';
        yearSelect.innerHTML += '<option value="Grade 12">Grade 12</option>';
    } else if (level === 'College') {
        yearSelect.innerHTML += '<option value="1st Year">1st Year</option>';
        yearSelect.innerHTML += '<option value="2nd Year">2nd Year</option>';
        yearSelect.innerHTML += '<option value="3rd Year">3rd Year</option>';
        yearSelect.innerHTML += '<option value="4th Year">4th Year</option>';
    }
}

// Update course options based on education level
function updateCourseOptions() {
    const level = document.getElementById('educationLevel').value;
    const courseSelect = document.getElementById('strandCourse');
    if (!courseSelect) return;
    courseSelect.innerHTML = '<option value="">Select Course/Strand</option>';
    
    coursesRef.orderByChild('level').equalTo(level).once('value', (snapshot) => {
        snapshot.forEach(child => {
            const name = child.val().name;
            courseSelect.innerHTML += `<option value="${name}">${name}</option>`;
        });
    });
}

document.getElementById('educationLevel')?.addEventListener('change', () => {
    updateYearLevelOptions();
    updateCourseOptions();
});

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
        educationLevel: document.getElementById('educationLevel').value,
        yearLevel: document.getElementById('yearLevel').value,
        strandCourse: document.getElementById('strandCourse').value,
        enrollmentDate: Date.now(),
        status: 'pending',
        applicationStatus: 'Pending Review'
    };
    if(!data.fullName || !data.email || !data.educationLevel || !data.yearLevel || !data.strandCourse) {
        return showToast('Fill all required fields', 'error');
    }
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

// ==================== SUBJECT SELECTION (After Approval) ====================
async function loadAvailableSubjectsForStudent() {
    if(!currentApplication || currentApplication.status !== 'approved') return;
    
    showLoading('Loading available subjects...');
    try {
        const level = currentApplication.educationLevel;
        const course = currentApplication.strandCourse;
        const year = currentApplication.yearLevel;
        
        const subjectsSnapshot = await subjectsRef.once('value');
        const subjectsList = [];
        subjectsSnapshot.forEach(snap => {
            const subject = snap.val();
            if(subject.level === level && subject.course === course && subject.year === year) {
                subjectsList.push({
                    id: snap.key,
                    name: subject.name,
                    units: subject.units,
                    semester: subject.semester,
                    price: subject.price || 0
                });
            }
        });
        availableSubjects = subjectsList;
        
        // Calculate total tuition
        let totalTuition = 0;
        availableSubjects.forEach(s => totalTuition += s.price);
        document.getElementById('totalTuitionDisplay').innerHTML = `<strong>Total Tuition: ₱${totalTuition.toLocaleString()}</strong>`;
        
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
                           data-id="${subj.id}" data-name="${subj.name}" data-units="${subj.units}" 
                           data-price="${subj.price}" data-semester="${subj.semester}"
                           onchange="toggleSubjectSelection(this)">
                    <label for="subj_${subj.id}"><strong>${subj.name}</strong> (${subj.units} units) - ₱${subj.price.toLocaleString()}</label>
                </div>
            `;
        });
        html += `</div>`;
    });
    html += `</div>
             <div style="margin-top:20px; padding:15px; background:#e8f4fd; border-radius:10px;">
                 <p id="selectedTotalDisplay">Selected subjects total: ₱0</p>
                 <button id="saveEnrollmentSubjectsBtn" class="btn btn-success" style="margin-top:10px;">
                     <i class="fas fa-save"></i> Enroll in Selected Subjects
                 </button>
             </div>`;
    subjectsContainer.innerHTML = html;
    
    updateSelectedTotal();
    document.getElementById('saveEnrollmentSubjectsBtn')?.addEventListener('click', saveEnrollmentSubjects);
}

function updateSelectedTotal() {
    let total = 0;
    selectedSubjects.forEach(s => total += s.price);
    const totalDisplay = document.getElementById('selectedTotalDisplay');
    if(totalDisplay) totalDisplay.innerHTML = `Selected subjects total: ₱${total.toLocaleString()}`;
}

window.toggleSubjectSelection = function(checkbox) {
    const subjectId = checkbox.dataset.id;
    const subjectData = {
        id: subjectId,
        name: checkbox.dataset.name,
        units: checkbox.dataset.units,
        price: parseFloat(checkbox.dataset.price),
        semester: checkbox.dataset.semester
    };
    const index = selectedSubjects.findIndex(s => s.id === subjectId);
    if(index === -1) {
        selectedSubjects.push(subjectData);
    } else {
        selectedSubjects.splice(index, 1);
    }
    updateSelectedTotal();
};

async function saveEnrollmentSubjects() {
    if(!currentUser || !currentApplication) return;
    if(selectedSubjects.length === 0) {
        showToast('Please select at least one subject', 'error');
        return;
    }
    
    showLoading('Saving enrollment...');
    try {
        let totalFee = 0;
        selectedSubjects.forEach(s => totalFee += s.price);
        
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
            totalFee: totalFee,
            amountPaid: 0,
            balance: totalFee,
            enrollmentDate: Date.now()
        };
        
        const existingEnrollment = await enrollmentsRef.orderByChild('userId').equalTo(currentUser.uid).once('value');
        if(existingEnrollment.exists()) {
            existingEnrollment.forEach(async snap => {
                await enrollmentsRef.child(snap.key).update(enrollmentData);
            });
        } else {
            await enrollmentsRef.push().set(enrollmentData);
        }
        
        // Update student as enrolled
        const studentSnapshot = await studentsRef.orderByChild('userId').equalTo(currentUser.uid).once('value');
        studentSnapshot.forEach(async snap => {
            await studentsRef.child(snap.key).child('isEnrolled').setValue(true);
            await studentsRef.child(snap.key).child('enrolledSubjects').setValue(selectedSubjects);
        });
        
        showToast('Enrollment successful! Please upload payment receipt.', 'success');
        await loadStudentData();
        document.querySelector('.nav-item[data-tab="payment"]').click();
    } catch(e) {
        showToast('Error: ' + e.message, 'error');
    } finally {
        hideLoading();
    }
}

// ==================== PAYMENT RECEIPT UPLOAD ====================
let currentReceiptFile = null;

document.getElementById('uploadReceiptBtn')?.addEventListener('click', () => {
    document.getElementById('receiptUpload').click();
});

document.getElementById('receiptUpload')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if(!file || !currentUser) return;
    currentReceiptFile = file;
    document.getElementById('receiptFileName').innerHTML = `<i class="fas fa-file"></i> ${file.name}`;
});

document.getElementById('submitReceiptBtn')?.addEventListener('click', async () => {
    if(!currentReceiptFile) {
        showToast('Please select a receipt image first', 'error');
        return;
    }
    if(!currentEnrollment) {
        showToast('No enrollment found', 'error');
        return;
    }
    
    showLoading('Uploading receipt...');
    try {
        const storageRef = storage.ref(`receipts/${currentUser.uid}/${Date.now()}_receipt`);
        await storageRef.put(currentReceiptFile);
        const receiptUrl = await storageRef.getDownloadURL();
        
        await paymentsRef.push().set({
            userId: currentUser.uid,
            studentName: currentApplication?.fullName,
            enrollmentId: currentEnrollment.id,
            amount: currentEnrollment.totalFee,
            receiptUrl: receiptUrl,
            status: 'pending_verification',
            submittedAt: Date.now()
        });
        
        showToast('Payment receipt submitted! Awaiting admin verification.', 'success');
        document.getElementById('receiptFileName').innerHTML = '';
        currentReceiptFile = null;
        document.getElementById('receiptUpload').value = '';
        
        await loadStudentData();
    } catch(e) {
        showToast('Upload failed: ' + e.message, 'error');
    } finally {
        hideLoading();
    }
});

// ==================== MY ENROLLMENT TAB ====================
function displayMyEnrollment() {
    const container = document.getElementById('myEnrollmentList');
    if(!container) return;
    
    if(!currentEnrollment) {
        container.innerHTML = '<p>No active enrollment. Please select subjects first.</p>';
        return;
    }
    
    let subjectsHtml = '<div class="subjects-grid">';
    if(currentEnrollment.subjects && currentEnrollment.subjects.length > 0) {
        currentEnrollment.subjects.forEach(subj => {
            subjectsHtml += `
                <div class="subject-item">
                    <i class="fas fa-book"></i>
                    <div><strong>${subj.name}</strong><br><small>${subj.units} units | ₱${subj.price.toLocaleString()}</small></div>
                </div>
            `;
        });
    }
    subjectsHtml += '</div>';
    
    const paymentStatus = currentEnrollment.amountPaid >= currentEnrollment.totalFee ? 'Fully Paid' : 
                          (currentEnrollment.amountPaid > 0 ? 'Partial' : 'Unpaid');
    
    container.innerHTML = `
        <div class="card">
            <h3>Current Term: ${currentEnrollment.term || 'Trimester 1'} (${currentEnrollment.schoolYear || '2025-2026'})</h3>
            ${subjectsHtml}
            <div style="margin-top:20px; padding:15px; background:#f0f8ff; border-radius:10px;">
                <p><strong>Total Tuition:</strong> ₱${(currentEnrollment.totalFee || 0).toLocaleString()}</p>
                <p><strong>Amount Paid:</strong> ₱${(currentEnrollment.amountPaid || 0).toLocaleString()}</p>
                <p><strong>Balance:</strong> ₱${(currentEnrollment.balance || currentEnrollment.totalFee || 0).toLocaleString()}</p>
                <p><strong>Payment Status:</strong> <span class="${paymentStatus === 'Fully Paid' ? 'grade-pass' : 'grade-fail'}">${paymentStatus}</span></p>
            </div>
        </div>
    `;
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
        
        const appSnap = await applicationsRef.orderByChild('userId').equalTo(currentUser.uid).once('value');
        const enrollmentSnap = await enrollmentsRef.orderByChild('userId').equalTo(currentUser.uid).once('value');
        
        if(enrollmentSnap.exists()) {
            enrollmentSnap.forEach(snap => {
                currentEnrollment = snap.val();
                currentEnrollment.id = snap.key;
            });
        } else {
            currentEnrollment = null;
        }
        
        if(appSnap.exists()) {
            appSnap.forEach(snap => {
                currentApplication = snap.val();
                currentApplication.id = snap.key;
            });
            
            const status = currentApplication.status;
            if(status === 'approved') {
                document.getElementById('profileStatus').innerText = 'APPROVED - Ready to Enroll';
                document.getElementById('profileStatus').className = 'profile-status status-approved';
                
                document.getElementById('dashboardInfo').innerHTML = `
                    <div class="enrollment-summary" style="background:#d4edda; padding:20px; border-radius:10px;">
                        <p><strong>✅ Application Approved!</strong></p>
                        <p>Education Level: ${currentApplication.educationLevel || 'N/A'}</p>
                        <p>Year Level: ${currentApplication.yearLevel || 'N/A'}</p>
                        <p>Course/Strand: ${currentApplication.strandCourse || 'N/A'}</p>
                        <p style="margin-top:10px;">Please go to the <strong>Enrollment tab</strong> to select your subjects.</p>
                    </div>
                `;
                document.getElementById('enrollmentNavItem').style.display = 'flex';
                document.getElementById('myEnrollmentNavItem').style.display = 'flex';
                document.getElementById('paymentNavItem').style.display = 'flex';
                await loadAvailableSubjectsForStudent();
                displayMyEnrollment();
            } 
            else if(status === 'pending') {
                document.getElementById('profileStatus').innerText = 'PENDING REVIEW';
                document.getElementById('profileStatus').className = 'profile-status status-pending';
                document.getElementById('dashboardInfo').innerHTML = `
                    <div class="enrollment-summary" style="background:#fff3cd; padding:20px; border-radius:10px;">
                        <p><strong>⏳ Application Pending</strong></p>
                        <p>Your application is being reviewed by the admin.</p>
                    </div>
                `;
                document.getElementById('enrollmentNavItem').style.display = 'none';
                document.getElementById('myEnrollmentNavItem').style.display = 'none';
                document.getElementById('paymentNavItem').style.display = 'none';
            }
            else if(status === 'enrolled' || (currentEnrollment && currentEnrollment.status === 'active')) {
                document.getElementById('profileStatus').innerText = 'ENROLLED';
                document.getElementById('profileStatus').className = 'profile-status status-approved';
                document.getElementById('dashboardInfo').innerHTML = `
                    <div class="enrollment-summary" style="background:#d4edda; padding:20px; border-radius:10px;">
                        <p><strong>✅ You are officially ENROLLED!</strong></p>
                        <p>Your subjects and payment details are in the My Enrollment tab.</p>
                    </div>
                `;
                document.getElementById('enrollmentNavItem').style.display = 'none';
                document.getElementById('myEnrollmentNavItem').style.display = 'flex';
                document.getElementById('paymentNavItem').style.display = 'flex';
                displayMyEnrollment();
            }
        } else {
            document.getElementById('profileStatus').innerText = 'NOT ENROLLED';
            document.getElementById('profileStatus').className = 'profile-status status-pending';
            document.getElementById('dashboardInfo').innerHTML = '<p>Please complete the Registration form.</p>';
            document.getElementById('enrollmentNavItem').style.display = 'flex';
            document.getElementById('myEnrollmentNavItem').style.display = 'none';
            document.getElementById('paymentNavItem').style.display = 'none';
        }
        
        await loadGrades();
        await loadPaymentHistory();
        
    } catch(e) { console.error(e); } 
    finally { hideLoading(); }
}

async function loadGrades() {
    if(!currentUser) return;
    const gradesSnapshot = await gradesRef.orderByChild('studentId').equalTo(currentUser.uid).once('value');
    const gradesList = [];
    gradesSnapshot.forEach(snap => gradesList.push(snap.val()));
    
    const gradesContainer = document.getElementById('gradesList');
    const gradeSummary = document.getElementById('gradeSummary');
    
    if(gradesList.length > 0) {
        let passed = 0, failed = 0;
        let html = '<div style="background:#f8f9fa; padding:10px; border-radius:8px; margin-bottom:10px;"><div style="display:flex; justify-content:space-between; font-weight:bold;"><div>Subject</div><div>Prelim</div><div>Midterm</div><div>Finals</div><div>Average</div><div>Grade</div><div>Remarks</div></div></div>';
        
        gradesList.forEach(g => {
            html += `<div style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #eee;">
                <div><strong>${g.subject}</strong></div>
                <div>${g.prelim || '-'}%</div>
                <div>${g.midterm || '-'}%</div>
                <div>${g.finals || '-'}%</div>
                <div>${g.numericalGrade ? g.numericalGrade.toFixed(2) : '-'}%</div>
                <div>${g.letterGrade || '-'}</div>
                <div class="${g.remarks === 'PASSED' ? 'grade-pass' : 'grade-fail'}">${g.remarks || '-'}</div>
            </div>`;
            if(g.remarks === 'PASSED') passed++;
            else if(g.remarks === 'FAILED') failed++;
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

async function loadPaymentHistory() {
    if(!currentUser) return;
    const paymentsSnapshot = await paymentsRef.orderByChild('userId').equalTo(currentUser.uid).once('value');
    const paymentContainer = document.getElementById('paymentInfo');
    
    if(paymentsSnapshot.exists()) {
        let html = '<div class="card"><h3>Payment History</h3>';
        paymentsSnapshot.forEach(snap => {
            const payment = snap.val();
            html += `
                <div style="padding:10px; border-bottom:1px solid #eee;">
                    <p><strong>Amount:</strong> ₱${payment.amount.toLocaleString()}</p>
                    <p><strong>Status:</strong> ${payment.status}</p>
                    <p><strong>Submitted:</strong> ${new Date(payment.submittedAt).toLocaleDateString()}</p>
                    ${payment.receiptUrl ? `<a href="${payment.receiptUrl}" target="_blank">View Receipt</a>` : ''}
                </div>
            `;
        });
        html += '</div>';
        paymentContainer.innerHTML = html;
    } else {
        paymentContainer.innerHTML = `
            <div class="card">
                <h3>Payment Upload</h3>
                <p>Please upload your payment receipt to complete enrollment.</p>
                <div class="form-group">
                    <div class="file-attachment" onclick="document.getElementById('receiptUpload').click()">
                        <i class="fas fa-cloud-upload-alt"></i> Click to upload payment receipt
                    </div>
                    <input type="file" id="receiptUpload" style="display:none;" accept="image/*,.pdf">
                    <div id="receiptFileName" class="file-list"></div>
                </div>
                <button id="submitReceiptBtn" class="btn btn-success">Submit Payment Receipt</button>
                <div id="paymentMessage"></div>
            </div>
        `;
        // Re-attach event listeners
        document.getElementById('uploadReceiptBtn')?.addEventListener('click', () => document.getElementById('receiptUpload').click());
        document.getElementById('receiptUpload')?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if(file) document.getElementById('receiptFileName').innerHTML = `<i class="fas fa-file"></i> ${file.name}`;
        });
        document.getElementById('submitReceiptBtn')?.addEventListener('click', async () => {
            const file = document.getElementById('receiptUpload').files[0];
            if(!file) { showToast('Select a receipt', 'error'); return; }
            showLoading('Uploading...');
            try {
                const storageRef = storage.ref(`receipts/${currentUser.uid}/${Date.now()}_receipt`);
                await storageRef.put(file);
                const url = await storageRef.getDownloadURL();
                await paymentsRef.push().set({
                    userId: currentUser.uid,
                    studentName: currentApplication?.fullName,
                    amount: currentEnrollment?.totalFee || 0,
                    receiptUrl: url,
                    status: 'pending_verification',
                    submittedAt: Date.now()
                });
                showToast('Receipt submitted!', 'success');
                document.getElementById('receiptUpload').value = '';
                document.getElementById('receiptFileName').innerHTML = '';
                await loadPaymentHistory();
            } catch(e) { showToast('Upload failed', 'error'); }
            finally { hideLoading(); }
        });
    }
}

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
        currentEnrollment = null;
        document.getElementById('authSection').style.display = 'block';
        document.getElementById('studentPortal').style.display = 'none';
        document.getElementById('logoutBtn').style.display = 'none';
    }
});

// Initialize form options
document.addEventListener('DOMContentLoaded', () => {
    updateYearLevelOptions();
    updateCourseOptions();
});
