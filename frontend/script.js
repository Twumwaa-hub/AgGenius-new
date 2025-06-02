document.addEventListener("DOMContentLoaded", function () {
  // Create menu toggle button if it doesn't exist
  setupMobileMenu();

  // Handle route protection
  handleRouteProtection();

  // Setup all logout links and buttons
  setupLogoutButtons();

  // Fetch and display user profile on page load if authenticated
  fetchAndDisplayUserProfile();
});

// Set up mobile menu toggle functionality
function setupMobileMenu() {
  const menuToggle = document.getElementById("menuToggle");
  const sidebar = document.querySelector(".sidebar");

  // Make sure we have a menu toggle button and sidebar
  if (!menuToggle || !sidebar) {
    console.error("Menu toggle button or sidebar not found");
    return;
  }

  // Remove any existing click event listeners
  const clonedMenuToggle = menuToggle.cloneNode(true);
  menuToggle.parentNode.replaceChild(clonedMenuToggle, menuToggle);

  // Add our click event listener
  clonedMenuToggle.addEventListener("click", function () {
    sidebar.classList.toggle("active");
    this.classList.toggle("active");
    console.log(
      "Menu toggle clicked, sidebar active:",
      sidebar.classList.contains("active")
    );
  });

  // Close menu when clicking outside
  document.addEventListener("click", function (e) {
    if (
      sidebar &&
      !sidebar.contains(e.target) &&
      clonedMenuToggle &&
      !clonedMenuToggle.contains(e.target) &&
      sidebar.classList.contains("active")
    ) {
      sidebar.classList.remove("active");
      clonedMenuToggle.classList.remove("active");
      console.log("Clicked outside, closing sidebar");
    }
  });

  // Log debug information
  console.log("Mobile menu setup complete.");

  // Make sure the menu is visible on mobile
  const viewportWidth =
    window.innerWidth || document.documentElement.clientWidth;
  console.log("Viewport width:", viewportWidth);

  // Force proper display of menu toggle on small screens
  if (viewportWidth <= 768) {
    clonedMenuToggle.style.display = "block";
    sidebar.style.transition = "transform 0.3s ease";
    console.log("Mobile view detected, ensuring menu toggle is visible");
  }
}

// Handle route protection based on authentication status
function handleRouteProtection() {
  const protectedPages = [
    "blog.html",
    "contact.html",
    "gallery.html",
    "services.html",
    "index.html",
    "about.html",
    "Comments.html",
  ];

  const authPages = ["login.html", "register.html"];

  // Get current page, default to index.html if on the root path
  const currentPage = window.location.pathname.split("/").pop() || "index.html";

  console.log("Current page:", currentPage);

  // Always refresh the token from localStorage first
  auth.refreshToken();

  const isAuthenticated = auth.isAuthenticated();
  console.log(
    "Authentication status:",
    isAuthenticated ? "Logged in" : "Not logged in"
  );

  // PROTECTED ROUTES: If not authenticated and trying to access a protected page
  if (!isAuthenticated && protectedPages.includes(currentPage)) {
    console.log("Access denied: Not authenticated, redirecting to login");
    window.location.replace("login.html");
    return;
  }

  // AUTH PAGES: If authenticated and trying to access auth pages (login/register)
  if (isAuthenticated && authPages.includes(currentPage)) {
    console.log("Already authenticated, redirecting to home");
    window.location.replace("index.html");
    return;
  }
}

// Setup all logout links and buttons throughout the application
function setupLogoutButtons() {
  if (auth.isAuthenticated()) {
    // First, handle the sidebar logout section
    const nav = document.querySelector(".sidebar");
    if (nav) {
      const existingLogoutDiv = nav.querySelector(".logout-link");
      if (existingLogoutDiv) {
        // Make sure the logout link has the correct event handler
        const logoutLink =
          existingLogoutDiv.querySelector("a") ||
          existingLogoutDiv.querySelector("button");
        if (logoutLink) {
          // Remove any existing click handlers to prevent duplicates
          logoutLink.removeEventListener("click", handleLogout);
          logoutLink.onclick = handleLogout;
        }
      } else {
        // Create new logout button if it doesn't exist
        const logoutDiv = document.createElement("div");
        logoutDiv.className = "logout-link";
        const logoutBtn = document.createElement("button");
        logoutBtn.textContent = "Logout";
        logoutBtn.onclick = handleLogout;
        logoutBtn.className = "btn";
        logoutDiv.appendChild(logoutBtn);
        nav.appendChild(logoutDiv);
      }
    }

    // Handle any logout link or button with id="logout-link" throughout the site
    document.querySelectorAll('[id="logout-link"]').forEach((link) => {
      // Remove any existing click handlers to prevent duplicates
      link.removeEventListener("click", handleLogout);
      link.addEventListener("click", handleLogout);
    });

    // Handle any element with class="logout-button" throughout the site
    document.querySelectorAll(".logout-button").forEach((button) => {
      // Remove any existing click handlers to prevent duplicates
      button.removeEventListener("click", handleLogout);
      button.addEventListener("click", handleLogout);
    });
  }
}

