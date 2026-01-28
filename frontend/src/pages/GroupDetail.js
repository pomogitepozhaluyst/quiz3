import React, { useState, useEffect, useMemo } from 'react';
import { 
  Container, Typography, Box, Tabs, Tab, Avatar, 
  Button, Grid, Card, List, ListItem, ListItemAvatar, 
  ListItemText, IconButton,
  TextField, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper,
  ToggleButtonGroup, ToggleButton,
  InputAdornment, Chip, LinearProgress,
  CircularProgress, Alert, Snackbar,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Tooltip, MenuItem, Select, FormControl, InputLabel,
  Divider, Stack
} from '@mui/material';
import { 
  ArrowBack, Assignment, People, EmojiEvents, TrendingUp, Search,
  Edit, Delete, Add, KeyboardArrowLeft, KeyboardArrowRight, CheckCircleOutline,
  PlayCircleOutline, Replay, Refresh, Visibility, BarChart as BarChartIcon,
  Timeline, Person, Schedule, Score, TrendingFlat,
  CheckCircle, Cancel, HourglassEmpty, Info
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, ResponsiveContainer, 
  BarChart, Bar, PieChart, Pie, Cell, Legend, Label,
  AreaChart, Area
} from 'recharts';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { format, intervalToDuration } from 'date-fns';
import { ru } from 'date-fns/locale';

