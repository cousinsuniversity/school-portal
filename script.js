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

// Sign out on page load to prevent auto-login
auth.signOut().then(() => console.log("Auto-login disabled")).catch(()=>{});

// ==================== UI HELPER FUNCTIONS ====================
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
        animation: slideIn 0.3s ease; max-width: 400px; cursor: pointer;
    `;
    toast.innerHTML = `<div style="display:flex; align-items:center; gap:10px;">
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <span>${msg}</span>
    </div>`;
    document.body.appendChild(toast);
    setTimeout(() => { if(toast.parentNode) toast.remove(); }, 4000);
    toast.onclick = () => toast.remove();
}

// Splash screen hide
window.addEventListener('load', () => {
    setTimeout(() => {
        const splash = document.getElementById('splashScreen');
        if(splash) {
            splash.style.opacity = '0';
            setTimeout(() => {
                splash.style.display = 'none';
                const mainContainer = document.getElementById('mainContainer');
                if(mainContainer) mainContainer.style.display = 'block';
            }, 500);
        }
    }, 1500);
});

// ==================== AUTH FORMS ====================
const loginForm = document.getElementById('loginForm');
if(loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault(); 
        showLoading('Logging in...');
        const email = document.getElementById('loginEmail');
        const password = document.getElementById('loginPassword');
        if(!email || !password) {
            hideLoading();
            return showToast('Please enter email and password', 'error');
        }
        try {
            await auth.signInWithEmailAndPassword(email.value, password.value);
            showToast('Login successful!', 'success');
            if(loginForm) loginForm.reset();
        } catch (error) { 
            showToast(error.message, 'error');
        } finally { 
            hideLoading();
        }
    });
}

const registerForm = document.getElementById('registerForm');
if(registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('regName');
        const email = document.getElementById('regEmail');
        const pwd = document.getElementById('regPassword');
        const confirm = document.getElementById('regConfirmPassword');
        if(!name || !email || !pwd || !confirm) return;
        
        if(pwd.value !== confirm.value) return showToast('Passwords do not match', 'error');
        showLoading('Creating account...');
        try {
            const cred = await auth.createUserWithEmailAndPassword(email.value, pwd.value);
            await usersRef.child(cred.user.uid).set({
                name: name.value,
                email: email.value,
                createdAt: Date.now()
            });
            showToast('Registration successful!', 'success');
            if(registerForm) registerForm.reset();
        } catch(error) { 
            showToast(error.message, 'error');
        } finally { 
            hideLoading();
        }
    });
}

// ==================== LOGOUT ====================
const logoutBtn = document.getElementById('logoutBtn');
if(logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        await auth.signOut();
        location.reload();
    });
}

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

// ==================== REGISTRATION FORM HELPER FUNCTIONS ====================
function updateYearLevelOptions() {
    const levelSelect = document.getElementById('educationLevel');
    if(!levelSelect) return;
    const level = levelSelect.value;
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

function updateCourseOptions() {
    const levelSelect = document.getElementById('educationLevel');
    if(!levelSelect) return;
    const level = levelSelect.value;
    const courseSelect = document.getElementById('strandCourse');
    if (!courseSelect) return;
    courseSelect.innerHTML = '<option value="">Select Course/Strand</option>';
    
    coursesRef.orderByChild('level').equalTo(level).once('value', (snapshot) => {
        snapshot.forEach(child => {
            const name = child.val().name;
            if(name) courseSelect.innerHTML += `<option value="${name}">${name}</option>`;
        });
    });
}

// Attach event listeners for dynamic dropdowns
const educationLevelSelect = document.getElementById('educationLevel');
if(educationLevelSelect) {
    educationLevelSelect.addEventListener('change', () => {
        updateYearLevelOptions();
        updateCourseOptions();
    });
}

// ==================== REGISTRATION FORM SUBMISSION ====================
const enrollmentForm = document.getElementById('enrollmentForm');
if(enrollmentForm) {
    enrollmentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if(!currentUser) return showToast('Please login', 'error');
        if(currentApplication) return showToast('Application already submitted', 'error');
        
        const fullName = document.getElementById('fullName');
        const dob = document.getElementById('dob');
        const gender = document.getElementById('gender');
        const email = document.getElementById('email');
        const phone = document.getElementById('phone');
        const address = document.getElementById('address');
        const parentName = document.getElementById('parentName');
        const parentPhone = document.getElementById('parentPhone');
        const previousSchool = document.getElementById('previousSchool');
        const educationLevel = document.getElementById('educationLevel');
        const yearLevel = document.getElementById('yearLevel');
        const strandCourse = document.getElementById('strandCourse');
        
        if(!fullName || !fullName.value) return showToast('Please enter full name', 'error');
        if(!email || !email.value) return showToast('Please enter email', 'error');
        if(!educationLevel || !educationLevel.value) return showToast('Please select Education Level', 'error');
        if(!yearLevel || !yearLevel.value) return showToast('Please select Year Level', 'error');
        if(!strandCourse || !strandCourse.value) return showToast('Please select Course/Strand', 'error');
        
        const data = {
            userId: currentUser.uid,
            fullName: fullName.value.trim(),
            dob: dob ? dob.value : '',
            gender: gender ? gender.value : '',
            email: email.value.trim(),
            phone: phone ? phone.value.trim() : '',
            address: address ? address.value.trim() : '',
            parentName: parentName ? parentName.value.trim() : '',
            parentPhone: parentPhone ? parentPhone.value.trim() : '',
            previousSchool: previousSchool ? previousSchool.value.trim() : '',
            educationLevel: educationLevel.value,
            yearLevel: yearLevel.value,
            strandCourse: strandCourse.value,
            enrollmentDate: Date.now(),
            status: 'pending',
            applicationStatus: 'Pending Review'
        };
        
        showLoading('Submitting registration...');
        try {
            await applicationsRef.push().set(data);
            showToast('Registration submitted! Pending approval.', 'success');
            if(enrollmentForm) enrollmentForm.reset();
            await loadStudentData();
            const dashboardNav = document.querySelector('.nav-item[data-tab="dashboard"]');
            if(dashboardNav) dashboardNav.click();
        } catch(e) { 
            showToast('Error: '+e.message, 'error');
        } finally { 
            hideLoading();
        }
    });
}

// ==================== SUBJECT SELECTION (After Approval) ====================
async function loadAvailableSubjectsForStudent() {
    if(!currentApplication) return;
    if(currentApplication.status !== 'approved' && currentApplication.status !== 'Approved') {
        console.log("Not approved yet, status:", currentApplication.status);
        return;
    }
    
    showLoading('Loading available subjects...');
    try {
        const level = currentApplication.educationLevel;
        const course = currentApplication.strandCourse;
        const year = currentApplication.yearLevel;
        
        const subjectsSnapshot = await subjectsRef.once('value');
        const subjectsList = [];
        subjectsSnapshot.forEach(snap => {
            const subject = snap.val();
            if(subject && subject.level === level && subject.course === course && subject.year === year) {
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
        
        // Show subject selection card
        const subjectCard = document.getElementById('subjectSelectionCard');
        if(subjectCard) subjectCard.style.display = 'block';
        
        displaySubjectSelection();
    } catch(e) { 
        console.error(e);
    } finally { 
        hideLoading();
    }
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
    const saveBtn = document.getElementById('saveEnrollmentSubjectsBtn');
    if(saveBtn) saveBtn.addEventListener('click', saveEnrollmentSubjects);
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
        
        showToast('Enrollment successful!', 'success');
        await loadStudentData();
        const myEnrollmentNav = document.querySelector('.nav-item[data-tab="myEnrollment"]');
        if(myEnrollmentNav) myEnrollmentNav.click();
    } catch(e) {
        showToast('Error: ' + e.message, 'error');
    } finally {
        hideLoading();
    }
}

// ==================== MY ENROLLMENT TAB ====================
function displayMyEnrollment() {
    const container = document.getElementById('myEnrollmentList');
    if(!container) return;
    
    if(!currentEnrollment) {
        container.innerHTML = '<p>No active enrollment. Please select subjects first.</p>';
        const subjectCard = document.getElementById('subjectSelectionCard');
        if(subjectCard) subjectCard.style.display = 'block';
        return;
    }
    
    let subjectsHtml = '<div class="subjects-grid">';
    if(currentEnrollment.subjects && currentEnrollment.subjects.length > 0) {
        currentEnrollment.subjects.forEach(subj => {
            subjectsHtml += `
                <div class="subject-item">
                    <i class="fas fa-book"></i>
                    <div><strong>${subj.name}</strong><br><small>${subj.units} units | ₱${subj.price ? subj.price.toLocaleString() : 0}</small></div>
                </div>
            `;
        });
    }
    subjectsHtml += '</div>';
    
    const totalFee = currentEnrollment.totalFee || 0;
    const amountPaid = currentEnrollment.amountPaid || 0;
    const paymentStatus = amountPaid >= totalFee ? 'Fully Paid' : (amountPaid > 0 ? 'Partial' : 'Unpaid');
    
    container.innerHTML = `
        <div style="margin-bottom:20px; padding:15px; background:#f0f8ff; border-radius:10px;">
            <p><strong>Current Term:</strong> ${currentEnrollment.term || 'Trimester 1'} (${currentEnrollment.schoolYear || '2025-2026'})</p>
            ${subjectsHtml}
            <div style="margin-top:20px; padding:15px; background:#e8f4fd; border-radius:10px;">
                <p><strong>Total Tuition:</strong> ₱${totalFee.toLocaleString()}</p>
                <p><strong>Amount Paid:</strong> ₱${amountPaid.toLocaleString()}</p>
                <p><strong>Balance:</strong> ₱${(currentEnrollment.balance || totalFee).toLocaleString()}</p>
                <p><strong>Payment Status:</strong> <span class="${paymentStatus === 'Fully Paid' ? 'grade-pass' : 'grade-fail'}">${paymentStatus}</span></p>
            </div>
        </div>
    `;
    
    const subjectCard = document.getElementById('subjectSelectionCard');
    if(subjectCard) subjectCard.style.display = 'none';
}

// ==================== LOAD STUDENT DASHBOARD ====================
async function loadStudentData() {
    // CRITICAL FIX: Check if currentUser exists
    if(!currentUser) {
        console.log("No current user, skipping loadStudentData");
        return;
    }
    
    console.log("Loading student data for user:", currentUser.uid);
    showLoading('Loading your data...');
    try {
        const userSnap = await usersRef.child(currentUser.uid).once('value');
        const userName = userSnap.val()?.name || 'Student';
        const profileName = document.getElementById('profileName');
        const welcomeName = document.getElementById('welcomeName');
        if(profileName) profileName.innerText = userName;
        if(welcomeName) welcomeName.innerText = userName;
        
        // Get application
        const appSnap = await applicationsRef.orderByChild('userId').equalTo(currentUser.uid).once('value');
        const enrollmentSnap = await enrollmentsRef.orderByChild('userId').equalTo(currentUser.uid).once('value');
        
        // Load enrollment if exists
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
            
            console.log("Application found with status:", currentApplication.status);
            
            const status = currentApplication.status;
            const profileStatus = document.getElementById('profileStatus');
            const dashboardInfo = document.getElementById('dashboardInfo');
            const enrollmentNavItem = document.getElementById('enrollmentNavItem');
            const myEnrollmentNavItem = document.getElementById('myEnrollmentNavItem');
            const paymentNavItem = document.getElementById('paymentNavItem');
            
            // FIX: Check both 'approved' and 'Approved' (case insensitive)
            const isApproved = status && (status.toLowerCase() === 'approved');
            const isPending = status && (status.toLowerCase() === 'pending');
            const isEnrolled = (currentEnrollment && currentEnrollment.status === 'active') || 
                              (currentApplication.isEnrolled === true);
            
            if(isApproved) {
                console.log("User is APPROVED - showing subject selection");
                if(profileStatus) {
                    profileStatus.innerText = 'APPROVED - Ready to Enroll';
                    profileStatus.className = 'profile-status status-approved';
                }
                if(dashboardInfo) {
                    dashboardInfo.innerHTML = `
                        <div class="enrollment-summary" style="background:#d4edda; padding:20px; border-radius:10px;">
                            <p><strong>✅ Application Approved!</strong></p>
                            <p>Education Level: ${currentApplication.educationLevel || 'N/A'}</p>
                            <p>Year Level: ${currentApplication.yearLevel || 'N/A'}</p>
                            <p>Course/Strand: ${currentApplication.strandCourse || 'N/A'}</p>
                            <p style="margin-top:10px;">Please go to the <strong>My Enrollment tab</strong> to select your subjects.</p>
                        </div>
                    `;
                }
                if(enrollmentNavItem) enrollmentNavItem.style.display = 'none';
                if(myEnrollmentNavItem) myEnrollmentNavItem.style.display = 'flex';
                if(paymentNavItem) paymentNavItem.style.display = 'flex';
                await loadAvailableSubjectsForStudent();
                displayMyEnrollment();
            } 
            else if(isPending) {
                console.log("User is PENDING - waiting for admin approval");
                if(profileStatus) {
                    profileStatus.innerText = 'PENDING REVIEW';
                    profileStatus.className = 'profile-status status-pending';
                }
                if(dashboardInfo) {
                    dashboardInfo.innerHTML = `
                        <div class="enrollment-summary" style="background:#fff3cd; padding:20px; border-radius:10px;">
                            <p><strong>⏳ Application Pending</strong></p>
                            <p>Your application is being reviewed by the admin.</p>
                        </div>
                    `;
                }
                if(enrollmentNavItem) enrollmentNavItem.style.display = 'none';
                if(myEnrollmentNavItem) myEnrollmentNavItem.style.display = 'none';
                if(paymentNavItem) paymentNavItem.style.display = 'none';
            }
            else if(isEnrolled) {
                console.log("User is ENROLLED");
                if(profileStatus) {
                    profileStatus.innerText = 'ENROLLED';
                    profileStatus.className = 'profile-status status-approved';
                }
                if(dashboardInfo) {
                    dashboardInfo.innerHTML = `
                        <div class="enrollment-summary" style="background:#d4edda; padding:20px; border-radius:10px;">
                            <p><strong>✅ You are officially ENROLLED!</strong></p>
                            <p>Your subjects and payment details are in the My Enrollment tab.</p>
                        </div>
                    `;
                }
                if(enrollmentNavItem) enrollmentNavItem.style.display = 'none';
                if(myEnrollmentNavItem) myEnrollmentNavItem.style.display = 'flex';
                if(paymentNavItem) paymentNavItem.style.display = 'flex';
                displayMyEnrollment();
            }
        } else {
            console.log("No application found for user");
            const profileStatus = document.getElementById('profileStatus');
            const dashboardInfo = document.getElementById('dashboardInfo');
            const enrollmentNavItem = document.getElementById('enrollmentNavItem');
            const myEnrollmentNavItem = document.getElementById('myEnrollmentNavItem');
            const paymentNavItem = document.getElementById('paymentNavItem');
            
            if(profileStatus) {
                profileStatus.innerText = 'NOT ENROLLED';
                profileStatus.className = 'profile-status status-pending';
            }
            if(dashboardInfo) dashboardInfo.innerHTML = '<p>Please complete the Registration form.</p>';
            if(enrollmentNavItem) enrollmentNavItem.style.display = 'flex';
            if(myEnrollmentNavItem) myEnrollmentNavItem.style.display = 'none';
            if(paymentNavItem) paymentNavItem.style.display = 'none';
        }
        
        await loadGrades();
        await loadPaymentHistory();
        
    } catch(e) { 
        console.error("Error loading student data:", e);
    } finally { 
        hideLoading();
    }
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
        
        if(gradesContainer) gradesContainer.innerHTML = html;
        if(gradeSummary) {
            gradeSummary.innerHTML = `<div style="margin-top:20px; padding:15px; background:#f8f9fa; border-radius:10px;">
                <p><strong>Summary:</strong> Passed: ${passed} | Failed: ${failed}</p>
                <p><strong>Academic Status:</strong> ${failed > 0 ? 'IRREGULAR' : 'REGULAR'}</p>
            </div>`;
        }
    } else {
        if(gradesContainer) gradesContainer.innerHTML = '<p>No grades available yet.</p>';
    }
}

async function loadPaymentHistory() {
    if(!currentUser) return;
    const paymentsSnapshot = await paymentsRef.orderByChild('userId').equalTo(currentUser.uid).once('value');
    const paymentContainer = document.getElementById('paymentInfo');
    if(!paymentContainer) return;
    
    if(paymentsSnapshot.exists()) {
        let html = '<div class="card"><h3>Payment History</h3>';
        paymentsSnapshot.forEach(snap => {
            const payment = snap.val();
            html += `
                <div style="padding:10px; border-bottom:1px solid #eee;">
                    <p><strong>Amount:</strong> ₱${payment.amount?.toLocaleString() || 0}</p>
                    <p><strong>Status:</strong> ${payment.status || 'Pending'}</p>
                    <p><strong>Submitted:</strong> ${payment.submittedAt ? new Date(payment.submittedAt).toLocaleDateString() : 'N/A'}</p>
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
        
        const receiptUpload = document.getElementById('receiptUpload');
        const submitReceiptBtn = document.getElementById('submitReceiptBtn');
        
        if(receiptUpload) {
            receiptUpload.addEventListener('change', (e) => {
                const file = e.target.files[0];
                const fileNameDiv = document.getElementById('receiptFileName');
                if(file && fileNameDiv) fileNameDiv.innerHTML = `<i class="fas fa-file"></i> ${file.name}`;
            });
        }
        
        if(submitReceiptBtn) {
            submitReceiptBtn.addEventListener('click', async () => {
                const fileInput = document.getElementById('receiptUpload');
                const file = fileInput ? fileInput.files[0] : null;
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
                    if(fileInput) fileInput.value = '';
                    const fileNameDiv = document.getElementById('receiptFileName');
                    if(fileNameDiv) fileNameDiv.innerHTML = '';
                    await loadPaymentHistory();
                } catch(e) { showToast('Upload failed', 'error'); }
                finally { hideLoading(); }
            });
        }
    }
}

