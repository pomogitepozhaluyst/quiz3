import React, { useState, useEffect, useMemo } from 'react';
import { 
  Container, Typography, Box, Tabs, Tab, Avatar, 
  Button, Grid, Card, List, ListItem, ListItemAvatar, 
  ListItemText, IconButton,
  TextField, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper,
  ToggleButtonGroup, ToggleButton,
  InputAdornment, Chip, LinearProgress,
  CircularProgress, Alert, Snackbar
} from '@mui/material';
import { 
  ArrowBack, Assignment, People, EmojiEvents, TrendingUp, Search,
  Edit, Delete, Add, KeyboardArrowLeft, KeyboardArrowRight, CheckCircleOutline,
  PlayCircleOutline, Replay, Refresh
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Label } from 'recharts';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const GroupDetail = () => {
  const navigate = useNavigate();
  const { groupId } = useParams();
  const { isDarkMode, theme } = useTheme();
  const { token } = useAuth();
  
  const [activeTab, setActiveTab] = useState(1);
  const [memberSearch, setMemberSearch] = useState('');
  const [testSearch, setTestSearch] = useState('');
  const [statMode, setStatMode] = useState('average');
  const [testOffset, setTestOffset] = useState(0);
  const testsPerPage = 5;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [groupData, setGroupData] = useState(null);
  const [members, setMembers] = useState([]);
  const [groupTests, setGroupTests] = useState([]);
  const [groupStats, setGroupStats] = useState(null);

  const isAdmin = false; // Это можно получить из контекста пользователя

  // Используем цвета из темы
  const COLORS = {
    success: theme.palette.success.main,
    error: theme.palette.error.main,
    warning: theme.palette.warning.main,
    info: theme.palette.info.main,
    primary: theme.palette.primary.main,
    secondary: theme.palette.secondary.main,
  };

  // Функции для API запросов
  const fetchGroupData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 1. Получаем информацию о группе
      const groupResponse = await fetch(`http://localhost:8000/groups/${groupId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!groupResponse.ok) {
        throw new Error('Ошибка загрузки данных группы');
      }
      
      const group = await groupResponse.json();
      setGroupData(group);
      
      // 2. Получаем участников группы
      const membersResponse = await fetch(`http://localhost:8000/groups/${groupId}/members`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (membersResponse.ok) {
        const membersData = await membersResponse.json();
        setMembers(membersData);
      }
      
      // 3. Получаем тесты группы
      const testsResponse = await fetch(`http://localhost:8000/groups/${groupId}/tests`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (testsResponse.ok) {
        const testsData = await testsResponse.json();
        setGroupTests(testsData);
      }
      
      // 4. Получаем статистику группы (если админ/создатель)
      try {
        const statsResponse = await fetch(`http://localhost:8000/groups/${groupId}/stats`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setGroupStats(statsData);
        }
      } catch (statsError) {
        // Если нет прав на статистику - игнорируем
        console.log('Нет прав на просмотр статистики');
      }
      
    } catch (err) {
      setError(err.message);
      setSnackbar({
        open: true,
        message: `Ошибка загрузки: ${err.message}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartTest = async (testId, assignmentId) => {
    try {
      // Создаем сессию тестирования
      const response = await fetch('http://localhost:8000/test-sessions/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          test_id: testId,
          assignment_id: assignmentId
        }),
      });
      
      if (!response.ok) {
        throw new Error('Ошибка начала теста');
      }
      
      const session = await response.json();
      
      // Переходим на страницу тестирования
      navigate(`/test/${testId}/session/${session.id}`);
      
    } catch (err) {
      setSnackbar({
        open: true,
        message: `Ошибка: ${err.message}`,
        severity: 'error'
      });
    }
  };

  const handleViewResults = (testId, assignmentId) => {
    navigate(`/test/${testId}/results/${assignmentId}`);
  };

  // Форматирование даты
  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      return format(new Date(dateString), 'dd.MM.yyyy', { locale: ru });
    } catch {
      return '—';
    }
  };

  // Расчет статистики для участников
  const calculateMemberStats = useMemo(() => {
    if (!groupStats) return [];
    
    return groupStats.members.map(member => {
      const testScores = member.test_scores || [];
      const scores = testScores.map(score => score.percentage || 0);
      
      // Заполняем недостающие значения нулями для графика
      const fullScores = [...scores];
      const totalTests = groupStats.total_assignments;
      while (fullScores.length < totalTests) {
        fullScores.push(0);
      }
      
      return {
        id: member.user_id,
        name: `${member.first_name || ''} ${member.last_name || ''}`.trim() || member.username,
        score: member.average_score || 0,
        tests: fullScores
      };
    });
  }, [groupStats]);

  // Данные для графика
  const analyticsData = useMemo(() => {
    if (!groupStats || !calculateMemberStats.length) return [];
    
    const totalTests = groupStats.total_assignments;
    return Array.from({ length: totalTests }, (_, index) => {
      const testNumber = index + 1;
      const scores = calculateMemberStats.map(m => m.tests[index] || 0);
      
      let value = 0;
      if (statMode === 'average') {
        value = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      } else if (statMode === 'max') {
        value = Math.max(...scores);
      } else if (statMode === 'min') {
        value = Math.min(...scores);
      } else if (statMode === 'median') {
        const sorted = [...scores].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        value = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
      }
      
      return { 
        name: `Тест ${testNumber}`, 
        value 
      };
    });
  }, [groupStats, calculateMemberStats, statMode]);

  // Загрузка данных при монтировании и смене группы
  useEffect(() => {
    if (groupId && token) {
      fetchGroupData();
    }
  }, [groupId, token]);

  // Обновление по кнопке обновить
  const handleRefresh = () => {
    fetchGroupData();
  };

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

  const filteredTests = groupTests.filter(test => 
    test.title.toLowerCase().includes(testSearch.toLowerCase()) ||
    (test.description && test.description.toLowerCase().includes(testSearch.toLowerCase()))
  );

  const filteredMembers = members.filter(member => 
    member.username.toLowerCase().includes(memberSearch.toLowerCase()) ||
    member.first_name?.toLowerCase().includes(memberSearch.toLowerCase()) ||
    member.last_name?.toLowerCase().includes(memberSearch.toLowerCase())
  );

  const getScoreColor = (score) => {
    if (score >= 85) return COLORS.success;
    if (score >= 60) return COLORS.warning;
    return COLORS.error;
  };

  const getScorePercentage = (score, maxScore = 100) => {
    return Math.round((score / maxScore) * 100);
  };

  const getMedal = (index) => {
    if (index === 0) return <EmojiEvents sx={{ color: '#FFD700', fontSize: '1.2rem' }} />;
    if (index === 1) return <EmojiEvents sx={{ color: '#C0C0C0', fontSize: '1.2rem' }} />;
    if (index === 2) return <EmojiEvents sx={{ color: '#CD7F32', fontSize: '1.2rem' }} />;
    return null;
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Button 
          startIcon={<ArrowBack />} 
          onClick={() => navigate('/groups')} 
          sx={{ 
            textTransform: 'none', 
            color: 'text.secondary'
          }}
        >
          Назад
        </Button>
        <IconButton onClick={handleRefresh}>
          <Refresh />
        </IconButton>
      </Box>
      
      <Typography variant="h4" fontWeight="900" sx={{ mb: 2 }}>
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
      </Box>

      <Tabs 
        value={activeTab} 
        onChange={(e, v) => setActiveTab(v)} 
        sx={{ mb: 4 }}
      >
        <Tab icon={<People />} label="Участники" iconPosition="start" />
        <Tab icon={<Assignment />} label="Тесты" iconPosition="start" />
        <Tab icon={<TrendingUp />} label="Успеваемость" iconPosition="start" />
      </Tabs>

      {/* УЧАСТНИКИ */}
      {activeTab === 0 && (
        <Box sx={{ maxWidth: 800 }}>
          <TextField 
            placeholder="Поиск участников..." 
            size="small" 
            fullWidth 
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
            sx={{ mb: 3 }}
            InputProps={{ 
              startAdornment: (
                <InputAdornment position="start">
                  <Search/>
                </InputAdornment>
              ) 
            }}
          />
          
          {filteredMembers.length === 0 ? (
            <Alert severity="info">
              Участники не найдены
            </Alert>
          ) : (
            <List disablePadding>
              {filteredMembers.map((member, i) => {
                // Для сортировки по успеваемости (если есть статистика)
                const memberStat = calculateMemberStats.find(ms => ms.id === member.id);
                const score = memberStat?.score || 0;
                
                return (
                  <ListItem 
                    key={member.id} 
                    divider 
                    sx={{ 
                      px: 0, 
                      py: 2, 
                      borderColor: 'divider'
                    }}
                  >
                    <ListItemAvatar>
                      <Box sx={{ position: 'relative' }}>
                        <Avatar sx={{ 
                          bgcolor: member.isMe ? 'primary.main' : 'action.selected'
                        }}>
                          {member.first_name ? member.first_name[0] : member.username[0]}
                        </Avatar>
                        {getMedal(i)}
                      </Box>
                    </ListItemAvatar>
                    <ListItemText 
                      primary={
                        <Typography fontWeight="600">
                          {member.first_name && member.last_name 
                            ? `${member.first_name} ${member.last_name}`
                            : member.username}
                        </Typography>
                      } 
                      secondary={
                        <Typography variant="caption">
                          {member.role === 'teacher' ? 'Преподаватель' : 'Ученик'}
                          {member.joined_at && ` • Вступил: ${formatDate(member.joined_at)}`}
                        </Typography>
                      } 
                    />
                    {memberStat && (
                      <Typography 
                        variant="h6" 
                        fontWeight="900" 
                        sx={{ color: getScoreColor(score) }}
                      >
                        {score}%
                      </Typography>
                    )}
                  </ListItem>
                );
              })}
            </List>
          )}
        </Box>
      )}

      {/* ТЕСТЫ */}
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
            {isAdmin && (
              <Button 
                variant="contained" 
                startIcon={<Add />} 
                sx={{ borderRadius: 0 }}
              >
                Новый тест
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
                const attemptsLeft = test.max_attempts - test.attempts_used;
                const hasAttemptsLeft = attemptsLeft > 0;
                const isTestActive = !test.end_date || new Date(test.end_date) > new Date();
                const canTakeTest = hasAttemptsLeft && isTestActive;
                
                const latestSession = test.latest_session;
                const percentage = latestSession?.percentage || 0;
                const isPassed = latestSession?.is_completed && 
                  latestSession.score >= (test.passing_score || 0);

                return (
                  <Grid item xs={12} key={test.id}>
                    <Card 
                      elevation={0} 
                      sx={{ 
                        p: 2, 
                        border: '1px solid', 
                        borderColor: 'divider', 
                        borderRadius: 0, 
                        bgcolor: 'background.paper'
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 3 }}>
                        {/* Левая часть: Информация о тесте */}
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                            {latestSession?.is_completed ? (
                              <CheckCircleOutline sx={{ 
                                color: isPassed ? COLORS.success : COLORS.error 
                              }} />
                            ) : (
                              <Assignment color={isTestActive ? "primary" : "disabled"} />
                            )}
                            <Box sx={{ flex: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 0.5 }}>
                                <Typography 
                                  variant="h6" 
                                  fontWeight="bold"
                                >
                                  {test.title}
                                </Typography>
                                {latestSession?.is_completed && (
                                  <Chip 
                                    label={isPassed ? "Пройден" : "Не пройден"} 
                                    size="small" 
                                    sx={{ 
                                      backgroundColor: isPassed ? COLORS.success : COLORS.error,
                                      color: 'white',
                                      fontWeight: 500
                                    }}
                                  />
                                )}
                                {!isTestActive && (
                                  <Chip 
                                    label="Завершен" 
                                    size="small" 
                                    variant="outlined"
                                  />
                                )}
                              </Box>
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  color: 'text.secondary',
                                  mb: 1
                                }}
                              >
                                {test.description}
                              </Typography>
                            </Box>
                          </Box>

                          {/* Информация о попытках */}
                          <Box sx={{ mt: 2 }}>
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                color: 'text.secondary',
                                display: 'block',
                                mb: 0.5
                              }}
                            >
                              Попытки: {test.attempts_used}/{test.max_attempts}
                              {hasAttemptsLeft ? (
                                <Typography 
                                  component="span" 
                                  variant="caption" 
                                  sx={{ 
                                    color: COLORS.success,
                                    fontWeight: 500,
                                    ml: 1
                                  }}
                                >
                                  (осталось: {attemptsLeft})
                                </Typography>
                              ) : (
                                <Typography 
                                  component="span" 
                                  variant="caption" 
                                  sx={{ 
                                    color: COLORS.error,
                                    fontWeight: 500,
                                    ml: 1
                                  }}
                                >
                                  (лимит исчерпан)
                                </Typography>
                              )}
                            </Typography>
                            
                            <LinearProgress 
                              variant="determinate" 
                              value={(test.attempts_used / test.max_attempts) * 100} 
                              sx={{ 
                                height: 4,
                                borderRadius: 2,
                                backgroundColor: 'action.disabledBackground',
                                '& .MuiLinearProgress-bar': {
                                  backgroundColor: test.attempts_used === test.max_attempts 
                                    ? COLORS.error 
                                    : COLORS.warning
                                }
                              }}
                            />
                          </Box>

                          {/* Сроки и информация */}
                          <Box sx={{ mt: 1 }}>
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                color: 'text.secondary',
                                display: 'block',
                              }}
                            >
                              Срок сдачи: {formatDate(test.end_date) || 'Не ограничен'}
                              {latestSession?.finished_at && (
                                <Typography 
                                  component="span" 
                                  variant="caption" 
                                  sx={{ 
                                    color: latestSession.is_completed ? COLORS.success : COLORS.error,
                                    ml: 1
                                  }}
                                >
                                  • {latestSession.is_completed ? 'Сдан' : 'Начат'}: {formatDate(latestSession.finished_at)}
                                </Typography>
                              )}
                            </Typography>
                          </Box>
                        </Box>

                        {/* Правая часть: Баллы и кнопка */}
                        <Box sx={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          alignItems: 'flex-end',
                          minWidth: 180,
                          gap: 1
                        }}>
                          {/* Баллы и процент */}
                          {latestSession?.is_completed ? (
                            <Box sx={{ textAlign: 'right' }}>
                              <Typography 
                                variant="h4" 
                                fontWeight="900"
                                sx={{ 
                                  color: getScoreColor(percentage),
                                  lineHeight: 1
                                }}
                              >
                                {latestSession.score}/{latestSession.max_score}
                              </Typography>
                              <Typography 
                                variant="h6" 
                                sx={{ 
                                  color: getScoreColor(percentage),
                                  opacity: 0.8,
                                  fontWeight: 600
                                }}
                              >
                                ({percentage}%)
                              </Typography>
                            </Box>
                          ) : (
                            <Box sx={{ textAlign: 'right' }}>
                              <Typography 
                                variant="body1" 
                                sx={{ 
                                  color: 'text.secondary',
                                  fontWeight: 600
                                }}
                              >
                                Проходной: {test.passing_score || 'Не задан'}
                              </Typography>
                              <Typography 
                                variant="caption" 
                                sx={{ 
                                  color: 'text.secondary'
                                }}
                              >
                                Лимит: {test.time_limit || 'Не ограничен'} мин.
                              </Typography>
                            </Box>
                          )}

                          {/* Кнопка действия */}
                          <Box sx={{ mt: 1 }}>
                            {isAdmin ? (
                              <Box sx={{ display: 'flex', gap: 0.5 }}>
                                <IconButton size="small">
                                  <Edit fontSize="small" />
                                </IconButton>
                                <IconButton size="small" color="error">
                                  <Delete fontSize="small" />
                                </IconButton>
                              </Box>
                            ) : (
                              <Box>
                                {canTakeTest ? (
                                  <Button
                                    variant="contained"
                                    size="small"
                                    startIcon={latestSession?.is_completed ? <Replay /> : <PlayCircleOutline />}
                                    onClick={() => handleStartTest(test.id, test.assignment_id)}
                                    sx={{
                                      borderRadius: 0,
                                      textTransform: 'none',
                                      fontWeight: 600,
                                      px: 2,
                                      py: 1,
                                      backgroundColor: latestSession?.is_completed ? COLORS.warning : theme.palette.primary.main,
                                      color: 'white',
                                      '&:hover': {
                                        backgroundColor: latestSession?.is_completed ? '#ed6c02' : theme.palette.primary.dark
                                      }
                                    }}
                                  >
                                    {latestSession?.is_completed ? 'Пройти еще раз' : 'Пройти тест'}
                                  </Button>
                                ) : (
                                  <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={() => handleViewResults(test.id, test.assignment_id)}
                                    sx={{
                                      borderRadius: 0,
                                      textTransform: 'none',
                                      fontWeight: 600,
                                      px: 2,
                                      py: 1,
                                      color: 'text.secondary',
                                      borderColor: 'divider',
                                      '&:hover': {
                                        backgroundColor: 'action.hover'
                                      }
                                    }}
                                  >
                                    {latestSession?.is_completed ? 'Результаты' : 'Просмотреть'}
                                  </Button>
                                )}
                              </Box>
                            )}
                          </Box>
                        </Box>
                      </Box>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Box>
      )}

      {/* УСПЕВАЕМОСТЬ */}
      {activeTab === 2 && (
        <>
          {!groupStats ? (
            <Alert severity="warning">
              Статистика доступна только создателю группы и администраторам
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
                    aspectRatio: '1/1', 
                    bgcolor: 'transparent' 
                  }}
                >
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ 
                          fontWeight: '900', 
                          borderBottom: `2px solid ${theme.palette.text.primary}` 
                        }}>
                          УЧЕНИК
                        </TableCell>
                        {analyticsData.slice(testOffset, testOffset + testsPerPage).map((test, i) => (
                          <TableCell 
                            key={i} 
                            align="center" 
                            sx={{ 
                              fontWeight: '900', 
                              borderBottom: `2px solid ${theme.palette.text.primary}` 
                            }}
                          >
                            {test.name.replace('Тест ', 'Т')}
                          </TableCell>
                        ))}
                        <TableCell 
                          align="center" 
                          sx={{ 
                            fontWeight: '900', 
                            borderBottom: `2px solid ${theme.palette.text.primary}`, 
                            bgcolor: 'action.hover' 
                          }}
                        >
                          ИТОГ
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {calculateMemberStats.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell sx={{ fontWeight: '500' }}>
                            {member.name.split(' ')[0]}
                          </TableCell>
                          {member.tests.slice(testOffset, testOffset + testsPerPage).map((score, i) => (
                            <TableCell key={i} align="center">
                              {score > 0 ? score : '—'}
                            </TableCell>
                          ))}
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
                      ))}
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
                        stroke={theme.palette.divider} 
                      />
                      <XAxis 
                        dataKey="name" 
                        tick={{
                          fill: theme.palette.text.secondary, 
                          fontSize: 11
                        }} 
                        axisLine={{
                          stroke: theme.palette.divider
                        }}
                      >
                        <Label 
                          value="Тесты" 
                          offset={-10} 
                          position="insideBottom" 
                          fill={theme.palette.text.secondary} 
                        />
                      </XAxis>
                      <YAxis 
                        tick={{
                          fill: theme.palette.text.secondary, 
                          fontSize: 11
                        }} 
                        axisLine={{
                          stroke: theme.palette.divider
                        }}
                      >
                        <Label 
                          value="Баллы" 
                          angle={-90} 
                          position="insideLeft" 
                          style={{ 
                            textAnchor: 'middle', 
                            fill: theme.palette.text.secondary 
                          }} 
                        />
                      </YAxis>
                      <RechartsTooltip 
                        contentStyle={{ 
                          backgroundColor: theme.palette.background.paper, 
                          border: `1px solid ${theme.palette.divider}`, 
                          borderRadius: 0 
                        }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke={theme.palette.primary.main} 
                        strokeWidth={3} 
                        dot={{ 
                          r: 5, 
                          fill: theme.palette.primary.main, 
                          strokeWidth: 2, 
                          stroke: theme.palette.background.paper 
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