// --- GLOBAL STATE ---
let allProviders = [];

// --- DOM ELEMENTS ---
const grid = document.getElementById('providersGrid');
const cityInput = document.getElementById('cityInput');
const categorySelect = document.getElementById('categorySelect');
const seeAllContainer = document.getElementById('seeAllContainer');
const seeAllBtn = document.getElementById('seeAllBtn');
const hamburgerBtn = document.getElementById('hamburgerBtn');
const navLinks = document.getElementById('navLinks');

// User Login Elements
const userLoginView = document.getElementById('userLoginView');
const userDashboardView = document.getElementById('userDashboardView');
const userLoginForm = document.getElementById('userLoginForm');
const userProfileInfo = document.getElementById('userProfileInfo');
const userRegisterView = document.getElementById('userRegisterView');
const userRegisterForm = document.getElementById('userRegisterForm');

// Provider Dashboard Elements
const providerLoginView = document.getElementById('loginView');
const providerDashboardView = document.getElementById('dashboardView');
const providerLoginForm = document.getElementById('loginForm');
const providerLogoutBtn = document.getElementById('providerLogoutBtn');
const profileForm = document.getElementById('profileForm');
const providerRegisterView = document.getElementById('providerRegisterView');
const providerRegisterForm = document.getElementById('providerRegisterForm');
const createPostForm = document.getElementById('createPostForm');
const togglePostFormBtn = document.getElementById('togglePostFormBtn');

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // Cleanup: Remove any stale static badges that might remain in HTML
    document.querySelectorAll('.badge').forEach(badge => {
        if (badge.textContent.includes('Connecting to DB') || badge.textContent.includes('Live Status')) {
            badge.remove();
        }
    });

    // Check if user is already logged in
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
        showUserDashboard(JSON.parse(storedUser));
    }
    // Check if provider is logged in
    const storedProvider = localStorage.getItem('currentProvider');
    if (storedProvider) {
        showProviderDashboard(JSON.parse(storedProvider));
    }

    // Load providers if on marketplace page
    if (grid) fetchProviders();

    // Update Navigation based on Auth
    updateAuthUI();

    // Load Provider Details Page
    if (document.getElementById('providerDetailsContainer')) {
        loadProviderDetails();
    }

    // Attach Filter Listeners
    if (cityInput) cityInput.addEventListener('input', filterProviders);
    if (categorySelect) categorySelect.addEventListener('change', filterProviders);

    if (seeAllBtn) {
        seeAllBtn.addEventListener('click', () => {
            window.location.href = 'all-providers.html';
        });
    }

    if (hamburgerBtn && navLinks) {
        hamburgerBtn.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }

    // Load Service Details Page
    if (document.getElementById('serviceProvidersGrid')) {
        loadServiceDetails();
    }
});

// --- MARKETPLACE LOGIC ---
async function fetchProviders() {
    try {
        const res = await fetch('/api/providers');
        allProviders = await res.json();
        console.log(`Loaded ${allProviders.length} providers`);
        
        // If on Home Page (seeAllContainer exists), show limited
        if (seeAllContainer) {
            renderProviders(allProviders.slice(0, 6));
            if (allProviders.length > 6) {
                seeAllContainer.style.display = 'block';
            }
        } else {
            // If on All Providers Page, show all
            renderProviders(allProviders);
        }
    } catch (err) { console.error("Fetch Error:", err); }
}

function filterProviders() {
    const cityTerm = cityInput ? cityInput.value.toLowerCase() : '';
    const categoryTerm = categorySelect ? categorySelect.value : '';

    if (cityTerm === '' && categoryTerm === '') {
        if (seeAllContainer) {
            // Reset Home Page
            renderProviders(allProviders.slice(0, 6));
            if (allProviders.length > 6) seeAllContainer.style.display = 'block';
        } else {
            // Reset All Providers Page
            renderProviders(allProviders);
        }
        return;
    }

    const filtered = allProviders.filter(p => {
        const matchesCity = p.city.toLowerCase().includes(cityTerm);
        const matchesCategory = categoryTerm === "" || p.specialty === categoryTerm;
        return matchesCity && matchesCategory;
    });
    renderProviders(filtered);
    if (seeAllContainer) seeAllContainer.style.display = 'none';
}