// ==================== DOCUMENTS ====================
let currentDocType = null;
const uploadTorBtn = document.getElementById('uploadTorBtn');
const uploadMoralBtn = document.getElementById('uploadMoralBtn');
const docUpload = document.getElementById('docUpload');

if(uploadTorBtn) {
    uploadTorBtn.addEventListener('click', () => {
        currentDocType = 'tor';
        if(docUpload) docUpload.click();
    });
}
if(uploadMoralBtn) {
    uploadMoralBtn.addEventListener('click', () => {
        currentDocType = 'moral';
        if(docUpload) docUpload.click();
    });
}
if(docUpload) {
    docUpload.addEventListener('change', async (e) => {
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
                const torStatusSpan = document.getElementById('torStatus');
                if(torStatusSpan) {
                    torStatusSpan.innerText = 'Uploaded';
                    torStatusSpan.className = 'document-status doc-uploaded';
                }
            } else {
                update.goodMoralFile = url;
                update.goodMoralStatus = 'uploaded';
                const moralStatusSpan = document.getElementById('moralStatus');
                if(moralStatusSpan) {
                    moralStatusSpan.innerText = 'Uploaded';
                    moralStatusSpan.className = 'document-status doc-uploaded';
                }
            }
            await applicationsRef.child(currentApplication.id).update(update);
            showToast('Document uploaded!', 'success');
        } catch(err) { showToast('Upload failed', 'error'); }
        finally { hideLoading(); }
    });
}

// ==================== INITIALIZE FORM OPTIONS ====================
document.addEventListener('DOMContentLoaded', () => {
    updateYearLevelOptions();
    updateCourseOptions();
});

// ==================== AUTH STATE ====================
auth.onAuthStateChanged(async (user) => {
    console.log("Auth state changed:", user ? "User logged in: " + user.email : "No user");
    
    if(user) {
        currentUser = user;
        const authSection = document.getElementById('authSection');
        const studentPortal = document.getElementById('studentPortal');
        const logoutBtnElem = document.getElementById('logoutBtn');
        if(authSection) authSection.style.display = 'none';
        if(studentPortal) studentPortal.style.display = 'block';
        if(logoutBtnElem) logoutBtnElem.style.display = 'block';
        await loadStudentData();
    } else {
        currentUser = null;
        currentApplication = null;
        currentEnrollment = null;
        const authSection = document.getElementById('authSection');
        const studentPortal = document.getElementById('studentPortal');
        const logoutBtnElem = document.getElementById('logoutBtn');
        if(authSection) authSection.style.display = 'block';
        if(studentPortal) studentPortal.style.display = 'none';
        if(logoutBtnElem) logoutBtnElem.style.display = 'none';
    }
});
