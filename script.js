// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDhE0CtfujSQoTjVTD7uNJXrEFaNyp4hzQ",
  authDomain: "school-enrollment-system-356e2.firebaseapp.com",
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
let gradesRef = database.ref('grades');
let currentUser = null;
let currentApplication = null;
let selectedDocFile = null;
let currentDocType = null;
let currentSubjects = [];
let totalFee = 0;

// Price configuration
const TUITION_FEES = {
    SHS: { perSubject: 1500, baseFee: 5000 },
    College: { perSubject: 2000, baseFee: 8000 }
};

// Subject Data
const SUBJECTS = {
    SHS_G11: [
        { name: "Oral Communication in Context", units: 3, required: true },
        { name: "Komunikasyon at Pananaliksik sa Wika at Kulturang Pilipino", units: 3, required: true },
        { name: "General Mathematics", units: 3, required: true },
        { name: "Earth and Life Science", units: 3, required: true },
        { name: "Physical Education and Health 1", units: 2, required: true }
    ],
    SHS_G12: [
        { name: "21st Century Literature from the Philippines and the World", units: 3, required: true },
        { name: "Contemporary Philippine Arts from the Regions", units: 3, required: true },
        { name: "Media and Information Literacy", units: 3, required: true },
        { name: "Understanding Culture, Society and Politics", units: 3, required: true },
        { name: "Physical Education and Health 3", units: 2, required: true }
    ],
    College_Y1: [
        { name: "Understanding the Self", units: 3, required: true },
        { name: "Readings in Philippine History", units: 3, required: true },
        { name: "The Contemporary World", units: 3, required: true },
        { name: "Mathematics in the Modern World", units: 3, required: true },
        { name: "Physical Education 1", units: 2, required: true },
        { name: "NSTP 1", units: 3, required: true }
    ],
    College_Y2: [
        { name: "Purposive Communication", units: 3, required: true },
        { name: "Art Appreciation", units: 3, required: true },
        { name: "Ethics", units: 3, required: true },
        { name: "Science, Technology and Society", units: 3, required: true },
        { name: "Physical Education 2", units: 2, required: true },
        { name: "NSTP 2", units: 3, required: true }
    ],
    College_Y3: [
        { name: "The Life and Works of Rizal", units: 3, required: true },
        { name: "Social Science Elective", units: 3, required: true }
    ],
    College_Y4: [
        { name: "Professional Ethics", units: 3, required: true },
        { name: "Technopreneurship", units: 3, required: true },
        { name: "Research/Thesis", units: 6, required: true }
    ]
};

const STRANDS = {
    SHS: ["ABM", "STEM", "HUMSS", "GAS", "TVL"],
    College: ["BSIT", "BSCS", "BSBA", "BSEd", "BSN", "BSA"]
};

// Tab navigation
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', function() {
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        this.classList.add('active');
        
        const tabId = this.dataset.tab;
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        document.getElementById(`${tabId}Tab`).classList.add('active');
    });
});

// Year level options
function updateYearLevels() {
    const level = document.getElementById('educationLevel');
    if (!level) return;
    const yearSelect = document.getElementById('yearLevel');
    if (!yearSelect) return;
    yearSelect.innerHTML = '<option value="">Select Year</option>';
    
    if (level.value === 'SHS') {
        yearSelect.innerHTML += '<option value="11">Grade 11</option>';
        yearSelect.innerHTML += '<option value="12">Grade 12</option>';
    } else if (level.value === 'College') {
        for (let i = 1; i <= 4; i++) {
            let suffix = i === 1 ? "st" : (i === 2 ? "nd" : (i === 3 ? "rd" : "th"));
            yearSelect.innerHTML += `<option value="${i}">${i}${suffix} Year</option>`;
        }
    }
}

function updateStrandCourse() {
    const level = document.getElementById('educationLevel');
    if (!level) return;
    const strandSelect = document.getElementById('strandCourse');
    if (!strandSelect) return;
    strandSelect.innerHTML = '<option value="">Select Strand/Course</option>';
    
    const options = level.value === 'SHS' ? STRANDS.SHS : STRANDS.College;
    options.forEach(opt => {
        strandSelect.innerHTML += `<option value="${opt}">${opt}</option>`;
    });
}

