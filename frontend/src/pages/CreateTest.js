import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Grid,
  FormControl,
  FormControlLabel,
  Alert,
  Chip,
  TextField,
  Switch,
  MenuItem,
  InputLabel,
  Select,
  Tooltip
} from '@mui/material';
import {
  Add,
  Save,
  ArrowBack,
  Groups,
  Person,
  HelpOutline,
  Image as ImageIcon,  // ← ДОБАВЬТЕ ЭТО
  Videocam as VideoIcon,  // ← И ЭТО
  Audiotrack as AudioIcon,  // ← И ЭТО
  Science,  // ← И ЭТО (для черного ящика)
  Functions  // ← И ЭТО (для LaTeX)
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import QuestionItem from '../components/QuestionItem';
import api from '../services/api';

const CreateTest = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [testType, setTestType] = useState('individual');
  const [testSettings, setTestSettings] = useState({
    title: '',
    description: '',
    time_limit: '',
    max_attempts: 1,
    show_results: 'after_completion',
    shuffle_questions: false,
    shuffle_answers: false,
    passing_score: '',
    is_public: false
  });

  const [questions, setQuestions] = useState([
    {
      id: Date.now() + Math.random(),
      type: 'text',
      answer_type: 'text',
      question_text: '',
      category_id: 1,
      difficulty: 1,
      explanation: '',
      sources: '',
      correct_answer: '',
      time_limit: 60,
      points: 1,
      media_url: '',
      blackbox_description: '',
      answer_requirements: '',
      answer_options: []
    }
  ]);

  const steps = ['Тип теста', 'Настройки', 'Вопросы', 'Предпросмотр'];

  const addQuestion = useCallback(() => {
    const newQuestion = {
      id: Date.now() + Math.random(),
      type: 'text',
      answer_type: 'text',
      question_text: '',
      category_id: 1,
      difficulty: 1,
      explanation: '',
      sources: '',
      correct_answer: '',
      time_limit: 60,
      points: 1,
      media_url: '',
      blackbox_description: '',
      answer_requirements: '',
      answer_options: []
    };
    setQuestions(prev => [...prev, newQuestion]);
  }, []);

  const removeQuestion = useCallback((index) => {
    setQuestions(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updateQuestion = useCallback((index, updatedQuestion) => {
    setQuestions(prev => prev.map((q, i) => 
      i === index ? { ...updatedQuestion } : q
    ));
  }, []);

  const TestTypeStep = useCallback(() => (
    <Box sx={{ textAlign: 'center', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Выберите тип теста
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Как будет проходить тестирование?
      </Typography>

      <Grid container spacing={3} sx={{ maxWidth: 600, margin: '0 auto' }}>
        <Grid item xs={12} sm={6}>
          <Card 
            sx={{ 
              cursor: 'pointer',
              height: 320,
              border: testType === 'individual' ? '2px solid' : '1px solid',
              borderColor: testType === 'individual' ? 'primary.main' : 'divider',
              backgroundColor: testType === 'individual' ? 'action.hover' : 'background.paper',
              transition: 'all 0.2s ease',
              '&:hover': {
                boxShadow: 2
              }
            }}
            onClick={() => setTestType('individual')}
          >
            <CardContent sx={{ 
              textAlign: 'center', 
              p: 3, 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <Box>
                <Person sx={{ 
                  fontSize: 60, 
                  color: testType === 'individual' ? 'primary.main' : 'text.secondary', 
                  mb: 2 
                }} />
                <Typography variant="h5" gutterBottom>
                  Индивидуальное обучение
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Каждый участник проходит квиз самостоятельно для проверки знаний
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center' }}>
                <Chip 
                  label="Экзамены и тесты" 
                  size="small" 
                  color={testType === 'individual' ? 'primary' : 'default'}
                  sx={{ width: 'fit-content' }}
                />
                <Chip 
                  label="Домашние задания" 
                  size="small" 
                  color={testType === 'individual' ? 'primary' : 'default'}
                  sx={{ width: 'fit-content' }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Card 
            sx={{ 
              cursor: 'pointer',
              height: 320,
              border: testType === 'team' ? '2px solid' : '1px solid',
              borderColor: testType === 'team' ? 'primary.main' : 'divider',
              backgroundColor: testType === 'team' ? 'action.hover' : 'background.paper',
              transition: 'all 0.2s ease',
              '&:hover': {
                boxShadow: 2
              }
            }}
            onClick={() => setTestType('team')}
          >
            <CardContent sx={{ 
              textAlign: 'center', 
              p: 3, 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <Box>
                <Groups sx={{ 
                  fontSize: 60, 
                  color: testType === 'team' ? 'primary.main' : 'text.secondary', 
                  mb: 2 
                }} />
                <Typography variant="h5" gutterBottom>
                  Групповое занятие  
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Участники проходят квиз вместе, подходит для классных занятий
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center' }}>
                <Chip 
                  label="Классные занятия" 
                  size="small" 
                  color={testType === 'team' ? 'primary' : 'default'}
                  sx={{ width: 'fit-content' }}
                />
                <Chip 
                  label="Групповая работа" 
                  size="small" 
                  color={testType === 'team' ? 'primary' : 'default'}
                  sx={{ width: 'fit-content' }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  ), [testType]);

  const FieldWithHelp = useCallback(({ label, helpText, children }) => (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Typography variant="body2" fontWeight="medium">
          {label}
        </Typography>
        <Tooltip title={helpText} arrow>
          <HelpOutline sx={{ fontSize: 16, ml: 1, color: 'text.secondary' }} />
        </Tooltip>
      </Box>
      {children}
    </Box>
  ), []);

  // Отдельный компонент для настроек с локальным состоянием
  const TestSettingsStepComponent = () => {
    const [localSettings, setLocalSettings] = useState(testSettings);
    const updateTimeoutRef = useRef(null);

    // Синхронизация с основным состоянием
    useEffect(() => {
      setLocalSettings(testSettings);
    }, [testSettings]);

    // Дебаунс обновления основного состояния
    const debouncedUpdate = useCallback((updatedSettings) => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      
      updateTimeoutRef.current = setTimeout(() => {
        setTestSettings(updatedSettings);
      }, 300);
    }, []);

    const handleFieldChange = useCallback((field, value) => {
      const updated = {
        ...localSettings,
        [field]: value
      };
      setLocalSettings(updated);
      debouncedUpdate(updated);
    }, [localSettings, debouncedUpdate]);

    const handleSwitchChange = useCallback((field) => (e) => {
      handleFieldChange(field, e.target.checked);
    }, [handleFieldChange]);

    const handleSelectChange = useCallback((field) => (e) => {
      handleFieldChange(field, e.target.value);
    }, [handleFieldChange]);

    const handleInputChange = useCallback((field) => (e) => {
      handleFieldChange(field, e.target.value);
    }, [handleFieldChange]);

    const handleNumberChange = useCallback((field) => (e) => {
      const value = e.target.value === '' ? '' : parseInt(e.target.value) || 1;
      handleFieldChange(field, value);
    }, [handleFieldChange]);

    // Очистка таймаута при размонтировании
    useEffect(() => {
      return () => {
        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
        }
      };
    }, []);

    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Настройки теста
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Настройте основные параметры {testType === 'team' ? 'командного' : 'индивидуального'} теста
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <FieldWithHelp 
              label="Название теста *" 
              helpText="Краткое и понятное название, которое увидят участники"
            >
              <TextField
                fullWidth
                value={localSettings.title}
                onChange={handleInputChange('title')}
                placeholder="Например: 'Основы математики' или 'Историческая викторина'"
                required
              />
            </FieldWithHelp>
          </Grid>

          <Grid item xs={12}>
            <FieldWithHelp 
              label="Описание теста" 
              helpText="Подробное описание теста, цели и что ждет участников"
            >
              <TextField
                fullWidth
                multiline
                rows={3}
                value={localSettings.description}
                onChange={handleInputChange('description')}
                placeholder="Опишите содержание теста, темы вопросов и для кого он предназначен..."
              />
            </FieldWithHelp>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FieldWithHelp 
              label="Ограничение по времени (минуты)" 
              helpText="Общее время на прохождение всего теста. Оставьте пустым, если ограничения нет"
            >
              <TextField
                fullWidth
                type="number"
                value={localSettings.time_limit}
                onChange={handleInputChange('time_limit')}
                placeholder="Например: 60 (1 час)"
              />
            </FieldWithHelp>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FieldWithHelp 
              label="Максимум попыток" 
              helpText="Сколько раз участник может перепроходить тест"
            >
              <TextField
                fullWidth
                type="number"
                value={localSettings.max_attempts}
                onChange={handleNumberChange('max_attempts')}
              />
            </FieldWithHelp>
          </Grid>

          {testType === 'individual' && (
            <Grid item xs={12} sm={6}>
              <FieldWithHelp 
                label="Проходной балл (%)" 
                helpText="Минимальный процент правильных ответов для успешного прохождения"
              >
                <TextField
                  fullWidth
                  type="number"
                  value={localSettings.passing_score}
                  onChange={handleInputChange('passing_score')}
                  placeholder="Например: 70"
                />
              </FieldWithHelp>
            </Grid>
          )}

          <Grid item xs={12} sm={6}>
            <FieldWithHelp 
              label="Показ результатов" 
              helpText="Когда участники увидят свои результаты и правильные ответы"
            >
              <FormControl fullWidth>
                <Select
                  value={localSettings.show_results}
                  onChange={handleSelectChange('show_results')}
                >
                  <MenuItem value="after_completion">Сразу после завершения</MenuItem>
                  <MenuItem value="after_deadline">После окончания срока тестирования</MenuItem>
                  <MenuItem value="immediately">Сразу после каждого ответа</MenuItem>
                  <MenuItem value="never">Никогда (только итоговый балл)</MenuItem>
                </Select>
              </FormControl>
            </FieldWithHelp>
          </Grid>

          <Grid item xs={12}>
            <FieldWithHelp 
              label="" 
              helpText="Вопросы будут показываться в случайном порядке для каждого участника"
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={localSettings.shuffle_questions}
                    onChange={handleSwitchChange('shuffle_questions')}
                  />
                }
                label="Перемешивать вопросы"
              />
            </FieldWithHelp>
          </Grid>

          <Grid item xs={12}>
            <FieldWithHelp 
              label="" 
              helpText="Варианты ответов будут перемешиваться для вопросов с выбором"
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={localSettings.shuffle_answers}
                    onChange={handleSwitchChange('shuffle_answers')}
                  />
                }
                label="Перемешивать варианты ответов"
              />
            </FieldWithHelp>
          </Grid>

          <Grid item xs={12}>
            <FieldWithHelp 
              label="" 
              helpText="Публичный тест будет виден всем пользователям платформы, приватный - только по вашим приглашениям"
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={localSettings.is_public}
                    onChange={handleSwitchChange('is_public')}
                  />
                }
                label="Публичный тест (виден всем пользователям)"
              />
            </FieldWithHelp>
          </Grid>
        </Grid>
      </Box>
    );
  };

  const TestSettingsStep = useCallback(() => <TestSettingsStepComponent />, [testType]);

  const QuestionsStep = useCallback(() => (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Вопросы теста
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<Add />}
          onClick={addQuestion}
        >
          Добавить вопрос
        </Button>
      </Box>

      {questions.map((question, index) => (
        <QuestionItem
          key={question.id}
          question={question}
          index={index}
          onUpdate={updateQuestion}
          onRemove={removeQuestion}
          canRemove={questions.length > 1}
        />
      ))}
    </Box>
  ), [questions, addQuestion, updateQuestion, removeQuestion]);

  const getQuestionTypeLabel = useCallback((type) => {
    const types = {
      'text': '📝 Текст',
      'blackbox': '📦 Черный ящик',
      'image': '🖼️ Изображение',
      'video': '🎥 Видео',
      'audio': '🎵 Аудио',
      'code': '💻 Код'
    };
    return types[type] || type;
  }, []);

  const getAnswerTypeLabel = useCallback((type) => {
    const types = {
      'text': '📝 Текст',
      'single_choice': '🔘 Один вариант',
      'multiple_choice': '☑️ Несколько вариантов',
      'image_upload': '🖼️ Загрузка изображения',
      'file_upload': '📎 Загрузка файла'
    };
    return types[type] || type;
  }, []);

const PreviewStep = useCallback(() => (
  <Box sx={{ p: 3 }}>
    <Typography variant="h4" gutterBottom sx={{ color: 'text.primary', fontWeight: 'bold' }}>
      Предпросмотр теста
    </Typography>
    
    <Card sx={{ 
      mb: 4, 
      border: '1px solid', 
      borderColor: 'divider',
      backgroundColor: 'background.paper'
    }}>
      <CardContent>
        <Typography variant="h5" gutterBottom sx={{ color: 'text.primary', fontWeight: 'bold' }}>
          {testSettings.title || 'Без названия'}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          {testSettings.description || 'Описание отсутствует'}
        </Typography>
        
        {/* Показываем поддержку LaTeX если есть */}
        {questions.some(q => q.allow_latex) && (
          <Chip 
            label="Поддержка LaTeX" 
            color="info" 
            icon={<Functions />}
            sx={{ mb: 2 }}
          />
        )}
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          <Chip 
            label={`${questions.length} вопрос${questions.length === 1 ? '' : questions.length < 5 ? 'а' : 'ов'}`} 
            color="primary" 
            variant="outlined" 
          />
          {testSettings.time_limit && (
            <Chip 
              label={`${testSettings.time_limit} минут`} 
              color="secondary" 
              variant="outlined" 
            />
          )}
          <Chip 
            label={`${testSettings.max_attempts} попыт${testSettings.max_attempts === 1 ? 'ка' : testSettings.max_attempts < 5 ? 'ки' : 'ок'}`} 
            color="info" 
            variant="outlined" 
          />
          {testSettings.is_public && (
            <Chip 
              label="Публичный" 
              color="success" 
              variant="outlined" 
            />
          )}
        </Box>
      </CardContent>
    </Card>

    <Typography variant="h5" gutterBottom sx={{ mb: 3, color: 'text.primary' }}>
      Вопросы ({questions.length}):
    </Typography>
    
    {/* Простой список без прокрутки */}
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {questions.map((question, index) => (
        <Card 
          key={question.id} 
          sx={{ 
            p: 3,
            backgroundColor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 3 }}>
            {/* Номер вопроса */}
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                backgroundColor: 'primary.main',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '1.1rem',
                flexShrink: 0,
              }}
            >
              {index + 1}
            </Box>
            
            {/* Содержание вопроса */}
            <Box sx={{ flexGrow: 1 }}>
              {/* Текст вопроса */}
              <Typography 
                variant="body1" 
                fontWeight="medium" 
                sx={{ 
                  mb: 2,
                  color: 'text.primary',
                  lineHeight: 1.6
                }}
              >
                {question.question_text || 'Текст вопроса не заполнен'}
              </Typography>
              
              {/* Медиа-контент */}
              {question.media_url && (
                <Box sx={{ mb: 2 }}>
                  {question.media_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ImageIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        Изображение прикреплено
                      </Typography>
                    </Box>
                  ) : question.media_url.match(/\.(mp4|webm|ogg|mov|avi)$/i) ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <VideoIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        Видео прикреплено
                      </Typography>
                    </Box>
                  ) : question.media_url.match(/\.(mp3|wav|ogg|m4a)$/i) ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AudioIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        Аудио прикреплено
                      </Typography>
                    </Box>
                  ) : null}
                </Box>
              )}
              
              {/* Черный ящик */}
              {question.blackbox_description && (
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Science sx={{ fontSize: 20, color: 'warning.main' }} />
                    <Typography variant="body2" color="warning.main" fontWeight="medium">
                      Черный ящик
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    {question.blackbox_description}
                  </Typography>
                </Box>
              )}
              
              {/* Источники */}
              {question.sources && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Источники:</strong> {question.sources}
                  </Typography>
                </Box>
              )}
              
              {/* Мета-информация */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                <Chip 
                  label={getQuestionTypeLabel(question.type)} 
                  size="small" 
                  variant="outlined"
                />
                <Chip 
                  label={getAnswerTypeLabel(question.answer_type)} 
                  size="small" 
                  variant="outlined"
                />
                <Chip 
                  label={`${question.points} балл${question.points === 1 ? '' : question.points < 5 ? 'а' : 'ов'}`} 
                  size="small" 
                  color="primary"
                />
                <Chip 
                  label={`${question.time_limit} сек`} 
                  size="small" 
                  color="secondary"
                />
                {question.allow_latex && (
                  <Chip 
                    label="LaTeX" 
                    size="small" 
                    color="info"
                    icon={<Functions sx={{ fontSize: 16 }} />}
                  />
                )}
              </Box>
              
              {/* Варианты ответов */}
              {question.answer_options && question.answer_options.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" fontWeight="medium" sx={{ mb: 1, color: 'text.primary' }}>
                    Варианты ответов:
                  </Typography>
                  {question.answer_options.map((opt, optIndex) => (
                    <Box 
                      key={optIndex} 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 1, 
                        mb: 1,
                        p: 1,
                      }}
                    >
                      <Box
                        sx={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          border: '2px solid',
                          borderColor: opt.is_correct ? 'success.main' : 'grey.500',
                          backgroundColor: opt.is_correct ? 'success.main' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.7rem',
                          color: 'white',
                          fontWeight: 'bold',
                          flexShrink: 0
                        }}
                      >
                        {opt.is_correct ? '✓' : ''}
                      </Box>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          flexGrow: 1,
                          color: opt.is_correct ? 'success.main' : 'text.primary'
                        }}
                      >
                        {opt.option_text}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
              
              {/* Правильный ответ для текстовых вопросов */}
              {question.answer_type === 'text' && question.correct_answer && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" fontWeight="medium" sx={{ mb: 0.5, color: 'text.primary' }}>
                    Правильный ответ:
                  </Typography>
                  <Typography variant="body2" color="success.main" sx={{ fontFamily: 'monospace' }}>
                    {question.correct_answer}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Card>
      ))}
    </Box>
  </Box>
), [questions, testSettings, getQuestionTypeLabel, getAnswerTypeLabel]);

  const handleNext = useCallback(() => {
    if (activeStep === steps.length - 1) {
      handleSubmit();
    } else {
      setActiveStep((prev) => prev + 1);
    }
  }, [activeStep]);

  const handleBack = useCallback(() => {
    if (activeStep === 0) {
      navigate('/dashboard');
    } else {
      setActiveStep((prev) => prev - 1);
    }
  }, [activeStep, navigate]);

  const getTypeId = useCallback((questionType) => {
    const typeMap = {
      'text': 1,
      'blackbox': 2,
      'image': 3,
      'video': 4,
      'audio': 5,
      'code': 6
    };
    return typeMap[questionType] || 1;
  }, []);

  const getAnswerTypeId = useCallback((answerType) => {
    const answerTypeMap = {
      'text': 1,
      'single_choice': 2,
      'multiple_choice': 3
    };
    return answerTypeMap[answerType] || 1;
  }, []);

  const extractErrorMessage = useCallback((error) => {
    if (typeof error === 'string') return error;
    
    if (error.response) {
      const responseData = error.response.data;
      
      if (typeof responseData === 'string') return responseData;
      if (responseData.detail) return responseData.detail;
      if (responseData.message) return responseData.message;
      if (responseData.error) return responseData.error;
      
      if (Array.isArray(responseData)) {
        return responseData.map(item => 
          item.message || item.msg || JSON.stringify(item)
        ).join(', ');
      }
      
      if (typeof responseData === 'object') {
        for (let key in responseData) {
          if (typeof responseData[key] === 'string') return responseData[key];
        }
        return JSON.stringify(responseData);
      }
      
      return `HTTP ${error.response.status}: ${error.response.statusText}`;
    }
    
    if (error.request) return 'Ошибка сети: не удалось подключиться к серверу';
    if (error.message) return error.message;
    
    return String(error);
  }, []);

