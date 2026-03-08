import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../api.service';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tasks.html',
  styleUrls: ['./tasks.css']
})
export class TasksComponent implements OnInit {
  tasks: any[] = [];
  dags: any[] = [];

  newTask: any = {
    name: '',
    dag_id: null,
    watch_folder: '',
    status: 'active'
  };

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.loadTasks();
    this.loadDags();
  }

  loadTasks() {
    this.apiService.getTasks().subscribe(tasks => {
      this.tasks = tasks;
    });
  }

  loadDags() {
    this.apiService.getDags().subscribe(dags => {
      this.dags = dags;
    });
  }

  getDagName(id: number): string {
    const dag = this.dags.find(d => d.id === id);
    return dag ? dag.name : 'Unknown';
  }

  createTask() {
    if (!this.newTask.name || !this.newTask.dag_id || !this.newTask.watch_folder) {
      alert("Please fill all required fields");
      return;
    }

    this.apiService.createTask(this.newTask).subscribe(() => {
      this.loadTasks();
      this.newTask = { name: '', dag_id: null, watch_folder: '', status: 'active' };
    });
  }

  deleteTask(id: number) {
    if (confirm("Are you sure you want to delete this task?")) {
      this.apiService.deleteTask(id).subscribe(() => {
        this.loadTasks();
      });
    }
  }

  toggleTaskStatus(task: any) {
    const newStatus = task.status === 'active' ? 'paused' : 'active';
    this.apiService.updateTask(task.id, { ...task, status: newStatus }).subscribe(() => {
      this.loadTasks();
    });
  }
}