function renderProviders(data) {
    if (!grid) return;
    grid.innerHTML = data.length ? '' : '<p>No professionals found.</p>';
    data.forEach((p, i) => {
        const card = document.createElement('div');
        card.className = 'card';
        card.style.animation = `fadeIn 0.5s forwards ${i * 0.1}s`;
        
        // Make card clickable
        card.style.cursor = 'pointer';
        card.onclick = (e) => {
            // Prevent navigation if clicking the book button directly
            if (e.target.tagName === 'BUTTON') return;
            if (p._id) {
                window.location.href = `provider-details.html?id=${p._id}`;
            } else {
                alert("Error: Provider ID missing");
            }
        };

        card.innerHTML = `
            <h3>${p.name}</h3>
            <span class="specialty">${p.specialty}</span>
            <div class="details"><i class="fa-solid fa-location-dot"></i> ${p.city}</div>
            <div class="details"><i class="fa-solid fa-phone"></i> ${p.phone || 'Contact for details'}</div>
            <div class="rating">⭐ ${p.rating}</div>
            <button class="book-btn" onclick="bookProvider('${p.name}', '${p.specialty}')">Book Now</button>
        `;
        grid.appendChild(card);
    });
}

window.bookProvider = async (name, specialtyArg) => {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) {
        alert("Please login to book!");
        window.location.href = 'user-login.html';
        return;
    }

    const specialty = specialtyArg || 'General';

    const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            providerName: name, 
            userEmail: user.email, 
            specialty: specialty 
        })
    });
    if (res.ok) alert(`Booking request sent to ${name}!`);
};

async function loadProviderDetails() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id')?.trim();
    
    if (!id || id === 'undefined') {
        document.getElementById('providerDetailsContainer').innerHTML = `<p style="text-align:center; color: #ff6b6b;">Error: Invalid Provider ID</p>`;
        return;
    }

    try {
        const res = await fetch(`http://localhost:3000/api/providers/${id}`);
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || "Provider not found");
        }
        
        const p = await res.json();
        const container = document.getElementById('providerDetailsContainer');
        
        container.innerHTML = `
            <div class="glass-panel" style="padding: 3rem; position: relative; overflow: hidden;">
                <div class="blob blob-1" style="opacity: 0.1; top: -50px; right: -50px;"></div>
                
                <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 2rem;">
                    <div>
                        <h1 style="font-family: var(--font-heading); font-size: 2.5rem; margin-bottom: 0.5rem;">${p.name}</h1>
                        <span class="badge" style="font-size: 1rem; padding: 0.5rem 1rem;">${p.specialty}</span>
                        <p style="margin-top: 1.5rem; color: var(--text-secondary); font-size: 1.1rem;">
                            <i class="fa-solid fa-location-dot" style="margin-right: 8px; color: var(--teal-primary);"></i> ${p.city}
                        </p>
                        <p style="margin-top: 0.5rem; color: var(--text-secondary); font-size: 1.1rem;">
                            <i class="fa-solid fa-star" style="margin-right: 8px; color: gold;"></i> ${p.rating} Rating (${p.reviews} Reviews)
                        </p>
                    </div>
                    <div style="background: rgba(255,255,255,0.5); padding: 2rem; border-radius: 16px; min-width: 250px;">
                        <h3 style="margin-bottom: 1rem;">Contact Info</h3>
                        <p style="margin-bottom: 0.5rem;"><i class="fa-solid fa-phone"></i> ${p.phone || 'N/A'}</p>
                        <p style="margin-bottom: 1.5rem;"><i class="fa-solid fa-envelope"></i> ${p.email}</p>
                        <button class="btn-primary" style="width: 100%;" onclick="bookProvider('${p.name}', '${p.specialty}')">Book Now</button>
                    </div>
                </div>
            </div>
        `;

        loadProviderPortfolio(id);
    } catch (err) {
        document.getElementById('providerDetailsContainer').innerHTML = `<p style="text-align:center; color: #ff6b6b;">Error: ${err.message}</p>`;
    }
}

