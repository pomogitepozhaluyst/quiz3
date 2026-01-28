import React, { useState, useEffect, useRef } from 'react';
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
  Chip,
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
  IconButton,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  AccessTime,
  Quiz,
  Functions,
  Image as ImageIcon,
  Videocam as VideoIcon,
  Audiotrack as AudioIcon,
  CheckCircle,
  Cancel,
  ExpandMore,
  ExpandLess,
  ArrowBack,
  RestartAlt,
  Refresh,
  Code
} from '@mui/icons-material';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';

const mapAnswerTypeIdToType = (answerTypeId) => {
  const mapping = {
    1: 'text',
    2: 'single_choice', 
    3: 'multiple_choice'
  };
  return mapping[answerTypeId] || 'text';
};

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

const BlackboxRenderer = ({ description }) => {
  return (
    <Box sx={{ 
      width: '100%',
      mb: 3,
      p: 3,
      backgroundColor: '#000',
      borderRadius: 2,
      border: '3px solid',
      borderColor: 'primary.main',
      position: 'relative',
      overflow: 'hidden',
      minHeight: '150px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <Box sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(45deg, #000 0%, #111 25%, #000 50%, #111 75%, #000 100%)',
        opacity: 0.3
      }} />
      
      <Box sx={{
        position: 'relative',
        zIndex: 1,
        width: '100%',
        maxWidth: '800px',
        textAlign: 'center'
      }}>
        <Chip 
          icon={<Code />} 
          label="Черный ящик" 
          color="primary" 
          sx={{ 
            mb: 3,
            fontSize: '1rem',
            fontWeight: 'bold',
            py: 1.5,
            px: 2
          }}
        />
        
        <Box sx={{
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          border: '2px solid',
          borderColor: 'primary.main',
          borderRadius: 1,
          p: 3,
          color: '#fff',
          fontFamily: 'monospace',
          fontSize: '1rem',
          lineHeight: 1.6,
          textAlign: 'left',
          maxHeight: '300px',
          overflowY: 'auto'
        }}>
          <Typography 
            component="pre" 
            sx={{ 
              margin: 0,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontFamily: 'monospace',
              color: '#fff'
            }}
          >
            {description}
          </Typography>
        </Box>
        
        <Typography 
          variant="caption" 
          sx={{ 
            display: 'block',
            mt: 2,
            color: 'grey.400',
            fontStyle: 'italic'
          }}
        >
          Изучите описание черного ящика выше
        </Typography>
      </Box>
    </Box>
  );
};

const YouTubePlayer = ({ videoId, title = "YouTube видео" }) => {
  return (
    <Box sx={{ 
      width: '100%',
      mb: 3,
      position: 'relative'
    }}>
      <Chip 
        icon={<VideoIcon />} 
        label={title} 
        color="error" 
        sx={{ mb: 2 }}
      />
      
      <Box sx={{
        position: 'relative',
        width: '100%',
        paddingBottom: '56.25%',
        height: 0,
        overflow: 'hidden',
        borderRadius: 2,
        boxShadow: 3,
        backgroundColor: '#000'
      }}>
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1`}
          title={title}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            border: 'none'
          }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </Box>
    </Box>
  );
};

const MediaRenderer = ({ mediaUrl, type }) => {
  const { theme } = useTheme();
  
  if (!mediaUrl || mediaUrl.trim() === '') {
    return null;
  }

  const isBase64Image = () => mediaUrl.startsWith('data:image/');
  const isBase64Video = () => mediaUrl.startsWith('data:video/');
  const isBase64Audio = () => mediaUrl.startsWith('data:audio/');

  const getContentType = () => {
    if (isBase64Image()) return 'base64-image';
    if (isBase64Video()) return 'base64-video';
    if (isBase64Audio()) return 'base64-audio';
    
    if (type) {
      const lowerType = type.toLowerCase();
      if (['image', 'video', 'audio', 'youtube', 'vimeo'].includes(lowerType)) {
        return lowerType;
      }
    }
    
    const url = mediaUrl.toLowerCase();
    
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return 'youtube';
    }
    if (url.includes('vimeo.com')) {
      return 'vimeo';
    }
    
    if (url.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/)) {
      return 'image';
    }
    if (url.match(/\.(mp4|webm|ogg|mov|avi|mkv|flv|wmv)$/)) {
      return 'video';
    }
    if (url.match(/\.(mp3|wav|ogg|m4a|flac|aac)$/)) {
      return 'audio';
    }
    
    return 'unknown';
  };

  const contentType = getContentType();

  const getCorrectFileUrl = (url) => {
    if (!url) return '';
    
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    if (url.startsWith('data:')) {
      return url;
    }
    
    const backendUrl = 'http://localhost:8000';
    
    if (url.startsWith('/uploads/')) {
      return `${backendUrl}${url}`;
    }
    
    if (url.includes('/')) {
      return `${backendUrl}/${url}`;
    } else {
      if (contentType === 'image' || contentType === 'base64-image') {
        return `${backendUrl}/uploads/images/${url}`;
      } else if (contentType === 'video' || contentType === 'base64-video') {
        return `${backendUrl}/uploads/videos/${url}`;
      } else if (contentType === 'audio' || contentType === 'base64-audio') {
        return `${backendUrl}/uploads/audio/${url}`;
      } else {
        return `${backendUrl}/uploads/${url}`;
      }
    }
  };

  const fileUrl = getCorrectFileUrl(mediaUrl);

  const getYouTubeId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const getVimeoId = (url) => {
    const regExp = /(?:vimeo\.com\/)(\d+)/;
    const match = url.match(regExp);
    return match ? match[1] : null;
  };

  switch (contentType) {
    case 'base64-image':
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
            src={fileUrl}
            alt="Изображение к вопросу"
            sx={{
              maxWidth: '100%',
              maxHeight: '300px',
              height: 'auto',
              width: 'auto',
              borderRadius: 2,
              boxShadow: 2,
              border: '2px solid',
              borderColor: 'primary.main',
              display: 'block',
              margin: '0 auto',
              backgroundColor: theme.palette.mode === 'dark' ? 'grey.800' : 'white',
              objectFit: 'contain'
            }}
          />
        </Box>
      );

    case 'base64-video':
    case 'video':
      return (
        <Box sx={{ mb: 3 }}>
          <Chip 
            icon={<VideoIcon />} 
            label="Видеофайл" 
            color="secondary" 
            sx={{ mb: 2 }}
          />
          <Box sx={{ 
            position: 'relative', 
            borderRadius: 2, 
            overflow: 'hidden', 
            boxShadow: 3 
          }}>
            <video
              src={fileUrl}
              controls
              style={{
                width: '100%',
                height: 'auto',
                maxHeight: '400px',
                aspectRatio: '16 / 9',
                backgroundColor: theme.palette.mode === 'dark' ? '#000' : '#f5f5f5',
                borderRadius: '8px',
                objectFit: 'contain'
              }}
            >
              Ваш браузер не поддерживает видео элементы.
            </video>
          </Box>
        </Box>
      );

    case 'base64-audio':
    case 'audio':
      return (
        <Box sx={{ mb: 3 }}>
          <Chip 
            icon={<AudioIcon />} 
            label="Аудиофайл" 
            color="info" 
            sx={{ mb: 2 }}
          />
          <Box sx={{ 
            p: 3, 
            borderRadius: 2, 
            backgroundColor: theme.palette.mode === 'dark' ? 'grey.800' : 'grey.100',
            border: '2px solid',
            borderColor: 'info.main'
          }}>
            <audio
              controls
              style={{ width: '100%' }}
              src={fileUrl}
            >
              Ваш браузер не поддерживает аудио элементы.
            </audio>
          </Box>
        </Box>
      );

    case 'youtube':
      const youtubeId = getYouTubeId(mediaUrl);
      if (youtubeId) {
        return <YouTubePlayer videoId={youtubeId} title="Видео к вопросу" />;
      }
      break;

    case 'vimeo':
      const vimeoId = getVimeoId(mediaUrl);
      if (vimeoId) {
        return (
          <Box sx={{ mb: 3 }}>
            <Chip 
              icon={<VideoIcon />} 
              label="Vimeo видео" 
              color="success" 
              sx={{ mb: 2 }}
            />
            <Box sx={{ 
              position: 'relative', 
              width: '100%',
              paddingBottom: '56.25%',
              height: 0,
              overflow: 'hidden',
              borderRadius: 2,
              boxShadow: 3,
              backgroundColor: '#000'
            }}>
              <Box sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%'
              }}>
                <iframe
                  src={`https://player.vimeo.com/video/${vimeoId}`}
                  title="Vimeo видео"
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none'
                  }}
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                />
              </Box>
            </Box>
          </Box>
        );
      }
      break;
  }

  return null;
};