function loadSubjects() {
    const level = document.getElementById('educationLevel');
    const year = document.getElementById('yearLevel');
    if (!level || !year) return;
    if (!level.value || !year.value) return;
    
    let subjectKey = '';
    if (level.value === 'SHS') {
        subjectKey = year.value === '11' ? 'SHS_G11' : 'SHS_G12';
    } else {
        subjectKey = `College_Y${year.value}`;
    }
    
    const subjects = SUBJECTS[subjectKey] || [];
    currentSubjects = subjects;
    
    const container = document.getElementById('subjectsContainer');
    if (!container) return;
    container.innerHTML = '';
    
    subjects.forEach((subject, index) => {
        const div = document.createElement('div');
        div.className = 'subject-item';
        div.innerHTML = `
            <input type="checkbox" id="subj_${index}" checked ${subject.required ? 'disabled' : ''}>
            <label for="subj_${index}">${subject.name} (${subject.units} units)${subject.required ? ' - Required' : ''}</label>
        `;
        container.appendChild(div);
    });
    
    calculateTotalFee();
}

function calculateTotalFee() {
    const level = document.getElementById('educationLevel');
    if (!level) return;
    const config = TUITION_FEES[level.value] || TUITION_FEES.College;
    const subjectCount = currentSubjects.length;
    
    totalFee = config.baseFee + (subjectCount * config.perSubject);
    const totalFeeElement = document.getElementById('totalFee');
    if (totalFeeElement) {
        totalFeeElement.innerHTML = `₱${totalFee.toLocaleString()}`;
    }
    
    updatePaymentDetails();
}

function updatePaymentDetails() {
    const methodInput = document.getElementById('paymentMethod');
    const method = methodInput ? methodInput.value : 'full';
    const details = document.getElementById('paymentDetails');
    if (!details) return;
    
    if (method === 'full') {
        const discounted = totalFee * 0.9;
        details.innerHTML = `Full Payment: ₱${discounted.toLocaleString()} (10% discount applied)`;
    } else if (method === 'installment') {
        const perPayment = Math.ceil(totalFee / 3);
        details.innerHTML = `Installment Plan: 3 payments of ₱${perPayment.toLocaleString()} each`;
    } else {
        details.innerHTML = `School Pay Later: No upfront payment required. Balance due at end of semester.`;
    }
}

// Payment method selection
const paymentMethods = document.querySelectorAll('.payment-method');
paymentMethods.forEach(el => {
    el.addEventListener('click', function() {
        document.querySelectorAll('.payment-method').forEach(m => m.classList.remove('selected'));
        this.classList.add('selected');
        const paymentMethodInput = document.getElementById('paymentMethod');
        if (paymentMethodInput) {
            paymentMethodInput.value = this.dataset.method;
        }
        updatePaymentDetails();
    });
});

// Document upload handlers
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
    if (!file || !currentUser || !currentApplication) return;
    
    try {
        const storageRef = storage.ref(`documents/${currentUser.uid}/${currentDocType}_${Date.now()}`);
        await storageRef.put(file);
        const downloadUrl = await storageRef.getDownloadURL();
        
        const updateData = {};
        if (currentDocType === 'tor') {
            updateData.torFile = downloadUrl;
            updateData.torStatus = 'uploaded';
        } else {
            updateData.goodMoralFile = downloadUrl;
            updateData.goodMoralStatus = 'uploaded';
        }
        
        await applicationsRef.child(currentApplication.id).update(updateData);
        showDocumentMessage('Document uploaded successfully!', 'success');
        loadStudentData();
    } catch (error) {
        showDocumentMessage('Upload failed: ' + error.message, 'error');
    }
});

// AUTH STATE LISTENER
auth.onAuthStateChanged(async (user) => {
    console.log("Auth state changed:", user ? "Logged in" : "Logged out");
    
    if (user) {
        currentUser = user;
        document.getElementById('authSection').style.display = 'none';
        document.getElementById('studentPortal').style.display = 'block';
        document.getElementById('logoutBtn').style.display = 'block';
        
        await loadStudentData();
        
    } else {
        currentUser = null;
        document.getElementById('authSection').style.display = 'block';
        document.getElementById('studentPortal').style.display = 'none';
        document.getElementById('logoutBtn').style.display = 'none';
    }
});

