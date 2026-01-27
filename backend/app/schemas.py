from pydantic import BaseModel
from typing import List, Optional, Dict, Any 
from datetime import datetime

# Base schemas
class UserBase(BaseModel):
    username: str
    email: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(UserBase):
    id: int
    role_id: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# Answer Type schemas
class AnswerTypeResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    template: Optional[str] = None
    
    class Config:
        from_attributes = True

# Question schemas
class AnswerOptionBase(BaseModel):
    option_text: str
    is_correct: bool
    sort_order: int

class AnswerOptionCreate(AnswerOptionBase):
    pass

class AnswerOptionResponse(AnswerOptionBase):
    id: int
    
    class Config:
        from_attributes = True

class QuestionBase(BaseModel):
    question_text: str
    type_id: int
    answer_type_id: int
    category_id: int
    difficulty: int = 1
    explanation: Optional[str] = None
    time_limit: int = 60
    points: int = 1
    media_url: Optional[str] = None
    sources: Optional[str] = None  # новое поле
    allow_latex: bool = False  # новое поле
    blackbox_description: Optional[str] = None
    correct_answer: Optional[str] = None
    answer_requirements: Optional[str] = None

class QuestionCreate(QuestionBase):
    answer_options: Optional[List[AnswerOptionCreate]] = None
    correct_answer: Optional[str] = None
    # Убедитесь, что эти поля есть:
    media_url: Optional[str] = None
    sources: Optional[str] = None
    allow_latex: bool = False
    blackbox_description: Optional[str] = None
    answer_requirements: Optional[str] = None

class QuestionResponse(QuestionBase):
    id: int
    author_id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    answer_options: List[AnswerOptionResponse] = []
    answer_type: Optional[AnswerTypeResponse] = None  # Добавляем информацию о типе ответа
    
    class Config:
        from_attributes = True

# Test Access schemas
class TestAccessBase(BaseModel):
    user_id: int
    access_level: str

class TestAccessCreate(TestAccessBase):
    pass

class TestAccessResponse(TestAccessBase):
    id: int
    granted_by: Optional[int]
    granted_at: datetime
    
    class Config:
        from_attributes = True

# Test schemas
class TestQuestionBase(BaseModel):
    question_id: int
    points: int = 1
    sort_order: int = 0

class TestQuestionCreate(TestQuestionBase):
    pass

class TestQuestionWithQuestion(BaseModel):
    question_id: int
    sort_order: int = 0
    points: int = 1
    question: Optional[QuestionResponse] = None
    
    class Config:
        from_attributes = True

class TestBase(BaseModel):
    title: str
    description: Optional[str] = None
    time_limit: Optional[int] = None
    max_attempts: int = 1
    show_results: str = 'after_completion'
    shuffle_questions: bool = False
    shuffle_answers: bool = False
    passing_score: Optional[int] = None
    is_public: bool = False

class TestCreate(TestBase):
    questions: List[TestQuestionCreate] = []

class TestResponse(TestBase):
    id: int
    author_id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    questions: List[TestQuestionWithQuestion] = []
    user_access_level: Optional[str] = None
    
    class Config:
        from_attributes = True

class StudyGroupBase(BaseModel):
    name: str
    description: Optional[str] = None
    subject: Optional[str] = None
    academic_year: Optional[str] = None
    max_students: int = 30
    # ДОБАВЛЯЕМ ТОЛЬКО ЭТО:
    is_public: bool = True  # True = открытая, False = закрытая (по паролю)
    password: Optional[str] = None  # пароль для закрытых групп (null для открытых)
    require_approval: bool = False  # нужно ли одобрение

class StudyGroupCreate(StudyGroupBase):
    pass




class StudyGroupResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    subject: Optional[str] = None
    academic_year: Optional[str] = None
    max_students: Optional[int] = 30
    is_public: Optional[bool] = True
    password: Optional[str] = None
    require_approval: Optional[bool] = False
    invite_code: str
    created_by: int
    is_active: bool
    created_at: datetime
    # ВАЖНО: Эти поля должны быть в схеме!
    members_count: Optional[int] = None
    user_role: Optional[str] = None
    
    class Config:
        from_attributes = True
# В schemas.py
class StudyGroupWithDetailsResponse(StudyGroupResponse):
    """Схема с дополнительными полями для моих групп"""
    members_count: int
    user_role: str
    
    class Config:
        from_attributes = True
# Новая схема для вступления в группу
class GroupJoinRequest(BaseModel):
    group_id: Optional[int] = None
    invite_code: Optional[str] = None
    password: Optional[str] = None

# Test Session schemas
class UserAnswerBase(BaseModel):
    question_id: int
    answer_text: Optional[str] = None
    selected_options: Optional[str] = None
    time_spent: int

class UserAnswerCreate(UserAnswerBase):
    pass

class UserAnswerResponse(UserAnswerBase):
    id: int
    is_correct: bool
    points_earned: int
    answered_at: datetime
    
    class Config:
        from_attributes = True

class TestSessionBase(BaseModel):
    test_id: int
    assignment_id: Optional[int] = None

class TestSessionCreate(TestSessionBase):
    pass

class TestSessionResponse(TestSessionBase):
    id: int
    user_id: int
    started_at: datetime
    finished_at: Optional[datetime]
    time_spent: Optional[int]
    score: int
    max_score: int
    percentage: int
    is_completed: bool
    attempt_number: int
    user_answers: List[UserAnswerResponse] = []
    
    class Config:
        from_attributes = True

# Statistics schemas
class UserStatisticsResponse(BaseModel):
    category_id: int
    tests_completed: int
    questions_answered: int
    correct_answers: int
    total_points: int
    average_score: float
    best_score: int
    
    class Config:
        from_attributes = True