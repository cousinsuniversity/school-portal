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

// Custom Toast Notification System
function showToast(message, type = 'success') {
    // Remove existing toast
    const existingToast = document.querySelector('.custom-toast');
    if (existingToast) existingToast.remove();
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `custom-toast toast-${type}`;
    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : (type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle')}" style="font-size: 24px;"></i>
            <span>${message}</span>
        </div>
        <button class="toast-close" style="background: none; border: none; color: white; font-size: 20px; cursor: pointer;">&times;</button>
    `;
    
    // Add styles
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#28a745' : (type === 'error' ? '#dc3545' : '#17a2b8')};
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 15px;
        min-width: 300px;
        max-width: 450px;
        animation: slideIn 0.3s ease;
        font-family: 'Segoe UI', sans-serif;
    `;
    
    // Add animation styles if not present
    if (!document.querySelector('#toast-styles')) {
        const style = document.createElement('style');
        style.id = 'toast-styles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
            .custom-toast {
                cursor: pointer;
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(toast);
    
    // Close button functionality
    toast.querySelector('.toast-close').onclick = () => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    };
    
    // Auto close after 5 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }
    }, 5000);
    
    // Click to close
    toast.onclick = (e) => {
        if (e.target !== toast.querySelector('.toast-close')) {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }
    };
}

// Wait for DOM to be fully loaded before setting up event listeners
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM fully loaded - setting up event listeners");
    
    // Tab navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
            const tabId = this.dataset.tab;
            document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
            const targetTab = document.getElementById(`${tabId}Tab`);
            if (targetTab) targetTab.classList.add('active');
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
        const levelSelect = document.getElementById('educationLevel');
        if (!levelSelect) return;
        const config = TUITION_FEES[levelSelect.value] || TUITION_FEES.College;
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
    
    // Set initial payment method
    const firstPaymentMethod = document.querySelector('.payment-method');
    if (firstPaymentMethod) {
        firstPaymentMethod.classList.add('selected');
        const paymentMethodInput = document.getElementById('paymentMethod');
        if (paymentMethodInput) {
            paymentMethodInput.value = firstPaymentMethod.dataset.method;
        }
        updatePaymentDetails();
    }
    
    // Education level change handler
    const educationLevelSelect = document.getElementById('educationLevel');
    if (educationLevelSelect) {
        educationLevelSelect.addEventListener('change', function() {
            updateYearLevels();
            updateStrandCourse();
        });
    }
    
    // Year level change handler
    const yearLevelSelect = document.getElementById('yearLevel');
    if (yearLevelSelect) {
        yearLevelSelect.addEventListener('change', function() {
            loadSubjects();
        });
    }
    
    // Initialize
    updateYearLevels();
    updateStrandCourse();
    
    // Document upload handlers
    const uploadTorBtn = document.getElementById('uploadTorBtn');
    if (uploadTorBtn) {
        uploadTorBtn.addEventListener('click', () => {
            currentDocType = 'tor';
            const docUpload = document.getElementById('docUpload');
            if (docUpload) docUpload.click();
        });
    }
    
    const uploadMoralBtn = document.getElementById('uploadMoralBtn');
    if (uploadMoralBtn) {
        uploadMoralBtn.addEventListener('click', () => {
            currentDocType = 'moral';
            const docUpload = document.getElementById('docUpload');
            if (docUpload) docUpload.click();
        });
    }
    
    const docUpload = document.getElementById('docUpload');
    if (docUpload) {
        docUpload.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file || !currentUser || !currentApplication) return;
            
            try {
                showToast('Uploading document...', 'info');
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
                showToast('Document uploaded successfully!', 'success');
                loadStudentData();
            } catch (error) {
                showToast('Upload failed: ' + error.message, 'error');
            }
        });
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
                showToast('Login successful!', 'success');
                document.getElementById('loginForm').reset();
            } catch (error) {
                showToast(error.message, 'error');
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
                showToast('Passwords do not match!', 'error');
                return;
            }
            
            try {
                showToast('Creating account...', 'info');
                const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                await usersRef.child(userCredential.user.uid).set({
                    name: name,
                    email: email,
                    createdAt: Date.now()
                });
                showToast('Registration successful! You are now logged in.', 'success');
                document.getElementById('registerForm').reset();
            } catch (error) {
                showToast(error.message, 'error');
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
    
    // ENROLLMENT FORM SUBMISSION - FIXED with proper message div
    const enrollmentForm = document.getElementById('enrollmentForm');
    if (enrollmentForm) {
        enrollmentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log("Enrollment form submitted");
            
            if (!currentUser) {
                showToast('Please login first', 'error');
                return;
            }
            
            // Check if user already has an application
            if (currentApplication) {
                showToast('You have already submitted an application. Please wait for approval.', 'error');
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
            
            const paymentMethod = document.getElementById('paymentMethod')?.value || 'full';
            
            // Get form values
            const fullName = document.getElementById('fullName')?.value.trim();
            const dob = document.getElementById('dob')?.value;
            const gender = document.getElementById('gender')?.value;
            const email = document.getElementById('email')?.value.trim();
            const phone = document.getElementById('phone')?.value.trim();
            const educationLevel = document.getElementById('educationLevel')?.value;
            const yearLevel = document.getElementById('yearLevel')?.value;
            const strandCourse = document.getElementById('strandCourse')?.value;
            const address = document.getElementById('address')?.value.trim();
            const parentName = document.getElementById('parentName')?.value.trim();
            const parentPhone = document.getElementById('parentPhone')?.value.trim();
            const previousSchool = document.getElementById('previousSchool')?.value;
            const studentType = document.getElementById('studentType')?.value;
            
            if (!fullName || !email) {
                showToast('Please fill in all required fields', 'error');
                return;
            }
            
            const applicationData = {
                userId: currentUser.uid,
                fullName: fullName,
                dob: dob,
                gender: gender,
                email: email,
                phone: phone,
                educationLevel: educationLevel,
                yearLevel: yearLevel,
                strandCourse: strandCourse,
                address: address,
                parentName: parentName,
                parentPhone: parentPhone,
                previousSchool: previousSchool || '',
                studentType: studentType || 'New Student',
                selectedSubjects: selectedSubjects,
                paymentMethod: paymentMethod,
                totalFee: totalFee,
                enrollmentDate: Date.now(),
                status: 'pending',
                applicationStatus: 'Pending Review',
                createdAt: new Date().toISOString()
            };
            
            console.log("Submitting application:", applicationData);
            
            try {
                const newAppRef = applicationsRef.push();
                await newAppRef.set(applicationData);
                console.log("Application saved with ID:", newAppRef.key);
                
                // Show success toast
                showToast('✅ Enrollment submitted successfully! Your application is pending review.', 'success');
                
                // Reset form
                enrollmentForm.reset();
                
                // Reload student data to show pending status
                await loadStudentData();
                
                // Switch to dashboard tab
                setTimeout(() => {
                    const dashboardNav = document.querySelector('.nav-item[data-tab="dashboard"]');
                    if (dashboardNav) dashboardNav.click();
                }, 1500);
                
            } catch (error) {
                console.error('Error saving application:', error);
                showToast('❌ Error: ' + error.message, 'error');
            }
        });
    }
});

