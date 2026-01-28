import os
import shutil
import uuid
from fastapi import UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any 
import json
from datetime import datetime, timedelta
from pydantic import BaseModel
import pandas as pd
from fastapi import UploadFile, File, HTTPException
from typing import List, Optional, Dict, Any
import io
from . import models, schemas, crud, auth
from .database import SessionLocal, engine, get_db
from sqlalchemy import func
# Создаем таблицы
models.Base.metadata.create_all(bind=engine)

# Простая схема для назначения тестов (добавьте в этот файл)
class TestAssignmentRequest(BaseModel):
    test_id: int
    group_id: int
    start_date: Optional[str] = None
    end_date: Optional[str] = None

app = FastAPI(
    title="Платформа Тестирования",
    description="Образовательная платформа для создания и проведения тестов",
    version="1.0.0"
)

# Создадим папки для загрузок если их нет
os.makedirs("uploads/images", exist_ok=True)
os.makedirs("uploads/videos", exist_ok=True)
os.makedirs("uploads/audio", exist_ok=True)

# Добавим после создания app
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React app
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
from fastapi.responses import FileResponse
from pathlib import Path

@app.get("/media/{media_type}/{filename}")
async def get_media_file(media_type: str, filename: str):
    """Получить медиафайл с CORS заголовками"""
    file_path = Path(f"uploads/{media_type}/{filename}")
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Файл не найден")
    
    # Определяем content-type
    content_type = "application/octet-stream"
    if filename.endswith(('.jpg', '.jpeg', '.png', '.gif')):
        content_type = f"image/{filename.split('.')[-1]}"
    elif filename.endswith('.mp4'):
        content_type = "video/mp4"
    elif filename.endswith('.mp3'):
        content_type = "audio/mpeg"
    
    return FileResponse(
        file_path,
        media_type=content_type,
        headers={
            "Access-Control-Allow-Origin": "http://localhost:3000",
            "Access-Control-Allow-Credentials": "true"
        }
    )
# Health check
@app.get("/")
def read_root():
    return {"message": "Платформа тестирования работает!"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

# Роуты аутентификации
@app.post("/auth/register", response_model=schemas.UserResponse)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_username(db, username=user.username)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким именем уже зарегистрирован"
        )
    return crud.create_user(db=db, user=user)

@app.post("/auth/login", response_model=schemas.Token)
def login(user_data: schemas.UserLogin, db: Session = Depends(get_db)):
    user = auth.authenticate_user(db, user_data.username, user_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверное имя пользователя или пароль",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = auth.create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/auth/me", response_model=schemas.UserResponse)
def get_current_user(current_user: models.User = Depends(auth.get_current_active_user)):
    return current_user

