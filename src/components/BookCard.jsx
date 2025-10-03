import { useState, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useBorrow } from '../context/BorrowContext';
import { ReadingContext } from '../context/ReadingContext';
import PropTypes from 'prop-types';
import { useInView } from '../hooks/useInView';

function BookCard({ id, title, author, category, available, imageUrl, synopsis, stock }) {
  const { user } = useContext(AuthContext);
  const { borrowBook } = useBorrow();
  const { updateReadingProgress, startReading } = useContext(ReadingContext);
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [showDigitalReader, setShowDigitalReader] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 100;
  const [isFlipping, setIsFlipping] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showBorrowConfirm, setShowBorrowConfirm] = useState(false);
  const [borrowDates, setBorrowDates] = useState(() => {
    const today = new Date();
    const startDate = today.toISOString().split('T')[0];
    // Set end date to 2 days after start date (so duration = 3 days if jam sama)
    const endDateObj = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000);
    const endDate = endDateObj.toISOString().split('T')[0];
    return {
      startDate,
      startTime: '08:00',
      endDate,
      endTime: '08:00'
    };
  });
  const pageRef = useRef(null);
  const [cardRef, isInView] = useInView({ threshold: 0.1 });

  // Add new state for reading progress
  const [readingProgress, setReadingProgress] = useState(() => {
    const saved = localStorage.getItem(`readingProgress_${id}`);
    return saved ? JSON.parse(saved) : { currentPage: 1, lastRead: null };
  });

  // New state to manage request status
  const [requestStatus, setRequestStatus] = useState(() => {
    if (!user) return null;
    const requests = JSON.parse(localStorage.getItem(`bookRequests_${user.username}`) || '[]');
    const request = requests.find(r => r.bookId === id);
    return request ? request.status : null;
  });

  const handleReadDigital = () => {
    setShowDigitalReader(true);
    setShowModal(false);
  };

  const handlePageTurn = (direction) => {
    if (isFlipping) return;
    setIsFlipping(true);
    const page = pageRef.current;
    
    if (direction === 'next' && currentPage < totalPages) {
      page.classList.add('flipping');
      setTimeout(() => {
        setCurrentPage(currentPage + 1);
        page.classList.remove('flipping');
        setIsFlipping(false);
      }, 400); // Half of transition time
    } else if (direction === 'prev' && currentPage > 1) {
      page.classList.add('flipping-reverse');
      setTimeout(() => {
        setCurrentPage(currentPage - 1);
        page.classList.remove('flipping-reverse');
        setIsFlipping(false);
      }, 400);
    } else {
      setIsFlipping(false);
    }
  };

  const handleAction = (action) => {
    if (!user) {
      setShowAlert(true);
      setTimeout(() => {
        setShowAlert(false);
        navigate('/register');
      }, 2000);
      return;
    }

    if (action === 'read') {
      handleReadDigital();
    } else if (action === 'borrow') {
      handleBorrow();
    }
  };

  const handleBorrow = () => {
    if (!user) {
      setShowAlert(true);
      return;
    }
    
    if (stock === 0 && !requestStatus) {
      setShowAlert(true);
      setTimeout(() => {
        setShowAlert(false);
        navigate('/dashboard?tab=request');
      }, 3000);
      return;
    }
    
    if (stock === 0 && requestStatus !== 'approved') {
      setShowAlert(true);
      return;
    }
    
    setShowBorrowConfirm(true);
  };

  // Modifikasi handleDateChange untuk membatasi maksimal 3 hari (jam juga disesuaikan)
  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setBorrowDates(prev => {
      let newDates = { ...prev, [name]: value };

      // Hitung tanggal mulai dan tanggal akhir
      const startDateTime = new Date(`${newDates.startDate}T${newDates.startTime}`);
      let endDateTime = new Date(`${newDates.endDate}T${newDates.endTime}`);

      // Jika endDateTime kurang dari startDateTime, set endDateTime = startDateTime
      if (endDateTime < startDateTime) {
        endDateTime = new Date(startDateTime);
        newDates.endDate = endDateTime.toISOString().split('T')[0];
        newDates.endTime = newDates.startTime;
      }

      // Hitung selisih hari (benar-benar dalam 24 jam, bukan hanya tanggal)
      const diffMs = endDateTime - startDateTime;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      // Jika lebih dari 3 hari (72 jam), paksa endDateTime ke max 3 hari (72 jam) dari startDateTime
      if (diffMs > 3 * 24 * 60 * 60 * 1000) {
        const maxEnd = new Date(startDateTime.getTime() + 3 * 24 * 60 * 60 * 1000);
        newDates.endDate = maxEnd.toISOString().split('T')[0];
        newDates.endTime = maxEnd.toISOString().split('T')[1].slice(0,5);
      }

      return newDates;
    });
  };

  // Hitung durasi pinjam (benar-benar dalam 24 jam, bukan hanya tanggal)
  const startDateTime = new Date(`${borrowDates.startDate}T${borrowDates.startTime}`);
  const endDateTime = new Date(`${borrowDates.endDate}T${borrowDates.endTime}`);
  const borrowDuration = Math.ceil((endDateTime - startDateTime) / (1000 * 60 * 60 * 24));

  // State untuk error durasi
  const [durationError, setDurationError] = useState('');

  // Modifikasi confirmBorrow agar tidak bisa pinjam jika > 3 hari
  const confirmBorrow = async () => {
    if (borrowDuration > 3) {
      setDurationError('Durasi peminjaman maksimal 3 hari!');
      setTimeout(() => setDurationError(''), 2500);
      return;
    }
    
    try {
      console.log('=== Frontend Borrow Debug ===');
      console.log('Book ID:', id);
      console.log('Book ID type:', typeof id);
      console.log('Book title:', title);
      console.log('Borrow data:', {
        id: id,
        borrowDate: `${borrowDates.startDate}T${borrowDates.startTime}`,
        dueDate: `${borrowDates.endDate}T${borrowDates.endTime}`
      });
      
      await borrowBook({
        id: id,
        borrowDate: `${borrowDates.startDate}T${borrowDates.startTime}`,
        dueDate: `${borrowDates.endDate}T${borrowDates.endTime}`
      });
      
      setShowBorrowConfirm(false);
      navigate('/dashboard');
    } catch (error) {
      console.error('Error borrowing book:', error);
      
      // Show user-friendly error message
      const errorMessage = error.message || 'Terjadi kesalahan saat meminjam buku';
      alert(errorMessage);
      
      setShowBorrowConfirm(false);
    }
  };

  // Tambahkan fungsi untuk navigasi halaman
  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Tambahkan fungsi untuk handle slide
  const handlePageSlide = (e) => {
    const newPage = parseInt(e.target.value);
    setCurrentPage(newPage);
  };

  // Fungsi untuk mengatur halaman dengan slide
  const handleSlideChange = (e) => {
    const newPage = parseInt(e.target.value);
    handlePageChange(newPage);
  };

  // Modifikasi handlePageChange
  const handlePageChange = (newPage) => {
    const targetPage = Math.max(1, Math.min(newPage, totalPages));
    if (targetPage === currentPage) return;

    setCurrentPage(targetPage);
    
    // Save progress on every page change
    updateReadingProgress(id, title, author, targetPage, totalPages);

    // Animation for page transition
    const pageContent = document.querySelector('.book-content');
    if (pageContent) {
      pageContent.style.opacity = '0';
      setTimeout(() => {
        pageContent.style.opacity = '1';
        if (targetPage === totalPages) {
          setTimeout(() => setShowCompletionModal(true), 500);
        }
      }, 300);
    }
  };

  const handleGoToTestimonials = () => {
    setShowCompletionModal(false);
    setShowDigitalReader(false);
    // Navigate to homepage first if not already there
    if (window.location.pathname !== '/') {
      navigate('/');
    }
    // Give time for navigation to complete
    setTimeout(() => {
      const testimonialSection = document.getElementById('testimonial-section');
      if (testimonialSection) {
        testimonialSection.scrollIntoView({ behavior: 'smooth' });
        // Trigger testimonial form to open
        window.dispatchEvent(new CustomEvent('openTestimonialForm'));
      }
    }, 100);
  };

  // Tambahkan fungsi untuk handle input langsung
  const handleDirectPageInput = (e) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 1 && value <= totalPages) {
      handlePageChange(value);
    }
  };

  const handleContinueReading = () => {
    const savedProgress = localStorage.getItem(`readingProgress_${id}`);
    let startPage = 1;
    
    if (savedProgress) {
      const { currentPage } = JSON.parse(savedProgress);
      startPage = currentPage;
    }

    setCurrentPage(startPage);
    setShowDigitalReader(true);
  };

  // Update handleCloseReader to ensure progress is saved
  const handleCloseReader = () => {
    if (currentPage > 1) { // Only save if user has read something
      updateReadingProgress(id, title, author, currentPage, totalPages);
      
      // Update local reading progress
      localStorage.setItem(`readingProgress_${id}`, JSON.stringify({
        currentPage,
        lastRead: new Date().toISOString(),
        progress: Math.round((currentPage / totalPages) * 100)
      }));
    }
    setShowDigitalReader(false);
  };

  // Add helper function to determine status
  const getStatus = (stock) => {
    return stock > 0 ? 'Tersedia' : 'Tidak Tersedia';
  };

  // Update button text based on request status
  const getBorrowButtonText = () => {
    if (stock === 0) {
      if (!requestStatus) return 'Request Buku';
      if (requestStatus === 'pending') return 'Menunggu Persetujuan';
      if (requestStatus === 'approved') return 'Pinjam';
      return 'Request Ditolak';
    }
    return 'Pinjam';
  };

  return (
    <>
      <div 
        ref={cardRef}
        className={`bg-gray-900 rounded-lg shadow-md overflow-hidden border border-gray-800 transition-all duration-700 transform ${
          isInView 
            ? 'opacity-100 translate-y-0' 
            : 'opacity-0 translate-y-20'
        }`}
      >
        {/* Card thumbnail and basic info */}
        <div className="relative cursor-pointer" onClick={() => setShowModal(true)}>
          <img 
            src={imageUrl || `https://source.unsplash.com/random/400x600/?book,${title}`}
            alt={title} 
            className="w-full h-64 object-cover"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = `https://via.placeholder.com/400x600/374151/FFFFFF?text=${encodeURIComponent(title)}`;
            }}
          />
          <div className={`absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium ${
            stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {getStatus(stock)}
          </div>
        </div>
        
        {/* Card content */}
        <div className="p-4">
          <h3 className="font-semibold text-white mb-1 line-clamp-2">{title}</h3>
          <p className="text-sm text-gray-400 mb-2">oleh {author}</p>
          <div className="flex justify-between items-center">
            <span className="text-xs bg-red-900/50 text-red-300 px-2 py-1 rounded-full">
              {category}
            </span>
            {/* Only show button for student role */}
            {user?.role === 'student' && (
              <button 
                className={`px-3 py-1 rounded text-xs font-medium ${
                  available && stock > 0
                    ? 'bg-red-600 text-white hover:bg-red-700' 
                    : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                }`}
                disabled={!available || stock === 0}
                onClick={() => handleAction('borrow')}
              >
                {getBorrowButtonText()}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Alert Modal */}
      {showAlert && (
        <div className="fixed inset-0 flex items-center justify-center z-[60] px-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
          <div className="bg-gray-900 border border-red-500 rounded-lg p-6 max-w-sm w-full relative z-10 transform animate-bounce">
            <div className="flex items-center gap-3 text-red-500">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-lg font-medium">Peringatan</span>
            </div>
            <p className="mt-3 text-gray-300">
              {!user 
                ? "Harap login atau register terlebih dahulu untuk mengakses fitur ini."
                : stock === 0 
                  ? "Maaf, buku ini tidak dapat dipinjam karena stok sudah habis." 
                  : ""}
            </p>
          </div>
        </div>
      )}

      {/* Modal Detail Buku */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-2 sm:px-4">
          <div className="bg-gray-900 rounded-xl w-full max-w-lg sm:max-w-2xl border border-gray-700 overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start p-4 sm:p-6 gap-4 sm:gap-0">
              {/* Gambar buku responsif */}
              <div className="w-full sm:w-1/3 flex-shrink-0 flex justify-center items-start mb-4 sm:mb-0">
                <img 
                  src={imageUrl || `https://source.unsplash.com/random/400x600/?book,${title}`}
                  alt={title}
                  className="w-32 h-48 sm:w-full sm:h-auto object-cover rounded-lg"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = `https://via.placeholder.com/400x600/374151/FFFFFF?text=${encodeURIComponent(title)}`;
                  }}
                />
              </div>
              {/* Detail buku responsif */}
              <div className="w-full sm:w-2/3 sm:pl-6 flex flex-col">
                <div className="flex justify-between items-start">
                  <h2 className="text-lg sm:text-2xl font-bold text-white mb-2">{title}</h2>
                  <button 
                    onClick={() => setShowModal(false)}
                    className="text-gray-400 hover:text-white ml-2"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="text-gray-400 mb-2 sm:mb-4 text-sm sm:text-base">oleh {author}</p>
                <div className="space-y-2 sm:space-y-4 flex-1">
                  <div>
                    <h3 className="text-xs sm:text-sm text-gray-500 uppercase">Kategori</h3>
                    <p className="text-white text-sm sm:text-base">{category}</p>
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm text-gray-500 uppercase">Status</h3>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs sm:text-sm ${
                      stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {getStatus(stock)}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm text-gray-500 uppercase">Sinopsis</h3>
                    <p className="text-gray-300 leading-relaxed text-xs sm:text-base">{synopsis}</p>
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm text-gray-500 uppercase">Stok</h3>
                    <p className="text-gray-300 text-xs sm:text-base">{stock} buku tersisa</p>
                  </div>
                </div>
                {/* Only show action buttons for student role */}
                {user?.role === 'student' && (
                  <div className="mt-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={() => handleAction('read')}
                        className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Baca Digital
                      </button>
                      {available && stock > 0 ? (
                        <button 
                          onClick={() => handleAction('borrow')}
                          className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                          </svg>
                          Pinjam Buku
                        </button>
                      ) : (
                        <button 
                          disabled
                          className="flex-1 bg-gray-700 text-gray-400 py-2 px-4 rounded-lg cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
                        >
                          {stock === 0 ? 'Stok Habis' : 'Tidak Tersedia'}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Digital Reader Modal */}
      {showDigitalReader && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex flex-col z-50">
          <div className="digital-reader min-h-screen flex flex-col">
            {/* Reader Header */}
            <div className="p-6 flex items-center justify-between bg-gradient-to-b from-black to-transparent">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleCloseReader}  // Change this from setShowDigitalReader(false)
                  className="control-button"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>
                <div>
                  <p className="text-gray-400 text-sm">
                    {currentPage === totalPages ? 'Selesai dibaca' : 'Sedang membaca'}
                  </p>
                  <h3 className="text-white font-medium">{title}</h3>
                </div>
              </div>
            </div>

            {/* Book Content */}
            <div className="flex-1 overflow-auto py-12 px-4">
              <div className="book-container">
                <div className="book-header">
                  <h1 className="book-title">{title}</h1>
                  <p className="book-author">oleh {author}</p>
                </div>
                
                <div className="book-content">
                  <p>
                    {currentPage === 1 ? synopsis : `Halaman ${currentPage} dari buku ini sedang dalam proses digitalisasi.`}
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
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="control-button"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <div className="flex items-center gap-6">
                <button 
                  onClick={() => handlePageChange(currentPage - 10)}
                  disabled={currentPage <= 1}
                  className="text-white/70 hover:text-white transition-colors px-3 py-1 rounded-lg bg-gray-800 hover:bg-gray-700"
                >
                  -10
                </button>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max={totalPages}
                    value={currentPage}
                    onChange={handleDirectPageInput}
                    onBlur={(e) => {
                      const value = parseInt(e.target.value);
                      if (value < 1) e.target.value = 1;
                      if (value > totalPages) e.target.value = totalPages;
                    }}
                    className="w-16 text-center bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  <span className="text-gray-400">/ {totalPages}</span>
                </div>

                <button 
                  onClick={() => handlePageChange(currentPage + 10)}
                  disabled={currentPage >= totalPages}
                  className="text-white/70 hover:text-white transition-colors px-3 py-1 rounded-lg bg-gray-800 hover:bg-gray-700"
                >
                  +10
                </button>
              </div>

              <button 
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="control-button"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Completion Modal */}
            {showCompletionModal && (
              <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] px-4">
                <div className="bg-gray-800 rounded-xl p-8 max-w-md w-full border border-gray-700">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 text-green-500 mb-4">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">
                      Selamat! 🎉
                    </h3>
                    <p className="text-gray-300 mb-6">
                      Anda telah menyelesaikan buku "{title}"
                    </p>
                    <div className="space-y-3">
                      <button
                        onClick={handleGoToTestimonials}
                        className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        Kirim Testimoni
                      </button>
                      <button
                        onClick={() => setShowCompletionModal(false)}
                        className="w-full bg-gray-700 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors"
                      >
                        Lanjut Membaca
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Borrow Confirmation Modal */}
      {showBorrowConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] px-4">
          <div className="bg-gray-800/95 backdrop-blur-sm rounded-xl p-6 max-w-lg w-full border border-gray-700 shadow-2xl">
            <div className="flex gap-4">
              {/* Book Preview - Made smaller */}
              <div className="hidden sm:block w-1/4">
                <img 
                  src={imageUrl || `https://source.unsplash.com/random/400x600/?book,${title}`}
                  alt={title}
                  className="w-full h-auto rounded-lg shadow-lg"
                />
              </div>
              
              {/* Confirmation Content */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-white">Konfirmasi Peminjaman</h3>
                </div>

                <div className="space-y-3 mb-4">
                  <div>
                    <h4 className="text-sm text-gray-400">Judul Buku</h4>
                    <p className="text-base text-white font-medium">{title}</p>
                  </div>
                  <div>
                    <h4 className="text-sm text-gray-400">Penulis</h4>
                    <p className="text-white text-sm">{author}</p>
                  </div>
                  <div>
                    <h4 className="text-sm text-gray-400">Kategori</h4>
                    {/* Perbaiki penulisan kategori */}
                    <span className="inline-block px-2 py-0.5 rounded-full text-sm bg-red-900/30 text-red-400">
                      {category}
                    </span>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                    <h4 className="text-sm text-gray-400 mb-3">Informasi Peminjaman</h4>
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm text-gray-400 mb-1">Tanggal Pinjam</label>
                          <input
                            type="date"
                            name="startDate"
                            value={borrowDates.startDate}
                            min={new Date().toISOString().split('T')[0]}
                            onChange={handleDateChange}
                            className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="mt-3 sm:mt-0">
                          <label className="block text-sm text-gray-400 mb-1">Jam Pinjam</label>
                          <input
                            type="time"
                            name="startTime"
                            value={borrowDates.startTime}
                            onChange={handleDateChange}
                            min="08:00"
                            max="16:00"
                            className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm text-gray-400 mb-1">Tanggal Pengembalian</label>
                          <input
                            type="date"
                            name="endDate"
                            value={borrowDates.endDate}
                            min={borrowDates.startDate}
                            onChange={handleDateChange}
                            className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="mt-3 sm:mt-0">
                          <label className="block text-sm text-gray-400 mb-1">Jam Pengembalian</label>
                          <input
                            type="time"
                            name="endTime"
                            value={borrowDates.endTime}
                            onChange={handleDateChange}
                            min="08:00"
                            max="16:00"
                            className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div className="flex justify-between text-sm border-t border-gray-700 pt-3">
                        <span className="text-gray-400">Durasi Peminjaman:</span>
                        <span className="text-white">
                          {borrowDuration} hari
                        </span>
                      </div>
                      {borrowDuration > 3 && (
                        <div className="text-xs text-red-500 font-semibold">
                          Durasi peminjaman maksimal 3 hari!
                        </div>
                      )}
                      <div className="text-xs text-gray-500">
                        * Jam operasional perpustakaan: 08:00 - 16:00
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowBorrowConfirm(false)}
                    className="flex-1 px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition-colors text-sm"
                  >
                    Batal
                  </button>
                  <button
                    onClick={confirmBorrow}
                    className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] text-sm"
                    disabled={borrowDuration > 3}
                  >
                    Konfirmasi Peminjaman
                  </button>
                </div>
                {durationError && (
                  <div className="mt-2 text-center text-xs text-red-500">{durationError}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

BookCard.propTypes = {
  id: PropTypes.string.isRequired,  // Add missing id prop
  title: PropTypes.string.isRequired,
  author: PropTypes.string.isRequired,
  category: PropTypes.string.isRequired,
  available: PropTypes.bool.isRequired,
  imageUrl: PropTypes.string,
  synopsis: PropTypes.string,
  stock: PropTypes.number.isRequired
};

export default BookCard;