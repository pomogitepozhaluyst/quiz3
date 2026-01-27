import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  LinearProgress,
  Alert,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Quiz,
  Groups,
  BarChart,
  Person,
  School,
  EmojiEvents,
  AccessTime,
  CheckCircle,
  Schedule,
  TrendingUp,
  LibraryBooks,
  GroupWork,
  Assessment,
  Explore
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('checking');

  useEffect(() => {
    checkBackendConnection();
    loadUserStats();
    loadRecentActivity();
  }, []);

  const checkBackendConnection = async () => {
    try {
      await api.get('/health');
      setConnectionStatus('connected');
    } catch (error) {
      console.error('Connection error:', error);
      setConnectionStatus('error');
    }
  };

  const loadUserStats = async () => {
    try {
      const response = await api.get('/statistics');
      setStats(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
      setStats({
        total_stats: {
          total_tests_completed: 0,
          total_questions_answered: 0,
          total_correct_answers: 0,
          overall_accuracy: 0
        },
        category_stats: []
      });
    } finally {
      setLoading(false);
    }
  };

  const loadRecentActivity = async () => {
    setRecentActivity([
      { id: 1, type: 'test', title: 'Математика: основы алгебры', score: 85, date: new Date().toISOString() },
      { id: 2, type: 'test', title: 'История: Древний мир', score: 92, date: new Date(Date.now() - 86400000).toISOString() },
      { id: 3, type: 'group', title: 'Присоединился к курсу', description: 'Физика 10 класс', date: new Date(Date.now() - 172800000).toISOString() }
    ]);
  };

  const getInitials = (name) => {
    return name ? name.charAt(0).toUpperCase() : 'U';
  };

  const StatCard = ({ icon, value, label, color = 'primary' }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ textAlign: 'center', p: 2 }}>
        <Box sx={{ 
          color: `${color}.main`, 
          mb: 1 
        }}>
          {React.cloneElement(icon, { sx: { fontSize: 32 } })}
        </Box>
        <Typography variant="h5" component="div" fontWeight="bold" gutterBottom>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
      </CardContent>
    </Card>
  );

  const QuickActionCard = ({ icon, title, description, buttonText, onClick, color = 'primary' }) => (
    <Card 
      sx={{ 
        height: '100%',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 3
        }
      }}
      onClick={onClick}
    >
      <CardContent sx={{ textAlign: 'center', p: 2 }}>
        <Box sx={{ 
          color: `${color}.main`, 
          mb: 1 
        }}>
          {React.cloneElement(icon, { sx: { fontSize: 36 } })}
        </Box>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph sx={{ mb: 1 }}>
          {description}
        </Typography>
        <Button variant="contained" color={color} fullWidth size="small">
          {buttonText}
        </Button>
      </CardContent>
    </Card>
  );

  const getAvailableActions = () => {
    const actions = [];

    actions.push({
      icon: <Quiz />,
      title: "Пройти квиз",
      description: "Участвуйте в образовательных квизах",
      buttonText: "Найти квиз",
      onClick: () => navigate('/tests'),
      color: "primary"
    });

    actions.push({
      icon: <LibraryBooks />,
      title: "Создать квиз",
      description: "Создавайте собственные образовательные квизы",
      buttonText: "Создать",
      onClick: () => navigate('/create-test'),
      color: "info"
    });

    actions.push({
      icon: <Groups />,
      title: "Учебные группы",
      description: "Присоединяйтесь к учебным группам и курсам",
      buttonText: "Мои группы",
      onClick: () => navigate('/groups'),
      color: "success"
    });

    return actions;
  };

  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Заголовок и статус */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
          Добро пожаловать, {user?.first_name || user?.username}! 👋
        </Typography>
        
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Образовательная платформа для эффективного обучения
        </Typography>
        
        {/* Статус соединения */}
        {connectionStatus === 'checking' && (
          <Alert severity="info" sx={{ mt: 1 }}>
            Проверяем соединение с сервером...
          </Alert>
        )}
        {connectionStatus === 'connected' && (
          <Alert severity="success" sx={{ mt: 1 }}>
            ✅ Система работает стабильно
          </Alert>
        )}
        {connectionStatus === 'error' && (
          <Alert severity="error" sx={{ mt: 1 }}>
            ❌ Проблемы с соединением. Проверьте запущен ли бэкенд.
          </Alert>
        )}
      </Box>

      <Grid container spacing={3}>
        {/* Основная секция - 9 колонок */}
        <Grid item xs={12} lg={9}>
          <Grid container spacing={3}>
            {/* Статистика в цифрах */}
            <Grid item xs={12}>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <StatCard
                    icon={<BarChart />}
                    value={stats?.total_stats?.total_tests_completed || 0}
                    label="Пройдено квизов"
                    color="primary"
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <StatCard
                    icon={<CheckCircle />}
                    value={stats?.total_stats?.total_questions_answered || 0}
                    label="Ответов дано"
                    color="success"
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <StatCard
                    icon={<TrendingUp />}
                    value={`${Math.round(stats?.total_stats?.overall_accuracy || 0)}%`}
                    label="Точность ответов"
                    color="info"
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <StatCard
                    icon={<EmojiEvents />}
                    value={stats?.total_stats?.total_correct_answers || 0}
                    label="Верных ответов"
                    color="warning"
                  />
                </Grid>
              </Grid>
            </Grid>

            {/* Доступные действия */}
            <Grid item xs={12}>
              <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <AccessTime /> Быстрые действия
              </Typography>
              <Grid container spacing={2}>
                {getAvailableActions().map((action, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <QuickActionCard {...action} />
                  </Grid>
                ))}
              </Grid>
            </Grid>

            {/* Прогресс по категориям */}
            {stats?.category_stats && stats.category_stats.length > 0 && (
              <Grid item xs={12} sm={6}>
                <Card>
                  <CardContent sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <School /> Прогресс обучения
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      {stats.category_stats.slice(0, 3).map((categoryStat, index) => {
                        const progress = categoryStat.questions_answered > 0 
                          ? (categoryStat.correct_answers / categoryStat.questions_answered) * 100 
                          : 0;
                        
                        return (
                          <Box key={index}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                              <Typography variant="body2">
                                Предмет {index + 1}
                              </Typography>
                              <Typography variant="body2" fontWeight="bold" color="primary">
                                {Math.round(progress)}%
                              </Typography>
                            </Box>
                            <LinearProgress 
                              variant="determinate" 
                              value={progress}
                              sx={{ 
                                height: 6, 
                                borderRadius: 3
                              }}
                            />
                          </Box>
                        );
                      })}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* Последняя активность */}
            <Grid item xs={12} sm={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Schedule /> Недавняя активность
                  </Typography>
                  <List dense sx={{ py: 0 }}>
                    {recentActivity.slice(0, 3).map((activity, index) => (
                      <ListItem key={activity.id} sx={{ px: 0, py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <Avatar sx={{ 
                            width: 24,
                            height: 24,
                            bgcolor: activity.type === 'test' ? 'primary.main' : 'secondary.main',
                            fontSize: '0.7rem'
                          }}>
                            {activity.type === 'test' ? 'Q' : 'G'}
                          </Avatar>
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography variant="body2" noWrap>
                              {activity.title}
                            </Typography>
                          }
                          secondary={
                            <Typography variant="caption" color="text.secondary">
                              {activity.score ? `${activity.score}%` : new Date(activity.date).toLocaleDateString('ru-RU')}
                            </Typography>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>

        {/* Боковая панель - 3 колонки */}
        <Grid item xs={12} lg={3}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Профиль пользователя */}
            <Card>
              <CardContent sx={{ p: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Avatar 
                    sx={{ 
                      width: 40, 
                      height: 40, 
                      bgcolor: 'primary.main',
                      fontSize: '0.9rem'
                    }}
                  >
                    {getInitials(user?.first_name || user?.username)}
                  </Avatar>
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography variant="subtitle2" fontWeight="bold" noWrap>
                      {user?.username}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      Участник платформы
                    </Typography>
                  </Box>
                </Box>
                
                <Divider sx={{ my: 1 }} />
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 1 }}>
                  {user?.email && (
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {user?.email}
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.secondary">
                    Регистрация: {new Date(user?.created_at).toLocaleDateString('ru-RU')}
                  </Typography>
                </Box>

                <Button
                  variant="outlined"
                  startIcon={<Assessment sx={{ fontSize: 16 }} />}
                  onClick={() => navigate('/my-tests')}
                  fullWidth
                  size="small"
                  sx={{ fontSize: '0.75rem', py: 0.5 }}
                >
                  Мои квизы
                </Button>
              </CardContent>
            </Card>

            {/* Достижения */}
            <Card>
              <CardContent sx={{ p: 1.5 }}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <EmojiEvents sx={{ fontSize: 18 }} /> Достижения
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {[
                    { title: 'Первый шаг', desc: 'Пройдите первый квиз', icon: <Explore />, color: 'gold' },
                    { title: 'Активный студент', desc: 'Пройдите 5 квизов', icon: <TrendingUp />, color: 'silver' },
                    { title: 'Отличник', desc: 'Получите 90% в квизе', icon: <CheckCircle />, color: '#cd7f32' }
                  ].map((achievement, index) => (
                    <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ bgcolor: achievement.color, width: 28, height: 28, fontSize: '0.7rem' }}>
                        {React.cloneElement(achievement.icon, { sx: { fontSize: 14 } })}
                      </Avatar>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="caption" fontWeight="medium">
                          {achievement.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" fontSize="0.7rem">
                          {achievement.desc}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;