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
  Tooltip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  LinearProgress,
  Tab,
  Tabs,
  AppBar,
  Toolbar
} from '@mui/material';
import {
  Add,
  Save,
  ArrowBack,
  Groups,
  Person,
  HelpOutline,
  Image as ImageIcon,
  Videocam as VideoIcon,
  Audiotrack as AudioIcon,
  Science,
  Functions,
  Upload,
  Description,
  CloudUpload,
  Download,
  Delete,
  Visibility,
  Close,
  CheckCircle,
  Error as ErrorIcon,
  InsertDriveFile,
  Refresh
} from '@mui/icons-material';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import QuestionItem from '../components/QuestionItem';
import api from '../services/api';
import * as XLSX from 'xlsx';

// ДОБАВЬ ЭТИ КОНСТАНТЫ В НАЧАЛО ФАЙЛА
const IMPORT_TYPE_MAPPING = {
  'text': { question_type: 'text', answer_type: 'text', answer_type_id: 1 },
  'single_choice': { question_type: 'text', answer_type: 'single_choice', answer_type_id: 2 },
  'multiple_choice': { question_type: 'text', answer_type: 'multiple_choice', answer_type_id: 3 },
  'blackbox': { question_type: 'blackbox', answer_type: 'text', answer_type_id: 1 }
};

const QUESTION_TYPE_MAPPING = {
  'text': 1,      // id из question_types
  'blackbox': 2,
  'image': 3,
  'video': 4,
  'audio': 5,
  'code': 6
};

const ANSWER_TYPE_MAPPING = {
  'text': 1,            // id=1 из таблицы answer_types
  'single_choice': 2,   // id=2
  'multiple_choice': 3  // id=3
};

const CATEGORY_MAPPING = {
  'математика': 1,
  'физика': 2,
  'история': 3,
  'литература': 4,
  'информатика': 5,
  'биология': 6,
  'химия': 7,
  'общие знания': 8,
  'логика': 9,
  'география': 8,
  'астрономия': 2,
  'программирование': 5,
  'english': 10,
  'русский язык': 11,
  'искусство': 12,
  'музыка': 13,
  'спорт': 14
};

