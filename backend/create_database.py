# create_database.py
import sqlite3
import os
from passlib.context import CryptContext

def create_database():
    # Проверяем, не существует ли уже БД
    if os.path.exists('testing_platform.db'):
        print("✅ База данных уже существует. Удаляем старую...")
        os.remove('testing_platform.db')
    
    # Создаем подключение
    conn = sqlite3.connect('testing_platform.db')
    cursor = conn.cursor()
    
    print("🎯 Создание базы данных для Платформы Тестирования...")
    
    # 1. Таблица ролей
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(50) UNIQUE NOT NULL,
        description VARCHAR(255),
        permissions TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    # 2. Таблица пользователей
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role_id INTEGER NOT NULL,
        avatar_url VARCHAR(255),
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME,
        is_active BOOLEAN DEFAULT TRUE,
        FOREIGN KEY (role_id) REFERENCES roles(id)
    )
    ''')
    
    # 3. Таблица учебных групп - ОБНОВЛЕННАЯ с новыми полями!
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS study_groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        invite_code VARCHAR(20) UNIQUE NOT NULL,
        created_by INTEGER NOT NULL,
        subject VARCHAR(100),
        academic_year VARCHAR(20),
        max_students INTEGER DEFAULT 30,
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_public BOOLEAN DEFAULT TRUE,  -- НОВОЕ ПОЛЕ: True = открытая группа
        password VARCHAR(255),          -- НОВОЕ ПОЛЕ: пароль для закрытых групп
        require_approval BOOLEAN DEFAULT FALSE,  -- НОВОЕ ПОЛЕ: нужно ли одобрение
        FOREIGN KEY (created_by) REFERENCES users(id)
    )
    ''')
    
    # 4. Таблица участников групп
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS group_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        group_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        role VARCHAR(20) DEFAULT 'student',
        is_active BOOLEAN DEFAULT TRUE,
        UNIQUE(group_id, user_id),
        FOREIGN KEY (group_id) REFERENCES study_groups(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
    ''')
    
    # 5. Таблица категорий вопросов
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(50) UNIQUE NOT NULL,
        description VARCHAR(255),
        color VARCHAR(7),
        icon VARCHAR(100),
        parent_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES categories(id)
    )
    ''')
    
    # 6. Таблица типов вопросов
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS question_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(50) UNIQUE NOT NULL,
        description VARCHAR(255),
        template TEXT,
        has_options BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    # 7. Таблица типов ответов
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS answer_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(50) UNIQUE NOT NULL,
        description VARCHAR(255),
        template TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    # 8. Таблица вопросов
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question_text TEXT NOT NULL,
        type_id INTEGER NOT NULL,
        answer_type_id INTEGER NOT NULL,
        category_id INTEGER NOT NULL,
        author_id INTEGER NOT NULL,
        difficulty INTEGER DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
        explanation TEXT,
        time_limit INTEGER DEFAULT 60,
        points INTEGER DEFAULT 1,
        media_url TEXT,
        sources TEXT,
        allow_latex BOOLEAN DEFAULT FALSE,
        blackbox_description TEXT,
        correct_answer TEXT,
        answer_requirements TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (type_id) REFERENCES question_types(id),
        FOREIGN KEY (answer_type_id) REFERENCES answer_types(id),
        FOREIGN KEY (category_id) REFERENCES categories(id),
        FOREIGN KEY (author_id) REFERENCES users(id)
    )
    ''')
    
    # 9. Таблица вариантов ответов
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS answer_options (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question_id INTEGER NOT NULL,
        option_text TEXT NOT NULL,
        image_url TEXT,
        is_correct BOOLEAN DEFAULT FALSE,
        sort_order INTEGER DEFAULT 0,
        FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    )
    ''')
    
    # 10. Таблица тестов
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS tests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        author_id INTEGER NOT NULL,
        time_limit INTEGER,
        max_attempts INTEGER DEFAULT 1,
        show_results VARCHAR(20) DEFAULT 'after_completion',
        shuffle_questions BOOLEAN DEFAULT FALSE,
        shuffle_answers BOOLEAN DEFAULT FALSE,
        passing_score INTEGER,
        is_active BOOLEAN DEFAULT TRUE,
        is_public BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (author_id) REFERENCES users(id)
    )
    ''')
    
    # 11. Таблица вопросов в тестах
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS test_questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        test_id INTEGER NOT NULL,
        question_id INTEGER NOT NULL,
        sort_order INTEGER DEFAULT 0,
        points INTEGER DEFAULT 1,
        UNIQUE(test_id, question_id),
        FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE,
        FOREIGN KEY (question_id) REFERENCES questions(id)
    )
    ''')
    
    # 12. Таблица назначений тестов
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS test_assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        test_id INTEGER NOT NULL,
        group_id INTEGER,
        assigned_by INTEGER NOT NULL,
        start_date DATETIME,
        end_date DATETIME,
        time_limit INTEGER,
        max_attempts INTEGER DEFAULT 1,
        passing_score INTEGER,
        settings TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (test_id) REFERENCES tests(id),
        FOREIGN KEY (group_id) REFERENCES study_groups(id),
        FOREIGN KEY (assigned_by) REFERENCES users(id)
    )
    ''')
    
    # 13. Таблица сессий тестирования
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS test_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        test_id INTEGER NOT NULL,
        assignment_id INTEGER,
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        finished_at DATETIME,
        time_spent INTEGER,
        score INTEGER DEFAULT 0,
        max_score INTEGER DEFAULT 0,
        percentage INTEGER DEFAULT 0,
        is_completed BOOLEAN DEFAULT FALSE,
        attempt_number INTEGER DEFAULT 1,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (test_id) REFERENCES tests(id),
        FOREIGN KEY (assignment_id) REFERENCES test_assignments(id)
    )
    ''')
    
    # 14. Таблица ответов пользователей
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS user_answers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        question_id INTEGER NOT NULL,
        answer_text TEXT,
        selected_options TEXT,
        file_url TEXT,
        is_correct BOOLEAN,
        points_earned INTEGER DEFAULT 0,
        time_spent INTEGER,
        answered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES test_sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (question_id) REFERENCES questions(id)
    )
    ''')
    
    # 15. Таблица системы оценок
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS grading_systems (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(50) UNIQUE NOT NULL,
        description VARCHAR(255),
        rules TEXT NOT NULL,
        created_by INTEGER NOT NULL,
        is_default BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id)
    )
    ''')
    
    # 16. Таблица достижений
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS achievements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        icon VARCHAR(100),
        condition_type VARCHAR(50),
        condition_value INTEGER,
        reward_points INTEGER DEFAULT 0,
        is_hidden BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    # 17. Таблица достижений пользователей
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS user_achievements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        achievement_id INTEGER NOT NULL,
        earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        progress INTEGER DEFAULT 100,
        UNIQUE(user_id, achievement_id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (achievement_id) REFERENCES achievements(id)
    )
    ''')
    
    # 18. Таблица статистики пользователей
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS user_statistics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        category_id INTEGER NOT NULL,
        tests_completed INTEGER DEFAULT 0,
        questions_answered INTEGER DEFAULT 0,
        correct_answers INTEGER DEFAULT 0,
        total_points INTEGER DEFAULT 0,
        average_score FLOAT DEFAULT 0,
        best_score INTEGER DEFAULT 0,
        last_activity DATETIME,
        UNIQUE(user_id, category_id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (category_id) REFERENCES categories(id)
    )
    ''')
    
    # 19. Таблица прав доступа к тестам
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS test_access (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        test_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        access_level VARCHAR(20) NOT NULL,
        granted_by INTEGER,
        granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (test_id) REFERENCES tests(id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (granted_by) REFERENCES users(id)
    )
    ''')
    
    print("✅ Таблицы созданы успешно!")
    
    # Заполняем начальными данными
    fill_initial_data(cursor)
    
    # Создаем индексы
    create_indexes(cursor)
    
    # Сохраняем изменения
    conn.commit()
    conn.close()
    
    print("🎉 База данных для платформы тестирования создана успешно!")
    print("📊 Файл: testing_platform.db")

def fill_initial_data(cursor):
    print("📥 Заполняем начальные данные...")
    
    # Роли
    roles = [
        ('participant', 'Участник', '{"create_tests": true, "take_tests": true, "view_results": true}'),
        ('moderator', 'Модератор', '{"create_tests": true, "manage_content": true, "view_analytics": true, "manage_groups": true}'),
        ('admin', 'Администратор', '{"manage_users": true, "manage_content": true, "view_all_analytics": true}')
    ]
    cursor.executemany(
        'INSERT INTO roles (name, description, permissions) VALUES (?, ?, ?)',
        roles
    )
    
    # Типы вопросов
    question_types = [
        ('text', 'Текстовый вопрос', '{"type": "text"}', False),
        ('blackbox', 'Черный ящик', '{"type": "blackbox"}', False),
        ('image', 'Вопрос с изображением', '{"type": "image"}', False),
        ('video', 'Видеовопрос', '{"type": "video"}', False),
        ('audio', 'Аудиовопрос', '{"type": "audio"}', False),
        ('code', 'Вопрос с кодом', '{"type": "code"}', False)
    ]
    cursor.executemany(
        'INSERT INTO question_types (name, description, template, has_options) VALUES (?, ?, ?, ?)',
        question_types
    )
    
    # Типы ответов
    answer_types = [
        ('text', 'Текстовый ответ', '{"type": "text"}'),
        ('single_choice', 'Один вариант', '{"type": "radio"}'),
        ('multiple_choice', 'Несколько вариантов', '{"type": "checkbox"}')
    ]
    cursor.executemany(
        'INSERT INTO answer_types (name, description, template) VALUES (?, ?, ?)',
        answer_types
    )
    
    # Категории
    categories = [
        ('Математика', 'Математические дисциплины', '#FF6B6B', 'calculate', None),
        ('Физика', 'Физика и естественные науки', '#4ECDC4', 'science', None),
        ('История', 'Исторические науки', '#45B7D1', 'history', None),
        ('Литература', 'Литература и языки', '#96CEB4', 'book', None),
        ('Информатика', 'Программирование и IT', '#FFEAA7', 'computer', None),
        ('Биология', 'Биологические науки', '#DDA0DD', 'nature', None),
        ('Химия', 'Химические науки', '#98D8C8', 'chemistry', None),
        ('Общие знания', 'Разные вопросы', '#A0A0A0', 'lightbulb', None),
        ('Логика', 'Логические задачи и загадки', '#9C27B0', 'psychology', None)
    ]
    cursor.executemany(
        'INSERT INTO categories (name, description, color, icon, parent_id) VALUES (?, ?, ?, ?, ?)',
        categories
    )
    
    # Системы оценок
    grading_systems = [
        ('5-балльная система', 'Традиционная школьная система', 
         '{"type": "percentage", "grades": [{"min": 90, "grade": "5", "label": "Отлично"}, {"min": 75, "grade": "4", "label": "Хорошо"}, {"min": 60, "grade": "3", "label": "Удовлетворительно"}, {"min": 0, "grade": "2", "label": "Неудовлетворительно"}]}', 
         1, True),
        
        ('100-балльная система', 'Балльная система как в ЕГЭ', 
         '{"type": "points", "min_score": 0, "max_score": 100}', 
         1, False),
        
        ('Процентная система', 'Оценка по процентам выполнения', 
         '{"type": "percentage", "grades": [{"min": 0, "grade": "F", "label": "Не сдано"}, {"min": 60, "grade": "D", "label": "Сдано"}]}', 
         1, False)
    ]
    cursor.executemany(
        'INSERT INTO grading_systems (name, description, rules, created_by, is_default) VALUES (?, ?, ?, ?, ?)',
        grading_systems
    )
    
    # Создаем тестовых пользователей
    pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")
    
    users = [
        ('admin', 'admin@school.ru', pwd_context.hash('admin123'), 3, 'Иван', 'Петров'),
        ('moderator', 'moderator@school.ru', pwd_context.hash('moderator123'), 2, 'Мария', 'Сидорова'),
        ('student1', 'student1@school.ru', pwd_context.hash('student123'), 1, 'Алексей', 'Иванов'),
        ('student2', 'student2@school.ru', pwd_context.hash('student123'), 1, 'Ольга', 'Кузнецова'),
        ('teacher1', 'teacher1@school.ru', pwd_context.hash('teacher123'), 2, 'Сергей', 'Васильев')
    ]
    
    for user in users:
        cursor.execute('''
        INSERT INTO users (username, email, password_hash, role_id, first_name, last_name, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (*user, True))
    
    # Создаем тестовые группы с разными типами
    groups = [
        ('10-А класс (открытая)', 'Математический профиль', 'MATH10A', 2, 'Математика', '2024-2025', True, None, False),
        ('Физика для продвинутых (закрытая)', 'Углубленное изучение физики', 'PHYSICS', 2, 'Физика', '2024-2025', False, 'physics123', False),
        ('Химия для начинающих', 'Базовый курс химии', 'CHEM101', 2, 'Химия', '2024-2025', True, None, True),
        ('Программирование на Python', 'Курс по Python для начинающих', 'PYTHON', 5, 'Информатика', '2024-2025', True, None, False),
        ('Скрытая группа (по коду)', 'Секретная группа для избранных', 'SECRET', 2, None, None, False, None, False)
    ]
    
    for group in groups:
        cursor.execute('''
        INSERT INTO study_groups (name, description, invite_code, created_by, subject, academic_year, is_public, password, require_approval)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', group)
    
    # Создаем тестовые вопросы
    questions_data = [
        ('Чему равно 2 + 2?', 1, 1, 1, 3, 1, 'Базовая арифметика', 30, 1, None, None, False, None, '4', None),
        ('Сколько планет в Солнечной системе?', 1, 1, 2, 3, 2, 'Плутон больше не считается планетой', 45, 1, None, None, False, None, '8', None),
        ('Автор "Войны и мира"?', 1, 1, 4, 3, 2, 'Лев Николаевич Толстой', 40, 1, None, None, False, None, 'Толстой', None),
        ('Столица Франции?', 3, 1, 8, 3, 1, 'Город с Эйфелевой башней', 35, 1, None, None, False, None, 'Париж', None)
    ]
    
    question_ids = []
    for q in questions_data:
        cursor.execute('''
        INSERT INTO questions (question_text, type_id, answer_type_id, category_id, author_id, difficulty, explanation, time_limit, points, media_url, sources, allow_latex, blackbox_description, correct_answer, answer_requirements)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', q)
        cursor.execute('SELECT last_insert_rowid()')
        question_ids.append(cursor.fetchone()[0])
    
    # Варианты ответов
    answer_options = [
        (question_ids[0], '4', None, True, 1),
        (question_ids[0], '5', None, False, 2),
        (question_ids[0], '3', None, False, 3),
        (question_ids[0], '6', None, False, 4),
        
        (question_ids[1], '8', None, True, 1),
        (question_ids[1], '9', None, False, 2),
        (question_ids[1], '10', None, False, 3),
        (question_ids[1], '7', None, False, 4),
        
        (question_ids[2], 'Толстой', None, True, 1),
        (question_ids[2], 'Достоевский', None, False, 2),
        (question_ids[2], 'Пушкин', None, False, 3),
        (question_ids[2], 'Чехов', None, False, 4)
    ]
    
    cursor.executemany('''
    INSERT INTO answer_options (question_id, option_text, image_url, is_correct, sort_order)
    VALUES (?, ?, ?, ?, ?)
    ''', answer_options)
    
    # Создаем тестовые тесты
    tests = [
        ('Входной тест по математике', 'Тест для проверки базовых знаний', 3, 1800, 1, 60, True),
        ('Логический тест', 'Простые логические задачи для разминки ума', 3, 600, 0, 70, True),
        ('Тест с медиа-контентом', 'Тест с изображениями, видео и аудио', 3, 1200, 3, 50, True)
    ]
    
    test_ids = []
    for test in tests:
        cursor.execute('''
        INSERT INTO tests (title, description, author_id, time_limit, max_attempts, passing_score, is_public)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', test)
        cursor.execute('SELECT last_insert_rowid()')
        test_ids.append(cursor.fetchone()[0])
    
    # Добавляем вопросы в тесты
    test_questions = [
        (test_ids[0], question_ids[0], 1, 1),
        (test_ids[0], question_ids[1], 2, 1),
        (test_ids[0], question_ids[2], 3, 1),
        (test_ids[1], question_ids[0], 1, 2),
        (test_ids[1], question_ids[3], 2, 2),
        (test_ids[2], question_ids[0], 1, 1),
        (test_ids[2], question_ids[1], 2, 1),
        (test_ids[2], question_ids[2], 3, 1),
        (test_ids[2], question_ids[3], 4, 1)
    ]
    
    cursor.executemany('''
    INSERT INTO test_questions (test_id, question_id, sort_order, points)
    VALUES (?, ?, ?, ?)
    ''', test_questions)
    
    # Автоматически даем создателю права администратора
    for test_id in test_ids:
        cursor.execute('''
        INSERT INTO test_access (test_id, user_id, access_level, granted_by)
        VALUES (?, ?, ?, ?)
        ''', (test_id, 3, 'admin', 3))
    
    # Добавляем участников в группы
    group_members = [
        (1, 2, 'teacher'),    # moderator в 10-А как teacher
        (1, 3, 'student'),    # student1 в 10-А
        (1, 4, 'student'),    # student2 в 10-А
        (2, 3, 'student'),    # student1 в физике
        (2, 5, 'teacher'),    # teacher1 в физике как teacher
        (3, 3, 'pending'),    # student1 запросил вступление в химию
        (4, 3, 'student'),    # student1 в программировании
        (4, 4, 'student'),    # student2 в программировании
    ]
    
    for member in group_members:
        cursor.execute('''
        INSERT INTO group_members (group_id, user_id, role, is_active)
        VALUES (?, ?, ?, ?)
        ''', (*member, True))
    
    # Достижения
    achievements = [
        ('Первый тест', 'Пройдите первый тест', 'first_test', 'first_test', 1, 10, False),
        ('Отличник', 'Получите 90% или выше в тесте', 'excellent', 'high_score', 90, 50, False),
        ('Настойчивый', 'Пройдите 10 тестов', 'persistent', 'tests_completed', 10, 100, False)
    ]
    
    cursor.executemany('''
    INSERT INTO achievements (name, description, icon, condition_type, condition_value, reward_points, is_hidden)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', achievements)
    
    print("✅ Начальные данные добавлены!")

def create_indexes(cursor):
    print("📈 Создаем индексы...")
    
    indexes = [
        # Индексы для пользователей
        'CREATE INDEX idx_users_role ON users(role_id)',
        'CREATE INDEX idx_users_active ON users(is_active)',
        
        # Индексы для групп (добавлены новые)
        'CREATE INDEX idx_groups_public ON study_groups(is_public)',
        'CREATE INDEX idx_groups_created_by ON study_groups(created_by)',
        'CREATE INDEX idx_groups_active ON study_groups(is_active)',
        
        # Индексы для вопросов
        'CREATE INDEX idx_questions_category ON questions(category_id)',
        'CREATE INDEX idx_questions_type ON questions(type_id)',
        'CREATE INDEX idx_questions_answer_type ON questions(answer_type_id)',
        'CREATE INDEX idx_questions_author ON questions(author_id)',
        'CREATE INDEX idx_questions_active ON questions(is_active)',
        
        # Индексы для тестов
        'CREATE INDEX idx_tests_author ON tests(author_id)',
        'CREATE INDEX idx_tests_public ON tests(is_public)',
        
        # Индексы для сессий тестирования
        'CREATE INDEX idx_sessions_user ON test_sessions(user_id)',
        'CREATE INDEX idx_sessions_test ON test_sessions(test_id)',
        'CREATE INDEX idx_sessions_completed ON test_sessions(is_completed)',
        
        # Индексы для ответов
        'CREATE INDEX idx_answers_session ON user_answers(session_id)',
        'CREATE INDEX idx_answers_question ON user_answers(question_id)',
        
        # Индексы для групп
        'CREATE INDEX idx_group_members_user ON group_members(user_id)',
        'CREATE INDEX idx_group_members_group ON group_members(group_id)',
        
        # Индексы для прав доступа
        'CREATE INDEX idx_test_access_user ON test_access(user_id)',
        'CREATE INDEX idx_test_access_test ON test_access(test_id)'
    ]
    
    for index_sql in indexes:
        try:
            cursor.execute(index_sql)
        except:
            pass
    
    print("✅ Индексы созданы!")

if __name__ == '__main__':
    create_database()