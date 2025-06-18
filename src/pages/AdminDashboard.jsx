import { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { books, updateBook, deleteBook, addBook } from '../data/books';
import Chart from 'chart.js/auto';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { BorrowContext } from '../context/BorrowContext';

function AdminDashboard() {
  const { user, logout } = useContext(AuthContext);
  const { borrowedBooks, approveBorrow, rejectBorrow } = useContext(BorrowContext);
  const navigate = useNavigate();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newBook, setNewBook] = useState({
    title: '',
    author: '',
    synopsis: '',
    category: 'Fiksi',
    imageUrl: '',
    stock: 1 // Add initial stock value
  });
  const [editingBook, setEditingBook] = useState(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(null);
  const [notification, setNotification] = useState('');
  const [activeTab, setActiveTab] = useState('books'); // Add this
  const [bookRequests, setBookRequests] = useState(() => {
    return JSON.parse(localStorage.getItem('bookRequests') || '[]');
  });
  // Ambil data users dari localStorage
  const [users, setUsers] = useState(() => {
    return JSON.parse(localStorage.getItem('users') || '[]');
  });
  // Ambil data peminjaman dari localStorage
  const [borrows, setBorrows] = useState(() => {
    return JSON.parse(localStorage.getItem('borrowedBooks') || '[]');
  });

  // State untuk profile admin
  const [profile, setProfile] = useState(() => {
    const saved = localStorage.getItem('adminProfile');
    return saved
      ? JSON.parse(saved)
      : {
          fullName: user?.username || 'Admin',
          email: 'admin@example.com',
        };
  });
  const [profileImage, setProfileImage] = useState(() => {
    return localStorage.getItem('adminProfileImage') || null;
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);

  const categories = ['Fiksi', 'Non-Fiksi', 'Pendidikan', 'Novel'];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleBookSubmit = (e) => {
    e.preventDefault();
    addBook(newBook);
    setShowAddForm(false);
    setNotification('Buku berhasil ditambahkan!');

    // Hilangkan notifikasi setelah 3 detik
    setTimeout(() => {
      setNotification('');
    }, 3000);
  };

  const handleEdit = (book) => {
    setEditingBook(book);
  };

  const handleUpdate = (e) => {
    e.preventDefault();
    updateBook(editingBook.id, editingBook);
    setEditingBook(null);
  };

  const handleDelete = (bookId) => {
    if (deleteBook(bookId)) {
      setShowConfirmDelete(null);
      setNotification('Buku berhasil dihapus');
      setTimeout(() => {
        setNotification('');
      }, 3000);
      window.dispatchEvent(new Event('storage'));
    }
  };

  const handleAddBook = (e) => {
    e.preventDefault();
    addBook(newBook);
    setShowAddForm(false);
    setNewBook({ title: '', author: '', synopsis: '', category: 'Fiksi', imageUrl: '' });
    setNotification('Buku berhasil ditambahkan!');
    setTimeout(() => setNotification(''), 3000);
  };

  const handleRequestAction = (requestId, action) => {
    setBookRequests(requests => 
      requests.map(request => {
        if (request.id === requestId) {
          const newStatus = action === 'approve' ? 'approved' : 'rejected';
          
          // Update user's requests
          const userRequests = JSON.parse(localStorage.getItem(`bookRequests_${request.userId}`) || '[]');
          const updatedUserRequests = userRequests.map(r => 
            r.id === requestId ? {...r, status: newStatus} : r
          );
          localStorage.setItem(`bookRequests_${request.userId}`, JSON.stringify(updatedUserRequests));
          
          // Update global requests
          const newRequest = {...request, status: newStatus};
          localStorage.setItem('bookRequests', JSON.stringify(
            requests.map(r => r.id === requestId ? newRequest : r)
          ));
          
          return newRequest;
        }
        return request;
      })
    );

    setNotification(`Request berhasil ${action === 'approve' ? 'disetujui' : 'ditolak'}!`);
    setTimeout(() => setNotification(''), 3000);
  };

  // Untuk update data jika ada perubahan di localStorage
  useEffect(() => {
    const syncUsers = () => setUsers(JSON.parse(localStorage.getItem('users') || '[]'));
    const syncBorrows = () => setBorrows(JSON.parse(localStorage.getItem('borrowedBooks') || '[]'));
    window.addEventListener('storage', syncUsers);
    window.addEventListener('storage', syncBorrows);
    return () => {
      window.removeEventListener('storage', syncUsers);
      window.removeEventListener('storage', syncBorrows);
    };
  }, []);

  // Fungsi untuk statistik peminjaman siswa
  const getStudentStats = (username) => {
    const userBorrows = borrows.filter(b => b.userId === username);
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
  }, [activeTab, books]);

  // Fungsi untuk download data buku ke PDF
  const handleDownloadPDF = () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: 'A4'
    });
    doc.setFontSize(18);
    doc.text('Data Buku Perpustakaan', 40, 40);

    // Siapkan data untuk tabel
    const tableColumn = [
      { header: "Judul", dataKey: "title" },
      { header: "Penulis", dataKey: "author" },
      { header: "Kategori", dataKey: "category" },
      { header: "Stok", dataKey: "stock" },
      { header: "Status", dataKey: "status" },
      { header: "Sinopsis", dataKey: "synopsis" }
    ];
    const tableRows = books.map(book => ({
      title: book.title,
      author: book.author,
      category: book.category,
      stock: book.stock,
      status: book.available ? "Tersedia" : "Dipinjam",
      synopsis: book.synopsis
    }));

    autoTable(doc, {
      head: [tableColumn.map(col => col.header)],
      body: tableRows.map(row => tableColumn.map(col => row[col.dataKey])),
      startY: 60,
      margin: { left: 40, right: 40 },
      styles: { fontSize: 11, cellPadding: 6, overflow: 'linebreak' },
      headStyles: { fillColor: [239, 68, 68], textColor: 255 },
      columnStyles: {
        0: { cellWidth: 90 }, // Judul
        1: { cellWidth: 70 }, // Penulis
        2: { cellWidth: 60 }, // Kategori
        3: { cellWidth: 40 }, // Stok
        4: { cellWidth: 60 }, // Status
        5: { cellWidth: 220 } // Sinopsis (lebar)
      },
      didDrawPage: (data) => {
        doc.setFontSize(10);
        doc.setTextColor(150);
        doc.text(
          `Generated at: ${new Date().toLocaleString()}`,
          data.settings.margin.left,
          doc.internal.pageSize.height - 10
        );
      }
    });

    doc.save('data-buku-perpustakaan.pdf');
  };

  // Fungsi untuk download data buku ke Excel
  const handleDownloadExcel = () => {
    // Siapkan data untuk worksheet
    const data = books.map(book => ({
      Judul: book.title,
      Penulis: book.author,
      Kategori: book.category,
      Stok: book.stock,
      Status: book.available ? "Tersedia" : "Dipinjam",
      Sinopsis: book.synopsis
    }));

    // Buat worksheet dan workbook
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data Buku");

    // Download file
    XLSX.writeFile(workbook, "data-buku-perpustakaan.xlsx");
  };

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
  const handleProfileSubmit = (e) => {
    e.preventDefault();
    localStorage.setItem('adminProfile', JSON.stringify(profile));
    setIsEditingProfile(false);
    setProfileSuccess(true);
    setTimeout(() => setProfileSuccess(false), 2000);
  };

  // Fungsi untuk menghitung jumlah peminjaman aktif
  const getActiveBorrowCount = () => {
    return borrows.filter(b => b.status === 'borrowed').length;
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
              <p className="text-3xl font-extrabold text-white">{books.length}</p>
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
                {books.filter(b => b.available).length}
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
                {getActiveBorrowCount()}
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
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setNewBook({...newBook, imageUrl: reader.result});
                                };
                                reader.readAsDataURL(file);
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
            <div>
              <h2 className="text-xl font-semibold text-white mb-6">Manajemen Peminjaman</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-gray-300 min-w-[800px]">
                  <thead className="bg-gray-800/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Siswa</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Judul Buku</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Tanggal Pinjam</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Tenggat</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-800/30 divide-y divide-gray-700">
                    {borrowedBooks.map((borrow) => (
                      <tr key={borrow.borrowId}>
                        <td className="px-6 py-4 whitespace-nowrap">{borrow.userId}</td>
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
                          ) : (
                            <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                              Selesai
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {borrow.status === 'pending' && (
                            <>
                              <button
                                onClick={() => approveBorrow(borrow.borrowId)}
                                className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 mr-2"
                              >
                                Setujui
                              </button>
                              <button
                                onClick={() => rejectBorrow(borrow.borrowId)}
                                className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
                              >
                                Tolak
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-6">Laporan</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
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
              {/* Tombol Download Data PDF */}
              <div className="mt-8 flex flex-col md:flex-row gap-4 justify-end">
                <button
                  onClick={handleDownloadPDF}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Download Data (PDF)
                </button>
                <button
                  onClick={handleDownloadExcel}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Download Excel
                </button>
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
                      // Cari user dari daftar users
                      const userData = users.find(u => u.username === request.userId);
                      // Ambil nama lengkap dari profile jika ada
                      const userProfile = userData
                        ? JSON.parse(localStorage.getItem(`userProfile_${userData.username}`) || '{}')
                        : {};
                      const displayName = userProfile.fullName || userData?.username || request.userId;
                      return (
                        <tr key={request.id} className="hover:bg-gray-700/50">
                          <td className="px-6 py-4 whitespace-nowrap">{displayName}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{request.bookTitle}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {new Date(request.requestDate).toLocaleString()}
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
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {request.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleRequestAction(request.id, 'approve')}
                                  className="text-green-400 hover:text-green-300 mr-3"
                                >
                                  Setujui
                                </button>
                                <button
                                  onClick={() => handleRequestAction(request.id, 'reject')}
                                  className="text-red-400 hover:text-red-300"
                                >
                                  Tolak
                                </button>
                              </>
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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center px-2 sm:px-4">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Edit Buku</h2>
            <form onSubmit={handleUpdate}>
              <div className="space-y-4">
                {/* Image Preview & Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Gambar Buku</label>
                  <div className="flex items-center justify-center">
                    {editingBook.imageUrl ? (
                      <div className="relative">
                        <img
                          src={editingBook.imageUrl}
                          alt="Preview"
                          className="w-48 h-48 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => setEditingBook({...editingBook, imageUrl: ''})}
                          className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <label className="w-48 h-48 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <span className="mt-2 text-sm text-gray-500">Upload Gambar</span>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setEditingBook({...editingBook, imageUrl: reader.result});
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Judul</label>
                  <input
                    type="text"
                    value={editingBook.title}
                    onChange={(e) => setEditingBook({...editingBook, title: e.target.value})}
                    className="mt-1 w-full rounded-md border p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Penulis</label>
                  <input
                    type="text"
                    value={editingBook.author}
                    onChange={(e) => setEditingBook({...editingBook, author: e.target.value})}
                    className="mt-1 w-full rounded-md border p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Kategori</label>
                  <select
                    value={editingBook.category}
                    onChange={(e) => setEditingBook({...editingBook, category: e.target.value})}
                    className="mt-1 w-full rounded-md border p-2"
                  >
                    <option value="Fiksi">Fiksi</option>
                    <option value="Non-Fiksi">Non-Fiksi</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Stok</label>
                  <input
                    type="number"
                    min="0"
                    value={editingBook.stock}
                    onChange={(e) => setEditingBook({...editingBook, stock: parseInt(e.target.value)})}
                    className="mt-1 w-full rounded-md border p-2"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setEditingBook(null)}
                  className="px-4 py-2 border rounded-md hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showConfirmDelete && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 px-2 sm:px-4">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Konfirmasi Hapus</h2>
            <p>Apakah Anda yakin ingin menghapus buku ini?</p>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirmDelete(null)}
                className="px-4 py-2 border rounded-md hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={() => handleDelete(showConfirmDelete)}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;