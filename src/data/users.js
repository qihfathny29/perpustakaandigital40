// Load users dari localStorage atau gunakan default jika belum ada
const loadUsers = () => {
  const savedUsers = localStorage.getItem('users');
  return savedUsers ? JSON.parse(savedUsers) : [
    {
      id: 1,
      username: 'admin',
      password: 'admin123',
      role: 'admin',
    }
  ];
};

export const users = loadUsers();

export const addUser = (user) => {
  const newUser = {
    id: users.length + 1,
    ...user,
    role: user.role || 'student'
  };
  users.push(newUser);
  // Simpan ke localStorage setiap kali ada user baru
  localStorage.setItem('users', JSON.stringify(users));
  return newUser;
};

export const findUser = (username, password) => {
  return users.find(
    (u) => u.username === username && u.password === password
  );
};