import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  Card,
  CardContent,
  Grid,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  LinearProgress,
  Alert
} from '@mui/material';
import {
  PlayArrow,
  Quiz,
  VideoLibrary,
  CheckBox,
  ShortText,
  Science,
  Schedule,
  QuestionAnswer
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const TestIntro = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creatingSession, setCreatingSession] = useState(false);

  useEffect(() => {
    loadTest();
  }, [testId]);

  const loadTest = async () => {
    try {
      const response = await api.get(`/tests/${testId}`);
      console.log('Test data loaded:', response.data);
      setTest(response.data);
    } catch (error) {
      console.error('Error loading test:', error);
      setError('Ошибка загрузки теста: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

const startTest = async () => {
  setCreatingSession(true);
  setError('');
  
  try {
    console.log('🎯 Начинаем тест с ID:', testId);
    console.log('📊 Данные теста:', test);
    
    const sessionData = {
      test_id: parseInt(testId)
    };
    
    console.log('📤 Отправляем данные сессии:', sessionData);
    const sessionResponse = await api.post('/test-sessions/', sessionData);
    console.log('✅ Сессия создана:', sessionResponse.data);
    
    // Переходим к прохождению теста с передачей sessionId
    console.log('🔄 Переход к тесту...');
    navigate(`/test/${testId}/take`, { 
      state: { 
        sessionId: sessionResponse.data.id,
        testData: test 
      } 
    });
    
  } catch (error) {
    console.error('❌ Ошибка создания сессии:', error);
    console.error('URL:', error.config?.url);
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    
    if (error.response?.status === 400 && 
        error.response.data.detail?.includes('Превышено')) {
      setError('Превышено максимальное количество попыток для этого теста');
    } else {
      setError('Ошибка при запуске теста: ' + (error.response?.data?.detail || error.message));
    }
  } finally {
    setCreatingSession(false);
  }
};

  const analyzeQuestionTypes = (questions) => {
    if (!questions || !questions.length) return [];
    
    const typeCount = {};
    questions.forEach(q => {
      const question = q.question || q;
      const type = question.type?.name || 'text';
      typeCount[type] = (typeCount[type] || 0) + 1;
    });
    
    return Object.entries(typeCount).map(([type, count]) => {
      const typeInfo = getQuestionTypeInfo(type);
      return {
        type: type,
        count: count,
        label: typeInfo.label,
        icon: typeInfo.icon,
        color: typeInfo.color
      };
    });
  };

  const getQuestionTypeInfo = (type) => {
    const types = {
      'single_choice': { label: 'Один вариант', icon: <CheckBox />, color: 'primary' },
      'multiple_choice': { label: 'Несколько вариантов', icon: <CheckBox />, color: 'primary' },
      'text_answer': { label: 'Текстовые вопросы', icon: <ShortText />, color: 'secondary' },
      'text': { label: 'Текстовые вопросы', icon: <ShortText />, color: 'secondary' },
      'blackbox': { label: 'Черный ящик', icon: <Science />, color: 'warning' },
      'video': { label: 'Видеовопросы', icon: <VideoLibrary />, color: 'error' },
      'image': { label: 'Вопросы с изображением', icon: <VideoLibrary />, color: 'info' }
    };
    
    return types[type] || { label: 'Другие вопросы', icon: <QuestionAnswer />, color: 'default' };
  };

  if (loading) {
    return (
      <Container sx={{ py: 4 }}>
        <LinearProgress />
        <Typography align="center" sx={{ mt: 2 }}>
          Загрузка теста...
        </Typography>
      </Container>
    );
  }

  if (!test) {
    return (
      <Container sx={{ py: 4 }}>
        <Alert severity="error">Тест не найден</Alert>
        <Button 
          onClick={() => navigate('/tests')} 
          sx={{ mt: 2 }}
        >
          Вернуться к списку тестов
        </Button>
      </Container>
    );
  }

  const questionTypes = analyzeQuestionTypes(test.questions);
  const totalQuestions = test.questions?.length || 0;

  const testInfo = {
    title: test.title || 'Тест без названия',
    description: test.description || 'Описание отсутствует',
    totalQuestions: totalQuestions,
    timeLimit: test.time_limit || 'Не ограничено',
    questionTypes: questionTypes,
    rules: [
      test.max_attempts === 0 ? 'Неограниченное количество попыток' : `Максимум ${test.max_attempts} попыт${test.max_attempts === 1 ? 'ка' : test.max_attempts < 5 ? 'ки' : 'ок'}`,
      test.time_limit ? `Время ограничено: ${test.time_limit} минут` : 'Время не ограничено',
      'Возврат к предыдущим вопросам невозможен',
      'Все ответы сохраняются автоматически',
      test.passing_score ? `Проходной балл: ${test.passing_score}%` : 'Проходной балл не установлен'
    ]
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom align="center">
          {testInfo.title}
        </Typography>

        <Typography variant="h6" color="text.secondary" paragraph align="center" sx={{ mb: 4 }}>
          {testInfo.description}
        </Typography>

        {error && (
          <Alert severity="warning" sx={{ mb: 4 }}>
            {error}
          </Alert>
        )}

        {/* Статистика теста */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={4}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ 
                textAlign: 'center', 
                p: 3, 
                flexGrow: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}>
                <Quiz sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
                <Typography variant="h3" component="div" color="primary.main" gutterBottom>
                  {testInfo.totalQuestions}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  всего вопросов
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={4}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ 
                textAlign: 'center', 
                p: 3, 
                flexGrow: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}>
                <Schedule sx={{ fontSize: 40, color: 'secondary.main', mb: 2 }} />
                <Typography variant="h3" component="div" color="secondary.main" gutterBottom>
                  {typeof testInfo.timeLimit === 'number' ? testInfo.timeLimit : '∞'}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {typeof testInfo.timeLimit === 'number' ? 'минут времени' : 'время не ограничено'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={4}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ 
                textAlign: 'center', 
                p: 3, 
                flexGrow: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}>
                <VideoLibrary sx={{ fontSize: 40, color: 'success.main', mb: 2 }} />
                <Typography variant="h3" component="div" color="success.main" gutterBottom>
                  {test.max_attempts === 0 ? '∞' : test.max_attempts}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {test.max_attempts === 0 ? 'неограниченно попыток' : 'попыток'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Типы вопросов */}
        {testInfo.questionTypes.length > 0 && (
          <>
            <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
              Типы вопросов в тесте:
            </Typography>
            
            <Grid container spacing={2} sx={{ mb: 4 }}>
              {testInfo.questionTypes.map((typeInfo, index) => (
                <Grid item xs={12} md={6} key={typeInfo.type}>
                  <Card variant="outlined" sx={{ height: '100%' }}>
                    <CardContent sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 2,
                      p: 2,
                      height: '100%'
                    }}>
                      <Box sx={{ color: `${typeInfo.color}.main` }}>
                        {React.cloneElement(typeInfo.icon, { sx: { fontSize: 32 } })}
                      </Box>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="body1" fontWeight="medium" gutterBottom>
                          {typeInfo.label}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {typeInfo.count} вопрос{typeInfo.count === 1 ? '' : typeInfo.count < 5 ? 'а' : 'ов'}
                        </Typography>
                      </Box>
                      <Chip 
                        label={typeInfo.count} 
                        color={typeInfo.color}
                        size="medium"
                        sx={{ fontSize: '1rem', minWidth: 40 }}
                      />
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </>
        )}

        {/* Правила */}
        <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
          Правила тестирования:
        </Typography>
        
        <List dense sx={{ mb: 4 }}>
          {testInfo.rules.map((rule, index) => (
            <ListItem key={index}>
              <ListItemIcon>
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    bgcolor: 'primary.main',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem'
                  }}
                >
                  {index + 1}
                </Box>
              </ListItemIcon>
              <ListItemText primary={rule} />
            </ListItem>
          ))}
        </List>

        {/* Кнопка начала */}
        <Box sx={{ textAlign: 'center' }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<PlayArrow />}
            onClick={startTest}
            disabled={creatingSession || !!error}
            sx={{
              px: 6,
              py: 1.5,
              fontSize: '1.2rem',
              borderRadius: 3
            }}
          >
            {creatingSession ? 'Подготовка...' : 'Начать тест'}
          </Button>
          
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Нажав кнопку, вы подтверждаете, что ознакомились с правилами
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default TestIntro;