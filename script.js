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
let studentsRef = database.ref('students');
let usersRef = database.ref('users');
let applicationsRef = database.ref('applications');
let currentUser = null;
let selectedTorFile = null;
let selectedGoodMoralFile = null;
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

// Section management functions
function showSection(sectionId) {
    const sections = ['authSection', 'enrollmentSection', 'thankYouSection', 'recentStudentsSection'];
    sections.forEach(id => {
        const section = document.getElementById(id);
        if (section) {
            if (id === sectionId) {
                section.classList.add('active');
                section.style.display = 'block';
            } else {
                section.classList.remove('active');
                section.style.display = 'none';
            }
        }
    });
}

function showEnrollmentForm() {
    showSection('enrollmentSection');
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.style.display = 'block';
}

function showAuthScreen() {
    showSection('authSection');
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.style.display = 'none';
}

function showThankYou() {
    showSection('thankYouSection');
}

function showRecentStudents() {
    showSection('recentStudentsSection');
}

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

// File upload handlers
const torFileInput = document.getElementById('torFile');
if (torFileInput) {
    torFileInput.addEventListener('change', function(e) {
        selectedTorFile = e.target.files[0];
        const torFileName = document.getElementById('torFileName');
        if (torFileName && selectedTorFile) {
            torFileName.innerHTML = `<i class="fas fa-file"></i> ${selectedTorFile.name}`;
        }
    });
}

const goodMoralFileInput = document.getElementById('goodMoralFile');
if (goodMoralFileInput) {
    goodMoralFileInput.addEventListener('change', function(e) {
        selectedGoodMoralFile = e.target.files[0];
        const goodMoralFileName = document.getElementById('goodMoralFileName');
        if (goodMoralFileName && selectedGoodMoralFile) {
            goodMoralFileName.innerHTML = `<i class="fas fa-file"></i> ${selectedGoodMoralFile.name}`;
        }
    });
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

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// AUTH STATE LISTENER - MAIN LOGIC
auth.onAuthStateChanged(async (user) => {
    console.log("Auth state changed:", user ? "Logged in: " + user.email : "Logged out");
    
    if (user) {
        currentUser = user;
        
        // Check if user has submitted an application
        const userApp = await applicationsRef.orderByChild('userId').equalTo(user.uid).once('value');
        const hasApplication = userApp.exists();
        let applicationStatus = null;
        
        if (hasApplication) {
            userApp.forEach(snap => {
                applicationStatus = snap.val().status;
            });
        }
        
        // Show appropriate screen based on application status
        if (!hasApplication) {
            // No application yet - show enrollment form
            console.log("No application found - showing enrollment form");
            showEnrollmentForm();
            // Initialize form
            updateYearLevels();
            updateStrandCourse();
            
            // Add event listeners
            const educationLevel = document.getElementById('educationLevel');
            if (educationLevel) {
                educationLevel.onchange = function() {
                    updateYearLevels();
                    updateStrandCourse();
                };
            }
            const yearLevelSelect = document.getElementById('yearLevel');
            if (yearLevelSelect) {
                yearLevelSelect.onchange = function() {
                    loadSubjects();
                };
            }
            
            // Show recent students in background
            loadStudents();
            showRecentStudents();
            
        } else if (applicationStatus === 'pending') {
            // Application pending - show thank you
            console.log("Application pending - showing thank you");
            showThankYou();
            showRecentStudents();
            
        } else if (applicationStatus === 'approved') {
            // Application approved - show grades and subjects
            console.log("Application approved - showing student dashboard");
            showStudentDashboard(user.uid);
        }
        
        // Show logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) logoutBtn.style.display = 'block';
        
    } else {
        currentUser = null;
        showAuthScreen();
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) logoutBtn.style.display = 'none';
    }
});

// Student dashboard for approved students
async function showStudentDashboard(userId) {
    showSection('recentStudentsSection');
    
    // Get student data
    const studentData = await applicationsRef.orderByChild('userId').equalTo(userId).once('value');
    let student = null;
    studentData.forEach(snap => {
        student = snap.val();
    });
    
    if (student) {
        const studentList = document.getElementById('studentList');
        if (studentList) {
            studentList.innerHTML = `
                <div class="student-card">
                    <h3>Welcome, ${student.fullName}!</h3>
                    <div class="student-details">
                        <div><strong>Status:</strong> <span style="color:green;">APPROVED</span></div>
                        <div><strong>Education Level:</strong> ${student.educationLevel}</div>
                        <div><strong>Year Level:</strong> ${student.yearLevel}</div>
                        <div><strong>Strand/Course:</strong> ${student.strandCourse}</div>
                        <div><strong>Enrollment Date:</strong> ${new Date(student.enrollmentDate).toLocaleDateString()}</div>
                    </div>
                </div>
                <h3>Your Subjects</h3>
                <div class="subjects-grid">
                    ${student.selectedSubjects.map(subj => `
                        <div class="subject-item">
                            <strong>${subj.name}</strong> (${subj.units} units)
                        </div>
                    `).join('')}
                </div>
                <h3>Your Grades (Coming Soon)</h3>
                <p>Your grades will be available here once posted by the admin.</p>
            `;
        }
    }
}

