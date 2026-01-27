from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class Role(Base):
    __tablename__ = "roles"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(String(255))
    permissions = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    users = relationship("User", back_populates="role")

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(100), unique=True)
    password_hash = Column(String(255), nullable=False)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)
    avatar_url = Column(String(255))
    first_name = Column(String(100))
    last_name = Column(String(100))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login = Column(DateTime(timezone=True))
    is_active = Column(Boolean, default=True)
    
    role = relationship("Role", back_populates="users")
    created_tests = relationship("Test", back_populates="author")
    test_sessions = relationship("TestSession", back_populates="user")
    groups_created = relationship("StudyGroup", back_populates="creator")
    group_memberships = relationship("GroupMember", back_populates="user")
    test_access_rights = relationship("TestAccess", 
                                    foreign_keys="[TestAccess.user_id]",
                                    back_populates="user")

class TestAccess(Base):
    __tablename__ = "test_access"
    
    id = Column(Integer, primary_key=True, index=True)
    test_id = Column(Integer, ForeignKey("tests.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    access_level = Column(String(20), nullable=False)
    granted_by = Column(Integer, ForeignKey("users.id"))
    granted_at = Column(DateTime(timezone=True), server_default=func.now())
    
    test = relationship("Test", back_populates="access_rights")
    user = relationship("User", 
                       foreign_keys=[user_id],
                       back_populates="test_access_rights")
    granter = relationship("User", 
                          foreign_keys=[granted_by])

class StudyGroup(Base):
    __tablename__ = "study_groups"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    invite_code = Column(String(20), unique=True, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    subject = Column(String(100))
    academic_year = Column(String(20))
    max_students = Column(Integer, default=30)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # ВОТ И ВСЕ ДОПОЛНИТЕЛЬНЫЕ ПОЛЯ (только 3!):
    is_public = Column(Boolean, default=True)  # открытая или закрытая
    password = Column(String(255))  # пароль для закрытых
    require_approval = Column(Boolean, default=False)  # нужно одобрение
    
    creator = relationship("User", back_populates="groups_created")
    members = relationship("GroupMember", back_populates="group")
    test_assignments = relationship("TestAssignment", back_populates="group")

class GroupMember(Base):
    __tablename__ = "group_members"
    
    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("study_groups.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    joined_at = Column(DateTime(timezone=True), server_default=func.now())
    role = Column(String(20), default='student')
    is_active = Column(Boolean, default=True)
    
    group = relationship("StudyGroup", back_populates="members")
    user = relationship("User", back_populates="group_memberships")

class Category(Base):
    __tablename__ = "categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(String(255))
    color = Column(String(7))
    icon = Column(String(100))
    parent_id = Column(Integer, ForeignKey("categories.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    questions = relationship("Question", back_populates="category")
    statistics = relationship("UserStatistics", back_populates="category")

class QuestionType(Base):
    __tablename__ = "question_types"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(String(255))
    template = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    questions = relationship("Question", back_populates="type")

class AnswerType(Base):
    __tablename__ = "answer_types"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(String(255))
    template = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    questions = relationship("Question", back_populates="answer_type")

class Question(Base):
    __tablename__ = "questions"
    
    id = Column(Integer, primary_key=True, index=True)
    question_text = Column(Text, nullable=False)
    type_id = Column(Integer, ForeignKey("question_types.id"), nullable=False)
    answer_type_id = Column(Integer, ForeignKey("answer_types.id"), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    difficulty = Column(Integer, default=1)
    explanation = Column(Text)
    time_limit = Column(Integer, default=60)
    points = Column(Integer, default=1)
    media_url = Column(Text)  # уже есть
    sources = Column(Text)  # добавим поле для источников
    allow_latex = Column(Boolean, default=False)  # поддержка LaTeX
    blackbox_description = Column(Text)
    correct_answer = Column(Text)
    answer_requirements = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    type = relationship("QuestionType", back_populates="questions")
    answer_type = relationship("AnswerType", lazy="joined")  # Добавляем lazy="joined" для автоматической загрузки
    category = relationship("Category", back_populates="questions")
    author = relationship("User")
    answer_options = relationship("AnswerOption", back_populates="question", cascade="all, delete-orphan")
    test_questions = relationship("TestQuestion", back_populates="question")
    user_answers = relationship("UserAnswer", back_populates="question")
    
class AnswerOption(Base):
    __tablename__ = "answer_options"
    
    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    option_text = Column(Text, nullable=False)
    is_correct = Column(Boolean, default=False)
    sort_order = Column(Integer, default=0)
    
    question = relationship("Question", back_populates="answer_options")

class Test(Base):
    __tablename__ = "tests"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    time_limit = Column(Integer)
    max_attempts = Column(Integer, default=1)
    show_results = Column(String(20), default='after_completion')
    shuffle_questions = Column(Boolean, default=False)
    shuffle_answers = Column(Boolean, default=False)
    passing_score = Column(Integer)
    is_active = Column(Boolean, default=True)
    is_public = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    author = relationship("User", back_populates="created_tests")
    questions = relationship("TestQuestion", back_populates="test")
    assignments = relationship("TestAssignment", back_populates="test")
    sessions = relationship("TestSession", back_populates="test")
    access_rights = relationship("TestAccess", back_populates="test")

class TestQuestion(Base):
    __tablename__ = "test_questions"
    
    id = Column(Integer, primary_key=True, index=True)
    test_id = Column(Integer, ForeignKey("tests.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    sort_order = Column(Integer, default=0)
    points = Column(Integer, default=1)
    
    test = relationship("Test", back_populates="questions")
    question = relationship("Question", back_populates="test_questions")

class TestAssignment(Base):
    __tablename__ = "test_assignments"
    
    id = Column(Integer, primary_key=True, index=True)
    test_id = Column(Integer, ForeignKey("tests.id"), nullable=False)
    group_id = Column(Integer, ForeignKey("study_groups.id"))
    assigned_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    start_date = Column(DateTime(timezone=True))
    end_date = Column(DateTime(timezone=True))
    time_limit = Column(Integer)
    max_attempts = Column(Integer, default=1)
    passing_score = Column(Integer)
    settings = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    test = relationship("Test", back_populates="assignments")
    group = relationship("StudyGroup", back_populates="test_assignments")
    assigner = relationship("User")
    sessions = relationship("TestSession", back_populates="assignment")

class TestSession(Base):
    __tablename__ = "test_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    test_id = Column(Integer, ForeignKey("tests.id"), nullable=False)
    assignment_id = Column(Integer, ForeignKey("test_assignments.id"))
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    finished_at = Column(DateTime(timezone=True))
    time_spent = Column(Integer)
    score = Column(Integer, default=0)
    max_score = Column(Integer, default=0)
    percentage = Column(Integer, default=0)
    is_completed = Column(Boolean, default=False)
    attempt_number = Column(Integer, default=1)
    
    user = relationship("User", back_populates="test_sessions")
    test = relationship("Test", back_populates="sessions")
    assignment = relationship("TestAssignment", back_populates="sessions")
    user_answers = relationship("UserAnswer", back_populates="session")

class UserAnswer(Base):
    __tablename__ = "user_answers"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("test_sessions.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    answer_text = Column(Text)
    selected_options = Column(Text)
    is_correct = Column(Boolean)
    points_earned = Column(Integer, default=0)
    time_spent = Column(Integer)
    answered_at = Column(DateTime(timezone=True), server_default=func.now())
    
    session = relationship("TestSession", back_populates="user_answers")
    question = relationship("Question", back_populates="user_answers")

class UserStatistics(Base):
    __tablename__ = "user_statistics"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    tests_completed = Column(Integer, default=0)
    questions_answered = Column(Integer, default=0)
    correct_answers = Column(Integer, default=0)
    total_points = Column(Integer, default=0)
    average_score = Column(Float, default=0)
    best_score = Column(Integer, default=0)
    last_activity = Column(DateTime(timezone=True))
    
    user = relationship("User")
    category = relationship("Category", back_populates="statistics")


