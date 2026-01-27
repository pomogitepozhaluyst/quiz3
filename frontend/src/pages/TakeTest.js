import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  TextField,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Fade,
  Zoom,
  LinearProgress,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Checkbox,
  FormGroup,
  FormLabel,
  Chip
} from '@mui/material';
import {
  AccessTime,
  Quiz,
  Functions,
  Image as ImageIcon,
  Videocam as VideoIcon,
  Audiotrack as AudioIcon,
  PlayArrow,
  Pause,
  VolumeUp
} from '@mui/icons-material';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

// Компонент для рендеринга формул LaTeX
const LatexRenderer = ({ text }) => {
  if (!text) return null;

  const renderWithFormulas = (text) => {
    const formulaRegex = /\[\[(.*?)\]\]/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    let formulaCount = 0;

    while ((match = formulaRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      
      formulaCount++;
      parts.push(
        <Box 
          key={`formula-${formulaCount}`}
          component="span"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            backgroundColor: 'primary.light',
            color: 'primary.contrastText',
            padding: '4px 12px',
            borderRadius: 2,
            border: '2px solid',
            borderColor: 'primary.main',
            margin: '0 4px',
            fontFamily: 'monospace',
            fontSize: '1em',
            fontWeight: 'bold',
            boxShadow: 1
          }}
        >
          <Functions sx={{ fontSize: 18, mr: 1 }} />
          {match[1]}
        </Box>
      );
      
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts;
  };

  return (
    <Typography component="div" sx={{ lineHeight: 1.8, fontSize: '1.1rem' }}>
      {renderWithFormulas(text)}
    </Typography>
  );
};

// Компонент для отображения медиа-контента
const MediaRenderer = ({ mediaUrl, type }) => {
  if (!mediaUrl) return null;

  const fullMediaUrl = `http://localhost:8000${mediaUrl}`;

  const getMediaType = (url) => {
    if (!url) return 'unknown';
    const extension = url.split('.').pop()?.toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(extension)) {
      return 'image';
    } else if (['mp4', 'webm', 'ogg', 'mov', 'avi'].includes(extension)) {
      return 'video';
    } else if (['mp3', 'wav', 'ogg', 'm4a'].includes(extension)) {
      return 'audio';
    }
    return 'unknown';
  };

  const mediaType = type || getMediaType(mediaUrl);

  switch (mediaType) {
    case 'image':
      return (
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Chip 
            icon={<ImageIcon />} 
            label="Изображение" 
            color="primary" 
            sx={{ mb: 2 }}
          />
          <Box
            component="img"
            src={fullMediaUrl}
            alt="Изображение к вопросу"
            sx={{
              maxWidth: '100%',
              maxHeight: '300px',
              borderRadius: 2,
              boxShadow: 2,
              border: '2px solid',
              borderColor: 'primary.main',
              display: 'block',
              margin: '0 auto'
            }}
          />
        </Box>
      );

    case 'video':
      return (
        <Box sx={{ mb: 3 }}>
          <Chip 
            icon={<VideoIcon />} 
            label="Видео" 
            color="secondary" 
            sx={{ mb: 2 }}
          />
          <Box sx={{ position: 'relative', borderRadius: 2, overflow: 'hidden', boxShadow: 3 }}>
            <video
              src={fullMediaUrl}
              controls
              style={{
                width: '100%',
                maxHeight: '400px',
                backgroundColor: '#000',
                borderRadius: '8px'
              }}
            />
          </Box>
        </Box>
      );

    case 'audio':
      return (
        <Box sx={{ mb: 3 }}>
          <Chip 
            icon={<AudioIcon />} 
            label="Аудио" 
            color="info" 
            sx={{ mb: 2 }}
          />
          <Box sx={{ 
            p: 3, 
            borderRadius: 2, 
            backgroundColor: 'grey.100',
            border: '2px solid',
            borderColor: 'info.main'
          }}>
            <audio
              controls
              style={{ width: '100%' }}
            >
              <source src={fullMediaUrl} type="audio/mpeg" />
              Ваш браузер не поддерживает аудио элементы.
            </audio>
          </Box>
        </Box>
      );

    default:
      return null;
  }
};