// Single handler for logout to prevent duplicate executions
function handleLogout(e) {
  if (e) e.preventDefault();
  // Prevent multiple logout executions
  if (!auth.isLoggingOut) {
    auth.logout();
  }
}

// Auth utilities
const API_URL = "http://localhost:5000";

const auth = {
  token: localStorage.getItem("token"),
  userId: localStorage.getItem("userId"),
  isLoggingOut: false, // Flag to prevent multiple logout calls

  refreshToken: function () {
    this.token = localStorage.getItem("token");
    this.userId = localStorage.getItem("userId");
    return this.token;
  },

  isAuthenticated: function () {
    return this.token !== null && this.token !== undefined && this.token !== "";
  },

  // Parse JWT token to get user ID
  parseToken: function (token) {
    if (!token) return null;
    try {
      // Split the token and get the payload part (second part)
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      // Decode the base64 string
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map(function (c) {
            return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
          })
          .join("")
      );

      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error("Error parsing JWT token:", error);
      return null;
    }
  },

  login: async function (username, password) {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      // Ensure token is saved properly
      this.token = data.token;
      localStorage.setItem("token", data.token);

      // Extract and save user ID from token
      const payload = this.parseToken(data.token);
      if (payload && payload.id) {
        this.userId = payload.id;
        localStorage.setItem("userId", payload.id);
        console.log("User ID saved:", payload.id);
      }

      showToast("Login successful", "success");

      // Fetch and display profile information after successful login
      fetchAndDisplayUserProfile();

      return true;
    } catch (error) {
      console.error("Login error:", error);
      showToast(error.message, "error");
      throw error;
    }
  },

  register: async function (username, email, fullName, phone, password, profilePicture) {
    try {
      const formData = new FormData();
      formData.append('username', username);
      formData.append('email', email);
      formData.append('fullName', fullName);
      formData.append('phone', phone);
      formData.append('password', password);
      if (profilePicture) {
        formData.append('profilePicture', profilePicture);
      }

      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        // No 'Content-Type' header needed when using FormData with file uploads
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Registration failed");
      }
      showToast("Registration successful", "success");
      return true;
    } catch (error) {
      console.error("Registration error:", error);
      showToast(error.message, "error");
      throw error;
    }
  },

  logout: function () {
    // If already logging out, don't execute again
    if (this.isLoggingOut) return;

    try {
      // Set flag to prevent multiple logout calls
      this.isLoggingOut = true;

      // Ensure token and userId are properly cleared from both the object and localStorage
      this.token = null;
      this.userId = null;
      localStorage.removeItem("token");
      localStorage.removeItem("userId");

      // Double check token was removed
      if (localStorage.getItem("token") || localStorage.getItem("userId")) {
        console.error("Failed to remove token/userId from localStorage!");
        // Try one more time with a different method
        window.localStorage.removeItem("token");
        window.localStorage.removeItem("userId");
      }

      // Verify token was removed
      console.log("Token after removal:", localStorage.getItem("token"));
      console.log("User ID after removal:", localStorage.getItem("userId"));

      showToast("You have been logged out", "success");

      // Use timeout to ensure toast is visible before redirect
      setTimeout(() => {
        window.location.replace("login.html");
      }, 800);
    } catch (error) {
      console.error("Error during logout:", error);
      // Reset logging out flag in case of error
      this.isLoggingOut = false;
      // Force redirect even if there was an error
      window.location.replace("login.html");
    }
  },

  // Add a new function to get the user's profile
  getProfile: async function() {
    this.refreshToken(); // Ensure token is up to date
    if (!this.isAuthenticated()) {
      throw new Error("User not authenticated.");
    }

    try {
      const response = await fetch(`${API_URL}/auth/profile`, {
        method: "GET",
        headers: {
          'Authorization': `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch profile");
      }

      return data;
    } catch (error) {
      console.error("Error fetching profile:", error);
      throw error;
    }
  },
};

// Toast notification system
const showToast = (message, type = "success") => {
  const toastContainer =
    document.querySelector(".toast-container") || createToastContainer();
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;

  toastContainer.appendChild(toast);

  // Remove toast after 3 seconds
  setTimeout(() => {
    toast.style.animation = "slideOutTop 0.3s ease-out forwards";
    setTimeout(() => {
      toastContainer.removeChild(toast);
      if (toastContainer.children.length === 0) {
        document.body.removeChild(toastContainer);
      }
    }, 300);
  }, 3000);
};

const createToastContainer = () => {
  const container = document.createElement("div");
  container.className = "toast-container";
  document.body.appendChild(container);
  return container;
};

// Loading spinner system
const showSpinner = () => {
  if (!document.querySelector(".spinner-overlay")) {
    const overlay = document.createElement("div");
    overlay.className = "spinner-overlay";
    overlay.innerHTML = '<div class="spinner"></div>';
    document.body.appendChild(overlay);
  }
};

const hideSpinner = () => {
  const overlay = document.querySelector(".spinner-overlay");
  if (overlay) {
    document.body.removeChild(overlay);
  }
};

// Button loading state
const setButtonLoading = (button, isLoading) => {
  if (isLoading) {
    button.disabled = true;
    button.classList.add("loading");
  } else {
    button.disabled = false;
    button.classList.remove("loading");
  }
};

// Function to fetch user profile and update the UI
async function fetchAndDisplayUserProfile() {
  if (auth.isAuthenticated()) {
    try {
      const profile = await auth.getProfile();
      if (profile) {
        // Update the user greeting in the header
        const userGreetingElement = document.getElementById('user-greeting');
        if (userGreetingElement) {
          userGreetingElement.textContent = `Welcome, ${profile.username || profile.full_name || 'User'}!`;
        }

        // Update the navbar with user info
        const navUserProfileDiv = document.getElementById('nav-user-profile-trigger');
        const navProfilePic = document.getElementById('nav-profile-pic');
        const navUsernameSpan = document.getElementById('nav-username');
        const profileDropdownMenu = document.getElementById('profile-dropdown-menu');
        const navUserDropdownContainer = document.getElementById('nav-user-dropdown');

        if (navUserDropdownContainer && navUserProfileDiv && navProfilePic && navUsernameSpan && profileDropdownMenu) {
          // Populate the dropdown menu with details
          document.getElementById('dropdown-username').textContent = profile.username || 'N/A';
          document.getElementById('dropdown-fullName').textContent = profile.full_name || 'N/A';
          document.getElementById('dropdown-email').textContent = profile.email || 'N/A';
          document.getElementById('dropdown-phone').textContent = profile.phone_number || 'N/A';
          // Populate other dropdown fields if added

          // Update the trigger display
          navUsernameSpan.textContent = profile.username || profile.full_name || 'User';
          const avatarUrl = profile.avatar && profile.avatar !== '' ? `${API_URL}${profile.avatar}` : 'https://avatar.iran.liara.run/public';
          navProfilePic.src = avatarUrl;

          // Show the main dropdown container
          navUserDropdownContainer.style.display = 'flex'; // Using flex to maintain layout

          // Add click listener to the trigger to toggle dropdown visibility
          navUserProfileDiv.addEventListener('click', function(event) {
              event.stopPropagation(); // Prevent click from immediately closing dropdown via document listener
              profileDropdownMenu.style.display = profileDropdownMenu.style.display === 'block' ? 'none' : 'block';
          });

          // Add event listener to close dropdown when clicking outside
          document.addEventListener('click', function(event) {
              if (!navUserDropdownContainer.contains(event.target)) {
                  profileDropdownMenu.style.display = 'none';
              }
          });
        }
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      // Handle error (e.g., show a message, log user out if token is invalid)
      // auth.logout(); // Example: Log out if fetching profile fails
    }
  }
}