const GroupDetail = () => {
  const navigate = useNavigate();
  const { groupId } = useParams();
  const { user } = useAuth();
  
  // Состояния
  const [activeTab, setActiveTab] = useState(0);
  const [memberSearch, setMemberSearch] = useState('');
  const [testSearch, setTestSearch] = useState('');
  const [statMode, setStatMode] = useState('average');
  const [testOffset, setTestOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [groupData, setGroupData] = useState(null);
  const [members, setMembers] = useState([]);
  const [groupTests, setGroupTests] = useState([]);
  const [groupStats, setGroupStats] = useState(null);
  const [selectedTest, setSelectedTest] = useState(null);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [timeRange, setTimeRange] = useState('all');

  const testsPerPage = 5;
  const isCreator = groupData?.created_by === user?.id;
  const isAdmin = user?.role_id === 3;

  // ========== API ФУНКЦИИ ==========

  const fetchGroupData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📥 Загрузка данных группы...');
      
      // 1. Получаем информацию о группе
      const groupResponse = await api.get(`/groups/${groupId}`);
      console.log('✅ Данные группы:', groupResponse.data);
      setGroupData(groupResponse.data);
      
      // 2. Получаем участников группы
      try {
        const membersResponse = await api.get(`/groups/${groupId}/members`);
        console.log('✅ Участники:', membersResponse.data?.length);
        setMembers(membersResponse.data || []);
      } catch (membersError) {
        console.warn('⚠️ Не удалось загрузить участников:', membersError);
        setMembers([]);
      }
      
      // 3. Получаем тесты назначенные группе
      try {
        const assignmentsResponse = await api.get(`/groups/${groupId}/tests`);
        console.log('✅ Назначения тестов:', assignmentsResponse.data);
        
        const testsWithDetails = await Promise.all(
          (assignmentsResponse.data || []).map(async (assignment) => {
            try {
              // Получаем полную информацию о тесте из таблицы tests
              let testFullInfo = null;
              try {
                const testResponse = await api.get(`/tests/${assignment.id}`);
                testFullInfo = testResponse.data;
                console.log(`✅ Полная информация о тесте ${assignment.id}:`, {
                  title: testFullInfo.title,
                  max_attempts: testFullInfo.max_attempts,
                  time_limit: testFullInfo.time_limit
                });
              } catch (testError) {
                console.warn(`⚠️ Не удалось загрузить детали теста ${assignment.id}:`, testError);
                testFullInfo = assignment;
              }
              
              // КРИТИЧНО: max_attempts берется из таблицы tests!
              const maxAttempts = testFullInfo.max_attempts || 1;
              
              console.log(`📊 Тест "${assignment.title}" (ID: ${assignment.id}):`, {
                assignment_id: assignment.assignment_id,
                max_attempts_from_test_table: maxAttempts,
                title: assignment.title
              });
              
              // Получаем все сессии для этого теста (без фильтра по assignment_id)
              const sessionsResponse = await api.get(`/test-sessions/`, {
                params: {
                  test_id: assignment.id, // Ищем сессии по test_id
                  user_id: user?.id
                }
              });
              
              const sessions = sessionsResponse.data || [];
              console.log(`📊 Все сессии теста ${assignment.id}:`, sessions);
              
              // Считаем завершенные попытки
              const completedSessions = sessions.filter(s => s.is_completed);
              const completedCount = completedSessions.length;
              
              // Проверяем есть ли незавершенная сессия
              const unfinishedSession = sessions.find(s => !s.is_completed);
              const hasUnfinished = !!unfinishedSession;
              
              // Общее количество использованных попыток
              const totalAttemptsUsed = hasUnfinished ? completedCount + 1 : completedCount;
              
              // Проверяем лимит из таблицы tests
              const hasAttemptsLeft = maxAttempts === 0 || totalAttemptsUsed < maxAttempts;
              
              // Берем последнюю сессию (завершенную или незавершенную)
              const latestSession = sessions.length > 0 
                ? sessions.sort((a, b) => new Date(b.started_at) - new Date(a.started_at))[0]
                : null;
              
              return {
                ...assignment,
                // Добавляем информацию из таблицы tests
                max_attempts: maxAttempts, // Это теперь из таблицы tests!
                sessions: sessions,
                latest_session: latestSession,
                // ИСПРАВЛЕНО: используем правильный подсчет
                attempts_used: totalAttemptsUsed,
                has_unfinished_attempt: hasUnfinished,
                is_completed: latestSession?.is_completed || false,
                is_passed: latestSession?.is_completed && 
                         latestSession.percentage >= (assignment.passing_score || 0)
              };
              
            } catch (error) {
              console.warn(`⚠️ Ошибка обработки теста ${assignment.id}:`, error);
              return {
                ...assignment,
                max_attempts: 1,
                sessions: [],
                latest_session: null,
                attempts_used: 0,
                has_unfinished_attempt: false,
                is_completed: false,
                is_passed: false
              };
            }
          })
        );
        
        console.log('📋 Все тесты с деталями:', testsWithDetails);
        setGroupTests(testsWithDetails);
        
      } catch (testsError) {
        console.warn('⚠️ Не удалось загрузить тесты:', testsError);
        setGroupTests([]);
      }
      
      // 4. Получаем полную статистику группы
      try {
        console.log('📊 Загрузка полной статистики...');
        const statsResponse = await api.get(`/groups/${groupId}/stats`);
        console.log('✅ Полная статистика загружена');
        setGroupStats(statsResponse.data);
      } catch (statsError) {
        console.log('ℹ️ Не удалось загрузить статистику:', statsError);
        setGroupStats(null);
      }
      
    } catch (err) {
      console.error('❌ Ошибка загрузки:', err);
      const errorMsg = err.response?.data?.detail || err.message || 'Ошибка загрузки данных группы';
      setError(errorMsg);
      setSnackbar({
        open: true,
        message: errorMsg,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // ========== ОБРАБОТЧИКИ ==========

  const handleStartTest = async (testId, assignmentId) => {
    try {
      console.log('🎯 [handleStartTest] Начинаем тест:', { 
        testId, 
        assignmentId,
        type_testId: typeof testId,
        type_assignmentId: typeof assignmentId 
      });
      
      if (!assignmentId) {
        console.error('❌ CRITICAL: assignmentId не передан!');
        setSnackbar({
          open: true,
          message: 'Ошибка: не найден идентификатор назначения теста',
          severity: 'error'
        });
        return;
      }
      
      if (!testId) {
        console.error('❌ CRITICAL: testId не передан!');
        return;
      }
      
      console.log('🔄 Переходим на страницу теста...');
      
      // Проверяем есть ли незавершенная сессия
      const test = groupTests.find(t => 
        t.id === testId && t.assignment_id === assignmentId
      );
      
      if (test?.has_unfinished_attempt && test.sessions?.length > 0) {
        // Находим незавершенную сессию
        const unfinishedSession = test.sessions.find(s => !s.is_completed);
        if (unfinishedSession) {
          console.log('🔄 Продолжаем незавершенную сессию:', unfinishedSession.id);
          navigate(`/test/${testId}/intro?assignment=${assignmentId}&session=${unfinishedSession.id}`, {
            state: {
              testId: Number(testId),
              assignmentId: Number(assignmentId),
              sessionId: unfinishedSession.id,
              groupId: Number(groupId)
            },
            replace: true
          });
          return;
        }
      }
      
      // Создаем новую сессию
      navigate(`/test/${testId}/intro?assignment=${assignmentId}`, {
        state: {
          testId: Number(testId),
          assignmentId: Number(assignmentId),
          groupId: Number(groupId)
        },
        replace: true
      });
      
    } catch (err) {
      console.error('❌ Ошибка в handleStartTest:', err);
      const errorMsg = err.response?.data?.detail || 'Ошибка начала теста';
      setSnackbar({
        open: true,
        message: errorMsg,
        severity: 'error'
      });
    }
  };

  const handleViewResults = (testId, assignmentId) => {
    setSnackbar({
      open: true,
      message: 'Функция просмотра результатов теста будет доступна в следующем обновлении',
      severity: 'info'
    });
  };

  const handleDeleteAssignment = async (assignmentId, testTitle) => {
    if (window.confirm(`Вы уверены, что хотите удалить назначение теста "${testTitle}"?`)) {
      try {
        await api.delete(`/test-assignments/${assignmentId}`);
        setSnackbar({
          open: true,
          message: 'Назначение теста удалено',
          severity: 'success'
        });
        fetchGroupData();
      } catch (err) {
        setSnackbar({
          open: true,
          message: 'Ошибка при удалении назначения',
          severity: 'error'
        });
      }
    }
  };

  const handleDeleteMember = async (userId, userName) => {
    if (window.confirm(`Вы уверены, что хотите удалить участника "${userName}" из группы?`)) {
      try {
        await api.delete(`/groups/${groupId}/members/${userId}`);
        setSnackbar({
          open: true,
          message: 'Участник удален из группы',
          severity: 'success'
        });
        fetchGroupData();
      } catch (err) {
        setSnackbar({
          open: true,
          message: 'Ошибка при удалении участника',
          severity: 'error'
        });
      }
    }
  };

  const handleEditGroup = () => {
    navigate(`/groups/create`, { state: { editMode: true, groupId } });
  };

  const handleRefresh = () => {
    fetchGroupData();
  };

  const handleAssignTest = () => {
    navigate(`/create-test?groupId=${groupId}`);
  };

  // ========== УТИЛИТЫ ==========

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      return format(date, 'dd.MM.yyyy HH:mm', { locale: ru });
    } catch {
      return '—';
    }
  };

  const getScoreColor = (score) => {
    if (score >= 90) return '#2e7d32';
    if (score >= 70) return '#4caf50';
    if (score >= 50) return '#ff9800';
    return '#f44336';
  };

  const getMedal = (index) => {
    if (index === 0) return <EmojiEvents sx={{ color: '#FFD700', fontSize: '1.2rem' }} />;
    if (index === 1) return <EmojiEvents sx={{ color: '#C0C0C0', fontSize: '1.2rem' }} />;
    if (index === 2) return <EmojiEvents sx={{ color: '#CD7F32', fontSize: '1.2rem' }} />;
    return null;
  };

  // ========== РАСЧЕТ СТАТИСТИКИ ==========

  const calculateMemberStats = useMemo(() => {
    if (!groupStats || !groupStats.members) return [];
    
    return groupStats.members.map((member, index) => {
      return {
        id: member.user_id,
        name: `${member.first_name || ''} ${member.last_name || ''}`.trim() || member.username,
        username: member.username,
        score: member.average_score || 0,
        completed_tests: member.completed_tests || 0,
        total_tests: member.total_tests || 0,
        rank: index + 1,
        passed_tests: member.passed_tests || 0,
        failed_tests: member.failed_tests || 0,
        avatar_url: member.avatar_url,
        role: member.role,
        details: member
      };
    });
  }, [groupStats]);

  // Данные для графика успеваемости
  const analyticsData = useMemo(() => {
    if (!groupStats || !groupStats.test_statistics || !calculateMemberStats.length) return [];
    
    return groupStats.test_statistics.map((test, index) => {
      const testNumber = index + 1;
      
      let value = 0;
      if (statMode === 'average') {
        value = test.average_score || 0;
      } else if (statMode === 'median') {
        value = test.median_score || 0;
      } else if (statMode === 'max') {
        value = test.max_score || 0;
      } else if (statMode === 'min') {
        value = test.min_score || 0;
      }
      
      return { 
        name: `Т${testNumber}`,
        fullName: test.test_title,
        value,
        participants: test.participated_count || 0,
        completed: test.completed_count || 0,
        average: test.average_score || 0,
        passed: test.passed_count || 0,
        testData: test
      };
    });
  }, [groupStats, calculateMemberStats, statMode]);

  // ========== ФИЛЬТРАЦИЯ ==========

  const filteredTests = groupTests.filter(test => 
    test.title?.toLowerCase().includes(testSearch.toLowerCase()) ||
    (test.description && test.description.toLowerCase().includes(testSearch.toLowerCase()))
  );

  const filteredMembers = members.filter(member => 
    member.username?.toLowerCase().includes(memberSearch.toLowerCase()) ||
    member.first_name?.toLowerCase().includes(memberSearch.toLowerCase()) ||
    member.last_name?.toLowerCase().includes(memberSearch.toLowerCase())
  );

  // ========== МОДАЛЬНЫЕ ОКНА ==========

  const TestDetailsModal = ({ test, open, onClose }) => {
    if (!test) return null;
    
    return (
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Assignment />
            <Typography variant="h6">{test.title}</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body1" paragraph>
              {test.description || 'Описание отсутствует'}
            </Typography>
            
            <Divider sx={{ my: 2 }} />
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Параметры теста:
                </Typography>
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2">
                    • Лимит времени: {test.time_limit || 'Не ограничен'} мин
                  </Typography>
                  <Typography variant="body2">
                    • Максимум попыток: {test.max_attempts === 0 ? '∞' : test.max_attempts}
                  </Typography>
                  <Typography variant="body2">
                    • Проходной балл: {test.passing_score || 'Не задан'}
                  </Typography>
                  <Typography variant="body2">
                    • Использовано попыток: {test.attempts_used || 0}
                  </Typography>
                  {test.has_unfinished_attempt && (
                    <Typography variant="body2" color="warning.main">
                      • Есть незавершенная попытка
                    </Typography>
                  )}
                </Box>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Назначение:
                </Typography>
                <Box sx={{ mt: 1 }}>
                  {test.start_date && (
                    <Typography variant="body2">
                      • Начало: {formatDate(test.start_date)}
                    </Typography>
                  )}
                  {test.end_date && (
                    <Typography variant="body2">
                      • Срок: {formatDate(test.end_date)}
                    </Typography>
                  )}
                </Box>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Закрыть</Button>
        </DialogActions>
      </Dialog>
    );
  };

  // ========== ЭФФЕКТЫ ==========

  useEffect(() => {
    if (groupId) {
      fetchGroupData();
    }
  }, [groupId]);

  // ========== РЕНДЕРИНГ ==========

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button onClick={fetchGroupData} startIcon={<Refresh />}>
          Попробовать снова
        </Button>
      </Container>
    );
  }

  if (!groupData) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="warning">
          Группа не найдена
        </Alert>
        <Button onClick={() => navigate('/groups')} startIcon={<ArrowBack />}>
          Вернуться к списку групп
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Заголовок и кнопки */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Button 
          startIcon={<ArrowBack />} 
          onClick={() => navigate('/groups')} 
          sx={{ textTransform: 'none', color: 'text.secondary' }}
        >
          Назад
        </Button>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          {isCreator && (
            <Button 
              startIcon={<Edit />}
              variant="outlined"
              onClick={handleEditGroup}
              sx={{ textTransform: 'none' }}
            >
              Редактировать группу
            </Button>
          )}
          <IconButton onClick={handleRefresh} title="Обновить">
            <Refresh />
          </IconButton>
        </Box>
      </Box>
      
      {/* Информация о группе */}
      <Typography variant="h4" fontWeight="bold" sx={{ mb: 2 }}>
        {groupData.name}
      </Typography>
      
      {groupData.description && (
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          {groupData.description}
        </Typography>
      )}
      
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Chip label={`Предмет: ${groupData.subject || 'Не указан'}`} />
        <Chip label={`Учебный год: ${groupData.academic_year || 'Не указан'}`} />
        <Chip label={`Участников: ${members.length}${groupData.max_students ? `/${groupData.max_students}` : ''}`} />
        <Chip label={`Код приглашения: ${groupData.invite_code}`} />
        {isCreator && <Chip label="Создатель" color="primary" />}
      </Box>

      {/* Вкладки */}
      <Tabs 
        value={activeTab} 
        onChange={(e, v) => setActiveTab(v)} 
        sx={{ mb: 4, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab icon={<People />} label="Участники" iconPosition="start" />
        <Tab icon={<Assignment />} label="Тесты" iconPosition="start" />
        <Tab icon={<TrendingUp />} label="Статистика" iconPosition="start" />
      </Tabs>

      {/* ВКЛАДКА 1: УЧАСТНИКИ */}
      {activeTab === 0 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <TextField 
              placeholder="Поиск участников..." 
              size="small" 
              sx={{ width: 300 }}
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              InputProps={{ 
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ) 
              }}
            />
            <Typography variant="body2" color="text.secondary">
              Всего: {members.length} участников
            </Typography>
          </Box>
          
          {filteredMembers.length === 0 ? (
            <Alert severity="info">
              Участники не найдены
            </Alert>
          ) : (
            <Grid container spacing={2}>
              {filteredMembers.map((member) => {
                const memberStat = calculateMemberStats.find(ms => ms.id === member.id);
                const score = memberStat?.score || 0;
                const isCurrentUser = member.id === user?.id;
                
                return (
                  <Grid item xs={12} md={6} key={member.id}>
                    <Card 
                      elevation={1}
                      sx={{ 
                        p: 2,
                        ...(isCurrentUser && {
                          border: '2px solid',
                          borderColor: 'primary.main'
                        })
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ position: 'relative' }}>
                          <Avatar 
                            src={member.avatar_url}
                            sx={{ 
                              width: 56, 
                              height: 56,
                              bgcolor: member.role === 'teacher' ? 'primary.main' : 'grey.500'
                            }}
                          >
                            {member.first_name ? member.first_name[0] : member.username[0]}
                          </Avatar>
                          {memberStat && getMedal(memberStat.rank - 1)}
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="h6" fontWeight="bold">
                              {member.first_name && member.last_name 
                                ? `${member.first_name} ${member.last_name}`
                                : member.username}
                            </Typography>
                            {isCurrentUser && (
                              <Chip label="Вы" size="small" color="primary" />
                            )}
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            {member.role === 'teacher' ? 'Преподаватель' : 'Ученик'}
                            {member.joined_at && ` • Вступил: ${formatDate(member.joined_at)}`}
                          </Typography>
                          {memberStat && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                              <LinearProgress 
                                variant="determinate" 
                                value={score}
                                sx={{ 
                                  flex: 1,
                                  height: 8,
                                  borderRadius: 4,
                                  bgcolor: 'grey.200',
                                  '& .MuiLinearProgress-bar': {
                                    bgcolor: getScoreColor(score)
                                  }
                                }}
                              />
                              <Typography 
                                variant="body2" 
                                fontWeight="bold" 
                                sx={{ minWidth: 60, color: getScoreColor(score) }}
                              >
                                {score}%
                              </Typography>
                            </Box>
                          )}
                        </Box>
                        {(isCreator || isAdmin) && member.id !== user?.id && member.role !== 'owner' && (
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => handleDeleteMember(member.id, member.username)}
                            title="Удалить из группы"
                          >
                            <Delete />
                          </IconButton>
                        )}
                      </Box>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Box>
      )}

      {/* ВКЛАДКА 2: ТЕСТЫ */}
      {activeTab === 1 && (
        <Box>
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <TextField 
              placeholder="Найти тест..." 
              size="small" 
              value={testSearch}
              onChange={(e) => setTestSearch(e.target.value)}
              sx={{ flexGrow: 1 }} 
              InputProps={{ 
                startAdornment: (
                  <InputAdornment position="start">
                    <Search/>
                  </InputAdornment>
                ) 
              }} 
            />
            {(isCreator || isAdmin) && (
              <Button 
                variant="contained" 
                startIcon={<Add />}
                onClick={handleAssignTest}
                sx={{ borderRadius: 1 }}
              >
                Назначить тест
              </Button>
            )}
          </Box>
          
          {filteredTests.length === 0 ? (
            <Alert severity="info">
              Тесты не найдены
            </Alert>
          ) : (
            <Grid container spacing={2}>

{filteredTests.map((test) => {
  // Используем max_attempts из таблицы tests
  const maxAttempts = test.max_attempts || 1;
  const attemptsUsed = test.attempts_used || 0;
  const hasUnfinishedAttempt = test.has_unfinished_attempt;
  
  // Рассчитываем оставшиеся попытки
  let attemptsLeft = 0;
  if (maxAttempts === 0) {
    attemptsLeft = Infinity; // Неограниченно
  } else {
    attemptsLeft = Math.max(0, maxAttempts - attemptsUsed);
  }
  
  const hasAttemptsLeft = maxAttempts === 0 || attemptsLeft > 0;
  
  // Проверяем даты
  const currentDate = new Date();
  const startDate = test.start_date ? new Date(test.start_date) : null;
  const endDate = test.end_date ? new Date(test.end_date) : null;
  const isStarted = !startDate || currentDate >= startDate;
  const isNotEnded = !endDate || currentDate <= endDate;
  const isTestActive = isStarted && isNotEnded;
  
  // Может ли пользователь пройти тест?
  // ИСПРАВЛЕНО: Убираем проверку !test.is_completed, так как можно пересдавать
  const canTakeTest = hasAttemptsLeft && isTestActive;
  
  // Данные из последней сессии
  const latestSession = test.latest_session;
  const isCompleted = test.is_completed;
  const percentage = latestSession?.percentage || 0;
  const score = latestSession?.score || 0;
  const maxScore = latestSession?.max_score || 0;
  const isPassed = test.is_passed;
  
  // Отладочная информация
  console.log(`🎯 Тест "${test.title}":`, {
    max_attempts: maxAttempts,
    attempts_used: attemptsUsed,
    attempts_left: attemptsLeft,
    has_attempts_left: hasAttemptsLeft,
    is_test_active: isTestActive,
    can_take_test: canTakeTest,
    is_completed: isCompleted,
    has_unfinished: hasUnfinishedAttempt
  });
  
  // Текст для отображения попыток
  let attemptsText = '';
  let attemptsColor = 'text.secondary';
  
  if (maxAttempts === 0) {
    attemptsText = `Попытки: ${attemptsUsed}/∞`;
    attemptsColor = 'text.secondary';
  } else if (hasUnfinishedAttempt) {
    attemptsText = `Попытки: ${attemptsUsed}/${maxAttempts} (есть незавершенная)`;
    attemptsColor = 'warning.main';
  } else if (attemptsUsed >= maxAttempts) {
    attemptsText = `Попытки: ${attemptsUsed}/${maxAttempts} (лимит исчерпан)`;
    attemptsColor = 'error.main';
  } else {
    attemptsText = `Попытки: ${attemptsUsed}/${maxAttempts}`;
    attemptsColor = attemptsUsed > 0 ? 'success.main' : 'text.secondary';
  }
  
  return (
    <Grid item xs={12} key={`${test.id}-${test.assignment_id}`}>
      <Card elevation={2} sx={{ p: 2 }}>
        <Grid container spacing={2}>
          {/* Левая часть: Информация о тесте */}
          <Grid item xs={12} md={8}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
              {isCompleted ? (
                <CheckCircleOutline sx={{ 
                  fontSize: 32,
                  color: isPassed ? '#2e7d32' : '#d32f2f',
                  mt: 0.5
                }} />
              ) : (
                <Assignment sx={{ 
                  fontSize: 32,
                  color: isTestActive ? 'primary.main' : 'disabled',
                  mt: 0.5
                }} />
              )}
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 0.5 }}>
                  <Typography variant="h6" fontWeight="bold">
                    {test.title}
                  </Typography>
                  {isCompleted && (
                    <Chip 
                      label={isPassed ? "Пройден" : "Не пройден"} 
                      size="small" 
                      sx={{ 
                        backgroundColor: isPassed ? '#2e7d32' : '#d32f2f',
                        color: 'white',
                        fontWeight: 500
                      }}
                    />
                  )}
                  {!isTestActive && (
                    <Chip 
                      label={!isStarted ? "Еще не начался" : "Завершен"} 
                      size="small" 
                      variant="outlined"
                    />
                  )}
                  {!hasAttemptsLeft && maxAttempts !== 0 && (
                    <Chip 
                      label="Попытки исчерпаны" 
                      size="small" 
                      color="error"
                      variant="outlined"
                    />
                  )}
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {test.description || 'Описание отсутствует'}
                </Typography>
                
                {/* Отображение попыток */}
                <Box sx={{ mb: 2 }}>
                  <Typography 
                    variant="body2" 
                    color={attemptsColor} 
                    fontWeight="bold"
                    gutterBottom
                  >
                    {attemptsText}
                    {hasAttemptsLeft && maxAttempts !== 0 && attemptsLeft > 0 && (
                      <Typography component="span" variant="body2" sx={{ color: '#2e7d32', ml: 1 }}>
                        (осталось: {attemptsLeft})
                      </Typography>
                    )}
                  </Typography>
                  
                  {maxAttempts !== 0 && (
                    <LinearProgress 
                      variant="determinate" 
                      value={(attemptsUsed / maxAttempts) * 100} 
                      sx={{ 
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: 'action.disabledBackground',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: attemptsUsed >= maxAttempts ? '#d32f2f' : 
                                         hasUnfinishedAttempt ? '#ed6c02' : '#2e7d32'
                        }
                      }}
                    />
                  )}
                </Box>
              </Box>
            </Box>
          </Grid>
          
          {/* Правая часть: Баллы и кнопки */}
          <Grid item xs={12} md={4}>
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'flex-end',
              height: '100%',
              justifyContent: 'space-between'
            }}>
              {isCompleted ? (
                <Box sx={{ textAlign: 'right', mb: 2 }}>
                  <Typography variant="h3" fontWeight="bold" sx={{ 
                    color: getScoreColor(percentage),
                    lineHeight: 1,
                    mb: 0.5
                  }}>
                    {score}/{maxScore}
                  </Typography>
                  <Typography variant="h5" sx={{ 
                    color: getScoreColor(percentage),
                    opacity: 0.8,
                    fontWeight: 600
                  }}>
                    ({percentage}%)
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ textAlign: 'right', mb: 2 }}>
                  <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                    Проходной: {test.passing_score || 'Не задан'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Лимит: {test.time_limit || 'Не ограничен'} мин.
                  </Typography>
                </Box>
              )}
              
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Info />}
                  onClick={() => {
                    setSelectedTest(test);
                    setTestModalOpen(true);
                  }}
                  sx={{
                    borderRadius: 1,
                    textTransform: 'none',
                    fontWeight: 600
                  }}
                >
                  Подробнее
                </Button>
                
                {canTakeTest && (
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={hasUnfinishedAttempt ? <Replay /> : <PlayCircleOutline />}
                    onClick={() => handleStartTest(test.id, test.assignment_id)}
                    sx={{
                      borderRadius: 1,
                      textTransform: 'none',
                      fontWeight: 600,
                      backgroundColor: hasUnfinishedAttempt ? '#ed6c02' : '#1976d2',
                      '&:hover': {
                        backgroundColor: hasUnfinishedAttempt ? '#e65100' : '#1565c0'
                      }
                    }}
                  >
                    {hasUnfinishedAttempt ? 'Продолжить' : 'Пройти'}
                  </Button>
                )}
                
                {!canTakeTest && isTestActive && !hasAttemptsLeft && maxAttempts !== 0 && (
                  <Button
                    variant="outlined"
                    size="small"
                    disabled
                    sx={{
                      borderRadius: 1,
                      textTransform: 'none',
                      fontWeight: 600,
                      borderColor: '#d32f2f',
                      color: '#d32f2f'
                    }}
                  >
                    Лимит попыток
                  </Button>
                )}
                
                {!isTestActive && (
                  <Button
                    variant="outlined"
                    size="small"
                    disabled
                    sx={{
                      borderRadius: 1,
                      textTransform: 'none',
                      fontWeight: 600
                    }}
                  >
                    {!isStarted ? 'Еще не начался' : 'Завершен'}
                  </Button>
                )}
                
                {isCompleted && (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Visibility />}
                    onClick={() => handleViewResults(test.id, test.assignment_id)}
                    sx={{
                      borderRadius: 1,
                      textTransform: 'none',
                      fontWeight: 600
                    }}
                  >
                    Результаты
                  </Button>
                )}
                
                {(isCreator || isAdmin) && (
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDeleteAssignment(test.assignment_id, test.title)}
                    title="Удалить назначение"
                  >
                    <Delete />
                  </IconButton>
                )}
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Card>
    </Grid>
  );
})}
            </Grid>
          )}
        </Box>
      )}

      {/* ВКЛАДКА 3: СТАТИСТИКА */}
      {activeTab === 2 && (
        <>
          {!groupStats ? (
            <Alert severity="warning">
              Статистика загружается...
            </Alert>
          ) : !groupStats.members || groupStats.members.length === 0 ? (
            <Alert severity="info">
              Нет данных для отображения статистики
            </Alert>
          ) : (
            <Grid container spacing={4}>
              <Grid item xs={12} md={7}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, alignItems: 'center' }}>
                  <Typography variant="h6" fontWeight="bold">РЕЗУЛЬТАТЫ</Typography>
                  <Box>
                    <IconButton 
                      onClick={() => setTestOffset(Math.max(0, testOffset - testsPerPage))}
                      disabled={testOffset === 0}
                    >
                      <KeyboardArrowLeft />
                    </IconButton>
                    <IconButton 
                      onClick={() => setTestOffset(testOffset + testsPerPage)} 
                      disabled={testOffset + testsPerPage >= analyticsData.length}
                    >
                      <KeyboardArrowRight />
                    </IconButton>
                  </Box>
                </Box>
                <TableContainer 
                  component={Paper} 
                  elevation={0} 
                  sx={{ 
                    borderRadius: 0, 
                    bgcolor: 'background.paper'
                  }}
                >
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ 
                          fontWeight: '900', 
                          borderBottom: `2px solid`,
                          borderColor: 'divider'
                        }}>
                          УЧЕНИК
                        </TableCell>
                        {analyticsData.slice(testOffset, testOffset + testsPerPage).map((test, i) => (
                          <TableCell 
                            key={i} 
                            align="center" 
                            sx={{ 
                              fontWeight: '900', 
                              borderBottom: `2px solid`,
                              borderColor: 'divider'
                            }}
                            title={test.fullName}
                          >
                            Т{testOffset + i + 1}
                          </TableCell>
                        ))}
                        <TableCell 
                          align="center" 
                          sx={{ 
                            fontWeight: '900', 
                            borderBottom: `2px solid`,
                            borderColor: 'divider',
                            bgcolor: 'action.hover' 
                          }}
                        >
                          ИТОГ
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {calculateMemberStats.map((member) => {
                        const isCurrentUser = member.id === user?.id;
                        
                        return (
                          <TableRow 
                            key={member.id}
                            sx={{ 
                              bgcolor: isCurrentUser ? 'action.selected' : 'inherit',
                              '&:hover': {
                                bgcolor: 'action.hover'
                              }
                            }}
                          >
                            <TableCell sx={{ fontWeight: '500' }}>
                              <Typography>
                                {member.name}
                                {isCurrentUser && (
                                  <Typography component="span" variant="caption" sx={{ ml: 1, color: 'primary.main' }}>
                                    (Вы)
                                  </Typography>
                                )}
                              </Typography>
                            </TableCell>
                            {analyticsData.slice(testOffset, testOffset + testsPerPage).map((test, i) => {
                              const memberTest = member.details?.test_scores?.find(
                                ts => ts.assignment_id === test.testData.assignment_id
                              );
                              const score = memberTest?.best_percentage || 0;
                              
                              return (
                                <TableCell key={i} align="center">
                                  <Typography variant="body2">
                                    {score > 0 ? `${score}%` : '—'}
                                  </Typography>
                                </TableCell>
                              );
                            })}
                            <TableCell 
                              align="center" 
                              sx={{ 
                                fontWeight: '900', 
                                color: getScoreColor(member.score),
                                bgcolor: 'action.hover' 
                              }}
                            >
                              {member.score}%
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>

              <Grid item xs={12} md={5}>
                <ToggleButtonGroup 
                  value={statMode} 
                  exclusive 
                  onChange={(e, v) => v && setStatMode(v)} 
                  size="small" 
                  fullWidth 
                  sx={{ borderRadius: 0, mb: 2 }}
                >
                  <ToggleButton value="average">СРЕД</ToggleButton>
                  <ToggleButton value="median">МЕД</ToggleButton>
                  <ToggleButton value="max">МАКС</ToggleButton>
                  <ToggleButton value="min">МИН</ToggleButton>
                </ToggleButtonGroup>
                <Box sx={{ height: 350, width: '100%', mt: 2 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analyticsData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                      <CartesianGrid 
                        strokeDasharray="3 3" 
                        vertical={false} 
                        stroke="#e0e0e0" 
                      />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fill: '#666', fontSize: 11 }} 
                        axisLine={{ stroke: '#e0e0e0' }}
                      >
                        <Label 
                          value="Тесты" 
                          offset={-10} 
                          position="insideBottom" 
                          fill="#666" 
                        />
                      </XAxis>
                      <YAxis 
                        domain={[0, 100]}
                        tick={{ fill: '#666', fontSize: 11 }} 
                        axisLine={{ stroke: '#e0e0e0' }}
                      >
                        <Label 
                          value="Баллы" 
                          angle={-90} 
                          position="insideLeft" 
                          style={{ textAnchor: 'middle', fill: '#666' }} 
                        />
                      </YAxis>
                      <RechartsTooltip 
                        formatter={(value) => [`${value}%`, 'Балл']}
                        labelFormatter={(label) => label}
                        contentStyle={{ 
                          backgroundColor: '#fff', 
                          border: '1px solid #e0e0e0', 
                          borderRadius: 0 
                        }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#1976d2" 
                        strokeWidth={3} 
                        dot={{ 
                          r: 5, 
                          fill: '#1976d2', 
                          strokeWidth: 2, 
                          stroke: '#fff' 
                        }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </Grid>
            </Grid>
          )}
        </>
      )}

      {/* Модальные окна */}
      <TestDetailsModal 
        test={selectedTest}
        open={testModalOpen}
        onClose={() => {
          setTestModalOpen(false);
          setSelectedTest(null);
        }}
      />

      {/* Снекбар */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default GroupDetail;