// Компонент для черного ящика
const BlackboxRenderer = ({ description }) => {
  if (!description) return null;

  return (
    <Box sx={{ mb: 3 }}>
      <Chip 
        label="📦 Черный ящик" 
        color="warning" 
        sx={{ mb: 2, fontSize: '1rem', padding: '8px 16px' }}
      />
      <Box
        sx={{
          p: 3,
          borderRadius: 2,
          backgroundColor: 'grey.900',
          color: 'white',
          border: '3px solid',
          borderColor: 'warning.main',
          position: 'relative',
          '&::before': {
            content: '"?"',
            position: 'absolute',
            top: -15,
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'warning.main',
            color: 'white',
            width: 30,
            height: 30,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: '1.2rem'
          }
        }}
      >
        <Typography 
          variant="body1" 
          sx={{ 
            lineHeight: 1.6,
            textAlign: 'center',
            fontStyle: 'italic'
          }}
        >
          {description}
        </Typography>
      </Box>
    </Box>
  );
};

const TakeTest = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  const [test, setTest] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [questionTimeLeft, setQuestionTimeLeft] = useState(null);
  const [totalTimeLeft, setTotalTimeLeft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [timeUpDialog, setTimeUpDialog] = useState(false);
  const [leaveConfirmDialog, setLeaveConfirmDialog] = useState(false);
  const [testCompleted, setTestCompleted] = useState(false);
  const [shake, setShake] = useState(false);

useEffect(() => {
  const state = location.state || {};
  console.log('📍 State из location:', state);
  console.log('🔐 Токен:', localStorage.getItem('access_token'));
  console.log('👤 Пользователь:', user);
  
  if (state.sessionId) {
    console.log('🎯 Сессия из state:', state.sessionId);
    setSessionId(state.sessionId);
    
    if (state.testData) {
      console.log('📚 Тест из state:', state.testData);
      initializeTest(state.testData);
    } else {
      console.log('🔄 Загружаем тест с сервера...');
      loadTest();
    }
  } else {
    console.log('❌ Сессия не найдена в state. Перенаправляем на intro...');
    // Если нет сессии, перенаправляем на страницу введения
    navigate(`/test/${testId}/intro`);
  }
}, [testId, location, user, navigate]);

  const initializeTest = (testData) => {
    console.log('Initializing test with data:', testData);
    
    if (!testData.questions || testData.questions.length === 0) {
      setError('Тест не содержит вопросов');
      setLoading(false);
      return;
    }

    setTest(testData);
    
    if (testData.time_limit) {
      setTotalTimeLeft(testData.time_limit * 60);
    }
    
    const firstQuestion = getCurrentQuestionData(testData, 0);
    setQuestionTimeLeft(firstQuestion?.time_limit || 60);
    
    setLoading(false);
  };

  const loadTest = async () => {
    try {
      const response = await api.get(`/tests/${testId}`);
      initializeTest(response.data);
    } catch (error) {
      console.error('Error loading test:', error);
      setError('Ошибка загрузки теста: ' + (error.response?.data?.detail || error.message));
      setLoading(false);
    }
  };

  const getCurrentQuestionData = (testData, index) => {
    if (!testData.questions || !testData.questions[index]) return null;
    
    const questionItem = testData.questions[index];
    console.log('Question item structure:', questionItem);
    
    if (questionItem.question) {
      return {
        id: questionItem.question.id,
        question_text: questionItem.question.question_text,
        time_limit: questionItem.question.time_limit,
        type: questionItem.question.type,
        answer_type: questionItem.question.answer_type,
        answer_options: questionItem.question.answer_options || [],
        media_url: questionItem.question.media_url,
        blackbox_description: questionItem.question.blackbox_description,
        type_name: questionItem.question.type?.name
      };
    } else {
      return {
        id: questionItem.id,
        question_text: questionItem.question_text,
        time_limit: questionItem.time_limit,
        type: questionItem.type,
        answer_type: questionItem.answer_type,
        answer_options: questionItem.answer_options || [],
        media_url: questionItem.media_url,
        blackbox_description: questionItem.blackbox_description,
        type_name: questionItem.type?.name
      };
    }
  };

  const getCurrentQuestion = () => {
    if (!test) return null;
    return getCurrentQuestionData(test, currentQuestion);
  };

  const handleAnswerChange = (questionId, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleTextAnswerChange = (questionId, text) => {
    handleAnswerChange(questionId, {
      text: text,
      type: 'text'
    });
  };

  const handleSingleChoiceChange = (questionId, selectedOptionId) => {
    handleAnswerChange(questionId, {
      selected_options: [selectedOptionId],
      type: 'single_choice'
    });
  };

  const handleMultipleChoiceChange = (questionId, optionId, isChecked) => {
    const currentAnswer = answers[questionId] || { selected_options: [], type: 'multiple_choice' };
    let newSelectedOptions;
    
    if (isChecked) {
      newSelectedOptions = [...currentAnswer.selected_options, optionId];
    } else {
      newSelectedOptions = currentAnswer.selected_options.filter(id => id !== optionId);
    }
    
    handleAnswerChange(questionId, {
      selected_options: newSelectedOptions,
      type: 'multiple_choice'
    });
  };

  const handleNext = async () => {
    const currentQuestionData = getCurrentQuestion();
    
    if (currentQuestionData && sessionId) {
      try {
        let answerData = {
          question_id: currentQuestionData.id,
          time_spent: 60 - (questionTimeLeft || 0)
        };

        const currentAnswer = answers[currentQuestionData.id];
        
        if (currentAnswer) {
          if (currentAnswer.type === 'text' && currentAnswer.text) {
            answerData.answer_text = currentAnswer.text;
          } else if ((currentAnswer.type === 'single_choice' || currentAnswer.type === 'multiple_choice') && 
                     currentAnswer.selected_options) {
            answerData.selected_options = currentAnswer.selected_options.join(',');
          }
        }

        await api.post(`/test-sessions/${sessionId}/answers`, answerData);
      } catch (error) {
        console.error('Error saving answer:', error);
      }
    }

    if (currentQuestion < test.questions.length - 1) {
      setCurrentQuestion(prev => {
        const nextIndex = prev + 1;
        const nextQuestion = getCurrentQuestionData(test, nextIndex);
        setQuestionTimeLeft(nextQuestion?.time_limit || 60);
        setShake(false);
        return nextIndex;
      });
    } else {
      await handleFinishTest();
    }
  };

  const handleFinishTest = async () => {
    try {
      await api.post(`/test-sessions/${sessionId}/complete`);
      setTestCompleted(true);
    } catch (error) {
      console.error('Error finishing test:', error);
      setError('Ошибка завершения теста');
    }
  };

  const handleLeaveTest = () => {
    if (!testCompleted) {
      setLeaveConfirmDialog(true);
    } else {
      navigate('/dashboard');
    }
  };

  useEffect(() => {
    if (questionTimeLeft === null) return;

    const questionTimer = setInterval(() => {
      setQuestionTimeLeft(prev => {
        if (prev <= 11 && prev > 0) setShake(true);
        if (prev <= 1) {
          handleNext();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(questionTimer);
  }, [questionTimeLeft]);

  useEffect(() => {
    if (totalTimeLeft === null) return;

    const totalTimer = setInterval(() => {
      setTotalTimeLeft(prev => {
        if (prev <= 1) {
          setTimeUpDialog(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(totalTimer);
  }, [totalTimeLeft]);

  const handleTimeUp = () => {
    setTimeUpDialog(false);
    handleFinishTest();
  };

  const ProgressDots = () => (
    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 3 }}>
      {test.questions.map((_, index) => (
        <Box
          key={index}
          sx={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            bgcolor: index === currentQuestion 
              ? 'primary.main' 
              : index < currentQuestion 
                ? 'success.main' 
                : 'grey.300',
            transition: 'all 0.3s ease'
          }}
        />
      ))}
    </Box>
  );

  const QuestionTimer = () => {
    const currentQuestionData = getCurrentQuestion();
    const questionTimeLimit = currentQuestionData?.time_limit || 60;
    const progress = (questionTimeLeft / questionTimeLimit) * 100;

    return (
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <AccessTime color="primary" />
          <LinearProgress 
            variant="determinate" 
            value={progress}
            sx={{ 
              flexGrow: 1, 
              height: 8, 
              borderRadius: 4,
              bgcolor: questionTimeLeft < 11 ? 'error.light' : 'grey.200'
            }}
          />
          <Typography 
            variant="h6" 
            color={questionTimeLeft < 11 ? 'error.main' : 'primary.main'}
            sx={{
              fontWeight: 'bold',
              minWidth: 60,
              textAlign: 'center'
            }}
          >
            {questionTimeLeft}с
          </Typography>
        </Box>

        <Zoom in={questionTimeLeft !== null && questionTimeLeft < 11}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
            p: 1,
            borderRadius: 2,
            bgcolor: 'error.main',
            color: 'white',
            justifyContent: 'center'
          }}>
            <Typography variant="body2" fontWeight="bold">
              Время заканчивается!
            </Typography>
            <Typography 
              variant="h6" 
              fontWeight="bold"
              sx={{
                animation: shake ? 'shake 0.5s ease-in-out' : 'none',
                '@keyframes shake': {
                  '0%, 100%': { transform: 'translateX(0)' },
                  '25%': { transform: 'translateX(-5px)' },
                  '75%': { transform: 'translateX(5px)' }
                }
              }}
            >
              {questionTimeLeft}с
            </Typography>
          </Box>
        </Zoom>
      </Box>
    );
  };

  const renderAnswerInput = () => {
    const currentQuestionData = getCurrentQuestion();
    if (!currentQuestionData) return null;

    const currentAnswer = answers[currentQuestionData.id] || {};
    
    // Определяем тип ответа на основе данных вопроса
    const answerType = currentQuestionData.answer_type?.name || 'text';
    
    console.log('Answer type:', answerType);
    console.log('Answer options:', currentQuestionData.answer_options);

    switch (answerType) {
      case 'text':
        return (
          <Box>
            <Typography variant="h6" gutterBottom color="text.secondary" sx={{ mb: 2 }}>
              Ваш ответ:
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              placeholder="Введите ваш ответ здесь..."
              value={currentAnswer.text || ''}
              onChange={(e) => handleTextAnswerChange(currentQuestionData.id, e.target.value)}
              variant="outlined"
            />
          </Box>
        );

      case 'single_choice':
        return (
          <Box>
            <Typography variant="h6" gutterBottom color="text.secondary" sx={{ mb: 2 }}>
              Выберите один вариант:
            </Typography>
            <FormControl component="fieldset" fullWidth>
              <RadioGroup
                value={currentAnswer.selected_options?.[0] || ''}
                onChange={(e) => handleSingleChoiceChange(currentQuestionData.id, parseInt(e.target.value))}
              >
                {currentQuestionData.answer_options.map((option, index) => (
                  <FormControlLabel
                    key={option.id}
                    value={option.id}
                    control={<Radio />}
                    label={
                      <Typography variant="body1" component="div">
                        <LatexRenderer text={option.option_text} />
                      </Typography>
                    }
                    sx={{ 
                      mb: 1,
                      p: 1,
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                      '&:hover': {
                        backgroundColor: 'action.hover'
                      }
                    }}
                  />
                ))}
              </RadioGroup>
            </FormControl>
          </Box>
        );

      case 'multiple_choice':
        return (
          <Box>
            <Typography variant="h6" gutterBottom color="text.secondary" sx={{ mb: 2 }}>
              Выберите один или несколько вариантов:
            </Typography>
            <FormControl component="fieldset" fullWidth>
              <FormGroup>
                {currentQuestionData.answer_options.map((option, index) => (
                  <FormControlLabel
                    key={option.id}
                    control={
                      <Checkbox
                        checked={currentAnswer.selected_options?.includes(option.id) || false}
                        onChange={(e) => handleMultipleChoiceChange(
                          currentQuestionData.id, 
                          option.id, 
                          e.target.checked
                        )}
                      />
                    }
                    label={
                      <Typography variant="body1" component="div">
                        <LatexRenderer text={option.option_text} />
                      </Typography>
                    }
                    sx={{ 
                      mb: 1,
                      p: 1,
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                      '&:hover': {
                        backgroundColor: 'action.hover'
                      }
                    }}
                  />
                ))}
              </FormGroup>
            </FormControl>
          </Box>
        );

      default:
        return (
          <Box>
            <Typography variant="h6" gutterBottom color="text.secondary" sx={{ mb: 2 }}>
              Ваш ответ:
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              placeholder="Введите ваш ответ здесь..."
              value={currentAnswer.text || ''}
              onChange={(e) => handleTextAnswerChange(currentQuestionData.id, e.target.value)}
              variant="outlined"
            />
          </Box>
        );
    }
  };

  const isAnswerProvided = () => {
    const currentQuestionData = getCurrentQuestion();
    if (!currentQuestionData) return false;

    const currentAnswer = answers[currentQuestionData.id];
    if (!currentAnswer) return false;

    const answerType = currentQuestionData.answer_type?.name || 'text';
    
    switch (answerType) {
      case 'text':
        return currentAnswer.text && currentAnswer.text.trim().length > 0;
      
      case 'single_choice':
        return currentAnswer.selected_options && currentAnswer.selected_options.length > 0;
      
      case 'multiple_choice':
        return currentAnswer.selected_options && currentAnswer.selected_options.length > 0;
      
      default:
        return currentAnswer.text && currentAnswer.text.trim().length > 0;
    }
  };

  const formatTime = (seconds) => {
    if (seconds === null) return '∞';
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <Container sx={{ py: 4 }}>
        <LinearProgress />
        <Typography align="center" sx={{ mt: 2 }}>
          Подготовка теста...
        </Typography>
      </Container>
    );
  }

  if (!test || !sessionId) {
    return (
      <Container sx={{ py: 4 }}>
        <Alert severity="error">
          {error || 'Ошибка инициализации теста'}
        </Alert>
        <Button 
          onClick={() => navigate('/tests')} 
          sx={{ mt: 2 }}
        >
          Вернуться к списку тестов
        </Button>
      </Container>
    );
  }

  if (testCompleted) {
    return (
      <TestCompleted 
        onReturn={() => navigate('/dashboard')}
      />
    );
  }

  const currentQuestionData = getCurrentQuestion();
  
  if (!currentQuestionData) {
    return (
      <Container sx={{ py: 4 }}>
        <Alert severity="error">
          Вопрос не найден
        </Alert>
        <Button 
          onClick={() => navigate('/tests')} 
          sx={{ mt: 2 }}
        >
          Вернуться к списку тестов
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 3, position: 'relative' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              {test.title}
            </Typography>
            {error && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
          </Box>
          
          {totalTimeLeft !== null && (
            <Box sx={{ textAlign: 'center', minWidth: 100 }}>
              <Typography variant="body2" color="text.secondary">
                Общее время
              </Typography>
              <Typography 
                variant="h5" 
                color={totalTimeLeft < 300 ? 'error.main' : 'primary.main'}
                fontWeight="bold"
              >
                {formatTime(totalTimeLeft)}
              </Typography>
            </Box>
          )}
        </Box>

        <ProgressDots />
        <QuestionTimer />

        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Typography variant="h5" component="h2" sx={{ color: 'text.primary', fontWeight: 'bold', mb: 1 }}>
            Вопрос {currentQuestion + 1} из {test.questions.length}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
            <Quiz sx={{ fontSize: 32, mr: 2, color: 'primary.main' }} />
            <Typography 
              variant="h6" 
              sx={{ 
                color: 'primary.main',
                fontWeight: 'bold'
              }}
            >
              ВНИМАНИЕ: ВОПРОС
            </Typography>
          </Box>
        </Box>

        <Fade in={true} timeout={500}>
          <Box 
            sx={{ 
              p: 4,
              border: '3px solid #8B7355',
              borderRadius: 3,
              backgroundColor: 'transparent',
              mb: 4,
              position: 'relative',
              minHeight: '150px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 8,
                left: 8,
                right: 8,
                bottom: 8,
                border: '2px solid #D4AF37',
                borderRadius: 2,
                pointerEvents: 'none'
              }
            }}
          >
            {/* Медиа-контент (изображение, видео, аудио) */}
            {currentQuestionData.media_url && (
              <MediaRenderer 
                mediaUrl={currentQuestionData.media_url} 
                type={currentQuestionData.type_name}
              />
            )}

            {/* Черный ящик */}
            {currentQuestionData.blackbox_description && (
              <BlackboxRenderer description={currentQuestionData.blackbox_description} />
            )}

            {/* Текст вопроса с формулами */}
            <Box sx={{ textAlign: 'center', width: '100%' }}>
              <LatexRenderer text={currentQuestionData.question_text} />
            </Box>
          </Box>
        </Fade>

        {/* Рендерим соответствующий тип ответа */}
        {renderAnswerInput()}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
          <Button
            onClick={() => setLeaveConfirmDialog(true)}
            color="inherit"
          >
            Выйти
          </Button>
          
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={!isAnswerProvided()}
            size="large"
          >
            {currentQuestion === test.questions.length - 1 ? 'Завершить тест' : 'Далее'}
          </Button>
        </Box>
      </Paper>

      <Dialog open={leaveConfirmDialog} onClose={() => setLeaveConfirmDialog(false)}>
        <DialogTitle>Подтверждение выхода</DialogTitle>
        <DialogContent>
          <Typography>
            Тест не завершен. Все несохраненные ответы будут потеряны. 
            Вы уверены, что хотите выйти?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLeaveConfirmDialog(false)}>Остаться</Button>
          <Button onClick={() => navigate('/dashboard')} color="error" variant="contained">
            Выйти
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={timeUpDialog} onClose={handleTimeUp}>
        <DialogTitle>Время вышло!</DialogTitle>
        <DialogContent>
          <Typography>
            Время на прохождение теста истекло. Тест будет автоматически завершен.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleTimeUp} variant="contained">
            Понятно
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

const TestCompleted = ({ onReturn }) => (
  <Container maxWidth="sm" sx={{ py: 4 }}>
    <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
      <Typography variant="h4" color="success.main" gutterBottom>
        🎉 Тест завершен!
      </Typography>
      <Typography variant="body1" paragraph sx={{ mb: 3 }}>
        Ваши ответы успешно сохранены. Результаты будут доступны после проверки.
      </Typography>
      <Button
        variant="contained"
        size="large"
        onClick={onReturn}
      >
        Вернуться в кабинет
      </Button>
    </Paper>
  </Container>
);

export default TakeTest;