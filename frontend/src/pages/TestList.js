import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  TextField,
  InputAdornment,
  LinearProgress,
  Alert
} from '@mui/material';
import {
  Search,
  PlayArrow,
  Groups,
  Schedule,
  EmojiEvents,
  QuestionAnswer,
  Cached
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const TestList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tests, setTests] = useState([]);
  const [filteredTests, setFilteredTests] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTests();
  }, []);

  useEffect(() => {
    const filtered = tests.filter(test =>
      test.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      test.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredTests(filtered);
  }, [searchTerm, tests]);

  const loadTests = async () => {
    try {
      const response = await api.get('/tests/');
      const availableTests = response.data.filter(test => 
        test.is_active && 
        (test.is_public || test.user_access_level || test.author_id === user.id)
      );
      
      setTests(availableTests);
    } catch (error) {
      console.error('Error loading tests:', error);
      setError('Ошибка загрузки тестов: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const startTest = (testId) => {
    // Просто переходим на страницу интро, сессия создастся там
    navigate(`/test/${testId}/intro`);
  };

  const getTestTypeIcon = (test) => {
    return test.is_public ? <Groups /> : <EmojiEvents />;
  };

  const getTestTypeLabel = (test) => {
    return test.is_public ? 'Публичный' : 'Приватный';
  };

  const getQuestionsCount = (test) => {
    return test.questions?.length || 0;
  };

  const getAttemptsDisplay = (test) => {
    if (test.max_attempts === 0) {
      return {
        text: '∞ попыток',
        color: 'success',
        variant: 'outlined'
      };
    }
    
    return {
      text: `${test.max_attempts} попыт${test.max_attempts === 1 ? 'ка' : test.max_attempts < 5 ? 'ки' : 'ок'}`,
      color: 'info',
      variant: 'outlined'
    };
  };

  if (loading) {
    return (
      <Container sx={{ py: 4 }}>
        <LinearProgress />
        <Typography align="center" sx={{ mt: 2 }}>
          Загрузка тестов...
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Доступные тесты
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <TextField
        fullWidth
        placeholder="Поиск тестов по названию или описанию..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        sx={{ mb: 4 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search />
            </InputAdornment>
          ),
        }}
      />

      {tests.length === 0 ? (
        <Card sx={{ textAlign: 'center', p: 4 }}>
          <Typography variant="h6" gutterBottom>
            Нет доступных тестов
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            {error ? 'Не удалось загрузить тесты с сервером' : 'Пока нет тестов, доступных для прохождения'}
          </Typography>
          {error && (
            <Button
              variant="outlined"
              onClick={loadTests}
            >
              Попробовать снова
            </Button>
          )}
        </Card>
      ) : filteredTests.length === 0 ? (
        <Card sx={{ textAlign: 'center', p: 4 }}>
          <Typography variant="h6" gutterBottom>
            Тесты не найдены
          </Typography>
          <Typography color="text.secondary">
            Попробуйте изменить поисковый запрос
          </Typography>
        </Card>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {filteredTests.map((test) => {
            const attemptsDisplay = getAttemptsDisplay(test);
            
            return (
              <Card 
                key={test.id} 
                sx={{ 
                  width: '100%',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 3
                  }
                }}
              >
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography 
                      variant="h6" 
                      component="h2" 
                      sx={{ 
                        flexGrow: 1, 
                        mr: 2
                      }}
                    >
                      {test.title || 'Тест без названия'}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                      <Chip
                        label={getTestTypeLabel(test)}
                        color={test.is_public ? 'primary' : 'secondary'}
                        size="small"
                        variant="filled"
                      />
                      
                      {/* Бейдж для неограниченных попыток */}
                      {test.max_attempts === 0 && (
                        <Chip
                          icon={<Cached />}
                          label="Бесконечные попытки"
                          color="success"
                          size="small"
                          variant="filled"
                          sx={{ 
                            fontWeight: 'bold',
                            fontSize: '0.7rem'
                          }}
                        />
                      )}
                    </Box>
                  </Box>

                  <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{ 
                      mb: 1.5,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      lineHeight: 1.4
                    }}
                  >
                    {test.description || 'Описание отсутствует'}
                  </Typography>

                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Chip
                      icon={<QuestionAnswer />}
                      label={`${getQuestionsCount(test)} вопр.`}
                      variant="outlined"
                      size="small"
                    />
                    {test.time_limit && (
                      <Chip
                        icon={<Schedule />}
                        label={`${test.time_limit} мин`}
                        variant="outlined"
                        size="small"
                      />
                    )}
                    
                    <Chip
                      label={attemptsDisplay.text}
                      variant={attemptsDisplay.variant}
                      color={attemptsDisplay.color}
                      size="small"
                    />
                    
                    <Typography 
                      variant="caption" 
                      color="text.secondary"
                      sx={{ ml: 'auto' }}
                    >
                      {test.author?.username || 'Неизвестен'}
                    </Typography>
                  </Box>
                </CardContent>

                <CardActions sx={{ p: 2, pt: 0 }}>
                  <Button
                    variant="contained"
                    startIcon={<PlayArrow />}
                    onClick={() => startTest(test.id)}
                    size="small"
                  >
                    Начать тест
                  </Button>
                </CardActions>
              </Card>
            );
          })}
        </Box>
      )}
    </Container>
  );
};

export default TestList;