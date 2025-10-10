// API configuration and utility functions
// Auto-detect API URL based on current host
const getApiBaseUrl = () => {
  const currentUrl = window.location.href;
  const hostname = window.location.hostname;
  
  // Kalau akses via ngrok HTTPS, gunakan relative URL untuk proxy
  if (currentUrl.includes('ngrok')) {
    return '/api';
  }
  
  // Kalau akses via IP lokal (HP)
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    return `http://${hostname}:3001/api`;
  }
  
  // Default localhost untuk development
  return 'http://localhost:3001/api';
};

const API_BASE_URL = getApiBaseUrl();

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
      // Only set Content-Type if not FormData (for file uploads)
      ...(!(options.body instanceof FormData) && { 'Content-Type': 'application/json' }),
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  // Debug: Log request details
  console.log('🚀 API Request Debug:');
  console.log('URL:', url);
  console.log('Raw token:', token);
  console.log('Token exists?', !!token);
  console.log('Auth header from token:', token && { 'Authorization': `Bearer ${token}` });
  console.log('Headers before spread:', {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  });
  console.log('Final headers:', config.headers);
  console.log('Full config:', config);

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
  register: async (username, password) => {
    const response = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    
    // Don't save token automatically after register
    // User harus login manual setelah register
    return response;
  },

  // Get user profile
  getProfile: async () => {
    return await apiRequest('/auth/profile');
  },

  // Update user profile
  updateProfile: async (profileData) => {
    const response = await apiRequest('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
    
    if (response.status === 'success') {
      // Update localStorage user data
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    
    return response;
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
  },

  // Get dashboard statistics (books + borrows + users)
  getDashboardStats: async () => {
    return await apiRequest('/books/dashboard-stats');
  }
};

// Export utility functions
export { getToken, setToken, removeToken, apiRequest };

// Borrow API calls
export const borrowAPI = {
  // Borrow a book (create borrow request)
  borrowBook: async (borrowData) => {
    // Handle the new format with bookId, borrowDate, dueDate
    let requestBody;
    
    if (typeof borrowData === 'object' && borrowData.bookId !== undefined) {
      // New format from BookCard
      requestBody = {
        bookId: parseInt(borrowData.bookId), // Ensure it's a number
        borrowDate: borrowData.borrowDate,
        dueDate: borrowData.dueDate
      };
    } else if (typeof borrowData === 'object' && borrowData.id !== undefined) {
      // Legacy format 
      requestBody = {
        bookId: parseInt(borrowData.id),
        request_date: borrowData.borrowDate,
        due_date: borrowData.dueDate
      };
    } else {
      // Simple bookId only
      requestBody = {
        bookId: parseInt(borrowData)
      };
    }
    
    console.log('🌐 API - borrowBook requestBody:', requestBody);
    
    return await apiRequest('/borrow', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
  },
  
  // Get user's borrowed books
  getBorrowedBooks: async () => {
    return await apiRequest('/borrow/my-borrows');
  },
  
  // Get all borrow requests (admin only)
  getAllBorrowRequests: async () => {
    return await apiRequest('/borrow');
  },
  
  // Approve borrow request (admin only)
  approveBorrow: async (borrowId) => {
    return await apiRequest(`/borrow/${borrowId}/approve`, {
      method: 'PUT',
    });
  },
  
  // Reject borrow request (admin only)
  rejectBorrow: async (borrowId) => {
    return await apiRequest(`/borrow/${borrowId}/reject`, {
      method: 'PUT',
    });
  },
  
  // Confirm pickup (admin only)
  confirmPickup: async (borrowId) => {
    return await apiRequest(`/borrow/${borrowId}/pickup`, {
      method: 'PUT',
    });
  },
  
  // Return book
  returnBook: async (borrowId) => {
    return await apiRequest(`/borrow/${borrowId}/return`, {
      method: 'PUT',
    });
  },

  // Get borrow statistics (admin only)
  getBorrowStats: async () => {
    return await apiRequest('/borrow/stats');
  },

  // Get borrow status statistics (admin only)
  getBorrowStatusStats: async (filter = null) => {
    let url = '/borrow/status-stats';
    if (filter) {
      const params = new URLSearchParams(filter);
      url += `?${params.toString()}`;
    }
    return await apiRequest(url);
  },

  // Get return trend statistics (admin only)
  getReturnTrendStats: async () => {
    return await apiRequest('/borrow/trend-stats');
  },

  // Direct borrow by petugas (skip approval process)
  createDirectBorrow: async (bookId, userId, dueDate = null) => {
    return await apiRequest('/borrow/direct', {
      method: 'POST',
      body: JSON.stringify({
        bookId: bookId,
        userId: userId,
        dueDate: dueDate
      }),
    });
  },

  // Legacy functions for compatibility
  createRequest: async (bookId, requestDate, dueDate) => {
    return await apiRequest('/borrow', {
      method: 'POST',
      body: JSON.stringify({
        bookId: bookId,
        request_date: requestDate,
        due_date: dueDate
      }),
    });
  },
  
  getMyBorrows: async () => {
    return await apiRequest('/borrow/my-borrows');
  },
  
  getAll: async () => {
    return await apiRequest('/borrow');
  },
  
  approve: async (borrowId) => {
    return await apiRequest(`/borrow/${borrowId}/approve`, {
      method: 'PUT',
    });
  },
  
  reject: async (borrowId, rejectionReason) => {
    return await apiRequest(`/borrow/${borrowId}/reject`, {
      method: 'PUT',
      body: JSON.stringify({
        rejection_reason: rejectionReason
      }),
    });
  },

  // Delete borrow record
  deleteRecord: async (recordId) => {
    return await apiRequest(`/borrow/record/${recordId}`, {
      method: 'DELETE',
    });
  },

  // Clear all history (student only)
  clearHistory: async () => {
    return await apiRequest('/borrow/clear/history', {
      method: 'DELETE',
    });
  },

  // Bulk delete records
  bulkDelete: async (recordIds) => {
    return await apiRequest('/borrow/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({
        recordIds: recordIds
      }),
    });
  }
};

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

