import React from 'react';
import { 
  Container, 
  Typography, 
  Button, 
  Box, 
  Grid, 
  Card, 
  CardContent,
  Paper
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { 
  School, 
  Quiz, 
  Groups, 
  Analytics,
  PlayArrow
} from '@mui/icons-material';

const Home = () => {
  const navigate = useNavigate();

  return (
    <Box>
      {/* Hero секция */}
      <Paper
        sx={{
          position: 'relative',
          color: '#fff',
          mb: 4,
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          backgroundImage: theme => 
            theme.palette.mode === 'dark' 
              ? `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.secondary.dark} 100%)`
              : `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              position: 'relative',
              p: { xs: 3, md: 6 },
              pr: { md: 0 },
              minHeight: '500px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}
          >
            <Typography component="h1" variant="h2" color="inherit" gutterBottom>
              🎯 EduQuiz - Образовательная платформа
            </Typography>
            <Typography variant="h5" color="inherit" paragraph sx={{ mb: 4 }}>
              Создавайте и проходите интерактивные квизы для эффективного обучения. 
              Идеально для учителей, студентов и учебных заведений.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button 
                variant="contained" 
                size="large"
                startIcon={<PlayArrow />}
                onClick={() => navigate('/login')}
                sx={{ 
                  px: 4, 
                  py: 1.5,
                  fontSize: '1.1rem'
                }}
              >
                Начать обучение
              </Button>
              <Button 
                variant="outlined" 
                size="large"
                color="inherit"
                onClick={() => navigate('/register')}
                sx={{ 
                  px: 4, 
                  py: 1.5,
                  fontSize: '1.1rem',
                  borderColor: 'white',
                  color: 'white',
                  '&:hover': {
                    borderColor: 'white',
                    backgroundColor: 'rgba(255,255,255,0.1)'
                  }
                }}
              >
                Создать аккаунт
              </Button>
            </Box>
          </Box>
        </Container>
      </Paper>

      <Container maxWidth="lg">
        {/* Возможности платформы */}
        <Typography variant="h3" component="h2" gutterBottom align="center" sx={{ mb: 6 }}>
          Преимущества платформы
        </Typography>

        <Grid container spacing={4} sx={{ mb: 8 }}>
          <Grid item xs={12} md={6} lg={3}>
            <Card sx={{ height: '100%', textAlign: 'center' }}>
              <CardContent sx={{ p: 3 }}>
                <School sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                <Typography variant="h5" component="h3" gutterBottom>
                  Для преподавателей
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Создавайте интерактивные квизы, отслеживайте прогресс студентов, автоматизируйте проверку
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6} lg={3}>
            <Card sx={{ height: '100%', textAlign: 'center' }}>
              <CardContent sx={{ p: 3 }}>
                <Quiz sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h5" component="h3" gutterBottom>
                  Разные форматы
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Текстовые вопросы, выбор ответов, изображения, видео - разнообразьте обучение
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6} lg={3}>
            <Card sx={{ height: '100%', textAlign: 'center' }}>
              <CardContent sx={{ p: 3 }}>
                <Groups sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
                <Typography variant="h5" component="h3" gutterBottom>
                  Учебные группы
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Создавайте классы, приглашайте студентов, назначайте групповые задания
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6} lg={3}>
            <Card sx={{ height: '100%', textAlign: 'center' }}>
              <CardContent sx={{ p: 3 }}>
                <Analytics sx={{ fontSize: 60, color: 'info.main', mb: 2 }} />
                <Typography variant="h5" component="h3" gutterBottom>
                  Аналитика прогресса
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Детальная статистика по каждому студенту, выявление слабых мест, отслеживание прогресса
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Кто может использовать */}
        <Paper sx={{ p: 4, mb: 6, backgroundColor: 'primary.light', color: 'white' }}>
          <Typography variant="h4" component="h2" gutterBottom align="center">
            Кто использует EduQuiz?
          </Typography>
          <Grid container spacing={3} sx={{ mt: 2 }}>
            <Grid item xs={12} md={4}>
              <Box textAlign="center">
                <Typography variant="h6" gutterBottom>🏫 Школы</Typography>
                <Typography>Учителя и ученики для занятий, контрольных и домашних заданий</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box textAlign="center">
                <Typography variant="h6" gutterBottom>🎓 Университеты</Typography>
                <Typography>Преподаватели и студенты для сессий, тестирования и самоподготовки</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box textAlign="center">
                <Typography variant="h6" gutterBottom>📚 Курсы</Typography>
                <Typography>Онлайн-школы и образовательные платформы для интерактивного обучения</Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* CTA секция */}
        <Box textAlign="center" sx={{ mb: 8 }}>
          <Typography variant="h4" component="h2" gutterBottom>
            Готовы начать обучение?
          </Typography>
          <Typography variant="h6" color="text.secondary" paragraph sx={{ mb: 4 }}>
            Присоединяйтесь к тысячам преподавателей и студентов, которые уже используют нашу платформу
          </Typography>
          <Button 
            variant="contained" 
            size="large"
            onClick={() => navigate('/register')}
            sx={{ 
              px: 6, 
              py: 1.5,
              fontSize: '1.2rem'
            }}
          >
            Начать бесплатно
          </Button>
        </Box>
      </Container>
    </Box>
  );
};

export default Home;