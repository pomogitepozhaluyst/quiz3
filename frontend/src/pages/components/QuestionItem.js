import React, { useState, memo } from 'react';
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
  Alert
} from '@mui/material';
import {
  Add,
  Delete,
  HelpOutline,
  Link,
  VideoLibrary,
  CheckBox
} from '@mui/icons-material';

const questionTypes = [
  { value: 'text', label: '📝 Текстовый вопрос', icon: <CheckBox /> },
  { value: 'single_choice', label: '🔘 Один вариант', icon: <CheckBox /> },
  { value: 'multiple_choice', label: '☑️ Несколько вариантов', icon: <CheckBox /> },
  { value: 'image', label: '🖼️ Вопрос с изображением', icon: <CheckBox /> },
  { value: 'video', label: '🎥 Видеовопрос', icon: <VideoLibrary /> },
  { value: 'blackbox', label: '📦 Черный ящик', icon: <CheckBox /> }
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
  question, 
  index, 
  onUpdate, 
  onRemove, 
  canRemove 
}) => {
  const [localQuestion, setLocalQuestion] = useState(question);

  // Обновляем локальное состояние и вызываем колбэк
  const handleUpdate = (field, value) => {
    const updatedQuestion = { ...localQuestion, [field]: value };
    setLocalQuestion(updatedQuestion);
    onUpdate(index, updatedQuestion);
  };

  const handleAnswerOptionUpdate = (optionIndex, field, value) => {
    const updatedOptions = localQuestion.answer_options.map((opt, i) =>
      i === optionIndex ? { ...opt, [field]: value } : opt
    );
    handleUpdate('answer_options', updatedOptions);
  };

  const addAnswerOption = () => {
    const newOption = {
      id: `opt-${Date.now()}-${Math.random()}`,
      option_text: '',
      is_correct: false,
      sort_order: localQuestion.answer_options.length
    };
    handleUpdate('answer_options', [...localQuestion.answer_options, newOption]);
  };

  const removeAnswerOption = (optionIndex) => {
    if (localQuestion.answer_options.length > 2) {
      const updatedOptions = localQuestion.answer_options.filter((_, i) => i !== optionIndex);
      handleUpdate('answer_options', updatedOptions);
    }
  };

  const setCorrectAnswer = (optionIndex) => {
    const updatedOptions = localQuestion.answer_options.map((opt, i) => {
      if (localQuestion.type === 'single_choice') {
        return { ...opt, is_correct: i === optionIndex };
      } else if (localQuestion.type === 'multiple_choice') {
        return i === optionIndex ? { ...opt, is_correct: !opt.is_correct } : opt;
      }
      return opt;
    });
    handleUpdate('answer_options', updatedOptions);
  };

  const renderQuestionContent = () => {
    switch (localQuestion.type) {
      case 'text':
        return (
          <Box>
            <FieldWithHelp 
              label="Текст вопроса *" 
              helpText="Сформулируйте четкий и понятный вопрос для участников"
            >
              <TextField
                fullWidth
                multiline
                rows={3}
                value={localQuestion.question_text}
                onChange={(e) => handleUpdate('question_text', e.target.value)}
                placeholder="Введите текст вопроса... Участники будут вводить текстовый ответ"
                required
              />
            </FieldWithHelp>
            
            <FieldWithHelp 
              label="Правильный ответ *" 
              helpText="Точный ответ, который система будет считать правильным"
            >
              <TextField
                fullWidth
                multiline
                rows={2}
                value={localQuestion.correct_answer}
                onChange={(e) => handleUpdate('correct_answer', e.target.value)}
                placeholder="Введите правильный ответ"
                required
              />
            </FieldWithHelp>
          </Box>
        );

      case 'single_choice':
      case 'multiple_choice':
        return (
          <Box>
            <FieldWithHelp 
              label="Текст вопроса *" 
              helpText="Сформулируйте вопрос, на который нужно выбрать один или несколько вариантов ответа"
            >
              <TextField
                fullWidth
                multiline
                rows={2}
                value={localQuestion.question_text}
                onChange={(e) => handleUpdate('question_text', e.target.value)}
                placeholder="Введите текст вопроса..."
                required
              />
            </FieldWithHelp>
            
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              Варианты ответов ({localQuestion.type === 'single_choice' ? 'один верный' : 'несколько верных'})
            </Typography>
            
            {localQuestion.answer_options.map((option, optIndex) => (
              <Box key={option.id} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <IconButton
                  onClick={() => setCorrectAnswer(optIndex)}
                  color={option.is_correct ? 'success' : 'default'}
                  size="small"
                  sx={{ 
                    border: option.is_correct ? '2px solid' : '1px solid',
                    borderColor: option.is_correct ? 'success.main' : 'grey.400',
                    borderRadius: '50%',
                    width: 32,
                    height: 32
                  }}
                >
                  {option.is_correct ? '✓' : ''}
                </IconButton>
                <TextField
                  fullWidth
                  size="small"
                  placeholder={`Вариант ответа ${optIndex + 1}`}
                  value={option.option_text}
                  onChange={(e) => handleAnswerOptionUpdate(optIndex, 'option_text', e.target.value)}
                  sx={{ ml: 1 }}
                />
                <IconButton 
                  onClick={() => removeAnswerOption(optIndex)}
                  disabled={localQuestion.answer_options.length <= 2}
                  size="small"
                  sx={{ ml: 1 }}
                >
                  <Delete />
                </IconButton>
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
                onChange={(e) => handleUpdate('question_text', e.target.value)}
                placeholder="Что изображено на картинке? Или вопрос по содержанию изображения..."
                required
              />
            </FieldWithHelp>
            
            <FieldWithHelp 
              label="URL изображения *" 
              helpText="Ссылка на изображение"
            >
              <TextField
                fullWidth
                value={localQuestion.media_url}
                onChange={(e) => handleUpdate('media_url', e.target.value)}
                placeholder="https://example.com/image.jpg"
                InputProps={{
                  startAdornment: <Link sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            </FieldWithHelp>
            
            <FieldWithHelp 
              label="Правильный ответ *" 
              helpText="Что изображено на картинке или ответ на вопрос"
            >
              <TextField
                fullWidth
                value={localQuestion.correct_answer}
                onChange={(e) => handleUpdate('correct_answer', e.target.value)}
                placeholder="Например: 'Эйфелева башня'"
                required
              />
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
                onChange={(e) => handleUpdate('question_text', e.target.value)}
                placeholder="О чем это видео? Какой момент ключевой? и т.д."
                required
              />
            </FieldWithHelp>
            
            <FieldWithHelp 
              label="URL видео *" 
              helpText="Ссылка на YouTube, Vimeo или другое видео"
            >
              <TextField
                fullWidth
                value={localQuestion.media_url}
                onChange={(e) => handleUpdate('media_url', e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                InputProps={{
                  startAdornment: <VideoLibrary sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            </FieldWithHelp>
            
            <FieldWithHelp 
              label="Правильный ответ *" 
              helpText="Ответ на вопрос по содержанию видео"
            >
              <TextField
                fullWidth
                value={localQuestion.correct_answer}
                onChange={(e) => handleUpdate('correct_answer', e.target.value)}
                placeholder="Например: 'Начало Второй мировой войны'"
                required
              />
            </FieldWithHelp>
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
                value={localQuestion.blackbox_description}
                onChange={(e) => handleUpdate('blackbox_description', e.target.value)}
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
                onChange={(e) => handleUpdate('question_text', e.target.value)}
                placeholder="Что находится внутри черного ящика? Как он работает?"
                required
              />
            </FieldWithHelp>
            
            <FieldWithHelp 
              label="Правильный ответ *" 
              helpText="Что находится внутри черного ящика или как он работает"
            >
              <TextField
                fullWidth
                value={localQuestion.correct_answer}
                onChange={(e) => handleUpdate('correct_answer', e.target.value)}
                placeholder="Например: 'Магнит' или 'Пружинный механизм'"
                required
              />
            </FieldWithHelp>
          </Box>
        );

      default:
        return null;
    }
  };

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
          <Grid item xs={12} sm={6}>
            <FieldWithHelp 
              label="Тип вопроса *" 
              helpText="Выберите формат вопроса"
            >
              <FormControl fullWidth>
                <InputLabel>Тип вопроса</InputLabel>
                <Select
                  value={localQuestion.type}
                  label="Тип вопроса"
                  onChange={(e) => handleUpdate('type', e.target.value)}
                >
                  {questionTypes.map(type => (
                    <MenuItem key={type.value} value={type.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {type.icon}
                        {type.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </FieldWithHelp>
          </Grid>

          <Grid item xs={12} sm={3}>
            <FieldWithHelp 
              label="Баллы" 
              helpText="Сколько баллов получит участник за правильный ответ"
            >
              <TextField
                fullWidth
                type="number"
                value={localQuestion.points}
                onChange={(e) => handleUpdate('points', parseInt(e.target.value) || 1)}
              />
            </FieldWithHelp>
          </Grid>

          <Grid item xs={12} sm={3}>
            <FieldWithHelp 
              label="Время (сек)" 
              helpText="Сколько секунд дается на этот вопрос"
            >
              <TextField
                fullWidth
                type="number"
                value={localQuestion.time_limit}
                onChange={(e) => handleUpdate('time_limit', parseInt(e.target.value) || 0)}
              />
            </FieldWithHelp>
          </Grid>
        </Grid>

        <Box sx={{ mt: 2 }}>
          {renderQuestionContent()}
        </Box>

        <FieldWithHelp 
          label="Объяснение ответа" 
          helpText="Пояснение почему ответ правильный"
        >
          <TextField
            fullWidth
            multiline
            rows={2}
            value={localQuestion.explanation}
            onChange={(e) => handleUpdate('explanation', e.target.value)}
            placeholder="Объясните почему этот ответ правильный..."
          />
        </FieldWithHelp>

        <FieldWithHelp 
          label="Источники" 
          helpText="Книги, статьи, сайты откуда взят вопрос"
        >
          <TextField
            fullWidth
            multiline
            rows={2}
            value={localQuestion.sources}
            onChange={(e) => handleUpdate('sources', e.target.value)}
            placeholder="Укажите источники информации..."
            InputProps={{
              startAdornment: <Link sx={{ mr: 1, color: 'text.secondary' }} />
            }}
          />
        </FieldWithHelp>
      </CardContent>
    </Card>
  );
});

export default QuestionItem;