const handleSubmit = useCallback(async () => {
  setLoading(true);
  setError('');
  setSuccess('');
  
  try {
    if (!testSettings.title.trim()) {
      throw new Error('Название теста обязательно');
    }

    if (questions.length === 0) {
      throw new Error('Добавьте хотя бы один вопрос');
    }

    const invalidQuestions = questions.filter(q => !q.question_text.trim());
    if (invalidQuestions.length > 0) {
      throw new Error('Заполните текст всех вопросов');
    }

    console.log('=== НАЧАЛО СОЗДАНИЯ ТЕСТА ===');
    
    const createdQuestions = [];
    
    for (const [index, question] of questions.entries()) {
      try {
        console.log(`Создание вопроса ${index + 1}:`, question);
        
        const typeId = getTypeId(question.type);
        const answerTypeId = getAnswerTypeId(question.answer_type);
        
        const questionData = {
          question_text: question.question_text,
          type_id: typeId,
          answer_type_id: answerTypeId,
          category_id: question.category_id || 1,
          difficulty: question.difficulty || 1,
          explanation: question.explanation || '',
          time_limit: question.time_limit || 60,
          points: question.points || 1,
          media_url: question.media_url || '',  // ← ДОБАВЬТЕ ЭТО
          sources: question.sources || '',      // ← И ЭТО
          allow_latex: question.allow_latex || false,  // ← И ЭТО
          blackbox_description: question.blackbox_description || '',  // ← И ЭТО
          answer_requirements: question.answer_requirements || ''  // ← И ЭТО
        };

        console.log('Данные для создания вопроса:', questionData);

        if ((question.answer_type === 'single_choice' || question.answer_type === 'multiple_choice') && 
            question.answer_options && question.answer_options.length > 0) {
          
          const validOptions = question.answer_options.filter(opt => opt.option_text.trim());
          if (validOptions.length > 0) {
            questionData.answer_options = validOptions.map((opt, optIndex) => ({
              option_text: opt.option_text,
              is_correct: opt.is_correct || false,
              sort_order: opt.sort_order || optIndex
            }));
          }
        }

        if (question.answer_type === 'text' && question.correct_answer) {
          questionData.correct_answer = question.correct_answer;
        }

        console.log('Финальные данные вопроса:', questionData);

        const questionResponse = await api.post('/questions/', questionData);
        console.log('Вопрос создан успешно:', questionResponse.data);
        
        createdQuestions.push({
          question_id: questionResponse.data.id,
          points: question.points || 1,
          sort_order: index
        });
        
      } catch (questionError) {
        console.error(`Ошибка при создании вопроса ${index + 1}:`, questionError);
        const errorMessage = extractErrorMessage(questionError);
        throw new Error(`Ошибка при создании вопроса ${index + 1}: ${errorMessage}`);
      }
    }

    const testData = {
      title: testSettings.title,
      description: testSettings.description || '',
      time_limit: testSettings.time_limit ? parseInt(testSettings.time_limit) : null,
      max_attempts: parseInt(testSettings.max_attempts) || 1,
      show_results: testSettings.show_results,
      shuffle_questions: testSettings.shuffle_questions,
      shuffle_answers: testSettings.shuffle_answers,
      passing_score: testSettings.passing_score ? parseInt(testSettings.passing_score) : null,
      is_public: testSettings.is_public,
      questions: createdQuestions
    };

    console.log('Данные для создания теста:', testData);

    const response = await api.post('/tests/', testData);
    console.log('Тест создан успешно:', response.data);
    
    setSuccess('Тест успешно создан! Перенаправляем...');
    
    setTimeout(() => {
      navigate('/my-tests');
    }, 1500);
    
  } catch (err) {
    console.error('Критическая ошибка при создании теста:', err);
    const errorMessage = extractErrorMessage(err);
    setError(errorMessage);
  } finally {
    setLoading(false);
  }
}, [testSettings, questions, navigate, getTypeId, getAnswerTypeId, extractErrorMessage]);
  const renderStepContent = useCallback((step) => {
    switch (step) {
      case 0:
        return <TestTypeStep />;
      case 1:
        return <TestSettingsStep />;
      case 2:
        return <QuestionsStep />;
      case 3:
        return <PreviewStep />;
      default:
        return null;
    }
  }, [TestTypeStep, TestSettingsStep, QuestionsStep, PreviewStep]);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Button 
            onClick={handleBack}
            startIcon={<ArrowBack />} 
            sx={{ mr: 2 }}
          >
            Назад
          </Button>
          <Typography variant="h4" component="h1">
            Создание теста
          </Typography>
        </Box>

        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="body1" fontWeight="bold">
              Ошибка:
            </Typography>
            {error}
          </Alert>
        )}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        {renderStepContent(activeStep)}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={loading}
            startIcon={activeStep === steps.length - 1 ? <Save /> : null}
            size="large"
          >
            {loading ? 'Создание...' : activeStep === steps.length - 1 ? 'Создать тест' : 'Далее'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default CreateTest;