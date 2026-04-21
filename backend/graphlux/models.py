from typing import Optional, Any, Dict, List
from pydantic import BaseModel
from sqlmodel import SQLModel, Field, Column, JSON, Relationship
from datetime import datetime

class FolderTaskLink(SQLModel, table=True):
    folder_id: Optional[int] = Field(default=None, foreign_key="folder.id", primary_key=True)
    task_id: Optional[int] = Field(default=None, foreign_key="task.id", primary_key=True)

class ExecutionRecord(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    task_id: int = Field(foreign_key="task.id")
    folder_id: Optional[int] = Field(default=None, foreign_key="folder.id", nullable=True)
    start_time: datetime = Field(default_factory=datetime.utcnow)
    end_time: Optional[datetime] = None
    status: str = Field(default="running") # running, success, failed
    input_path: str
    input_size: int
    output_path: Optional[str] = None
    output_size: Optional[int] = None
    error_message: Optional[str] = None

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

class SettingsConfig(BaseModel):
    """
    All configuration items are defined here.
    Add new settings here with default values to extend without DB migration.
    """
    ffmpeg_path: str = "ffmpeg"
    imagemagick_path: str = "magick"
    max_concurrent_tasks: int = 4
    auto_start: bool = False
    theme: str = "system"

class SettingsResponse(SettingsConfig):
    id: int = 1

class SystemSettings(SQLModel, table=True):
    """
    System settings persistence model.
    Uses a single JSON field to store all configurations.
    """
    id: Optional[int] = Field(default=1, primary_key=True)
    # Store all config in a single JSON column
    value: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))

    def to_dict(self) -> Dict[str, Any]:
        """Convert to a flat dictionary for API response."""
        config = self._get_config().model_dump()
        config["id"] = self.id
        return config

    def _get_config(self) -> SettingsConfig:
        return SettingsConfig(**(self.value or {}))

    def _update_value(self, key: str, val: Any):
        """Update value dict and ensure SQLAlchemy detects the change."""
        new_value = dict(self.value or {})
        new_value[key] = val
        self.value = new_value

    @property
    def ffmpeg_path(self) -> str:
        return self._get_config().ffmpeg_path

    @ffmpeg_path.setter
    def ffmpeg_path(self, val: str):
        self._update_value("ffmpeg_path", val)

    @property
    def imagemagick_path(self) -> str:
        return self._get_config().imagemagick_path

    @imagemagick_path.setter
    def imagemagick_path(self, val: str):
        self._update_value("imagemagick_path", val)

    @property
    def max_concurrent_tasks(self) -> int:
        return self._get_config().max_concurrent_tasks

    @max_concurrent_tasks.setter
    def max_concurrent_tasks(self, val: int):
        self._update_value("max_concurrent_tasks", val)

    @property
    def auto_start(self) -> bool:
        return self._get_config().auto_start

    @auto_start.setter
    def auto_start(self, val: bool):
        self._update_value("auto_start", val)

    @property
    def theme(self) -> str:
        return self._get_config().theme

    @theme.setter
    def theme(self, val: str):
        self._update_value("theme", val)

