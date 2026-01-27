import React, { useState, useCallback, useEffect, memo } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  IconButton,
  Button,
  Tooltip,
  Chip
} from '@mui/material';
import {
  Add,
  Delete,
  HelpOutline,
  CloudUpload,
  Image as ImageIcon,
  Videocam as VideoIcon,
  Audiotrack as AudioIcon,
  Functions as FormulaIcon
} from '@mui/icons-material';

const questionTypes = [
  { value: 'text', label: '📝 Текстовый вопрос', icon: '📝' },
  { value: 'blackbox', label: '📦 Черный ящик', icon: '📦' },
  { value: 'image', label: '🖼️ Вопрос с изображением', icon: '🖼️' },
  { value: 'video', label: '🎥 Видеовопрос', icon: '🎥' },
  { value: 'audio', label: '🎵 Аудиовопрос', icon: '🎵' },
  { value: 'formula', label: '🧮 Вопрос с формулой', icon: '🧮' }
];

const answerTypes = [
  { value: 'text', label: '📝 Текстовый ответ', icon: '📝' },
  { value: 'single_choice', label: '🔘 Выбор одного варианта', icon: '🔘' },
  { value: 'multiple_choice', label: '☑️ Выбор нескольких вариантов', icon: '☑️' }
];

const FieldWithHelp = memo(({ label, helpText, children }) => (
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
));