async function loadServiceDetails() {
    const params = new URLSearchParams(window.location.search);
    const category = params.get('category');
    
    const serviceDescriptions = {
        'Electrician': {
            title: 'Expert Electrical Services',
            desc: 'Top-notch professionals ensuring safety and excellence. From wiring to repairs, our experienced electricians handle it all with precision.'
        },
        'Plumber': {
            title: 'Professional Plumbing Solutions',
            desc: 'Experienced workers for all your piping needs. Leak repairs, installations, and maintenance by trusted experts.'
        },
        'Carpenter': {
            title: 'Master Carpentry',
            desc: 'Custom furniture and structural repairs. Our skilled carpenters bring craftsmanship and durability to every project.'
        },
        'Painter': {
            title: 'Premium Painting Services',
            desc: 'Transform your space with vibrant colors. Our painters deliver flawless finishes and attention to detail.'
        }
    };

    if (!category || !serviceDescriptions[category]) {
        document.getElementById('serviceTitle').textContent = 'Service Not Found';
        document.getElementById('serviceDesc').textContent = 'Please select a valid service from the home page.';
        document.getElementById('serviceProvidersGrid').innerHTML = '';
        return;
    }

    // Set Text
    const info = serviceDescriptions[category];
    document.getElementById('serviceTitle').innerHTML = info.title;
    document.getElementById('serviceDesc').textContent = info.desc;
    document.getElementById('serviceCategoryName').textContent = category + 's';

    // Fetch and Filter Providers
    try {
        const res = await fetch('/api/providers');
        const all = await res.json();
        const filtered = all.filter(p => p.specialty === category);
        
        const grid = document.getElementById('serviceProvidersGrid');
        grid.innerHTML = filtered.length ? '' : '<p style="text-align:center; width:100%;">No professionals found for this category.</p>';
        
        filtered.forEach((p, i) => {
            const card = document.createElement('div');
            card.className = 'card';
            card.style.animation = `fadeIn 0.5s forwards ${i * 0.1}s`;
            card.style.cursor = 'pointer';
            card.onclick = (e) => { if (e.target.tagName !== 'BUTTON') window.location.href = `provider-details.html?id=${p._id}`; };
            card.innerHTML = `<h3>${p.name}</h3><span class="specialty">${p.specialty}</span><div class="details"><i class="fa-solid fa-location-dot"></i> ${p.city}</div><div class="details"><i class="fa-solid fa-phone"></i> ${p.phone || 'Contact for details'}</div><div class="rating">⭐ ${p.rating}</div><button class="book-btn" onclick="bookProvider('${p.name}', '${p.specialty}')">Book Now</button>`;
            grid.appendChild(card);
        });
    } catch (err) { console.error("Service Load Error:", err); }
}

// --- USER AUTH LOGIC ---
if (userLoginForm) {
    userLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // CRITICAL: Stops page reload
        const email = document.getElementById('userEmail').value;
        const password = document.getElementById('userPassword').value;

        try {
            const res = await fetch('/api/users/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (res.ok) {
                const user = await res.json();
                localStorage.setItem('currentUser', JSON.stringify(user));
                showUserDashboard(user);
            } else {
                alert("Invalid Credentials");
            }
        } catch (err) { console.error("Login Error:", err); }
    });
}

// --- USER REGISTER LOGIC ---
if (userRegisterForm) {
    userRegisterForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('regName').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;

        try {
            const res = await fetch('/api/users/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });

            if (res.ok) {
                alert("Registration successful! Please login.");
                userRegisterView.classList.add('hidden');
                userLoginView.classList.remove('hidden');
            } else {
                const data = await res.json();
                alert(data.error || "Registration failed");
            }
        } catch (err) { console.error("Reg Error:", err); }
    });
}

// --- USER VIEW TOGGLES ---
const showRegisterBtn = document.getElementById('showRegisterBtn');
const showLoginBtn = document.getElementById('showLoginBtn');

if (showRegisterBtn && userLoginView && userRegisterView) {
    showRegisterBtn.addEventListener('click', (e) => {
        e.preventDefault();
        userLoginView.classList.add('hidden');
        userRegisterView.classList.remove('hidden');
    });
    showLoginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        userRegisterView.classList.add('hidden');
        userLoginView.classList.remove('hidden');
    });
}

function updateAuthUI() {
    const user = localStorage.getItem('currentUser');
    const provider = localStorage.getItem('currentProvider');
    
    const navUser = document.getElementById('nav-user-link');
    const navProvider = document.getElementById('nav-provider-link');

    if (user) {
        if (navProvider) navProvider.style.display = 'none';
        if (navUser) {
            navUser.textContent = 'My Account';
            navUser.href = 'user-login.html';
        }
    } else if (provider) {
        if (navUser) navUser.style.display = 'none';
        if (navProvider) {
            navProvider.textContent = 'Provider Dashboard';
            navProvider.href = 'provider-dashboard.html';
        }
    }
}

