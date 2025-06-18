import { useState } from 'react';
import PropTypes from 'prop-types';

function AddBookForm({ onSubmit }) {
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    synopsis: '',
    category: 'Fiksi',
    imageUrl: ''
  });
  const [selectedImage, setSelectedImage] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result);
        setFormData({ ...formData, imageUrl: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({ title: '', author: '', synopsis: '', category: 'Fiksi', imageUrl: '' });
    setSelectedImage(null);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Image Preview */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Gambar Buku
        </label>
        <div className="flex items-center justify-center">
          {selectedImage ? (
            <div className="relative">
              <img
                src={selectedImage}
                alt="Preview"
                className="w-48 h-48 object-cover rounded-lg"
              />
              <button
                type="button"
                onClick={() => {
                  setSelectedImage(null);
                  setFormData({ ...formData, imageUrl: '' });
                }}
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
                onChange={handleImageChange}
              />
            </label>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Judul Buku</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({...formData, title: e.target.value})}
          className="mt-1 w-full rounded-md border border-gray-300 p-2"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Penulis</label>
        <input
          type="text"
          value={formData.author}
          onChange={(e) => setFormData({...formData, author: e.target.value})}
          className="mt-1 w-full rounded-md border border-gray-300 p-2"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Sinopsis</label>
        <textarea
          value={formData.synopsis}
          onChange={(e) => setFormData({...formData, synopsis: e.target.value})}
          className="mt-1 w-full rounded-md border border-gray-300 p-2"
          rows="3"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Kategori</label>
        <select
          value={formData.category}
          onChange={(e) => setFormData({...formData, category: e.target.value})}
          className="mt-1 w-full rounded-md border border-gray-300 p-2"
        >
          <option value="Fiksi">Fiksi</option>
          <option value="Non-Fiksi">Non-Fiksi</option>
        </select>
      </div>
      <button
        type="submit"
        className="w-full bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600"
      >
        Tambah Buku
      </button>
    </form>
  );
}

AddBookForm.propTypes = {
  onSubmit: PropTypes.func.isRequired,
};

export default AddBookForm;
