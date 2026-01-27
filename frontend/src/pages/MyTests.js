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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  LinearProgress,
  TextField
} from '@mui/material';
import {
  Edit,
  Delete,
  PlayArrow,
  Analytics,
  Share,
  Add,
  ContentCopy,
  Person,
  QuestionAnswer,
  Schedule
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const MyTests = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [shareDialog, setShareDialog] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadMyTests();
  }, []);

  const loadMyTests = async () => {
    try {
      const response = await api.get('/tests/');
      const myTests = response.data.filter(test => 
        test.author_id === user.id || test.user_access_level === 'admin'
      );
      setTests(myTests);
    } catch (error) {
      console.error('Error loading tests:', error);
      setMessage('Ошибка загрузки тестов');
      
      // Мок-данные
      setTests([
        {
          id: 1,
          title: 'Мой первый тест по математике',
          description: 'Создан для проверки знаний студентов 10 класса по алгебре. Включает задачи на уравнения, неравенства и функции.',
          author_id: user.id,
          is_active: true,
          is_public: false,
          time_limit: 45,
          max_attempts: 2,
          created_at: new Date().toISOString(),
          questions: [{}, {}, {}],
          user_access_level: 'admin'
        },
        {
          id: 2,
          title: 'Физика: основы механики',
          description: 'Тест охватывает кинематику, динамику и законы сохранения. Подходит для студентов технических специальностей.',
          author_id: user.id,
          is_active: true,
          is_public: true,
          time_limit: 60,
          max_attempts: 1,
          created_at: new Date().toISOString(),
          questions: [{}, {}, {}, {}, {}],
          user_access_level: 'admin'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTest = async (testId) => {
    try {
      await api.delete(`/tests/${testId}`);
      setTests(prev => prev.filter(test => test.id !== testId));
      setMessage('Тест успешно удален');
      setDeleteDialog(null);
    } catch (error) {
      console.error('Error deleting test:', error);
      setMessage('Ошибка удаления теста');
    }
  };

  const handleShareTest = (test) => {
    const inviteLink = `${window.location.origin}/test/${test.id}`;
    setShareDialog({ test, inviteLink });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setMessage('Ссылка скопирована в буфер обмена');
  };

  const getTestStatus = (test) => {
    if (!test.is_active) return { label: 'Неактивен', color: 'default' };
    if (test.is_public) return { label: 'Публичный', color: 'success' };
    return { label: 'Приватный', color: 'primary' };
  };

  const getQuestionsCount = (test) => {
    return test.questions?.length || 0;
  };

  if (loading) {
    return (
      <Container sx={{ py: 4 }}>
        <LinearProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1">
          Мои тесты
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate('/create-test')}
        >
          Создать тест
        </Button>
      </Box>

      {message && (
        <Alert severity="info" sx={{ mb: 3 }} onClose={() => setMessage('')}>
          {message}
        </Alert>
      )}

      {tests.length === 0 ? (
        <Card sx={{ textAlign: 'center', p: 4 }}>
          <Typography variant="h6" gutterBottom>
            У вас пока нет тестов
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Создайте свой первый тест и начните тестирование
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate('/create-test')}
          >
            Создать первый тест
          </Button>
        </Card>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {tests.map((test) => {
            const status = getTestStatus(test);
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
                    <Typography variant="h6" component="h2" sx={{ flexGrow: 1, mr: 2 }}>
                      {test.title || 'Тест без названия'}
                    </Typography>
                    <Chip
                      label={status.label}
                      color={status.color}
                      size="small"
                    />
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
                      label={`${test.max_attempts} попыт.`}
                      variant="outlined"
                      size="small"
                    />
                    {test.author_id === user.id && (
                      <Chip
                        icon={<Person />}
                        label="Автор"
                        color="primary"
                        size="small"
                        variant="outlined"
                      />
                    )}
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                      {new Date(test.created_at).toLocaleDateString('ru-RU')}
                    </Typography>
                  </Box>
                </CardContent>

                <CardActions sx={{ p: 2, pt: 0, display: 'flex', justifyContent: 'space-between' }}>
                  <Box>
                    <IconButton
                      color="primary"
                      onClick={() => navigate(`/test/${test.id}/edit`)}
                      title="Редактировать"
                      size="small"
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      color="info"
                      onClick={() => handleShareTest(test)}
                      title="Поделиться"
                      size="small"
                    >
                      <Share />
                    </IconButton>
                    <IconButton
                      color="success"
                      onClick={() => navigate(`/test/${test.id}/stats`)}
                      title="Статистика"
                      size="small"
                    >
                      <Analytics />
                    </IconButton>
                  </Box>
                  
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Button
                      variant="outlined"
                      startIcon={<PlayArrow />}
                      onClick={() => navigate(`/test/${test.id}/intro`)}
                      size="small"
                    >
                      Пройти
                    </Button>
                    <IconButton
                      color="error"
                      onClick={() => setDeleteDialog(test)}
                      title="Удалить"
                      size="small"
                    >
                      <Delete />
                    </IconButton>
                  </Box>
                </CardActions>
              </Card>
            );
          })}
        </Box>
      )}

      <Dialog open={!!deleteDialog} onClose={() => setDeleteDialog(null)}>
        <DialogTitle>Удалить тест</DialogTitle>
        <DialogContent>
          <Typography>
            Вы уверены, что хотите удалить тест "{deleteDialog?.title}"? Это действие нельзя отменить.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(null)}>Отмена</Button>
          <Button 
            onClick={() => handleDeleteTest(deleteDialog?.id)} 
            color="error"
            variant="contained"
          >
            Удалить
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!shareDialog} onClose={() => setShareDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Поделиться тестом</DialogTitle>
        <DialogContent>
          <Typography variant="h6" gutterBottom>
            {shareDialog?.test.title}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField
              fullWidth
              value={shareDialog?.inviteLink || ''}
              size="small"
              InputProps={{ readOnly: true }}
            />
            <IconButton onClick={() => copyToClipboard(shareDialog?.inviteLink)} color="primary">
              <ContentCopy />
            </IconButton>
          </Box>
          <Typography variant="body2" color="text.secondary">
            Отправьте эту ссылку участникам для прохождения теста
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShareDialog(null)}>Закрыть</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default MyTests;