async function showUserDashboard(user) {
    if (userLoginView) userLoginView.classList.add('hidden');
    if (userDashboardView) {
        userDashboardView.classList.remove('hidden');
        
        // Inject New Grid Layout
        userDashboardView.innerHTML = `
            <div class="dashboard-grid">
                <aside class="profile-sidebar">
                    <div class="profile-avatar">
                        <i class="fa-solid fa-user"></i>
                    </div>
                    <h2 style="margin-bottom: 0.5rem; font-family: var(--font-heading);">${user.name}</h2>
                    <p style="color: var(--text-secondary); margin-bottom: 1rem;">${user.email}</p>
                    <span class="badge">Verified Seeker</span>
                    
                    <!-- Edit Profile Button -->
                    <button id="toggleUserEditBtn" class="btn-secondary" style="width: 100%; margin-top: 1rem; font-size: 0.9rem;">
                        <i class="fa-solid fa-pen-to-square"></i> Edit Profile
                    </button>

                    <!-- Edit Form (Hidden) -->
                    <div id="userEditFormContainer" class="hidden" style="margin-top: 1rem; text-align: left; background: rgba(255,255,255,0.5); padding: 1rem; border-radius: 8px;">
                        <form id="userEditForm">
                            <div class="form-group" style="margin-bottom: 0.8rem;">
                                <label style="font-size: 0.8rem; margin-bottom: 0.2rem;">Full Name</label>
                                <input type="text" id="editUserName" value="${user.name}" required style="padding: 0.5rem; font-size: 0.9rem;">
                            </div>
                            <div class="form-group" style="margin-bottom: 0.8rem;">
                                <label style="font-size: 0.8rem; margin-bottom: 0.2rem;">Email</label>
                                <input type="email" id="editUserEmail" value="${user.email}" required style="padding: 0.5rem; font-size: 0.9rem;">
                            </div>
                            <button type="submit" class="btn-primary" style="padding: 0.5rem; font-size: 0.9rem; width: 100%;">Save Changes</button>
                        </form>
                    </div>

                    <div style="margin-top: 2rem; text-align: left;">
                        <p style="margin-bottom: 0.5rem; font-size: 0.9rem; color: var(--text-secondary);">
                            <i class="fa-regular fa-calendar" style="margin-right: 8px;"></i> 
                            Joined: ${new Date(user.joinedDate).toLocaleDateString()}
                        </p>
                    </div>
                    <button onclick="logoutUser()" class="btn-secondary" style="width: 100%; margin-top: 2rem;">
                        <i class="fa-solid fa-right-from-bracket"></i> Logout
                    </button>
                </aside>
                
                <section class="history-content">
                    <h3 style="font-family: var(--font-heading); margin-bottom: 1.5rem; font-size: 1.5rem;">Service History</h3>
                    <div id="bookingHistoryContainer" style="overflow-x: auto;">
                        <p>Loading history...</p>
                    </div>
                </section>
            </div>
        `;

        // Attach Event Listeners for Edit Profile
        const toggleBtn = document.getElementById('toggleUserEditBtn');
        const editContainer = document.getElementById('userEditFormContainer');
        const editForm = document.getElementById('userEditForm');

        if (toggleBtn && editContainer) {
            toggleBtn.addEventListener('click', () => {
                editContainer.classList.toggle('hidden');
                toggleBtn.innerHTML = editContainer.classList.contains('hidden') 
                    ? '<i class="fa-solid fa-pen-to-square"></i> Edit Profile' 
                    : '<i class="fa-solid fa-xmark"></i> Close';
            });
        }

        if (editForm) {
            editForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                // Check for valid session (MongoDB _id)
                if (!user || !user._id) {
                    alert("Session invalid. Please login again.");
                    logoutUser();
                    return;
                }

                const newName = document.getElementById('editUserName').value;
                const newEmail = document.getElementById('editUserEmail').value;

                try {
                    const res = await fetch(`/api/users/${user._id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: newName, email: newEmail })
                    });

                    // Try to parse JSON, fallback to text if it fails
                    let data;
                    try {
                        data = await res.json();
                    } catch (e) {
                        console.error("Non-JSON response:", e);
                        throw new Error("Server returned an invalid response.");
                    }

                    if (res.ok) {
                        localStorage.setItem('currentUser', JSON.stringify(data));
                        alert("Profile Updated Successfully!");
                        showUserDashboard(data); // Re-render dashboard
                    } else {
                        console.error("Server Error:", data);
                        alert("Update failed: " + (data.error || "Unknown error"));
                    }
                } catch (err) {
                    console.error("Update Error:", err);
                    alert("Update failed: " + err.message);
                }
            });
        }

        // Handle hash navigation (e.g. from footer "Your Orders")
        if (window.location.hash === '#history') {
            const historySection = document.querySelector('.history-content');
            if (historySection) historySection.scrollIntoView({ behavior: 'smooth' });
        }

        // Fetch User History
        try {
            const res = await fetch(`/api/user/history/${user.email}`);
            const history = await res.json();
            const container = document.getElementById('bookingHistoryContainer');
            
            if (history.length === 0) {
                container.innerHTML = '<p>No bookings found.</p>';
            } else {
                container.innerHTML = `
                    <table class="history-table">
                        <thead>
                            <tr><th>Date</th><th>Provider</th><th>Service</th><th>Status</th><th>Update</th></tr>
                        </thead>
                        <tbody>
                            ${history.map(h => `
                                <tr>
                                    <td>${new Date(h.date).toLocaleDateString()}</td>
                                    <td>${h.providerName}</td>
                                    <td>${h.specialty}</td>
                                    <td><span class="status-badge status-${h.status.toLowerCase()}">${h.status}</span></td>
                                    <td>
                                        <select onchange="updateBookingStatus('${h._id}', this.value)" style="padding: 4px; border-radius: 4px; border: 1px solid #ccc; font-size: 0.9rem;">
                                            <option value="Upcoming" ${h.status === 'Upcoming' ? 'selected disabled' : ''}>Upcoming</option>
                                            <option value="Ongoing" ${h.status === 'Ongoing' ? 'selected disabled' : ''}>Ongoing</option>
                                            <option value="Completed" ${h.status === 'Completed' ? 'selected disabled' : ''}>Completed</option>
                                        </select>
                                    </td>
                                </tr>`).join('')}
                        </tbody>
                    </table>`;
            }
        } catch (err) { console.error("History Fetch Error:", err); }
    }
}

window.updateBookingStatus = async (id, newStatus) => {
    const cleanId = String(id).trim();
    console.log(`Attempting to update booking '${cleanId}' to '${newStatus}'`);
    if (!cleanId || cleanId === 'undefined') return alert("Error: Invalid Booking ID");

    try {
        const res = await fetch(`http://localhost:3000/api/bookings/${cleanId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });

        // Check content type to avoid parsing errors
        const contentType = res.headers.get("content-type");
        let data = {};
        if (contentType && contentType.includes("application/json")) {
            data = await res.json();
        } else {
            const text = await res.text();
            throw new Error(`Server returned status ${res.status}. Response: ${text}`);
        }

        if (res.ok) {
            const user = JSON.parse(localStorage.getItem('currentUser'));
            if (user) {
                showUserDashboard(user); // Refresh UI to show new status badge
            } else {
                window.location.reload();
            }
        } else {
            console.error("Update failed:", data);
            alert(`Failed to update status: ${data.error || "Unknown error"}`);
        }
    } catch (err) { 
        console.error("Status Update Error:", err); 
        alert("Error: " + err.message);
    }
};

window.logoutUser = () => {
    localStorage.removeItem('currentUser');
    window.location.reload();
};

// --- PROVIDER AUTH LOGIC ---
if (providerLoginForm) {
    providerLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        // For demo, we simulate login or you can add a real endpoint in server.js
        // Here we just use the email as the "name" lookup or mock it
        // Assuming the server has a provider login route, but for now let's mock or use basic logic
        // Since server.js doesn't have provider login route in the snippet provided, 
        // I will assume we fetch all providers and match email (insecure but works for demo)
        
        const email = document.getElementById('loginEmail').value;
        // In a real app, use POST /api/providers/login
        const res = await fetch('/api/providers');
        const providers = await res.json();
        const provider = providers.find(p => p.email === email);

        if (provider) {
            localStorage.setItem('currentProvider', JSON.stringify(provider));
            showProviderDashboard(provider);
        } else {
            alert("Provider not found");
        }
    });

    if (providerLogoutBtn) {
        providerLogoutBtn.addEventListener('click', () => {
            localStorage.removeItem('currentProvider');
            window.location.reload();
        });
    }
}

// --- PROVIDER REGISTER LOGIC ---
if (providerRegisterForm) {
    providerRegisterForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('regProEmail').value;
        const phone = document.getElementById('regProPhone').value;
        const password = document.getElementById('regProPassword').value;

        try {
            const res = await fetch('/api/providers/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, phone, password, name: "New Provider", specialty: "General" })
            });

            if (res.ok) {
                alert("Account created! Please login.");
                providerRegisterView.classList.add('hidden');
                providerLoginView.classList.remove('hidden');
            } else {
                const data = await res.json();
                alert(data.error || "Registration failed");
            }
        } catch (err) { console.error("Pro Reg Error:", err); }
    });
}

