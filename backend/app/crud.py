from sqlalchemy.orm import joinedload, Session

from typing import List, Optional
import random
from . import models, schemas
from .auth import get_password_hash
from sqlalchemy import select  # ← Добавляем импорт

# User CRUD
def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = get_password_hash(user.password)
    db_user = models.User(
        username=user.username,
        email=user.email,
        password_hash=hashed_password,
        first_name=user.first_name,
        last_name=user.last_name,
        role_id=1  # Default role: participant
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

# Question CRUD
def create_question(db: Session, question: schemas.QuestionCreate, author_id: int):
    # Создаем основной вопрос
    db_question = models.Question(
        question_text=question.question_text,
        type_id=question.type_id,
        answer_type_id=question.answer_type_id,
        category_id=question.category_id,
        author_id=author_id,
        difficulty=question.difficulty,
        explanation=question.explanation,
        time_limit=question.time_limit,
        points=question.points,
        correct_answer=question.correct_answer,
        media_url=question.media_url,  # ← ДОБАВЬТЕ ЭТУ СТРОКУ
        sources=getattr(question, 'sources', None),  # ← И ЭТУ
        allow_latex=getattr(question, 'allow_latex', False),  # ← И ЭТУ
        blackbox_description=getattr(question, 'blackbox_description', None),  # ← И ЭТУ
        answer_requirements=getattr(question, 'answer_requirements', None),  # ← И ЭТУ
        is_active=True
    )
    db.add(db_question)
    db.commit()
    db.refresh(db_question)
    
    # Create answer options if provided
    if question.answer_options:
        for option in question.answer_options:
            db_option = models.AnswerOption(
                question_id=db_question.id,
                option_text=option.option_text,
                is_correct=option.is_correct,
                sort_order=option.sort_order
            )
            db.add(db_option)
        db.commit()
        db.refresh(db_question)
    
    return db_question

def get_questions(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Question).filter(models.Question.is_active == True).offset(skip).limit(limit).all()

def get_question(db: Session, question_id: int):
    return db.query(models.Question).filter(models.Question.id == question_id).first()

# Test CRUD
def create_test(db: Session, test: schemas.TestCreate, author_id: int):
    db_test = models.Test(
        title=test.title,
        description=test.description,
        author_id=author_id,
        time_limit=test.time_limit,
        max_attempts=test.max_attempts,
        show_results=test.show_results,
        shuffle_questions=test.shuffle_questions,
        shuffle_answers=test.shuffle_answers,
        passing_score=test.passing_score,
        is_public=test.is_public,
        is_active=True
    )
    db.add(db_test)
    db.commit()
    db.refresh(db_test)
    
    # Автоматически даем создателю права администратора
    db_access = models.TestAccess(
        test_id=db_test.id,
        user_id=author_id,
        access_level='admin',
        granted_by=author_id
    )
    db.add(db_access)
    
    # Add questions to test
    for test_question in test.questions:
        db_test_question = models.TestQuestion(
            test_id=db_test.id,
            question_id=test_question.question_id,
            points=test_question.points,
            sort_order=test_question.sort_order
        )
        db.add(db_test_question)
    
    db.commit()
    db.refresh(db_test)
    return db_test

def get_user_test_access(db: Session, test_id: int, user_id: int):
    return db.query(models.TestAccess).filter(
        models.TestAccess.test_id == test_id,
        models.TestAccess.user_id == user_id
    ).first()

def grant_test_access(db: Session, test_access: schemas.TestAccessCreate, test_id: int, granted_by: int):
    # Проверяем, есть ли у granting пользователя права администратора
    granter_access = get_user_test_access(db, test_id, granted_by)
    if not granter_access or granter_access.access_level != 'admin':
        return None
    
    db_access = models.TestAccess(
        test_id=test_id,
        user_id=test_access.user_id,
        access_level=test_access.access_level,
        granted_by=granted_by
    )
    db.add(db_access)
    db.commit()
    db.refresh(db_access)
    return db_access

def get_tests_for_user(db: Session, user_id: int, skip: int = 0, limit: int = 100):
    # Получаем тесты, где пользователь имеет доступ + публичные тесты
    # ИСПРАВЛЕННАЯ ЧАСТЬ - используем select() вместо subquery()
    user_access_subquery = select(models.TestAccess.test_id).where(
        models.TestAccess.user_id == user_id
    ).scalar_subquery()  # ← Используем scalar_subquery()
    
    tests = db.query(models.Test).filter(
        (models.Test.is_public == True) | 
        (models.Test.id.in_(user_access_subquery)) |
        (models.Test.author_id == user_id)
    ).offset(skip).limit(limit).all()
    
    # Добавляем информацию об уровне доступа
    for test in tests:
        access = get_user_test_access(db, test.id, user_id)
        if access:
            test.user_access_level = access.access_level
        elif test.author_id == user_id:
            test.user_access_level = 'admin'
        else:
            test.user_access_level = 'participant'
    
    return tests

def get_tests(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Test).filter(models.Test.is_active == True).offset(skip).limit(limit).all()

def get_test(db: Session, test_id: int):
    test = db.query(models.Test).filter(models.Test.id == test_id).first()
    if test:
        # Принудительно загружаем вопросы
        test.questions
    return test

# Group CRUD
def create_study_group(db: Session, group: schemas.StudyGroupCreate, created_by: int):
    import secrets
    invite_code = secrets.token_urlsafe(8)[:10].upper()
    
    # Создаем группу
    db_group = models.StudyGroup(
        name=group.name,
        description=group.description,
        subject=group.subject,
        academic_year=group.academic_year,
        max_students=group.max_students,
        invite_code=invite_code,
        created_by=created_by,
        is_active=True
    )
    db.add(db_group)
    db.commit()
    db.refresh(db_group)
    
    # АВТОМАТИЧЕСКИ ДОБАВЛЯЕМ СОЗДАТЕЛЯ В ГРУППУ КАК ВЛАДЕЛЬЦА
    db_member = models.GroupMember(
        group_id=db_group.id,
        user_id=created_by,
        role='owner',
        is_active=True
    )
    db.add(db_member)
    db.commit()
    db.refresh(db_group)
    
    return db_group

def get_study_groups(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.StudyGroup).filter(models.StudyGroup.is_active == True).offset(skip).limit(limit).all()

def get_study_group_by_invite_code(db: Session, invite_code: str):
    return db.query(models.StudyGroup).filter(models.StudyGroup.invite_code == invite_code).first()

# Test Session CRUD
def create_test_session(db: Session, session: schemas.TestSessionCreate, user_id: int):
    print(f"🎯 Создание сессии для теста {session.test_id}, пользователь {user_id}")
    
    # Get test to calculate max score
    test = get_test(db, session.test_id)
    if not test:
        print(f"❌ Тест {session.test_id} не найден при создании сессии")
        return None
    
    print(f"✅ Тест найден: {test.title}")
    
    # Calculate max score
    max_score = sum(tq.points for tq in test.questions)
    print(f"📊 Максимальный балл: {max_score}")
    
    db_session = models.TestSession(
        test_id=session.test_id,
        assignment_id=session.assignment_id,
        user_id=user_id,
        max_score=max_score
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    
    print(f"✅ Сессия создана с ID: {db_session.id}")
    return db_session

# В crud.py добавьте отладочную информацию в функцию add_user_answer:
def add_user_answer(db: Session, answer: schemas.UserAnswerCreate, session_id: int, test_id: int):
    try:
        print(f"🎯 [add_user_answer] Начало сохранения ответа")
        print(f"📊 Данные ответа: {answer.dict()}")
        
        # 1. Получаем сессию
        session = db.query(models.TestSession).filter(
            models.TestSession.id == session_id
        ).first()
        
        if not session:
            print(f"❌ Сессия {session_id} не найдена")
            return None
        
        # 2. Получаем вопрос
        question = db.query(models.Question).filter(
            models.Question.id == answer.question_id
        ).first()
        
        if not question:
            print(f"❌ Вопрос {answer.question_id} не найден")
            return None
        
        # 3. Находим связь вопроса с тестом (получаем баллы за этот вопрос)
        test_question = db.query(models.TestQuestion).filter(
            models.TestQuestion.test_id == test_id,
            models.TestQuestion.question_id == answer.question_id
        ).first()
        
        points_per_question = 1  # значение по умолчанию
        
        if test_question:
            points_per_question = test_question.points or question.points or 1
            print(f"✅ Баллы за вопрос из TestQuestion: {points_per_question}")
        else:
            print(f"⚠️ TestQuestion не найден, используем значение по умолчанию: 1 балл")
        
        # 4. Проверяем правильность ответа
        is_correct = False
        points_earned = 0
        
        # Проверка для текстовых ответов
        if question.answer_type_id == 1 and answer.answer_text and question.correct_answer:
            is_correct = (answer.answer_text.strip().lower() == question.correct_answer.strip().lower())
            print(f"📝 Текстовый ответ: '{answer.answer_text}' vs '{question.correct_answer}' = {is_correct}")
        
        # Проверка для выбора вариантов
        elif question.answer_type_id in [2, 3] and answer.selected_options:
            try:
                import json
                selected_ids = json.loads(answer.selected_options)
                print(f"🔢 Выбранные ID: {selected_ids}")
                
                # Получаем правильные варианты
                correct_options = db.query(models.AnswerOption).filter(
                    models.AnswerOption.question_id == question.id,
                    models.AnswerOption.is_correct == True
                ).all()
                
                correct_ids = [opt.id for opt in correct_options]
                print(f"✅ Правильные ID: {correct_ids}")
                
                if question.answer_type_id == 2:  # single choice
                    is_correct = (len(selected_ids) == 1 and selected_ids[0] in correct_ids)
                elif question.answer_type_id == 3:  # multiple choice
                    is_correct = (set(selected_ids) == set(correct_ids))
                
                print(f"🎯 Проверка выбора: {is_correct}")
            except Exception as e:
                print(f"❌ Ошибка проверки вариантов: {e}")
                is_correct = False
        
        # 5. Рассчитываем баллы
        if is_correct:
            points_earned = points_per_question
            print(f"✅ Правильный ответ! Баллы: {points_earned}")
        else:
            points_earned = 0
            print(f"❌ Неправильный ответ! Баллы: 0")
        
        # 6. Создаем или обновляем ответ
        existing_answer = db.query(models.UserAnswer).filter(
            models.UserAnswer.session_id == session_id,
            models.UserAnswer.question_id == answer.question_id
        ).first()
        
        if existing_answer:
            # Обновляем существующий ответ
            existing_answer.answer_text = answer.answer_text
            existing_answer.selected_options = answer.selected_options
            existing_answer.time_spent = answer.time_spent
            existing_answer.is_correct = is_correct
            existing_answer.points_earned = points_earned
            existing_answer.updated_at = datetime.utcnow()
            print(f"🔄 Обновлен существующий ответ ID: {existing_answer.id}")
        else:
            # Создаем новый ответ
            db_answer = models.UserAnswer(
                session_id=session_id,
                question_id=answer.question_id,
                answer_text=answer.answer_text,
                selected_options=answer.selected_options,
                time_spent=answer.time_spent,
                is_correct=is_correct,
                points_earned=points_earned
            )
            db.add(db_answer)
            print(f"➕ Создан новый ответ для вопроса {answer.question_id}")
        
        # 7. Обновляем сессию
        # Пересчитываем общие баллы для сессии
        all_answers = db.query(models.UserAnswer).filter(
            models.UserAnswer.session_id == session_id
        ).all()
        
        total_points = sum(a.points_earned for a in all_answers if a.points_earned)
        
        # Получаем максимальные баллы за тест
        test_questions = db.query(models.TestQuestion).filter(
            models.TestQuestion.test_id == test_id
        ).all()
        
        max_points = sum(tq.points for tq in test_questions if tq.points)
        
        session.score = total_points
        session.max_score = max_points
        
        if max_points > 0:
            session.percentage = (total_points / max_points) * 100
        else:
            session.percentage = 0
        
        print(f"📈 Сессия обновлена: {total_points}/{max_points} ({session.percentage}%)")
        
        db.commit()
        
        if existing_answer:
            db.refresh(existing_answer)
            return existing_answer
        else:
            db.refresh(db_answer)
            return db_answer
            
    except Exception as e:
        db.rollback()
        print(f"🔥 Критическая ошибка в add_user_answer: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

from sqlalchemy import func

def get_user_groups_with_stats(db: Session, user_id: int):
    # Этот запрос вернет группы, где пользователь владелец или участник
    # И прицепит количество участников (members_count)
    return db.query(
        models.StudyGroup,
        func.count(models.GroupMember.id).label("members_count")
    ).outerjoin(models.GroupMember).group_by(models.StudyGroup.id).all()