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

from . import models, schemas, crud, auth
from .database import SessionLocal, engine, get_db

# Создаем таблицы
models.Base.metadata.create_all(bind=engine)

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

@app.get("/tests/{test_id}", response_model=schemas.TestResponse)
def get_test(
    test_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    test = crud.get_test(db, test_id=test_id)
    if test is None:
        raise HTTPException(status_code=404, detail="Тест не найден")
    
    # Проверяем доступ пользователя к тесту
    user_access = crud.get_user_test_access(db, test_id, current_user.id)
    if not user_access and not test.is_public and test.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Нет доступа к этому тесту")
    
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

@app.post("/test-sessions/{session_id}/answers", response_model=schemas.UserAnswerResponse)
def submit_answer(
    session_id: int,
    answer: schemas.UserAnswerCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    # Verify session belongs to user
    session = db.query(models.TestSession).filter(
        models.TestSession.id == session_id,
        models.TestSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Сессия тестирования не найдена")
    
    if session.is_completed:
        raise HTTPException(status_code=400, detail="Тест уже завершен")
    
    user_answer = crud.add_user_answer(db=db, answer=answer, session_id=session_id)
    if not user_answer:
        raise HTTPException(status_code=400, detail="Ошибка при сохранении ответа")
    
    return user_answer

@app.post("/test-sessions/{session_id}/complete")
def complete_test_session(
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
    
    session.is_completed = True
    session.finished_at = db.query(models.func.now()).scalar()
    
    # Calculate total time spent
    if session.started_at and session.finished_at:
        time_spent = (session.finished_at - session.started_at).total_seconds()
        session.time_spent = int(time_spent)
    
    db.commit()
    
    return {"message": "Тест завершен", "score": session.score, "percentage": session.percentage}

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

import traceback

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
        
        print(f"✅ Найдено {len(groups)} групп")
        
        # Проверяем каждую группу
        for group in groups:
            print(f"\n🔍 Проверка группы ID {group.id}:")
            print(f"  Тип created_at: {type(group.created_at)}")
            print(f"  Значение created_at: {group.created_at}")
            print(f"  Тип is_public: {type(group.is_public)}")
            print(f"  Значение is_public: {group.is_public}")
        
        return groups
        
    except Exception as e:
        print(f"❌ Ошибка в get_study_groups:")
        print(traceback.format_exc())
        raise

@app.post("/groups/join/{group_id}")
def join_study_group(
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
    
    # Если группа закрыта и есть пароль
    if not group.is_public and group.password:
        if not password:
            raise HTTPException(status_code=400, detail="Нужен пароль")
        if password != group.password:
            raise HTTPException(status_code=400, detail="Неверный пароль")
    
    # Остальная логика вступления...
    # (проверка, что не состоит уже, лимит участников и т.д.)
    
    return {"message": "Вы в группе!"}

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



# ... существующие роуты групп ...

# Дополнительные роуты для групп
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

@app.get("/groups/{group_id}/tests")
def get_group_tests(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Получить тесты, назначенные на группу"""
    # Проверяем доступ пользователя к группе
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
    
    # Получаем назначенные тесты
    assignments = db.query(
        models.TestAssignment,
        models.Test
    ).join(
        models.Test,
        models.Test.id == models.TestAssignment.test_id
    ).filter(
        models.TestAssignment.group_id == group_id,
        models.TestAssignment.is_active == True,
        models.Test.is_active == True
    ).all()
    
    # Получаем статистику пользователя по этим тестам
    result = []
    for assignment, test in assignments:
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
            "start_date": assignment.start_date,
            "end_date": assignment.end_date,
            "attempts_used": attempts,
            "latest_session": {
                "score": latest_session.score if latest_session else None,
                "max_score": latest_session.max_score if latest_session else None,
                "percentage": latest_session.percentage if latest_session else None,
                "is_completed": latest_session.is_completed if latest_session else False,
                "finished_at": latest_session.finished_at if latest_session else None
            } if latest_session else None
        })
    
    return result

@app.get("/groups/{group_id}/stats")
def get_group_statistics(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Получить статистику группы (только для создателя/админа)"""
    # Проверяем права доступа
    is_creator = db.query(models.StudyGroup).filter(
        models.StudyGroup.id == group_id,
        models.StudyGroup.created_by == current_user.id
    ).first()
    
    if not is_creator and current_user.role_id != 3:  # Не создатель и не админ
        raise HTTPException(
            status_code=403,
            detail="Недостаточно прав для просмотра статистики группы"
        )
    
    # Получаем всех участников
    members = db.query(
        models.User,
        models.GroupMember.joined_at
    ).join(
        models.GroupMember,
        models.GroupMember.user_id == models.User.id
    ).filter(
        models.GroupMember.group_id == group_id,
        models.GroupMember.is_active == True
    ).all()
    
    # Получаем назначенные тесты
    assignments = db.query(models.TestAssignment).filter(
        models.TestAssignment.group_id == group_id,
        models.TestAssignment.is_active == True
    ).all()
    
    # Собираем статистику
    members_stats = []
    
    for user, joined_at in members:
        total_score = 0
        total_max_score = 0
        completed_tests = 0
        test_scores = []
        
        for assignment in assignments:
            # Находим лучшую попытку пользователя
            best_session = db.query(models.TestSession).filter(
                models.TestSession.assignment_id == assignment.id,
                models.TestSession.user_id == user.id,
                models.TestSession.is_completed == True
            ).order_by(models.TestSession.score.desc()).first()
            
            if best_session:
                test_scores.append({
                    "test_id": assignment.test_id,
                    "score": best_session.score,
                    "max_score": best_session.max_score,
                    "percentage": best_session.percentage
                })
                total_score += best_session.score
                total_max_score += best_session.max_score
                completed_tests += 1
        
        average_percentage = (total_score / total_max_score * 100) if total_max_score > 0 else 0
        
        members_stats.append({
            "user_id": user.id,
            "username": user.username,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "joined_at": joined_at,
            "completed_tests": completed_tests,
            "total_tests": len(assignments),
            "average_score": round(average_percentage, 1),
            "test_scores": test_scores
        })
    
    return {
        "group_id": group_id,
        "total_members": len(members),
        "total_assignments": len(assignments),
        "members": members_stats
    }


@app.get("/groups/my", response_model=List[schemas.StudyGroupResponse])
def get_my_groups(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_active_user)
):
    """Получить группы текущего пользователя"""
    print(f"🔍 get_my_groups для пользователя {current_user.id} ({current_user.username})")
    
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
    
    print(f"✅ Найдено {len(all_groups)} уникальных групп")
    
    # 4. Возвращаем как есть - не добавляем дополнительные поля!
    return all_groups


# В main.py после существующих роутов групп
@app.post("/groups/{group_id}/join")
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