const CreateTest = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { testId } = useParams();
  
  const searchParams = new URLSearchParams(location.search);
  const groupId = searchParams.get('groupId');
  
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [originalTestId, setOriginalTestId] = useState(null);
  const [hasLoadedData, setHasLoadedData] = useState(false);

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

  const [assignmentDates, setAssignmentDates] = useState({
    start_date: '',
    end_date: ''
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
      answer_options: [],
      allow_latex: false
    }
  ]);

  // Состояние для импорта из файла
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const [selectedImportQuestions, setSelectedImportQuestions] = useState([]);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const fileInputRef = useRef(null);

  // Вкладки для управления вопросами
  const [questionTab, setQuestionTab] = useState(0);

  const steps = ['Тип теста', 'Настройки', 'Вопросы', 'Предпросмотр'];

  // Загрузка данных теста для редактирования
  useEffect(() => {
    const loadTestForEdit = async () => {
      if (testId && !hasLoadedData) {
        setIsEditMode(true);
        setOriginalTestId(testId);
        setLoadingData(true);
        
        try {
          console.log('📥 Загружаем тест для редактирования:', testId);
          
          // Загружаем полную информацию о тесте
          const testResponse = await api.get(`/tests/${testId}/full`);
          const testData = testResponse.data;
          console.log('✅ Полные данные теста:', testData);
          
          // Заполняем настройки теста
          setTestSettings({
            title: testData.title || '',
            description: testData.description || '',
            time_limit: testData.time_limit || '',
            max_attempts: testData.max_attempts || 1,
            show_results: testData.show_results || 'after_completion',
            shuffle_questions: testData.shuffle_questions || false,
            shuffle_answers: testData.shuffle_answers || false,
            passing_score: testData.passing_score || '',
            is_public: testData.is_public || false
          });
          
          // Загружаем вопросы теста
          if (testData.questions && testData.questions.length > 0) {
            const loadedQuestions = [];
            
            for (const questionData of testData.questions) {
              console.log('📋 Вопрос для редактирования:', questionData);
              
              // Сохраняем оригинальный ID вопроса для обновления
              const questionId = `original_${questionData.id}_${Date.now()}`;
              
              const question = {
                id: questionId,
                originalId: questionData.id, // Сохраняем оригинальный ID
                type: questionData.type?.name || 'text',
                answer_type: questionData.answer_type?.name || 'text',
                question_text: questionData.question_text || '',
                category_id: questionData.category_id || 1,
                difficulty: questionData.difficulty || 1,
                explanation: questionData.explanation || '',
                sources: questionData.sources || '',
                correct_answer: questionData.correct_answer || '',
                time_limit: questionData.time_limit || 60,
                points: questionData.points || 1,
                media_url: questionData.media_url || '',
                blackbox_description: questionData.blackbox_description || '',
                answer_requirements: questionData.answer_requirements || '',
                allow_latex: questionData.allow_latex || false,
                answer_options: questionData.answer_options?.map(opt => ({
                  id: opt.id,
                  option_text: opt.option_text || '',
                  is_correct: opt.is_correct || false,
                  sort_order: opt.sort_order || 0
                })) || []
              };
              
              loadedQuestions.push(question);
            }
            
            if (loadedQuestions.length > 0) {
              setQuestions(loadedQuestions);
            }
          }
          
          // Если группа указана, загружаем даты назначения
          if (groupId) {
            try {
              const assignmentsResponse = await api.get(`/test-assignments/?test_id=${testId}&group_id=${groupId}`);
              if (assignmentsResponse.data && assignmentsResponse.data.length > 0) {
                const assignment = assignmentsResponse.data[0];
                // Преобразуем даты в формат для datetime-local
                const formatDateForInput = (dateString) => {
                  if (!dateString) return '';
                  const date = new Date(dateString);
                  return date.toISOString().slice(0, 16);
                };
                
                setAssignmentDates({
                  start_date: formatDateForInput(assignment.start_date),
                  end_date: formatDateForInput(assignment.end_date)
                });
              }
            } catch (assignmentsError) {
              console.log('Назначений для этой группы не найдено');
            }
          }
          
          setHasLoadedData(true);
          
        } catch (error) {
          console.error('Ошибка загрузки теста:', error);
          setError('Не удалось загрузить тест для редактирования: ' + 
            (error.response?.data?.detail || error.message));
        } finally {
          setLoadingData(false);
        }
      }
    };
    
    loadTestForEdit();
  }, [testId, groupId, hasLoadedData]);

  const addQuestion = useCallback(() => {
    console.log('🎯 Вызов addQuestion');
    
    const newQuestion = {
      id: `question_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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
      answer_options: [],
      allow_latex: false
    };
    
    console.log('➕ Новый вопрос:', newQuestion);
    
    setQuestions(prevQuestions => {
      const newQuestions = [...prevQuestions, newQuestion];
      console.log('📊 Обновление состояния вопросов:', {
        было: prevQuestions.length,
        стало: newQuestions.length
      });
      return newQuestions;
    });
  }, []);

  const removeQuestion = useCallback((index) => {
    setQuestions(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updateQuestion = useCallback((index, updatedQuestion) => {
    setQuestions(prev => prev.map((q, i) => 
      i === index ? { ...updatedQuestion } : q
    ));
  }, []);

  // Функции для импорта из файла
  const handleFileSelect = useCallback((event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      setImportFile(selectedFile);
      setImportError('');
      setImportSuccess('');
      setSelectedImportQuestions([]);
      previewImportFile(selectedFile);
    }
  }, []);

// ИСПРАВЛЕННАЯ ФУНКЦИЯ previewImportFile
const previewImportFile = async (file) => {
  setImportLoading(true);
  setImportError('');
  
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await api.post('/questions/import-preview', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    console.log('📊 Ответ от бэкенда:', response.data);
    
    // Проверяем, есть ли данные в ответе
    if (!response.data || !response.data.preview) {
      throw new Error('Некорректный формат ответа от сервера');
    }
    
    // Функция для определения типа ответа по данным вопроса
    const determineAnswerTypeFromData = (q) => {
      console.log('Определяем тип ответа для вопроса:', {
        answer_type: q.answer_type,
        options: q.options,
        correct_options: q.correct_options,
        correct_answer: q.correct_answer
      });
      
      // Если в данных уже есть answer_type, используем его
      if (q.answer_type) {
        const type = q.answer_type.toLowerCase();
        if (['text', 'single_choice', 'multiple_choice'].includes(type)) {
          return type;
        }
      }
      
      // Определяем по наличию полей
      if (q.correct_options && Array.isArray(q.correct_options) && q.correct_options.length > 1) {
        console.log('Определен как multiple_choice по correct_options');
        return 'multiple_choice';
      }
      
      if (q.options && Array.isArray(q.options) && q.options.length > 0) {
        console.log('Определен как single_choice по options');
        return 'single_choice';
      }
      
      if (q.correct_options && Array.isArray(q.correct_options) && q.correct_options.length === 1) {
        console.log('Определен как single_choice по одному correct_option');
        return 'single_choice';
      }
      
      // Для blackbox вопросов обычно text ответ
      if (q.question_type === 'blackbox') {
        console.log('Определен как text для blackbox');
        return 'text';
      }
      
      console.log('Определен как text по умолчанию');
      return 'text';
    };
    
    // Обрабатываем preview данные
    const processedPreview = {
      ...response.data,
      preview: response.data.preview.map((q, idx) => {
        const answerType = determineAnswerTypeFromData(q);
        
        return {
          ...q,
          answer_type: answerType,
          // Логируем для отладки
          _debug: {
            index: idx,
            determined_answer_type: answerType,
            original_answer_type: q.answer_type,
            has_options: q.options && q.options.length > 0,
            options_count: q.options ? q.options.length : 0,
            has_correct_options: q.correct_options && q.correct_options.length > 0,
            correct_options_count: q.correct_options ? q.correct_options.length : 0
          }
        };
      })
    };
    
    console.log('🔄 Обработанный preview:', processedPreview);
    
    setImportPreview(processedPreview);
    
    // Автоматически выбираем все валидные вопросы
    if (processedPreview.preview) {
      const allValidIndices = processedPreview.preview
        .map((q, idx) => q.is_valid ? idx : -1)
        .filter(idx => idx !== -1);
      setSelectedImportQuestions(allValidIndices);
      
      console.log('✅ Валидные вопросы:', allValidIndices.length);
      
      // Собираем статистику по типам
      const typeStats = {
        question_types: {},
        answer_types: {}
      };
      
      processedPreview.preview.forEach((q, idx) => {
        if (q.is_valid) {
          typeStats.question_types[q.question_type] = (typeStats.question_types[q.question_type] || 0) + 1;
          typeStats.answer_types[q.answer_type] = (typeStats.answer_types[q.answer_type] || 0) + 1;
        }
      });
      
      console.log('📊 Статистика типов вопросов:', typeStats.question_types);
      console.log('📊 Статистика типов ответов:', typeStats.answer_types);
    }
  } catch (err) {
    console.error('❌ Ошибка при чтении файла:', err);
    setImportError('Ошибка при чтении файла: ' + (err.response?.data?.detail || err.message));
    setImportPreview(null);
  } finally {
    setImportLoading(false);
  }
};

// Обновите функцию downloadTemplate
const downloadTemplate = () => {
  try {
    // Создаем данные для шаблона - СОГЛАСОВАННЫЙ ФОРМАТ
// В функции downloadTemplate() на фронтенде
const data = [
  // Пример single_choice (text вопрос с выбором одного)
  {
    'question_type': 'text',  // ← ТОЛЬКО text или blackbox
    'answer_type': 'single_choice',
    'Вопрос': 'Столица Франции?',
    'correct_answer': 'Париж',
    'Варианты ответов': 'Париж;Лондон;Берлин;Мадрид',
    'correct_options': '',
    'Категория': 'география',
    'Сложность': '1',
    'Баллы': '1',
    'Объяснение': 'Париж - столица Франции',
    'blackbox_description': ''
  },
  // Пример multiple_choice (text вопрос с выбором нескольких)
  {
    'question_type': 'text',  // ← ТОЛЬКО text
    'answer_type': 'multiple_choice',
    'Вопрос': 'Какие из этих языков являются языками программирования?',
    'correct_answer': '',
    'Варианты ответов': 'Python;HTML;CSS;JavaScript',
    'correct_options': 'Python;JavaScript',
    'Категория': 'информатика',
    'Сложность': '2',
    'Баллы': '2',
    'Объяснение': 'HTML и CSS - языки разметки, а не программирования',
    'blackbox_description': ''
  },
  // Пример text (простой текстовый вопрос)
  {
    'question_type': 'text',  // ← ТОЛЬКО text
    'answer_type': 'text',
    'Вопрос': 'Чему равно 2 + 2?',
    'correct_answer': '4',
    'Варианты ответов': '',
    'correct_options': '',
    'Категория': 'математика',
    'Сложность': '1',
    'Баллы': '1',
    'Объяснение': 'Базовая арифметика',
    'blackbox_description': ''
  },
  // Пример blackbox
  {
    'question_type': 'blackbox',  // ← ТОЛЬКО blackbox
    'answer_type': 'text',  // ← для blackbox ОБЯЗАТЕЛЬНО text
    'Вопрос': 'Что делает эта функция?',
    'correct_answer': 'Возводит число в квадрат',
    'Варианты ответов': '',
    'correct_options': '',
    'Категория': 'программирование',
    'Сложность': '2',
    'Баллы': '2',
    'Объяснение': 'Функция вычисляет квадрат числа',
    'blackbox_description': 'Функция принимает число и возвращает его квадрат'
  }
];

    const ws = XLSX.utils.json_to_sheet(data);
    
    // Создаем инструкции
    const instructions = [
      { 'Поле': 'question_type', 'Обязательно': 'Да', 'Описание': 'Тип вопроса: text, blackbox, image, video, audio, code', 'Пример': 'text' },
      { 'Поле': 'answer_type', 'Обязательно': 'Да', 'Описание': 'Тип ответа: text, single_choice, multiple_choice', 'Пример': 'single_choice' },
      { 'Поле': 'Вопрос / question', 'Обязательно': 'Да', 'Описание': 'Текст вопроса', 'Пример': 'Столица Франции?' },
      { 'Поле': 'correct_answer', 'Обязательно': 'Для text, single_choice, blackbox', 'Описание': 'Правильный ответ', 'Пример': 'Париж' },
      { 'Поле': 'Варианты ответов / options', 'Обязательно': 'Для single_choice/multiple_choice', 'Описание': 'Варианты через ;', 'Пример': 'Париж;Лондон;Берлин' },
      { 'Поле': 'correct_options', 'Обязательно': 'Для multiple_choice', 'Описание': 'Правильные варианты через ;', 'Пример': 'Python;JavaScript' },
      { 'Поле': 'blackbox_description', 'Обязательно': 'Для blackbox', 'Описание': 'Описание черного ящика', 'Пример': 'Функция принимает число и возвращает его квадрат' },
      { 'Поле': 'Категория / category', 'Обязательно': 'Да', 'Описание': 'Название категории', 'Пример': 'география' },
      { 'Поле': 'Сложность / difficulty', 'Обязательно': 'Нет (1 по умолчанию)', 'Описание': '1-5', 'Пример': '2' },
      { 'Поле': 'Баллы / points', 'Обязательно': 'Нет (1 по умолчанию)', 'Описание': 'Баллы за вопрос', 'Пример': '1' },
      { 'Поле': 'Объяснение / explanation', 'Обязательно': 'Нет', 'Описание': 'Пояснение к ответу', 'Пример': 'Париж - столица Франции' },
      { 'Поле': 'media_url', 'Обязательно': 'Для image/video/audio', 'Описание': 'URL медиафайла', 'Пример': 'https://example.com/image.jpg' }
    ];
    
    const ws2 = XLSX.utils.json_to_sheet(instructions);
    
    // Создаем книгу
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Шаблон вопросов");
    XLSX.utils.book_append_sheet(wb, ws2, "Инструкция");
    
    // Скачиваем файл
    XLSX.writeFile(wb, 'шаблон_вопросов.xlsx');
    
  } catch (error) {
    console.error('Ошибка при создании шаблона:', error);
    downloadCSVTemplate();
  }
};

const downloadCSVTemplate = () => {
  const data = `question_type;answer_type;Вопрос;correct_answer;Варианты ответов;correct_options;blackbox_description;Категория;Сложность;Баллы;Объяснение;media_url
text;single_choice;"Столица Франции?";"Париж";"Париж;Лондон;Берлин;Мадрид";;;география;1;1;"Париж - столица Франции";
text;multiple_choice;"Какие из этих языков являются языками программирования?";;"Python;HTML;CSS;JavaScript";"Python;JavaScript";;информатика;2;2;"HTML и CSS - языки разметки";
text;text;"Сколько планет в Солнечной системе?";"8";;;;;география;1;1;"Сейчас 8 планет";
blackbox;text;"Что делает эта функция?";"Возводит число в квадрат";;;"Функция принимает число и возвращает его квадрат";программирование;2;2;"Функция вычисляет квадрат числа";
image;single_choice;"Что изображено на картинке?";"Эйфелева башня";"Эйфелева башня;Колизей;Биг Бен;Статуя Свободы";;;искусство;2;2;"Эйфелева башня в Париже";https://example.com/eiffel_tower.jpg`;

  const blob = new Blob(['\uFEFF' + data], { 
    type: 'text/csv;charset=utf-8;' 
  });
  
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', 'шаблон_вопросов.csv');
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};

const toggleSelectAllQuestions = () => {
  if (!importPreview?.preview) return;
  
  const allValidIndices = importPreview.preview
    .map((q, idx) => q.is_valid ? idx : -1)
    .filter(idx => idx !== -1);
  
  console.log('Все валидные индексы:', allValidIndices);
  console.log('Выбрано сейчас:', selectedImportQuestions.length);
  
  if (selectedImportQuestions.length === allValidIndices.length) {
    // Снимаем выделение со всех
    setSelectedImportQuestions([]);
  } else {
    // Выделяем все валидные
    setSelectedImportQuestions([...allValidIndices]);
  }
};

const toggleSelectQuestion = (index) => {
  console.log('Переключаем вопрос', index);
  
  setSelectedImportQuestions(prev => {
    if (prev.includes(index)) {
      // Удаляем из выбранных
      return prev.filter(i => i !== index);
    } else {
      // Добавляем в выбранные
      return [...prev, index];
    }
  });
};

  // ФУНКЦИЯ ДЛЯ ДОБАВЛЕНИЯ ВЫБРАННЫХ ВОПРОСОВ
// ИСПРАВЛЕННАЯ ФУНКЦИЯ handleAddSelectedQuestions - убираем мерцание
// ИСПРАВЛЕННАЯ ФУНКЦИЯ handleAddSelectedQuestions - ПРАВИЛЬНАЯ ОБРАБОТКА MULTIPLE_CHOICE
const handleAddSelectedQuestions = () => {
  if (!importPreview?.preview || selectedImportQuestions.length === 0) return;
  
  console.log('🚀 Начало импорта, выбрано:', selectedImportQuestions.length);
  
  setImporting(true);
  setImportError('');
  setImportSuccess('');
  
  try {
    // Создаем новые вопросы
    const newQuestions = selectedImportQuestions.map((idx) => {
      const q = importPreview.preview[idx];
      
      // Определяем типы из импортированных данных
      const importedQuestionType = q.question_type?.toLowerCase() || 'text';
      const importedAnswerType = q.answer_type?.toLowerCase() || 'text';
      
      // Определяем ID типов
      const questionTypeId = QUESTION_TYPE_MAPPING[importedQuestionType] || 1;
      const answerTypeId = ANSWER_TYPE_MAPPING[importedAnswerType] || 1;
      
      // Определяем category_id по названию категории
      let categoryId = 1;
      if (q.category) {
        const lowerCategory = q.category.toLowerCase().trim();
        categoryId = CATEGORY_MAPPING[lowerCategory] || 1;
      }
      
      // Базовый объект вопроса
      const questionObj = {
        id: `import_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 9)}`,
        type: importedQuestionType,
        answer_type: importedAnswerType,
        answer_type_id: answerTypeId,
        question_text: q.question_text?.trim() || '',
        category_id: categoryId,
        difficulty: Math.min(Math.max(parseInt(q.difficulty) || 1, 1), 5),
        explanation: q.explanation?.trim() || '',
        sources: 'Импортировано из файла',
        correct_answer: q.correct_answer?.trim() || '',
        time_limit: 60,
        points: parseInt(q.points) || 1,
        media_url: q.media_url?.trim() || '',
        blackbox_description: importedQuestionType === 'blackbox' ? (q.blackbox_description?.trim() || q.explanation?.trim() || '') : '',
        answer_requirements: '',
        allow_latex: false,
        answer_options: []
      };
      
      console.log('📋 Создаем вопрос:', {
        importedAnswerType,
        hasOptions: q.options && q.options.length > 0,
        optionsCount: q.options ? q.options.length : 0,
        hasCorrectOptions: q.correct_options && q.correct_options.length > 0,
        correctOptionsCount: q.correct_options ? q.correct_options.length : 0,
        correctAnswer: q.correct_answer
      });
      
      // ДЛЯ ВОПРОСОВ С ВЫБОРОМ
      if ((importedAnswerType === 'single_choice' || importedAnswerType === 'multiple_choice') && 
          q.options && q.options.length > 0) {
        
        console.log('🔘 Обрабатываем вопрос с выбором, тип:', importedAnswerType);
        
        // Для multiple_choice используем correct_options
        // Для single_choice используем correct_answer
        const correctOptions = importedAnswerType === 'multiple_choice' ? 
          (q.correct_options || []) : 
          (q.correct_answer ? [q.correct_answer] : []);
        
        console.log('✅ Правильные варианты:', correctOptions);
        
        questionObj.answer_options = q.options.map((opt, optIdx) => {
          const optionText = opt?.trim() || '';
          let isCorrect = false;
          
          if (importedAnswerType === 'single_choice') {
            // Для single_choice сравниваем с correct_answer
            isCorrect = optionText === (q.correct_answer || '').trim();
          } else if (importedAnswerType === 'multiple_choice') {
            // Для multiple_choice проверяем в массиве correct_options
            isCorrect = correctOptions.some(correctOpt => 
              correctOpt?.trim() === optionText
            );
          }
          
          return {
            id: `opt_${Date.now()}_${idx}_${optIdx}_${Math.random().toString(36).substr(2, 6)}`,
            option_text: optionText,
            is_correct: isCorrect,
            sort_order: optIdx
          };
        });
        
        // Для single_choice: если нет правильного ответа, помечаем первый
        if (importedAnswerType === 'single_choice' && 
            !questionObj.answer_options.some(opt => opt.is_correct) &&
            questionObj.answer_options.length > 0) {
          questionObj.answer_options[0].is_correct = true;
          questionObj.correct_answer = questionObj.answer_options[0].option_text;
        }
        
        // Для multiple_oice: правильный ответ - это конкатенация правильных вариантов
        if (importedAnswerType === 'multiple_choice' && correctOptions.length > 0) {
          questionObj.correct_answer = correctOptions.join('; ');
        }
        
        console.log('📊 Созданы варианты ответа:', questionObj.answer_options.map(opt => ({
          text: opt.option_text,
          is_correct: opt.is_correct
        })));
      }
      // ДЛЯ ТЕКСТОВЫХ ВОПРОСОВ И BLACKBOX
      else if (importedAnswerType === 'text') {
        console.log('📝 Текстовый вопрос или blackbox');
        // Для текстовых вопросов correct_answer уже установлен
      }
      
      return questionObj;
    });
    
    console.log('✅ Создано новых вопросов:', newQuestions.length);
    
    // Выводим детальную статистику
    const typeStats = {};
    const optionStats = {};
    
    newQuestions.forEach((q, idx) => {
      const type = q.answer_type;
      typeStats[type] = (typeStats[type] || 0) + 1;
      
      if (q.answer_options && q.answer_options.length > 0) {
        const correctCount = q.answer_options.filter(opt => opt.is_correct).length;
        optionStats[`${type}_with_${correctCount}_correct`] = (optionStats[`${type}_with_${correctCount}_correct`] || 0) + 1;
        
        console.log(`Вопрос ${idx + 1} (${type}): ${q.answer_options.length} вариантов, ${correctCount} правильных`);
        q.answer_options.forEach((opt, optIdx) => {
          console.log(`  ${optIdx + 1}. ${opt.option_text} ${opt.is_correct ? '✓' : ''}`);
        });
      } else {
        console.log(`Вопрос ${idx + 1} (${type}): текстовый ответ "${q.correct_answer}"`);
      }
    });
    
    console.log('📊 Статистика по типам ответов:', typeStats);
    console.log('📊 Статистика по вариантам:', optionStats);
    
    // ДОБАВЛЯЕМ ВОПРОСЫ
    setQuestions(prev => {
      const updatedQuestions = [...prev, ...newQuestions];
      console.log('📊 Обновление вопросов: было', prev.length, 'стало', updatedQuestions.length);
      return updatedQuestions;
    });
    
    // Показываем сообщение об успехе с деталями
    const multipleChoiceCount = newQuestions.filter(q => q.answer_type === 'multiple_choice').length;
    const singleChoiceCount = newQuestions.filter(q => q.answer_type === 'single_choice').length;
    const textCount = newQuestions.filter(q => q.answer_type === 'text').length;
    
    let successMessage = `✅ Добавлено ${newQuestions.length} вопросов`;
    if (multipleChoiceCount > 0) successMessage += ` (${multipleChoiceCount} с выбором нескольких вариантов)`;
    if (singleChoiceCount > 0) successMessage += ` (${singleChoiceCount} с выбором одного варианта)`;
    if (textCount > 0) successMessage += ` (${textCount} текстовых)`;
    
    setImportSuccess(successMessage);
    
    // ЗАКРЫВАЕМ диалог через 1 секунду
    setTimeout(() => {
      console.log('🗂️ Закрытие диалога импорта');
      setImportDialogOpen(false);
      setImportFile(null);
      setImportPreview(null);
      setSelectedImportQuestions([]);
      setImportSuccess('');
      setImportError('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }, 1000);
    
  } catch (error) {
    console.error('❌ Ошибка при импорте:', error);
    setImportError('Ошибка при импорте: ' + error.message);
  } finally {
    setImporting(false);
  }
};

  // КОМПОНЕНТ ДИАЛОГА ИМПОРТА
// КОМПОНЕНТ ДИАЛОГА ИМПОРТА
const ImportQuestionsDialog = () => {
  const handleClose = () => {
    console.log('Закрытие диалога');
    setImportDialogOpen(false);
    setImportFile(null);
    setImportPreview(null);
    setSelectedImportQuestions([]);
    setImportError('');
    setImportSuccess('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // ИСПРАВЛЕНИЕ ДЛЯ ЧЕКБОКСОВ
  const validQuestionsCount = importPreview?.preview?.filter(q => q.is_valid).length || 0;
  const isAllSelected = validQuestionsCount > 0 && selectedImportQuestions.length === validQuestionsCount;
  const isIndeterminate = selectedImportQuestions.length > 0 && selectedImportQuestions.length < validQuestionsCount;

  return (
    <Dialog
      open={importDialogOpen}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      TransitionProps={{
        timeout: { enter: 0, exit: 0 }
      }}
    >
      <DialogTitle>
        Импорт вопросов из файла
        <IconButton
          onClick={handleClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ mb: 3 }}>
          <Typography variant="body1" gutterBottom>
            Загрузите Excel или CSV файл с вопросами. Поддерживаемые типы: текстовые, с выбором одного варианта, с выбором нескольких вариантов, черный ящик.
          </Typography>
          
          <Card sx={{ mb: 3, mt: 2 }}>
            <CardContent>
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                
                <Typography variant="h6" gutterBottom>
                  Выберите файл для импорта
                </Typography>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Поддерживаемые форматы: .xlsx, .xls, .csv
                </Typography>
                
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
                  <Button
                    variant="contained"
                    component="label"
                    startIcon={<Upload />}
                    disabled={importLoading}
                  >
                    Выбрать файл
                    <input
                      type="file"
                      hidden
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileSelect}
                      ref={fileInputRef}
                    />
                  </Button>
                  
                  <Button
                    variant="outlined"
                    startIcon={<Download />}
                    onClick={downloadTemplate}
                  >
                    Шаблон
                  </Button>
                </Box>
                
                {importFile && (
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="body2">
                      Выбран файл: <strong>{importFile.name}</strong> ({Math.round(importFile.size / 1024)} KB)
                    </Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>

          {importLoading && (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <CircularProgress />
              <Typography variant="body2" sx={{ mt: 1 }}>
                Чтение файла...
              </Typography>
            </Box>
          )}

          {importPreview && !importLoading && (
            <>
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Предпросмотр ({importPreview.preview_count} из {importPreview.total_questions})
                </Typography>
                
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Статистика:
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                    <Chip
                      label={`Всего: ${importPreview.total_questions}`}
                      size="small"
                      variant="outlined"
                    />
                    <Chip
                      label={`Валидные: ${importPreview.preview.filter(q => q.is_valid).length}`}
                      size="small"
                      color="success"
                      variant="outlined"
                    />
                    <Chip
                      label={`С ошибками: ${importPreview.preview.filter(q => !q.is_valid).length}`}
                      size="small"
                      color="error"
                      variant="outlined"
                    />
                  </Box>
                </Box>

                <Box sx={{ maxHeight: 300, overflow: 'auto', mb: 2 }}>
                  <TableContainer>
<Table size="small">
  <TableHead>
    <TableRow>
      <TableCell padding="checkbox">
        <Checkbox
          checked={isAllSelected}
          indeterminate={isIndeterminate}
          onChange={toggleSelectAllQuestions}
          disabled={validQuestionsCount === 0}
        />
      </TableCell>
      <TableCell>№</TableCell>
      <TableCell>Вопрос</TableCell>
      <TableCell>Тип вопроса</TableCell>
      <TableCell>Тип ответа</TableCell> {/* ← ДОБАВЬТЕ ЭТУ КОЛОНКУ */}
      <TableCell>Статус</TableCell>
    </TableRow>
  </TableHead>
  <TableBody>
    {importPreview.preview.slice(0, 10).map((question, index) => (
      <TableRow 
        key={index}
        sx={{ 
          backgroundColor: question.is_valid ? 'success.50' : 'error.50',
          opacity: question.is_valid ? 1 : 0.7
        }}
      >
        <TableCell padding="checkbox">
          <Checkbox
            checked={selectedImportQuestions.includes(index)}
            onChange={() => {
              if (question.is_valid) {
                toggleSelectQuestion(index);
              }
            }}
            disabled={!question.is_valid}
            onClick={(e) => {
              e.stopPropagation();
            }}
          />
        </TableCell>
        <TableCell>{index + 1}</TableCell>
        <TableCell>
          <Typography 
            variant="body2" 
            sx={{ 
              maxWidth: 300,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {question.question_text}
          </Typography>
        </TableCell>
        <TableCell>
          <Chip 
            label={question.question_type} 
            size="small" 
            variant="outlined"
          />
        </TableCell>
        <TableCell> {/* ← ДОБАВЬТЕ ЭТУ ЯЧЕЙКУ */}
          <Chip 
            label={question.answer_type || 'text'} 
            size="small" 
            variant="outlined"
            color={question.answer_type === 'single_choice' ? 'primary' : 
                   question.answer_type === 'multiple_choice' ? 'secondary' : 'default'}
          />
        </TableCell>
        <TableCell>
          {question.is_valid ? (
            <CheckCircle sx={{ color: 'success.main', fontSize: 20 }} />
          ) : (
            <ErrorIcon sx={{ color: 'error.main', fontSize: 20 }} />
          )}
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
                  </TableContainer>
                  
                  {importPreview.preview.length > 10 && (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 1 }}>
                      ... и еще {importPreview.preview.length - 10} вопросов
                    </Typography>
                  )}
                </Box>
              </Box>
            </>
          )}

          {importError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {importError}
            </Alert>
          )}

          {importSuccess && (
            <Alert severity="success" sx={{ mt: 2 }}>
              {importSuccess}
            </Alert>
          )}

          {/* ИСПРАВЛЕННОЕ ОПИСАНИЕ ФОРМАТА ФАЙЛА */}
<Card sx={{ mt: 3 }}>
  <CardContent>
    <Typography variant="h6" gutterBottom>
      📋 Формат файла (Excel/CSV)
    </Typography>
    
<Typography variant="body2" color="text.secondary" paragraph>
  Поддерживаются только текстовые вопросы и черные ящики. Допустимые типы вопросов: <strong>text</strong>, <strong>blackbox</strong>.
</Typography>
    
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ backgroundColor: 'grey.100' }}>
            <TableCell><strong>Колонка</strong></TableCell>
            <TableCell><strong>Обязательно</strong></TableCell>
            <TableCell><strong>Описание</strong></TableCell>
            <TableCell><strong>Пример</strong></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell><strong>question_type</strong></TableCell>
            <TableCell>✅ Да</TableCell>
            <TableCell>
              Тип вопроса: <strong>text</strong>, <strong>blackbox</strong>, <strong>image</strong>, <strong>video</strong>, <strong>audio</strong>, <strong>code</strong>
            </TableCell>
            <TableCell>"text"</TableCell>
          </TableRow>
          <TableRow>
            <TableCell><strong>answer_type</strong></TableCell>
            <TableCell>✅ Да</TableCell>
            <TableCell>
              Тип ответа: <strong>text</strong>, <strong>single_choice</strong>, <strong>multiple_choice</strong>
            </TableCell>
            <TableCell>"single_choice"</TableCell>
          </TableRow>
          <TableRow>
            <TableCell><strong>Вопрос / question</strong></TableCell>
            <TableCell>✅ Да</TableCell>
            <TableCell>Текст вопроса</TableCell>
            <TableCell>"Столица Франции?"</TableCell>
          </TableRow>
          <TableRow>
            <TableCell><strong>correct_answer</strong></TableCell>
            <TableCell>Для text, single_choice, blackbox</TableCell>
            <TableCell>
              <Box>
                <Typography variant="body2"><strong>text:</strong> правильный текст</Typography>
                <Typography variant="body2"><strong>single_choice:</strong> правильный вариант</Typography>
                <Typography variant="body2"><strong>blackbox:</strong> ожидаемый результат</Typography>
              </Box>
            </TableCell>
            <TableCell>"Париж"</TableCell>
          </TableRow>
          <TableRow>
            <TableCell><strong>Варианты ответов / options</strong></TableCell>
            <TableCell>Для single_choice/multiple_choice</TableCell>
            <TableCell>
              Варианты ответов через точку с запятой (;)
            </TableCell>
            <TableCell>"Париж;Лондон;Берлин;Мадрид"</TableCell>
          </TableRow>
          <TableRow>
            <TableCell><strong>correct_options</strong></TableCell>
            <TableCell>Для multiple_choice</TableCell>
            <TableCell>Правильные варианты через точку с запятой (;)</TableCell>
            <TableCell>"Python;JavaScript"</TableCell>
          </TableRow>
          <TableRow>
            <TableCell><strong>blackbox_description</strong></TableCell>
            <TableCell>Для blackbox</TableCell>
            <TableCell>Описание черного ящика</TableCell>
            <TableCell>"Функция принимает число и возвращает его квадрат"</TableCell>
          </TableRow>
          <TableRow>
            <TableCell><strong>Категория / category</strong></TableCell>
            <TableCell>✅ Да</TableCell>
            <TableCell>Название категории</TableCell>
            <TableCell>"география"</TableCell>
          </TableRow>
          <TableRow>
            <TableCell><strong>Сложность / difficulty</strong></TableCell>
            <TableCell>Нет (1 по умолчанию)</TableCell>
            <TableCell>От 1 (легко) до 5 (сложно)</TableCell>
            <TableCell>"2"</TableCell>
          </TableRow>
          <TableRow>
            <TableCell><strong>Баллы / points</strong></TableCell>
            <TableCell>Нет (1 по умолчанию)</TableCell>
            <TableCell>Количество баллов за вопрос</TableCell>
            <TableCell>"1"</TableCell>
          </TableRow>
          <TableRow>
            <TableCell><strong>Объяснение / explanation</strong></TableCell>
            <TableCell>Нет</TableCell>
            <TableCell>Пояснение к правильному ответу</TableCell>
            <TableCell>"Париж - столица Франции"</TableCell>
          </TableRow>
          <TableRow>
            <TableCell><strong>media_url</strong></TableCell>
            <TableCell>Для image/video/audio</TableCell>
            <TableCell>URL медиафайла</TableCell>
            <TableCell>"https://example.com/image.jpg"</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
    
    <Alert severity="info" sx={{ mt: 2 }}>
      <Typography variant="body2">
        <strong>Ключевые моменты:</strong><br/>
        1. Используйте <strong>question_type</strong> для формы вопроса<br/>
        2. Используйте <strong>answer_type</strong> для формы ответа<br/>
        3. Для вопросов с выбором используйте колонки "Варианты ответов" и "correct_options" (для multiple_choice)
      </Typography>
    </Alert>
  </CardContent>
</Card>
          
          {/* ДОПОЛНИТЕЛЬНЫЙ КАРТОЧКА С ПРИМЕРАМИ */}
<Card sx={{ mt: 3 }}>
  <CardContent>
    <Typography variant="h6" gutterBottom>
      📝 Примеры заполнения
    </Typography>
    
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ backgroundColor: 'grey.100' }}>
            <TableCell><strong>question_type</strong></TableCell>
            <TableCell><strong>answer_type</strong></TableCell>
            <TableCell><strong>Вопрос</strong></TableCell>
            <TableCell><strong>Варианты</strong></TableCell>
            <TableCell><strong>Правильный ответ</strong></TableCell>
            <TableCell><strong>correct_options</strong></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell><Chip label="text" size="small" color="primary" /></TableCell>
            <TableCell><Chip label="single_choice" size="small" color="secondary" /></TableCell>
            <TableCell>"Столица Франции?"</TableCell>
            <TableCell>"Париж;Лондон;Берлин;Мадрид"</TableCell>
            <TableCell>"Париж"</TableCell>
            <TableCell>-</TableCell>
          </TableRow>
          <TableRow>
            <TableCell><Chip label="text" size="small" color="primary" /></TableCell>
            <TableCell><Chip label="multiple_choice" size="small" color="secondary" /></TableCell>
            <TableCell>"Какие языки программирования?"</TableCell>
            <TableCell>"Python;HTML;CSS;JavaScript"</TableCell>
            <TableCell>-</TableCell>
            <TableCell>"Python;JavaScript"</TableCell>
          </TableRow>
          <TableRow>
            <TableCell><Chip label="text" size="small" color="primary" /></TableCell>
            <TableCell><Chip label="text" size="small" color="default" /></TableCell>
            <TableCell>"Сколько планет в Солнечной системе?"</TableCell>
            <TableCell>-</TableCell>
            <TableCell>"8"</TableCell>
            <TableCell>-</TableCell>
          </TableRow>
          <TableRow>
            <TableCell><Chip label="blackbox" size="small" color="warning" /></TableCell>
            <TableCell><Chip label="text" size="small" color="default" /></TableCell>
            <TableCell>"Что делает эта функция?"</TableCell>
            <TableCell>-</TableCell>
            <TableCell>"Возводит число в квадрат"</TableCell>
            <TableCell>-</TableCell>
          </TableRow>
          <TableRow>
            <TableCell><Chip label="image" size="small" color="info" /></TableCell>
            <TableCell><Chip label="single_choice" size="small" color="secondary" /></TableCell>
            <TableCell>"Что изображено на картинке?"</TableCell>
            <TableCell>"Эйфелева башня;Колизей;Биг Бен;Статуя Свободы"</TableCell>
            <TableCell>"Эйфелева башня"</TableCell>
            <TableCell>-</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  </CardContent>
</Card>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>
          Отмена
        </Button>
        <Button
          variant="contained"
          onClick={handleAddSelectedQuestions}
          disabled={selectedImportQuestions.length === 0 || importing}
          startIcon={importing ? <CircularProgress size={20} /> : <CloudUpload />}
        >
          {importing ? 'Добавление...' : `Добавить выбранные (${selectedImportQuestions.length})`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};


  const TestTypeStep = useCallback(() => (
    <Box sx={{ textAlign: 'center', p: 3 }}>
      {loadingData ? (
        <Box sx={{ py: 4 }}>
          <CircularProgress />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Загрузка данных теста...
          </Typography>
        </Box>
      ) : (
        <>
          <Typography variant="h4" gutterBottom>
            {isEditMode ? 'Редактирование теста' : 'Выберите тип теста'}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            {isEditMode ? 'Обновление параметров теста' : 'Как будет проходить тестирование?'}
          </Typography>

          {isEditMode && (
            <Alert severity="info" sx={{ maxWidth: 600, margin: '0 auto', mb: 3 }}>
              Режим редактирования. Вы можете изменить все параметры теста.
            </Alert>
          )}

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
                    boxShadow: 2,
                    transform: 'translateY(-4px)'
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
                    boxShadow: 2,
                    transform: 'translateY(-4px)'
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
        </>
      )}
    </Box>
  ), [testType, isEditMode, loadingData]);

  const FieldWithHelp = useCallback(({ label, helpText, children }) => (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Typography variant="body2" fontWeight="medium">
          {label}
        </Typography>
        {helpText && (
          <Tooltip title={helpText} arrow>
            <HelpOutline sx={{ fontSize: 16, ml: 1, color: 'text.secondary' }} />
          </Tooltip>
        )}
      </Box>
      {children}
    </Box>
  ), []);

  const TestSettingsStepComponent = () => {
    const [localSettings, setLocalSettings] = useState(testSettings);
    const [localDates, setLocalDates] = useState(assignmentDates);
    const updateTimeoutRef = useRef(null);

    useEffect(() => {
      setLocalSettings(testSettings);
      setLocalDates(assignmentDates);
    }, [testSettings, assignmentDates]);

    const debouncedUpdate = useCallback((updatedSettings) => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      
      updateTimeoutRef.current = setTimeout(() => {
        setTestSettings(updatedSettings);
      }, 300);
    }, []);

    const handleSettingsChange = useCallback((field, value) => {
      const updated = {
        ...localSettings,
        [field]: value
      };
      setLocalSettings(updated);
      debouncedUpdate(updated);
    }, [localSettings, debouncedUpdate]);

    const handleDateChange = useCallback((field, value) => {
      const updated = {
        ...localDates,
        [field]: value
      };
      setLocalDates(updated);
      setAssignmentDates(updated);
    }, [localDates]);

    const handleSwitchChange = useCallback((field) => (e) => {
      handleSettingsChange(field, e.target.checked);
    }, [handleSettingsChange]);

    const handleSelectChange = useCallback((field) => (e) => {
      handleSettingsChange(field, e.target.value);
    }, [handleSettingsChange]);

    const handleInputChange = useCallback((field) => (e) => {
      handleSettingsChange(field, e.target.value);
    }, [handleSettingsChange]);

    const handleNumberChange = useCallback((field) => (e) => {
      const value = e.target.value === '' ? '' : parseInt(e.target.value) || 1;
      handleSettingsChange(field, value);
    }, [handleSettingsChange]);

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
          {isEditMode ? 'Обновите параметры теста' : `Настройте основные параметры ${testType === 'team' ? 'командного' : 'индивидуального'} теста`}
        </Typography>

        {isEditMode && (
          <Alert severity="info" sx={{ mb: 3 }}>
            Вы редактируете существующий тест. Все изменения сохранятся после нажатия кнопки "Обновить тест"
          </Alert>
        )}

        {/* Уведомление о назначении группе */}
        {groupId && (
          <Alert severity="info" sx={{ mb: 3 }}>
            {isEditMode ? 'Обновление назначения теста группе' : 'Тест будет автоматически назначен группе с указанными ниже датами'}
          </Alert>
        )}

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

          {/* ПОЛЯ ДЛЯ ДАТ НАЗНАЧЕНИЯ ТЕСТА (если создаем из группы) */}
          {groupId && (
            <>
              <Grid item xs={12} sm={6}>
                <FieldWithHelp 
                  label="Дата начала тестирования" 
                  helpText="С какого числа участники смогут начать прохождение теста"
                >
                  <TextField
                    fullWidth
                    type="datetime-local"
                    value={localDates.start_date}
                    onChange={(e) => handleDateChange('start_date', e.target.value)}
                    InputLabelProps={{
                      shrink: true,
                    }}
                  />
                </FieldWithHelp>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FieldWithHelp 
                  label="Дата окончания тестирования" 
                  helpText="До какого числа участники могут пройти тест"
                >
                  <TextField
                    fullWidth
                    type="datetime-local"
                    value={localDates.end_date}
                    onChange={(e) => handleDateChange('end_date', e.target.value)}
                    InputLabelProps={{
                      shrink: true,
                    }}
                  />
                </FieldWithHelp>
              </Grid>
            </>
          )}

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

  const TestSettingsStep = useCallback(() => <TestSettingsStepComponent />, [testType, groupId, isEditMode]);

  const QuestionsStep = useCallback(() => {
    console.log('🔄 Рендер QuestionsStep, вопросов:', questions.length);
    
    return (
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">
            Вопросы теста ({questions.length})
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button 
              variant="outlined" 
              startIcon={<InsertDriveFile />}
              onClick={() => {
                console.log('📁 Открытие диалога импорта');
                setImportDialogOpen(true);
              }}
            >
              Импорт из файла
            </Button>
            <Button 
              variant="contained" 
              startIcon={<Add />}
              onClick={addQuestion}
            >
              Добавить вопрос
            </Button>
          </Box>
        </Box>

        {questions.length === 0 ? (
          <Card sx={{ p: 4, textAlign: 'center', bgcolor: 'grey.50' }}>
            <InsertDriveFile sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              В тесте пока нет вопросов
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Добавьте вопросы вручную или импортируйте их из файла
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button 
                variant="outlined" 
                startIcon={<InsertDriveFile />}
                onClick={() => setImportDialogOpen(true)}
              >
                Импорт из файла
              </Button>
              <Button 
                variant="contained" 
                startIcon={<Add />}
                onClick={addQuestion}
              >
                Добавить вопрос
              </Button>
            </Box>
          </Card>
        ) : (
          <>
            <Box sx={{ mb: 3 }}>
              <Alert severity="info">
                <Typography variant="body2">
                  В тесте <strong>{questions.length}</strong> вопрос{questions.length === 1 ? '' : questions.length < 5 ? 'а' : 'ов'}.
                  {questions.some(q => q.sources === 'Импортировано из файла') && (
                    <span> Некоторые вопросы импортированы из файла.</span>
                  )}
                </Typography>
              </Alert>
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
          </>
        )}
      </Box>
    );
  }, [questions, addQuestion, updateQuestion, removeQuestion]);

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
      'multiple_choice': '☑️ Несколько вариантов'
    };
    return types[type] || type;
  }, []);

  const PreviewStep = useCallback(() => (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ color: 'text.primary', fontWeight: 'bold' }}>
        {isEditMode ? 'Предпросмотр изменений' : 'Предпросмотр теста'}
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
          
          {/* Информация о назначении группе */}
          {groupId && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2" fontWeight="bold">
                {isEditMode ? 'Обновление назначения теста группе' : 'Тест будет назначен группе'}
              </Typography>
              {assignmentDates.start_date && (
                <Typography variant="body2">
                  Начало: {new Date(assignmentDates.start_date).toLocaleDateString('ru-RU')} {new Date(assignmentDates.start_date).toLocaleTimeString('ru-RU')}
                </Typography>
              )}
              {assignmentDates.end_date && (
                <Typography variant="body2">
                  Окончание: {new Date(assignmentDates.end_date).toLocaleDateString('ru-RU')} {new Date(assignmentDates.end_date).toLocaleTimeString('ru-RU')}
                </Typography>
              )}
            </Alert>
          )}
          
          {isEditMode && (
            <Chip 
              label="Режим редактирования" 
              color="warning" 
              sx={{ mb: 2 }}
            />
          )}
          
          {questions.some(q => q.allow_latex) && (
            <Chip 
              label="Поддержка LaTeX" 
              color="info" 
              icon={<Functions />}
              sx={{ mb: 2 }}
            />
          )}
          
          {questions.some(q => q.sources === 'Импортировано из файла') && (
            <Chip 
              label="Вопросы импортированы из файла" 
              color="success" 
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
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {questions.map((question, index) => (
          <Card 
            key={question.id} 
            sx={{ 
              p: 3,
              backgroundColor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              position: 'relative'
            }}
          >
            {question.sources === 'Импортировано из файла' && (
              <Chip 
                label="Импортировано" 
                size="small" 
                color="info"
                sx={{ position: 'absolute', top: 8, right: 8 }}
              />
            )}
            
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 3 }}>
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
              
              <Box sx={{ flexGrow: 1 }}>
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
                
                {question.sources && question.sources !== 'Импортировано из файла' && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Источники:</strong> {question.sources}
                    </Typography>
                  </Box>
                )}
                
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
  ), [questions, testSettings, assignmentDates, groupId, getQuestionTypeLabel, getAnswerTypeLabel, isEditMode]);

  const handleNext = useCallback(() => {
    if (activeStep === steps.length - 1) {
      handleSubmit();
    } else {
      setActiveStep((prev) => prev + 1);
    }
  }, [activeStep]);

  const handleBack = useCallback(() => {
    if (activeStep === 0) {
      if (groupId) {
        navigate(`/groups/${groupId}`);
      } else {
        navigate('/my-tests');
      }
    } else {
      setActiveStep((prev) => prev - 1);
    }
  }, [activeStep, navigate, groupId]);

const getTypeId = useCallback((questionType) => {
  const mapping = {
    'text': 1,
    'blackbox': 2,
    'image': 3,
    'video': 4,
    'audio': 5,
    'code': 6
  };
  return mapping[questionType] || 1; // По умолчанию 'text'
}, []);
const getAnswerTypeId = useCallback((answerType) => {
  const mapping = {
    'text': 1,
    'single_choice': 2,
    'multiple_choice': 3
  };
  return mapping[answerType] || 1; // По умолчанию 'text'
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

      console.log('=== НАЧАЛО ' + (isEditMode ? 'ОБНОВЛЕНИЯ' : 'СОЗДАНИЯ') + ' ТЕСТА ===');
      
      const questionIds = []; // Будем хранить ID созданных/обновленных вопросов
      
      for (const [index, question] of questions.entries()) {
        try {
          console.log(`${isEditMode ? 'Обновление' : 'Создание'} вопроса ${index + 1}:`, question);
          
          // Определяем type_id и answer_type_id
          const typeId = getTypeId(question.type);
          const answerTypeId = getAnswerTypeId(question.answer_type);
          
          // Подготавливаем данные вопроса
          const questionData = {
            question_text: question.question_text,
            type_id: typeId,
            answer_type_id: answerTypeId,
            category_id: question.category_id || 1,
            difficulty: question.difficulty || 1,
            explanation: question.explanation || '',
            time_limit: question.time_limit || 60,
            points: question.points || 1,
            media_url: question.media_url || '',
            sources: question.sources || '',
            allow_latex: question.allow_latex || false,
            blackbox_description: question.blackbox_description || '',
            answer_requirements: question.answer_requirements || '',
            correct_answer: question.correct_answer || ''
          };

          // Добавляем варианты ответов если есть
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

          let questionResponse;
          
          if (isEditMode && question.originalId) {
            // ОБНОВЛЯЕМ существующий вопрос
            console.log(`Обновляем вопрос с ID: ${question.originalId}`);
            questionResponse = await api.put(`/questions/${question.originalId}`, questionData);
            console.log('Вопрос обновлен:', questionResponse.data);
          } else {
            // СОЗДАЕМ новый вопрос
            console.log('Создаем новый вопрос');
            questionResponse = await api.post('/questions/', questionData);
            console.log('Вопрос создан:', questionResponse.data);
          }
          
          // Сохраняем ID вопроса
          questionIds.push({
            question_id: questionResponse.data.id,
            points: question.points || 1,
            sort_order: index
          });
          
        } catch (questionError) {
          console.error(`Ошибка при ${isEditMode ? 'обновлении' : 'создании'} вопроса ${index + 1}:`, questionError);
          const errorMessage = extractErrorMessage(questionError);
          throw new Error(`Ошибка при ${isEditMode ? 'обновлении' : 'создании'} вопроса ${index + 1}: ${errorMessage}`);
        }
      }

      // Подготавливаем данные теста
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
        questions: questionIds
      };

      console.log('Данные для ' + (isEditMode ? 'обновления' : 'создания') + ' теста:', testData);

      let resultTestId = originalTestId;
      
      if (isEditMode) {
        // Обновляем существующий тест
        try {
          // Сначала проверяем есть ли endpoint для обновления теста
          console.log('Пробуем обновить существующий тест:', originalTestId);
          
          // Отправляем запрос на обновление теста
          const response = await api.put(`/tests/${originalTestId}`, testData);
          console.log('Тест обновлен успешно:', response.data);
          resultTestId = response.data.id;
          
        } catch (updateError) {
          console.error('Ошибка обновления теста, создаем новый:', updateError);
          
          // Если обновление не удалось, создаем новый тест
          const createResponse = await api.post('/tests/', testData);
          resultTestId = createResponse.data.id;
          console.log('Новый тест создан вместо обновления:', createResponse.data);
        }
      } else {
        // Создаем новый тест
        const response = await api.post('/tests/', testData);
        resultTestId = response.data.id;
        console.log('Тест создан успешно:', response.data);
      }
      
      // Работа с назначением группе
      if (groupId) {
        try {
          console.log('Работа с назначением группе:', { resultTestId, groupId, assignmentDates });
          
          // Форматируем даты для отправки
          const formatDateForAPI = (dateString) => {
            if (!dateString) return null;
            const date = new Date(dateString);
            return date.toISOString();
          };
          
          const assignmentData = {
            test_id: resultTestId,
            group_id: parseInt(groupId),
            start_date: formatDateForAPI(assignmentDates.start_date),
            end_date: formatDateForAPI(assignmentDates.end_date)
          };
          
          console.log('Данные для назначения:', assignmentData);
          
          if (isEditMode) {
            // При редактировании сначала ищем существующее назначение
            try {
              const assignmentsResponse = await api.get(`/test-assignments/?test_id=${resultTestId}&group_id=${groupId}`);
              if (assignmentsResponse.data && assignmentsResponse.data.length > 0) {
                // Обновляем существующее назначение
                const assignmentId = assignmentsResponse.data[0].id;
                await api.put(`/test-assignments/${assignmentId}`, assignmentData);
                console.log('Назначение обновлено');
              } else {
                // Создаем новое назначение
                await api.post('/test-assignments/', assignmentData);
                console.log('Назначение создано');
              }
            } catch (assignmentsError) {
              // Если не нашли назначение, создаем новое
              await api.post('/test-assignments/', assignmentData);
              console.log('Назначение создано (после ошибки поиска)');
            }
          } else {
            // При создании всегда создаем новое назначение
            await api.post('/test-assignments/', assignmentData);
            console.log('Назначение создано');
          }
          
          setSuccess(isEditMode 
            ? 'Тест успешно обновлен и назначение обновлено!' 
            : 'Тест успешно создан и назначен группе!');
          
        } catch (assignmentError) {
          console.error('Ошибка при работе с назначением:', assignmentError);
          setSuccess(isEditMode 
            ? 'Тест обновлен, но не удалось обновить назначение группе'
            : 'Тест создан, но не удалось назначить группе. Вы можете назначить его позже.');
        }
      } else {
        setSuccess(isEditMode 
          ? 'Тест успешно обновлен!' 
          : 'Тест успешно создан!');
      }
      
      // Перенаправляем
      setTimeout(() => {
        if (groupId) {
          navigate(`/groups/${groupId}`);
        } else {
          navigate('/my-tests');
        }
      }, 2000);
      
    } catch (err) {
      console.error(`Критическая ошибка при ${isEditMode ? 'обновлении' : 'создании'} теста:`, err);
      const errorMessage = extractErrorMessage(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [testSettings, questions, navigate, getTypeId, getAnswerTypeId, extractErrorMessage, groupId, assignmentDates, isEditMode, originalTestId]);

  const renderStepContent = useCallback((step) => {
    if (loading && step === 0 && isEditMode) {
      return (
        <Box sx={{ textAlign: 'center', p: 4 }}>
          <Typography variant="h6" gutterBottom>
            Загрузка данных теста...
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Подождите, загружаем информацию о тесте для редактирования
          </Typography>
        </Box>
      );
    }
    
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
  }, [TestTypeStep, TestSettingsStep, QuestionsStep, PreviewStep, loading, isEditMode]);

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
            {isEditMode ? 'Редактирование теста' : 'Создание теста'}
          </Typography>
          {isEditMode && (
            <Chip 
              label="Редактирование" 
              color="warning" 
              size="small"
              sx={{ ml: 2 }}
            />
          )}
          {groupId && (
            <Chip 
              label="Для группы" 
              color="primary" 
              size="small"
              sx={{ ml: 2 }}
            />
          )}
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

        {/* ДИАЛОГ ИМПОРТА - ВНЕ Steps, но внутри CreateTest */}
        <ImportQuestionsDialog />

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={loading}
            startIcon={activeStep === steps.length - 1 ? <Save /> : null}
            size="large"
            color={isEditMode ? "warning" : "primary"}
          >
            {loading 
              ? (isEditMode ? 'Обновление...' : 'Создание...') 
              : activeStep === steps.length - 1 
                ? (isEditMode ? 'Обновить тест' : 'Создать тест') 
                : 'Далее'
            }
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default CreateTest;