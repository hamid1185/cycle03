


const API_BASE_URL = 'api/admin.php'; 

// IMPORTANT: Replace '1' with the actual ID of the logged-in Admin User
const ADMIN_USER_ID = 1; 


const pendingCountEl = document.querySelector('.card-grid-dashboard .dashboard-card:nth-child(1) .card-description');
const usersCountEl = document.querySelector('.card-grid-dashboard .dashboard-card:nth-child(2) .card-description');
const artworksCountEl = document.querySelector('.card-grid-dashboard .dashboard-card:nth-child(3) .card-description');
const submissionsContainer = document.getElementById('submissionsContainer');
const userManagementContainer = document.getElementById('userManagementContainer');
const categoryListContainer = document.getElementById('categoryListContainer');
const addCategoryBtn = document.getElementById('addCategoryBtn');



async function apiRequest(action, method = 'GET', body = null) {
    const url = `${API_BASE_URL}?user_id=${ADMIN_USER_ID}&action=${action}`;
    
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
        }
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown server error' }));
            throw new Error(errorData.error || `Request failed with status ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Fetch operation failed for action '${action}':`, error.message);
        return null;
    }
}



// 1. Dashboard Stats Logic


async function fetchDashboardStats() {
    const data = await apiRequest('stats');
    
    if (data && data.success) {
        pendingCountEl.textContent = data.stats.pending;
        usersCountEl.textContent = data.stats.users;
        artworksCountEl.textContent = data.stats.artworks;
    } else {
        pendingCountEl.textContent = '...';
        usersCountEl.textContent = '...';
        artworksCountEl.textContent = '...';
    }
}


// 2. Submission Moderation Logic


function createSubmissionElement(submission) {
    const subDiv = document.createElement('div');
    subDiv.className = 'card-light-desc grid-two submission-row'; 
    subDiv.innerHTML = `
        <div class="flex-box">
            <img src="${submission.image_url || 'imgs/placeholder-art.png'}" alt="Artwork" class="image" /> 
            <div class="submission-desc">
                <strong>${submission.title || 'Untitled Artwork'}</strong>
                <p>Submitted by User ID: ${submission.user_id || 'Unknown'}</p>
            </div>
        </div>
        <div class="flex-box action-buttons">
            <button class="btn btn-approve" data-id="${submission.id}">Approve</button>
            <button class="btn btn-reject" data-id="${submission.id}">Reject</button>
        </div>
    `;
    return subDiv;
}

async function fetchPendingSubmissions() {
    submissionsContainer.innerHTML = '<p style="text-align:center;">Loading pending submissions...</p>';
    
    const data = await apiRequest('pending');
    
    submissionsContainer.innerHTML = ''; 

    if (data && data.success && data.submissions && data.submissions.length > 0) {
        pendingCountEl.textContent = data.submissions.length; 
        
        data.submissions.forEach(submission => {
            submissionsContainer.appendChild(createSubmissionElement(submission));
        });
        
        attachSubmissionListeners();
    } else {
        pendingCountEl.textContent = 0; 
        submissionsContainer.innerHTML = '<p class="empty-state">No pending submissions found.</p>';
    }
}

function attachSubmissionListeners() {
    document.querySelectorAll('.btn-approve').forEach(button => {
        button.addEventListener('click', () => handleSubmissionAction(button.dataset.id, 'approve'));
    });

    document.querySelectorAll('.btn-reject').forEach(button => {
        button.addEventListener('click', () => handleSubmissionAction(button.dataset.id, 'reject'));
    });
}

async function handleSubmissionAction(id, action) {
    if (!confirm(`Are you sure you want to ${action} submission ID ${id}?`)) {
        return;
    }
    
    const result = await apiRequest(action, 'POST', { id: id, user_id: ADMIN_USER_ID });

    if (result && result.success) {
        alert(result.message);
        fetchDashboardStats(); 
        fetchPendingSubmissions(); 
    }
}



// 3. User Management Logic


