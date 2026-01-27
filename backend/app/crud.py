from sqlalchemy.orm import Session
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

def add_user_answer(db: Session, answer: schemas.UserAnswerCreate, session_id: int):
    # Get question and check if answer is correct
    question = get_question(db, answer.question_id)
    if not question:
        return None
    
    is_correct = False
    points_earned = 0
    
    # For single/multiple choice questions
    if question.type.has_options and answer.selected_options:
        correct_options = [opt.id for opt in question.answer_options if opt.is_correct]
        selected_options = [int(x) for x in answer.selected_options.split(',')]
        is_correct = set(selected_options) == set(correct_options)
        
    # For text answers
    elif answer.answer_text:
        # Simple exact match for now - can be improved with fuzzy matching
        correct_answers = [opt.option_text.lower().strip() for opt in question.answer_options if opt.is_correct]
        is_correct = answer.answer_text.lower().strip() in correct_answers
    
    if is_correct:
        points_earned = question.points
    
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
    db.commit()
    db.refresh(db_answer)
    
    # Update session score
    session = db.query(models.TestSession).filter(models.TestSession.id == session_id).first()
    if session:
        session.score = sum(ua.points_earned for ua in session.user_answers)
        session.percentage = int((session.score / session.max_score) * 100) if session.max_score > 0 else 0
        db.commit()
    
    return db_answer

from sqlalchemy import func

def get_user_groups_with_stats(db: Session, user_id: int):
    # Этот запрос вернет группы, где пользователь владелец или участник
    # И прицепит количество участников (members_count)
    return db.query(
        models.StudyGroup,
        func.count(models.GroupMember.id).label("members_count")
    ).outerjoin(models.GroupMember).group_by(models.StudyGroup.id).all()