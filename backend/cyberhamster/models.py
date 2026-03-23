from typing import Optional, Any, Dict
from sqlmodel import SQLModel, Field, Column, JSON
from datetime import datetime

class Task(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    description: Optional[str] = None
    icon: str = Field(default="📁")
    json_data: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class Folder(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    task_id: int = Field(foreign_key="task.id")
    watch_folder: str
    status: str = Field(default="active") # active, paused
    scan_interval: int = Field(default=60)
    real_time_watch: bool = Field(default=True)
    filename_regex: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class SystemSettings(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    ffmpeg_path: str = Field(default="ffmpeg")
    imagemagick_path: str = Field(default="magick")
    max_concurrent_tasks: int = Field(default=4)
