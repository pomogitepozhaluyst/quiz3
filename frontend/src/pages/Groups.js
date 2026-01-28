import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Card, Button, TextField,
  Grid, Dialog, DialogActions, DialogContent, DialogTitle,
  Avatar, Chip, Paper, Alert, Snackbar, CircularProgress,
  FormControlLabel, Switch, Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import { 
  Search, Add, Lock, LockOpen, QrCode, 
  Psychology, AccountCircle, CheckCircle
} from '@mui/icons-material';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Groups = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  
  // Диалоги
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showFindDialog, setShowFindDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(null);
  
  // Формы
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    subject: '',
    academic_year: '',
    max_students: 30,
    is_public: true,
    password: '',
    require_approval: false
  });
  
  const [inviteCode, setInviteCode] = useState('');
  const [password, setPassword] = useState('');
  
  // Уведомления
  const [snackbar, setSnackbar] = useState({ 
    open: false, 
    message: '', 
    severity: 'info' 
  });

  // Загрузка данных
  useEffect(() => {
    loadData();
  }, []);

 const loadData = async () => {
    try {
      setLoading(true);
      
      // Загружаем все группы
      const response = await api.get('/groups/');
      const groupsData = response.data || [];
      
      console.log('📊 Полученные группы:', groupsData);
      
      // Для каждой группы проверяем, является ли пользователь участником
      const groupsWithMembership = await Promise.all(
        groupsData.map(async (group) => {
          try {
            // Получаем участников группы (если доступно)
            let membersCount = 0;
            let isMember = false;
            let isCreator = group.created_by === user?.id;
            
            try {
              const membersResponse = await api.get(`/groups/${group.id}/members`);
              const members = membersResponse.data || [];
              membersCount = members.length;
              isMember = members.some(member => member.id === user?.id);
            } catch (membersError) {
              // Если нет доступа к участникам, используем данные из group если есть
              if (group.members_count !== undefined) {
                membersCount = group.members_count;
              }
              // Для определения isMember можно попробовать другие методы
              if (membersError.response?.status === 403) {
                isMember = false; // 403 значит не участник
              }
            }
            
            return {
              ...group,
              members_count: membersCount, // Используем либо из API, либо из group
              is_member: isMember || isCreator,
              is_creator: isCreator
            };
          } catch (error) {
            console.log(`Ошибка обработки группы ${group.id}:`, error);
            return {
              ...group,
              members_count: group.members_count || 0,
              is_member: group.created_by === user?.id,
              is_creator: group.created_by === user?.id
            };
          }
        })
      );
      
      setGroups(groupsWithMembership);
      setError('');
    } catch (err) {
      console.error('Ошибка загрузки:', err);
      setError('Не удалось загрузить группы');
      showSnackbar('Ошибка загрузки групп', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  // ========== СОЗДАНИЕ ГРУППЫ ==========
  const handleCreateClick = () => {
    setShowCreateDialog(true);
  };

  const handleCreateSubmit = async () => {
    if (!newGroup.name.trim()) {
      showSnackbar('Введите название группы', 'warning');
      return;
    }

    try {
      await api.post('/groups/', newGroup);
      showSnackbar('Группа успешно создана!', 'success');
      setShowCreateDialog(false);
      setNewGroup({
        name: '',
        description: '',
        subject: '',
        academic_year: '',
        max_students: 30,
        is_public: true,
        password: '',
        require_approval: false
      });
      loadData(); // Обновляем список
    } catch (err) {
      showSnackbar(err.response?.data?.detail || 'Ошибка создания группы', 'error');
    }
  };

  // ========== ПОИСК ПО КОДУ ==========
  const handleFindClick = () => {
    setShowFindDialog(true);
  };

  const handleFindSubmit = async () => {
    if (!inviteCode.trim()) {
      showSnackbar('Введите код приглашения', 'warning');
      return;
    }

    try {
      // Находим группу по коду
      const res = await api.get(`/groups/find/${inviteCode.trim().toUpperCase()}`);
      const group = res.data;
      
      // Проверяем тип группы
      if (group.is_public || !group.password) {
        // Открытая группа - вступаем сразу
        await joinGroup(group.id, null);
      } else {
        // Закрытая группа - показываем диалог пароля
        setShowPasswordDialog(group);
        setShowFindDialog(false);
        setInviteCode('');
      }
    } catch (err) {
      showSnackbar(err.response?.data?.detail || 'Группа не найдена', 'error');
    }
  };

  // ========== ВСТУПЛЕНИЕ В ГРУППУ ==========
  const handleJoinClick = async (group) => {
    console.log('🔄 Попытка вступления в группу:', group.name);
    
    // Если уже участник или создатель - переходим в группу
    if (group.is_member || group.is_creator) {
      console.log('✅ Уже участник/создатель, переходим в группу');
      navigate(`/groups/${group.id}`);
      return;
    }
    
    // Проверяем тип группы
    if (group.is_public || !group.password) {
      // Открытая группа - вступаем сразу
      console.log('🔓 Открытая группа, вступаем...');
      await joinGroup(group.id, null);
    } else {
      // Закрытая группа - спрашиваем пароль
      console.log('🔒 Закрытая группа, запрашиваем пароль');
      setShowPasswordDialog(group);
    }
  };

  const joinGroup = async (groupId, password = null) => {
    try {
      console.log('🔄 Отправляем запрос на вступление в группу:', groupId);
      
      const config = password ? { params: { password } } : {};
      
      const response = await api.post(`/groups/join/${groupId}`, null, config);
      console.log('✅ Успешное вступление:', response.data);
      
      showSnackbar(response.data?.message || 'Вы успешно вступили в группу!', 'success');
      
      // Закрываем диалог пароля если он открыт
      if (showPasswordDialog) {
        setShowPasswordDialog(null);
        setPassword('');
      }
      
      // Обновляем статус группы в UI
      setGroups(prevGroups => 
        prevGroups.map(group => 
          group.id === groupId 
            ? { ...group, is_member: true }
            : group
        )
      );
      
      // Переходим в группу через 0.5 секунды
      setTimeout(() => {
        console.log(`🔄 Переходим в группу /groups/${groupId}`);
        navigate(`/groups/${groupId}`);
      }, 500);
      
    } catch (err) {
      console.error('❌ Ошибка вступления:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message
      });
      
      // Если ошибка "уже состоите", обновляем статус и переходим
      if (err.response?.data?.detail?.includes('уже состоите')) {
        console.log('ℹ️ Уже состоим в группе, обновляем статус...');
        
        // Обновляем статус в UI
        setGroups(prevGroups => 
          prevGroups.map(group => 
            group.id === groupId 
              ? { ...group, is_member: true }
              : group
          )
        );
        
        // Переходим в группу
        setTimeout(() => {
          navigate(`/groups/${groupId}`);
        }, 500);
        
        return;
      }
      
      const errorMsg = err.response?.data?.detail || 'Ошибка вступления в группу';
      showSnackbar(errorMsg, 'error');
    }
  };

  const handlePasswordSubmit = () => {
    if (!showPasswordDialog) return;
    joinGroup(showPasswordDialog.id, password);
  };

  // ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
  const getGroupTypeInfo = (group) => {
    if (group.is_public) {
      return { icon: <LockOpen fontSize="small" />, text: 'Открытая', color: '#2e7d32' };
    } else {
      return { icon: <Lock fontSize="small" />, text: 'Закрытая', color: '#ed6c02' };
    }
  };

  const filteredGroups = groups.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    (g.description && g.description.toLowerCase().includes(search.toLowerCase())) ||
    (g.subject && g.subject.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) {
    return (
      <Container sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Заголовок и кнопки */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4, alignItems: 'center' }}>
        <Typography variant="h4" fontWeight="900">
          Сообщества
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<QrCode />}
            onClick={handleFindClick}
            sx={{ borderRadius: '12px', textTransform: 'none', px: 3 }}
          >
            Найти по коду
          </Button>
          
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleCreateClick}
            sx={{ borderRadius: '12px', textTransform: 'none', px: 3 }}
          >
            Создать группу
          </Button>
        </Box>
      </Box>

      {/* Поиск */}
      <Paper sx={{ p: 2, mb: 4, display: 'flex', alignItems: 'center' }}>
        <Search sx={{ mr: 2, color: 'text.secondary' }} />
        <TextField
          fullWidth
          variant="standard"
          placeholder="Поиск по группам..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{ disableUnderline: true }}
        />
      </Paper>

      {/* Ошибка */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
          <Button onClick={loadData} sx={{ ml: 2 }} size="small">
            Повторить
          </Button>
        </Alert>
      )}

      {/* Список групп */}
      <Grid container spacing={3}>
        {filteredGroups.length === 0 ? (
          <Grid item xs={12}>
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Psychology sx={{ fontSize: 60, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Группы не найдены
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Создайте первую группу или подождите пока другие пользователи создадут свои
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={handleCreateClick}
                sx={{ borderRadius: '12px', textTransform: 'none' }}
              >
                Создать группу
              </Button>
            </Paper>
          </Grid>
        ) : (
          filteredGroups.map((group) => {
            const isCreator = group.is_creator;
            const isMember = group.is_member;
            const typeInfo = getGroupTypeInfo(group);
            
            return (
              <Grid item xs={12} md={6} key={group.id}>
                <Card sx={{ p: 3, height: '100%' }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                    <Avatar 
                      sx={{ 
                        bgcolor: isCreator ? 'primary.main' : 
                                isMember ? 'success.main' : 'action.selected',
                        color: (isCreator || isMember) ? '#fff' : 'text.primary',
                        mr: 2,
                        width: 60,
                        height: 60
                      }}
                    >
                      <Psychology />
                    </Avatar>
                    
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="h6" fontWeight="bold">
                          {group.name}
                        </Typography>
                        
                        {isCreator && (
                          <Chip
                            label="Создатель"
                            size="small"
                            sx={{ 
                              backgroundColor: 'primary.main',
                              color: 'white'
                            }}
                          />
                        )}
                        
                        {isMember && !isCreator && (
                          <Chip
                            icon={<CheckCircle fontSize="small" />}
                            label="Участник"
                            size="small"
                            sx={{ 
                              backgroundColor: 'success.main',
                              color: 'white',
                              '& .MuiChip-icon': { color: 'white' }
                            }}
                          />
                        )}
                        
                        <Chip
                          icon={typeInfo.icon}
                          label={typeInfo.text}
                          size="small"
                          sx={{ 
                            backgroundColor: typeInfo.color,
                            color: 'white',
                            '& .MuiChip-icon': { color: 'white' }
                          }}
                        />
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {group.description || 'Нет описания'}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', gap: 3, mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <AccountCircle fontSize="small" color="action" />
                          <Typography variant="caption">
                            {group.members_count || 0} участников
                          </Typography>
                        </Box>
                        
                        {group.subject && (
                          <Typography variant="caption" color="text.secondary">
                            {group.subject}
                          </Typography>
                        )}
                        
                        {group.academic_year && (
                          <Typography variant="caption" color="text.secondary">
                            {group.academic_year}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </Box>
                  
                  <Button
                    fullWidth
                    variant={isMember || isCreator ? "outlined" : "contained"}
                    onClick={() => handleJoinClick(group)}
                    sx={{ borderRadius: '8px', textTransform: 'none' }}
                  >
                    {isCreator ? 'Моя группа' : 
                     isMember ? 'Перейти в группу' :
                     (group.is_public ? 'Вступить' : 'Ввести пароль')}
                  </Button>
                </Card>
              </Grid>
            );
          })
        )}
      </Grid>

      {/* ========== ДИАЛОГ СОЗДАНИЯ ГРУППЫ ========== */}
      <Dialog 
        open={showCreateDialog} 
        onClose={() => setShowCreateDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Создание новой группы</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              label="Название группы *"
              fullWidth
              value={newGroup.name}
              onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
              required
            />
            
            <TextField
              label="Описание"
              multiline
              rows={3}
              fullWidth
              value={newGroup.description}
              onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
            />
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Предмет"
                fullWidth
                value={newGroup.subject}
                onChange={(e) => setNewGroup({ ...newGroup, subject: e.target.value })}
              />
              
              <TextField
                label="Учебный год"
                fullWidth
                value={newGroup.academic_year}
                onChange={(e) => setNewGroup({ ...newGroup, academic_year: e.target.value })}
                placeholder="2024-2025"
              />
            </Box>
            
            <TextField
              label="Максимальное количество участников"
              type="number"
              fullWidth
              value={newGroup.max_students}
              onChange={(e) => setNewGroup({ ...newGroup, max_students: parseInt(e.target.value) || 0 })}
              helperText="Оставьте 0 для неограниченного количества"
            />
            
            {/* Тип группы */}
            <FormControl fullWidth>
              <InputLabel>Тип группы</InputLabel>
              <Select
                value={newGroup.is_public ? 'open' : 'closed'}
                onChange={(e) => setNewGroup({ 
                  ...newGroup, 
                  is_public: e.target.value === 'open' 
                })}
                label="Тип группы"
              >
                <MenuItem value="open">Открытая (любой может вступить)</MenuItem>
                <MenuItem value="closed">Закрытая (нужен пароль)</MenuItem>
              </Select>
            </FormControl>
            
            {/* Пароль для закрытых групп */}
            {!newGroup.is_public && (
              <TextField
                label="Пароль для вступления"
                type="password"
                fullWidth
                value={newGroup.password}
                onChange={(e) => setNewGroup({ ...newGroup, password: e.target.value })}
                helperText="Участникам нужно будет ввести этот пароль"
              />
            )}
            
            {/* Требовать одобрения */}
            <FormControlLabel
              control={
                <Switch
                  checked={newGroup.require_approval}
                  onChange={(e) => setNewGroup({ 
                    ...newGroup, 
                    require_approval: e.target.checked 
                  })}
                />
              }
              label="Требовать одобрения владельца для вступления"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateDialog(false)}>Отмена</Button>
          <Button 
            onClick={handleCreateSubmit} 
            variant="contained"
            disabled={!newGroup.name.trim()}
          >
            Создать
          </Button>
        </DialogActions>
      </Dialog>

      {/* ========== ДИАЛОГ ПОИСКА ПО КОДУ ========== */}
      <Dialog 
        open={showFindDialog} 
        onClose={() => setShowFindDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Поиск группы по коду</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Код приглашения"
            fullWidth
            variant="outlined"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            placeholder="Введите код приглашения"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowFindDialog(false)}>Отмена</Button>
          <Button 
            onClick={handleFindSubmit} 
            variant="contained"
            disabled={!inviteCode.trim()}
          >
            Найти и вступить
          </Button>
        </DialogActions>
      </Dialog>

      {/* ========== ДИАЛОГ ПАРОЛЯ ========== */}
      <Dialog 
        open={!!showPasswordDialog} 
        onClose={() => setShowPasswordDialog(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Пароль для группы: {showPasswordDialog?.name}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            type="password"
            label="Пароль"
            fullWidth
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPasswordDialog(null)}>Отмена</Button>
          <Button 
            onClick={handlePasswordSubmit} 
            variant="contained"
          >
            Вступить
          </Button>
        </DialogActions>
      </Dialog>

      {/* ========== SNACKBAR УВЕДОМЛЕНИЙ ========== */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Groups;