// AUTH STATE LISTENER
auth.onAuthStateChanged(async (user) => {
    console.log("Auth state changed:", user ? "Logged in" : "Logged out");
    
    if (user) {
        currentUser = user;
        const authSection = document.getElementById('authSection');
        const studentPortal = document.getElementById('studentPortal');
        const logoutBtn = document.getElementById('logoutBtn');
        
        if (authSection) authSection.style.display = 'none';
        if (studentPortal) studentPortal.style.display = 'block';
        if (logoutBtn) logoutBtn.style.display = 'block';
        
        await loadStudentData();
        
    } else {
        currentUser = null;
        currentApplication = null;
        const authSection = document.getElementById('authSection');
        const studentPortal = document.getElementById('studentPortal');
        const logoutBtn = document.getElementById('logoutBtn');
        
        if (authSection) authSection.style.display = 'block';
        if (studentPortal) studentPortal.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'none';
    }
});

async function loadStudentData() {
    console.log("Loading student data for user:", currentUser?.uid);
    
    // Get user data
    const userData = await usersRef.child(currentUser.uid).once('value');
    const userName = userData.val()?.name || 'Student';
    const profileName = document.getElementById('profileName');
    const welcomeName = document.getElementById('welcomeName');
    if (profileName) profileName.innerText = userName;
    if (welcomeName) welcomeName.innerText = userName;
    
    // Get application data
    const userApp = await applicationsRef.orderByChild('userId').equalTo(currentUser.uid).once('value');
    
    if (userApp.exists()) {
        userApp.forEach(snap => {
            currentApplication = snap.val();
            currentApplication.id = snap.key;
        });
        
        console.log("Found application:", currentApplication);
        
        // Update profile
        const profileLevel = document.getElementById('profileLevel');
        const profileStatus = document.getElementById('profileStatus');
        if (profileLevel) profileLevel.innerText = `${currentApplication.educationLevel || ''} ${currentApplication.yearLevel || ''}`;
        if (profileStatus) {
            if (currentApplication.status === 'approved') {
                profileStatus.innerText = 'APPROVED';
                profileStatus.className = 'profile-status status-approved';
            } else if (currentApplication.status === 'pending') {
                profileStatus.innerText = 'PENDING REVIEW';
                profileStatus.className = 'profile-status status-pending';
            } else {
                profileStatus.innerText = currentApplication.status.toUpperCase();
                profileStatus.className = 'profile-status status-pending';
            }
        }
        
        // Update dashboard based on status - KEEP THE MESSAGE DIV INTACT
        const dashboardInfo = document.getElementById('dashboardInfo');
        if (dashboardInfo) {
            if (currentApplication.status === 'approved') {
                dashboardInfo.innerHTML = `
                    <div class="enrollment-summary" style="background: #d4edda; border-left: 4px solid #28a745; padding: 20px; border-radius: 10px;">
                        <p><strong>✅ Application Status:</strong> APPROVED</p>
                        <p><strong>Education Level:</strong> ${currentApplication.educationLevel || 'Not set'}</p>
                        <p><strong>Year Level:</strong> ${currentApplication.yearLevel || 'Not set'}</p>
                        <p><strong>Strand/Course:</strong> ${currentApplication.strandCourse || 'Not set'}</p>
                        <p><strong>Enrollment Date:</strong> ${new Date(currentApplication.enrollmentDate).toLocaleDateString()}</p>
                        <p style="color: #28a745; margin-top: 10px;">You are now officially enrolled! Check your grades tab for academic performance.</p>
                    </div>
                `;
            } else if (currentApplication.status === 'pending') {
                dashboardInfo.innerHTML = `
                    <div class="enrollment-summary" style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; border-radius: 10px;">
                        <p><strong>⏳ Application Status:</strong> PENDING REVIEW</p>
                        <p><strong>Education Level:</strong> ${currentApplication.educationLevel || 'Not set'}</p>
                        <p><strong>Year Level:</strong> ${currentApplication.yearLevel || 'Not set'}</p>
                        <p><strong>Strand/Course:</strong> ${currentApplication.strandCourse || 'Not set'}</p>
                        <p><strong>Enrollment Date:</strong> ${new Date(currentApplication.enrollmentDate).toLocaleDateString()}</p>
                        <p style="color: #856404; margin-top: 10px;">We are reviewing your application. Please wait for approval.</p>
                    </div>
                `;
            }
        }
        
        // Update enrollment tab - show message instead of form, BUT PRESERVE MESSAGE DIV
        const enrollmentTab = document.getElementById('enrollmentTab');
        if (enrollmentTab) {
            if (currentApplication.status === 'pending') {
                enrollmentTab.innerHTML = `
                    <div class="card">
                        <h3><i class="fas fa-clock"></i> Application Pending</h3>
                        <div class="enrollment-summary" style="background: #fff3cd; text-align: center; padding: 40px; border-radius: 10px;">
                            <i class="fas fa-hourglass-half" style="font-size: 48px; color: #ffc107; margin-bottom: 20px;"></i>
                            <h3>Your application is being reviewed</h3>
                            <p>You have already submitted an enrollment application. Please wait for admin approval.</p>
                            <p><strong>Application Status:</strong> Pending Review</p>
                            <p><strong>Submitted on:</strong> ${new Date(currentApplication.enrollmentDate).toLocaleDateString()}</p>
                        </div>
                    </div>
                `;
            } else if (currentApplication.status === 'approved') {
                enrollmentTab.innerHTML = `
                    <div class="card">
                        <h3><i class="fas fa-check-circle"></i> Enrollment Complete</h3>
                        <div class="enrollment-summary" style="background: #d4edda; text-align: center; padding: 40px; border-radius: 10px;">
                            <i class="fas fa-check-circle" style="font-size: 48px; color: #28a745; margin-bottom: 20px;"></i>
                            <h3>You are officially enrolled!</h3>
                            <p>Your application has been approved. You can now view your grades and documents.</p>
                            <p><strong>Academic Status:</strong> Regular</p>
                        </div>
                    </div>
                `;
            }
        }
        
        // Load grades if approved
        if (currentApplication.status === 'approved') {
            await loadGrades();
        } else {
            const gradesList = document.getElementById('gradesList');
            if (gradesList) gradesList.innerHTML = '<p>Grades will be available once your application is approved.</p>';
        }
        
        // Update document status
        const torStatus = document.getElementById('torStatus');
        const moralStatus = document.getElementById('moralStatus');
        if (torStatus) {
            if (currentApplication.torFile) {
                torStatus.innerText = 'Uploaded';
                torStatus.className = 'document-status doc-uploaded';
            }
        }
        if (moralStatus) {
            if (currentApplication.goodMoralFile) {
                moralStatus.innerText = 'Uploaded';
                moralStatus.className = 'document-status doc-uploaded';
            }
        }
        
        // Update payment info
        const paymentInfo = document.getElementById('paymentInfo');
        if (paymentInfo) {
            paymentInfo.innerHTML = `
                <div class="enrollment-summary" style="padding: 20px; border-radius: 10px; background: #f8f9fa;">
                    <p><strong>Total Tuition Fee:</strong> ₱${(currentApplication.totalFee || 0).toLocaleString()}</p>
                    <p><strong>Payment Method:</strong> ${currentApplication.paymentMethod === 'full' ? 'Full Payment (10% discount)' : (currentApplication.paymentMethod === 'installment' ? 'Installment (3 payments)' : 'School Pay Later')}</p>
                    <p><strong>Payment Status:</strong> Pending</p>
                </div>
            `;
        }
        
    } else {
        console.log("No application found for user");
        currentApplication = null;
        const profileLevel = document.getElementById('profileLevel');
        const dashboardInfo = document.getElementById('dashboardInfo');
        const gradesList = document.getElementById('gradesList');
        
        if (profileLevel) profileLevel.innerText = 'Not Enrolled';
        if (dashboardInfo) dashboardInfo.innerHTML = '<p>You haven\'t submitted an enrollment application yet. Please go to the Enrollment tab to register.</p>';
        if (gradesList) gradesList.innerHTML = '<p>Complete enrollment first to see grades.</p>';
        
        // Make sure enrollment form is visible in the tab
        const enrollmentTab = document.getElementById('enrollmentTab');
        if (enrollmentTab) {
            // Check if we need to restore the form
            const existingForm = enrollmentTab.querySelector('#enrollmentForm');
            if (!existingForm) {
                // Form was replaced, but we need to keep the original HTML
                // The original HTML already has the form, so no action needed
                console.log("Enrollment form should be visible");
            }
        }
        
        // Auto-switch to enrollment tab
        const enrollmentNav = document.querySelector('.nav-item[data-tab="enrollment"]');
        if (enrollmentNav) enrollmentNav.click();
    }
}

