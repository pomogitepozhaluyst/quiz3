import pandas as pd
import io
from typing import List, Dict, Any, Optional
from fastapi import UploadFile, HTTPException
from datetime import datetime

class QuestionFileImporter:
    @staticmethod
    def validate_file(file: UploadFile, max_size_mb: int = 10):
        """Проверка файла перед обработкой"""
        if file.size > max_size_mb * 1024 * 1024:
            raise HTTPException(
                status_code=400, 
                detail=f"Файл слишком большой. Максимум {max_size_mb}MB"
            )
        
        allowed_extensions = ['.xlsx', '.xls', '.csv']
        if not any(file.filename.lower().endswith(ext) for ext in allowed_extensions):
            raise HTTPException(
                status_code=400, 
                detail="Поддерживаются только Excel (.xlsx, .xls) и CSV файлы"
            )
    
    @staticmethod
    def parse_excel(file_content: bytes) -> pd.DataFrame:
        """Парсинг Excel файла"""
        try:
            # Читаем все листы
            excel_file = pd.ExcelFile(io.BytesIO(file_content))
            
            # Пробуем найти лист с вопросами
            sheet_names = excel_file.sheet_names
            sheet_name = None
            
            # Ищем подходящий лист
            for name in sheet_names:
                if any(keyword in name.lower() for keyword in ['questions', 'вопросы', 'data', 'sheet']):
                    sheet_name = name
                    break
            
            if sheet_name is None:
                sheet_name = sheet_names[0]
            
            # Читаем данные
            df = pd.read_excel(io.BytesIO(file_content), sheet_name=sheet_name)
            
            return df
        except Exception as e:
            raise HTTPException(
                status_code=400, 
                detail=f"Ошибка чтения Excel файла: {str(e)}"
            )
    
    @staticmethod
    def parse_csv(file_content: bytes, encoding: str = 'utf-8') -> pd.DataFrame:
        """Парсинг CSV файла"""
        try:
            # Пробуем разные кодировки
            for enc in [encoding, 'windows-1251', 'cp1251', 'iso-8859-1']:
                try:
                    df = pd.read_csv(io.BytesIO(file_content), encoding=enc)
                    return df
                except:
                    continue
            
            raise Exception("Не удалось определить кодировку файла")
        except Exception as e:
            raise HTTPException(
                status_code=400, 
                detail=f"Ошибка чтения CSV файла: {str(e)}"
            )
    
@staticmethod
def normalize_column_names(df: pd.DataFrame) -> pd.DataFrame:
    """Нормализация названий колонок"""
    column_mapping = {
        # Русские варианты
        'вопрос': 'question',
        'текст вопроса': 'question',
        'вопрос текст': 'question',
        'тип вопроса': 'question_type',  # ← Поменяйте на question_type
        'тип вопроса type': 'question_type',
        'тип ответа': 'answer_type',  # ← Добавьте
        'тип ответа answer_type': 'answer_type',
        'тип': 'question_type',
        'правильный ответ': 'correct_answer',
        'ответ': 'correct_answer',
        'варианты': 'options',
        'варианты ответов': 'options',
        'варианты ответа': 'options',
        'правильные варианты': 'correct_options',
        'правильные варианты ответов': 'correct_options',
        'категория': 'category',
        'тема': 'category',
        'раздел': 'category',
        'сложность': 'difficulty',
        'баллы': 'points',
        'очки': 'points',
        'объяснение': 'explanation',
        'пояснение': 'explanation',
        'комментарий': 'explanation',
        'описание черного ящика': 'blackbox_description',
        'url медиа': 'media_url',
        'ссылка': 'media_url',
        
        # Английские варианты
        'question': 'question',
        'question text': 'question',
        'text': 'question',
        'question_type': 'question_type',  # ← Измените
        'qtype': 'question_type',
        'answer_type': 'answer_type',  # ← Добавьте
        'answer type': 'answer_type',
        'answer': 'correct_answer',
        'correct answer': 'correct_answer',
        'choices': 'options',
        'options': 'options',
        'correct choices': 'correct_options',
        'correct options': 'correct_options',
        'category': 'category',
        'topic': 'category',
        'difficulty': 'difficulty',
        'points': 'points',
        'score': 'points',
        'explanation': 'explanation',
        'comment': 'explanation',
        'blackbox_description': 'blackbox_description',
        'media_url': 'media_url',
        'media': 'media_url'
    }
    
    # Приводим все названия колонок к нижнему регистру и удаляем пробелы
    df.columns = [str(col).strip().lower().replace(' ', '_') for col in df.columns]
    
    # Переименовываем колонки
    new_columns = {}
    for col in df.columns:
        for key, value in column_mapping.items():
            if col == key or col.replace('_', '') == key.replace(' ', ''):
                new_columns[col] = value
                break
        else:
            new_columns[col] = col
    
    return df.rename(columns=new_columns)
    