// Login form
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
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
}

// Register form
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
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
            showRegisterMessage('Registration successful! Redirecting to enrollment form...', 'success');
            document.getElementById('registerForm').reset();
            // Auth state change will handle showing enrollment form
        } catch (error) {
            console.error("Registration error:", error);
            showRegisterMessage(error.message, 'error');
        }
    });
}

// Logout
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        await auth.signOut();
        location.reload();
    });
}

// Back to home button
const backToHomeBtn = document.getElementById('backToHomeBtn');
if (backToHomeBtn) {
    backToHomeBtn.addEventListener('click', () => {
        showEnrollmentForm();
    });
}

// Load students for display
function loadStudents() {
    studentsRef.once('value', (snapshot) => {
        const students = [];
        snapshot.forEach((childSnapshot) => {
            const student = childSnapshot.val();
            student.id = childSnapshot.key;
            students.push(student);
        });
        students.sort((a, b) => b.enrollmentDate - a.enrollmentDate);
        displayRecentStudents(students);
    });
}

function displayRecentStudents(students) {
    const studentList = document.getElementById('studentList');
    if (!studentList) return;
    
    if (students.length === 0) {
        studentList.innerHTML = '<p style="text-align: center; color: #999;">No students enrolled yet. Be the first to register!</p>';
        return;
    }
    
    // Check if we're showing dashboard or just recent students
    if (studentList.innerHTML.includes('Welcome')) {
        return; // Don't override dashboard
    }
    
    studentList.innerHTML = '<h3>Recently Enrolled Students</h3>';
    students.slice(0, 5).forEach(student => {
        const card = document.createElement('div');
        card.className = 'student-card';
        card.innerHTML = `
            <h3>${student.fullName || 'N/A'}</h3>
            <div class="student-details">
                <div><strong>Grade/Level:</strong> ${student.grade || student.educationLevel || 'N/A'}</div>
                <div><strong>Status:</strong> ${student.status || 'Pending'}</div>
            </div>
        `;
        studentList.appendChild(card);
    });
}

// Handle enrollment form submission
const enrollmentForm = document.getElementById('enrollmentForm');
if (enrollmentForm) {
    enrollmentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!currentUser) {
            showMessage('Please login first', 'error');
            return;
        }
        
        const selectedSubjects = [];
        currentSubjects.forEach((subject, index) => {
            const checkbox = document.getElementById(`subj_${index}`);
            if (checkbox && checkbox.checked) {
                selectedSubjects.push(subject);
            }
        });
        
        let torBase64 = null;
        let goodMoralBase64 = null;
        
        if (selectedTorFile) {
            torBase64 = await fileToBase64(selectedTorFile);
        }
        if (selectedGoodMoralFile) {
            goodMoralBase64 = await fileToBase64(selectedGoodMoralFile);
        }
        
        const paymentMethodInput = document.getElementById('paymentMethod');
        const paymentMethod = paymentMethodInput ? paymentMethodInput.value : 'full';
        
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
            torFile: torBase64,
            goodMoralFile: goodMoralBase64,
            paymentMethod: paymentMethod,
            totalFee: totalFee,
            enrollmentDate: Date.now(),
            status: 'pending',
            applicationStatus: 'Pending Review'
        };
        
        if (!applicationData.fullName || !applicationData.email || !applicationData.phone) {
            showMessage('Please fill in all required fields', 'error');
            return;
        }
        
        try {
            await applicationsRef.push().set(applicationData);
            
            // Save to students for public display
            await studentsRef.push().set({
                fullName: applicationData.fullName,
                email: applicationData.email,
                grade: applicationData.educationLevel + " " + applicationData.yearLevel,
                enrollmentDate: applicationData.enrollmentDate,
                status: 'pending'
            });
            
            enrollmentForm.reset();
            if (document.getElementById('torFileName')) document.getElementById('torFileName').innerHTML = '';
            if (document.getElementById('goodMoralFileName')) document.getElementById('goodMoralFileName').innerHTML = '';
            selectedTorFile = null;
            selectedGoodMoralFile = null;
            
            showThankYou();
            showMessage('✅ Enrollment submitted successfully!', 'success');
            
        } catch (error) {
            console.error('Error:', error);
            showMessage('❌ Error: ' + error.message, 'error');
        }
    });
}

function showMessage(msg, type) {
    const messageDiv = document.getElementById('message');
    if (messageDiv) {
        messageDiv.textContent = msg;
        messageDiv.className = `message ${type}`;
        setTimeout(() => {
            messageDiv.className = 'message';
        }, 5000);
    }
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

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded");
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
    
    loadStudents();
    showRecentStudents();
});
