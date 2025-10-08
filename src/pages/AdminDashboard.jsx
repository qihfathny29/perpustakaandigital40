import { useContext, useState, useEffect, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { usersAPI, booksAPI, authAPI, requestAPI, borrowAPI } from '../utils/api';
import Chart from 'chart.js/auto';
import { useBorrow } from '../context/BorrowContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import JsBarcode from 'jsbarcode';

// Barcode Component
const BarcodeComponent = ({ value }) => {
  const canvasRef = useCallback((canvas) => {
    if (canvas && value) {
      JsBarcode(canvas, value, {
        format: "CODE128",
        width: 2,
        height: 80,
        displayValue: true,
        fontSize: 12,
        textMargin: 5,
        background: "#ffffff",
        lineColor: "#000000"
      });
    }
  }, [value]);

  return <canvas ref={canvasRef}></canvas>;
};

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

function AdminDashboard() {
  const { user, logout } = useContext(AuthContext);
  const { borrowRequests } = useBorrow();
  const navigate = useNavigate();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newBook, setNewBook] = useState({
    title: '',
    author: '',
    synopsis: '',
    category: 'Fiksi',
    imageUrl: '',
    stock: 1, // Add initial stock value
    book_id: '', // Add book ID for barcode generation
    qr_code_data: '' // Add barcode data (reusing same field name)
  });
  const [editingBook, setEditingBook] = useState(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(null);
  const [notification, setNotification] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard'); // Default to dashboard
  const [bookRequests, setBookRequests] = useState([]); // Dari API, bukan localStorage
  
  // State untuk users dari API
  const [users, setUsers] = useState([]);
  
  // State untuk books dari API
  const [books, setBooks] = useState([]);
  
  // State untuk dashboard statistics
  const [dashboardStats, setDashboardStats] = useState({
    books: { total: 0, available: 0, unavailable: 0 },
    borrows: { total: 0, active: 0, returned: 0, overdue: 0 },
    users: { total: 0 }
  });

  // State untuk borrow statistics (untuk grafik peminjaman)
  const [borrowStatusStats, setBorrowStatusStats] = useState([]);
  
  // State untuk filter tanggal
  const [dateFilter, setDateFilter] = useState({
    period: 'all', // 'all', 'month', 'year', 'custom'
    startDate: '',
    endDate: ''
  });

  // State untuk profile admin
  const [profile, setProfile] = useState({
    fullName: user?.username || 'Admin',
    email: user?.email || 'admin@example.com',
  });
  const [profileImage, setProfileImage] = useState(() => {
    return localStorage.getItem('adminProfileImage') || null;
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);

  // State untuk download modal
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadFilter, setDownloadFilter] = useState({
    type: 'all', // 'all', 'date', 'month', 'year'
    selectedDate: '',
    selectedMonth: '',
    selectedYear: ''
  });

  const categories = ['Fiksi', 'Non-Fiksi', 'Pendidikan', 'Novel'];

  // Barcode generation functions
  const generateBarcodeData = (bookId) => {
    // For barcode, we just use the book ID directly
    return bookId;
  };

  const generateBookId = () => {
    // Generate unique book ID (timestamp + random) - format for barcode
    const timestamp = Date.now().toString().slice(-6); // Last 6 digits
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${timestamp}${random}`; // 9 digit number for CODE128
  };

  const handleGenerateBarcode = () => {
    // Gunakan Book ID yang sudah diketik user, atau generate baru jika kosong
    const bookId = newBook.book_id.trim() || generateBookId();
    const barcodeData = generateBarcodeData(bookId);
    setNewBook({
      ...newBook,
      book_id: bookId,
      qr_code_data: barcodeData
    });
  };

  const downloadBarcode = async (bookId, barcodeData) => {
    try {
      const canvas = document.createElement('canvas');
      JsBarcode(canvas, barcodeData, {
        format: "CODE128",
        width: 2,
        height: 100,
        displayValue: true,
        fontSize: 14,
        textMargin: 5,
        background: "#ffffff",
        lineColor: "#000000"
      });
      
      const link = document.createElement('a');
      link.download = `Barcode-${bookId}.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch (error) {
      console.error('Error generating barcode:', error);
      setNotification('Gagal generate barcode');
      setTimeout(() => setNotification(''), 3000);
    }
  };

  // Function untuk fetch users dari API
  const fetchUsers = async () => {
    try {
      const response = await usersAPI.getAll();
      if (response.status === 'success') {
        setUsers(response.data.users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setNotification('Gagal memuat data users');
      setTimeout(() => setNotification(''), 3000);
    }
  };

  // Function untuk fetch dashboard stats dari API
  const fetchDashboardStats = async () => {
    try {
      console.log('🔄 Fetching dashboard stats...');
      const response = await booksAPI.getDashboardStats();
      console.log('📊 Dashboard stats response:', response);
      if (response.status === 'success') {
        setDashboardStats(response.data);
        console.log('✅ Dashboard stats updated:', response.data);
      }
    } catch (error) {
      console.error('❌ Error fetching dashboard stats:', error);
      // Keep default stats if API fails
    }
  };

  // Function untuk fetch books dari API
  const fetchBooks = async () => {
    try {
      const response = await booksAPI.getAll();
      if (response.status === 'success') {
        setBooks(response.data.books);
      }
    } catch (error) {
      console.error('Error fetching books:', error);
      setNotification('Gagal memuat data buku');
      setTimeout(() => setNotification(''), 3000);
    }
  };

  // Function untuk fetch borrow status statistics dari API
  const fetchBorrowStatusStats = async (filter = null) => {
    try {
      const response = await borrowAPI.getBorrowStatusStats(filter);
      if (response.status === 'success') {
        setBorrowStatusStats(response.data.statusStats);
      }
    } catch (error) {
      console.error('Error fetching borrow status stats:', error);
      setBorrowStatusStats([]);
    }
  };

  // Function untuk create book
  const handleAddBook = async (e) => {
    e.preventDefault();
    try {
      console.log('Attempting to create book with data:', {
        ...newBook,
        imageUrl: newBook.imageUrl ? `[Base64 data - ${newBook.imageUrl.length} characters]` : 'No image'
      });
      
      const response = await booksAPI.create(newBook);
      console.log('Book creation response:', response);
      
      if (response.status === 'success') {
        setShowAddForm(false);
        setNewBook({
          title: '',
          author: '',
          synopsis: '',
          category: 'Fiksi',
          imageUrl: '',
          stock: 1,
          book_id: '',
          qr_code_data: ''
        });
        setNotification('Buku berhasil ditambahkan!');
        fetchBooks(); // Refresh data
      }
    } catch (error) {
      console.error('Create book error:', error);
      setNotification('Gagal menambahkan buku: ' + (error.message || 'Unknown error'));
    } finally {
      setTimeout(() => setNotification(''), 3000);
    }
  };

  // Function untuk update book
  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const response = await booksAPI.update(editingBook.id, editingBook);
      if (response.status === 'success') {
        setEditingBook(null);
        setNotification('Buku berhasil diperbarui!');
        fetchBooks(); // Refresh data
      }
    } catch (error) {
      console.error('Error updating book:', error);
      setNotification('Gagal memperbarui buku');
    } finally {
      setTimeout(() => setNotification(''), 3000);
    }
  };

  // Function untuk delete book
  const handleDelete = async (bookId) => {
    try {
      const response = await booksAPI.delete(bookId);
      if (response.status === 'success') {
        setShowConfirmDelete(null);
        setNotification('Buku berhasil dihapus');
        fetchBooks(); // Refresh data
      }
    } catch (error) {
      console.error('Error deleting book:', error);
      setNotification('Gagal menghapus buku');
    } finally {
      setTimeout(() => setNotification(''), 3000);
    }
  };

  // Load data saat component mount atau tab berubah
  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
    if (activeTab === 'books') {
      fetchBooks();
    }
    if (activeTab === 'dashboard') {
      fetchDashboardStats();
    }
    if (activeTab === 'reports') {
      fetchBooks(); // Fetch books untuk data laporan
      fetchBorrowStatusStats(); // Fetch data status peminjaman
    }
  }, [activeTab]);

  // Sync profile dengan user context
  useEffect(() => {
    if (user) {
      setProfile({
        fullName: user.username || 'Admin',
        email: user.email || 'admin@example.com',
      });
    }
  }, [user]);

  // Initial load dashboard stats and books
  useEffect(() => {
    fetchDashboardStats();
    fetchBooks(); // Load books for initial data
    fetchBorrowStatusStats(); // Load borrow status stats for initial data
  }, []);

  // Helper function to get date filter parameters
  const getDateFilterParams = useCallback(() => {
    const now = new Date();
    let startDate, endDate;

    switch (dateFilter.period) {
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      case 'custom':
        if (dateFilter.startDate && dateFilter.endDate) {
          startDate = new Date(dateFilter.startDate);
          endDate = new Date(dateFilter.endDate);
        }
        break;
      default:
        return null;
    }

    if (startDate && endDate) {
      return {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      };
    }
    return null;
  }, [dateFilter]);

  // Update chart when date filter changes
  useEffect(() => {
    if (activeTab === 'reports') {
      const filter = getDateFilterParams();
      fetchBorrowStatusStats(filter);
    }
  }, [dateFilter, activeTab, getDateFilterParams]);

  // Fetch book requests dari API
  useEffect(() => {
    const fetchBookRequests = async () => {
      if (!user || user.role !== 'admin') return;
      
      try {
        const response = await requestAPI.getAll();
        if (response.status === 'success') {
          console.log('📊 Book requests data:', response.data.requests);
          setBookRequests(response.data.requests || []);
        }
      } catch (error) {
        console.error('Error fetching book requests:', error);
        setBookRequests([]);
      }
    };

    fetchBookRequests();
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleEdit = (book) => {
    setEditingBook(book);
  };





  // Untuk update data jika ada perubahan di localStorage
  useEffect(() => {
    const syncUsers = () => setUsers(JSON.parse(localStorage.getItem('users') || '[]'));
    window.addEventListener('storage', syncUsers);
    return () => {
      window.removeEventListener('storage', syncUsers);
    };
  }, []);

  // Fungsi untuk statistik peminjaman siswa
  const getStudentStats = (username) => {
    const userBorrows = borrowRequests.filter(b => b.user?.username === username);
    const total = userBorrows.length;
    const active = userBorrows.filter(b => b.status === 'borrowed').length;
    const overdue = userBorrows.filter(b => b.status === 'borrowed' && new Date(b.dueDate) < new Date()).length;
    // Hitung buku favorit
    const countMap = {};
    userBorrows.forEach(b => {
      if (b.title) countMap[b.title] = (countMap[b.title] || 0) + 1;
    });
    let fav = 'Belum ada';
    let max = 0;
    Object.entries(countMap).forEach(([title, count]) => {
      if (count > max) { fav = title; max = count; }
    });
    return {
      total,
      active,
      overdue,
      favorite: fav
    };
  };

  // Tambahkan useEffect ini DI DALAM fungsi komponen, sebelum return
  useEffect(() => {
    if (activeTab !== 'reports') return;

    // Hapus chart lama jika ada
    if (window.lineChartInstance) window.lineChartInstance.destroy();
    if (window.pieChartInstance) window.pieChartInstance.destroy();
    if (window.statusPieChartInstance) window.statusPieChartInstance.destroy();

    // Data untuk diagram garis (stok buku per judul)
    const bookTitles = books.map(b => b.title);
    const bookStocks = books.map(b => b.stock);

    // Data untuk diagram lingkaran (kategori buku)
    const categoryCount = {};
    books.forEach(b => {
      categoryCount[b.category] = (categoryCount[b.category] || 0) + 1;
    });
    const pieLabels = Object.keys(categoryCount);
    const pieData = Object.values(categoryCount);

    // Gunakan Chart dari import, bukan window.Chart
    const lineCtx = document.getElementById('lineChart')?.getContext('2d');
    const pieCtx = document.getElementById('pieChart')?.getContext('2d');
    if (lineCtx) {
      window.lineChartInstance = new Chart(lineCtx, {
        type: 'line',
        data: {
          labels: bookTitles,
          datasets: [{
            label: 'Stok Buku',
            data: bookStocks,
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239,68,68,0.2)',
            tension: 0.3,
            fill: true,
            pointBackgroundColor: '#fff',
            pointBorderColor: '#ef4444'
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: false }
          },
          scales: {
            x: { ticks: { color: '#fff' } },
            y: { beginAtZero: true, ticks: { color: '#fff' } }
          }
        }
      });
    }
    if (pieCtx) {
      window.pieChartInstance = new Chart(pieCtx, {
        type: 'pie',
        data: {
          labels: pieLabels,
          datasets: [{
            data: pieData,
            backgroundColor: [
              '#ef4444', '#f59e42', '#10b981', '#6366f1', '#fbbf24', '#3b82f6'
            ]
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              labels: { color: '#fff' }
            }
          }
        }
      });
    }

    // Data dan chart untuk status peminjaman (Pie Chart)
    const statusLabels = borrowStatusStats.map(stat => stat.label);
    const statusData = borrowStatusStats.map(stat => stat.count);
    const statusColors = borrowStatusStats.map(stat => stat.color);

    const statusPieCtx = document.getElementById('statusPieChart')?.getContext('2d');
    if (statusPieCtx && borrowStatusStats.length > 0) {
      window.statusPieChartInstance = new Chart(statusPieCtx, {
        type: 'doughnut',
        data: {
          labels: statusLabels,
          datasets: [{
            data: statusData,
            backgroundColor: statusColors,
            borderColor: '#374151',
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { 
                color: '#fff',
                padding: 20
              }
            }
          }
        }
      });
    }
  }, [activeTab, books, borrowStatusStats]);

  // Handle profile image change
  const handleProfileImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result);
        localStorage.setItem('adminProfileImage', reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle profile form change
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  // Handle profile form submit
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await authAPI.updateProfile({
        username: profile.fullName
      });
      
      if (response.status === 'success') {
        setIsEditingProfile(false);
        setProfileSuccess(true);
        setTimeout(() => setProfileSuccess(false), 2000);
        
        // Update local profile state with new data from server
        setProfile(prev => ({
          ...prev,
          fullName: response.data.user.username
        }));
        
        setNotification('Profile berhasil diperbarui!');
        setTimeout(() => setNotification(''), 3000);
      }
    } catch (error) {
      console.error('Update profile error:', error);
      setNotification('Gagal memperbarui profile: ' + error.message);
      setTimeout(() => setNotification(''), 3000);
    }
  };

  // Handle Download Data
  const handleDownloadData = () => {
    try {
      // Filter data berdasarkan pilihan user
      let filteredData = borrowRequests;
      let filename = 'data_peminjaman_';
      let periodLabel = '';

      if (downloadFilter.type === 'date' && downloadFilter.selectedDate) {
        const selectedDate = new Date(downloadFilter.selectedDate);
        filteredData = borrowRequests.filter(borrow => {
          const borrowDate = new Date(borrow.borrowDate);
          return borrowDate.toDateString() === selectedDate.toDateString();
        });
        filename += downloadFilter.selectedDate;
        periodLabel = `Tanggal: ${selectedDate.toLocaleDateString('id-ID')}`;
      } else if (downloadFilter.type === 'month' && downloadFilter.selectedMonth) {
        const [year, month] = downloadFilter.selectedMonth.split('-');
        filteredData = borrowRequests.filter(borrow => {
          const borrowDate = new Date(borrow.borrowDate);
          return borrowDate.getFullYear() == year && (borrowDate.getMonth() + 1) == month;
        });
        filename += `${year}-${month}`;
        const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        periodLabel = `Bulan: ${monthNames[month - 1]} ${year}`;
      } else if (downloadFilter.type === 'year' && downloadFilter.selectedYear) {
        filteredData = borrowRequests.filter(borrow => {
          const borrowDate = new Date(borrow.borrowDate);
          return borrowDate.getFullYear() == downloadFilter.selectedYear;
        });
        filename += downloadFilter.selectedYear;
        periodLabel = `Tahun: ${downloadFilter.selectedYear}`;
      } else {
        filename += 'all';
        periodLabel = 'Semua Data';
      }

      // Buat PDF
      const doc = new jsPDF();
      
      // Set font untuk mendukung Unicode (jika diperlukan)
      doc.setFont('helvetica');
      
      // Header
      doc.setFontSize(20);
      doc.setTextColor(40, 40, 40);
      doc.text('Data Peminjaman Buku', 105, 20, { align: 'center' });
      
      // Sub header dengan periode
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(`Periode: ${periodLabel}`, 105, 30, { align: 'center' });
      doc.text(`Tanggal Export: ${new Date().toLocaleDateString('id-ID')}`, 105, 38, { align: 'center' });
      
      // Garis pembatas
      doc.setLineWidth(0.5);
      doc.setDrawColor(200, 200, 200);
      doc.line(20, 45, 190, 45);

      // Prepare data untuk tabel
      const tableData = filteredData.map(borrow => {
        const borrowDate = new Date(borrow.borrowDate).toLocaleDateString('id-ID');
        const dueDate = new Date(borrow.dueDate).toLocaleDateString('id-ID');
        const status = borrow.status === 'pending' ? 'Menunggu Persetujuan' :
                     borrow.status === 'borrowed' ? 'Dipinjam' :
                     borrow.status === 'returned' ? 'Dikembalikan' : 'Ditolak';
        
        return [
          borrow.user?.username || 'N/A',
          borrow.title,
          borrowDate,
          dueDate,
          status
        ];
      });

      // Buat tabel dengan autoTable
      autoTable(doc, {
        head: [['Siswa', 'Judul Buku', 'Tanggal Pinjam', 'Tenggat', 'Status']],
        body: tableData,
        startY: 55,
        styles: {
          fontSize: 10,
          cellPadding: 5,
        },
        headStyles: {
          fillColor: [220, 53, 69], // Red color matching theme
          textColor: 255,
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
        columnStyles: {
          0: { cellWidth: 25 }, // Siswa
          1: { cellWidth: 60 }, // Judul Buku
          2: { cellWidth: 30 }, // Tanggal Pinjam
          3: { cellWidth: 30 }, // Tenggat
          4: { cellWidth: 35 }  // Status
        },
        margin: { top: 55, left: 20, right: 20 },
        didDrawPage: function (data) {
          // Footer
          const pageCount = doc.internal.getNumberOfPages();
          const pageHeight = doc.internal.pageSize.height;
          
          doc.setFontSize(8);
          doc.setTextColor(100, 100, 100);
          doc.text(
            `Halaman ${data.pageNumber} dari ${pageCount}`, 
            105, 
            pageHeight - 10, 
            { align: 'center' }
          );
          
          // Footer info
          doc.text(
            'Generated by Perpustakaan Digital', 
            105, 
            pageHeight - 5, 
            { align: 'center' }
          );
        }
      });

      // Download PDF
      doc.save(`${filename}.pdf`);

      // Close modal and show success notification
      setShowDownloadModal(false);
      setNotification(`Data berhasil didownload sebagai PDF! (${filteredData.length} records)`);
      setTimeout(() => setNotification(''), 3000);

    } catch (error) {
      console.error('Error downloading data:', error);
      setNotification('Gagal mendownload data: ' + error.message);
      setTimeout(() => setNotification(''), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span className="text-xl font-bold">Admin Panel</span>
            </div>

            <nav className="space-y-2 flex-1">
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
                onClick={() => setActiveTab('books')}
                className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${
                  activeTab === 'books' 
                    ? 'bg-red-600 text-white' 
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Manajemen Buku
              </button>

              <button
                onClick={() => setActiveTab('users')}
                className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${
                  activeTab === 'users' 
                    ? 'bg-red-600 text-white' 
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                Manajemen User
              </button>

              <button
                onClick={() => setActiveTab('borrows')}
                className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${
                  activeTab === 'borrows' 
                    ? 'bg-red-600 text-white' 
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Manajemen Peminjaman
              </button>

              <button
                onClick={() => setActiveTab('reports')}
                className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${
                  activeTab === 'reports' 
                    ? 'bg-red-600 text-white' 
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Laporan
              </button>

              <button
                onClick={() => setActiveTab('requests')} 
                className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${
                  activeTab === 'requests'
                    ? 'bg-red-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                Request Siswa
              </button>

              {/* Tambahkan tab Profile */}
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
          <div className="p-6 border-t border-gray-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center overflow-hidden">
                {profileImage ? (
                  <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-bold text-white">{user?.username?.[0]?.toUpperCase()}</span>
                )}
              </div>
              <div>
                <p className="font-medium text-white">{profile.fullName || user?.username}</p>
                <p className="text-sm text-gray-400">Administrator</p>
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
      </div>

      {/* Main Content */}
      <div className="md:ml-64 ml-0 p-2 sm:p-4 md:p-8 transition-all duration-300">
        {notification && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg animate-fade-in z-50 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {notification}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
          <div className="flex items-center bg-gradient-to-br from-red-600/80 to-red-800/80 p-6 rounded-2xl border border-red-700 shadow-lg">
            <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center mr-5">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <h3 className="text-gray-200 text-sm mb-1 font-semibold tracking-wide">Total Buku</h3>
              <p className="text-3xl font-extrabold text-white">{dashboardStats.books.total}</p>
            </div>
          </div>
          <div className="flex items-center bg-gradient-to-br from-green-600/80 to-green-800/80 p-6 rounded-2xl border border-green-700 shadow-lg">
            <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center mr-5">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 className="text-gray-200 text-sm mb-1 font-semibold tracking-wide">Buku Tersedia</h3>
              <p className="text-3xl font-extrabold text-white">
                {dashboardStats.books.available}
              </p>
            </div>
          </div>
          <div className="flex items-center bg-gradient-to-br from-yellow-600/80 to-yellow-800/80 p-6 rounded-2xl border border-yellow-700 shadow-lg">
            <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center mr-5">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6" />
              </svg>
            </div>
            <div>
              <h3 className="text-gray-200 text-sm mb-1 font-semibold tracking-wide">Sedang Dipinjam</h3>
              <p className="text-3xl font-extrabold text-white">
                {dashboardStats.borrows.active}
              </p>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 p-3 sm:p-6">
          {activeTab === 'books' && (
            <>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
                <h2 className="text-xl font-semibold text-white">Manajemen Buku</h2>
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  {showAddForm ? 'Tutup Form' : 'Tambah Buku'}
                </button>
              </div>

              {/* Form Tambah Buku */}
              {showAddForm && (
                <form onSubmit={handleAddBook} className="mb-8 bg-gray-800/50 backdrop-blur-sm p-6 rounded-lg border border-gray-700">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Judul Buku
                      </label>
                      <input
                        type="text"
                        required
                        value={newBook.title}
                        onChange={(e) => setNewBook({...newBook, title: e.target.value})}
                        className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Penulis
                      </label>
                      <input
                        type="text"
                        required
                        value={newBook.author}
                        onChange={(e) => setNewBook({...newBook, author: e.target.value})}
                        className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Sinopsis
                      </label>
                      <textarea
                        required
                        value={newBook.synopsis}
                        onChange={(e) => setNewBook({...newBook, synopsis: e.target.value})}
                        rows="3"
                        className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      ></textarea>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Kategori
                      </label>
                      <select
                        value={newBook.category}
                        onChange={(e) => setNewBook({...newBook, category: e.target.value})}
                        className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      >
                        {categories.map((category) => (
                          <option key={category} value={category} className="bg-gray-700">
                            {category}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Gambar Buku
                      </label>
                      
                      {/* Image Preview */}
                      {newBook.imageUrl && (
                        <div className="mb-4">
                          <img 
                            src={newBook.imageUrl} 
                            alt="Preview" 
                            className="w-32 h-40 object-cover rounded-lg border border-gray-600"
                          />
                          <button
                            type="button"
                            onClick={() => setNewBook({...newBook, imageUrl: ''})}
                            className="mt-2 text-sm text-red-400 hover:text-red-300"
                          >
                            Hapus Gambar
                          </button>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-center w-full">
                        <label className="w-full flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-red-500 bg-gray-700/50">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <svg className="w-8 h-8 mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            <p className="mb-2 text-sm text-gray-400">
                              <span className="font-semibold">Klik untuk upload</span> atau drag and drop
                            </p>
                            <p className="text-xs text-gray-400">PNG, JPG atau GIF</p>
                          </div>
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) {
                                console.log('File selected:', file.name, file.size);
                                
                                // Compress image before converting to base64
                                const canvas = document.createElement('canvas');
                                const ctx = canvas.getContext('2d');
                                const img = new Image();
                                
                                img.onload = () => {
                                  // Set max dimensions
                                  const maxWidth = 800;
                                  const maxHeight = 1200;
                                  
                                  let { width, height } = img;
                                  
                                  // Calculate new dimensions
                                  if (width > height) {
                                    if (width > maxWidth) {
                                      height = (height * maxWidth) / width;
                                      width = maxWidth;
                                    }
                                  } else {
                                    if (height > maxHeight) {
                                      width = (width * maxHeight) / height;
                                      height = maxHeight;
                                    }
                                  }
                                  
                                  canvas.width = width;
                                  canvas.height = height;
                                  
                                  // Draw and compress
                                  ctx.drawImage(img, 0, 0, width, height);
                                  const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7); // 70% quality
                                  
                                  console.log('Original size:', file.size, 'Compressed base64 length:', compressedBase64.length);
                                  setNewBook({...newBook, imageUrl: compressedBase64});
                                };
                                
                                img.src = URL.createObjectURL(file);
                              }
                            }}
                          />
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Stok Buku
                      </label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={newBook.stock}
                        onChange={(e) => setNewBook({...newBook, stock: parseInt(e.target.value)})}
                        className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                    </div>
                    
                    {/* Book ID and Barcode Section */}
                    <div className="md:col-span-2 border-t border-gray-600 pt-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Book ID (untuk Barcode)
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={newBook.book_id}
                              onChange={(e) => setNewBook({...newBook, book_id: e.target.value})}
                              placeholder="Ketik Book ID atau klik 'Generate Barcode'"
                              className="flex-1 p-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            />
                            <button
                              type="button"
                              onClick={handleGenerateBarcode}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                            >
                              Generate Barcode
                            </button>
                          </div>
                        </div>
                        
                        {/* Barcode Preview */}
                        {newBook.qr_code_data && (
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Preview Barcode
                            </label>
                            <div className="bg-white p-4 rounded-lg inline-block">
                              <BarcodeComponent value={newBook.qr_code_data} />
                            </div>
                            <div className="mt-2">
                              <button
                                type="button"
                                onClick={() => downloadBarcode(newBook.book_id, newBook.qr_code_data)}
                                className="text-sm px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                              >
                                Download Barcode
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 flex justify-end">
                    <button
                      type="submit"
                      className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Simpan Buku
                    </button>
                  </div>
                </form>
              )}

              {/* Book List */}
              <div className="overflow-x-auto">
                <table className="w-full text-gray-300 min-w-[800px]">
                  <thead className="bg-gray-800/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Judul
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Penulis
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Kategori
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Stok
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Sinopsis
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-800/30 divide-y divide-gray-700">
                    {books.map((book) => (
                      <tr key={book.id} className="hover:bg-gray-700/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-white">{book.title}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-300">{book.author}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-300">{book.category}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-300">{book.stock}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            book.available 
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {book.available ? 'Tersedia' : 'Dipinjam'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-400 truncate max-w-xs">
                            {book.synopsis}
                          </p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => handleEdit(book)}
                            className="text-blue-400 hover:text-blue-300 mr-3"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setShowConfirmDelete(book.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {activeTab === 'users' && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-6">Manajemen User</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-gray-300 min-w-[800px] mb-8">
                  <thead className="bg-gray-800/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Nama Lengkap</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Username</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">NIS</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Kelas</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Total Pinjam</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Sedang Dipinjam</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Terlambat</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Buku Favorit</th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-800/30 divide-y divide-gray-700">
                    {users.filter(u => u.role === 'student').map((u) => {
                      // Ambil data profil dari localStorage jika ada
                      const profile = JSON.parse(localStorage.getItem(`userProfile_${u.username}`) || '{}');
                      const stats = getStudentStats(u.username);
                      return (
                        <tr key={u.id}>
                          <td className="px-6 py-4 whitespace-nowrap">{profile.fullName || u.username}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{u.username}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{profile.nis || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{profile.class || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{profile.email || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{stats.total}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{stats.active}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{stats.overdue}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{stats.favorite}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'borrows' && (
            <div className="bg-gray-900 rounded-lg border border-gray-700">
              {/* Card Header with Download Button */}
              <div className="flex justify-between items-center p-6 border-b border-gray-700">
                <h2 className="text-xl font-semibold text-white">Manajemen Peminjaman</h2>
                <button
                  onClick={() => setShowDownloadModal(true)}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download Data
                </button>
              </div>

              {/* Info Banner */}
              <div className="mx-6 mt-6 p-4 bg-blue-600/20 border border-blue-500/50 rounded-lg backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-blue-300">
                    <p className="font-medium">Mode Monitoring</p>
                    <p className="text-sm text-blue-400">Persetujuan peminjaman sekarang dikelola oleh Petugas Perpustakaan. Admin dapat memantau semua aktivitas peminjaman.</p>
                  </div>
                </div>
              </div>
              
              {/* Table Content */}
              <div className="p-6">
                <div className="overflow-x-auto">
                <table className="w-full text-gray-300 min-w-[800px]">
                  <thead className="bg-gray-800/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Siswa</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Judul Buku</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Tanggal Pinjam</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Tenggat</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status Proses</th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-800/30 divide-y divide-gray-700">
                    {borrowRequests.map((borrow) => (
                      <tr key={borrow.id}>
                        <td className="px-6 py-4 whitespace-nowrap">{borrow.user?.username}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{borrow.title}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{new Date(borrow.borrowDate).toLocaleDateString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{new Date(borrow.dueDate).toLocaleDateString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {borrow.status === 'pending' ? (
                            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                              Menunggu Persetujuan
                            </span>
                          ) : borrow.status === 'borrowed' ? (
                            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                              Dipinjam
                            </span>
                          ) : borrow.status === 'returned' ? (
                            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                              Dikembalikan
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">
                              Ditolak
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                          {borrow.status === 'pending' ? (
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                              <span>Menunggu Petugas</span>
                            </div>
                          ) : (
                            <span className="text-gray-500">Selesai diproses</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-6">Laporan</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
                {/* Diagram Garis: Stok Buku */}
                <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
                  <h3 className="text-lg font-semibold mb-4 text-white">Stok Buku per Judul</h3>
                  <canvas id="lineChart"></canvas>
                </div>
                {/* Diagram Lingkaran: Kategori Buku */}
                <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
                  <h3 className="text-lg font-semibold mb-4 text-white">Distribusi Kategori Buku</h3>
                  <canvas id="pieChart"></canvas>
                </div>
              </div>
              
              {/* Diagram Donat: Status Peminjaman */}
              <div className="mt-8">
                <div className="bg-gray-900 rounded-lg p-6 border border-gray-700 max-w-2xl mx-auto">
                  <h3 className="text-lg font-semibold mb-4 text-white text-center">Status Peminjaman</h3>
                  
                  {/* Filter Tanggal */}
                  <div className="mb-6 flex flex-wrap gap-4 justify-center items-center">
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-300">Period:</label>
                      <select 
                        value={dateFilter.period}
                        onChange={(e) => setDateFilter(prev => ({ ...prev, period: e.target.value }))}
                        className="bg-gray-800 text-white rounded px-3 py-1 text-sm border border-gray-600 focus:border-red-500 focus:outline-none"
                      >
                        <option value="all">All Time</option>
                        <option value="month">This Month</option>
                        <option value="year">This Year</option>
                        <option value="custom">Custom Range</option>
                      </select>
                    </div>
                    
                    {dateFilter.period === 'custom' && (
                      <>
                        <div className="flex items-center gap-2">
                          <label className="text-sm text-gray-300">From:</label>
                          <input
                            type="date"
                            value={dateFilter.startDate}
                            onChange={(e) => setDateFilter(prev => ({ ...prev, startDate: e.target.value }))}
                            className="bg-gray-800 text-white rounded px-3 py-1 text-sm border border-gray-600 focus:border-red-500 focus:outline-none"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-sm text-gray-300">To:</label>
                          <input
                            type="date"
                            value={dateFilter.endDate}
                            onChange={(e) => setDateFilter(prev => ({ ...prev, endDate: e.target.value }))}
                            className="bg-gray-800 text-white rounded px-3 py-1 text-sm border border-gray-600 focus:border-red-500 focus:outline-none"
                          />
                        </div>
                      </>
                    )}
                  </div>
                  
                  <canvas id="statusPieChart"></canvas>
                </div>
              </div>

            </div>
          )}

          {activeTab === 'requests' && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-6">Manajemen Request Buku</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-gray-300 min-w-[600px]">
                  <thead className="bg-gray-800/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Siswa
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Buku
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Tanggal Request
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-800/30 divide-y divide-gray-700">
                    {bookRequests.map((request) => {
                      // Cari user dari daftar users berdasarkan ID
                      const userData = users.find(u => u.id === request.userId);
                      // Gunakan username dari response atau fallback ke userData
                      const displayName = request.username || userData?.username || `User ID: ${request.userId}`;
                      return (
                        <tr key={request.id} className="hover:bg-gray-700/50">
                          <td className="px-6 py-4 whitespace-nowrap">{displayName}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{request.bookTitle}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {formatDate(request.createdAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              request.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : request.status === 'approved'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {request.status === 'pending' 
                                ? 'Menunggu' 
                                : request.status === 'approved'
                                ? 'Disetujui'
                                : 'Ditolak'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                            {request.status === 'pending' ? (
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                                <span>Menunggu Petugas</span>
                              </div>
                            ) : (
                              <span className="text-gray-500">Diproses Petugas</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab Profile */}
          {activeTab === 'profile' && (
            <div className="max-w-lg mx-auto">
              <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 border border-gray-700 rounded-2xl p-4 sm:p-8 shadow-xl">
                <div className="flex flex-col items-center gap-4 mb-6">
                  <div className="relative group">
                    <div className="w-28 h-28 rounded-full overflow-hidden bg-gray-700 flex items-center justify-center border-4 border-red-600 shadow-lg">
                      {profileImage ? (
                        <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-4xl text-white">{user?.username?.[0]?.toUpperCase()}</span>
                      )}
                    </div>
                    {isEditingProfile && (
                      <label className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                        <span className="text-white text-sm">Ganti Foto</span>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={handleProfileImageChange}
                        />
                      </label>
                    )}
                  </div>
                  <div className="text-center">
                    <h2 className="text-2xl font-bold text-white mb-1">Profile Admin</h2>
                  </div>
                </div>
                <div className="mb-6">
                  {!isEditingProfile ? (
                    <div className="space-y-2 text-center">
                      <div>
                        <span className="block text-gray-400 text-sm">Nama</span>
                        <span className="block text-lg font-semibold text-white">{profile.fullName}</span>
                      </div>
                      <div>
                        <span className="block text-gray-400 text-sm">Email</span>
                        <span className="block text-lg font-semibold text-white">{profile.email}</span>
                      </div>
                      <div>
                        <span className="inline-block mt-2 px-3 py-1 bg-red-600/20 text-red-400 rounded-full text-xs font-semibold">Admin</span>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleProfileSubmit} className="space-y-4">
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Nama Lengkap</label>
                        <input
                          type="text"
                          name="fullName"
                          value={profile.fullName}
                          onChange={handleProfileChange}
                          className="w-full px-3 py-2 bg-gray-700 rounded-lg focus:ring-2 focus:ring-red-500 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Email</label>
                        <input
                          type="email"
                          name="email"
                          value={profile.email}
                          onChange={handleProfileChange}
                          className="w-full px-3 py-2 bg-gray-700 rounded-lg focus:ring-2 focus:ring-red-500 text-white"
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full mt-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
                      >
                        Simpan
                      </button>
                    </form>
                  )}
                </div>
                <div className="flex justify-center">
                  <button
                    onClick={() => setIsEditingProfile((v) => !v)}
                    className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                      isEditingProfile
                        ? 'bg-gray-600 hover:bg-gray-700 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {isEditingProfile ? 'Batal' : 'Edit Profile'}
                  </button>
                </div>
                {profileSuccess && (
                  <div className="mt-6 p-3 bg-green-600/20 border border-green-600 text-green-500 rounded-lg text-center">
                    Profile berhasil diperbarui!
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editingBook && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center px-2 sm:px-4 z-50">
          <div className="bg-gradient-to-br from-gray-900 to-black border border-red-500/20 rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <svg className="w-8 h-8 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Buku
              </h2>
              <button
                type="button"
                onClick={() => setEditingBook(null)}
                className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-red-600/20 rounded-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleUpdate}>
              <div className="space-y-6">
                {/* Image Preview & Upload */}
                <div>
                  <label className="block text-sm font-semibold text-gray-200 mb-3">Gambar Buku</label>
                  <div className="flex items-center justify-center">
                    {editingBook.imageUrl ? (
                      <div className="relative group">
                        <img
                          src={editingBook.imageUrl}
                          alt="Preview"
                          className="w-48 h-64 object-cover rounded-xl border-2 border-red-500/30 shadow-lg"
                        />
                        <button
                          type="button"
                          onClick={() => setEditingBook({...editingBook, imageUrl: ''})}
                          className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transition-all duration-300 opacity-0 group-hover:opacity-100"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <label className="w-48 h-64 flex flex-col items-center justify-center border-2 border-dashed border-red-500/50 rounded-xl cursor-pointer hover:border-red-500 hover:bg-red-900/10 transition-all duration-300 group">
                        <svg className="w-12 h-12 text-red-400 group-hover:text-red-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <span className="mt-2 text-sm text-gray-400 group-hover:text-gray-300">Upload Gambar</span>
                        <span className="text-xs text-gray-500">PNG, JPG atau GIF</span>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              // Use the same compression logic as add form
                              const canvas = document.createElement('canvas');
                              const ctx = canvas.getContext('2d');
                              const img = new Image();
                              
                              img.onload = () => {
                                const maxWidth = 800;
                                const maxHeight = 1200;
                                
                                let { width, height } = img;
                                
                                if (width > height) {
                                  if (width > maxWidth) {
                                    height = (height * maxWidth) / width;
                                    width = maxWidth;
                                  }
                                } else {
                                  if (height > maxHeight) {
                                    width = (width * maxHeight) / height;
                                    height = maxHeight;
                                  }
                                }
                                
                                canvas.width = width;
                                canvas.height = height;
                                
                                ctx.drawImage(img, 0, 0, width, height);
                                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
                                
                                setEditingBook({...editingBook, imageUrl: compressedBase64});
                              };
                              
                              img.src = URL.createObjectURL(file);
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-200 mb-2">Judul Buku</label>
                    <input
                      type="text"
                      value={editingBook.title}
                      onChange={(e) => setEditingBook({...editingBook, title: e.target.value})}
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all"
                      placeholder="Masukkan judul buku"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-200 mb-2">Penulis</label>
                    <input
                      type="text"
                      value={editingBook.author}
                      onChange={(e) => setEditingBook({...editingBook, author: e.target.value})}
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all"
                      placeholder="Masukkan nama penulis"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-200 mb-2">Kategori</label>
                    <select
                      value={editingBook.category}
                      onChange={(e) => setEditingBook({...editingBook, category: e.target.value})}
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all"
                    >
                      <option value="Fiksi">Fiksi</option>
                      <option value="Non-Fiksi">Non-Fiksi</option>
                      <option value="Pendidikan">Pendidikan</option>
                      <option value="Novel">Novel</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-200 mb-2">Stok Buku</label>
                    <input
                      type="number"
                      min="0"
                      value={editingBook.stock}
                      onChange={(e) => setEditingBook({...editingBook, stock: parseInt(e.target.value)})}
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all"
                      placeholder="Jumlah stok"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-200 mb-2">Sinopsis</label>
                  <textarea
                    value={editingBook.synopsis || ''}
                    onChange={(e) => setEditingBook({...editingBook, synopsis: e.target.value})}
                    rows="4"
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all resize-none"
                    placeholder="Tulis sinopsis buku..."
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setEditingBook(null)}
                  className="px-6 py-3 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800 hover:border-gray-500 transition-all duration-300 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-300 font-medium shadow-lg hover:shadow-red-500/25 flex items-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showConfirmDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 px-2 sm:px-4">
          <div className="bg-gradient-to-br from-gray-900 to-black border border-red-500/20 rounded-2xl p-8 max-w-md w-full shadow-2xl">
            {/* Icon */}
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-6 bg-red-600/20 rounded-full">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            
            <h2 className="text-xl font-bold text-white text-center mb-4">Konfirmasi Hapus</h2>
            <p className="text-gray-300 text-center mb-8">
              Apakah Anda yakin ingin menghapus buku ini? 
              <br />
              <span className="text-red-400 font-medium">Tindakan ini tidak dapat dibatalkan.</span>
            </p>
            
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setShowConfirmDelete(null)}
                className="px-6 py-3 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800 hover:border-gray-500 transition-all duration-300 font-medium"
              >
                Batal
              </button>
              <button
                onClick={() => handleDelete(showConfirmDelete)}
                className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-300 font-medium shadow-lg hover:shadow-red-500/25 flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Hapus Buku
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Download Modal */}
      {showDownloadModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-white">Download Data Peminjaman</h3>
              <button
                onClick={() => setShowDownloadModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Pilih Periode Download:
                </label>
                <select
                  value={downloadFilter.type}
                  onChange={(e) => setDownloadFilter(prev => ({ 
                    ...prev, 
                    type: e.target.value,
                    selectedDate: '',
                    selectedMonth: '',
                    selectedYear: ''
                  }))}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-red-500 focus:outline-none"
                >
                  <option value="all">Semua Data</option>
                  <option value="date">Berdasarkan Tanggal</option>
                  <option value="month">Berdasarkan Bulan</option>
                  <option value="year">Berdasarkan Tahun</option>
                </select>
              </div>

              {/* Date Picker */}
              {downloadFilter.type === 'date' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Pilih Tanggal:
                  </label>
                  <input
                    type="date"
                    value={downloadFilter.selectedDate}
                    onChange={(e) => setDownloadFilter(prev => ({ ...prev, selectedDate: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-red-500 focus:outline-none"
                  />
                </div>
              )}

              {/* Month Picker */}
              {downloadFilter.type === 'month' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Pilih Bulan & Tahun:
                  </label>
                  <input
                    type="month"
                    value={downloadFilter.selectedMonth}
                    onChange={(e) => setDownloadFilter(prev => ({ ...prev, selectedMonth: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-red-500 focus:outline-none"
                  />
                </div>
              )}

              {/* Year Picker */}
              {downloadFilter.type === 'year' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Pilih Tahun:
                  </label>
                  <select
                    value={downloadFilter.selectedYear}
                    onChange={(e) => setDownloadFilter(prev => ({ ...prev, selectedYear: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:border-red-500 focus:outline-none"
                  >
                    <option value="">Pilih Tahun</option>
                    {Array.from({ length: 10 }, (_, i) => {
                      const year = new Date().getFullYear() - i;
                      return (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowDownloadModal(false)}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleDownloadData}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;