async function loadGrades() {
    const grades = await gradesRef.orderByChild('studentId').equalTo(currentUser.uid).once('value');
    const studentGrades = [];
    grades.forEach(snap => {
        studentGrades.push(snap.val());
    });
    
    const gradesList = document.getElementById('gradesList');
    const gradeSummary = document.getElementById('gradeSummary');
    
    if (studentGrades.length > 0) {
        let passed = 0, failed = 0;
        let gradesHtml = '<div style="background:#f8f9fa; font-weight:bold; padding:10px; display:flex; justify-content:space-between; border-radius:8px; margin-bottom:10px;"><div style="flex:2">Subject</div><div style="flex:1">Numerical</div><div style="flex:1">Letter</div><div style="flex:1">Remarks</div></div>';
        
        studentGrades.forEach(grade => {
            gradesHtml += `
                <div style="padding:10px; border-bottom:1px solid #eee; display:flex; justify-content:space-between;">
                    <div style="flex:2"><strong>${grade.subject}</strong></div>
                    <div style="flex:1">${grade.numericalGrade}%</div>
                    <div style="flex:1">${grade.letterGrade}</div>
                    <div style="flex:1" class="${grade.remarks === 'PASSED' ? 'grade-pass' : 'grade-fail'}">${grade.remarks}</div>
                </div>
            `;
            if (grade.remarks === 'PASSED') passed++;
            else failed++;
        });
        
        if (gradesList) gradesList.innerHTML = gradesHtml;
        if (gradeSummary) {
            gradeSummary.innerHTML = `
                <div class="enrollment-summary" style="margin-top:20px; padding: 20px; border-radius: 10px; background: #f8f9fa;">
                    <p><strong>Summary:</strong> Passed: ${passed} | Failed: ${failed}</p>
                    <p><strong>Academic Status:</strong> ${failed > 0 ? 'IRREGULAR' : 'REGULAR'}</p>
                    <p><strong>GPA:</strong> ${calculateGPA(studentGrades)}</p>
                </div>
            `;
        }
    } else {
        if (gradesList) gradesList.innerHTML = '<p>No grades available yet. Check back after approval.</p>';
    }
}

function calculateGPA(grades) {
    if (grades.length === 0) return 'N/A';
    let total = 0;
    grades.forEach(g => {
        const grade = g.letterGrade;
        if (grade === 'A' || grade === '1.0') total += 4.0;
        else if (grade === 'B' || grade === '1.25') total += 3.5;
        else if (grade === 'C' || grade === '1.5') total += 3.0;
        else if (grade === 'D' || grade === '1.75') total += 2.5;
        else if (grade === '2.0') total += 2.0;
        else if (grade === '2.25') total += 1.5;
        else if (grade === '2.5' || grade === '3.0') total += 1.0;
        else total += 0;
    });
    return (total / grades.length).toFixed(2);
}
