import { useState, useContext, useEffect, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import { testimonialAPI, booksAPI } from '../utils/api'; // Import testimonial and books API

function TestimonialSection() {
  const { user } = useContext(AuthContext);
  const [testimonials, setTestimonials] = useState([]);
  const [books, setBooks] = useState([]); // Add state for books from database
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newTestimonial, setNewTestimonial] = useState({
    text: '',
    rating: 5,
    photo: null,
    photoPreview: null,
    bookId: '', // Add bookId for selected book
    bookTitle: '' // Add bookTitle for display
  });
  const [selectedBook, setSelectedBook] = useState(''); // Track selected book for form

  // Convert database testimonial to display format
  const formatTestimonial = useCallback((dbTestimonial) => {
    console.log('🔍 Formatting testimonial:', dbTestimonial);
    const formatted = {
      id: dbTestimonial.id,
      text: dbTestimonial.content,
      rating: dbTestimonial.rating,
      date: dbTestimonial.created_at || dbTestimonial.createdAt,
      // Handle both snake_case and camelCase from backend
      bookTitle: dbTestimonial.bookTitle || dbTestimonial.book_title,
      photoUrl: (dbTestimonial.photoPath || dbTestimonial.photo_path) ? 
        `http://localhost:3001/uploads/testimonials/${dbTestimonial.photoPath || dbTestimonial.photo_path}` : null,
      user: {
        name: dbTestimonial.username,
        class: 'Siswa', // Default since we don't store class in testimonial
        initial: dbTestimonial.username[0].toUpperCase(),
        profileImage: getUserProfileImage(dbTestimonial.username)
      }
    };
    console.log('🔍 Formatted result:', formatted);
    return formatted;
  }, []);

  // Load books from database
  const loadBooks = useCallback(async () => {
    try {
      const response = await booksAPI.getAll();
      if (response.status === 'success') {
        console.log('📚 Loaded books from API:', response.data.books);
        setBooks(response.data.books || []);
      }
    } catch (error) {
      console.error('Error loading books:', error);
    }
  }, []);

  // Load testimonials from database
  const loadTestimonials = useCallback(async () => {
    try {
      const response = await testimonialAPI.getApproved();
      console.log('🔍 Raw testimonials response:', response);
      if (response.status === 'success') {
        console.log('🔍 Raw testimonials data:', response.data.testimonials);
        const formattedTestimonials = response.data.testimonials.map(formatTestimonial);
        console.log('🔍 Formatted testimonials:', formattedTestimonials);
        setTestimonials(formattedTestimonials);
      }
    } catch (error) {
      console.error('Error loading testimonials:', error);
    }
  }, [formatTestimonial]);

  useEffect(() => {
    loadBooks(); // Load books when component mounts
    loadTestimonials();
  }, [loadBooks, loadTestimonials]);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewTestimonial({
          ...newTestimonial,
          photo: file,
          photoPreview: reader.result
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Ambil foto profil dari localStorage
  const getUserProfileImage = (username) => {
    return localStorage.getItem(`profileImage_${username}`);
  };

  // Modify handleSubmit to use API
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Debug: Log current testimonial state
      console.log('Current testimonial state:', newTestimonial);

      // Create FormData for file upload and all data
      const formData = new FormData();
      formData.append('text', newTestimonial.text);
      formData.append('rating', newTestimonial.rating);
      
      if (newTestimonial.bookId) {
        formData.append('bookId', newTestimonial.bookId);
        formData.append('bookTitle', newTestimonial.bookTitle);
      }
      
      if (newTestimonial.photo) {
        formData.append('photo', newTestimonial.photo);
      }

      const response = await testimonialAPI.create(formData);
      
      if (response.status === 'success') {
        // Reload testimonials from database
        await loadTestimonials();
        
        setShowForm(false);
        setNewTestimonial({ 
          text: '', 
          rating: 5, 
          photo: null, 
          photoPreview: null,
          bookId: '',
          bookTitle: '' 
        });
        
        // Show success message
        alert('Testimoni berhasil dikirim!');
      }
    } catch (error) {
      console.error('Error submitting testimonial:', error);
      alert('Gagal mengirim testimoni. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (testimonialId) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus testimoni ini?')) {
      try {
        await testimonialAPI.delete(testimonialId);
        // Reload testimonials after deletion
        await loadTestimonials();
      } catch (error) {
        console.error('Error deleting testimonial:', error);
        alert('Gagal menghapus testimoni.');
      }
    }
  };

  // Remove the storage event listener since we're handling updates directly
  useEffect(() => {
    const handleOpenTestimonial = (e) => {
      setShowForm(true);
      if (e.detail?.bookTitle) {
        setSelectedBook(e.detail.bookTitle);
        // Auto-scroll to form when opened
        const form = document.querySelector('.testimonial-form');
        if (form) {
          form.scrollIntoView({ behavior: 'smooth' });
        }
      }
    };

    window.addEventListener('openTestimonialForm', handleOpenTestimonial);
    return () => window.removeEventListener('openTestimonialForm', handleOpenTestimonial);
  }, []);

  return (
    <div id="testimonial-section" className="bg-gray-900/50 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4">Testimonial Siswa</h2>
          <p className="text-gray-400">Apa yang mereka katakan tentang perpustakaan digital kami</p>
        </div>

        {/* Tombol Tambah Testimoni (hanya untuk siswa) */}
        {user && user.role === 'student' && (
          <div className="text-center mb-8">
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              {showForm ? 'Tutup Form' : 'Tambah Testimoni'}
            </button>
          </div>
        )}

        {/* Form Testimoni */}
        {showForm && (
          <div className="max-w-2xl mx-auto mb-12 bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl border border-gray-700 testimonial-form">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Add Book Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Pilih Buku yang Dibaca
                </label>
                <select
                  required
                  value={newTestimonial.bookId}
                  onChange={(e) => {
                    console.log('📚 Book selection changed:', e.target.value);
                    console.log('📚 Available books:', books);
                    const book = books.find(b => b.id === parseInt(e.target.value));
                    console.log('📚 Found book:', book);
                    
                    // Fallback: if book not found but we have books, use the title from option text
                    let bookTitle = '';
                    if (book) {
                      bookTitle = book.title;
                    } else if (e.target.selectedOptions[0] && e.target.selectedOptions[0].text !== 'Pilih Buku') {
                      // Extract title from "Title - oleh Author" format
                      bookTitle = e.target.selectedOptions[0].text.split(' - oleh ')[0];
                    }
                    
                    console.log('📚 Final bookTitle:', bookTitle);
                    setNewTestimonial({
                      ...newTestimonial,
                      bookId: e.target.value,
                      bookTitle: bookTitle
                    });
                  }}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 text-white"
                >
                  <option value="">Pilih Buku</option>
                  {books.map((book) => (
                    <option key={book.id} value={book.id}>
                      {book.title} - oleh {book.author}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Foto Kegiatan Membaca
                </label>
                <div className="flex items-center justify-center">
                  {newTestimonial.photoPreview ? (
                    <div className="relative">
                      <img
                        src={newTestimonial.photoPreview}
                        alt="Preview"
                        className="w-48 h-48 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => setNewTestimonial({
                          ...newTestimonial,
                          photo: null,
                          photoPreview: null
                        })}
                        className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <label className="w-48 h-48 flex flex-col items-center justify-center border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-red-500">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <span className="mt-2 text-sm text-gray-400">Upload Foto</span>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handlePhotoChange}
                      />
                    </label>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Testimoni Anda
                </label>
                <textarea
                  value={newTestimonial.text}
                  onChange={(e) => setNewTestimonial({...newTestimonial, text: e.target.value})}
                  rows="4"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 text-white"
                  placeholder="Bagikan pengalaman Anda menggunakan perpustakaan digital..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Rating
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setNewTestimonial({...newTestimonial, rating: star})}
                      className={`text-2xl ${
                        star <= newTestimonial.rating ? 'text-yellow-500' : 'text-gray-600'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Kirim Testimoni
              </button>
            </form>
          </div>
        )}

        {/* Daftar Testimonial */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.length > 0 ? (
            testimonials.map((testimonial) => (
              <div key={testimonial.id} className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl border border-gray-700 hover:border-red-500/30 transition-all duration-300">
                {/* Display photo if available */}
                {testimonial.photoUrl && (
                  <div className="mb-6">
                    <img
                      src={testimonial.photoUrl}
                      alt="Reading Activity"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  </div>
                )}
                {/* Display book title if available */}
                {testimonial.bookTitle && (
                  <div className="mb-4 text-sm">
                    <span className="text-gray-400">Buku yang dibaca:</span>
                    <span className="text-white ml-2 font-medium">{testimonial.bookTitle}</span>
                  </div>
                )}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    {testimonial.user.profileImage ? (
                      <img 
                        src={testimonial.user.profileImage}
                        alt={testimonial.user.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white font-bold text-xl">
                        {testimonial.user.initial}
                      </div>
                    )}
                    <div className="ml-4">
                      <h4 className="text-white font-semibold">{testimonial.user.name}</h4>
                      <p className="text-gray-400 text-sm">{testimonial.user.class}</p>
                    </div>
                  </div>
                  {/* Tombol Hapus hanya muncul untuk admin */}
                  {user?.role === 'admin' && (
                    <button
                      onClick={() => handleDelete(testimonial.id)}
                      className="text-red-500 hover:text-red-600 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
                <p className="text-gray-300 italic leading-relaxed mb-4">"{testimonial.text}"</p>
                <div className="flex text-yellow-500">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <span key={i}>★</span>
                  ))}
                </div>
                {testimonial.bookTitle && (
                  <div className="mb-4 text-sm">
                    <span className="text-gray-400">Buku yang dibaca:</span>
                    <span className="text-white ml-2">{testimonial.bookTitle}</span>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="col-span-3 text-center text-gray-400">
              Belum ada testimoni. Jadilah yang pertama memberikan testimoni!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TestimonialSection;
