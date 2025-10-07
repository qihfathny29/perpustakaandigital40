import { Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from './context/AuthContext';
import { BorrowProvider } from './context/BorrowContext';
import BookCatalog from './pages/BookCatalog';
import Login from './pages/Login';
import Register from './pages/Register';
import StudentDashboard from './pages/StudentDashboard';
import AdminDashboard from './pages/AdminDashboard';
import PetugasDashboard from './pages/PetugasDashboard';
import ChatBotFloatingButton from './components/ChatBotFloatingButton';

function App() {
  const { user } = useContext(AuthContext);

  return (
    <BorrowProvider>
      <Routes>
        <Route path="/" element={<BookCatalog />} />
        <Route
          path="/login"
          element={user ? <Navigate to={user.role === 'admin' ? '/admin' : user.role === 'petugas' ? '/petugas' : '/dashboard'} /> : <Login />}
        />
        <Route
          path="/register"
          element={user ? <Navigate to={user.role === 'admin' ? '/admin' : user.role === 'petugas' ? '/petugas' : '/dashboard'} /> : <Register />}
        />
        <Route
          path="/dashboard"
          element={
            user ? (
              user.role === 'student' ? (
                <StudentDashboard />
              ) : (
                <Navigate to={user.role === 'admin' ? '/admin' : '/petugas'} replace />
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/admin"
          element={
            user ? (
              user.role === 'admin' ? (
                <AdminDashboard />
              ) : (
                <Navigate to={user.role === 'petugas' ? '/petugas' : '/dashboard'} replace />
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/petugas"
          element={
            user ? (
              user.role === 'petugas' ? (
                <PetugasDashboard />
              ) : (
                <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
      <ChatBotFloatingButton />
    </BorrowProvider>
  );
}

export default App;