async function loadStudentData() {
    // Get user data
    const userData = await usersRef.child(currentUser.uid).once('value');
    const userName = userData.val()?.name || 'Student';
    document.getElementById('profileName').innerText = userName;
    document.getElementById('welcomeName').innerText = userName;
    
    // Get application data
    const userApp = await applicationsRef.orderByChild('userId').equalTo(currentUser.uid).once('value');
    
    if (userApp.exists()) {
        userApp.forEach(snap => {
            currentApplication = snap.val();
            currentApplication.id = snap.key;
        });
        
        // Update profile
        document.getElementById('profileLevel').innerText = `${currentApplication.educationLevel || ''} ${currentApplication.yearLevel || ''}`;
        const statusSpan = document.getElementById('profileStatus');
        statusSpan.innerText = currentApplication.status === 'approved' ? 'APPROVED' : 'PENDING';
        statusSpan.className = `profile-status ${currentApplication.status === 'approved' ? 'status-approved' : 'status-pending'}`;
        
        // Update dashboard
        document.getElementById('dashboardInfo').innerHTML = `
            <div class="enrollment-summary">
                <p><strong>Application Status:</strong> ${currentApplication.status === 'approved' ? '✅ Approved' : '⏳ Pending Review'}</p>
                <p><strong>Education Level:</strong> ${currentApplication.educationLevel || 'Not set'}</p>
                <p><strong>Year Level:</strong> ${currentApplication.yearLevel || 'Not set'}</p>
                <p><strong>Strand/Course:</strong> ${currentApplication.strandCourse || 'Not set'}</p>
                <p><strong>Enrollment Date:</strong> ${new Date(currentApplication.enrollmentDate).toLocaleDateString()}</p>
            </div>
        `;
        
        // Load grades if approved
        if (currentApplication.status === 'approved') {
            loadGrades();
        } else {
            document.getElementById('gradesList').innerHTML = '<p>Grades will be available once your application is approved.</p>';
        }
        
        // Update document status
        const torStatus = document.getElementById('torStatus');
        const moralStatus = document.getElementById('moralStatus');
        if (currentApplication.torFile) {
            torStatus.innerText = 'Uploaded';
            torStatus.className = 'document-status doc-uploaded';
        }
        if (currentApplication.goodMoralFile) {
            moralStatus.innerText = 'Uploaded';
            moralStatus.className = 'document-status doc-uploaded';
        }
        
        // Update payment info
        document.getElementById('paymentInfo').innerHTML = `
            <div class="enrollment-summary">
                <p><strong>Total Tuition Fee:</strong> ₱${(currentApplication.totalFee || 0).toLocaleString()}</p>
                <p><strong>Payment Method:</strong> ${currentApplication.paymentMethod === 'full' ? 'Full Payment' : (currentApplication.paymentMethod === 'installment' ? 'Installment (3 payments)' : 'School Pay Later')}</p>
                <p><strong>Payment Status:</strong> Pending</p>
            </div>
        `;
        
        // If application is pending, show enrollment tab but disable?
        if (currentApplication.status !== 'approved') {
            // Still allow enrollment tab to show but maybe with message
        }
        
    } else {
        // No application yet - show enrollment tab as active
        document.getElementById('profileLevel').innerText = 'Not Enrolled';
        document.getElementById('dashboardInfo').innerHTML = '<p>You haven\'t submitted an enrollment application yet. Please go to the Enrollment tab to register.</p>';
        document.getElementById('gradesList').innerHTML = '<p>Complete enrollment first to see grades.</p>';
        
        // Auto-switch to enrollment tab
        document.querySelector('.nav-item[data-tab="enrollment"]').click();
    }
}

async function loadGrades() {
    const grades = await gradesRef.orderByChild('studentId').equalTo(currentUser.uid).once('value');
    const studentGrades = [];
    grades.forEach(snap => {
        studentGrades.push(snap.val());
    });
    
    if (studentGrades.length > 0) {
        let passed = 0, failed = 0;
        let gradesHtml = '<div class="grade-item" style="background:#f8f9fa; font-weight:bold;"><div>Subject</div><div>Numerical</div><div>Letter</div><div>Remarks</div></div>';
        
        studentGrades.forEach(grade => {
            gradesHtml += `
                <div class="grade-item">
                    <div class="grade-subject">${grade.subject}</div>
                    <div class="grade-score">${grade.numericalGrade}%</div>
                    <div>${grade.letterGrade}</div>
                    <div class="${grade.remarks === 'PASSED' ? 'grade-pass' : 'grade-fail'}">${grade.remarks}</div>
                </div>
            `;
            if (grade.remarks === 'PASSED') passed++;
            else failed++;
        });
        
        document.getElementById('gradesList').innerHTML = gradesHtml;
        document.getElementById('gradeSummary').innerHTML = `
            <div class="enrollment-summary">
                <p><strong>Summary:</strong> Passed: ${passed} | Failed: ${failed}</p>
                <p><strong>Academic Status:</strong> ${failed > 0 ? 'IRREGULAR' : 'REGULAR'}</p>
            </div>
        `;
    } else {
        document.getElementById('gradesList').innerHTML = '<p>No grades available yet.</p>';
    }
}