function createUserElement(user) {
    const userDiv = document.createElement('div');
    userDiv.className = 'card-light-desc grid-three user-row';
    
    const roles = ['general', 'admin', 'user', 'guest'];
    const selectOptions = roles.map(role => 
        `<option value="${role}" ${user.role === role ? 'selected' : ''}>${role.charAt(0).toUpperCase() + role.slice(1)}</option>`
    ).join('');
    
    userDiv.innerHTML = `
        <div class="flex-box">
            <img src="${user.profile_img || 'imgs/man.png'}" alt="img" class="image" />
            <div class="user-desc">${user.username || 'N/A'} (${user.email || 'N/A'})</div>
        </div>
        <div>
            <select class="role-select" data-user-id="${user.id}">
                ${selectOptions}
            </select>
        </div>
        <div>
            <button class="btn user-status-btn" data-user-id="${user.id}">Active</button>
        </div>
    `;
    return userDiv;
}

async function fetchAllUsers() {
    const headerRow = userManagementContainer.querySelector('.grid-three');
    userManagementContainer.innerHTML = ''; 
    if(headerRow) userManagementContainer.appendChild(headerRow);
    userManagementContainer.insertAdjacentHTML('beforeend', '<p style="text-align:center;">Loading users...</p>');

    const data = await apiRequest('users');

    userManagementContainer.innerHTML = '';
    if(headerRow) userManagementContainer.appendChild(headerRow);

    if (data && data.success && data.users && data.users.length > 0) {
        data.users.forEach(user => {
            userManagementContainer.appendChild(createUserElement(user));
        });
        attachUserRoleListeners();
    } else {
        userManagementContainer.insertAdjacentHTML('beforeend', '<p class="empty-state">No users found.</p>');
    }
}

function attachUserRoleListeners() {
    document.querySelectorAll('.role-select').forEach(select => {
        select.addEventListener('change', (event) => handleUpdateRole(event.target.dataset.userId, event.target.value));
    });
}

async function handleUpdateRole(userId, newRole) {
    if (!confirm(`Are you sure you want to change User ID ${userId}'s role to ${newRole}?`)) {
        return;
    }

    const result = await apiRequest('update_role', 'POST', { 
        user_id: userId, 
        role: newRole 
    });

    if (result && result.success) {
        alert(result.message);
    }
}



// 4. Category Management Logic


function createCategoryElement(category) {
    const catDiv = document.createElement('div');
    catDiv.className = 'card-light-desc flex-box justify-between category-row';
    catDiv.dataset.id = category.id;
    catDiv.innerHTML = `
        <div class="category-name-display">${category.name}</div>
        <div class="flex-box action-buttons">
            <button class="btn btn-edit-cat" data-id="${category.id}" data-name="${category.name}">Edit</button>
            <button class="btn btn-delete-cat" data-id="${category.id}">Delete</button>
        </div>
    `;
    return catDiv;
}

async function fetchCategories() {
    categoryListContainer.innerHTML = '<p style="text-align:center;">Loading categories...</p>';

    const data = await apiRequest('categories');
    
    categoryListContainer.innerHTML = ''; 

    if (data && data.success && data.categories && data.categories.length > 0) {
        data.categories.forEach(category => {
            categoryListContainer.appendChild(createCategoryElement(category));
        });
        attachCategoryListeners();
    } else {
        categoryListContainer.innerHTML = '<p class="empty-state">No categories found.</p>';
    }
}

function attachCategoryListeners() {
    addCategoryBtn.addEventListener('click', handleAddCategory);
    
    document.querySelectorAll('.btn-edit-cat').forEach(button => {
        button.addEventListener('click', (e) => handleEditCategory(e.target.dataset.id, e.target.dataset.name));
    });

    document.querySelectorAll('.btn-delete-cat').forEach(button => {
        button.addEventListener('click', (e) => handleDeleteCategory(e.target.dataset.id));
    });
}

