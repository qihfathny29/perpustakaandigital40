import { useState, useEffect, useCallback } from 'react';
import { userAPI } from '../utils/api';

const StudentSearch = ({ onStudentSelect, selectedStudent, resetTrigger }) => {
    const [query, setQuery] = useState('');
    const [students, setStudents] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [loading, setLoading] = useState(false);

    // Reset input when resetTrigger changes
    useEffect(() => {
        if (resetTrigger) {
            setQuery('');
            setStudents([]);
            setShowDropdown(false);
        }
    }, [resetTrigger]);

    const searchStudents = useCallback(async (searchQuery) => {
        try {
            setLoading(true);
            const response = await userAPI.searchStudents(searchQuery);
            console.log('🔍 Search response:', response);
            
            // Backend returns: { status: 'success', data: { students: [...] } }
            const studentsData = response?.data?.students || [];
            setStudents(studentsData);
            setShowDropdown(studentsData.length > 0);
        } catch (error) {
            console.error('Search error:', error);
            setStudents([]);
            setShowDropdown(false);
        } finally {
            setLoading(false);
        }
    }, []);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (query.length >= 2) {
                searchStudents(query);
            } else {
                setStudents([]);
                setShowDropdown(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query, searchStudents]);

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
            {showDropdown && students && students.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {students?.map((student) => (
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