# Роуты пользователей
@app.get("/users/", response_model=List[schemas.UserResponse])
def get_users(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    if current_user.role_id != 3:  # Only admin can see all users
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    users = db.query(models.User).offset(skip).limit(limit).all()
    return users

# Роуты вопросов
@app.post("/questions/", response_model=schemas.QuestionResponse)
def create_question(
    question: schemas.QuestionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    return crud.create_question(db=db, question=question, author_id=current_user.id)

@app.get("/questions/", response_model=List[schemas.QuestionResponse])
def get_questions(
    skip: int = 0,
    limit: int = 100,
    category_id: int = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    query = db.query(models.Question).filter(models.Question.is_active == True)
    
    if category_id:
        query = query.filter(models.Question.category_id == category_id)
    
    questions = query.offset(skip).limit(limit).all()
    return questions

@app.get("/questions/{question_id}", response_model=schemas.QuestionResponse)
def get_question(
    question_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    question = crud.get_question(db, question_id=question_id)
    if question is None:
        raise HTTPException(status_code=404, detail="Вопрос не найден")
    return question

# Роуты тестов
@app.post("/tests/", response_model=schemas.TestResponse)
def create_test(
    test: schemas.TestCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    return crud.create_test(db=db, test=test, author_id=current_user.id)

@app.get("/tests/", response_model=List[schemas.TestResponse])
def get_tests(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    tests = crud.get_tests_for_user(db, user_id=current_user.id, skip=skip, limit=limit)
    return tests

# main.py - обновленный эндпоинт /tests/{test_id}

@app.get("/tests/{test_id}", response_model=schemas.TestResponse)
def get_test(
    test_id: int,
    assignment_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    print(f"🎯 GET /tests/{test_id} - пользователь: {current_user.id}, assignment: {assignment_id}")
    
    test = crud.get_test(db, test_id=test_id)
    if test is None:
        raise HTTPException(status_code=404, detail="Тест не найден")
    
    # Если передан assignment_id, проверяем доступ
    if assignment_id:
        print(f"✅ Проверяем доступ через assignment_id: {assignment_id}")
        
        assignment = db.query(models.TestAssignment).filter(
            models.TestAssignment.id == assignment_id,
            models.TestAssignment.test_id == test_id,
            models.TestAssignment.is_active == True
        ).first()
        
        if assignment:
            # Проверяем членство в группе
            group_member = db.query(models.GroupMember).filter(
                models.GroupMember.group_id == assignment.group_id,
                models.GroupMember.user_id == current_user.id,
                models.GroupMember.is_active == True
            ).first()
            
            if group_member:
                print(f"✅ Доступ разрешен через группу {assignment.group_id}")
                
                # Загружаем данные
                for test_question in test.questions:
                    if test_question.question:
                        test_question.question.answer_type = db.query(models.AnswerType).filter(
                            models.AnswerType.id == test_question.question.answer_type_id
                        ).first()
                        test_question.question.type = db.query(models.QuestionType).filter(
                            models.QuestionType.id == test_question.question.type_id
                        ).first()
                
                return test
    
    # ДОПОЛНИТЕЛЬНО: Ищем назначения теста в группах пользователя
    print(f"🔍 Ищем назначения теста {test_id} в группах пользователя {current_user.id}")
    
    # Находим все группы пользователя
    user_groups = db.query(models.GroupMember.group_id).filter(
        models.GroupMember.user_id == current_user.id,
        models.GroupMember.is_active == True
    ).all()
    
    group_ids = [g.group_id for g in user_groups]
    
    if group_ids:
        # Ищем назначения теста в этих группах
        assignments = db.query(models.TestAssignment).filter(
            models.TestAssignment.test_id == test_id,
            models.TestAssignment.group_id.in_(group_ids),
            models.TestAssignment.is_active == True
        ).all()
        
        if assignments:
            print(f"✅ Найдено {len(assignments)} назначений в группах пользователя")
            
            # Загружаем данные
            for test_question in test.questions:
                if test_question.question:
                    test_question.question.answer_type = db.query(models.AnswerType).filter(
                        models.AnswerType.id == test_question.question.answer_type_id
                    ).first()
                    test_question.question.type = db.query(models.QuestionType).filter(
                        models.QuestionType.id == test_question.question.type_id
                    ).first()
            
            return test
    
    # Старая проверка доступа
    user_access = crud.get_user_test_access(db, test_id, current_user.id)
    if not user_access and not test.is_public and test.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Нет доступа к этому тесту")
    
    # Загружаем данные
    for test_question in test.questions:
        if test_question.question:
            test_question.question.answer_type = db.query(models.AnswerType).filter(
                models.AnswerType.id == test_question.question.answer_type_id
            ).first()
            test_question.question.type = db.query(models.QuestionType).filter(
                models.QuestionType.id == test_question.question.type_id
            ).first()
    
    return test
# Роуты загрузки файлов
@app.post("/upload/image")
async def upload_image(file: UploadFile = File(...)):
    # Проверяем тип файла
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="Файл должен быть изображением")
    
    # Генерируем уникальное имя файла
    file_extension = file.filename.split('.')[-1]
    filename = f"{uuid.uuid4()}.{file_extension}"
    file_path = f"uploads/images/{filename}"
    
    # Сохраняем файл
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    return {
        "filename": filename, 
        "url": f"/uploads/images/{filename}",
        "media_type": "image"
    }

@app.post("/upload/video")
async def upload_video(file: UploadFile = File(...)):
    # Проверяем тип файла
    if not file.content_type.startswith('video/'):
        raise HTTPException(status_code=400, detail="Файл должен быть видео")
    
    # Проверяем размер файла (максимум 100MB)
    if file.size > 100 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Файл слишком большой (максимум 100MB)")
    
    # Генерируем уникальное имя файла
    file_extension = file.filename.split('.')[-1]
    filename = f"{uuid.uuid4()}.{file_extension}"
    file_path = f"uploads/videos/{filename}"
    
    # Сохраняем файл
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    return {
        "filename": filename, 
        "url": f"/uploads/videos/{filename}",
        "media_type": "video"
    }

@app.post("/upload/audio")
async def upload_audio(file: UploadFile = File(...)):
    # Проверяем тип файла
    if not file.content_type.startswith('audio/'):
        raise HTTPException(status_code=400, detail="Файл должен быть аудио")
    
    # Проверяем размер файла (максимум 50MB)
    if file.size > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Файл слишком большой (максимум 50MB)")
    
    # Генерируем уникальное имя файла
    file_extension = file.filename.split('.')[-1]
    filename = f"{uuid.uuid4()}.{file_extension}"
    file_path = f"uploads/audio/{filename}"
    
    # Сохраняем файл
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    return {
        "filename": filename, 
        "url": f"/uploads/audio/{filename}",
        "media_type": "audio"
    }

# Роуты тестирования
@app.post("/test-sessions/", response_model=schemas.TestSessionResponse)
def start_test_session(
    session_data: schemas.TestSessionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    # Check if user has remaining attempts
    test = crud.get_test(db, session_data.test_id)
    if not test:
        raise HTTPException(status_code=404, detail="Тест не найден")
    
    # Если max_attempts = 0, то неограниченное количество попыток
    if test.max_attempts != 0:
        # Count previous attempts
        previous_attempts = db.query(models.TestSession).filter(
            models.TestSession.user_id == current_user.id,
            models.TestSession.test_id == session_data.test_id
        ).count()
        
        if previous_attempts >= test.max_attempts:
            raise HTTPException(
                status_code=400, 
                detail="Превышено максимальное количество попыток"
            )
    
    session = crud.create_test_session(
        db=db, 
        session=session_data, 
        user_id=current_user.id
    )
    
    if not session:
        raise HTTPException(status_code=400, detail="Ошибка при создании сессии")
    
    return session

# main.py - обновленный endpoint submit_answer
@app.post("/test-sessions/{session_id}/answers", response_model=schemas.UserAnswerResponse)
def submit_answer(
    session_id: int,
    answer: schemas.UserAnswerCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    print("=" * 50)
    print("🎯 ПОЛУЧЕН ОТВЕТ ОТ ПОЛЬЗОВАТЕЛЯ")
    print(f"👤 Пользователь: {current_user.username} (ID: {current_user.id})")
    print(f"🔑 Session ID: {session_id}")
    print(f"📦 Данные ответа: {answer.dict()}")
    print("=" * 50)
    
    # Verify session belongs to user
    session = db.query(models.TestSession).filter(
        models.TestSession.id == session_id,
        models.TestSession.user_id == current_user.id
    ).first()
    
    if not session:
        print(f"❌ Сессия {session_id} не найдена или нет доступа")
        raise HTTPException(status_code=404, detail="Сессия тестирования не найдена")
    
    if session.is_completed:
        print(f"❌ Сессия {session_id} уже завершена")
        raise HTTPException(status_code=400, detail="Тест уже завершен")
    
    print(f"✅ Сессия найдена, тест ID: {session.test_id}")
    
    # Вызываем функцию сохранения ответа
    user_answer = crud.add_user_answer(
        db=db, 
        answer=answer, 
        session_id=session_id,
        test_id=answer.test_id  # Передаем test_id
    )
    
    if not user_answer:
        print(f"❌ Ошибка в crud.add_user_answer")
        raise HTTPException(status_code=400, detail="Ошибка при сохранении ответа")
    
    print(f"✅ Ответ сохранен в БД, ID: {user_answer.id}")
    return user_answer

# main.py - добавьте этот endpoint для завершения теста

@app.post("/test-sessions/{session_id}/complete")
def complete_test_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Завершить сессию тестирования"""
    print(f"🏁 Завершение сессии {session_id}")
    
    # Находим сессию
    session = db.query(models.TestSession).filter(
        models.TestSession.id == session_id,
        models.TestSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Сессия тестирования не найдена")
    
    if session.is_completed:
        raise HTTPException(status_code=400, detail="Тест уже завершен")
    
    # Рассчитываем баллы заново
    # 1. Находим все ответы в этой сессии
    user_answers = db.query(models.UserAnswer).filter(
        models.UserAnswer.session_id == session_id
    ).all()
    
    # 2. Считаем набранные баллы
    total_points_earned = sum(answer.points_earned for answer in user_answers if answer.points_earned)
    
    # 3. Находим максимальные возможные баллы за тест
    test_questions = db.query(models.TestQuestion).filter(
        models.TestQuestion.test_id == session.test_id
    ).all()
    
    max_possible_points = sum(tq.points for tq in test_questions if tq.points)
    
    print(f"📊 Баллы: {total_points_earned}/{max_possible_points}")
    
    # Обновляем сессию
    session.is_completed = True
    session.finished_at = datetime.utcnow()
    session.score = total_points_earned
    session.max_score = max_possible_points
    
    # Рассчитываем процент
    if max_possible_points > 0:
        percentage = (total_points_earned / max_possible_points) * 100
        session.percentage = round(percentage, 2)
    else:
        session.percentage = 0
    
    # Рассчитываем время
    if session.started_at:
        time_spent = (session.finished_at - session.started_at).total_seconds()
        session.time_spent = int(time_spent)
    
    db.commit()
    db.refresh(session)
    
    # Обновляем статистику пользователя
    update_user_statistics(db, current_user.id, session.test_id, session)
    
    print(f"✅ Сессия {session_id} завершена, баллы: {session.score}/{session.max_score} ({session.percentage}%)")
    
    return {
        "message": "Тест завершен",
        "score": session.score,
        "max_score": session.max_score,
        "percentage": session.percentage,
        "time_spent": session.time_spent,
        "is_completed": session.is_completed
    }


@app.post("/test-sessions/{session_id}/finish")
async def finish_test_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Завершить сессию тестирования - АЛЬТЕРНАТИВНЫЙ"""
    try:
        print(f"🏁 Альтернативное завершение сессии {session_id}")
        
        session = db.query(models.TestSession).filter(
            models.TestSession.id == session_id,
            models.TestSession.user_id == current_user.id
        ).first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Сессия не найдена")
        
        # Просто помечаем как завершенную
        session.is_completed = True
        session.finished_at = datetime.utcnow()
        
        # Пересчитываем баллы
        total_points = db.query(func.sum(models.UserAnswer.points_earned)).filter(
            models.UserAnswer.session_id == session_id
        ).scalar() or 0
        
        session.score = int(total_points)
        
        if session.max_score > 0:
            session.percentage = int((session.score / session.max_score) * 100)
        
        db.commit()
        
        return {
            "message": "Тест завершен",
            "score": session.score,
            "max_score": session.max_score,
            "percentage": session.percentage,
            "is_completed": True
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

def update_user_statistics(db: Session, user_id: int, test_id: int, session):
    """Обновить статистику пользователя после завершения теста"""
    try:
        print(f"📈 Обновление статистики для пользователя {user_id}, тест {test_id}")
        
        # Находим все категории вопросов в тесте
        test_questions = db.query(
            models.TestQuestion.question_id,
            models.TestQuestion.points
        ).filter(models.TestQuestion.test_id == test_id).all()
        
        category_stats = {}
        
        for tq in test_questions:
            question = db.query(models.Question).filter(
                models.Question.id == tq.question_id
            ).first()
            
            if question and question.category_id:
                category_id = question.category_id
                
                if category_id not in category_stats:
                    category_stats[category_id] = {
                        'questions_count': 0,
                        'questions_answered': 0,
                        'correct_answers': 0,
                        'total_points': 0
                    }
                
                # Находим ответ пользователя на этот вопрос
                answer = db.query(models.UserAnswer).filter(
                    models.UserAnswer.question_id == question.id,
                    models.UserAnswer.session_id == session.id
                ).first()
                
                category_stats[category_id]['questions_count'] += 1
                
                if answer:
                    category_stats[category_id]['questions_answered'] += 1
                    
                    if answer.is_correct:
                        category_stats[category_id]['correct_answers'] += 1
                        category_stats[category_id]['total_points'] += answer.points_earned
        
        # Обновляем статистику для каждой категории
        for category_id, stats in category_stats.items():
            user_stat = db.query(models.UserStatistics).filter(
                models.UserStatistics.user_id == user_id,
                models.UserStatistics.category_id == category_id
            ).first()
            
            if not user_stat:
                user_stat = models.UserStatistics(
                    user_id=user_id,
                    category_id=category_id,
                    tests_completed=0,
                    questions_answered=0,
                    correct_answers=0,
                    total_points=0,
                    average_score=0,
                    best_score=0,
                    last_activity=datetime.utcnow()
                )
                db.add(user_stat)
            
            # Обновляем счетчики
            user_stat.tests_completed += 1
            user_stat.questions_answered += stats['questions_answered']
            user_stat.correct_answers += stats['correct_answers']
            user_stat.total_points += stats['total_points']
            
            # Пересчитываем средний балл
            if user_stat.questions_answered > 0:
                user_stat.average_score = (user_stat.correct_answers / user_stat.questions_answered) * 100
            
            # Обновляем лучший результат
            if session.percentage > user_stat.best_score:
                user_stat.best_score = session.percentage
            
            user_stat.last_activity = datetime.utcnow()
            
            print(f"📊 Статистика категории {category_id} обновлена: {user_stat.tests_completed} тестов")
        
        db.commit()
        
    except Exception as e:
        print(f"❌ Ошибка обновления статистики: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()

@app.get("/test-sessions/{session_id}", response_model=schemas.TestSessionResponse)
def get_test_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    session = db.query(models.TestSession).filter(
        models.TestSession.id == session_id,
        models.TestSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Сессия тестирования не найдена")
    
    return session

# Роуты учебных групп
@app.post("/groups/", response_model=schemas.StudyGroupResponse)
def create_study_group(
    group: schemas.StudyGroupCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Создать группу (может любой пользователь)"""
    return crud.create_study_group(db=db, group=group, created_by=current_user.id)

@app.get("/groups/", response_model=List[schemas.StudyGroupResponse])
def get_study_groups(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    try:
        groups = db.query(models.StudyGroup).filter(
            models.StudyGroup.is_public == True,
            models.StudyGroup.is_active == True
        ).offset(skip).limit(limit).all()
        
        result = []
        for group in groups:
            # Рассчитываем количество активных участников
            members_count = db.query(models.GroupMember).filter(
                models.GroupMember.group_id == group.id,
                models.GroupMember.is_active == True
            ).count()
            
            group_dict = {
                "id": group.id,
                "name": group.name,
                "description": group.description,
                "subject": group.subject,
                "academic_year": group.academic_year,
                "max_students": group.max_students,
                "is_public": group.is_public,
                "password": group.password,
                "require_approval": group.require_approval,
                "invite_code": group.invite_code,
                "created_by": group.created_by,
                "is_active": group.is_active,
                "created_at": group.created_at,
                "members_count": members_count
            }
            
            print(f"✅ Группа {group.id}: {group.name} - участников: {members_count}")
            result.append(group_dict)
        
        print(f"📊 Всего групп возвращено: {len(result)}")
        return result
        
    except Exception as e:
        print(f"❌ Ошибка в /groups/: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/groups/join/{group_id}")
def join_group(
    group_id: int,
    password: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Вступить в группу"""
    group = db.query(models.StudyGroup).filter(
        models.StudyGroup.id == group_id,
        models.StudyGroup.is_active == True
    ).first()
    
    if not group:
        raise HTTPException(status_code=404, detail="Группа не найдена")
    
    # Проверяем, не состоит ли уже пользователь в группе
    existing_member = db.query(models.GroupMember).filter(
        models.GroupMember.group_id == group_id,
        models.GroupMember.user_id == current_user.id
    ).first()
    
    if existing_member:
        raise HTTPException(
            status_code=400, 
            detail="Вы уже состоите в этой группе"
        )
    
    # Проверяем лимит участников
    current_members_count = db.query(models.GroupMember).filter(
        models.GroupMember.group_id == group_id,
        models.GroupMember.is_active == True
    ).count()
    
    if group.max_students > 0 and current_members_count >= group.max_students:
        raise HTTPException(
            status_code=400, 
            detail="Достигнут лимит участников группы"
        )
    
    # Если группа закрыта и есть пароль
    if not group.is_public and group.password:
        if not password:
            raise HTTPException(
                status_code=400, 
                detail="Для вступления в закрытую группу нужен пароль"
            )
        if password != group.password:
            raise HTTPException(
                status_code=400, 
                detail="Неверный пароль"
            )
    
    # Если требуется одобрение
    if group.require_approval:
        role = 'pending'
    else:
        role = 'student'
    
    # Добавляем пользователя в группу
    db_member = models.GroupMember(
        group_id=group_id,
        user_id=current_user.id,
        role=role
    )
    db.add(db_member)
    db.commit()
    db.refresh(db_member)
    
    return {
        "message": "Вы успешно вступили в группу" + 
                  (" (ожидайте одобрения)" if role == 'pending' else ""),
        "group_id": group_id,
        "role": role
    }

@app.get("/groups/find/{invite_code}")
def find_group_by_code(
    invite_code: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Найти группу по коду (для скрытых групп)"""
    group = db.query(models.StudyGroup).filter(
        models.StudyGroup.invite_code == invite_code.upper(),
        models.StudyGroup.is_active == True
    ).first()
    
    if not group:
        raise HTTPException(status_code=404, detail="Группа не найдена")
    
    return group

# Роуты статистики
@app.get("/statistics/")
def get_user_statistics(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    statistics = db.query(models.UserStatistics).filter(
        models.UserStatistics.user_id == current_user.id
    ).all()
    
    total_stats = {
        "total_tests_completed": sum(stat.tests_completed for stat in statistics),
        "total_questions_answered": sum(stat.questions_answered for stat in statistics),
        "total_correct_answers": sum(stat.correct_answers for stat in statistics),
        "overall_accuracy": (
            (sum(stat.correct_answers for stat in statistics) / 
             sum(stat.questions_answered for stat in statistics) * 100)
            if sum(stat.questions_answered for stat in statistics) > 0 else 0
        )
    }
    
    return {
        "category_stats": statistics,
        "total_stats": total_stats
    }

# Роуты для управления доступом к тестам
@app.post("/tests/{test_id}/access", response_model=schemas.TestAccessResponse)
def grant_access_to_test(
    test_id: int,
    access_data: schemas.TestAccessCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    # Проверяем, что тест существует
    test = crud.get_test(db, test_id=test_id)
    if not test:
        raise HTTPException(status_code=404, detail="Тест не найден")
    
    # Проверяем права доступа
    user_access = crud.get_user_test_access(db, test_id, current_user.id)
    if not user_access or user_access.access_level != 'admin':
        raise HTTPException(status_code=403, detail="Недостаточно прав для управления доступом")
    
    # Предотвращаем изменение прав создателя
    if access_data.user_id == test.author_id:
        raise HTTPException(status_code=400, detail="Нельзя изменить права создателя теста")
    
    access = crud.grant_test_access(
        db=db, 
        test_access=access_data, 
        test_id=test_id, 
        granted_by=current_user.id
    )
    
    if not access:
        raise HTTPException(status_code=400, detail="Ошибка при предоставлении доступа")
    
    return access

@app.get("/tests/{test_id}/access", response_model=List[schemas.TestAccessResponse])
def get_test_access_list(
    test_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    # Проверяем права доступа
    user_access = crud.get_user_test_access(db, test_id, current_user.id)
    if not user_access or user_access.access_level not in ['admin', 'moderator']:
        raise HTTPException(status_code=403, detail="Недостаточно прав для просмотра списка доступа")
    
    access_list = db.query(models.TestAccess).filter(
        models.TestAccess.test_id == test_id
    ).all()
    
    return access_list

@app.delete("/tests/{test_id}/access/{user_id}")
def revoke_test_access(
    test_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    # Проверяем права доступа
    user_access = crud.get_user_test_access(db, test_id, current_user.id)
    if not user_access or user_access.access_level != 'admin':
        raise HTTPException(status_code=403, detail="Недостаточно прав для отзыва доступа")
    
    # Нельзя отозвать права у себя или создателя
    if user_id == current_user.id or user_id == test.author_id:
        raise HTTPException(status_code=400, detail="Нельзя отозвать права у себя или создателя теста")
    
    access = db.query(models.TestAccess).filter(
        models.TestAccess.test_id == test_id,
        models.TestAccess.user_id == user_id
    ).first()
    
    if not access:
        raise HTTPException(status_code=404, detail="Права доступа не найдены")
    
    db.delete(access)
    db.commit()
    
    return {"message": "Права доступа отозваны"}

@app.get("/groups/{group_id}", response_model=schemas.StudyGroupResponse)
def get_group_details(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Получить детальную информацию о группе"""
    group = db.query(models.StudyGroup).filter(
        models.StudyGroup.id == group_id,
        models.StudyGroup.is_active == True
    ).first()
    
    if not group:
        raise HTTPException(
            status_code=404,
            detail="Группа не найдена"
        )
    
    return group

@app.get("/groups/{group_id}/members")
def get_group_members(
    group_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Получить участников группы"""
    # Проверяем, что пользователь состоит в группе
    is_member = db.query(models.GroupMember).filter(
        models.GroupMember.group_id == group_id,
        models.GroupMember.user_id == current_user.id
    ).first()
    
    if not is_member:
        # Проверяем является ли пользователь создателем
        group = db.query(models.StudyGroup).filter(
            models.StudyGroup.id == group_id,
            models.StudyGroup.created_by == current_user.id
        ).first()
        
        if not group:
            raise HTTPException(
                status_code=403,
                detail="У вас нет доступа к этой группе"
            )
    
    # Получаем участников
    members = db.query(
        models.User,
        models.GroupMember.role,
        models.GroupMember.joined_at
    ).join(
        models.GroupMember,
        models.GroupMember.user_id == models.User.id
    ).filter(
        models.GroupMember.group_id == group_id,
        models.GroupMember.is_active == True
    ).offset(skip).limit(limit).all()
    
    return [
        {
            "id": user.id,
            "username": user.username,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "avatar_url": user.avatar_url,
            "role": role,
            "joined_at": joined_at
        }
        for user, role, joined_at in members
    ]



@app.get("/groups/my", response_model=List[schemas.StudyGroupResponse])
def get_my_groups(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Получить группы текущего пользователя"""
    # 1. Находим группы где пользователь участник
    member_groups = db.query(models.StudyGroup).join(
        models.GroupMember
    ).filter(
        models.GroupMember.user_id == current_user.id,
        models.StudyGroup.is_active == True
    ).all()
    
    # 2. Находим группы где пользователь создатель
    created_groups = db.query(models.StudyGroup).filter(
        models.StudyGroup.created_by == current_user.id,
        models.StudyGroup.is_active == True
    ).all()
    
    # 3. Объединяем и убираем дубликаты
    all_groups = []
    group_ids = set()
    
    for group in member_groups + created_groups:
        if group.id not in group_ids:
            group_ids.add(group.id)
            all_groups.append(group)
    
    return all_groups

@app.get("/groups/{group_id}/tests")
def get_group_tests(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Получить тесты, назначенные группе"""
    # Проверяем, что пользователь состоит в группе
    is_member = db.query(models.GroupMember).filter(
        models.GroupMember.group_id == group_id,
        models.GroupMember.user_id == current_user.id,
        models.GroupMember.is_active == True
    ).first()
    
    # Или является создателем
    is_creator = db.query(models.StudyGroup).filter(
        models.StudyGroup.id == group_id,
        models.StudyGroup.created_by == current_user.id
    ).first()
    
    if not is_member and not is_creator:
        raise HTTPException(
            status_code=403,
            detail="У вас нет доступа к этой группе"
        )
    
    # Получаем назначенные тесты
    assignments = db.query(models.TestAssignment).filter(
        models.TestAssignment.group_id == group_id,
        models.TestAssignment.is_active == True
    ).all()
    
    result = []
    for assignment in assignments:
        test = db.query(models.Test).filter(
            models.Test.id == assignment.test_id,
            models.Test.is_active == True
        ).first()
        
        if test:
            # Считаем попытки пользователя
            attempts = db.query(models.TestSession).filter(
                models.TestSession.assignment_id == assignment.id,
                models.TestSession.user_id == current_user.id
            ).count()
            
            # Получаем последнюю сессию
            latest_session = db.query(models.TestSession).filter(
                models.TestSession.assignment_id == assignment.id,
                models.TestSession.user_id == current_user.id
            ).order_by(models.TestSession.started_at.desc()).first()
            
            result.append({
                "id": test.id,
                "assignment_id": assignment.id,
                "title": test.title,
                "description": test.description,
                "time_limit": assignment.time_limit or test.time_limit,
                "max_attempts": assignment.max_attempts or test.max_attempts,
                "passing_score": assignment.passing_score or test.passing_score,
                "start_date": assignment.start_date.isoformat() if assignment.start_date else None,
                "end_date": assignment.end_date.isoformat() if assignment.end_date else None,
                "attempts_used": attempts,
                "latest_session": {
                    "score": latest_session.score if latest_session else None,
                    "max_score": latest_session.max_score if latest_session else None,
                    "percentage": latest_session.percentage if latest_session else None,
                    "is_completed": latest_session.is_completed if latest_session else False,
                    "finished_at": latest_session.finished_at.isoformat() if latest_session and latest_session.finished_at else None
                } if latest_session else None
            })
    
    return result

# ВАЖНО: Исправленный endpoint для назначения тестов
@app.post("/test-assignments/")
def create_test_assignment(
    assignment: TestAssignmentRequest,  # Используем нашу схему
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Назначить тест группе"""
    try:
        from datetime import datetime
        
        print(f"=== СОЗДАНИЕ НАЗНАЧЕНИЯ ===")
        print(f"Test ID: {assignment.test_id}")
        print(f"Group ID: {assignment.group_id}")
        print(f"User ID: {current_user.id}")
        print(f"Start Date: {assignment.start_date}")
        print(f"End Date: {assignment.end_date}")
        
        # Проверяем тест
        test = db.query(models.Test).filter(
            models.Test.id == assignment.test_id,
            models.Test.is_active == True
        ).first()
        print(f"Test found: {test is not None}")
        
        # Проверяем группу
        group = db.query(models.StudyGroup).filter(
            models.StudyGroup.id == assignment.group_id,
            models.StudyGroup.is_active == True
        ).first()
        print(f"Group found: {group is not None}")
        
        if not test or not group:
            print("Тест или группа не найдены")
            raise HTTPException(status_code=404, detail="Тест или группа не найдены")
        
        # Проверяем права
        is_creator = group.created_by == current_user.id
        is_admin = current_user.role_id == 3
        
        print(f"Is creator: {is_creator}")
        print(f"Is admin: {is_admin}")
        
        if not (is_creator or is_admin):
            raise HTTPException(status_code=403, detail="Недостаточно прав")
        
        # Парсим даты
        start_date_dt = None
        end_date_dt = None
        
        if assignment.start_date:
            try:
                start_date_dt = datetime.fromisoformat(assignment.start_date.replace('Z', '+00:00'))
            except Exception as e:
                print(f"Ошибка парсинга start_date: {e}")
                start_date_dt = datetime.utcnow()
        
        if assignment.end_date:
            try:
                end_date_dt = datetime.fromisoformat(assignment.end_date.replace('Z', '+00:00'))
            except Exception as e:
                print(f"Ошибка парсинга end_date: {e}")
        
        # Создаем назначение
        db_assignment = models.TestAssignment(
            test_id=assignment.test_id,
            group_id=assignment.group_id,
            assigned_by=current_user.id,
            start_date=start_date_dt or datetime.utcnow(),
            end_date=end_date_dt,
            is_active=True
        )
        
        print(f"Creating assignment: {db_assignment}")
        
        db.add(db_assignment)
        db.commit()
        db.refresh(db_assignment)
        
        print(f"Assignment created: {db_assignment.id}")
        
        return {
            "id": db_assignment.id,
            "test_id": db_assignment.test_id,
            "group_id": db_assignment.group_id,
            "assigned_by": db_assignment.assigned_by,
            "start_date": db_assignment.start_date.isoformat() if db_assignment.start_date else None,
            "end_date": db_assignment.end_date.isoformat() if db_assignment.end_date else None,
            "message": "Тест назначен успешно"
        }
        
    except Exception as e:
        db.rollback()
        print(f"Ошибка: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Роут для получения назначений теста
@app.get("/tests/{test_id}/assignments")
def get_test_assignments_by_test(
    test_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Получить назначения теста (только для создателя/админа)"""
    # Проверяем права
    test = crud.get_test(db, test_id=test_id)
    if not test:
        raise HTTPException(status_code=404, detail="Тест не найден")
    
    is_author = test.author_id == current_user.id
    is_admin = current_user.role_id == 3
    
    if not (is_author or is_admin):
        raise HTTPException(
            status_code=403,
            detail="Недостаточно прав для просмотра назначений теста"
        )
    
    assignments = db.query(models.TestAssignment).filter(
        models.TestAssignment.test_id == test_id,
        models.TestAssignment.is_active == True
    ).all()
    
    return [
        {
            "id": a.id,
            "group_id": a.group_id,
            "assigned_by": a.assigned_by,
            "start_date": a.start_date.isoformat() if a.start_date else None,
            "end_date": a.end_date.isoformat() if a.end_date else None,
            "time_limit": a.time_limit,
            "max_attempts": a.max_attempts,
            "passing_score": a.passing_score,
            "created_at": a.created_at.isoformat() if a.created_at else None
        }
        for a in assignments
    ]

# Роут для удаления назначения
@app.delete("/test-assignments/{assignment_id}")
def delete_test_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Удалить назначение теста"""
    assignment = db.query(models.TestAssignment).filter(
        models.TestAssignment.id == assignment_id,
        models.TestAssignment.is_active == True
    ).first()
    
    if not assignment:
        raise HTTPException(status_code=404, detail="Назначение не найдено")
    
    # Проверяем права
    test = crud.get_test(db, test_id=assignment.test_id)
    if not test:
        raise HTTPException(status_code=404, detail="Тест не найден")
    
    is_author = test.author_id == current_user.id
    is_admin = current_user.role_id == 3
    
    if not (is_author or is_admin):
        raise HTTPException(
            status_code=403,
            detail="Недостаточно прав для удаления назначения"
        )
    
    assignment.is_active = False
    db.commit()
    
    return {"message": "Назначение удалено"}

# Дополнительный endpoint для получения всех назначений
@app.get("/test-assignments/")
def get_all_test_assignments(
    group_id: Optional[int] = None,
    test_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Получить все назначения тестов"""
    query = db.query(models.TestAssignment).filter(
        models.TestAssignment.is_active == True
    )
    
    if group_id:
        query = query.filter(models.TestAssignment.group_id == group_id)
    
    if test_id:
        query = query.filter(models.TestAssignment.test_id == test_id)
    
    assignments = query.all()
    
    return [
        {
            "id": a.id,
            "test_id": a.test_id,
            "group_id": a.group_id,
            "assigned_by": a.assigned_by,
            "start_date": a.start_date.isoformat() if a.start_date else None,
            "end_date": a.end_date.isoformat() if a.end_date else None,
            "time_limit": a.time_limit,
            "max_attempts": a.max_attempts,
            "passing_score": a.passing_score,
            "created_at": a.created_at.isoformat() if a.created_at else None
        }
        for a in assignments
    ]

@app.get("/tests/{test_id}/full")
def get_test_full(
    test_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Получить полную информацию о тесте с вопросами"""
    test = crud.get_test(db, test_id=test_id)
    if test is None:
        raise HTTPException(status_code=404, detail="Тест не найден")
    
    # Проверяем доступ
    user_access = crud.get_user_test_access(db, test_id, current_user.id)
    if not user_access and not test.is_public and test.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Нет доступа к этому тесту")
    
    # Принудительно загружаем все связанные данные
    test_data = {
        "id": test.id,
        "title": test.title,
        "description": test.description,
        "author_id": test.author_id,
        "time_limit": test.time_limit,
        "max_attempts": test.max_attempts,
        "show_results": test.show_results,
        "shuffle_questions": test.shuffle_questions,
        "shuffle_answers": test.shuffle_answers,
        "passing_score": test.passing_score,
        "is_public": test.is_public,
        "is_active": test.is_active,
        "created_at": test.created_at,
        "updated_at": test.updated_at,
        "questions": []
    }
    
    # Загружаем вопросы с полной информацией
    for tq in test.questions:
        question = tq.question
        if question:
            # Безопасно получаем данные о типе вопроса
            type_data = None
            if question.type:
                type_data = {
                    "id": question.type.id,
                    "name": question.type.name,
                    "description": question.type.description
                }
            
            # Безопасно получаем данные о типе ответа
            answer_type_data = None
            if question.answer_type:
                answer_type_data = {
                    "id": question.answer_type.id,
                    "name": question.answer_type.name,
                    "description": question.answer_type.description
                }
            
            question_data = {
                "id": question.id,
                "question_text": question.question_text,
                "type": type_data,
                "answer_type": answer_type_data,
                "answer_type_id": question.answer_type_id,  # Важно!
                "category_id": question.category_id,
                "difficulty": question.difficulty,
                "explanation": question.explanation or "",
                "time_limit": question.time_limit or 60,
                "points": tq.points or question.points or 1,
                "media_url": question.media_url or "",
                "sources": question.sources or "",
                "allow_latex": question.allow_latex or False,
                "blackbox_description": question.blackbox_description or "",
                "correct_answer": question.correct_answer or "",
                "answer_requirements": question.answer_requirements or "",
                "answer_options": [],
                "test_question_id": tq.id
            }
            
            # Загружаем варианты ответов
            if question.answer_options:
                for option in question.answer_options:
                    option_data = {
                        "id": option.id,
                        "option_text": option.option_text,
                        "is_correct": option.is_correct,
                        "sort_order": option.sort_order
                    }
                    question_data["answer_options"].append(option_data)
            
            test_data["questions"].append(question_data)
    
    return test_data

@app.put("/questions/{question_id}")
def update_question(
    question_id: int,
    question_data: schemas.QuestionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Обновить вопрос"""
    # Получаем вопрос
    db_question = db.query(models.Question).filter(
        models.Question.id == question_id,
        models.Question.is_active == True
    ).first()
    
    if not db_question:
        raise HTTPException(status_code=404, detail="Вопрос не найден")
    
    # Проверяем права - только автор может редактировать
    if db_question.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Недостаточно прав для редактирования вопроса")
    
    # Обновляем основную информацию вопроса
    db_question.question_text = question_data.question_text
    db_question.type_id = question_data.type_id
    db_question.answer_type_id = question_data.answer_type_id
    db_question.category_id = question_data.category_id
    db_question.difficulty = question_data.difficulty
    db_question.explanation = question_data.explanation
    db_question.time_limit = question_data.time_limit
    db_question.points = question_data.points
    db_question.media_url = question_data.media_url
    db_question.sources = question_data.sources
    db_question.allow_latex = question_data.allow_latex
    db_question.blackbox_description = question_data.blackbox_description
    db_question.correct_answer = question_data.correct_answer
    db_question.answer_requirements = question_data.answer_requirements
    db_question.updated_at = datetime.utcnow()
    
    # Удаляем старые варианты ответов
    db.query(models.AnswerOption).filter(
        models.AnswerOption.question_id == question_id
    ).delete()
    
    # Добавляем новые варианты ответов
    if question_data.answer_options:
        for option in question_data.answer_options:
            db_option = models.AnswerOption(
                question_id=question_id,
                option_text=option.option_text,
                is_correct=option.is_correct,
                sort_order=option.sort_order
            )
            db.add(db_option)
    
    db.commit()
    db.refresh(db_question)
    
    return db_question

@app.put("/tests/{test_id}")
def update_test(
    test_id: int,
    test: schemas.TestCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Обновить тест"""
    # Получаем тест
    db_test = db.query(models.Test).filter(
        models.Test.id == test_id,
        models.Test.is_active == True
    ).first()
    
    if not db_test:
        raise HTTPException(status_code=404, detail="Тест не найден")
    
    # Проверяем права - только автор может редактировать
    if db_test.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Недостаточно прав для редактирования теста")
    
    # Обновляем основную информацию
    db_test.title = test.title
    db_test.description = test.description
    db_test.time_limit = test.time_limit
    db_test.max_attempts = test.max_attempts
    db_test.show_results = test.show_results
    db_test.shuffle_questions = test.shuffle_questions
    db_test.shuffle_answers = test.shuffle_answers
    db_test.passing_score = test.passing_score
    db_test.is_public = test.is_public
    db_test.updated_at = datetime.utcnow()
    
    # Удаляем старые вопросы теста
    db.query(models.TestQuestion).filter(
        models.TestQuestion.test_id == test_id
    ).delete()
    
    # Добавляем новые вопросы
    for test_question in test.questions:
        db_test_question = models.TestQuestion(
            test_id=test_id,
            question_id=test_question.question_id,
            points=test_question.points,
            sort_order=test_question.sort_order
        )
        db.add(db_test_question)
    
    db.commit()
    db.refresh(db_test)
    
    return db_test

from .utils.file_importer import QuestionFileImporter
from typing import List
import json

@app.post("/questions/import-file")
async def import_questions_from_file(
    file: UploadFile = File(...),
    category_id: int = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """
    Импорт вопросов из файла с сохранением в базу
    """
    try:
        # Используем ту же логику чтения файла
        file_extension = file.filename.lower()
        
        if file_extension.endswith(('.xlsx', '.xls')):
            contents = await file.read()
            df = pd.read_excel(io.BytesIO(contents))
        elif file_extension.endswith('.csv'):
            contents = await file.read()
            for encoding in ['utf-8', 'cp1251', 'windows-1251', 'latin1']:
                try:
                    df = pd.read_csv(io.BytesIO(contents), encoding=encoding, sep=None, engine='python')
                    break
                except:
                    continue
            else:
                raise HTTPException(status_code=400, detail="Не удалось прочитать файл CSV")
        else:
            raise HTTPException(status_code=400, detail="Неподдерживаемый формат файла")
        
        # Нормализуем колонки
        df.columns = df.columns.astype(str).str.strip().str.lower()
        
        column_mapping = {
            'вопрос': 'question',
            'тип вопроса': 'type',
            'тип': 'type',
            'варианты': 'options',
            'правильный ответ': 'correct_answer',
            'правильные варианты': 'correct_options',
            'категория': 'category',
            'сложность': 'difficulty',
            'баллы': 'points',
            'объяснение': 'explanation',
        }
        
        df = df.rename(columns=lambda x: column_mapping.get(x, x))
        
        imported_count = 0
        errors = []
        imported_questions = []
        
        for idx, row in df.iterrows():
            try:
                question_text = str(row.get('question', '')).strip()
                if not question_text:
                    errors.append(f"Строка {idx + 2}: Пустой текст вопроса")
                    continue
                
                question_type = str(row.get('type', 'text')).strip().lower()
                
                # Преобразуем тип вопроса в type_id и answer_type_id
                type_map = {
                    'text': (1, 1),
                    'single_choice': (1, 2),
                    'multiple_choice': (1, 3),
                    'blackbox': (2, 1)
                }
                
                if question_type not in type_map:
                    errors.append(f"Строка {idx + 2}: Неподдерживаемый тип вопроса '{question_type}'")
                    continue
                
                type_id, answer_type_id = type_map[question_type]
                
                # Парсим варианты ответов
                answer_options = []
                if pd.notna(row.get('options')):
                    options_str = str(row.get('options'))
                    if ';' in options_str:
                        options = [opt.strip() for opt in options_str.split(';') if opt.strip()]
                    elif ',' in options_str:
                        options = [opt.strip() for opt in options_str.split(',') if opt.strip()]
                    else:
                        options = [options_str.strip()]
                    
                    # Для single_choice/multiple_choice определяем правильные варианты
                    correct_options = []
                    if pd.notna(row.get('correct_options')):
                        correct_opts_str = str(row.get('correct_options'))
                        if ';' in correct_opts_str:
                            correct_options = [opt.strip() for opt in correct_opts_str.split(';') if opt.strip()]
                        elif ',' in correct_opts_str:
                            correct_options = [opt.strip() for opt in correct_opts_str.split(',') if opt.strip()]
                        else:
                            correct_options = [correct_opts_str.strip()]
                    
                    # Если есть correct_answer, добавляем его как правильный вариант
                    correct_answer = str(row.get('correct_answer', '')).strip() if pd.notna(row.get('correct_answer')) else ''
                    
                    for i, option in enumerate(options):
                        is_correct = False
                        if correct_answer and option == correct_answer:
                            is_correct = True
                        elif correct_options and option in correct_options:
                            is_correct = True
                        
                        answer_options.append({
                            'option_text': option,
                            'is_correct': is_correct,
                            'sort_order': i
                        })
                
                # Создаем вопрос в базе данных
                question_data = {
                    'question_text': question_text,
                    'type_id': type_id,
                    'answer_type_id': answer_type_id,
                    'category_id': category_id or 1,
                    'difficulty': int(row.get('difficulty', 1)),
                    'explanation': str(row.get('explanation', '')).strip() if pd.notna(row.get('explanation')) else '',
                    'time_limit': 60,
                    'points': int(row.get('points', 1)),
                    'correct_answer': str(row.get('correct_answer', '')).strip() if pd.notna(row.get('correct_answer')) else '',
                    'sources': 'Импортировано из файла',
                    'allow_latex': False,
                    'blackbox_description': str(row.get('blackbox_description', '')).strip() if pd.notna(row.get('blackbox_description')) else '',
                    'answer_requirements': '',
                    'is_active': True
                }
                
                # Создаем вопрос через CRUD
                question_schema = schemas.QuestionCreate(**question_data)
                created_question = crud.create_question(
                    db=db,
                    question=question_schema,
                    author_id=current_user.id
                )
                
                if created_question:
                    imported_count += 1
                    imported_questions.append({
                        'question_text': question_text,
                        'question_type': question_type,
                        'difficulty': int(row.get('difficulty', 1)),
                        'points': int(row.get('points', 1))
                    })
                
            except Exception as e:
                errors.append(f"Строка {idx + 2}: {str(e)}")
        
        return {
            "imported_count": imported_count,
            "failed_count": len(df) - imported_count,
            "questions": imported_questions,
            "errors": errors
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка импорта: {str(e)}")

@app.post("/questions/import-preview")
async def preview_imported_questions(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """
    Предпросмотр вопросов из файла без сохранения в базу
    Поддерживает Excel и CSV
    """
    try:
        file_extension = file.filename.lower()
        
        if file_extension.endswith(('.xlsx', '.xls')):
            contents = await file.read()
            df = pd.read_excel(io.BytesIO(contents))
            
        elif file_extension.endswith('.csv'):
            contents = await file.read()
            for encoding in ['utf-8', 'cp1251', 'windows-1251', 'latin1']:
                try:
                    df = pd.read_csv(io.BytesIO(contents), encoding=encoding, sep=None, engine='python')
                    break
                except:
                    continue
            else:
                raise HTTPException(status_code=400, detail="Не удалось прочитать файл CSV")
        else:
            raise HTTPException(status_code=400, detail="Неподдерживаемый формат файла")
        
        # Нормализуем названия колонок
        df.columns = df.columns.astype(str).str.strip().str.lower()
        
        # Расширенный маппинг русских названий колонок
        column_mapping = {
            # Вопрос
            'вопрос': 'question',
            'текст вопроса': 'question',
            'question': 'question',
            
            # Тип вопроса
            'тип вопроса': 'question_type',
            'question_type': 'question_type',
            'тип вопроса type': 'question_type',
            'qtype': 'question_type',
            'тип вопроса question_type': 'question_type',
            
            # Тип ответа (ВАЖНО! Этого не было)
            'тип ответа': 'answer_type',
            'answer_type': 'answer_type',
            'тип ответа answer_type': 'answer_type',
            'тип ответа type': 'answer_type',
            
            # Варианты
            'варианты': 'options',
            'варианты ответов': 'options',
            'options': 'options',
            'choices': 'options',
            
            # Правильные ответы
            'правильный ответ': 'correct_answer',
            'correct_answer': 'correct_answer',
            'answer': 'correct_answer',
            
            # Правильные варианты
            'правильные варианты': 'correct_options',
            'correct_options': 'correct_options',
            'правильные варианты ответов': 'correct_options',
            'correct choices': 'correct_options',
            
            # Категория
            'категория': 'category',
            'category': 'category',
            'тема': 'category',
            'topic': 'category',
            
            # Сложность и баллы
            'сложность': 'difficulty',
            'difficulty': 'difficulty',
            'баллы': 'points',
            'points': 'points',
            'score': 'points',
            
            # Объяснение
            'объяснение': 'explanation',
            'explanation': 'explanation',
            'пояснение': 'explanation',
            'comment': 'explanation',
            
            # Дополнительные поля
            'описание черного ящика': 'blackbox_description',
            'blackbox_description': 'blackbox_description',
            'описание': 'blackbox_description',
            'description': 'blackbox_description',
            
            'media_url': 'media_url',
            'ссылка': 'media_url',
            'url': 'media_url',
            'url медиа': 'media_url'
        }
        
        df = df.rename(columns=lambda x: column_mapping.get(x, x))
        
        # Определяем типы вопросов и ответов если их нет
        def determine_answer_type(row):
            """Определяем тип ответа по данным строки"""
            if 'answer_type' in row and pd.notna(row['answer_type']):
                answer_type = str(row['answer_type']).strip().lower()
                if answer_type in ['text', 'single_choice', 'multiple_choice']:
                    return answer_type
            
            # Определяем по наличию полей
            options = []
            if 'options' in row and pd.notna(row['options']):
                options_str = str(row['options'])
                if ';' in options_str:
                    options = [opt.strip() for opt in options_str.split(';') if opt.strip()]
                elif ',' in options_str:
                    options = [opt.strip() for opt in options_str.split(',') if opt.strip()]
                else:
                    options = [options_str.strip()]
            
            correct_options = []
            if 'correct_options' in row and pd.notna(row['correct_options']):
                correct_opts_str = str(row['correct_options'])
                if ';' in correct_opts_str:
                    correct_options = [opt.strip() for opt in correct_opts_str.split(';') if opt.strip()]
                elif ',' in correct_opts_str:
                    correct_options = [opt.strip() for opt in correct_opts_str.split(',') if opt.strip()]
                else:
                    correct_options = [correct_opts_str.strip()]
            
            # Если есть correct_options и их больше 1 - это multiple_choice
            if len(correct_options) > 1:
                return 'multiple_choice'
            # Если есть options - это single_choice
            elif len(options) > 0:
                return 'single_choice'
            # Иначе - text
            else:
                return 'text'
        
        def determine_question_type(row):
            """Определяем тип вопроса по данным строки"""
            if 'question_type' in row and pd.notna(row['question_type']):
                q_type = str(row['question_type']).strip().lower()
                if q_type in ['text', 'blackbox', 'image', 'video', 'audio', 'code']:
                    return q_type
            return 'text'
        
        # Валидируем вопросы
        preview_data = []
        validation_errors = []
        
        for idx, row in df.iterrows():
            try:
                row_num = idx + 2
                
                # Определяем типы
                question_type = determine_question_type(row)
                answer_type = determine_answer_type(row)
                
                # Парсим options
                options = []
                if 'options' in row and pd.notna(row['options']):
                    options_str = str(row['options'])
                    if ';' in options_str:
                        options = [opt.strip() for opt in options_str.split(';') if opt.strip()]
                    elif ',' in options_str:
                        options = [opt.strip() for opt in options_str.split(',') if opt.strip()]
                    else:
                        options = [options_str.strip()]
                
                # Парсим correct_options
                correct_options = []
                if 'correct_options' in row and pd.notna(row['correct_options']):
                    correct_opts_str = str(row['correct_options'])
                    if ';' in correct_opts_str:
                        correct_options = [opt.strip() for opt in correct_opts_str.split(';') if opt.strip()]
                    elif ',' in correct_opts_str:
                        correct_options = [opt.strip() for opt in correct_opts_str.split(',') if opt.strip()]
                    else:
                        correct_options = [correct_opts_str.strip()]
                
                question_data = {
                    'row_number': row_num,
                    'question_text': str(row.get('question', '')).strip(),
                    'question_type': question_type,
                    'answer_type': answer_type,  # ← ЭТО ОЧЕНЬ ВАЖНО!
                    'options': options,
                    'correct_answer': str(row.get('correct_answer', '')).strip() if pd.notna(row.get('correct_answer')) else '',
                    'correct_options': correct_options,
                    'category': str(row.get('category', 'Общие знания')).strip(),
                    'difficulty': int(float(row.get('difficulty', 1))),
                    'points': int(float(row.get('points', 1))),
                    'explanation': str(row.get('explanation', '')).strip() if pd.notna(row.get('explanation')) else '',
                    'blackbox_description': str(row.get('blackbox_description', '')).strip() if pd.notna(row.get('blackbox_description')) else '',
                    'media_url': str(row.get('media_url', '')).strip() if pd.notna(row.get('media_url')) else '',
                    'is_valid': True,
                    'errors': []
                }
                
                # ВАЛИДАЦИЯ
                # 1. Проверка текста вопроса
                if not question_data['question_text']:
                    question_data['errors'].append("Текст вопроса обязателен")
                    question_data['is_valid'] = False
                
                # 2. Проверка типов вопроса
                valid_question_types = ['text', 'blackbox', 'image', 'video', 'audio', 'code']
                if question_data['question_type'] not in valid_question_types:
                    question_data['errors'].append(f"Неподдерживаемый тип вопроса: {question_data['question_type']}")
                    question_data['is_valid'] = False
                
                # 3. Проверка типов ответа
                valid_answer_types = ['text', 'single_choice', 'multiple_choice']
                if question_data['answer_type'] not in valid_answer_types:
                    question_data['errors'].append(f"Неподдерживаемый тип ответа: {question_data['answer_type']}")
                    question_data['is_valid'] = False
                
                # 4. Проверка для вопросов с выбором
                if question_data['answer_type'] in ['single_choice', 'multiple_choice']:
                    if not question_data['options']:
                        question_data['errors'].append(f"Для типа ответа '{question_data['answer_type']}' нужны варианты ответов")
                        question_data['is_valid'] = False
                    
                    if question_data['answer_type'] == 'single_choice' and not question_data['correct_answer']:
                        question_data['errors'].append("Для single_choice нужен правильный ответ (correct_answer)")
                        question_data['is_valid'] = False
                    
                    if question_data['answer_type'] == 'multiple_choice' and not question_data['correct_options']:
                        question_data['errors'].append("Для multiple_choice нужны правильные варианты (correct_options)")
                        question_data['is_valid'] = False
                
                # 5. Проверка для текстовых вопросов
                elif question_data['answer_type'] == 'text' and question_data['question_type'] not in ['image', 'video', 'audio']:
                    if not question_data['correct_answer']:
                        question_data['errors'].append("Для текстового вопроса нужен правильный ответ")
                        question_data['is_valid'] = False
                
                # 6. Проверка сложности
                if question_data['difficulty'] < 1 or question_data['difficulty'] > 5:
                    question_data['errors'].append("Сложность должна быть от 1 до 5")
                    question_data['is_valid'] = False
                
                # 7. Проверка баллов
                if question_data['points'] <= 0:
                    question_data['errors'].append("Баллы должны быть положительными")
                    question_data['is_valid'] = False
                
                # 8. Проверка для blackbox
                if question_data['question_type'] == 'blackbox' and not question_data['blackbox_description']:
                    question_data['errors'].append("Для blackbox нужно описание черного ящика")
                    question_data['is_valid'] = False
                
                # 9. Проверка для media типов
                if question_data['question_type'] in ['image', 'video', 'audio'] and not question_data['media_url']:
                    question_data['errors'].append(f"Для типа вопроса '{question_data['question_type']}' нужен URL медиафайла")
                    question_data['is_valid'] = False
                
                preview_data.append(question_data)
                
            except Exception as e:
                validation_errors.append(f"Строка {idx + 2}: Ошибка обработки - {str(e)}")
        
        # Статистика
        question_types = {}
        answer_types = {}
        valid_count = 0
        
        for q in preview_data:
            q_type = q['question_type']
            a_type = q['answer_type']
            question_types[q_type] = question_types.get(q_type, 0) + 1
            answer_types[a_type] = answer_types.get(a_type, 0) + 1
            if q['is_valid']:
                valid_count += 1
        
        return {
            "total_questions": len(df),
            "valid_questions": valid_count,
            "preview_count": len(preview_data),
            "question_types": question_types,
            "answer_types": answer_types,  # ← Добавляем статистику по типам ответов
            "preview": preview_data[:50],  # Ограничиваем предпросмотр
            "validation_errors": validation_errors[:10]
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Ошибка обработки файла: {str(e)}")
# main.py - добавьте этот endpoint
@app.post("/tests/{test_id}/import-questions")
async def import_questions_to_test(
    test_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """
    Импорт вопросов из файла и добавление их в тест
    """
    try:
        # Проверяем существование теста и права доступа
        test = db.query(models.Test).filter(
            models.Test.id == test_id,
            models.Test.is_active == True
        ).first()
        
        if not test:
            raise HTTPException(status_code=404, detail="Тест не найден")
        
        # Проверяем права доступа к тесту
        if test.author_id != current_user.id and current_user.role_id != 3:
            raise HTTPException(status_code=403, detail="Нет прав для редактирования этого теста")
        
        # Читаем файл
        file_extension = file.filename.lower()
        
        if file_extension.endswith(('.xlsx', '.xls')):
            contents = await file.read()
            df = pd.read_excel(io.BytesIO(contents), dtype=str)  # Читаем как текст
            df = df.fillna('')  # Заменяем NaN на пустые строки
        elif file_extension.endswith('.csv'):
            contents = await file.read()
            # Пробуем разные разделители и кодировки
            for sep in [';', ',', '\t']:
                for encoding in ['utf-8', 'cp1251', 'windows-1251']:
                    try:
                        df = pd.read_csv(
                            io.BytesIO(contents), 
                            sep=sep, 
                            encoding=encoding, 
                            engine='python',
                            dtype=str  # Читаем как текст
                        )
                        df = df.fillna('')  # Заменяем NaN на пустые строки
                        break
                    except:
                        continue
                else:
                    continue
                break
            else:
                raise HTTPException(status_code=400, detail="Не удалось прочитать CSV файл")
        else:
            raise HTTPException(status_code=400, detail="Неподдерживаемый формат файла")
        
        # Нормализуем названия колонок
        df.columns = df.columns.astype(str).str.strip().str.lower()
        
        print("📊 Колонки в импорт-тест файле:", list(df.columns))
        
        # Расширенный маппинг - ВАЖНО: добавляем question_type и answer_type
        column_mapping = {
            'вопрос': 'question',
            'question': 'question',
            'текст': 'question',
            
            # Тип вопроса
            'тип вопроса': 'question_type',
            'question_type': 'question_type',
            'тип_вопроса': 'question_type',
            'qtype': 'question_type',
            
            # Тип ответа
            'тип ответа': 'answer_type',
            'answer_type': 'answer_type',
            'тип_ответа': 'answer_type',
            
            # Общее поле type (может быть как question_type, так и answer_type)
            'тип': 'type',
            'type': 'type',
            
            'варианты': 'options',
            'options': 'options',
            'варианты ответов': 'options',
            'choices': 'options',
            
            'правильный ответ': 'correct_answer',
            'correct_answer': 'correct_answer',
            'ответ': 'correct_answer',
            
            'правильные варианты': 'correct_options',
            'correct_options': 'correct_options',
            'correct choices': 'correct_options',
            
            'категория': 'category',
            'category': 'category',
            'тема': 'category',
            
            'сложность': 'difficulty',
            'difficulty': 'difficulty',
            
            'баллы': 'points',
            'points': 'points',
            'score': 'points',
            
            'объяснение': 'explanation',
            'explanation': 'explanation',
            'комментарий': 'explanation',
            
            'описание черного ящика': 'blackbox_description',
            'blackbox_description': 'blackbox_description',
            'описание': 'blackbox_description',
        }
        
        df = df.rename(columns=lambda x: column_mapping.get(x, x))
        
        print("📊 Колонки после переименования:", list(df.columns))
        
        # Функция для определения типов
        def determine_question_type(row):
            """Определяем тип вопроса"""
            # Если есть явное поле question_type
            if 'question_type' in row and row['question_type'] and str(row['question_type']).strip():
                q_type = str(row['question_type']).strip().lower()
                if q_type in ['text', 'blackbox']:
                    return q_type
            
            # Если есть общее поле type и оно похоже на тип вопроса
            if 'type' in row and row['type'] and str(row['type']).strip():
                type_val = str(row['type']).strip().lower()
                if type_val in ['text', 'blackbox']:
                    return type_val
                # Если это не тип вопроса, проверяем, не тип ли это ответа
                elif type_val in ['single_choice', 'multiple_choice']:
                    # Это тип ответа, значит вопрос текстовый
                    return 'text'
            
            # Определяем по наличию blackbox_description
            if 'blackbox_description' in row and row['blackbox_description'] and str(row['blackbox_description']).strip():
                return 'blackbox'
            
            return 'text'
        
        def determine_answer_type(row):
            """Определяем тип ответа"""
            # Если есть явное поле answer_type
            if 'answer_type' in row and row['answer_type'] and str(row['answer_type']).strip():
                a_type = str(row['answer_type']).strip().lower()
                if a_type in ['text', 'single_choice', 'multiple_choice']:
                    return a_type
            
            # Если есть общее поле type и оно похоже на тип ответа
            if 'type' in row and row['type'] and str(row['type']).strip():
                type_val = str(row['type']).strip().lower()
                if type_val in ['text', 'single_choice', 'multiple_choice']:
                    return type_val
            
            # Определяем по наличию полей
            options = []
            if 'options' in row and row['options'] and str(row['options']).strip():
                options_str = str(row['options'])
                for sep in [';', ',', '|']:
                    if sep in options_str:
                        options = [opt.strip() for opt in options_str.split(sep) if opt.strip()]
                        break
                if not options:
                    options = [options_str.strip()]
            
            correct_options = []
            if 'correct_options' in row and row['correct_options'] and str(row['correct_options']).strip():
                correct_opts_str = str(row['correct_options'])
                for sep in [';', ',', '|']:
                    if sep in correct_opts_str:
                        correct_options = [opt.strip() for opt in correct_opts_str.split(sep) if opt.strip()]
                        break
                if not correct_options:
                    correct_options = [correct_opts_str.strip()]
            
            # Логика определения
            if len(correct_options) > 1:
                return 'multiple_choice'
            elif len(options) > 0:
                return 'single_choice'
            else:
                return 'text'
        
        imported_count = 0
        errors = []
        question_ids = []
        
        # Получаем максимальный sort_order в тесте
        max_sort_order = db.query(func.max(models.TestQuestion.sort_order)).filter(
            models.TestQuestion.test_id == test_id
        ).scalar() or 0
        
        for idx, row in df.iterrows():
            try:
                row_num = idx + 2
                question_text = str(row.get('question', '')).strip()
                
                if not question_text:
                    errors.append(f"Строка {row_num}: Пустой текст вопроса")
                    continue
                
                # Определяем типы
                question_type = determine_question_type(row)
                answer_type = determine_answer_type(row)
                
                print(f"📝 Строка {row_num}: question_type='{question_type}', answer_type='{answer_type}'")
                
                # Маппинг типов вопросов
                question_type_mapping = {
                    'text': 1,
                    'blackbox': 2
                }
                
                # Маппинг типов ответов
                answer_type_mapping = {
                    'text': 1,
                    'single_choice': 2,
                    'multiple_choice': 3
                }
                
                if question_type not in question_type_mapping:
                    errors.append(f"Строка {row_num}: Неподдерживаемый тип вопроса '{question_type}'")
                    continue
                
                if answer_type not in answer_type_mapping:
                    errors.append(f"Строка {row_num}: Неподдерживаемый тип ответа '{answer_type}'")
                    continue
                
                type_id = question_type_mapping[question_type]
                answer_type_id = answer_type_mapping[answer_type]
                
                # Получаем или создаем категорию
                category_name = str(row.get('category', 'Общие знания')).strip()
                category = db.query(models.Category).filter(
                    func.lower(models.Category.name) == func.lower(category_name)
                ).first()
                
                if not category:
                    # Создаем новую категорию
                    category = models.Category(
                        name=category_name,
                        description=f"Автоматически создана при импорте",
                        color='#CCCCCC',
                        icon='category'
                    )
                    db.add(category)
                    db.commit()
                    db.refresh(category)
                
                # Парсим варианты ответов
                answer_options_data = []
                if row.get('options') and str(row['options']).strip():
                    options_str = str(row['options'])
                    options = []
                    for sep in [';', ',', '|']:
                        if sep in options_str:
                            options = [opt.strip() for opt in options_str.split(sep) if opt.strip()]
                            break
                    if not options:
                        options = [options_str.strip()]
                    
                    # Получаем правильные варианты
                    correct_options = []
                    if row.get('correct_options') and str(row['correct_options']).strip():
                        correct_opts_str = str(row['correct_options'])
                        for sep in [';', ',', '|']:
                            if sep in correct_opts_str:
                                correct_options = [opt.strip() for opt in correct_opts_str.split(sep) if opt.strip()]
                                break
                        if not correct_options:
                            correct_options = [correct_opts_str.strip()]
                    
                    # Получаем correct_answer
                    correct_answer = ''
                    if row.get('correct_answer') and str(row['correct_answer']).strip():
                        correct_answer = str(row['correct_answer']).strip()
                    
                    # Создаем варианты ответов
                    for i, option in enumerate(options):
                        is_correct = False
                        
                        if answer_type == 'single_choice':
                            # Для single_choice проверяем correct_answer
                            if correct_answer and option == correct_answer:
                                is_correct = True
                            elif correct_options and option in correct_options:
                                is_correct = True
                        elif answer_type == 'multiple_choice':
                            # Для multiple_choice проверяем correct_options
                            if correct_options and option in correct_options:
                                is_correct = True
                        
                        answer_options_data.append({
                            'option_text': option,
                            'is_correct': is_correct,
                            'sort_order': i
                        })
                        
                        print(f"  Вариант {i}: '{option}' - правильный: {is_correct}")
                
                # Подготавливаем данные вопроса
                question_data = {
                    'question_text': question_text,
                    'type_id': type_id,
                    'answer_type_id': answer_type_id,
                    'category_id': category.id,
                    'difficulty': int(float(str(row.get('difficulty', '1')).strip() or '1')),
                    'explanation': str(row.get('explanation', '')).strip(),
                    'time_limit': 60,
                    'points': int(float(str(row.get('points', '1')).strip() or '1')),
                    'correct_answer': str(row.get('correct_answer', '')).strip(),
                    'sources': 'Импортировано из файла',
                    'allow_latex': False,
                    'blackbox_description': str(row.get('blackbox_description', '')).strip(),
                    'answer_requirements': '',
                    'is_active': True
                }
                
                # Создаем вопрос
                db_question = models.Question(
                    **question_data,
                    author_id=current_user.id
                )
                db.add(db_question)
                db.commit()
                db.refresh(db_question)
                
                print(f"✅ Вопрос создан: ID={db_question.id}")
                
                # Добавляем варианты ответов если есть
                for opt_data in answer_options_data:
                    db_option = models.AnswerOption(
                        question_id=db_question.id,
                        **opt_data
                    )
                    db.add(db_option)
                
                db.commit()
                
                # Добавляем вопрос в тест
                max_sort_order += 1
                db_test_question = models.TestQuestion(
                    test_id=test_id,
                    question_id=db_question.id,
                    points=int(float(str(row.get('points', '1')).strip() or '1')),
                    sort_order=max_sort_order
                )
                db.add(db_test_question)
                db.commit()
                
                imported_count += 1
                question_ids.append(db_question.id)
                print(f"✅ Вопрос добавлен в тест: imported_count={imported_count}")
                
            except Exception as e:
                db.rollback()
                error_msg = f"Строка {idx + 2}: {str(e)}"
                print(f"❌ Ошибка: {error_msg}")
                errors.append(error_msg)
        
        return {
            "imported_count": imported_count,
            "failed_count": len(df) - imported_count,
            "question_ids": question_ids,
            "errors": errors[:10]
        }
        
    except Exception as e:
        db.rollback()
        print(f"❌ Критическая ошибка импорта: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Ошибка импорта: {str(e)}")

# main.py - добавьте этот endpoint

@app.get("/test-sessions/")
def get_test_sessions(
    test_id: Optional[int] = None,
    assignment_id: Optional[int] = None,
    user_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Получить сессии тестирования"""
    
    # Проверяем права - пользователь может видеть только свои сессии,
    # админ или создатель теста может видеть все
    query = db.query(models.TestSession)
    
    # Если не админ и не создатель теста, показываем только свои сессии
    if not current_user.role_id == 3:  # не админ
        # Проверяем является ли пользователь создателем теста
        if test_id:
            test = db.query(models.Test).filter(models.Test.id == test_id).first()
            if test and test.author_id != current_user.id:
                # Не создатель теста, показываем только свои сессии
                query = query.filter(models.TestSession.user_id == current_user.id)
        else:
            # Показываем только свои сессии
            query = query.filter(models.TestSession.user_id == current_user.id)
    elif user_id:
        # Админ запрашивает конкретного пользователя
        query = query.filter(models.TestSession.user_id == user_id)
    
    # Фильтры
    if test_id:
        query = query.filter(models.TestSession.test_id == test_id)
    
    if assignment_id:
        query = query.filter(models.TestSession.assignment_id == assignment_id)
    
    # Сортируем по дате начала (новые сверху)
    sessions = query.order_by(models.TestSession.started_at.desc()).all()
    
    return [
        {
            "id": session.id,
            "test_id": session.test_id,
            "assignment_id": session.assignment_id,
            "user_id": session.user_id,
            "started_at": session.started_at,
            "finished_at": session.finished_at,
            "is_completed": session.is_completed,
            "score": session.score,
            "max_score": session.max_score,
            "percentage": session.percentage,
            "time_spent": session.time_spent,
            "attempt_number": session.attempt_number
        }
        for session in sessions
    ]

# main.py - добавьте этот endpoint
@app.get("/debug/check-question/{question_id}")
def debug_check_question(
    question_id: int,
    answer_text: Optional[str] = None,
    selected_options: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Проверить правильность ответа на вопрос"""
    print(f"🔍 Проверка вопроса {question_id}")
    
    question = db.query(models.Question).filter(
        models.Question.id == question_id
    ).first()
    
    if not question:
        return {"error": "Вопрос не найден"}
    
    # Варианты ответов
    options = db.query(models.AnswerOption).filter(
        models.AnswerOption.question_id == question_id
    ).all()
    
    result = {
        "question_id": question.id,
        "question_text": question.question_text[:100],
        "answer_type_id": question.answer_type_id,
        "correct_answer": question.correct_answer,
        "correct_option_ids": [opt.id for opt in options if opt.is_correct],
        "correct_option_texts": [opt.option_text for opt in options if opt.is_correct],
        "all_options": [
            {"id": opt.id, "text": opt.option_text, "is_correct": opt.is_correct}
            for opt in options
        ],
        "user_answer": {
            "answer_text": answer_text,
            "selected_options": selected_options
        },
        "is_correct": False,
        "details": ""
    }
    
    # Проверка
    if question.answer_type_id == 1:  # text
        if answer_text and question.correct_answer:
            result["is_correct"] = (answer_text.strip().lower() == question.correct_answer.strip().lower())
            result["details"] = f"Сравнение: '{answer_text}' == '{question.correct_answer}'"
    
    elif question.answer_type_id in [2, 3]:  # single/multiple choice
        if selected_options:
            try:
                import json
                selected_ids = json.loads(selected_options)
                correct_ids = result["correct_option_ids"]
                
                if question.answer_type_id == 2:  # single
                    result["is_correct"] = (len(selected_ids) == 1 and selected_ids[0] in correct_ids)
                else:  # multiple
                    result["is_correct"] = (set(selected_ids) == set(correct_ids))
                
                result["details"] = f"Выбраны: {selected_ids}, Правильные: {correct_ids}"
            except:
                result["details"] = "Ошибка парсинга selected_options"
    
    return result


@app.get("/groups/{group_id}/stats")
def get_group_statistics(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Получить полную статистику группы - ДОСТУПНО ВСЕХ УЧАСТНИКАМ"""
    
    # Проверяем, что группа существует
    group = db.query(models.StudyGroup).filter(
        models.StudyGroup.id == group_id,
        models.StudyGroup.is_active == True
    ).first()
    
    if not group:
        raise HTTPException(status_code=404, detail="Группа не найдена")
    
    # Проверяем, что пользователь участник группы
    is_member = db.query(models.GroupMember).filter(
        models.GroupMember.group_id == group_id,
        models.GroupMember.user_id == current_user.id,
        models.GroupMember.is_active == True
    ).first()
    
    # Или создателем группы
    is_creator = group.created_by == current_user.id
    
    # Или администратором
    is_admin = current_user.role_id == 3
    
    # Если не участник, не создатель и не админ - нет доступа
    if not (is_member or is_creator or is_admin):
        raise HTTPException(
            status_code=403,
            detail="Вы не являетесь участником этой группы"
        )
    
    # ========== 1. ПОЛУЧАЕМ УЧАСТНИКОВ ==========
    members_query = db.query(
        models.User.id.label("user_id"),
        models.User.username,
        models.User.first_name,
        models.User.last_name,
        models.User.avatar_url,
        models.GroupMember.joined_at,
        models.GroupMember.role
    ).join(
        models.GroupMember,
        models.GroupMember.user_id == models.User.id
    ).filter(
        models.GroupMember.group_id == group_id,
        models.GroupMember.is_active == True
    ).order_by(models.User.last_name, models.User.first_name)
    
    members = members_query.all()
    
    # ========== 2. ПОЛУЧАЕМ НАЗНАЧЕНИЯ ТЕСТОВ ==========
    assignments_query = db.query(
        models.TestAssignment.id.label("assignment_id"),
        models.TestAssignment.test_id,
        models.TestAssignment.start_date,
        models.TestAssignment.end_date,
        models.TestAssignment.time_limit,
        models.TestAssignment.max_attempts,
        models.TestAssignment.passing_score,
        models.Test.title.label("test_title"),
        models.Test.description.label("test_description"),
        models.Test.time_limit.label("test_time_limit"),
        models.Test.max_attempts.label("test_max_attempts"),
        models.Test.passing_score.label("test_passing_score")
    ).join(
        models.Test,
        models.Test.id == models.TestAssignment.test_id
    ).filter(
        models.TestAssignment.group_id == group_id,
        models.TestAssignment.is_active == True,
        models.Test.is_active == True
    ).order_by(
        models.TestAssignment.start_date,
        models.Test.title
    )
    
    assignments = assignments_query.all()
    
    # ========== 3. СОБИРАЕМ СТАТИСТИКУ ПО УЧАСТНИКАМ ==========
    members_stats = []
    
    for member in members:
        user_stats = {
            "user_id": member.user_id,
            "username": member.username,
            "first_name": member.first_name,
            "last_name": member.last_name,
            "avatar_url": member.avatar_url,
            "role": member.role,
            "joined_at": member.joined_at.isoformat() if member.joined_at else None,
            "completed_tests": 0,
            "total_tests": len(assignments),
            "total_score": 0,
            "total_max_score": 0,
            "average_score": 0,
            "best_score": 0,
            "worst_score": 100,
            "passed_tests": 0,
            "failed_tests": 0,
            "total_time_spent": 0,
            "average_time_per_test": 0,
            "test_scores": [],
            "activity_timeline": []
        }
        
        total_percentage = 0
        completed_count = 0
        
        # Для каждого назначения находим лучшую попытку пользователя
        for assignment in assignments:
            # Находим ВСЕ сессии пользователя для этого назначения
            # Важно: проверяем и по assignment_id, и по test_id
            sessions_query = db.query(
                models.TestSession.id,
                models.TestSession.score,
                models.TestSession.max_score,
                models.TestSession.percentage,
                models.TestSession.is_completed,
                models.TestSession.finished_at,
                models.TestSession.time_spent,
                models.TestSession.attempt_number
            ).filter(
                models.TestSession.user_id == member.user_id,
                models.TestSession.test_id == assignment.test_id
            )
            
            # Если есть assignment_id, фильтруем по нему
            if assignment.assignment_id:
                sessions_query = sessions_query.filter(
                    models.TestSession.assignment_id == assignment.assignment_id
                )
            
            sessions = sessions_query.order_by(
                models.TestSession.percentage.desc()
            ).all()
            
            if sessions:
                # Берем лучшую попытку (самый высокий процент)
                best_session = sessions[0]
                
                # Рассчитываем проходной балл
                passing_score = assignment.passing_score or assignment.test_passing_score or 0
                is_passed = best_session.percentage >= passing_score
                
                # Собираем информацию о тесте
                test_score_info = {
                    "test_id": assignment.test_id,
                    "assignment_id": assignment.assignment_id,
                    "test_title": assignment.test_title,
                    "test_description": assignment.test_description,
                    "start_date": assignment.start_date.isoformat() if assignment.start_date else None,
                    "end_date": assignment.end_date.isoformat() if assignment.end_date else None,
                    "time_limit": assignment.time_limit or assignment.test_time_limit,
                    "max_attempts": assignment.max_attempts or assignment.test_max_attempts,
                    "passing_score": passing_score,
                    
                    # Статистика по лучшей попытке
                    "best_score": best_session.score,
                    "best_max_score": best_session.max_score,
                    "best_percentage": best_session.percentage,
                    "best_attempt_number": best_session.attempt_number,
                    "best_finished_at": best_session.finished_at.isoformat() if best_session.finished_at else None,
                    "best_time_spent": best_session.time_spent,
                    "is_passed": is_passed,
                    
                    # Общая статистика по всем попыткам
                    "total_attempts": len(sessions),
                    "attempts": []
                }
                
                # Добавляем информацию о всех попытках
                for session in sessions:
                    test_score_info["attempts"].append({
                        "session_id": session.id,
                        "score": session.score,
                        "max_score": session.max_score,
                        "percentage": session.percentage,
                        "is_completed": session.is_completed,
                        "finished_at": session.finished_at.isoformat() if session.finished_at else None,
                        "time_spent": session.time_spent,
                        "attempt_number": session.attempt_number
                    })
                
                user_stats["test_scores"].append(test_score_info)
                
                # Обновляем общую статистику
                if best_session.is_completed:
                    user_stats["completed_tests"] += 1
                    user_stats["total_score"] += best_session.score
                    user_stats["total_max_score"] += best_session.max_score
                    total_percentage += best_session.percentage
                    completed_count += 1
                    
                    if best_session.time_spent:
                        user_stats["total_time_spent"] += best_session.time_spent
                    
                    # Обновляем лучший и худший результаты
                    if best_session.percentage > user_stats["best_score"]:
                        user_stats["best_score"] = best_session.percentage
                    if best_session.percentage < user_stats["worst_score"]:
                        user_stats["worst_score"] = best_session.percentage
                    
                    # Считаем пройденные/непройденные тесты
                    if is_passed:
                        user_stats["passed_tests"] += 1
                    else:
                        user_stats["failed_tests"] += 1
                    
                    # Добавляем в таймлайн активности
                    if best_session.finished_at:
                        user_stats["activity_timeline"].append({
                            "date": best_session.finished_at.isoformat(),
                            "test_id": assignment.test_id,
                            "test_title": assignment.test_title,
                            "score": best_session.score,
                            "max_score": best_session.max_score,
                            "percentage": best_session.percentage,
                            "is_passed": is_passed,
                            "attempt_number": best_session.attempt_number
                        })
        
        # Рассчитываем средние значения
        if completed_count > 0:
            user_stats["average_score"] = round(total_percentage / completed_count, 1)
            
            if user_stats["total_time_spent"] > 0:
                user_stats["average_time_per_test"] = round(user_stats["total_time_spent"] / completed_count)
        
        # Сортируем timeline по дате
        user_stats["activity_timeline"].sort(key=lambda x: x["date"], reverse=True)
        
        members_stats.append(user_stats)
    
    # Сортируем участников по среднему баллу (по убыванию)
    members_stats.sort(key=lambda x: x["average_score"], reverse=True)
    
    # ========== 4. СТАТИСТИКА ПО ТЕСТАМ С МЕДИАНОЙ ==========
    test_statistics = []
    
    for assignment in assignments:
        test_stat = {
            "test_id": assignment.test_id,
            "assignment_id": assignment.assignment_id,
            "test_title": assignment.test_title,
            "start_date": assignment.start_date.isoformat() if assignment.start_date else None,
            "end_date": assignment.end_date.isoformat() if assignment.end_date else None,
            "passing_score": assignment.passing_score or assignment.test_passing_score or 0,
            "total_participants": len(members),
            "participated_count": 0,
            "completed_count": 0,
            "passed_count": 0,
            "failed_count": 0,
            "average_score": 0,
            "median_score": 0,  # ← ДОБАВЛЯЕМ МЕДИАНУ
            "max_score": 0,
            "min_score": 100,
            "scores_distribution": {
                "excellent": 0,      # 90-100%
                "good": 0,           # 70-89%
                "satisfactory": 0,   # 50-69%
                "poor": 0            # 0-49%
            },
            "participants": []
        }
        
        scores = []
        
        # Собираем результаты всех участников
        for member in members:
            # Ищем лучшую сессию этого участника
            # Проверяем и по assignment_id, и по test_id
            sessions_query = db.query(
                models.TestSession.percentage,
                models.TestSession.score,
                models.TestSession.max_score,
                models.TestSession.is_completed,
                models.TestSession.finished_at
            ).filter(
                models.TestSession.user_id == member.user_id,
                models.TestSession.test_id == assignment.test_id
            )
            
            # Если есть assignment_id, фильтруем по нему
            if assignment.assignment_id:
                sessions_query = sessions_query.filter(
                    models.TestSession.assignment_id == assignment.assignment_id
                )
            
            best_session = sessions_query.order_by(
                models.TestSession.percentage.desc()
            ).first()
            
            participant_info = {
                "user_id": member.user_id,
                "username": member.username,
                "first_name": member.first_name,
                "last_name": member.last_name,
                "has_attempt": best_session is not None,
                "is_completed": best_session.is_completed if best_session else False,
                "percentage": best_session.percentage if best_session else 0,
                "score": best_session.score if best_session else 0,
                "max_score": best_session.max_score if best_session else 0,
                "is_passed": False,
                "finished_at": best_session.finished_at.isoformat() if best_session and best_session.finished_at else None
            }
            
            if best_session:
                test_stat["participated_count"] += 1
                
                if best_session.is_completed:
                    test_stat["completed_count"] += 1
                    scores.append(best_session.percentage)
                    
                    # Обновляем мин/макс
                    if best_session.percentage > test_stat["max_score"]:
                        test_stat["max_score"] = best_session.percentage
                    if best_session.percentage < test_stat["min_score"]:
                        test_stat["min_score"] = best_session.percentage
                    
                    # Распределение по категориям
                    if best_session.percentage >= 90:
                        test_stat["scores_distribution"]["excellent"] += 1
                    elif best_session.percentage >= 70:
                        test_stat["scores_distribution"]["good"] += 1
                    elif best_session.percentage >= 50:
                        test_stat["scores_distribution"]["satisfactory"] += 1
                    else:
                        test_stat["scores_distribution"]["poor"] += 1
                    
                    # Проверяем прохождение
                    is_passed = best_session.percentage >= test_stat["passing_score"]
                    participant_info["is_passed"] = is_passed
                    
                    if is_passed:
                        test_stat["passed_count"] += 1
                    else:
                        test_stat["failed_count"] += 1
            
            test_stat["participants"].append(participant_info)
        
        # Рассчитываем средний балл и медиану
        if scores:
            # Среднее
            test_stat["average_score"] = round(sum(scores) / len(scores), 1)
            
            # Медиана
            sorted_scores = sorted(scores)
            n = len(sorted_scores)
            if n % 2 == 1:
                # Нечетное количество: берем средний элемент
                test_stat["median_score"] = sorted_scores[n // 2]
            else:
                # Четное количество: среднее двух центральных
                test_stat["median_score"] = round((sorted_scores[n // 2 - 1] + sorted_scores[n // 2]) / 2, 1)
        
        test_statistics.append(test_stat)
    
    # ========== 5. ОБЩАЯ СТАТИСТИКА ГРУППЫ ==========
    if members_stats:
        total_average = sum(m["average_score"] for m in members_stats)
        group_average = round(total_average / len(members_stats), 1)
        
        # Находим лучшего и худшего
        top_performer = members_stats[0] if members_stats else None
        weakest_performer = members_stats[-1] if members_stats else None
        
        # Считаем общую активность
        total_completed_tests = sum(m["completed_tests"] for m in members_stats)
        total_possible_tests = len(members_stats) * len(assignments)
        completion_rate = round((total_completed_tests / total_possible_tests * 100), 1) if total_possible_tests > 0 else 0
    else:
        group_average = 0
        top_performer = None
        weakest_performer = None
        completion_rate = 0
    
    return {
        "group_id": group_id,
        "group_name": group.name,
        "group_description": group.description,
        "created_by": group.created_by,
        "created_at": group.created_at.isoformat() if group.created_at else None,
        
        "summary": {
            "total_members": len(members),
            "total_assignments": len(assignments),
            "group_average_score": group_average,
            "completion_rate": completion_rate,
            "top_performer": top_performer,
            "weakest_performer": weakest_performer
        },
        
        "members": members_stats,
        "test_statistics": test_statistics,
        
        "detailed_analytics": {
            "performance_over_time": calculate_performance_over_time(members_stats, assignments),
            "participation_rates": calculate_participation_rates(members_stats),
            "skill_distribution": calculate_skill_distribution(members_stats)
        }
    }

def calculate_performance_over_time(members_stats, assignments):
    """Рассчитать изменение успеваемости по времени"""
    performance_data = []
    
    # Группируем по месяцам
    monthly_data = {}
    
    for member in members_stats:
        for activity in member.get("activity_timeline", []):
            if activity.get("date"):
                try:
                    date_obj = datetime.fromisoformat(activity["date"].replace('Z', '+00:00'))
                    month_key = date_obj.strftime("%Y-%m")
                    
                    if month_key not in monthly_data:
                        monthly_data[month_key] = {
                            "date": month_key,
                            "total_score": 0,
                            "count": 0,
                            "tests_taken": 0
                        }
                    
                    monthly_data[month_key]["total_score"] += activity["percentage"]
                    monthly_data[month_key]["count"] += 1
                    monthly_data[month_key]["tests_taken"] += 1
                except:
                    continue
    
    # Преобразуем в массив и сортируем
    for month in sorted(monthly_data.keys()):
        data = monthly_data[month]
        if data["count"] > 0:
            performance_data.append({
                "date": month,
                "average_score": round(data["total_score"] / data["count"], 1),
                "tests_taken": data["tests_taken"]
            })
    
    return performance_data


def calculate_participation_rates(members_stats):
    """Рассчитать показатели участия"""
    if not members_stats:
        return {}
    
    total_members = len(members_stats)
    
    # Группируем по активности
    highly_active = sum(1 for m in members_stats if m.get("completed_tests", 0) >= 3)
    moderately_active = sum(1 for m in members_stats if 1 <= m.get("completed_tests", 0) < 3)
    inactive = sum(1 for m in members_stats if m.get("completed_tests", 0) == 0)
    
    return {
        "highly_active": {
            "count": highly_active,
            "percentage": round((highly_active / total_members) * 100, 1)
        },
        "moderately_active": {
            "count": moderately_active,
            "percentage": round((moderately_active / total_members) * 100, 1)
        },
        "inactive": {
            "count": inactive,
            "percentage": round((inactive / total_members) * 100, 1)
        }
    }


def calculate_skill_distribution(members_stats):
    """Рассчитать распределение по уровню знаний"""
    if not members_stats:
        return {}
    
    distribution = {
        "excellent": {"min": 90, "max": 100, "count": 0, "members": []},
        "good": {"min": 70, "max": 89, "count": 0, "members": []},
        "satisfactory": {"min": 50, "max": 69, "count": 0, "members": []},
        "poor": {"min": 0, "max": 49, "count": 0, "members": []},
        "no_data": {"count": 0, "members": []}
    }
    
    for member in members_stats:
        avg_score = member.get("average_score", 0)
        completed_tests = member.get("completed_tests", 0)
        
        if completed_tests == 0:
            distribution["no_data"]["count"] += 1
            distribution["no_data"]["members"].append({
                "user_id": member["user_id"],
                "name": f"{member.get('first_name', '')} {member.get('last_name', '')}".strip() or member.get("username", "")
            })
        elif avg_score >= 90:
            distribution["excellent"]["count"] += 1
            distribution["excellent"]["members"].append({
                "user_id": member["user_id"],
                "name": f"{member.get('first_name', '')} {member.get('last_name', '')}".strip() or member.get("username", ""),
                "score": avg_score
            })
        elif avg_score >= 70:
            distribution["good"]["count"] += 1
            distribution["good"]["members"].append({
                "user_id": member["user_id"],
                "name": f"{member.get('first_name', '')} {member.get('last_name', '')}".strip() or member.get("username", ""),
                "score": avg_score
            })
        elif avg_score >= 50:
            distribution["satisfactory"]["count"] += 1
            distribution["satisfactory"]["members"].append({
                "user_id": member["user_id"],
                "name": f"{member.get('first_name', '')} {member.get('last_name', '')}".strip() or member.get("username", ""),
                "score": avg_score
            })
        else:
            distribution["poor"]["count"] += 1
            distribution["poor"]["members"].append({
                "user_id": member["user_id"],
                "name": f"{member.get('first_name', '')} {member.get('last_name', '')}".strip() or member.get("username", ""),
                "score": avg_score
            })
    
    return distribution
