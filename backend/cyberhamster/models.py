from typing import Optional, Any, Dict
from sqlmodel import SQLModel, Field, Column, JSON
from datetime import datetime

class DAGDefinition(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    description: Optional[str] = None
    json_data: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class Task(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    dag_id: int = Field(foreign_key="dagdefinition.id")
    watch_folder: str
    status: str = Field(default="active") # active, paused
    created_at: datetime = Field(default_factory=datetime.utcnow)

class SystemSettings(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    ffmpeg_path: str = Field(default="ffmpeg")
    imagemagick_path: str = Field(default="magick")
    exiftool_path: str = Field(default="exiftool") # or pyexiv2 if not using CLI