const QuestionItem = memo(({ 
  question: initialQuestion, 
  index, 
  onUpdate, 
  onRemove, 
  canRemove 
}) => {
  const [localQuestion, setLocalQuestion] = useState(initialQuestion);

  // Синхронизация с пропсами только при смене ID вопроса
  useEffect(() => {
    setLocalQuestion(initialQuestion);
  }, [initialQuestion.id]);

  const handleFieldChange = useCallback((field, value) => {
    const updated = {
      ...localQuestion,
      [field]: value
    };
    setLocalQuestion(updated);
  }, [localQuestion]);

  const saveChanges = useCallback(() => {
    onUpdate(index, localQuestion);
  }, [index, localQuestion, onUpdate]);

  const handleBlur = useCallback(() => {
    saveChanges();
  }, [saveChanges]);

  // Функция для вставки шаблона формулы
  const handleInsertFormula = useCallback(() => {
    const formulaBlock = `[[ваша_формула_здесь]]`;
    const currentText = localQuestion.question_text || '';
    
    // Вставляем в конец текста
    const newText = currentText ? `${currentText}\n${formulaBlock}` : formulaBlock;
    
    const updated = {
      ...localQuestion,
      question_text: newText
    };
    setLocalQuestion(updated);
    onUpdate(index, updated);
  }, [localQuestion, index, onUpdate]);

// В функции handleFileUpload в QuestionItem.js
const handleFileUpload = useCallback(async (event, field) => {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const isAudio = file.type.startsWith('audio/');
    
    if (!isImage && !isVideo && !isAudio) {
      alert('Пожалуйста, выберите изображение, видео или аудио файл');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    let endpoint;
    if (isImage) endpoint = '/upload/image';
    else if (isVideo) endpoint = '/upload/video';
    else if (isAudio) endpoint = '/upload/audio';
    else endpoint = '/upload/image'; // fallback

    const response = await fetch(`http://localhost:8000${endpoint}`, {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      }
    });

    if (response.ok) {
      const result = await response.json();
      const updated = {
        ...localQuestion,
        [field]: result.url
      };
      setLocalQuestion(updated);
      onUpdate(index, updated);
    } else {
      const errorData = await response.json();
      alert(`Ошибка загрузки файла: ${errorData.detail || 'Неизвестная ошибка'}`);
    }
  } catch (error) {
    console.error('Upload error:', error);
    alert('Ошибка загрузки файла: ' + error.message);
  }
}, [localQuestion, index, onUpdate]);

  const handleAnswerOptionChange = useCallback((optionIndex, field, value) => {
    const updatedOptions = localQuestion.answer_options.map((option, i) =>
      i === optionIndex ? { ...option, [field]: value } : option
    );
    
    const updated = {
      ...localQuestion,
      answer_options: updatedOptions
    };
    setLocalQuestion(updated);
  }, [localQuestion]);

  const addAnswerOption = useCallback(() => {
    const newOption = {
      id: Date.now() + Math.random(),
      option_text: '',
      is_correct: false,
      sort_order: localQuestion.answer_options.length
    };
    
    const updated = {
      ...localQuestion,
      answer_options: [...localQuestion.answer_options, newOption]
    };
    setLocalQuestion(updated);
    onUpdate(index, updated);
  }, [localQuestion, index, onUpdate]);

  const removeAnswerOption = useCallback((optionIndex) => {
    if (localQuestion.answer_options.length > 1) {
      const updated = {
        ...localQuestion,
        answer_options: localQuestion.answer_options.filter((_, i) => i !== optionIndex)
      };
      setLocalQuestion(updated);
      onUpdate(index, updated);
    }
  }, [localQuestion, index, onUpdate]);

  const setCorrectAnswer = useCallback((optionIndex) => {
    let updatedOptions;
    
    if (localQuestion.answer_type === 'single_choice') {
      updatedOptions = localQuestion.answer_options.map((opt, i) => ({
        ...opt,
        is_correct: i === optionIndex
      }));
    } else if (localQuestion.answer_type === 'multiple_choice') {
      updatedOptions = localQuestion.answer_options.map((opt, i) =>
        i === optionIndex ? { ...opt, is_correct: !opt.is_correct } : opt
      );
    } else {
      return;
    }
    
    const updated = {
      ...localQuestion,
      answer_options: updatedOptions
    };
    setLocalQuestion(updated);
    onUpdate(index, updated);
  }, [localQuestion, index, onUpdate]);

  const renderAnswerOptions = useCallback(() => {
    if (localQuestion.answer_type === 'text') {
      return (
        <FieldWithHelp 
          label="Правильный ответ *" 
          helpText="Точный ответ, который система будет считать правильным"
        >
          <TextField
            fullWidth
            multiline
            rows={2}
            value={localQuestion.correct_answer || ''}
            onChange={(e) => handleFieldChange('correct_answer', e.target.value)}
            onBlur={handleBlur}
            placeholder="Введите правильный ответ"
          />
        </FieldWithHelp>
      );
    }

    if (localQuestion.answer_type === 'single_choice' || localQuestion.answer_type === 'multiple_choice') {
      return (
        <Box>
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Варианты ответов ({localQuestion.answer_type === 'single_choice' ? 'один верный' : 'несколько верных'})
          </Typography>
          
          {localQuestion.answer_options.map((option, optIndex) => (
            <Box key={option.id} sx={{ mb: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <IconButton
                  onClick={() => setCorrectAnswer(optIndex)}
                  color={option.is_correct ? 'success' : 'default'}
                  size="small"
                  sx={{ 
                    border: option.is_correct ? '2px solid' : '1px solid',
                    borderColor: option.is_correct ? 'success.main' : 'grey.400',
                    borderRadius: '50%',
                    width: 32,
                    height: 32,
                    mt: 1
                  }}
                >
                  {option.is_correct ? '✓' : ''}
                </IconButton>
                
                <Box sx={{ flexGrow: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder={`Текст варианта ${optIndex + 1}`}
                    value={option.option_text}
                    onChange={(e) => handleAnswerOptionChange(optIndex, 'option_text', e.target.value)}
                    onBlur={handleBlur}
                    sx={{ mb: 1 }}
                  />
                </Box>
                
                <IconButton 
                  onClick={() => removeAnswerOption(optIndex)}
                  disabled={localQuestion.answer_options.length <= 1}
                  size="small"
                  sx={{ mt: 1 }}
                >
                  <Delete />
                </IconButton>
              </Box>
            </Box>
          ))}
          
          <Button 
            startIcon={<Add />} 
            onClick={addAnswerOption}
            sx={{ mt: 1 }}
            size="small"
          >
            Добавить вариант ответа
          </Button>
        </Box>
      );
    }

    return null;
  }, [localQuestion, handleFieldChange, handleAnswerOptionChange, setCorrectAnswer, removeAnswerOption, addAnswerOption, handleBlur]);

  const renderQuestionContent = useCallback(() => {
    switch (localQuestion.type) {
      case 'text':
      case 'formula':
        return (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
              <Typography variant="body2" fontWeight="medium">
                Текст вопроса *
              </Typography>
              <Tooltip title="Вставить шаблон формулы LaTeX" arrow>
                <Button
                  startIcon={<FormulaIcon />}
                  onClick={handleInsertFormula}
                  variant="outlined"
                  size="small"
                >
                  Формула
                </Button>
              </Tooltip>
            </Box>
            <Tooltip title="Сформулируйте четкий и понятный вопрос" arrow>
              <TextField
                fullWidth
                multiline
                rows={4}
                value={localQuestion.question_text}
                onChange={(e) => handleFieldChange('question_text', e.target.value)}
                onBlur={handleBlur}
                placeholder="Введите текст вопроса... Для формул используйте LaTeX в двойных квадратных скобках: [[формула]]"
                required
              />
            </Tooltip>
          </Box>
        );

      case 'blackbox':
        return (
          <Box>
            <FieldWithHelp 
              label="Описание черного ящика *" 
              helpText="Опишите содержимое, свойства или принцип работы черного ящика"
            >
              <TextField
                fullWidth
                multiline
                rows={3}
                value={localQuestion.blackbox_description || ''}
                onChange={(e) => handleFieldChange('blackbox_description', e.target.value)}
                onBlur={handleBlur}
                placeholder="Опишите черный ящик: его размеры, звуки, поведение, историю..."
                required
              />
            </FieldWithHelp>
            
            <FieldWithHelp 
              label="Вопрос о черном ящике *" 
              helpText="Сформулируйте вопрос, на который нужно ответить участникам"
            >
              <TextField
                fullWidth
                multiline
                rows={2}
                value={localQuestion.question_text}
                onChange={(e) => handleFieldChange('question_text', e.target.value)}
                onBlur={handleBlur}
                placeholder="Что находится внутри черного ящика? Как он работает?"
                required
              />
            </FieldWithHelp>
          </Box>
        );

      case 'image':
        return (
          <Box>
            <FieldWithHelp 
              label="Текст вопроса *" 
              helpText="Вопрос, который относится к изображению"
            >
              <TextField
                fullWidth
                multiline
                rows={2}
                value={localQuestion.question_text}
                onChange={(e) => handleFieldChange('question_text', e.target.value)}
                onBlur={handleBlur}
                placeholder="Что изображено на картинке? Или вопрос по содержанию изображения..."
                required
              />
            </FieldWithHelp>
            
            <FieldWithHelp 
              label="Изображение" 
              helpText="Загрузите изображение или укажите URL"
            >
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <input
                  accept="image/*"
                  style={{ display: 'none' }}
                  id={`image-upload-${index}`}
                  type="file"
                  onChange={(e) => handleFileUpload(e, 'media_url')}
                />
                <label htmlFor={`image-upload-${index}`}>
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<CloudUpload />}
                  >
                    Загрузить
                  </Button>
                </label>
                <TextField
                  fullWidth
                  value={localQuestion.media_url || ''}
                  onChange={(e) => handleFieldChange('media_url', e.target.value)}
                  onBlur={handleBlur}
                  placeholder="Или введите URL изображения"
                />
              </Box>
              {localQuestion.media_url && (
                <Chip 
                  icon={<ImageIcon />}
                  label="Изображение загружено" 
                  color="success" 
                  variant="outlined"
                  sx={{ mt: 1 }}
                />
              )}
            </FieldWithHelp>
          </Box>
        );

      case 'video':
        return (
          <Box>
            <FieldWithHelp 
              label="Текст вопроса *" 
              helpText="Вопрос, который относится к видео"
            >
              <TextField
                fullWidth
                multiline
                rows={2}
                value={localQuestion.question_text}
                onChange={(e) => handleFieldChange('question_text', e.target.value)}
                onBlur={handleBlur}
                placeholder="О чем это видео? Какой момент ключевой?"
                required
              />
            </FieldWithHelp>
            
            <FieldWithHelp 
              label="Видео" 
              helpText="Загрузите видео или укажите URL"
            >
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <input
                  accept="video/*"
                  style={{ display: 'none' }}
                  id={`video-upload-${index}`}
                  type="file"
                  onChange={(e) => handleFileUpload(e, 'media_url')}
                />
                <label htmlFor={`video-upload-${index}`}>
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<CloudUpload />}
                  >
                    Загрузить
                  </Button>
                </label>
                <TextField
                  fullWidth
                  value={localQuestion.media_url || ''}
                  onChange={(e) => handleFieldChange('media_url', e.target.value)}
                  onBlur={handleBlur}
                  placeholder="Или введите URL видео"
                />
              </Box>
              {localQuestion.media_url && (
                <Chip 
                  icon={<VideoIcon />}
                  label="Видео загружено" 
                  color="success" 
                  variant="outlined"
                  sx={{ mt: 1 }}
                />
              )}
            </FieldWithHelp>
          </Box>
        );

      case 'audio':
        return (
          <Box>
            <FieldWithHelp 
              label="Текст вопроса *" 
              helpText="Вопрос, который относится к аудио"
            >
              <TextField
                fullWidth
                multiline
                rows={2}
                value={localQuestion.question_text}
                onChange={(e) => handleFieldChange('question_text', e.target.value)}
                onBlur={handleBlur}
                placeholder="О чем это аудио? Какой звук ключевой?"
                required
              />
            </FieldWithHelp>
            
            <FieldWithHelp 
              label="Аудио" 
              helpText="Загрузите аудио или укажите URL"
            >
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <input
                  accept="audio/*"
                  style={{ display: 'none' }}
                  id={`audio-upload-${index}`}
                  type="file"
                  onChange={(e) => handleFileUpload(e, 'media_url')}
                />
                <label htmlFor={`audio-upload-${index}`}>
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<CloudUpload />}
                  >
                    Загрузить
                  </Button>
                </label>
                <TextField
                  fullWidth
                  value={localQuestion.media_url || ''}
                  onChange={(e) => handleFieldChange('media_url', e.target.value)}
                  onBlur={handleBlur}
                  placeholder="Или введите URL аудио"
                />
              </Box>
              {localQuestion.media_url && (
                <Chip 
                  icon={<AudioIcon />}
                  label="Аудио загружено" 
                  color="success" 
                  variant="outlined"
                  sx={{ mt: 1 }}
                />
              )}
            </FieldWithHelp>
          </Box>
        );

      default:
        return (
          <FieldWithHelp 
            label="Текст вопроса *" 
            helpText="Сформулируйте четкий и понятный вопрос"
          >
            <TextField
              fullWidth
              multiline
              rows={3}
              value={localQuestion.question_text}
              onChange={(e) => handleFieldChange('question_text', e.target.value)}
              onBlur={handleBlur}
              placeholder="Введите текст вопроса..."
              required
            />
          </FieldWithHelp>
        );
    }
  }, [localQuestion, handleFieldChange, handleBlur, handleFileUpload, index, handleInsertFormula]);

  const handleAnswerTypeChange = useCallback((newAnswerType) => {
    let newOptions = localQuestion.answer_options;
    
    if ((newAnswerType === 'single_choice' || newAnswerType === 'multiple_choice') && 
        (!localQuestion.answer_options || localQuestion.answer_options.length === 0)) {
      newOptions = [
        { id: Date.now() + 1, option_text: '', is_correct: false, sort_order: 0 },
        { id: Date.now() + 2, option_text: '', is_correct: false, sort_order: 1 }
      ];
    }
    
    const updated = {
      ...localQuestion,
      answer_type: newAnswerType,
      answer_options: newOptions
    };
    setLocalQuestion(updated);
    onUpdate(index, updated);
  }, [localQuestion, index, onUpdate]);

  const handleInputChange = useCallback((field) => (e) => {
    handleFieldChange(field, e.target.value);
  }, [handleFieldChange]);

  const handleNumberChange = useCallback((field) => (e) => {
    const value = parseInt(e.target.value) || 1;
    handleFieldChange(field, value);
  }, [handleFieldChange]);

  const handleSelectChange = useCallback((field) => (e) => {
    handleFieldChange(field, e.target.value);
  }, [handleFieldChange]);

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Typography variant="h6">
            Вопрос {index + 1}
          </Typography>
          <IconButton 
            onClick={() => onRemove(index)}
            disabled={!canRemove}
          >
            <Delete />
          </IconButton>
        </Box>

        <Grid container spacing={2}>
          {/* Тип вопроса */}
          <Grid item xs={12} sm={6}>
            <FieldWithHelp 
              label="Формат вопроса *" 
              helpText="Как представлен вопрос"
            >
              <FormControl fullWidth>
                <InputLabel>Формат вопроса</InputLabel>
                <Select
                  value={localQuestion.type}
                  label="Формат вопроса"
                  onChange={handleSelectChange('type')}
                >
                  {questionTypes.map(type => (
                    <MenuItem key={type.value} value={type.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography>{type.icon}</Typography>
                        <Typography>{type.label}</Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </FieldWithHelp>
          </Grid>

          {/* Тип ответа */}
          <Grid item xs={12} sm={6}>
            <FieldWithHelp 
              label="Формат ответа *" 
              helpText="Как участники будут отвечать"
            >
              <FormControl fullWidth>
                <InputLabel>Формат ответа</InputLabel>
                <Select
                  value={localQuestion.answer_type}
                  label="Формат ответа"
                  onChange={(e) => handleAnswerTypeChange(e.target.value)}
                >
                  {answerTypes.map(type => (
                    <MenuItem key={type.value} value={type.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography>{type.icon}</Typography>
                        <Typography>{type.label}</Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </FieldWithHelp>
          </Grid>

          <Grid item xs={12} sm={4}>
            <FieldWithHelp 
              label="Баллы" 
              helpText="Сколько баллов получит участник за правильный ответ"
            >
              <TextField
                fullWidth
                type="number"
                value={localQuestion.points}
                onChange={handleNumberChange('points')}
                onBlur={handleBlur}
              />
            </FieldWithHelp>
          </Grid>

          <Grid item xs={12} sm={4}>
            <FieldWithHelp 
              label="Время (сек)" 
              helpText="Сколько секунд дается на этот вопрос"
            >
              <TextField
                fullWidth
                type="number"
                value={localQuestion.time_limit}
                onChange={handleNumberChange('time_limit')}
                onBlur={handleBlur}
              />
            </FieldWithHelp>
          </Grid>

          <Grid item xs={12} sm={4}>
            <FieldWithHelp 
              label="Сложность" 
              helpText="Уровень сложности вопроса"
            >
              <FormControl fullWidth>
                <Select
                  value={localQuestion.difficulty || 1}
                  onChange={handleSelectChange('difficulty')}
                >
                  <MenuItem value={1}>🟢 Легкий</MenuItem>
                  <MenuItem value={2}>🟡 Средний</MenuItem>
                  <MenuItem value={3}>🟠 Сложный</MenuItem>
                  <MenuItem value={4}>🔴 Очень сложный</MenuItem>
                  <MenuItem value={5}>⚫ Экспертный</MenuItem>
                </Select>
              </FormControl>
            </FieldWithHelp>
          </Grid>
        </Grid>

        {/* Контент вопроса */}
        <Box sx={{ mt: 2 }}>
          {renderQuestionContent()}
        </Box>

        {/* Форма ответа */}
        <Box sx={{ mt: 2 }}>
          {renderAnswerOptions()}
        </Box>

        {/* Дополнительные поля */}
        <FieldWithHelp 
          label="Объяснение ответа" 
          helpText="Пояснение почему ответ правильный"
        >
          <TextField
            fullWidth
            multiline
            rows={2}
            value={localQuestion.explanation || ''}
            onChange={handleInputChange('explanation')}
            onBlur={handleBlur}
            placeholder="Объясните почему этот ответ правильный..."
          />
        </FieldWithHelp>
      </CardContent>
    </Card>
  );
});

export default QuestionItem;