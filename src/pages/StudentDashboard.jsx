import { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useBorrow } from '../context/BorrowContext';
import { ReadingContext } from '../context/ReadingContext';
import { useNavigate, Link } from 'react-router-dom';
import { books } from '../data/books';
import BookCard from '../components/BookCard';
import { userAPI, requestAPI, booksAPI } from '../utils/api';

// Utility function untuk format tanggal Indonesia
const formatDate = (dateString) => {
  if (!dateString) return 'Invalid Date';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
};

function StudentDashboard() {
  const { user, logout } = useContext(AuthContext);
  const { borrowedBooks, returnBook } = useBorrow();
  const { readingHistory, updateReadingProgress } = useContext(ReadingContext);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('peminjaman');
  const [isEditing, setIsEditing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedBorrowId, setSelectedBorrowId] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [testimonialBook, setTestimonialBook] = useState(null);
  const [showDigitalReader, setShowDigitalReader] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [userRequests, setUserRequests] = useState([]);
  const [showOverdueModal, setShowOverdueModal] = useState(false);
  const [overdueBooks, setOverdueBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [availableBooks, setAvailableBooks] = useState([]); // Buku dari database

  // State untuk profile - akan diambil dari API
  const [profileImage, setProfileImage] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    nis: '',
    class: '',
    email: ''
  });

  // Load profile data dari API saat component mount
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        const response = await userAPI.getProfile();
        const userData = response.data.user;
        
        // Set form data dari database
        setFormData({
          fullName: userData.fullName || '',
          nis: userData.nis || '',
          class: userData.class || '',
          email: userData.email || ''
        });
        
        // Set profile image
        if (userData.profileImage) {
          setProfileImage(`http://localhost:3001${userData.profileImage}`);
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        // Fallback ke default values jika error
        setFormData({
          fullName: user?.username || '',
          nis: '',
          class: '',
          email: ''
        });
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  // Load user's book requests
  useEffect(() => {
    const loadUserRequests = async () => {
      if (!user) return;
      
      try {
        console.log('Loading user requests for user:', user);
        const response = await requestAPI.getMyRequests();
        console.log('User requests response:', response);
        
        if (response.status === 'success') {
          console.log('Setting user requests:', response.data.requests);
          setUserRequests(response.data.requests);
        }
      } catch (error) {
        console.error('Error loading user requests:', error);
        setUserRequests([]);
      }
    };

    loadUserRequests();
  }, [user]);

  // Load available books from database
  useEffect(() => {
    const loadBooks = async () => {
      try {
        console.log('Loading books from database...');
        const response = await booksAPI.getAll();
        console.log('Books response:', response);
        
        if (response.status === 'success') {
          console.log('Setting available books:', response.data.books);
          setAvailableBooks(response.data.books || []);
        }
      } catch (error) {
        console.error('Error loading books:', error);
        setAvailableBooks([]);
      }
    };

    loadBooks();
  }, []);

  // Handle image change - upload ke server
  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        setLoading(true);
        console.log('Starting image upload...');
        console.log('File:', file);
        
        // Preview image locally first
        const reader = new FileReader();
        reader.onloadend = () => {
          setProfileImage(reader.result);
        };
        reader.readAsDataURL(file);

        // Upload to server
        console.log('Calling userAPI.updateProfileImage...');
        const response = await userAPI.updateProfileImage(file);
        console.log('Upload response:', response);
        
        if (response.status === 'success') {
          setProfileImage(response.data.profileImageUrl);
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 3000);
          console.log('Upload successful:', response.data.profileImageUrl);
        }
      } catch (error) {
        console.error('Error uploading image:', error);
        console.error('Error details:', error.message);
        alert('Gagal mengupload foto profil: ' + error.message);
      } finally {
        setLoading(false);
      }
    }
  };

  // Handle form submit - update ke database
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      const response = await userAPI.updateProfile(formData);
      
      if (response.status === 'success') {
        setIsEditing(false);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Gagal memperbarui profil');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Modifikasi bagian form untuk memperbarui dan menyimpan data
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const newFormData = { ...formData, [name]: value };
    setFormData(newFormData);
  };

  const handleReturn = (borrowId) => {
    setSelectedBorrowId(borrowId);
    setShowReturnModal(true);
  };

  // Handler pengembalian buku
  const handleGoToReturnTab = () => {
    setActiveTab('peminjaman'); // Arahkan ke tab "peminjaman aktif"
    setShowOverdueModal(false);
    setOverdueBooks([]);
  };

  // Confirm return book
  const confirmReturn = async () => {
    try {
      await returnBook(selectedBorrowId);
      setShowReturnModal(false);
      setShowSuccessModal(true);
      setSelectedBorrowId(null);
      // borrowedBooks will automatically update through context
      setTimeout(() => {
        setShowSuccessModal(false);
      }, 3000);
    } catch (error) {
      console.error('Error returning book:', error);
      // Could add error handling UI here
    }
  };

  const handleNavigateToTestimonial = () => {
    setShowSuccessModal(false);
    // Navigate to home page testimonial section
    navigate('/?section=testimonial');
    // Open testimonial form with pre-filled book data
    window.dispatchEvent(new CustomEvent('openTestimonialForm', {
      detail: { 
        bookTitle: activeBorrows.find(book => book.borrowId === selectedBorrowId)?.title 
      }
    }));
  };

  const handleFinishReturn = () => {
    setShowSuccessModal(false);
    setActiveTab('riwayat'); // Switch to history tab
  };

  // Get user's borrowed books (no need to filter since /my-borrows already returns user-specific data)
  const userBorrowedBooks = borrowedBooks;
  
  // Get active borrows (status === 'borrowed' or 'pending')
  const activeBorrows = userBorrowedBooks.filter(book => book.status === 'borrowed' || book.status === 'pending');
  
  // Get returned books (status === 'returned')
  const returnedBooks = userBorrowedBooks.filter(book => book.status === 'returned');

  const handleOpenReader = (bookId, page = 1) => {
    const book = books.find(b => b.id === bookId);
    if (book) {
      setSelectedBook(book);
      setCurrentPage(page);
      setShowDigitalReader(true);
    }
  };

  // Replace the renderBookCatalog function
  const renderBookCatalog = () => {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Katalog Buku Digital</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {books.map((book) => (
            <BookCard
              key={book.id}
              {...book}
              onContinueReading={(bookId) => {
                const progress = localStorage.getItem(`readingProgress_${bookId}`);
                if (progress) {
                  const { currentPage } = JSON.parse(progress);
                  handleOpenReader(bookId, currentPage);
                } else {
                  handleOpenReader(bookId, 1);
                }
              }}
            />
          ))}
        </div>
      </div>
    );
  };

  const renderReadingHistory = () => {
    if (readingHistory.length === 0) {
      return (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4">
            <svg className="w-full h-full text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-300 mb-2">Belum ada riwayat membaca</h3>
          <p className="text-gray-500">Mulailah membaca buku digital untuk melihat riwayat Anda di sini.</p>
        </div>
      );

    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {readingHistory.map((book) => (
          <div key={book.bookId} className="flex bg-gray-900/50 rounded-lg overflow-hidden border border-gray-700">
            <div className="w-32 h-44">
              <img 
                src={`https://source.unsplash.com/random/400x600/?book,${book.title}`}
                alt={book.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 p-4">
              <h3 className="text-lg font-semibold text-white mb-1">{book.title}</h3>
              <p className="text-sm text-gray-400 mb-3">oleh {book.author}</p>
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-400 mb-1">
                  <span>Progress</span>
                  <span>Halaman {book.currentPage}/{book.totalPages}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-red-600 h-2 rounded-full transition-all" 
                    style={{ width: `${book.progress}%` }}
                  />
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">
                  Terakhir dibaca: {new Date(book.lastRead).toLocaleDateString()}
                </span>
                <button
                  onClick={() => handleContinueReading(book.bookId, book.currentPage)}
                  className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                >
                  Lanjutkan
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Fungsi untuk membuka digital reader dari riwayat baca
  const handleContinueReading = (bookId, lastPage) => {
    const book = books.find(b => b.id === bookId);
    if (book) {
      setSelectedBook(book);
      setCurrentPage(lastPage);
      setShowDigitalReader(true);
    }
  };

  // Fungsi untuk menutup digital reader dan simpan progress
  const handleCloseReader = () => {
    if (selectedBook) {
      updateReadingProgress(
        selectedBook.id,
        selectedBook.title,
        selectedBook.author,
        currentPage,
        100
      );
      setShowDigitalReader(false);
      setSelectedBook(null);
      setCurrentPage(1);
    }
  };

  // Statistics states
  const [borrowingStats, setBorrowingStats] = useState({
    totalBorrowed: 0,
    currentlyBorrowed: 0,
    overdue: 0
  });

  const [favoriteBook, setFavoriteBook] = useState('');

  useEffect(() => {
    // Recalculate derived values inside useEffect to avoid dependency issues
    const userBorrowedBooks = borrowedBooks; // No need to filter since /my-borrows already returns user-specific data
    const activeBorrows = userBorrowedBooks.filter(book => book.status === 'borrowed' || book.status === 'pending');
    const returnedBooks = userBorrowedBooks.filter(book => book.status === 'returned');

    // Calculate statistics
    setBorrowingStats({
      totalBorrowed: returnedBooks.length + activeBorrows.length,
      currentlyBorrowed: activeBorrows.length,
      overdue: 0
    });

    // Calculate favorite book from borrowing history
    const bookCounts = {};
    returnedBooks.forEach(book => {
      if (book.book_title) { // Use book_title from database
        bookCounts[book.book_title] = (bookCounts[book.book_title] || 0) + 1;
      }
    });

    // Find the book with the highest count
    let maxCount = 0;
    let mostBorrowedBook = 'Belum ada';

    for (const [title, count] of Object.entries(bookCounts)) {
      if (count > maxCount) {
        maxCount = count;
        mostBorrowedBook = title;
      }
    }
    
    setFavoriteBook(mostBorrowedBook);
  }, [borrowedBooks, user.id]);

  // Add useEffect to refresh reading history when component mounts
  useEffect(() => {
    const refreshReadingHistory = () => {
      const updatedHistory = readingHistory.map(history => {
        const savedProgress = localStorage.getItem(`readingProgress_${history.bookId}`);
        if (savedProgress) {
          const { currentPage, lastRead, progress } = JSON.parse(savedProgress);
          return {
            ...history,
            currentPage,
            lastRead,
            progress
          };
        }
        return history;
      });
      
      // Update context with latest progress
      updatedHistory.forEach(history => {
        updateReadingProgress(
          history.bookId,
          history.title,
          history.author,
          history.currentPage,
          history.totalPages
        );
      });
    };

    refreshReadingHistory();
  }, [readingHistory, updateReadingProgress]);

  // Add request book function - menggunakan API
  const handleRequestBook = async (book) => {
    try {
      setLoading(true);
      
      const requestData = {
        bookTitle: book.title,
        author: book.author,
        reason: '' // bisa ditambahkan input reason di modal nanti
      };

      const response = await requestAPI.create(requestData);
      
      if (response.status === 'success') {
        // Refresh user requests
        const updatedResponse = await requestAPI.getMyRequests();
        if (updatedResponse.status === 'success') {
          setUserRequests(updatedResponse.data.requests);
        }
        
        setShowRequestModal(false);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Error creating book request:', error);
      alert('Gagal membuat request buku: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Replace the 'request' tab content
  const renderRequestTab = () => {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">Request Buku</h2>
          <button
            onClick={() => setShowRequestModal(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Request Peminjaman Baru
          </button>
        </div>

        <table className="w-full text-gray-300">
          <thead className="text-gray-400 border-b border-gray-700">
            <tr>
              <th className="text-left py-3">Judul Buku</th>
              <th className="text-left py-3">Tanggal Request</th>
              <th className="text-left py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {userRequests.length === 0 ? (
              <tr>
                <td colSpan="3" className="py-6 text-center text-gray-500">
                  Belum ada request buku
                </td>
              </tr>
            ) : (
              userRequests.map(request => (
                <tr key={request.id} className="border-b border-gray-700">
                  <td className="py-3">{request.bookTitle}</td>
                  <td className="py-3">
                    {formatDate(request.createdAt)}
                  </td>
                  <td className="py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      request.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : request.status === 'approved'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {request.status === 'pending' ? 'Menunggu' :
                       request.status === 'approved' ? 'Disetujui' : 'Ditolak'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  };

  // Cek overdue
  useEffect(() => {
    if (!user) return;
    const now = new Date();
    const overdue = borrowedBooks
      .filter(book =>
        book.userId === user.username &&
        book.status === 'borrowed' &&
        new Date(book.dueDate) < now
      );
    setOverdueBooks(overdue);
    setShowOverdueModal(overdue.length > 0);
    // Jangan gunakan overdueBooks di dependency!
  }, [borrowedBooks, user]);

  const [showSidebar, setShowSidebar] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
      {/* Overlay to hide dashboard when digital reader is open */}
      {showDigitalReader && (
        <div className="fixed inset-0 bg-black/90 z-[100]"></div>
      )}

      {/* Sidebar Drawer for Mobile */}
      <div className="md:hidden fixed top-0 left-0 z-[120]">
        <button
          className="m-4 p-2 rounded-lg bg-gray-800 text-white focus:outline-none"
          onClick={() => setShowSidebar(true)}
        >
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
      {/* Sidebar */}
      <div className={`fixed left-0 top-0 h-full w-64 bg-gray-900 border-r border-gray-800 z-[110] 
        ${showSidebar ? 'block' : 'hidden'} md:block`}>
        <div className="p-6">
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span className="text-xl font-bold">Perpustakaan</span>
          </div>

          <nav className="space-y-2">
            <Link
              to="/"
              className="w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors text-gray-300 hover:bg-gray-800"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Home
            </Link>

            <button
              onClick={() => setActiveTab('peminjaman')}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${
                activeTab === 'peminjaman' 
                  ? 'bg-red-600 text-white' 
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Peminjaman Aktif
            </button>

            <button
              onClick={() => setActiveTab('riwayat')}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${
                activeTab === 'riwayat' 
                  ? 'bg-red-600 text-white' 
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Riwayat
            </button>

            <button
              onClick={() => setActiveTab('katalog')}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${
                activeTab === 'katalog' 
                  ? 'bg-red-600 text-white' 
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Riwayat Baca Digital
            </button>

            <button
              onClick={() => setActiveTab('request')}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${
                activeTab === 'request' 
                  ? 'bg-red-600 text-white' 
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Request Buku
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${
                activeTab === 'profile' 
                  ? 'bg-red-600 text-white' 
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Profile
            </button>
          </nav>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full overflow-hidden">
              {profileImage ? (
                <img 
                  src={profileImage} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
                  <span className="font-bold text-white">{user?.username?.[0]?.toUpperCase()}</span>
                </div>
              )}
            </div>
            <div>
              <p className="font-medium text-white">{formData.fullName}</p>
              <p className="text-sm text-gray-400">Siswa</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className={`md:ml-64 ml-0 p-2 sm:p-4 md:p-8 transition-all duration-300 ${showDigitalReader ? 'pointer-events-none select-none opacity-0' : ''}`}>
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
          <div className="flex items-center bg-gradient-to-br from-red-600/80 to-red-800/80 p-6 rounded-2xl border border-red-700 shadow-lg">
            <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center mr-5">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <h3 className="text-gray-200 text-sm mb-1 font-semibold tracking-wide">Total Buku Dipinjam</h3>
              <p className="text-3xl font-extrabold text-white">{borrowingStats.totalBorrowed}</p>
            </div>
          </div>
          <div className="flex items-center bg-gradient-to-br from-green-600/80 to-green-800/80 p-6 rounded-2xl border border-green-700 shadow-lg">
            <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center mr-5">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <h3 className="text-gray-200 text-sm mb-1 font-semibold tracking-wide">Sedang Dipinjam</h3>
              <p className="text-3xl font-extrabold text-white">{borrowingStats.currentlyBorrowed}</p>
            </div>
          </div>
          <div className="flex items-center bg-gradient-to-br from-yellow-600/80 to-yellow-800/80 p-6 rounded-2xl border border-yellow-700 shadow-lg">
            <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center mr-5">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-gray-200 text-sm mb-1 font-semibold tracking-wide">Terlambat</h3>
              <p className="text-3xl font-extrabold text-red-300">{borrowingStats.overdue}</p>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 overflow-hidden">
          <div className="p-3 sm:p-6">
            {/* Existing tab content with updated styles */}
            {activeTab === 'peminjaman' && (
              <div className="overflow-x-auto">
                <table className="w-full text-gray-300 min-w-[600px]">
                  <thead className="text-gray-400 border-b border-gray-700">
                    <tr>
                      <th className="text-left py-3">Judul Buku</th>
                      <th className="text-left py-3">Tanggal Pinjam</th>
                      <th className="text-left py-3">Tenggat</th>
                      <th className="text-left py-3">Status</th>
                      <th className="text-left py-3">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeBorrows.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-400">
                          Tidak ada peminjaman aktif.
                        </td>
                      </tr>
                    ) : (
                      activeBorrows.map(book => (
                        <tr key={book.borrowId} className="border-b border-gray-700">
                          <td className="py-3">{book.title}</td>
                          <td className="py-3">{new Date(book.borrowDate).toLocaleDateString()}</td>
                          <td className="py-3">{new Date(book.dueDate).toLocaleDateString()}</td>
                          <td className="py-3">
                            {book.status === 'pending' ? (
                              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                                Menunggu Persetujuan
                              </span>
                            ) : (
                              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                                Dipinjam
                              </span>
                            )}
                          </td>
                          <td className="py-3">
                            <button
                              onClick={() => handleReturn(book.borrowId)}
                              className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                              disabled={book.status !== 'borrowed'}
                            >
                              Selesai
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'riwayat' && (
              <div className="overflow-x-auto">
                <table className="w-full text-gray-300 min-w-[600px]">
                  <thead className="text-gray-400 border-b border-gray-700">
                    <tr>
                      <th className="text-left py-3">Judul Buku</th>
                      <th className="text-left py-3">Tanggal Pinjam</th>
                      <th className="text-left py-3">Tanggal Kembali</th>
                      <th className="text-left py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {returnedBooks.map(book => (
                      <tr key={book.borrowId} className="border-b border-gray-700">
                        <td className="py-3">{book.title}</td>
                        <td className="py-3">{new Date(book.borrowDate).toLocaleDateString()}</td>
                        <td className="py-3">{new Date(book.returnDate).toLocaleDateString()}</td>
                        <td className="py-3">
                          <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                            Selesai
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'request' && (
              <div className="overflow-x-auto">
                {renderRequestTab()}
              </div>
            )}

            {activeTab === 'katalog' && (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-3 sm:p-6">
                <div className="space-y-6">
                  <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">Riwayat Baca Digital</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    {readingHistory.map((history) => {
                      const book = books.find(b => b.id === history.bookId);
                      if (!book) return null;
                      
                      return (
                        <div key={history.bookId} className="flex bg-gray-900/50 rounded-lg overflow-hidden border border-gray-700">
                          <img 
                            src={book.imageUrl} 
                            alt={book.title}
                            className="w-32 h-44 object-cover"
                          />
                          <div className="flex-1 p-4">
                            <h3 className="text-lg font-semibold text-white mb-1">{book.title}</h3>
                            <p className="text-sm text-gray-400 mb-2">{book.author}</p>
                            <div className="mb-4">
                              <div className="flex justify-between text-sm text-gray-400 mb-1">
                                <span>Progress</span>
                                <span>Halaman {history.currentPage}/100</span>
                              </div>
                              <div className="w-full bg-gray-700 rounded-full h-2">
                                <div 
                                  className="bg-red-600 h-2 rounded-full transition-all" 
                                  style={{ width: `${history.progress}%` }}
                                />
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-500">
                                Terakhir dibaca: {new Date(history.lastRead).toLocaleDateString()}
                              </span>
                              <button
                                onClick={() => handleContinueReading(book.id, history.currentPage)}
                                className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                              >
                                Lanjutkan
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    
                    {readingHistory.length === 0 && (
                      <div className="col-span-2 text-center py-12 text-gray-400">
                        <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        <p className="text-lg font-medium mb-2">Belum ada riwayat membaca</p>
                        <p className="text-sm">Mulailah membaca buku digital untuk melihat riwayat Anda di sini.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="space-y-6">
                {showSuccess && (
                  <div className="bg-green-500/20 border border-green-500 text-green-500 px-4 py-3 rounded-lg mb-4">
                    Profile berhasil diubah!
                  </div>
                )}
                
                <div className="bg-gray-800/50 backdrop-blur-sm p-3 sm:p-6 rounded-xl border border-gray-700">
                  <div className="flex flex-col md:flex-row items-start justify-between gap-6">
                    <div className="flex items-start space-x-6">
                      <div className="relative group">
                        <div className="w-24 h-24 rounded-lg overflow-hidden">
                          {profileImage ? (
                            <img 
                              src={profileImage} 
                              alt="Profile" 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                              <span className="text-3xl text-white">{user?.username?.[0]?.toUpperCase()}</span>
                            </div>
                          )}
                        </div>
                        {isEditing && (
                          <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                            <span className="text-white text-sm">Ganti Foto</span>
                            <input 
                              type="file" 
                              className="hidden" 
                              accept="image/*"
                              onChange={handleImageChange}
                            />
                          </label>
                        )}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold mb-4">Informasi Pribadi</h2>
                        {!isEditing ? (
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm text-gray-400 mb-1">Nama Lengkap</label>
                              <p className="text-white">{formData.fullName}</p>
                            </div>
                            <div>
                              <label className="block text-sm text-gray-400 mb-1">NIS</label>
                              <p className="text-white">{formData.nis}</p>
                            </div>
                            <div>
                              <label className="block text-sm text-gray-400 mb-1">Kelas</label>
                              <p className="text-white">{formData.class}</p>
                            </div>
                            <div>
                              <label className="block text-sm text-gray-400 mb-1">Email</label>
                              <p className="text-white">{formData.email}</p>
                            </div>
                          </div>
                        ) : (
                          <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                              <label className="block text-sm text-gray-400 mb-1">Nama Lengkap</label>
                              <input
                                type="text"
                                name="fullName"
                                value={formData.fullName}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 bg-gray-700 rounded-lg focus:ring-2 focus:ring-red-500 text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-sm text-gray-400 mb-1">NIS</label>
                              <input
                                type="text"
                                name="nis"
                                value={formData.nis}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 bg-gray-700 rounded-lg focus:ring-2 focus:ring-red-500 text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-sm text-gray-400 mb-1">Kelas</label>
                              <input
                                type="text"
                                name="class"
                                value={formData.class}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 bg-gray-700 rounded-lg focus:ring-2 focus:ring-red-500 text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-sm text-gray-400 mb-1">Email</label>
                              <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 bg-gray-700 rounded-lg focus:ring-2 focus:ring-red-500 text-white"
                              />
                            </div>
                          </form>
                        )}
                      </div>
                    </div>
                    <button 
                      onClick={isEditing ? handleSubmit : () => setIsEditing(true)}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        isEditing 
                          ? 'bg-green-600 hover:bg-green-700 text-white' 
                          : 'bg-red-600 hover:bg-red-700 text-white'
                      }`}
                    >
                      {isEditing ? 'Simpan' : 'Edit Profile'}
                    </button>
                  </div>
                </div>

                <div className="bg-gray-800/50 backdrop-blur-sm p-3 sm:p-6 rounded-xl border border-gray-700">
                  <h2 className="text-xl font-bold mb-4">Statistik Peminjaman</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-400">Total Buku Dipinjam</p>
                      <p className="text-2xl font-bold text-white">{borrowingStats.totalBorrowed}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Buku Favorit</p>
                      <p className="text-2xl font-bold text-white">{favoriteBook}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Return Confirmation Modal */}
      {showReturnModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-2 sm:px-4">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Konfirmasi Pengembalian</h3>
            <p className="text-gray-300 mb-6">
              Apakah Anda yakin ingin mengembalikan buku ini?
            </p>
            <div className="flex space-x-4">
              <button
                onClick={() => setShowReturnModal(false)}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              >
                Batal
              </button>
              <button
                onClick={confirmReturn}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Ya, Kembalikan & Beri Testimoni
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-2 sm:px-4">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 text-green-500 mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                Terima Kasih!
              </h3>
              <p className="text-gray-300 mb-6">
                Buku telah berhasil dikembalikan
              </p>
              <div className="space-y-3">
                <button
                  onClick={handleNavigateToTestimonial}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Berikan Testimoni
                </button>
                <button
                  onClick={handleFinishReturn}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Selesai
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Digital Reader Modal */}
      {showDigitalReader && selectedBook && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex flex-col z-[200] px-0">
          <div className="digital-reader min-h-screen flex flex-col">
            {/* Reader Header */}
            <div className="p-6 flex items-center justify-between bg-gradient-to-b from-black to-transparent">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleCloseReader}
                  className="control-button"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7 7 7" />
                  </svg>
                </button>
                <div>
                  <p className="text-gray-400 text-sm">
                    {currentPage === 100 ? 'Selesai dibaca' : 'Sedang membaca'}
                  </p>
                  <h3 className="text-white font-medium">{selectedBook.title}</h3>
                </div>
              </div>
            </div>

            {/* Book Content */}
            <div className="flex-1 overflow-auto py-12 px-4">
              <div className="book-container">
                <div className="book-header">
                  <h1 className="book-title">{selectedBook.title}</h1>
                  <p className="book-author">oleh {selectedBook.author}</p>
                </div>
                <div className="book-content">
                  <p>
                    {currentPage === 1
                      ? selectedBook.synopsis
                      : `Halaman ${currentPage} dari buku ini sedang dalam proses digitalisasi.`}
                  </p>
                </div>
                <div className="page-number">
                  ~ Halaman {currentPage} ~
                </div>
              </div>
            </div>

            {/* Reader Controls */}
            <div className="reader-controls">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="control-button"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex items-center gap-6">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 10))}
                  className="text-white/70 hover:text-white transition-colors px-3 py-1 rounded-lg bg-gray-800 hover:bg-gray-700"
                >
                  -10
                </button>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={currentPage}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      if (!isNaN(value)) {
                        setCurrentPage(Math.min(100, Math.max(1, value)));
                      }
                    }}
                    className="w-16 text-center bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-white"
                  />
                  <span className="text-gray-400">/ 100</span>
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(100, prev + 10))}
                  className="text-white/70 hover:text-white transition-colors px-3 py-1 rounded-lg bg-gray-800 hover:bg-gray-700"
                >
                  +10
                </button>
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(100, prev + 1))}
                disabled={currentPage === 100}
                className="control-button"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-2 sm:px-4">
          <div className="bg-gray-800 rounded-xl p-6 max-w-4xl w-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Request Peminjaman Buku</h3>
              <button
                onClick={() => setShowRequestModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {availableBooks.filter(book => book.stock === 0).map(book => (
                <div key={book.id} 
                  className="bg-gray-700/50 rounded-lg overflow-hidden border border-gray-600 hover:border-red-500 transition-colors cursor-pointer"
                  onClick={() => handleRequestBook(book)}
                >
                  <img
                    src={book.imageUrl || `https://source.unsplash.com/random/400x600/?book,${book.title}`}
                    alt={book.title}
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-4">
                    <h4 className="font-medium text-white mb-1">{book.title}</h4>
                    <p className="text-sm text-gray-400 mb-2">oleh {book.author}</p>
                    <span className="inline-block px-2 py-1 text-xs bg-red-900/50 text-red-300 rounded-full">
                      {book.category}
                    </span>
                  </div>
                </div>
              ))}
              {availableBooks.filter(book => book.stock === 0).length === 0 && (
                <div className="col-span-full text-center text-gray-500 py-8">
                  Tidak ada buku yang habis stok untuk direquest
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Overdue Modal */}
      {showOverdueModal && overdueBooks.length > 0 && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] px-2 sm:px-4">
          <div className="bg-gray-800 rounded-xl p-8 max-w-lg w-full border border-red-600 shadow-2xl">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/20 text-red-500 mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-red-500 mb-2">
                Maaf, harap kembalikan buku tersebut
              </h3>
              <p className="text-gray-300 mb-4">
                Anda memiliki buku yang sudah melewati tenggat waktu pengembalian. Silakan kembalikan terlebih dahulu untuk melanjutkan.
              </p>
            </div>
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-gray-300 text-sm border border-gray-700 rounded-lg">
                <thead className="bg-gray-900/80">
                  <tr>
                    <th className="px-3 py-2 text-left">Judul Buku</th>
                    <th className="px-3 py-2 text-left">Tanggal Pinjam</th>
                    <th className="px-3 py-2 text-left">Tenggat</th>
                    <th className="px-3 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {overdueBooks.map(book => (
                    <tr key={book.borrowId ?? `${book.title}-${book.dueDate}`}>
                      <td className="px-3 py-2">{book.title}</td>
                      <td className="px-3 py-2">{new Date(book.borrowDate).toLocaleDateString()}</td>
                      <td className="px-3 py-2">{new Date(book.dueDate).toLocaleDateString()}</td>
                      <td className="px-3 py-2">
                        <span className="px-2 py-1 rounded-full bg-red-100 text-red-800 text-xs">Terlambat</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              onClick={handleGoToReturnTab}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
            >
              Ok, saya kembalikan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentDashboard;