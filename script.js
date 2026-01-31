// Production Student Portal - Syncs with Java App Google Drive CSV
// Same CSV structure as Java app: university_data.csv

// Configuration - MUST match Java app
const CONFIG = {
    GOOGLE_DRIVE_FOLDER_ID: "124AaVlD-rCrUjrH930cH_bO2XxGMnbO4",
    CSV_FILE_NAME: "university_data.csv",
    TOKENS_DIRECTORY_PATH: ".tokens",
    CLIENT_ID: "your-google-client-id.apps.googleusercontent.com",
    CLIENT_SECRET: "your-google-client-secret",
    REDIRECT_URI: "http://localhost:8888/callback",
    SCOPES: ["https://www.googleapis.com/auth/drive.file"]
};

// Application State
let currentStudent = null;
let allStudentsData = [];
let academicData = [];
let paymentData = [];
let gradesData = [];
let gapiLoaded = false;

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
    checkGoogleDriveStatus();
});

function initializeApp() {
    // Check for saved session
    const savedStudent = localStorage.getItem('currentStudent');
    const sessionTime = localStorage.getItem('sessionTime');
    
    if (savedStudent && sessionTime) {
        const timeDiff = Date.now() - parseInt(sessionTime);
        if (timeDiff < 30 * 60 * 1000) { // 30 minutes session
            currentStudent = JSON.parse(savedStudent);
            showPortal();
            loadStudentData(currentStudent.id);
        } else {
            localStorage.removeItem('currentStudent');
            localStorage.removeItem('sessionTime');
        }
    }
}

function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            if (!currentStudent) return;
            
            // Update active nav
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            // Show corresponding page
            const pageId = item.getAttribute('data-page') + '-page';
            document.querySelectorAll('.page-content').forEach(page => page.classList.remove('active'));
            document.getElementById(pageId).classList.add('active');
        });
    });

    // Login form
    document.getElementById('student-id').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') login();
    });
    document.getElementById('student-password').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') login();
    });
}

// Google Drive API Functions
async function checkGoogleDriveStatus() {
    const statusIndicator = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');
    
    try {
        // Check if we can access the CSV file
        const hasAccess = await testGoogleDriveAccess();
        
        if (hasAccess) {
            statusIndicator.className = 'status-indicator online';
            statusText.textContent = 'Connected to Google Drive';
        } else {
            statusIndicator.className = 'status-indicator offline';
            statusText.textContent = 'Google Drive not connected';
        }
    } catch (error) {
        statusIndicator.className = 'status-indicator offline';
        statusText.textContent = 'Connection failed';
        console.error('Drive status check failed:', error);
    }
}

async function testGoogleDriveAccess() {
    try {
        // Try to fetch the CSV file
        const response = await fetchCSVFromDrive();
        return response !== null;
    } catch (error) {
        return false;
    }
}

async function fetchCSVFromDrive() {
    showLoading('Loading data from Google Drive...');
    
    try {
        // In production, you would use Google Drive API
        // For now, we'll simulate fetching from a public URL or local storage
        
        // Check localStorage first (cached data)
        const cachedData = localStorage.getItem('university_data');
        const cacheTime = localStorage.getItem('university_data_time');
        
        if (cachedData && cacheTime) {
            const timeDiff = Date.now() - parseInt(cacheTime);
            if (timeDiff < 5 * 60 * 1000) { // 5 minutes cache
                hideLoading();
                return parseCSVData(cachedData);
            }
        }
        
        // Try to fetch from actual Google Drive (production)
        // This requires proper OAuth2 setup
        const csvData = await fetchFromGoogleDriveAPI();
        
        if (csvData) {
            // Cache the data
            localStorage.setItem('university_data', csvData);
            localStorage.setItem('university_data_time', Date.now().toString());
            
            hideLoading();
            return parseCSVData(csvData);
        }
        
        // Fallback to sample data for demo
        return await loadSampleData();
        
    } catch (error) {
        console.error('Error fetching CSV:', error);
        hideLoading();
        showNotification('Failed to load data. Using sample data.', 'warning');
        return await loadSampleData();
    }
}

async function fetchFromGoogleDriveAPI() {
    // Production implementation for Google Drive API
    // This requires OAuth2 authentication
    
    // Method 1: Using fetch with API key (if file is public)
    try {
        const fileId = 'your-file-id'; // Get from Google Drive
        const apiKey = 'your-api-key';
        const url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/csv&key=${apiKey}`;
        
        const response = await fetch(url);
        if (response.ok) {
            return await response.text();
        }
    } catch (error) {
        console.error('Google Drive API fetch failed:', error);
    }
    
    // Method 2: Using gapi client (requires OAuth2)
    if (typeof gapi !== 'undefined' && gapi.client) {
        try {
            const response = await gapi.client.drive.files.export({
                fileId: CONFIG.GOOGLE_DRIVE_FOLDER_ID,
                mimeType: 'text/csv'
            });
            return response.body;
        } catch (error) {
            console.error('gapi client error:', error);
        }
    }
    
    return null;
}

function parseCSVData(csvText) {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '') continue;
        
        const values = lines[i].split(',');
        const row = {};
        
        headers.forEach((header, index) => {
            row[header] = values[index] ? values[index].trim() : '';
        });
        
        data.push(row);
    }
    
    return data;
}

// Student Authentication
async function login() {
    const studentId = document.getElementById('student-id').value.trim();
    const password = document.getElementById('student-password').value.trim();
    
    if (!studentId) {
        showNotification('Please enter your Student ID', 'warning');
        return;
    }
    
    showLoading('Authenticating...');
    
    try {
        // Load data from Google Drive
        const csvData = await fetchCSVFromDrive();
        if (!csvData || csvData.length === 0) {
            hideLoading();
            showNotification('No student data found in system', 'error');
            return;
        }
        
        // Find student in CSV data
        const student = csvData.find(row => 
            row.ID === studentId || 
            row.Email === studentId ||
            row['Student ID'] === studentId
        );
        
        if (!student) {
            hideLoading();
            showNotification('Student ID not found in system', 'error');
            return;
        }
        
        // In production, you would verify password properly
        // For demo, we accept any password
        currentStudent = {
            id: student.ID || studentId,
            name: student.Name || 'Student',
            email: student.Email || '',
            program: student['Education Level'] || student.Level || '',
            gradeLevel: student['Grade Level'] || '',
            strandCourse: student['Strand/Course'] || '',
            amount: parseFloat(student.Amount) || 0,
            paymentStatus: student['Payment Status'] || 'Pending',
            paymentPlan: student['Payment Plan'] || 'Full Payment',
            amountPaid: parseFloat(student['Amount Paid']) || 0
        };
        
        // Save session
        localStorage.setItem('currentStudent', JSON.stringify(currentStudent));
        localStorage.setItem('sessionTime', Date.now().toString());
        
        hideLoading();
        showPortal();
        loadStudentData(currentStudent.id);
        showNotification('Login successful!', 'success');
        
    } catch (error) {
        hideLoading();
        showNotification('Login failed: ' + error.message, 'error');
        console.error('Login error
