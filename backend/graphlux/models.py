from typing import Optional, Any, Dict, List
from sqlmodel import SQLModel, Field, Column, JSON, Relationship
from datetime import datetime

class FolderTaskLink(SQLModel, table=True):
    folder_id: Optional[int] = Field(default=None, foreign_key="folder.id", primary_key=True)
    task_id: Optional[int] = Field(default=None, foreign_key="task.id", primary_key=True)

class Task(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    description: Optional[str] = None
    icon: Optional[str] = None
    json_data: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    folders: List["Folder"] = Relationship(back_populates="tasks", link_model=FolderTaskLink)

class Folder(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    watch_folder: str
    status: str = Field(default="active") # active, paused
    scan_interval: int = Field(default=60)
    real_time_watch: bool = Field(default=True)
    filename_regex: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    tasks: List[Task] = Relationship(back_populates="folders", link_model=FolderTaskLink)

class SystemSettings(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    ffmpeg_path: str = Field(default="ffmpeg")
    imagemagick_path: str = Field(default="magick")
    max_concurrent_tasks: int = Field(default=4)
    auto_start: bool = Field(default=False)
    theme: str = Field(default="system")
