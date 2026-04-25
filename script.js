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
let subjectsRef = database.ref('subjects');
let enrollmentsRef = database.ref('enrollments');
let paymentsRef = database.ref('payments');
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

// Education levels and strands
const STRANDS = {
    SHS: ["ABM", "STEM", "HUMSS", "GAS", "TVL"],
    College: ["BSIT", "BSCS", "BSBA", "BSEd", "BSN", "BSA"]
};

// Year level options
function updateYearLevels() {
    const level = document.getElementById('educationLevel').value;
    const yearSelect = document.getElementById('yearLevel');
    yearSelect.innerHTML = '<option value="">Select Year</option>';
    
    if (level === 'SHS') {
        yearSelect.innerHTML += '<option value="11">Grade 11</option>';
        yearSelect.innerHTML += '<option value="12">Grade 12</option>';
    } else if (level === 'College') {
        for (let i = 1; i <= 4; i++) {
            yearSelect.innerHTML += `<option value="${i}">${i}${getOrdinal(i)} Year</option>`;
        }
    }
}

function getOrdinal(n) {
    if (n === 1) return "st";
    if (n === 2) return "nd";
    if (n === 3) return "rd";
    return "th";
}

// Update strand/course options
function updateStrandCourse() {
    const level = document.getElementById('educationLevel').value;
    const strandSelect = document.getElementById('strandCourse');
    strandSelect.innerHTML = '<option value="">Select Strand/Course</option>';
    
    const options = level === 'SHS' ? STRANDS.SHS : STRANDS.College;
    options.forEach(opt => {
        strandSelect.innerHTML += `<option value="${opt}">${opt}</option>`;
    });
}

// Load subjects based on level and year
function loadSubjects() {
    const level = document.getElementById('educationLevel').value;
    const year = document.getElementById('yearLevel').value;
    
    if (!level || !year) return;
    
    let subjectKey = '';
    if (level === 'SHS') {
        subjectKey = year === '11' ? 'SHS_G11' : 'SHS_G12';
    } else {
        subjectKey = `College_Y${year}`;
    }
    
    const subjects = SUBJECTS[subjectKey] || [];
    currentSubjects = subjects;
    
    const container = document.getElementById('subjectsContainer');
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

// Calculate total fee
function calculateTotalFee() {
    const level = document.getElementById('educationLevel').value;
    const config = TUITION_FEES[level] || TUITION_FEES.College;
    const subjectCount = currentSubjects.length;
    
    totalFee = config.baseFee + (subjectCount * config.perSubject);
    document.getElementById('totalFee').innerHTML = `₱${totalFee.toLocaleString()}`;
    
    updatePaymentDetails();
}

// Update payment details based on method
function updatePaymentDetails() {
    const method = document.getElementById('paymentMethod').value;
    const details = document.getElementById('paymentDetails');
    
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
document.getElementById('torFile').addEventListener('change', function(e) {
    selectedTorFile = e.target.files[0];
    document.getElementById('torFileName').innerHTML = `<i class="fas fa-file"></i> ${selectedTorFile.name}`;
});

document.getElementById('goodMoralFile').addEventListener('change', function(e) {
    selectedGoodMoralFile = e.target.files[0];
    document.getElementById('goodMoralFileName').innerHTML = `<i class="fas fa-file"></i> ${selectedGoodMoralFile.name}`;
});

// Payment method selection
document.querySelectorAll('.payment-method').forEach(el => {
    el.addEventListener('click', function() {
        document.querySelectorAll('.payment-method').forEach(m => m.classList.remove('selected'));
        this.classList.add('selected');
        document.getElementById('paymentMethod').value = this.dataset.method;
        updatePaymentDetails();
    });
});

// Convert file to Base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Auth state listener
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        document.getElementById('authSection').style.display = 'none';
        document.getElementById('enrollmentSection').style.display = 'block';
        document.getElementById('logoutBtn').style.display = 'block';
        document.querySelector('.enrolled-list').classList.add('active');
        loadStudents();
        
        const existingApp = await applicationsRef.orderByChild('userId').equalTo(user.uid).once('value');
        if (existingApp.exists()) {
            document.getElementById('thankYouSection').style.display = 'block';
            document.getElementById('enrollmentSection').style.display = 'none';
        }
    } else {
        currentUser = null;
        document.getElementById('authSection').style.display = 'block';
        document.getElementById('enrollmentSection').style.display = 'none';
        document.getElementById('thankYouSection').style.display = 'none';
        document.getElementById('logoutBtn').style.display = 'none';
    }
});