async function handleAddCategory() {
    const name = prompt("Enter the name of the new category:");
    if (name && name.trim()) {
        const result = await apiRequest('add_category', 'POST', { 
            name: name.trim(), 
            user_id: ADMIN_USER_ID 
        });

        if (result && result.success) {
            alert(result.message);
            fetchCategories(); 
        }
    }
}

async function handleEditCategory(id, currentName) {
    const newName = prompt(`Enter the new name for category "${currentName}":`, currentName);
    
    if (newName && newName.trim() && newName.trim() !== currentName) {
        const result = await apiRequest('update_category', 'POST', { 
            id: id, 
            name: newName.trim(),
            user_id: ADMIN_USER_ID
        });

        if (result && result.success) {
            alert(result.message);
            fetchCategories(); 
        }
    }
}

async function handleDeleteCategory(id) {
    if (confirm("Are you sure you want to delete this category? This cannot be undone.")) {
        const result = await apiRequest('delete_category', 'POST', { 
            id: id, 
            user_id: ADMIN_USER_ID 
        });

        if (result && result.success) {
            alert(result.message);
            fetchCategories(); 
        }
    }
}


document.getElementById('refreshReports')?.addEventListener('click', loadReports)

// Load reports
async function loadReports() {
    try {
        const response = await fetch('api/reports.php')
        const data = await response.json()
        
        if (data.success) {
            renderReports(data.reports || [])
        }
    } catch (error) {
        console.error('Failed to load reports:', error)
    }
}

// Render reports
function renderReports(reports) {
    const container = document.getElementById('reportsContainer')
    if (!container) return

    container.innerHTML = ''

    if (reports.length === 0) {
        container.innerHTML = '<div class="no-data">No reports found</div>'
        return
    }

    reports.forEach(report => {
        const reportDiv = document.createElement('div')
        reportDiv.classList.add('card-light-desc', 'grid-four')
        reportDiv.innerHTML = `
            <div>
                <strong>Artwork ID:</strong> ${report.artwork_id}<br>
                <small>Reported by User: ${report.user_id}</small>
            </div>
            <div>
                <strong>Reason:</strong> ${report.reason}<br>
                <small>Status: ${report.status}</small>
            </div>
            <div>
                <strong>Details:</strong><br>
                <small>${report.details.substring(0, 100)}...</small>
            </div>
            <div>
                <button class="btn report-resolve" data-id="${report.id}">Resolve</button>
                <button class="btn report-delete" data-id="${report.id}">Delete</button>
            </div>
        `
        container.appendChild(reportDiv)
    })

    // Add event listeners
    document.querySelectorAll('.report-resolve').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.getAttribute('data-id')
            resolveReport(id)
        })
    })

    document.querySelectorAll('.report-delete').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.getAttribute('data-id')
            deleteReport(id)
        })
    })
}

// Resolve report
async function resolveReport(id) {
    if (!confirm('Mark this report as resolved?')) return
    
    try {
        const response = await fetch(`api/reports.php?action=resolve&id=${id}`, {
            method: 'POST'
        })
        const result = await response.json()
        
        if (result.success) {
            alert('Report marked as resolved')
            await loadReports()
        }
    } catch (error) {
        alert('Failed to resolve report')
    }
}

// Delete report
async function deleteReport(id) {
    if (!confirm('Delete this report permanently?')) return
    
    try {
        const response = await fetch(`api/reports.php?action=delete&id=${id}`, {
            method: 'DELETE'
        })
        const result = await response.json()
        
        if (result.success) {
            alert('Report deleted')
            await loadReports()
        }
    } catch (error) {
        alert('Failed to delete report')
    }
}


// --- Initialization ---

document.addEventListener('DOMContentLoaded', () => {
    fetchDashboardStats(); 
    fetchPendingSubmissions();
    fetchAllUsers(); 
    fetchCategories(); 
    loadReports()
    document.getElementById('viewAllSubmission').addEventListener('click', fetchPendingSubmissions);
});