@staticmethod
def extract_questions_from_dataframe(df: pd.DataFrame, default_category: str = "Общие знания") -> List[Dict]:
    """Извлечение вопросов из DataFrame"""
    questions = []
    
    for index, row in df.iterrows():
        try:
            # Пропускаем пустые строки
            if pd.isna(row.get('question', '')):
                continue
            
            question_data = {
                'question_text': str(row.get('question', '')).strip(),
                'question_type': row.get('type', 'text').strip().lower(),
                'answer_type': row.get('answer_type', 'text').strip().lower(),  # ← ДОБАВЬТЕ ЭТО!
                'category': row.get('category', default_category).strip(),
                'difficulty': int(row.get('difficulty', 1)),
                'points': int(row.get('points', 1)),
                'explanation': str(row.get('explanation', '')).strip() if pd.notna(row.get('explanation')) else None
            }
            
            # Обработка правильного ответа
            if pd.notna(row.get('correct_answer')):
                question_data['correct_answer'] = str(row.get('correct_answer')).strip()
            
            # Обработка вариантов ответов
            options = None
            if pd.notna(row.get('options')):
                options_str = str(row.get('options'))
                if ';' in options_str:
                    options = [opt.strip() for opt in options_str.split(';') if opt.strip()]
                elif ',' in options_str:
                    options = [opt.strip() for opt in options_str.split(',') if opt.strip()]
                elif '|' in options_str:
                    options = [opt.strip() for opt in options_str.split('|') if opt.strip()]
                else:
                    options = [options_str.strip()]
            
            if options:
                question_data['options'] = options
                
                # Обработка правильных вариантов (для multiple choice)
                if pd.notna(row.get('correct_options')):
                    correct_opts_str = str(row.get('correct_options'))
                    if ';' in correct_opts_str:
                        correct_options = [opt.strip() for opt in correct_opts_str.split(';') if opt.strip()]
                    elif ',' in correct_opts_str:
                        correct_options = [opt.strip() for opt in correct_opts_str.split(',') if opt.strip()]
                    elif '|' in correct_opts_str:
                        correct_options = [opt.strip() for opt in correct_opts_str.split('|') if opt.strip()]
                    else:
                        correct_options = [correct_opts_str.strip()]
                    
                    question_data['correct_options'] = correct_options
            
            # Обработка blackbox_description
            if pd.notna(row.get('blackbox_description')):
                question_data['blackbox_description'] = str(row.get('blackbox_description')).strip()
            
            # Обработка media_url
            if pd.notna(row.get('media_url')):
                question_data['media_url'] = str(row.get('media_url')).strip()
            
            questions.append(question_data)
            
        except Exception as e:
            # Пропускаем строку с ошибкой
            print(f"Ошибка при обработке строки {index}: {str(e)}")
            continue
    
    return questions
    