// Login
document.getElementById('loginForm').addEventListener('submit', async (e) => {
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

// Register
document.getElementById('registerForm').addEventListener('submit', async (e) => {
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
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        await usersRef.child(userCredential.user.uid).set({
            name: name,
            email: email,
            createdAt: Date.now()
        });
        showRegisterMessage('Registration successful! You can now login.', 'success');
        document.getElementById('registerForm').reset();
    } catch (error) {
        showRegisterMessage(error.message, 'error');
    }
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', async () => {
    await auth.signOut();
    location.reload();
});

document.getElementById('backToHomeBtn').addEventListener('click', () => {
    document.getElementById('thankYouSection').style.display = 'none';
    document.getElementById('enrollmentSection').style.display = 'block';
});

// Event listeners for dynamic fields
document.getElementById('educationLevel').addEventListener('change', () => {
    updateYearLevels();
    updateStrandCourse();
});
document.getElementById('yearLevel').addEventListener('change', loadSubjects);

// Load students
function loadStudents() {
    studentsRef.once('value', (snapshot) => {
        const students = [];
        snapshot.forEach((childSnapshot) => {
            const student = childSnapshot.val();
            student.id = childSnapshot.key;
            students.push(student);
        });
        students.sort((a, b) => b.enrollmentDate - a.enrollmentDate);
        displayAllStudents(students);
    });
}

function displayAllStudents(students) {
    const studentList = document.getElementById('studentList');
    if (students.length === 0) {
        studentList.innerHTML = '<p style="text-align: center; color: #999;">No students enrolled yet.</p>';
        return;
    }
    
    studentList.innerHTML = '';
    students.slice(0, 10).forEach(student => {
        const card = document.createElement('div');
        card.className = 'student-card';
        card.innerHTML = `
            <h3>${student.fullName}</h3>
            <div class="student-details">
                <div><strong>Level:</strong> ${student.educationLevel}</div>
                <div><strong>Grade/Year:</strong> ${student.yearLevel}</div>
                <div><strong>Status:</strong> ${student.academicStatus || 'Regular'}</div>
            </div>
            <div class="status-badge ${student.status === 'Approved' ? 'status-enrolled' : 'status-pending'}">Status: ${student.status || 'Pending'}</div>
        `;
        studentList.appendChild(card);
    });
}

// Handle enrollment form submission
document.getElementById('enrollmentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!currentUser) {
        showMessage('Please login first', 'error');
        return;
    }
    
    // Get selected subjects
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
    
    const paymentMethod = document.getElementById('paymentMethod').value;
    let amountDue = totalFee;
    let paymentTerms = {};
    
    if (paymentMethod === 'full') {
        amountDue = totalFee * 0.9;
        paymentTerms = { type: 'full', discount: 10, total: amountDue };
    } else if (paymentMethod === 'installment') {
        const perPayment = Math.ceil(totalFee / 3);
        amountDue = perPayment;
        paymentTerms = { type: 'installment', payments: 3, perPayment: perPayment, total: totalFee };
    } else {
        paymentTerms = { type: 'later', total: totalFee, dueDate: 'End of Semester' };
    }
    
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
        paymentTerms: paymentTerms,
        totalFee: totalFee,
        enrollmentDate: Date.now(),
        status: 'pending',
        applicationStatus: 'Submitted',
        academicStatus: 'Regular'
    };
    
    try {
        const newAppRef = applicationsRef.push();
        await newAppRef.set(applicationData);
        
        // Save enrollment record
        const enrollmentRef = enrollmentsRef.push();
        await enrollmentRef.set({
            userId: currentUser.uid,
            applicationId: newAppRef.key,
            semester: 'Trimester 1',
            schoolYear: '2025-2026',
            subjects: selectedSubjects,
            paymentMethod: paymentMethod,
            amountPaid: 0,
            balance: amountDue,
            enrollmentDate: Date.now()
        });
        
        // Save payment record
        const paymentRef = paymentsRef.push();
        await paymentRef.set({
            userId: currentUser.uid,
            enrollmentId: enrollmentRef.key,
            amount: amountDue,
            method: paymentMethod,
            status: paymentMethod === 'later' ? 'pending' : 'unpaid',
            dueDate: paymentMethod === 'installment' ? 'Per Trimester' : (paymentMethod === 'later' ? 'End of Semester' : 'Immediate'),
            createdAt: Date.now()
        });
        
        document.getElementById('enrollmentForm').reset();
        document.getElementById('torFileName').innerHTML = '';
        document.getElementById('goodMoralFileName').innerHTML = '';
        selectedTorFile = null;
        selectedGoodMoralFile = null;
        
        document.getElementById('enrollmentSection').style.display = 'none';
        document.getElementById('thankYouSection').style.display = 'block';
        
        showMessage('✅ Enrollment submitted successfully!', 'success');
        
    } catch (error) {
        console.error('Error:', error);
        showMessage('❌ Error submitting application: ' + error.message, 'error');
    }
});

function showMessage(msg, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = msg;
    messageDiv.className = `message ${type}`;
    setTimeout(() => {
        messageDiv.className = 'message';
    }, 5000);
}

function showLoginMessage(msg, type) {
    const div = document.getElementById('loginMessage');
    div.textContent = msg;
    div.className = `message ${type}`;
    setTimeout(() => div.className = 'message', 5000);
}

function showRegisterMessage(msg, type) {
    const div = document.getElementById('registerMessage');
    div.textContent = msg;
    div.className = `message ${type}`;
    setTimeout(() => div.className = 'message', 5000);
}

// Initialize
updateYearLevels();
updateStrandCourse();