// Login form
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        await auth.signInWithEmailAndPassword(email, password);
        showLoginMessage('Login successful!', 'success');
        document.getElementById('loginForm').reset();
    } catch (error) {
        showLoginMessage(error.message, 'error');
    }
});

// Register form
document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    
    if (password !== confirmPassword) {
        showRegisterMessage('Passwords do not match!', 'error');
        return;
    }
    
    try {
        showRegisterMessage('Creating account...', 'success');
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        await usersRef.child(userCredential.user.uid).set({
            name: name,
            email: email,
            createdAt: Date.now()
        });
        showRegisterMessage('Registration successful!', 'success');
        document.getElementById('registerForm').reset();
    } catch (error) {
        showRegisterMessage(error.message, 'error');
    }
});

// Logout
document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await auth.signOut();
    location.reload();
});

// Enrollment form submission
document.getElementById('enrollmentForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!currentUser) {
        showEnrollmentMessage('Please login first', 'error');
        return;
    }
    
    const selectedSubjects = [];
    currentSubjects.forEach((subject, index) => {
        const checkbox = document.getElementById(`subj_${index}`);
        if (checkbox && checkbox.checked) {
            selectedSubjects.push(subject);
        }
    });
    
    const paymentMethod = document.getElementById('paymentMethod')?.value || 'full';
    
    const applicationData = {
        userId: currentUser.uid,
        fullName: document.getElementById('fullName').value.trim(),
        dob: document.getElementById('dob').value,
        gender: document.getElementById('gender').value,
        email: document.getElementById('email').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        educationLevel: document.getElementById('educationLevel').value,
        yearLevel: document.getElementById('yearLevel').value,
        strandCourse: document.getElementById('strandCourse').value,
        address: document.getElementById('address').value.trim(),
        parentName: document.getElementById('parentName').value.trim(),
        parentPhone: document.getElementById('parentPhone').value.trim(),
        previousSchool: document.getElementById('previousSchool').value,
        studentType: document.getElementById('studentType').value,
        selectedSubjects: selectedSubjects,
        paymentMethod: paymentMethod,
        totalFee: totalFee,
        enrollmentDate: Date.now(),
        status: 'pending',
        applicationStatus: 'Pending Review'
    };
    
    if (!applicationData.fullName || !applicationData.email) {
        showEnrollmentMessage('Please fill in all required fields', 'error');
        return;
    }
    
    try {
        await applicationsRef.push().set(applicationData);
        showEnrollmentMessage('✅ Enrollment submitted successfully!', 'success');
        setTimeout(() => location.reload(), 2000);
    } catch (error) {
        showEnrollmentMessage('❌ Error: ' + error.message, 'error');
    }
});

// Event listeners for dynamic form
const educationLevelSelect = document.getElementById('educationLevel');
if (educationLevelSelect) {
    educationLevelSelect.addEventListener('change', () => {
        updateYearLevels();
        updateStrandCourse();
    });
}

const yearLevelSelect = document.getElementById('yearLevel');
if (yearLevelSelect) {
    yearLevelSelect.addEventListener('change', loadSubjects);
}

function showLoginMessage(msg, type) {
    const div = document.getElementById('loginMessage');
    if (div) {
        div.textContent = msg;
        div.className = `message ${type}`;
        setTimeout(() => div.className = 'message', 5000);
    }
}

function showRegisterMessage(msg, type) {
    const div = document.getElementById('registerMessage');
    if (div) {
        div.textContent = msg;
        div.className = `message ${type}`;
        setTimeout(() => div.className = 'message', 5000);
    }
}

function showEnrollmentMessage(msg, type) {
    const div = document.getElementById('enrollmentMessage');
    if (div) {
        div.textContent = msg;
        div.className = `message ${type}`;
        setTimeout(() => div.className = 'message', 5000);
    }
}

function showDocumentMessage(msg, type) {
    const div = document.getElementById('documentMessage');
    if (div) {
        div.textContent = msg;
        div.className = `message ${type}`;
        setTimeout(() => div.className = 'message', 5000);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    updateYearLevels();
    updateStrandCourse();
    
    const firstPaymentMethod = document.querySelector('.payment-method');
    if (firstPaymentMethod) {
        firstPaymentMethod.classList.add('selected');
        const paymentMethodInput = document.getElementById('paymentMethod');
        if (paymentMethodInput) {
            paymentMethodInput.value = firstPaymentMethod.dataset.method;
        }
        updatePaymentDetails();
    }
});
