import { useState, useEffect } from 'react';

const StudentSearch = ({ onStudentSelect, selectedStudent }) => {
    const [query, setQuery] = useState('');
    const [students, setStudents] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [loading, setLoading] = useState(false);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (query.length >= 2) {
                searchStudents();
            } else {
                setStudents([]);
                setShowDropdown(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    const searchStudents = async () => {
        try {
            setLoading(true);
            const response = await fetch(`http://localhost:3001/api/users/search?query=${query}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            const data = await response.json();
            if (data.status === 'success') {
                setStudents(data.data.students);
                setShowDropdown(true);
            }
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectStudent = (student) => {
        onStudentSelect(student);
        setQuery(student.full_name);
        setShowDropdown(false);
    };

    return (
        <div className="relative">
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    👤 Pilih Siswa:
                </label>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Cari siswa (nama, NIS, username)..."
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
                {loading && (
                    <div className="absolute right-3 top-12 transform -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                    </div>
                )}
            </div>

            {/* Dropdown Results */}
            {showDropdown && students.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {students.map((student) => (
                        <button
                            key={student.id}
                            onClick={() => handleSelectStudent(student)}
                            className="w-full px-4 py-3 text-left hover:bg-gray-700 focus:bg-gray-700 focus:outline-none border-b border-gray-700 last:border-b-0"
                        >
                            <div className="text-white font-medium">{student.full_name}</div>
                            <div className="text-sm text-gray-400">
                                NIS: {student.nis} | Kelas: {student.class} | Username: {student.username}
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* Selected Student Display */}
            {selectedStudent && (
                <div className="mt-3 p-3 bg-green-900/20 border border-green-600 rounded-lg">
                    <div className="text-green-400 font-medium">✅ Siswa Terpilih:</div>
                    <div className="text-white font-semibold">{selectedStudent.full_name}</div>
                    <div className="text-sm text-gray-300">
                        NIS: {selectedStudent.nis} | Kelas: {selectedStudent.class}
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentSearch;