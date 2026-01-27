import React from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  Box, 
  IconButton,
  Switch
} from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { Brightness4, Brightness7 } from '@mui/icons-material';

const Header = () => {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleLogoClick = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/');
    }
  };

  return (
    <AppBar position="static" elevation={2}>
      <Toolbar>
        <Typography 
          variant="h6" 
          component="div" 
          sx={{ 
            flexGrow: 1,
            fontWeight: 700,
            cursor: 'pointer'
          }}
          onClick={handleLogoClick}
        >
          🎯 EduQuiz
        </Typography>
        
        {/* Переключатель темы */}
        <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
          <Brightness7 sx={{ fontSize: 20, color: isDarkMode ? 'grey.400' : 'warning.main' }} />
          <Switch
            checked={isDarkMode}
            onChange={toggleTheme}
            sx={{
              mx: 1,
              '& .MuiSwitch-switchBase.Mui-checked': {
                color: isDarkMode ? '#ff1744' : '#2e7d32',
              },
              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                backgroundColor: isDarkMode ? '#ff1744' : '#2e7d32',
              },
            }}
          />
          <Brightness4 sx={{ fontSize: 20, color: isDarkMode ? 'primary.main' : 'grey.400' }} />
        </Box>
        
        {user ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button 
              color="inherit" 
              onClick={() => navigate('/dashboard')}
              sx={{ fontWeight: 600 }}
            >
              Кабинет
            </Button>
            <Button 
              color="inherit" 
              onClick={handleLogout}
              sx={{ fontWeight: 600 }}
            >
              Выйти
            </Button>
          </Box>
        ) : (
          <Box>
            <Button 
              color="inherit" 
              onClick={() => navigate('/login')}
              sx={{ fontWeight: 600, mr: 1 }}
            >
              Войти
            </Button>
            <Button 
              variant="outlined" 
              color="inherit"
              onClick={() => navigate('/register')}
              sx={{ 
                fontWeight: 600,
                borderColor: 'inherit',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.1)'
                }
              }}
            >
              Регистрация
            </Button>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Header;