const CorrectAnswerDisplay = ({ 
  question, 
  userAnswer,
  isCorrect,
  pointsEarned,
  resultsMode,
  testCompleted,
  showScore = false
}) => {
  const [expanded, setExpanded] = useState(false);
  const { theme } = useTheme();
  
  const canShowDetails = () => {
    switch (resultsMode) {
      case 'immediately':
        return true;
      case 'after_completion':
        return testCompleted;
      case 'after_deadline':
        return testCompleted;
      case 'never':
        return false;
      default:
        return testCompleted;
    }
  };
  
  const canShowResult = () => {
    switch (resultsMode) {
      case 'immediately':
        return true;
      case 'after_completion':
        return testCompleted;
      case 'after_deadline':
        return testCompleted;
      case 'never':
        return false;
      default:
        return testCompleted;
    }
  };
  
  const answerType = mapAnswerTypeIdToType(question.answer_type_id);
  
  const getCorrectAnswers = () => {
    if (answerType === 'text') {
      return question.correct_answer ? [question.correct_answer] : [];
    } else if (answerType === 'single_choice' || answerType === 'multiple_choice') {
      return question.answer_options
        ?.filter(option => option.is_correct)
        .map(option => option.option_text) || [];
    }
    return [];
  };
  
  const getUserAnswerText = () => {
    if (!userAnswer) return 'Нет ответа';
    
    if (userAnswer.answer_text) {
      return userAnswer.answer_text;
    } else if (userAnswer.selected_options && question.answer_options) {
      const selectedOptions = Array.isArray(userAnswer.selected_options) 
        ? userAnswer.selected_options 
        : JSON.parse(userAnswer.selected_options || '[]');
      
      const selectedTexts = question.answer_options
        .filter(option => selectedOptions.includes(option.id))
        .map(option => option.option_text);
      
      return selectedTexts.join(', ');
    }
    
    return 'Нет ответа';
  };
  
  const correctAnswers = getCorrectAnswers();
  
  if (!canShowResult()) {
    return null;
  }
  
  if (!canShowDetails()) {
    return (
      <Card variant="outlined" sx={{ mt: 3, borderColor: isCorrect ? 'success.main' : 'error.main' }}>
        <CardContent sx={{ py: 1 }}>
          <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {isCorrect ? (
              <CheckCircle sx={{ color: 'success.main', fontSize: 18 }} />
            ) : (
              <Cancel sx={{ color: 'error.main', fontSize: 18 }} />
            )}
            {isCorrect ? 'Правильно!' : 'Неправильно'}
            {showScore && (
              <Chip 
                label={`+${pointsEarned || 0} баллов`}
                size="small"
                color={isCorrect ? "success" : "error"}
                sx={{ ml: 1 }}
              />
            )}
          </Typography>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card variant="outlined" sx={{ mt: 3, borderColor: isCorrect ? 'success.main' : 'error.main' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {isCorrect ? (
              <CheckCircle sx={{ color: 'success.main' }} />
            ) : (
              <Cancel sx={{ color: 'error.main' }} />
            )}
            {isCorrect ? 'Правильно!' : 'Неправильно'}
            <Chip 
              label={`+${pointsEarned || 0} баллов`}
              size="small"
              color={isCorrect ? "success" : "error"}
              sx={{ ml: 2 }}
            />
          </Typography>
          <IconButton onClick={() => setExpanded(!expanded)} size="small">
            {expanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Box>
        
        <Collapse in={expanded}>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Ваш ответ:
                </Typography>
                <Box sx={{ 
                  p: 2, 
                  borderRadius: 1, 
                  bgcolor: theme.palette.mode === 'dark' ? 'grey.800' : 'grey.100',
                  border: '1px solid',
                  borderColor: 'grey.300'
                }}>
                  <LatexRenderer text={getUserAnswerText()} />
                </Box>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Правильный ответ{correctAnswers.length > 1 ? 'ы' : ''}:
                </Typography>
                <Box sx={{ 
                  p: 2, 
                  borderRadius: 1, 
                  bgcolor: theme.palette.mode === 'dark' ? 'success.dark' : 'success.light',
                  border: '1px solid',
                  borderColor: 'success.main',
                  color: theme.palette.mode === 'dark' ? 'white' : 'inherit'
                }}>
                  {correctAnswers.length > 0 ? (
                    <List dense>
                      {correctAnswers.map((answer, index) => (
                        <ListItem key={index} sx={{ py: 0.5 }}>
                          <ListItemIcon sx={{ minWidth: 30 }}>
                            <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} />
                          </ListItemIcon>
                          <ListItemText>
                            <LatexRenderer text={answer} />
                          </ListItemText>
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" fontStyle="italic">
                      Правильный ответ не указан
                    </Typography>
                  )}
                </Box>
              </Grid>
            </Grid>
            
            {question.explanation && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Объяснение:
                </Typography>
                <Box sx={{ 
                  p: 2, 
                  borderRadius: 1, 
                  bgcolor: theme.palette.mode === 'dark' ? 'info.dark' : 'info.light',
                  border: '1px solid',
                  borderColor: 'info.main'
                }}>
                  <Typography variant="body2">
                    {question.explanation}
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
};

const TakeTest = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { theme } = useTheme();
  
  const assignmentId = location.state?.assignmentId;
  const [test, setTest] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [savedAnswers, setSavedAnswers] = useState({});
  const [questionTimeLeft, setQuestionTimeLeft] = useState(null);
  const [totalTimeLeft, setTotalTimeLeft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [timeUpDialog, setTimeUpDialog] = useState(false);
  const [leaveConfirmDialog, setLeaveConfirmDialog] = useState(false);
  const [testCompleted, setTestCompleted] = useState(false);
  const [shake, setShake] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completionData, setCompletionData] = useState(null);
  const [questionResults, setQuestionResults] = useState({});
  const [resultsMode, setResultsMode] = useState('after_completion');
  const [testDataWithAnswers, setTestDataWithAnswers] = useState(null);
  const [showingResult, setShowingResult] = useState(false);
  const [autoNextTimer, setAutoNextTimer] = useState(null);
  const [shuffledQuestions, setShuffledQuestions] = useState([]);
  const [shuffledAnswerOptions, setShuffledAnswerOptions] = useState({});
  
  const questionTimerRef = useRef(null);
  const totalTimerRef = useRef(null);
  const [actualTimeSpent, setActualTimeSpent] = useState(0);
  const [startTime, setStartTime] = useState(null);

  useEffect(() => {
    const state = location.state || {};
    
    if (state.sessionId) {
      setSessionId(state.sessionId);
      
      if (state.testData) {
        initializeTest(state.testData);
      } else {
        loadTest();
      }
    } else {
      navigate(`/test/${testId}/intro`);
    }
  }, [testId, location, user, navigate]);

  useEffect(() => {
    return () => {
      if (questionTimerRef.current) {
        clearInterval(questionTimerRef.current);
      }
      if (totalTimerRef.current) {
        clearInterval(totalTimerRef.current);
      }
      if (autoNextTimer) {
        clearTimeout(autoNextTimer);
      }
    };
  }, [autoNextTimer]);

  useEffect(() => {
    if (!startTime || testCompleted) return;
    
    const timer = setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      setActualTimeSpent(elapsedSeconds);
    }, 1000);
    
    return () => clearInterval(timer);
  }, [startTime, testCompleted]);

  const loadTest = async () => {
    try {
      setLoading(true);
      
      const response = await api.get(`/tests/${testId}/full`);
      const testData = response.data;
      
      initializeTest(testData);
      
    } catch (error) {
      setError('Ошибка загрузки теста: ' + (error.response?.data?.detail || error.message));
      setLoading(false);
    }
  };

  const initializeTest = (testData) => {
    if (!testData.questions || testData.questions.length === 0) {
      setError('Тест не содержит вопросов');
      setLoading(false);
      return;
    }

    setTest(testData);
    setTestDataWithAnswers(testData);
    
    if (testData.show_results) {
      setResultsMode(testData.show_results);
    }
    
    if (testData.time_limit) {
      setTotalTimeLeft(testData.time_limit * 60);
    }
    
    let questionsToUse = [...testData.questions];
    
    if (testData.shuffle_questions) {
      questionsToUse = shuffleArray([...questionsToUse]);
    }
    
    setShuffledQuestions(questionsToUse);
    
    const shuffledOptions = {};
    questionsToUse.forEach((questionItem, index) => {
      const question = questionItem.question || questionItem;
      
      if (question.answer_options && question.answer_options.length > 0) {
        let options = [...question.answer_options];
        
        if (testData.shuffle_answers && question.type?.name !== 'blackbox') {
          options = shuffleArray([...options]);
        }
        
        shuffledOptions[question.id] = options;
      }
    });
    
    setShuffledAnswerOptions(shuffledOptions);
    
    const firstQuestion = getCurrentQuestionDataFromShuffled(questionsToUse, 0);
    if (firstQuestion) {
      setQuestionTimeLeft(firstQuestion.time_limit || 60);
    }
    
    if (!startTime) {
      setStartTime(Date.now());
    }
    
    setLoading(false);
  };

  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const getCurrentQuestionDataFromShuffled = (questionsArray, index) => {
    if (!questionsArray || !questionsArray[index]) return null;
    
    const questionItem = questionsArray[index];
    
    if (questionItem.question) {
      return {
        id: questionItem.question.id,
        question_text: questionItem.question.question_text,
        time_limit: questionItem.question.time_limit,
        answer_type_id: questionItem.question.answer_type_id,
        answer_options: shuffledAnswerOptions[questionItem.question.id] || questionItem.question.answer_options || [],
        media_url: questionItem.question.media_url,
        blackbox_description: questionItem.question.blackbox_description,
        correct_answer: questionItem.question.correct_answer,
        explanation: questionItem.question.explanation,
        type_name: questionItem.question.type?.name,
        points: questionItem.points || questionItem.question.points || 1,
      };
    } else {
      return {
        id: questionItem.id,
        question_text: questionItem.question_text,
        time_limit: questionItem.time_limit,
        answer_type_id: questionItem.answer_type_id,
        answer_options: shuffledAnswerOptions[questionItem.id] || questionItem.answer_options || [],
        media_url: questionItem.media_url,
        blackbox_description: questionItem.blackbox_description,
        correct_answer: questionItem.correct_answer,
        explanation: questionItem.explanation,
        type_name: questionItem.type?.name,
        points: questionItem.points || 1
      };
    }
  };

  const getCurrentQuestionData = (testData, index) => {
    if (!testData.questions || !testData.questions[index]) return null;
    
    const questionItem = testData.questions[index];
    
    if (questionItem.question) {
      return {
        id: questionItem.question.id,
        question_text: questionItem.question.question_text,
        time_limit: questionItem.question.time_limit,
        answer_type_id: questionItem.question.answer_type_id,
        answer_options: questionItem.question.answer_options || [],
        media_url: questionItem.question.media_url,
        blackbox_description: questionItem.question.blackbox_description,
        correct_answer: questionItem.question.correct_answer,
        explanation: questionItem.question.explanation,
        type_name: questionItem.question.type?.name,
        points: questionItem.points || questionItem.question.points || 1,
      };
    } else {
      return {
        id: questionItem.id,
        question_text: questionItem.question_text,
        time_limit: questionItem.time_limit,
        answer_type_id: questionItem.answer_type_id,
        answer_options: questionItem.answer_options || [],
        media_url: questionItem.media_url,
        blackbox_description: questionItem.blackbox_description,
        correct_answer: questionItem.correct_answer,
        explanation: questionItem.explanation,
        type_name: questionItem.type?.name,
        points: questionItem.points || 1
      };
    }
  };

  const getCurrentQuestion = () => {
    if (!shuffledQuestions.length) {
      if (!test) return null;
      return getCurrentQuestionData(test, currentQuestion);
    }
    
    return getCurrentQuestionDataFromShuffled(shuffledQuestions, currentQuestion);
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

  const saveAnswer = async (questionId, answerData) => {
    try {
      if (!sessionId) {
        return;
      }

      const dataToSend = {
        ...answerData,
        assignment_id: assignmentId,
        test_id: test?.id || testId
      };

      const response = await api.post(`/test-sessions/${sessionId}/answers`, dataToSend);
      
      const serverResult = response.data;
      
      setQuestionResults(prev => ({
        ...prev,
        [questionId]: {
          is_correct: serverResult?.is_correct || false,
          points_earned: serverResult?.points_earned || 0,
          saved: true,
          server_response: serverResult
        }
      }));
      
      setSavedAnswers(prev => ({
        ...prev,
        [questionId]: {
          ...dataToSend,
          server_result: serverResult
        }
      }));
      
      if (resultsMode === 'immediately') {
        setShowingResult(true);
        
        const timer = setTimeout(() => {
          moveToNextQuestion();
          setShowingResult(false);
        }, 3000);
        
        setAutoNextTimer(timer);
      }
      
      return serverResult;
      
    } catch (error) {
      throw error;
    }
  };

  const moveToNextQuestion = () => {
    const questionsArray = shuffledQuestions.length > 0 ? shuffledQuestions : test.questions;
    
    if (currentQuestion < questionsArray.length - 1) {
      setCurrentQuestion(prev => {
        const nextIndex = prev + 1;
        const nextQuestion = getCurrentQuestionDataFromShuffled(questionsArray, nextIndex);
        if (nextQuestion) {
          setQuestionTimeLeft(nextQuestion.time_limit || 60);
        }
        setShake(false);
        return nextIndex;
      });
    } else {
      handleFinishTest();
    }
  };

  const handleNext = async () => {
    if (resultsMode === 'immediately' && showingResult && autoNextTimer) {
      clearTimeout(autoNextTimer);
      setAutoNextTimer(null);
      setShowingResult(false);
      moveToNextQuestion();
      return;
    }

    const currentQuestionData = getCurrentQuestion();
    
    if (currentQuestionData && sessionId) {
      try {
        let answerData = {
          question_id: currentQuestionData.id,
          time_spent: 60 - (questionTimeLeft || 0),
          test_id: test?.id || testId,
          assignment_id: assignmentId
        };

        const currentAnswer = answers[currentQuestionData.id];
        
        if (currentAnswer) {
          if (currentAnswer.type === 'text' && currentAnswer.text) {
            answerData.answer_text = currentAnswer.text;
          } else if ((currentAnswer.type === 'single_choice' || currentAnswer.type === 'multiple_choice') && 
                     currentAnswer.selected_options) {
            answerData.selected_options = JSON.stringify(currentAnswer.selected_options);
          }
          
          await saveAnswer(currentQuestionData.id, answerData);
          
          if (resultsMode !== 'immediately') {
            moveToNextQuestion();
          }
        } else {
          moveToNextQuestion();
        }

      } catch (error) {
        setError(`Ошибка сохранения: ${error.response?.data?.detail || error.message}`);
        moveToNextQuestion();
      }
    } else {
      moveToNextQuestion();
    }
  };

  const handleFinishTest = async () => {
    try {
      setSubmitting(true);
      
      const finalTimeSpent = actualTimeSpent;
      
      const currentQuestionData = getCurrentQuestion();
      if (currentQuestionData) {
        const currentAnswer = answers[currentQuestionData.id];
        if (currentAnswer) {
          try {
            let answerData = {
              question_id: currentQuestionData.id,
              time_spent: 60 - (questionTimeLeft || 0),
              test_id: test?.id || testId,
              assignment_id: assignmentId
            };

            if (currentAnswer.type === 'text' && currentAnswer.text) {
              answerData.answer_text = currentAnswer.text;
            } else if ((currentAnswer.type === 'single_choice' || currentAnswer.type === 'multiple_choice') && 
                       currentAnswer.selected_options) {
              answerData.selected_options = JSON.stringify(currentAnswer.selected_options);
            }
            
            await saveAnswer(currentQuestionData.id, answerData);
          } catch (saveError) {}
        }
      }
      
      const finishData = {
        test_id: test?.id || testId,
        assignment_id: assignmentId,
        time_spent: finalTimeSpent
      };
      
      let response;
      try {
        response = await api.post(`/test-sessions/${sessionId}/finish`, finishData);
      } catch (finishError) {
        response = await api.post(`/test-sessions/${sessionId}/complete`, finishData);
      }
      
      const completionDataWithTime = {
        ...response.data,
        time_spent: response.data.time_spent || finalTimeSpent
      };
      
      setCompletionData(completionDataWithTime);
      setTestCompleted(true);
      
      if (questionTimerRef.current) {
        clearInterval(questionTimerRef.current);
        questionTimerRef.current = null;
      }
      if (totalTimerRef.current) {
        clearInterval(totalTimerRef.current);
        totalTimerRef.current = null;
      }
      
    } catch (error) {
      setError(`Ошибка завершения теста: ${error.response?.data?.detail || error.message}`);
    } finally {
      setSubmitting(false);
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
    if (questionTimerRef.current) {
      clearInterval(questionTimerRef.current);
      questionTimerRef.current = null;
    }

    if (questionTimeLeft !== null && !testCompleted && !showingResult) {
      questionTimerRef.current = setInterval(() => {
        setQuestionTimeLeft(prev => {
          if (prev === null || prev <= 0) return 0;
          
          if (prev <= 11 && prev > 0) setShake(true);
          if (prev <= 1) {
            if (questionTimerRef.current) {
              clearInterval(questionTimerRef.current);
              questionTimerRef.current = null;
            }
            handleNext();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (questionTimerRef.current) {
        clearInterval(questionTimerRef.current);
        questionTimerRef.current = null;
      }
    };
  }, [questionTimeLeft, testCompleted, showingResult]);

  useEffect(() => {
    if (totalTimerRef.current) {
      clearInterval(totalTimerRef.current);
      totalTimerRef.current = null;
    }

    if (totalTimeLeft !== null && !testCompleted) {
      totalTimerRef.current = setInterval(() => {
        setTotalTimeLeft(prev => {
          if (prev === null || prev <= 0) return 0;
          
          if (prev <= 1) {
            if (totalTimerRef.current) {
              clearInterval(totalTimerRef.current);
              totalTimerRef.current = null;
            }
            setTimeUpDialog(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (totalTimerRef.current) {
        clearInterval(totalTimerRef.current);
        totalTimerRef.current = null;
      }
    };
  }, [totalTimeLeft, testCompleted]);

  const handleTimeUp = () => {
    setTimeUpDialog(false);
    handleFinishTest();
  };

  const handleRestartQuestion = () => {
    const currentQuestionData = getCurrentQuestion();
    if (currentQuestionData) {
      setQuestionTimeLeft(currentQuestionData.time_limit || 60);
    }
    setShake(false);
  };

  const ProgressDots = () => {
    const questionsArray = shuffledQuestions.length > 0 ? shuffledQuestions : test.questions;
    
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 3 }}>
        {questionsArray.map((_, index) => (
          <Box
            key={index}
            onClick={() => {
              if (!testCompleted && !showingResult) {
                const question = getCurrentQuestionDataFromShuffled(questionsArray, index);
                setCurrentQuestion(index);
                if (question) {
                  setQuestionTimeLeft(question.time_limit || 60);
                }
              }
            }}
            sx={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              bgcolor: index === currentQuestion 
                ? 'primary.main' 
                : index < currentQuestion 
                  ? resultsMode === 'immediately' && questionResults[questionsArray[index]?.id || questionsArray[index]?.question?.id]?.is_correct
                    ? 'success.main'
                    : resultsMode === 'immediately' && questionResults[questionsArray[index]?.id || questionsArray[index]?.question?.id]?.saved
                    ? 'error.main'
                    : 'grey.400'
                  : 'grey.300',
              transition: 'all 0.3s ease',
              cursor: !testCompleted && !showingResult ? 'pointer' : 'default',
              '&:hover': !testCompleted && !showingResult ? {
                transform: 'scale(1.2)',
                boxShadow: 2
              } : {},
              position: 'relative'
            }}
            title={`Вопрос ${index + 1}`}
          >
            {test?.shuffle_questions && index < currentQuestion && (
              <Typography 
                variant="caption" 
                sx={{ 
                  position: 'absolute',
                  top: -20,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: '0.6rem',
                  color: 'text.secondary'
                }}
              >
                #{index + 1}
              </Typography>
            )}
          </Box>
        ))}
      </Box>
    );
  };

  const QuestionTimer = () => {
    const currentQuestionData = getCurrentQuestion();
    const questionTimeLimit = currentQuestionData?.time_limit || 60;
    const progress = questionTimeLeft !== null && questionTimeLimit > 0 
      ? (questionTimeLeft / questionTimeLimit) * 100 
      : 0;

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
              bgcolor: theme.palette.mode === 'dark' ? 'grey.700' : 'grey.200',
              '& .MuiLinearProgress-bar': {
                backgroundColor: questionTimeLeft < 11 ? 'error.main' : 'primary.main'
              }
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
            {questionTimeLeft !== null ? `${questionTimeLeft}с` : '∞'}
          </Typography>
        </Box>

        <Zoom in={questionTimeLeft !== null && questionTimeLeft < 11 && !testCompleted}>
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
    const savedAnswer = savedAnswers[currentQuestionData.id];
    const result = questionResults[currentQuestionData.id];
    
    const answerType = mapAnswerTypeIdToType(currentQuestionData.answer_type_id);
    
    let showResult = false;
    let showDetails = false;
    
    if (result?.saved) {
      switch (resultsMode) {
        case 'immediately':
          showResult = true;
          showDetails = true;
          break;
        case 'after_completion':
          showResult = testCompleted;
          showDetails = testCompleted;
          break;
        case 'after_deadline':
          showResult = testCompleted;
          showDetails = testCompleted;
          break;
        case 'never':
          showResult = false;
          showDetails = false;
          break;
        default:
          showResult = testCompleted;
          showDetails = testCompleted;
      }
    }
    
    const isDisabled = testCompleted || showingResult || (result?.saved && resultsMode !== 'immediately');

    const currentQuestionFromData = testDataWithAnswers?.questions?.find(
      q => q.id === currentQuestionData.id || 
          (q.question && q.question.id === currentQuestionData.id)
    );
    
    const questionWithCorrectAnswers = currentQuestionFromData?.question || currentQuestionFromData || currentQuestionData;

    const answerOptions = shuffledAnswerOptions[currentQuestionData.id] || 
                         currentQuestionData.answer_options || 
                         [];
    
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
              disabled={isDisabled}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: showResult ? 
                    (result?.is_correct ? 'success.light' : 'error.light') : 
                    theme.palette.mode === 'dark' ? 'grey.800' : 'inherit'
                }
              }}
            />
            
            {result && showResult && (
              <CorrectAnswerDisplay
                question={questionWithCorrectAnswers}
                userAnswer={savedAnswer}
                isCorrect={result.is_correct}
                pointsEarned={result.points_earned}
                resultsMode={resultsMode}
                testCompleted={testCompleted}
                showScore={showResult}
              />
            )}
          </Box>
        );

      case 'single_choice':
        return (
          <Box>
            <Typography variant="h6" gutterBottom color="text.secondary" sx={{ mb: 2 }}>
              Выберите один вариант:
            </Typography>
            <FormControl component="fieldset" fullWidth disabled={isDisabled}>
              <RadioGroup
                value={currentAnswer.selected_options?.[0] || ''}
                onChange={(e) => handleSingleChoiceChange(currentQuestionData.id, parseInt(e.target.value))}
              >
                {answerOptions.map((option, index) => {
                  const isCorrect = option.is_correct;
                  const isSelected = currentAnswer.selected_options?.includes(option.id);
                  const showCorrect = showDetails && isCorrect;
                  
                  return (
                    <FormControlLabel
                      key={option.id}
                      value={option.id}
                      control={<Radio />}
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {showCorrect && (
                            <CheckCircle sx={{ color: 'success.main', fontSize: 20 }} />
                          )}
                          <LatexRenderer text={option.option_text} />
                        </Box>
                      }
                      sx={{ 
                        mb: 1,
                        p: 1,
                        borderRadius: 1,
                        border: '2px solid',
                        borderColor: showCorrect ? 'success.main' : 
                                   isSelected && showDetails ? 'error.main' : 'divider',
                        backgroundColor: showCorrect ? 'success.light' : 
                                       isSelected && showDetails ? 'error.light' : 
                                       isSelected ? 'primary.light' : 'transparent',
                        '&:hover': !isDisabled && {
                          backgroundColor: 'action.hover'
                        }
                      }}
                    />
                  );
                })}
              </RadioGroup>
            </FormControl>
            
            {result && showResult && (
              <CorrectAnswerDisplay
                question={questionWithCorrectAnswers}
                userAnswer={savedAnswer}
                isCorrect={result.is_correct}
                pointsEarned={result.points_earned}
                resultsMode={resultsMode}
                testCompleted={testCompleted}
                showScore={showResult}
              />
            )}
          </Box>
        );

      case 'multiple_choice':
        return (
          <Box>
            <Typography variant="h6" gutterBottom color="text.secondary" sx={{ mb: 2 }}>
              Выберите один или несколько вариантов:
            </Typography>
            <FormControl component="fieldset" fullWidth disabled={isDisabled}>
              <FormGroup>
                {answerOptions.map((option, index) => {
                  const isCorrect = option.is_correct;
                  const isSelected = currentAnswer.selected_options?.includes(option.id);
                  const showCorrect = showDetails && isCorrect;
                  
                  return (
                    <FormControlLabel
                      key={option.id}
                      control={
                        <Checkbox
                          checked={isSelected || false}
                          onChange={(e) => handleMultipleChoiceChange(
                            currentQuestionData.id, 
                            option.id, 
                            e.target.checked
                          )}
                          color={showCorrect ? "success" : "primary"}
                        />
                      }
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {showCorrect && (
                            <CheckCircle sx={{ color: 'success.main', fontSize: 20 }} />
                          )}
                          <LatexRenderer text={option.option_text} />
                        </Box>
                      }
                      sx={{ 
                        mb: 1,
                        p: 1,
                        borderRadius: 1,
                        border: '2px solid',
                        borderColor: showCorrect ? 'success.main' : 
                                   isSelected && showDetails ? 'error.main' : 'divider',
                        backgroundColor: showCorrect ? 'success.light' : 
                                       isSelected && showDetails ? 'error.light' : 
                                       isSelected ? 'primary.light' : 'transparent',
                        '&:hover': !isDisabled && {
                          backgroundColor: 'action.hover'
                        }
                      }}
                    />
                  );
                })}
              </FormGroup>
            </FormControl>
            
            {result && showResult && (
              <CorrectAnswerDisplay
                question={questionWithCorrectAnswers}
                userAnswer={savedAnswer}
                isCorrect={result.is_correct}
                pointsEarned={result.points_earned}
                resultsMode={resultsMode}
                testCompleted={testCompleted}
                showScore={showResult}
              />
            )}
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
              disabled={isDisabled}
            />
            
            {result && showResult && (
              <CorrectAnswerDisplay
                question={questionWithCorrectAnswers}
                userAnswer={savedAnswer}
                isCorrect={result.is_correct}
                pointsEarned={result.points_earned}
                resultsMode={resultsMode}
                testCompleted={testCompleted}
                showScore={showResult}
              />
            )}
          </Box>
        );
    }
  };

  const isAnswerProvided = () => {
    const currentQuestionData = getCurrentQuestion();
    if (!currentQuestionData) return false;

    const currentAnswer = answers[currentQuestionData.id];
    if (!currentAnswer) return false;

    const answerType = mapAnswerTypeIdToType(currentQuestionData.answer_type_id);
    
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
          startIcon={<ArrowBack />}
        >
          Вернуться к списку тестов
        </Button>
      </Container>
    );
  }

  if (testCompleted) {
    return (
      <TestCompleted 
        completionData={completionData}
        resultsMode={resultsMode}
        test={test}
        savedAnswers={savedAnswers}
        questionResults={questionResults}
        testDataWithAnswers={testDataWithAnswers}
        actualTimeSpent={actualTimeSpent}
        onReturn={() => {
          const groupId = location.state?.groupId;
          if (groupId) {
            navigate(`/groups/${groupId}`);
          } else {
            navigate('/dashboard');
          }
        }}
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
          startIcon={<ArrowBack />}
        >
          Вернуться к списку тестов
        </Button>
      </Container>
    );
  }

  const result = questionResults[currentQuestionData.id];
  const isShowingResult = resultsMode === 'immediately' && showingResult && result?.saved;

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ 
        p: 3, 
        position: 'relative',
        backgroundColor: theme.palette.mode === 'dark' ? 'grey.900' : 'white'
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              {test.title}
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Chip 
                size="small"
                label={
                  resultsMode === 'immediately' ? 'Результаты сразу' :
                  resultsMode === 'after_completion' ? 'Результаты после завершения' :
                  resultsMode === 'after_deadline' ? 'Результаты после дедлайна' :
                  'Результаты скрыты'
                }
                color={
                  resultsMode === 'never' ? 'default' :
                  resultsMode === 'immediately' ? 'success' :
                  resultsMode === 'after_deadline' ? 'warning' : 'info'
                }
                variant="outlined"
              />
              
              {test?.shuffle_questions && (
                <Tooltip title="Вопросы перемешаны в случайном порядке">
                  <Chip 
                    size="small"
                    label="Вопросы перемешаны"
                    icon={<Refresh sx={{ fontSize: 14 }} />}
                    color="primary"
                    variant="outlined"
                  />
                </Tooltip>
              )}
              
              {test?.shuffle_answers && (
                <Tooltip title="Варианты ответов перемешаны">
                  <Chip 
                    size="small"
                    label="Ответы перемешаны"
                    icon={<Refresh sx={{ fontSize: 14 }} />}
                    color="secondary"
                    variant="outlined"
                  />
                </Tooltip>
              )}
              
              {resultsMode === 'after_deadline' && test.end_date && (
                <Typography variant="caption" color="text.secondary">
                  Дедлайн: {new Date(test.end_date).toLocaleDateString('ru-RU')}
                </Typography>
              )}
            </Box>
            
            {error && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            
            {isShowingResult && (
              <Fade in={true}>
                <Alert 
                  severity={result.is_correct ? "success" : "error"}
                  sx={{ mb: 2 }}
                  action={
                    <Button 
                      color="inherit" 
                      size="small" 
                      onClick={handleNext}
                    >
                      Далее сейчас
                    </Button>
                  }
                >
                  {result.is_correct 
                    ? `Правильно! +${result.points_earned} баллов. Автопереход через 3 сек...` 
                    : 'Неправильно! Автопереход через 3 сек...'}
                </Alert>
              </Fade>
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
              backgroundColor: theme.palette.mode === 'dark' ? 'grey.800' : 'transparent',
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
            {currentQuestionData.media_url && (
              <MediaRenderer 
                mediaUrl={currentQuestionData.media_url} 
                type={currentQuestionData.type_name}
              />
            )}

            {currentQuestionData.blackbox_description && (
              <BlackboxRenderer description={currentQuestionData.blackbox_description} />
            )}

            <Box sx={{ textAlign: 'center', width: '100%' }}>
              <LatexRenderer text={currentQuestionData.question_text} />
            </Box>
          </Box>
        </Fade>

        {renderAnswerInput()}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
          <Button
            onClick={() => setLeaveConfirmDialog(true)}
            color="inherit"
            startIcon={<ArrowBack />}
            disabled={submitting || showingResult}
          >
            Выйти
          </Button>
          
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={(!isAnswerProvided() && !showingResult) || submitting || testCompleted}
            size="large"
          >
            {submitting ? 'Сохранение...' : 
             showingResult ? 'Далее сейчас' :
             currentQuestion === test.questions.length - 1 ? 'Завершить тест' : 'Далее'}
          </Button>
        </Box>
      </Paper>

      <Dialog open={leaveConfirmDialog} onClose={() => setLeaveConfirmDialog(false)}>
        <DialogTitle>Подтверждение выхода</DialogTitle>
        <DialogContent>
          <Typography>
            {testCompleted 
              ? 'Тест завершен. Хотите вернуться?' 
              : 'Тест не завершен. Все несохраненные ответы будут потеряны. Вы уверены, что хотите выйти?'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLeaveConfirmDialog(false)}>
            Остаться
          </Button>
          <Button 
            onClick={() => navigate('/dashboard')} 
            color="error" 
            variant="contained"
          >
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

const TestCompleted = ({ 
  completionData, 
  resultsMode, 
  test, 
  savedAnswers, 
  questionResults,
  testDataWithAnswers,
  actualTimeSpent,
  onReturn 
}) => {
  const { theme } = useTheme();
  
  const calculateScores = () => {
    if (completionData?.score !== undefined && completionData?.max_score !== undefined) {
      return {
        score: completionData.score,
        maxScore: completionData.max_score,
        percentage: completionData.percentage || 0
      };
    }
    
    let totalScore = 0;
    let totalMaxScore = 0;
    
    if (testDataWithAnswers?.questions && questionResults) {
      testDataWithAnswers.questions.forEach(questionData => {
        const question = questionData.question || questionData;
        const result = questionResults[question.id];
        
        if (result) {
          totalScore += result.points_earned || 0;
          totalMaxScore += questionData.points || question.points || 1;
        } else {
          totalMaxScore += questionData.points || question.points || 1;
        }
      });
    }
    
    const percentage = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;
    
    return {
      score: totalScore,
      maxScore: totalMaxScore,
      percentage: percentage
    };
  };
  
  const scores = calculateScores();
  const score = scores.score;
  const maxScore = scores.maxScore;
  const percentage = scores.percentage;
  
  const timeSpent = completionData?.time_spent > 0 ? completionData.time_spent : actualTimeSpent || 0;
  
  const formatTime = (seconds) => {
    if (!seconds && seconds !== 0) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };
  
  const getScoreColor = (percentage) => {
    if (percentage >= 90) return '#2e7d32';
    if (percentage >= 70) return '#4caf50';
    if (percentage >= 50) return '#ff9800';
    return '#f44336';
  };
  
  const scoreColor = getScoreColor(percentage);
  
  const canShowScore = () => {
    switch (resultsMode) {
      case 'never':
        return false;
      case 'after_deadline':
        if (test && test.end_date) {
          const now = new Date();
          const endDate = new Date(test.end_date);
          return now >= endDate;
        }
        return true;
      default:
        return true;
    }
  };
  
  const showScore = canShowScore();
  
  const renderQuestionResults = () => {
    if (!testDataWithAnswers?.questions) return null;
    
    return (
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          Результаты по вопросам:
        </Typography>
        
        {testDataWithAnswers.questions.map((questionData, index) => {
          const question = questionData.question || questionData;
          const result = questionResults[question.id];
          const savedAnswer = savedAnswers[question.id];
          
          if (!result) return null;
          
          const answerType = mapAnswerTypeIdToType(question.answer_type_id);
          
          const getUserAnswerText = () => {
            if (!savedAnswer) return 'Нет ответа';
            
            if (savedAnswer.answer_text) {
              return savedAnswer.answer_text;
            } else if (savedAnswer.selected_options && question.answer_options) {
              const selectedOptions = Array.isArray(savedAnswer.selected_options) 
                ? savedAnswer.selected_options 
                : JSON.parse(savedAnswer.selected_options || '[]');
              
              const selectedTexts = question.answer_options
                .filter(option => selectedOptions.includes(option.id))
                .map(option => option.option_text);
              
              return selectedTexts.join(', ');
            }
            return 'Нет ответа';
          };
          
          return (
            <Card key={question.id} variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    Вопрос {index + 1}
                  </Typography>
                  <Chip 
                    label={result.is_correct ? `+${result.points_earned || 1} баллов` : '0 баллов'}
                    color={result.is_correct ? 'success' : 'error'}
                    size="small"
                  />
                </Box>
                
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
                  {question.question_text}
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" fontWeight="bold" color="text.secondary">
                      Ваш ответ:
                    </Typography>
                    <Box sx={{ 
                      p: 1.5, 
                      borderRadius: 1, 
                      bgcolor: theme.palette.mode === 'dark' ? 'grey.800' : 'grey.100',
                      mt: 0.5
                    }}>
                      <Typography variant="body2">
                        {getUserAnswerText()}
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" fontWeight="bold" color="text.secondary">
                      Правильный ответ:
                    </Typography>
                    <Box sx={{ 
                      p: 1.5, 
                      borderRadius: 1, 
                      bgcolor: result.is_correct 
                        ? (theme.palette.mode === 'dark' ? 'success.dark' : 'success.light') 
                        : (theme.palette.mode === 'dark' ? 'error.dark' : 'error.light'),
                      mt: 0.5
                    }}>
                      {answerType === 'text' && question.correct_answer ? (
                        <Typography variant="body2">
                          {question.correct_answer}
                        </Typography>
                      ) : answerType === 'single_choice' || answerType === 'multiple_choice' ? (
                        <ul style={{ margin: 0, paddingLeft: '1rem' }}>
                          {question.answer_options
                            ?.filter(opt => opt.is_correct)
                            .map((opt, idx) => (
                              <li key={idx}>
                                <Typography variant="body2">{opt.option_text}</Typography>
                              </li>
                            ))}
                        </ul>
                      ) : (
                        <Typography variant="body2" fontStyle="italic">
                          Ответ не указан
                        </Typography>
                      )}
                    </Box>
                  </Grid>
                </Grid>
                
                {question.explanation && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" fontWeight="bold" color="text.secondary">
                      Объяснение:
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      {question.explanation}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          );
        })}
      </Box>
    );
  };
  
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ 
        p: 4,
        backgroundColor: theme.palette.mode === 'dark' ? 'grey.900' : 'white'
      }}>
        <Typography variant="h4" color="primary" gutterBottom sx={{ mb: 3, textAlign: 'center' }}>
          🎉 Тест завершен!
        </Typography>
        
        {showScore ? (
          <>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Box sx={{ 
                width: 150, 
                height: 150, 
                borderRadius: '50%', 
                border: '10px solid',
                borderColor: scoreColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                margin: '0 auto',
                position: 'relative',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: -5,
                  left: -5,
                  right: -5,
                  bottom: -5,
                  border: '3px solid',
                  borderColor: scoreColor,
                  borderRadius: '50%',
                  opacity: 0.5
                }
              }}>
                <Typography variant="h2" fontWeight="bold" color={scoreColor}>
                  {percentage}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Результат
                </Typography>
              </Box>
            </Box>

            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={6}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Набрано баллов
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color={scoreColor}>
                      {score}/{maxScore}
                    </Typography>
                    {maxScore > 0 && (
                      <Typography variant="body2" color="text.secondary">
                        {score} из {maxScore} возможных
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Затрачено времени
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color="primary">
                      {formatTime(timeSpent)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Typography variant="body1" paragraph sx={{ mb: 3, color: 'text.secondary', textAlign: 'center' }}>
              {percentage >= 70 
                ? 'Отличный результат! Так держать!' 
                : percentage >= 50
                ? 'Хороший результат! Продолжайте работать над собой!'
                : 'Есть над чем поработать. У вас все получится!'}
            </Typography>

            {(resultsMode === 'immediately' || resultsMode === 'after_completion') && renderQuestionResults()}
          </>
        ) : (
          <Box sx={{ mb: 4, py: 3, textAlign: 'center' }}>
            <CheckCircle sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Тест успешно завершен!
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {resultsMode === 'never' ? 'Результаты тестирования не показываются.' :
               resultsMode === 'after_deadline' && test?.end_date ? 
                `Результаты будут доступны после ${new Date(test.end_date).toLocaleDateString('ru-RU')}` :
                'Результаты будут доступны после проверки преподавателем.'}
            </Typography>
          </Box>
        )}
        
        <Typography variant="body2" color="text.secondary" paragraph sx={{ textAlign: 'center' }}>
          Ваши ответы сохранены в системе.
        </Typography>
        
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Button
            variant="contained"
            size="large"
            onClick={onReturn}
            sx={{ px: 4 }}
          >
            Вернуться
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default TakeTest;