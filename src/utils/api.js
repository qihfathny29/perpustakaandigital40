// API configuration and utility functions
const API_BASE_URL = 'http://localhost:3001/api';

// Get token from localStorage
const getToken = () => {
  return localStorage.getItem('token');
};

// Set token to localStorage
const setToken = (token) => {
  localStorage.setItem('token', token);
};

// Remove token from localStorage
const removeToken = () => {
  localStorage.removeItem('token');
};

// API request wrapper with automatic token handling
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getToken();

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'API request failed');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// Authentication API calls
export const authAPI = {
  // Login user
  login: async (username, password) => {
    const response = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    
    if (response.status === 'success') {
      setToken(response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    
    return response;
  },

  // Register user (DON'T auto-login)
  register: async (username, password, role) => {
    const response = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, role }),
    });
    
    // Don't save token automatically after register
    // User harus login manual setelah register
    return response;
  },

  // Get user profile
  getProfile: async () => {
    return await apiRequest('/auth/profile');
  },

  // Logout user
  logout: () => {
    removeToken();
    localStorage.removeItem('user');
  }
};

// Books API calls
export const booksAPI = {
  // Get all books
  getAll: async () => {
    return await apiRequest('/books');
  },
  
  // Get book by ID
  getById: async (id) => {
    return await apiRequest(`/books/${id}`);
  },
  
  // Create new book
  create: async (bookData) => {
    return await apiRequest('/books', {
      method: 'POST',
      body: JSON.stringify(bookData),
    });
  },
  
  // Update book
  update: async (id, bookData) => {
    return await apiRequest(`/books/${id}`, {
      method: 'PUT',
      body: JSON.stringify(bookData),
    });
  },
  
  // Delete book
  delete: async (id) => {
    return await apiRequest(`/books/${id}`, {
      method: 'DELETE',
    });
  },

  // Get books statistics
  getStats: async () => {
    return await apiRequest('/books/stats');
  }
};

// Export utility functions
export { getToken, setToken, removeToken, apiRequest };

// Users API calls
export const usersAPI = {
  // Get all users with statistics
  getAll: async () => {
    return await apiRequest('/users');
  },
  
  // Get user by ID with detailed info
  getById: async (id) => {
    return await apiRequest(`/users/${id}`);
  },
  
  // Delete user
  delete: async (id) => {
    return await apiRequest(`/users/${id}`, {
      method: 'DELETE',
    });
  },
  
  // Get dashboard statistics
  getStats: async () => {
    return await apiRequest('/users/stats');
  }
};