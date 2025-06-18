import { useState, useContext, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { books } from '../data/books';
import BookCard from '../components/BookCard';
import TestimonialSection from '../components/TestimonialSection';
import { useInView } from '../hooks/useInView';

function BookCatalog() {
  const { user } = useContext(AuthContext);
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef(null);
  const categoryRef = useRef(null); // Add this ref

  // Daftar kategori yang tersedia
  const categories = ['Semua', 'Fiksi', 'Non-Fiksi', 'Pendidikan', 'Novel'];

  const suggestions = books.filter((book) => {
    const matchesSearch =
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.author.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch && searchQuery.length > 0;
  }).slice(0, 5); // Batasi hanya 5 saran

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter buku berdasarkan kategori dan pencarian
  const filteredBooks = books.filter((book) => {
    const matchesSearch = book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         book.author.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'Semua' || book.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSuggestionClick = (book) => {
    setSearchQuery(book.title);
    setSelectedCategory(book.category);
    setShowSuggestions(false);
    
    // Scroll to category section
    categoryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const [statsRef, statsInView] = useInView();
  const [featuresRef, featuresInView] = useInView();
  const [ctaRef, ctaInView] = useInView();

  useEffect(() => {
    // Check for testimonial section in URL
    if (window.location.search.includes('section=testimonial')) {
      // Scroll to testimonial section
      const testimonialSection = document.getElementById('testimonial-section');
      if (testimonialSection) {
        testimonialSection.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, []);

  // ===== Tambahan: Buku Terfavorit =====
  // Ambil data peminjaman dari localStorage
  const [favoriteBooks, setFavoriteBooks] = useState([]);
  useEffect(() => {
    const borrows = JSON.parse(localStorage.getItem('borrowedBooks') || '[]');
    // Hitung jumlah peminjaman selesai per judul
    const countMap = {};
    borrows.forEach(b => {
      if (b.status === 'returned' && b.title) {
        countMap[b.title] = (countMap[b.title] || 0) + 1;
      }
    });
    // Urutkan berdasarkan jumlah peminjaman
    const sorted = Object.entries(countMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3); // Top 3
    // Ambil info buku dari data books
    const favBooks = sorted.map(([title, count], idx) => {
      const book = books.find(b => b.title === title);
      return {
        rank: idx + 1,
        title,
        count,
        imageUrl: book?.imageUrl,
        author: book?.author
      };
    });
    setFavoriteBooks(favBooks);
  }, [books]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black font-sans text-white">
      {/* Navigation */}
      <nav className="bg-black/50 backdrop-blur-lg border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <svg
                className="w-10 h-10 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
              <span className="ml-3 text-2xl font-bold text-white">Perpustakaan SMKN 40</span>
            </div>
            <div className="flex items-center space-x-6">
              {user ? (
                <Link
                  to="/dashboard"
                  className="inline-flex items-center px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-300 ease-in-out transform hover:scale-105"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="text-gray-300 hover:text-red-500 transition-colors duration-300"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="inline-flex items-center px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-300 ease-in-out transform hover:scale-105"
                  >
                    Daftar Sekarang
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative bg-cover bg-center">
        <div className="absolute inset-0 bg-black opacity-75"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32 lg:py-40 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight">
            <span className="block">Selamat Datang di</span>
            <span className="block text-red-300">Perpustakaan Digital SMKN 40</span>
          </h1>
          <p className="mt-4 text-lg sm:text-xl text-gray-200 max-w-2xl mx-auto">
            Jelajahi ribuan buku digital, pinjam dengan mudah, dan tingkatkan pengetahuanmu kapan saja, di mana saja!
          </p>
          <div className="mt-8">
            <Link
              to="/register"
              className="inline-block px-8 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-all duration-300 ease-in-out transform hover:scale-105"
            >
              Mulai Sekarang
            </Link>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
        <div className="bg-gray-900/80 backdrop-blur-lg rounded-xl shadow-xl p-6 border border-gray-800">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative" ref={searchRef}>
              <input
                type="text"
                placeholder="Cari judul buku atau nama penulis..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                className="w-full px-4 py-3 border border-gray-700 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-gray-800 text-white"
              />

              {/* Search Suggestions Popup */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute w-full mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden">
                  {suggestions.map((book) => (
                    <div
                      key={book.id}
                      className="p-4 hover:bg-gray-700 cursor-pointer flex items-center gap-4 border-b border-gray-700 last:border-0"
                      onClick={() => handleSuggestionClick(book)}
                    >
                      <img
                        src={book.imageUrl}
                        alt={book.title}
                        className="w-12 h-16 object-cover rounded"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = `https://via.placeholder.com/400x600/374151/FFFFFF?text=${encodeURIComponent(book.title)}`;
                        }}
                      />
                      <div>
                        <h4 className="text-white font-medium">{book.title}</h4>
                        <p className="text-sm text-gray-400">oleh {book.author}</p>
                        <span className="inline-block mt-1 text-xs bg-red-900/50 text-red-300 px-2 py-1 rounded-full">
                          {book.category}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="md:w-48">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-3 border border-gray-700 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-gray-800 text-white"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div 
        ref={statsRef} 
        className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 transition-all duration-1000 transform ${
          statsInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'
        }`}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 bg-gray-900 shadow-lg rounded-lg text-center hover:scale-105 duration-300 border border-gray-800">
            <span className="text-4xl font-extrabold text-red-500">10K+</span>
            <h3 className="mt-4 text-xl font-semibold text-gray-100">Buku Tersedia</h3>
            <p className="mt-2 text-gray-400">Koleksi buku digital yang terus bertambah.</p>
          </div>
          <div className="p-6 bg-gray-900 shadow-lg rounded-lg text-center hover:scale-105 duration-300 border border-gray-800">
            <span className="text-4xl font-extrabold text-red-500">5K+</span>
            <h3 className="mt-4 text-xl font-semibold text-gray-100">Pengguna Terdaftar</h3>
            <p className="mt-2 text-gray-400">Bergabunglah dengan komunitas pembaca kami.</p>
          </div>
          <div className="p-6 bg-gray-900 shadow-lg rounded-lg text-center hover:scale-105 duration-300 border border-gray-800">
            <span className="text-4xl font-extrabold text-red-500">1K+</span>
            <h3 className="mt-4 text-xl font-semibold text-gray-100">Ulasan Positif</h3>
            <p className="mt-2 text-gray-400">Dari pengguna yang puas dengan layanan kami.</p>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div 
        ref={featuresRef}
        className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 transition-all duration-1000 transform ${
          featuresInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'
        }`}
      >
        <h2 className="text-3xl font-bold text-center text-gray-100 mb-12">Fitur Unggulan</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 bg-gray-900 shadow-lg rounded-lg text-center transition-transform hover:scale-105 duration-300">
            <svg
              className="w-12 h-12 mx-auto text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            <h3 className="mt-4 text-xl font-semibold text-gray-100">Peminjaman Online</h3>
            <p className="mt-2 text-gray-400">Pinjam buku kapan saja tanpa harus ke perpustakaan.</p>
          </div>
          <div className="p-6 bg-gray-900 shadow-lg rounded-lg text-center transition-transform hover:scale-105 duration-300">
            <svg
              className="w-12 h-12 mx-auto text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
            <h3 className="mt-4 text-xl font-semibold text-gray-100">Katalog Digital</h3>
            <p className="mt-2 text-gray-400">Akses koleksi buku lengkap dengan status ketersediaan.</p>
          </div>
          <div className="p-6 bg-gray-900 shadow-lg rounded-lg text-center transition-transform hover:scale-105 duration-300">
            <svg
              className="w-12 h-12 mx-auto text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <h3 className="mt-4 text-xl font-semibold text-gray-100">Riwayat Peminjaman</h3>
            <p className="mt-2 text-gray-400">Lacak semua peminjamanmu dengan mudah.</p>
          </div>
        </div>

        {/* ===== Buku Terfavorit Section ===== */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-center text-yellow-400 mb-8 flex items-center justify-center gap-2">
            <svg className="w-7 h-7 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l2.09 6.26L20 9.27l-5 3.64L16.18 20 12 16.77 7.82 20 9 12.91l-5-3.64 5.91-.01z"/>
            </svg>
            Buku Terfavorit Siswa
          </h2>
          <div className="flex flex-col md:flex-row justify-center items-stretch gap-6">
            {favoriteBooks.length === 0 ? (
              <div className="text-center text-gray-400 w-full">
                Belum ada data buku terfavorit.
              </div>
            ) : (
              favoriteBooks.map((book, idx) => (
                <div
                  key={book.title}
                  className={`flex-1 bg-gray-900/80 border-2 rounded-2xl shadow-lg flex flex-col items-center p-6
                    ${idx === 0 ? 'border-yellow-400' : idx === 1 ? 'border-gray-400' : 'border-orange-400'}
                  `}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-xl font-bold
                      ${idx === 0 ? 'bg-yellow-400 text-yellow-900' : idx === 1 ? 'bg-gray-400 text-gray-900' : 'bg-orange-400 text-orange-900'}
                    `}>
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                    </span>
                    <span className="text-lg font-bold text-white">Rank {book.rank}</span>
                  </div>
                  <img
                    src={book.imageUrl || `https://via.placeholder.com/120x180/374151/FFFFFF?text=${encodeURIComponent(book.title)}`}
                    alt={book.title}
                    className="w-24 h-36 object-cover rounded-lg mb-4 border-2 border-gray-700"
                  />
                  <div className="text-center">
                    <div className="font-semibold text-white text-lg mb-1">{book.title}</div>
                    <div className="text-gray-400 text-sm mb-2">{book.author}</div>
                    <div className="flex items-center justify-center gap-1 text-yellow-400 text-sm">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l2.09 6.26L20 9.27l-5 3.64L16.18 20 12 16.77 7.82 20 9 12.91l-5-3.64 5.91-.01z"/>
                      </svg>
                      {book.count}x dipinjam
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Category Filters */}
      <div ref={categoryRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        <h2 className="text-2xl font-bold text-center text-gray-100 mb-6">
          Jelajahi Berdasarkan Kategori
        </h2>
        <div className="flex justify-center space-x-4 flex-wrap gap-y-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                selectedCategory === category
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-800 text-gray-100 hover:bg-gray-700'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Books Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl font-bold text-center text-gray-100 mb-6">
          Koleksi Terbaru
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredBooks.length > 0 ? (
            filteredBooks.map((book) => (
              <BookCard
                key={book.id}
                id={book.id}
                title={book.title}
                author={book.author}
                category={book.category}
                available={book.available}
                imageUrl={book.imageUrl}
                synopsis={book.synopsis}
                stock={book.stock} // Add this line to pass the stock prop
              />
            ))
          ) : (
            <p className="col-span-full text-center text-gray-500 py-12">
              Tidak ada buku yang cocok dengan pencarian.
            </p>
          )}
        </div>
      </div>

      {/* Testimonials Section */}
      <TestimonialSection />

      {/* Call to Action */}
      <div 
        ref={ctaRef}
        className={`relative overflow-hidden transition-all duration-1000 transform ${
          ctaInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'
        }`}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-red-900"></div>
        <div className="relative py-16 px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-4xl font-bold text-white mb-6">
              Mulai Petualangan Membacamu
            </h2>
            <p className="text-lg text-red-100 mb-8">
              Bergabunglah dengan ribuan siswa lainnya dan akses koleksi buku digital kami kapan saja, di mana saja.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/register"
                className="inline-flex items-center px-8 py-3 bg-white text-red-600 font-medium rounded-lg hover:bg-red-50 transition-all duration-300 transform hover:scale-105"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Daftar Sekarang
              </Link>
              <Link
                to="/catalog"
                className="inline-flex items-center px-8 py-3 border-2 border-white text-white font-medium rounded-lg hover:bg-white/10 transition-all duration-300"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Lihat Katalog
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-black text-gray-300 border-t border-gray-800">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-semibold">Perpustakaan SMK 40</h3>
              <p className="mt-4 text-sm text-gray-400">
                Mendukung generasi muda melalui akses pendidikan digital.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Layanan</h3>
              <ul className="mt-4 space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white">Peminjaman Buku</a></li>
                <li><a href="#" className="hover:text-white">E-Book</a></li>
                <li><a href="#" className="hover:text-white">Riwayat</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Hubungi Kami</h3>
              <p className="mt-4 text-sm text-gray-400">Email: smkn40@gmail.com</p>
              <p className="text-sm text-gray-400">Telp: 0895-3394-56605</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Ikuti Kami</h3>
              <div className="mt-4 flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-white">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.04c-5.5 0-9.96 4.46-9.96 9.96 0 4.4 2.87 8.14 6.85 9.46v-6.63H7.07v-2.7h2.82v-2.44c0-2.78 1.66-4.3 4.2-4.3 1.22 0 2.49.22 2.49.22v2.74h-1.4c-1.38 0-1.81.86-1.81 1.74v2.09h3.08l-.49 2.7h-2.59v6.63c3.98-1.32 6.85-5.06 6.85-9.46 0-5.5-4.46-9.96-9.96-9.96z"/>
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 4.56c-.9.4-1.86.66-2.87.78 1.03-.62 1.82-1.6 2.19-2.77-.96.58-2.02.99-3.15 1.22-.9-.96-2.19-1.56-3.61-1.56-2.73 0-4.94 2.21-4.94 4.94 0 .39.04.77.13 1.13-4.1-.2-7.74-2.17-10.17-5.15-.43.73-.67 1.58-.67 2.48 0 1.71.87 3.22 2.19 4.1-.81-.03-1.57-.25-2.23-.62v.06c0 2.39 1.7 4.38 3.96 4.83-.41.11-.85.17-1.3.17-.32 0-.63-.03-.93-.09.63 1.96 2.45 3.39 4.61 3.43-1.69 1.32-3.82 2.11-6.14 2.11-.4 0-.79-.02-1.18-.07 2.19 1.4 4.78 2.22 7.57 2.22 9.09 0 14.06-7.53 14.06-14.06 0-.21-.01-.43-.03-.64.97-.7 1.81-1.58 2.47-2.58z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>
          <div className="mt-8 border-t border-gray-700 pt-8 text-center text-sm text-gray-400">
            © {new Date().getFullYear()} Perpustakaan SMK 40 Jakarta. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default BookCatalog;