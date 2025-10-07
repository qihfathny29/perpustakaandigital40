import { useContext, useState, useEffect, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { usersAPI, booksAPI, requestAPI, borrowAPI } from '../utils/api';

// QR Scanner Component (sementara mock, nanti akan kita implement)
const QRScanner = ({ onScan, isActive, onClose }) => {
  const [manualInput, setManualInput] = useState('');

  const handleManualScan = (e) => {
    e.preventDefault();
    if (manualInput.trim()) {
      onScan(manualInput.trim());
      setManualInput('');
    }
  };

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-700 rounded-2xl p-8 max-w-md w-full shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M12 12V9m4.01 0h2M6 12a6 6 0 11-6 6 6 6 0 016-6z" />
            </svg>
            Scan QR Code Buku
          </h3>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* QR Camera akan diimplementasi nanti */}
        <div className="mb-6 p-12 border-2 border-dashed border-gray-600 rounded-xl text-center bg-gray-800/50">
          <div className="text-gray-300 mb-3 flex flex-col items-center gap-3">
            <svg className="w-16 h-16 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span className="text-lg font-medium">📷 QR Scanner Camera</span>
          </div>
          <div className="text-sm text-gray-400">
            (Camera integration coming soon)
          </div>
        </div>

        {/* Manual Input sebagai fallback */}
        <div className="border-t border-gray-700 pt-6">
          <form onSubmit={handleManualScan}>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Input Manual Book ID:
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Masukkan Book ID (contoh: BK001)"
                className="flex-1 px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white font-medium rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-300 shadow-lg hover:shadow-red-500/25"
              >
                Scan
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

function PetugasDashboard() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  // States
  const [activeTab, setActiveTab] = useState('quick-borrow');
  const [notification, setNotification] = useState('');
  const [books, setBooks] = useState([]);
  const [students, setStudents] = useState([]);
  const [requests, setRequests] = useState([]);
  const [readyPickups, setReadyPickups] = useState([]);
  
  // QR Scanner states
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [scannedBook, setScannedBook] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [searchStudent, setSearchStudent] = useState('');
  const [showSidebar, setShowSidebar] = useState(false);

  // Statistics
  const [stats, setStats] = useState({
    pendingRequests: 0,
    readyPickups: 0,
    activeBorrows: 0,
    todayReturns: 0
  });

  const fetchRequests = useCallback(async () => {
    try {
      // Fetch both book requests (from request system) and borrow requests (from borrow system)
      const [bookRequestsResponse, borrowRequestsResponse] = await Promise.all([
        requestAPI.getAll(),
        borrowAPI.getAllBorrowRequests() // This should get pending borrows for petugas approval
      ]);
      
      console.log('🔍 Petugas - Book requests response:', bookRequestsResponse);
      console.log('🔍 Petugas - Borrow requests response:', borrowRequestsResponse);
      
      let allRequests = [];
      let pendingBorrows = [];
      
      // Handle book requests (request buku baru system)
      if (bookRequestsResponse.status === 'success') {
        const bookRequests = bookRequestsResponse.data.requests || [];
        console.log('� Book requests:', bookRequests);
        allRequests = [...allRequests, ...bookRequests.filter(r => r.status === 'pending')];
      }
      
      // Handle borrow requests (peminjaman langsung system) 
      if (borrowRequestsResponse.status === 'success') {
        const borrowRequests = borrowRequestsResponse.data.borrows || [];
        console.log('📖 All borrow requests from API:', borrowRequests);
        console.log('📖 Borrow requests count:', borrowRequests.length);
        console.log('📖 Sample borrow request:', borrowRequests[0]);
        
        // Check all statuses in the data
        const statusCounts = borrowRequests.reduce((acc, b) => {
          acc[b.status] = (acc[b.status] || 0) + 1;
          return acc;
        }, {});
        console.log('📊 Status distribution:', statusCounts);
        
        // Filter for pending borrow requests and format them
        pendingBorrows = borrowRequests.filter(b => b.status === 'pending').map(borrow => ({
          id: borrow.id,
          bookTitle: borrow.book_title || borrow.title,
          userName: borrow.user_name || borrow.username,
          userNis: borrow.user_nis || 'N/A',
          createdAt: borrow.created_at || borrow.borrow_date,
          status: borrow.status,
          type: 'borrow' // Mark as borrow request vs book request
        }));
        allRequests = [...allRequests, ...pendingBorrows];
      }
      
      console.log('📋 All combined requests:', allRequests);
      console.log('📋 Total pending requests:', allRequests.length);
      
      setRequests(allRequests);
      
      // Fetch ready for pickup items (approved requests that haven't been picked up)
      let readyForPickup = [];
      
      // Get approved borrow requests that are ready for pickup
      if (borrowRequestsResponse.status === 'success') {
        const borrowRequests = borrowRequestsResponse.data.borrows || [];
        console.log('🔍 Looking for approved borrows in:', borrowRequests.length, 'total records');
        
        const approvedBorrows = borrowRequests.filter(b => {
          console.log('🔍 Checking borrow:', b.id, 'status:', b.status, 'title:', b.title);
          return b.status === 'borrowed'; // Status berubah menjadi 'borrowed' setelah di-approve
        }).map(borrow => {
          console.log('✅ Found approved borrow:', borrow.id, borrow.title);
          return {
            id: borrow.id,
            bookTitle: borrow.book_title || borrow.title,
            userName: borrow.user_name || borrow.user?.username || borrow.username,
            userNis: borrow.user_nis || 'N/A',
            approvedAt: borrow.updated_at || borrow.borrow_date,
            type: 'borrow'
          };
        });
        
        console.log('📦 Found borrowed books (ready for pickup):', approvedBorrows.length);
        console.log('📦 Borrowed books data:', approvedBorrows);
        readyForPickup = [...readyForPickup, ...approvedBorrows];
      }
      
      console.log('📦 Ready for pickup items:', readyForPickup);
      setReadyPickups(readyForPickup);
      
      // Update stats
      setStats(prevStats => ({
        ...prevStats,
        pendingRequests: allRequests.length,
        readyPickups: readyForPickup.length,
      }));
      
      console.log('🎯 Final combined requests state:', allRequests);
      console.log('📦 Final ready pickups state:', readyForPickup);
    } catch (error) {
      console.error('Error fetching requests:', error);
    }
  }, []);

  // Fetch data on component mount
  useEffect(() => {
    if (!user || user.role !== 'petugas') {
      navigate('/login');
      return;
    }
    
    const loadInitialData = async () => {
      try {
        // Fetch books
        const booksResponse = await booksAPI.getAll();
        if (booksResponse.status === 'success') {
          setBooks(booksResponse.data.books);
        }

        // Fetch students
        const usersResponse = await usersAPI.getAll();
        if (usersResponse.status === 'success') {
          const studentList = usersResponse.data.users.filter(u => u.role === 'student');
          setStudents(studentList);
        }

        // Use fetchRequests to fetch requests and update stats automatically
        fetchRequests();
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    };

    loadInitialData();
  }, [user, navigate, fetchRequests]);

  // Update stats whenever requests or readyPickups change
  useEffect(() => {
    console.log('🔄 Stats sync - requests:', requests.length, 'readyPickups:', readyPickups.length);
    setStats(prevStats => ({
      ...prevStats,
      pendingRequests: requests.length,
      readyPickups: readyPickups.length,
    }));
  }, [requests, readyPickups]);

  // QR Scan handlers
  const handleQRScan = async (bookId) => {
    try {
      // Find book by ID (simulate QR scan result)
      const book = books.find(b => b.id.toString() === bookId || b.title.toLowerCase().includes(bookId.toLowerCase()));
      
      if (!book) {
        setNotification(`Buku dengan ID "${bookId}" tidak ditemukan`);
        setTimeout(() => setNotification(''), 3000);
        return;
      }

      setScannedBook(book);
      setShowQRScanner(false);
      setNotification(`Buku "${book.title}" berhasil di-scan!`);
      setTimeout(() => setNotification(''), 3000);
      
    } catch (error) {
      console.error('Error processing QR scan:', error);
      setNotification('Error saat memproses scan');
      setTimeout(() => setNotification(''), 3000);
    }
  };

  const handleQuickBorrow = async () => {
    if (!scannedBook || !selectedStudent) {
      setNotification('Pilih buku dan siswa terlebih dahulu');
      setTimeout(() => setNotification(''), 3000);
      return;
    }

    try {
      const response = await borrowAPI.createDirectBorrow(
        scannedBook.id,
        selectedStudent
      );

      if (response.status === 'success') {
        setNotification(`Peminjaman berhasil diproses! Borrow ID: ${response.data.borrowId}`);
        setScannedBook(null);
        setSelectedStudent('');
        
        // Refresh books data to update stock
        const booksResponse = await booksAPI.getAll();
        if (booksResponse.status === 'success') {
          setBooks(booksResponse.data.books);
        }
      } else {
        throw new Error(response.message || 'Unknown error');
      }
      
    } catch (error) {
      console.error('Error processing quick borrow:', error);
      setNotification('Gagal memproses peminjaman: ' + (error.message || 'Unknown error'));
    } finally {
      setTimeout(() => setNotification(''), 3000);
    }
  };

  const handleRequestAction = async (requestId, action, requestType = 'request') => {
    try {
      let response;
      
      if (requestType === 'borrow') {
        // Handle borrow requests (peminjaman langsung) 
        if (action === 'approve') {
          response = await borrowAPI.approveBorrow(requestId);
        } else {
          response = await borrowAPI.rejectBorrow(requestId);
        }
      } else {
        // Handle book requests (request buku baru)
        const status = action === 'approve' ? 'approved' : 'rejected';
        response = await requestAPI.updateStatus(requestId, status);
      }
      
      if (response.status === 'success') {
        setNotification(`${requestType === 'borrow' ? 'Peminjaman' : 'Request'} berhasil ${action === 'approve' ? 'disetujui' : 'ditolak'}!`);
        fetchRequests(); // Refresh data
      }
    } catch (error) {
      console.error('Error updating request:', error);
      setNotification('Gagal memproses request');
    } finally {
      setTimeout(() => setNotification(''), 3000);
    }
  };

  const filteredStudents = students.filter(student =>
    student.fullName?.toLowerCase().includes(searchStudent.toLowerCase()) ||
    student.nis?.includes(searchStudent) ||
    student.username?.toLowerCase().includes(searchStudent.toLowerCase())
  );

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Mobile Sidebar Toggle */}
      <button
        className="md:hidden fixed top-4 left-4 z-[120] bg-gray-800 p-2 rounded-lg text-white"
        onClick={() => setShowSidebar(!showSidebar)}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Sidebar */}
      <div className={`fixed left-0 top-0 h-full w-64 bg-gray-900 border-r border-gray-800 z-[110] 
        ${showSidebar ? 'block' : 'hidden'} md:block`}>
        <div className="flex flex-col h-full justify-between">
          <div className="p-6 pb-0">
            {/* Close button for mobile */}
            <div className="flex md:hidden justify-end mb-4">
              <button
                className="text-gray-400 hover:text-white"
                onClick={() => setShowSidebar(false)}
              >
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex items-center gap-3 mb-8">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-xl font-bold">Petugas Panel</span>
            </div>

            <nav className="space-y-2 flex-1">
              <button
                onClick={() => setActiveTab('quick-borrow')}
                className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${
                  activeTab === 'quick-borrow' 
                    ? 'bg-red-600 text-white' 
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M12 12V9m4.01 0h2M6 12a6 6 0 11-6 6 6 6 0 016-6z" />
                </svg>
                📱 Quick Borrow
              </button>

              <button
                onClick={() => setActiveTab('request-queue')}
                className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${
                  activeTab === 'request-queue' 
                    ? 'bg-red-600 text-white' 
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                📋 Request Queue ({stats.pendingRequests})
              </button>

              <button
                onClick={() => setActiveTab('pickup-ready')}
                className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${
                  activeTab === 'pickup-ready' 
                    ? 'bg-red-600 text-white' 
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                📦 Ready for Pickup ({stats.readyPickups})
              </button>

              <button
                onClick={() => setActiveTab('return-process')}
                className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${
                  activeTab === 'return-process' 
                    ? 'bg-red-600 text-white' 
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                🔄 Process Return
              </button>
            </nav>
          </div>

          {/* Date Display */}
          <div className="p-6 border-t border-gray-800">
            <div className="bg-gray-800 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-gray-300">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm font-medium">
                  {new Date().toLocaleDateString('id-ID', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Profile & Logout Section */}
          <div className="px-6 pb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center">
                <span className="text-sm font-bold">
                  {(user?.fullName || user?.username)?.charAt(0)?.toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium">{user?.fullName || user?.username}</p>
                <p className="text-xs text-gray-400">Petugas Perpustakaan</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 justify-center"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="md:ml-64">
        {/* Notification - Fixed positioning */}
        {notification && (
          <div className="fixed top-4 right-4 z-50 p-4 bg-gray-900 border border-green-500 text-green-400 rounded-lg shadow-lg max-w-md">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {notification}
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-6 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Request Pending</p>
                  <p className="text-3xl font-bold text-orange-400">{stats.pendingRequests}</p>
                </div>
                <div className="bg-orange-500/20 p-3 rounded-lg">
                  <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-6 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Ready for Pickup</p>
                  <p className="text-3xl font-bold text-blue-400">{stats.readyPickups}</p>
                </div>
                <div className="bg-blue-500/20 p-3 rounded-lg">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-6 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Active Borrows</p>
                  <p className="text-3xl font-bold text-green-400">{stats.activeBorrows}</p>
                </div>
                <div className="bg-green-500/20 p-3 rounded-lg">
                  <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl p-6 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Due Today</p>
                  <p className="text-3xl font-bold text-red-400">{stats.todayReturns}</p>
                </div>
                <div className="bg-red-500/20 p-3 rounded-lg">
                  <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-xl shadow-2xl">
            <div className="p-8">
              {/* Quick Borrow Tab */}
              {activeTab === 'quick-borrow' && (
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-bold text-white">📱 Peminjaman Langsung (Walk-in)</h3>
                    <button
                      onClick={() => {
                        setShowQRScanner(true);
                      }}
                      className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-300 font-medium shadow-lg hover:shadow-red-500/25 flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M12 12V9m4.01 0h2M6 12a6 6 0 11-6 6 6 6 0 016-6z" />
                      </svg>
                      Scan QR Code Buku
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Scanned Book Info */}
                    <div className="bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-dashed border-gray-600 rounded-xl p-6 shadow-xl">
                      <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                        <span className="text-2xl">📚</span>
                        Buku yang Di-scan:
                      </h4>
                      {scannedBook ? (
                        <div className="bg-gradient-to-r from-blue-600/20 to-blue-800/20 border border-blue-500/30 p-6 rounded-lg backdrop-blur-sm">
                          <h5 className="font-bold text-blue-300 text-lg mb-2">{scannedBook.title}</h5>
                          <p className="text-blue-200 mb-1">👤 Penulis: {scannedBook.author}</p>
                          <p className="text-blue-200 mb-1">📖 Kategori: {scannedBook.category}</p>
                          <p className="text-green-400 font-medium">📊 Stock: {scannedBook.stock} tersedia</p>
                        </div>
                      ) : (
                        <div className="text-gray-400 text-center py-12 border border-gray-700 rounded-lg bg-gray-800/50">
                          <svg className="w-16 h-16 mx-auto mb-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M12 12V9m4.01 0h2M6 12a6 6 0 11-6 6 6 6 0 016-6z" />
                          </svg>
                          <p>Klik "Scan QR Code Buku" untuk memulai</p>
                        </div>
                      )}
                    </div>

                    {/* Student Selection */}
                    <div className="bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-dashed border-gray-600 rounded-xl p-6 shadow-xl">
                      <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                        <span className="text-2xl">👤</span>
                        Pilih Siswa:
                      </h4>
                      
                      <div className="space-y-4">
                        <input
                          type="text"
                          placeholder="Cari siswa (nama, NIS, username)..."
                          value={searchStudent}
                          onChange={(e) => setSearchStudent(e.target.value)}
                          className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        />

                        <select
                          value={selectedStudent}
                          onChange={(e) => setSelectedStudent(e.target.value)}
                          className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        >
                          <option value="">Pilih Siswa...</option>
                          {filteredStudents.map(student => (
                            <option key={student.id} value={student.id}>
                              {student.fullName} - {student.nis} ({student.class})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Process Button */}
                  <div className="flex justify-center pt-4">
                    <button
                      onClick={handleQuickBorrow}
                      disabled={!scannedBook || !selectedStudent}
                      className={`px-10 py-4 rounded-xl font-bold text-lg transition-all duration-300 shadow-xl ${
                        scannedBook && selectedStudent
                          ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-green-500/25 hover:shadow-green-500/50'
                          : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      ✅ Proses Peminjaman Langsung
                    </button>
                  </div>
                </div>
              )}

              {/* Request Queue Tab */}
              {activeTab === 'request-queue' && (
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                    <span className="text-2xl">📋</span>
                    Antrian Request Peminjaman
                  </h3>
                  
                  {/* Debug info */}
                  {console.log('🎪 Rendering request-queue tab, requests:', requests)}
                  {console.log('🎪 Requests length:', requests.length)}
                  
                  {requests.length === 0 ? (
                    <div className="text-center py-16 text-gray-400 bg-gray-800/50 rounded-xl border border-gray-700">
                      <svg className="w-16 h-16 mx-auto mb-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <p className="text-lg">Tidak ada request pending</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {requests.map(request => (
                        <div key={`${request.type}-${request.id}`} className="bg-gradient-to-r from-gray-800 to-gray-900 border border-gray-700 rounded-xl p-6 shadow-xl">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-bold text-white text-lg">{request.bookTitle}</h4>
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  request.type === 'borrow' 
                                    ? 'bg-blue-100 text-blue-800' 
                                    : 'bg-green-100 text-green-800'
                                }`}>
                                  {request.type === 'borrow' ? 'Peminjaman' : 'Request Buku'}
                                </span>
                              </div>
                              <p className="text-gray-300 mb-1">👤 Peminjam: {request.userName}</p>
                              <p className="text-gray-300 mb-1">🎓 NIS: {request.userNis}</p>
                              <p className="text-sm text-gray-400">
                                📅 Request pada: {new Date(request.createdAt).toLocaleDateString('id-ID')}
                              </p>
                            </div>
                            <div className="flex gap-3 ml-4">
                              <button
                                onClick={() => handleRequestAction(request.id, 'approve', request.type)}
                                className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white font-medium rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-300 shadow-lg hover:shadow-green-500/25 flex items-center gap-2"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Setujui
                              </button>
                              <button
                                onClick={() => handleRequestAction(request.id, 'reject', request.type)}
                                className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white font-medium rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-300 shadow-lg hover:shadow-red-500/25 flex items-center gap-2"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Tolak
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Ready for Pickup Tab */}
              {activeTab === 'pickup-ready' && (
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                    <span className="text-2xl">📦</span>
                    Siap Diambil
                  </h3>
                  
                  {readyPickups.length === 0 ? (
                    <div className="text-center py-16 text-gray-400 bg-gray-800/50 rounded-xl border border-gray-700">
                      <svg className="w-16 h-16 mx-auto mb-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                      <p className="text-lg">Tidak ada buku yang siap diambil</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {readyPickups.map(pickup => (
                        <div key={pickup.id} className="bg-gradient-to-r from-gray-800 to-gray-900 border border-gray-700 rounded-xl p-6 shadow-xl">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-bold text-white text-lg mb-2">{pickup.bookTitle}</h4>
                              <p className="text-gray-300 mb-1">👤 Peminjam: {pickup.userName}</p>
                              <p className="text-gray-300 mb-1">🎓 NIS: {pickup.userNis}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="px-3 py-1 bg-green-600/20 text-green-400 rounded-full text-sm font-medium border border-green-500/30">
                                  ✅ Disetujui - Menunggu pengambilan
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                setShowQRScanner(true);
                              }}
                              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-lg hover:shadow-blue-500/25 flex items-center gap-2"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M12 12V9m4.01 0h2M6 12a6 6 0 11-6 6 6 6 0 016-6z" />
                              </svg>
                              Konfirm Pickup
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Return Process Tab */}
              {activeTab === 'return-process' && (
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                      <span className="text-2xl">🔄</span>
                      Proses Pengembalian
                    </h3>
                    <button
                      onClick={() => {
                        setShowQRScanner(true);
                      }}
                      className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-medium rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-300 shadow-lg hover:shadow-purple-500/25 flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M12 12V9m4.01 0h2M6 12a6 6 0 11-6 6 6 6 0 016-6z" />
                      </svg>
                      Scan QR Code untuk Return
                    </button>
                  </div>

                  <div className="bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border border-yellow-500/30 rounded-xl p-6 backdrop-blur-sm">
                    <div className="flex items-center gap-3 text-yellow-300 mb-4">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <p className="font-bold text-lg">📋 Instruksi Pengembalian:</p>
                    </div>
                    <ol className="text-yellow-100 space-y-2 list-decimal list-inside text-sm">
                      <li className="flex items-center gap-2">
                        <span className="w-6 h-6 bg-yellow-500/20 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                        Scan QR code pada buku yang dikembalikan
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-6 h-6 bg-yellow-500/20 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                        Sistem akan mencocokkan dengan data peminjaman
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-6 h-6 bg-yellow-500/20 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                        Periksa kondisi buku dan konfirmasi pengembalian
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-6 h-6 bg-yellow-500/20 rounded-full flex items-center justify-center text-xs font-bold">4</span>
                        Update status buku menjadi tersedia
                      </li>
                    </ol>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* QR Scanner Modal */}
        <QRScanner
          isActive={showQRScanner}
          onScan={handleQRScan}
          onClose={() => setShowQRScanner(false)}
        />
      </div>
    </div>
  );
}

export default PetugasDashboard;