@staticmethod
def validate_question_data(question_data: Dict) -> List[str]:
    """Валидация данных вопроса"""
    errors = []
    
    # Проверка обязательных полей
    if not question_data.get('question_text'):
        errors.append("Текст вопроса обязателен")
    
    # Проверка типа вопроса
    valid_question_types = ['text', 'blackbox', 'image', 'video', 'audio', 'code']
    question_type = question_data.get('question_type', 'text')
    if question_type not in valid_question_types:
        errors.append(f"Неподдерживаемый тип вопроса: {question_type}")
    
    # Проверка типа ответа
    valid_answer_types = ['text', 'single_choice', 'multiple_choice']
    answer_type = question_data.get('answer_type', 'text')
    if answer_type not in valid_answer_types:
        errors.append(f"Неподдерживаемый тип ответа: {answer_type}")
    
    # Проверка для вопросов с выбором
    if answer_type in ['single_choice', 'multiple_choice']:
        options = question_data.get('options', [])
        if not options:
            errors.append(f"Для типа ответа '{answer_type}' нужны варианты ответов")
        
        if answer_type == 'single_choice':
            correct_answer = question_data.get('correct_answer')
            if not correct_answer:
                errors.append("Для single_choice нужен правильный ответ (correct_answer)")
        
        elif answer_type == 'multiple_choice':
            correct_options = question_data.get('correct_options', [])
            if not correct_options:
                errors.append("Для multiple_choice нужны правильные варианты (correct_options)")
    
    # Проверка для текстовых вопросов и blackbox
    elif answer_type == 'text' and question_type not in ['image', 'video', 'audio']:
        if not question_data.get('correct_answer'):
            errors.append("Для текстового вопроса нужен правильный ответ")
    
    # Проверка сложности
    difficulty = question_data.get('difficulty', 1)
    if not (1 <= difficulty <= 5):
        errors.append("Сложность должна быть от 1 до 5")
    
    # Проверка баллов
    points = question_data.get('points', 1)
    if points <= 0:
        errors.append("Баллы должны быть положительными")
    
    # Проверка для blackbox
    if question_type == 'blackbox' and not question_data.get('blackbox_description'):
        errors.append("Для blackbox нужно описание черного ящика")
    
    # Проверка для media типов
    if question_type in ['image', 'video', 'audio'] and not question_data.get('media_url'):
        errors.append(f"Для типа вопроса '{question_type}' нужен URL медиафайла")
    
    return errors
    
@staticmethod
def convert_to_question_create(question_data: Dict, category_id: int, author_id: int) -> Dict:
    """Конвертация данных вопроса в формат QuestionCreate"""
    question_type = question_data.get('question_type', 'text')
    answer_type = question_data.get('answer_type', 'text')  # Получаем тип ответа из данных
    
    # Определяем type_id и answer_type_id РАЗДЕЛЬНО
    type_mapping = {
        'text': 1,
        'blackbox': 2,
        'image': 3,
        'video': 4,
        'audio': 5,
        'code': 6
    }
    
    answer_type_mapping = {
        'text': 1,
        'single_choice': 2,
        'multiple_choice': 3
    }
    
    # Создаем базовую структуру вопроса
    question = {
        'question_text': question_data['question_text'],
        'type_id': type_mapping.get(question_type, 1),  # Тип вопроса
        'answer_type_id': answer_type_mapping.get(answer_type, 1),  # Тип ответа ← ИСПРАВЛЕНО
        'author_id': author_id,  # ← ДОБАВЬТЕ это поле!
        'category_id': category_id,
        'difficulty': question_data.get('difficulty', 1),
        'explanation': question_data.get('explanation'),
        'time_limit': 60,
        'points': question_data.get('points', 1),
        'correct_answer': question_data.get('correct_answer'),
        'media_url': None,
        'sources': 'Импортировано из файла',
        'allow_latex': False,
        'blackbox_description': question_data.get('blackbox_description') if question_type == 'blackbox' else None,
        'answer_requirements': None,
        'answer_options': []
    }
    
    # Добавляем варианты ответов для вопросов с выбором
    # Теперь проверяем answer_type, а не question_type
    if answer_type in ['single_choice', 'multiple_choice']:
        options = question_data.get('options', [])
        correct_options = question_data.get('correct_options', [])
        correct_answer = question_data.get('correct_answer', '')
        
        # Для single_choice используем correct_answer
        # Для multiple_choice используем correct_options
        if answer_type == 'single_choice' and correct_answer and not correct_options:
            correct_options = [correct_answer]
        
        for i, option_text in enumerate(options):
            is_correct = option_text in correct_options
            
            question['answer_options'].append({
                'option_text': option_text,
                'is_correct': is_correct,
                'sort_order': i
            })
    
    return question