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
    sources: Optional[str] = None
    allow_latex: bool = False
    blackbox_description: Optional[str] = None
    correct_answer: Optional[str] = None
    answer_requirements: Optional[str] = None

class QuestionCreate(QuestionBase):
    answer_options: Optional[List[AnswerOptionCreate]] = None
    correct_answer: Optional[str] = None
    media_url: Optional[str] = None
    sources: Optional[str] = None
    allow_latex: bool = False
    blackbox_description: Optional[str] = None
    answer_requirements: Optional[str] = None

# schemas.py - обновляем QuestionResponse

class QuestionResponse(QuestionBase):
    id: int
    author_id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    answer_options: List[AnswerOptionResponse] = []
    answer_type: Optional[AnswerTypeResponse] = None
    answer_type_id: int  # ← Добавляем это поле!
    
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

# Test Question schemas
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

# Test schemas
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

# Study Group schemas
class StudyGroupBase(BaseModel):
    name: str
    description: Optional[str] = None
    subject: Optional[str] = None
    academic_year: Optional[str] = None
    max_students: int = 30
    is_public: bool = True
    password: Optional[str] = None
    require_approval: bool = False

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
    members_count: Optional[int] = None
    user_role: Optional[str] = None
    
    class Config:
        from_attributes = True

class StudyGroupWithDetailsResponse(StudyGroupResponse):
    members_count: int
    user_role: str
    
    class Config:
        from_attributes = True

# Group Join Request
class GroupJoinRequest(BaseModel):
    group_id: Optional[int] = None
    invite_code: Optional[str] = None
    password: Optional[str] = None

# Test Assignment schemas
class TestAssignmentBase(BaseModel):
    test_id: int
    group_id: int
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    time_limit: Optional[int] = None
    max_attempts: Optional[int] = None
    passing_score: Optional[int] = None

class TestAssignmentCreate(TestAssignmentBase):
    pass

class TestAssignmentResponse(TestAssignmentBase):
    id: int
    assigned_by: int
    is_active: bool
    created_at: str
    
    class Config:
        from_attributes = True

# Test Session schemas
class UserAnswerBase(BaseModel):
    question_id: int
    answer_text: Optional[str] = None
    selected_options: Optional[str] = None
    time_spent: int

class UserAnswerCreate(UserAnswerBase):
    test_id: Optional[int] = None  # Добавьте это поле
    
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

# Category schemas
class CategoryResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    
    class Config:
        from_attributes = True

# Question Type schemas
class QuestionTypeResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    
    class Config:
        from_attributes = True

# Achievement schemas
class AchievementResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    reward_points: int
    
    class Config:
        from_attributes = True

# User Achievement schemas
class UserAchievementResponse(BaseModel):
    id: int
    achievement_id: int
    earned_at: datetime
    progress: int
    achievement: Optional[AchievementResponse] = None
    
    class Config:
        from_attributes = True

# Grading System schemas
class GradingSystemResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    rules: str
    is_default: bool
    
    class Config:
        from_attributes = True


class TestAssignmentUpdate(BaseModel):
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    time_limit: Optional[int] = None
    max_attempts: Optional[int] = None
    passing_score: Optional[int] = None

class ImportQuestionBase(BaseModel):
    question_text: str
    question_type: str = "text"  # text, single_choice, multiple_choice, blackbox
    correct_answer: Optional[str] = None
    options: Optional[List[str]] = None
    correct_options: Optional[List[str]] = None  # Для выбора нескольких вариантов
    category: str = "Общие знания"
    difficulty: int = 1
    points: int = 1
    explanation: Optional[str] = None

class FileImportRequest(BaseModel):
    file_type: str = "excel"  # excel, csv
    category_id: Optional[int] = None
    default_difficulty: int = 1
    default_points: int = 1

class QuestionImportResponse(BaseModel):
    imported_count: int
    failed_count: int
    questions: List[ImportQuestionBase]
    errors: List[str] = []

    class Config:
        from_attributes = True  