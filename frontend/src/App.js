import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider as MUIThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import CreateTest from './pages/CreateTest';

// Контексты
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';

// Компоненты страниц
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import MyTests from './pages/MyTests';
import TestList from './pages/TestList';
import TakeTest from './pages/TakeTest';
import TestIntro from './pages/TestIntro';
import Groups from './pages/Groups'; // <-- Путь исправлен на pages
import GroupDetail from './pages/GroupDetail'; // Проверь, что файл называется именно так
import CreateGroup from './pages/CreateGroup';
// Компоненты
import Header from './components/common/Header';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Загрузка...</div>;
  return user ? children : <Login />;
};

const ThemedApp = () => {
  const { theme } = useTheme();

  return (
    <MUIThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/create-test" element={<ProtectedRoute><CreateTest /></ProtectedRoute>} />
          <Route path="/my-tests" element={<ProtectedRoute><MyTests /></ProtectedRoute>} />
          <Route path="/tests" element={<ProtectedRoute><TestList /></ProtectedRoute>} />
          <Route path="/groups" element={<ProtectedRoute><Groups /></ProtectedRoute>} />
          <Route path="/groups/:groupId" element={<ProtectedRoute><GroupDetail /></ProtectedRoute>} />
          <Route path="/test/:testId/intro" element={<ProtectedRoute><TestIntro /></ProtectedRoute>} />
          <Route path="/test/:testId/take" element={<ProtectedRoute><TakeTest /></ProtectedRoute>} />
          <Route path="/edit-test/:testId" element={<CreateTest />} />
          <Route path="/groups/create" element={<CreateGroup />} />
        </Routes>
      </Router>
    </MUIThemeProvider>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ThemedApp />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;