// --- PROVIDER VIEW TOGGLES ---
const showProviderRegisterBtn = document.getElementById('showProviderRegisterBtn');
const showProviderLoginBtn = document.getElementById('showProviderLoginBtn');

if (showProviderRegisterBtn && providerLoginView && providerRegisterView) {
    showProviderRegisterBtn.addEventListener('click', (e) => {
        e.preventDefault();
        providerLoginView.classList.add('hidden');
        providerRegisterView.classList.remove('hidden');
    });
    showProviderLoginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        providerRegisterView.classList.add('hidden');
        providerLoginView.classList.remove('hidden');
    });
}

// --- PROVIDER PROFILE UPDATE LOGIC ---
if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const provider = JSON.parse(localStorage.getItem('currentProvider'));
        
        // Check for stale data (missing MongoDB _id)
        if (!provider || !provider._id) {
            alert("Session expired or invalid data. Please login again.");
            localStorage.removeItem('currentProvider');
            window.location.reload();
            return;
        }

        const updatedData = {
            name: document.getElementById('proName').value,
            phone: document.getElementById('proPhone').value,
            specialty: document.getElementById('proCategory').value,
            city: document.getElementById('proCity').value
        };

        try {
            const res = await fetch(`/api/providers/${provider._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData)
            });

            if (res.ok) {
                const updatedProvider = await res.json();
                localStorage.setItem('currentProvider', JSON.stringify(updatedProvider));
                
                // Update UI immediately
                document.getElementById('welcomeMsg').textContent = `Welcome, ${updatedProvider.name}`;
                alert("Profile Updated Successfully!");
                
                // Close the editor
                document.getElementById('editProfileContainer').classList.add('hidden');
                document.getElementById('toggleEditProfileBtn').innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Edit Profile';
            } else {
                let errorMsg = "Unknown error";
                try {
                    const data = await res.json();
                    errorMsg = data.error || errorMsg;
                } catch (e) {
                    const text = await res.text();
                    errorMsg = `Server Error ${res.status}: ${text.substring(0, 100)}...`;
                }
                alert("Update failed: " + errorMsg);
            }
        } catch (err) { console.error("Update Error:", err); }
    });
}

// --- PROVIDER POST LOGIC ---
if (createPostForm) {
    createPostForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const provider = JSON.parse(localStorage.getItem('currentProvider'));
        const fileInput = document.getElementById('postFile');
        const caption = document.getElementById('postCaption').value;

        // Check for valid session
        if (!provider || !provider._id) {
            alert("Session invalid. Please login again.");
            localStorage.removeItem('currentProvider');
            window.location.reload();
            return;
        }

        const file = fileInput.files[0];

        if (!file) return alert("Please select a file");
        
        // Word count check
        if (caption.split(/\s+/).length > 100) {
            return alert("Caption exceeds 100 words limit.");
        }

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = async () => {
            const base64 = reader.result;
            const mediaType = file.type.startsWith('image') ? 'image' : 'video';

            try {
                const res = await fetch('/api/posts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        providerId: provider._id,
                        media: base64,
                        mediaType,
                        caption
                    })
                });
                if (res.ok) {
                    alert("Posted successfully!");
                    createPostForm.reset();
                    document.getElementById('createPostFormContainer').classList.add('hidden');
                    loadProviderPosts(provider._id); // Refresh posts
                } else {
                    let errorMsg = "Unknown error";
                    try {
                        const data = await res.json();
                        errorMsg = data.error || errorMsg;
                    } catch (e) {
                        const text = await res.text();
                        errorMsg = `Server Error ${res.status}: ${text.substring(0, 100)}...`;
                    }
                    alert("Failed to post: " + errorMsg);
                }
            } catch (err) { console.error("Post Error:", err); }
        };
    });
}

if (togglePostFormBtn) {
    togglePostFormBtn.addEventListener('click', () => {
        document.getElementById('createPostFormContainer').classList.toggle('hidden');
    });
}

async function loadProviderPosts(providerId) {
    try {
        const res = await fetch(`/api/posts/${providerId}`);
        const posts = await res.json();
        const container = document.getElementById('providerPostsContainer');
        renderPosts(posts, container);
    } catch (err) { console.error("Load Posts Error:", err); }
}

async function loadProviderPortfolio(providerId) {
    try {
        const res = await fetch(`/api/posts/${providerId}`);
        const posts = await res.json();
        const container = document.getElementById('portfolioGrid');
        renderPosts(posts, container);
    } catch (err) { console.error("Load Portfolio Error:", err); }
}

function renderPosts(posts, container) {
    if (!container) return;
    if (posts.length === 0) {
        container.innerHTML = '<p>No posts yet.</p>';
        return;
    }
    container.innerHTML = posts.map(post => `
        <div class="post-card">
            ${post.mediaType === 'image' 
                ? `<img src="${post.media}" alt="Post" class="post-media">` 
                : `<video src="${post.media}" controls class="post-media"></video>`}
            <div class="post-content">
                <p class="post-caption">${post.caption}</p>
                <span class="post-date">${new Date(post.date).toLocaleDateString()}</span>
            </div>
        </div>
    `).join('');
}

async function showProviderDashboard(provider) {
    if (providerLoginView) providerLoginView.classList.add('hidden');
    if (providerRegisterView) providerRegisterView.classList.add('hidden');
    if (providerDashboardView) {
        providerDashboardView.classList.remove('hidden');
        
        // Set Welcome Message
        const welcomeMsg = document.getElementById('welcomeMsg');
        if (welcomeMsg) welcomeMsg.textContent = `Welcome, ${provider.name}`;

        // Populate Form Data (for editing)
        document.getElementById('proName').value = provider.name || '';
        document.getElementById('proPhone').value = provider.phone || '';
        document.getElementById('proCategory').value = provider.specialty || 'Electrician';
        document.getElementById('proCity').value = provider.city || 'Delhi';

        // Toggle Edit Profile Logic
        const toggleBtn = document.getElementById('toggleEditProfileBtn');
        const editContainer = document.getElementById('editProfileContainer');
        if (toggleBtn && editContainer) {
            toggleBtn.onclick = () => {
                editContainer.classList.toggle('hidden');
                toggleBtn.innerHTML = editContainer.classList.contains('hidden') 
                    ? '<i class="fa-solid fa-pen-to-square"></i> Edit Profile' 
                    : '<i class="fa-solid fa-xmark"></i> Close Editor';
            };
        }

        // Fetch Provider Bookings
        const res = await fetch(`/api/provider/bookings/${provider.name}`);
        const bookings = await res.json();
        
        // Calculate Stats
        const total = bookings.length;
        const completed = bookings.filter(b => b.status === 'Completed').length;
        const pending = total - completed;

        // Update Stats DOM
        document.getElementById('statTotal').textContent = total;
        document.getElementById('statCompleted').textContent = completed;
        document.getElementById('statPending').textContent = pending;

        const container = document.getElementById('providerBookingsContainer');
        
        if (bookings.length === 0) {
            container.innerHTML = '<p>No job requests yet.</p>';
        } else {
            container.innerHTML = `
                <div style="overflow-x: auto;">
                    <table class="history-table">
                        <thead>
                            <tr><th>Date</th><th>Client Email</th><th>Service</th><th>Status</th></tr>
                        </thead>
                        <tbody>
                            ${bookings.map(b => `
                                <tr>
                                    <td>${new Date(b.date).toLocaleDateString()}</td>
                                    <td>${b.userEmail}</td>
                                    <td>${b.specialty}</td>
                                    <td><span class="status-badge status-${b.status.toLowerCase()}">${b.status}</span></td>
                                </tr>`).join('')}
                        </tbody>
                    </table>
                </div>`;
        }

        // Load Posts
        loadProviderPosts(provider._id);
    }
}