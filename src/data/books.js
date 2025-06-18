const loadBooks = () => {
  const savedBooks = localStorage.getItem('books');
  return savedBooks ? JSON.parse(savedBooks) : [
    {
      id: '1',
      title: 'Laut Bercerita',
      author: 'Leila S. Chudori',
      category: 'Fiksi',
      available: true,
      stock: 1,
      imageUrl: '/books/laut-bercerita.jpg',
      synopsis: 'Laut Bercerita adalah novel karya Leila S. Chudori yang diterbitkan oleh Kepustakaan Populer Gramedia Jakarta pada tahun 2017. Novel ini berkisah tentang persahabatan, cinta, keluarga, dan kehilangan para tokoh-tokohnya.',
    },
    {
      id: '2',
      title: 'BUMI (unedited version)',
      author: 'Tere Liye',
      category: 'Fiksi',
      available: true,
      stock: 2,
      imageUrl: '/books/bumi.jpg',
      synopsis: 'Novel fantasi yang mengisahkan petualangan seorang gadis bernama Raib yang memiliki kekuatan supernatural.',
    },
    {
      id: '3',
      title: 'Cantik Itu Luka',
      author: 'Eka Kurniawan',
      category: 'Fiksi',
      available: true,
      stock: 1,
      imageUrl: '/books/cantik-itu-luka.jpg',
      synopsis: 'Sebuah novel epik yang mengisahkan kehidupan Dewi Ayu dan keempat putrinya.',
    },
    {
      id: 4,
      title: "Think and Grow Rich",
      author: "Napoleon Hill",
      category: "Non-Fiksi",
      synopsis: "Buku legendaris tentang cara mencapai kesuksesan dan kekayaan melalui pola pikir dan prinsip-prinsip yang telah terbukti.",
      available: true,
      imageUrl: "/images/books/think-and-grow-rich.jpg",
      stock: 5 // Add stock field
    },
    {
      id: 5,
      title: "Pengantar Pendidikan",
      author: "Umar Tirtarahardja",
      category: "Pendidikan",
      synopsis: "Buku yang membahas dasar-dasar ilmu pendidikan, konsep, dan teori pendidikan modern.",
      available: true,
      imageUrl: "/images/books/pengantar-pendidikan.jpg",
      stock: 5 // Add stock field
    },
    {
      id: 6,
      title: "Layang-Layang putus",
      author: "Masharto Alfathi",
      category: "Novel",
      synopsis: "Novel yang mengisahkan tentang perjalanan hidup dan romansa dengan berbagai konflik yang menarik.",
      available: true,
      imageUrl: "/images/books/layang-layang-putus.jpg",
      stock: 5 // Add stock field
    },
    {
      id: 7,
      title: "Malioboro at Midnight",
      author: "Skysphire",
      category: "Novel",
      synopsis: "Novel ini bercerita tentang Serana Nigitha, seorang gadis yang sedang menjalani hubungan rumit dengan Jan Ichard, seorang vokalis band, dan kedatangan Malioboro Hartigan yang mengubah segalanya.",
      available: true,
      imageUrl: "/images/books/malioboro-at-midnight.jpg",
      stock: 5 // Add stock field
    },
    {
      id: 8,
      title: "HUJAN",
      author: "Tere Liye",
      category: "Novel",
      synopsis: "Kisah tentang melupakan. Tentang Hujan.**Novel ini adalah naskah awal (asli) dari penulis; tanpa sentuhan editing, layout serta cover dari penerbit, dengan demikian, naskah ini berbeda dengan versi cetak, pun memiliki kelebihan dan kelemahan masing-masing.",
      available: true,
      imageUrl: "/images/books/hujan.jpg",
      stock: 5 // Add stock field
    }
  ];
};

export const books = loadBooks();

export const addBook = (book) => {
  const newBook = {
    id: books.length + 1,
    ...book,
    available: book.stock > 0, // Update availability based on stock
    stock: parseInt(book.stock) || 0
  };
  books.push(newBook);
  localStorage.setItem('books', JSON.stringify(books));
  return newBook;
};

export const updateBook = (bookId, updatedData) => {
  const index = books.findIndex(book => book.id === bookId);
  if (index !== -1) {
    books[index] = { 
      ...books[index], 
      ...updatedData,
      imageUrl: updatedData.imageUrl || books[index].imageUrl // Preserve existing image if not changed
    };
    localStorage.setItem('books', JSON.stringify(books));
    return books[index];
  }
  return null;
};

export const deleteBook = (bookId) => {
  const index = books.findIndex(book => book.id === bookId);
  if (index !== -1) {
    books.splice(index, 1);
    localStorage.setItem('books', JSON.stringify(books));
    return true;
  }
  return false;
};

// Add function to get current stock
export const getBookStock = (bookId) => {
  const book = books.find(b => b.id.toString() === bookId.toString());
  return book ? book.stock : 0;
};

// Add function to check if book is available
export const isBookAvailable = (bookId) => {
  const book = books.find(b => b.id.toString() === bookId.toString());
  return book ? book.available && book.stock > 0 : false;
};