// Combined User API (includes profile functions)
export const userAPI = {
  // Profile operations
  getProfile: async () => {
    return await apiRequest('/users/profile');
  },

  updateProfile: async (profileData) => {
    return await apiRequest('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },

  updateProfileImage: async (imageFile) => {
    const formData = new FormData();
    formData.append('profileImage', imageFile);

    return await apiRequest('/users/profile/image', {
      method: 'PUT',
      body: formData,
    });
  },
  
  // Admin operations
  getAll: async () => {
    return await apiRequest('/users');
  },
  
  getById: async (id) => {
    return await apiRequest(`/users/${id}`);
  },
  
  delete: async (id) => {
    return await apiRequest(`/users/${id}`, {
      method: 'DELETE',
    });
  },
  
  getStats: async () => {
    return await apiRequest('/users/stats');
  },

  searchStudents: async (query) => {
    return await apiRequest(`/users/search?query=${encodeURIComponent(query)}`);
  }
};

// Book Request API calls
export const requestAPI = {
  // Create new book request
  create: async (requestData) => {
    return await apiRequest('/requests', {
      method: 'POST',
      body: JSON.stringify(requestData),
    });
  },

  // Get user's requests
  getMyRequests: async () => {
    return await apiRequest('/requests/my-requests');
  },

  // Get all requests (Admin/Petugas only)
  getAll: async () => {
    return await apiRequest('/requests');
  },

  // Update request status (Admin/Petugas only)
  updateStatus: async (requestId, status, notes = null) => {
    return await apiRequest(`/requests/${requestId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, notes }),
    });
  },

  // Delete request
  delete: async (requestId) => {
    return await apiRequest(`/requests/${requestId}`, {
      method: 'DELETE',
    });
  }
};

// Testimonials API calls
export const testimonialAPI = {
  // Get approved testimonials (public)
  getApproved: async () => {
    return await apiRequest('/testimonials/approved');
  },

  // Get all testimonials (admin only)
  getAll: async () => {
    return await apiRequest('/testimonials');
  },

  // Get user's testimonials
  getMyTestimonials: async () => {
    return await apiRequest('/testimonials/my-testimonials');
  },

  // Create testimonial
  create: async (testimonialData) => {
    // If FormData, don't stringify and don't set Content-Type (let browser set it)
    if (testimonialData instanceof FormData) {
      return await apiRequest('/testimonials', {
        method: 'POST',
        body: testimonialData
      });
    } else {
      // Regular JSON data
      return await apiRequest('/testimonials', {
        method: 'POST',
        body: JSON.stringify(testimonialData)
      });
    }
  },

  // Update testimonial status (admin only)
  updateStatus: async (testimonialId, status) => {
    return await apiRequest(`/testimonials/${testimonialId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },

  // Delete testimonial
  delete: async (testimonialId) => {
    return await apiRequest(`/testimonials/${testimonialId}`, {
      method: 'DELETE',
    });
  }
};

// Reading Progress API calls
export const readingAPI = {
  // Get reading progress for specific book
  getProgress: async (bookId) => {
    return await apiRequest(`/reading/${bookId}`);
  },

  // Get user's complete reading history
  getHistory: async () => {
    return await apiRequest('/reading/history');
  },

  // Update reading progress for specific book
  updateProgress: async (bookId, progressData) => {
    return await apiRequest(`/reading/${bookId}`, {
      method: 'PUT',
      body: JSON.stringify(progressData)
    });
  },

  // Delete reading progress for specific book
  deleteProgress: async (bookId) => {
    return await apiRequest(`/reading/${bookId}`, {
      method: 'DELETE',
    });
  },

  // Get reading statistics (admin only)
  getStatistics: async () => {
    return await apiRequest('/reading/statistics');
  }
};