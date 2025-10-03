import { Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from './context/AuthContext';
import BookCatalog from './pages/BookCatalog';
import Login from './pages/Login';
import Register from './pages/Register';
import StudentDashboard from './pages/StudentDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ChatBotFloatingButton from './components/ChatBotFloatingButton';

function App() {
  const { user } = useContext(AuthContext);

  return (
    <>
      <Routes>
        <Route path="/" element={<BookCatalog />} />
        <Route
          path="/login"
          element={user ? <Navigate to={user.role === 'admin' || user.role === 'petugas' ? '/admin' : '/dashboard'} /> : <Login />}
        />
        <Route
          path="/register"
          element={user ? <Navigate to={user.role === 'admin' || user.role === 'petugas' ? '/admin' : '/dashboard'} /> : <Register />}
        />
        <Route
          path="/dashboard"
          element={
            user ? (
              user.role === 'student' ? (
                <StudentDashboard />
              ) : (
                <Navigate to="/admin" replace />
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
              user.role === 'admin' || user.role === 'petugas' ? (
                <AdminDashboard />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
      <ChatBotFloatingButton />
    </>
  );
}

export default App;