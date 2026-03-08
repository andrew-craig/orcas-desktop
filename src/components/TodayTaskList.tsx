import { useState } from 'react';
import type { Task, Space } from '../types';
import { updateTaskStatus, createTask } from '../api';
import TodoItem from './TodoItem';

interface TodayTaskListProps {
  tasks: Task[];
  spaces: Space[];
  onRefresh: () => void;
  onTaskClick?: (taskId: number) => void;
}

export default function TodayTaskList({ tasks, spaces, onRefresh, onTaskClick }: TodayTaskListProps) {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);

  // Group tasks by space
  const spaceMap = new Map<number, Space>();
  for (const space of spaces) {
    spaceMap.set(space.id, space);
  }

  const tasksBySpace = new Map<number, Task[]>();
  for (const task of tasks) {
    const existing = tasksBySpace.get(task.space_id) || [];
    existing.push(task);
    tasksBySpace.set(task.space_id, existing);
  }

  const handleToggleTask = async (task: Task, checked: boolean) => {
    const newStatus = checked ? 'done' : 'todo';
    try {
      await updateTaskStatus(task.id, newStatus);
      onRefresh();
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;
    const targetSpaceId = spaces.length > 0 ? spaces[0].id : null;
    if (!targetSpaceId) return;

    try {
      await createTask({
        space_id: targetSpaceId,
        title: newTaskTitle.trim(),
        status: 'todo',
        priority: 'medium',
      });
      setNewTaskTitle('');
      setIsAddingTask(false);
      onRefresh();
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  const handleNewTaskKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAddTask();
    } else if (e.key === 'Escape') {
      setNewTaskTitle('');
      setIsAddingTask(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {/* Add New Task Row */}
      {isAddingTask ? (
        <div className="todo-item todo-item--new">
          <svg className="todo-item-plus" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          <input
            autoFocus
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={handleNewTaskKeyDown}
            onBlur={() => {
              if (!newTaskTitle.trim()) {
                setIsAddingTask(false);
              } else {
                handleAddTask();
              }
            }}
            placeholder="Task title..."
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: 'var(--font-body-size)',
              fontFamily: "'IBM Plex Sans', sans-serif",
              color: 'var(--color-text-primary)',
              backgroundColor: 'transparent',
            }}
          />
        </div>
      ) : (
        <TodoItem variant="new" text="Add a new task" onAddNew={() => setIsAddingTask(true)} />
      )}

      {/* Tasks Grouped by Space */}
      {Array.from(tasksBySpace.entries()).map(([spaceId, spaceTasks]) => {
        const space = spaceMap.get(spaceId);
        const spaceName = space?.title || 'Unknown Space';

        return (
          <div key={spaceId} style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '4px 0' }}>
            <TodoItem variant="project-header" text={spaceName} />
            {spaceTasks.map(task => (
              <TodoItem
                key={task.id}
                text={task.title}
                checked={task.status === 'done'}
                onCheck={(checked) => handleToggleTask(task, checked)}
                onClick={() => onTaskClick?.(task.id)}
              />
            ))}
          </div>
        );
      })}

      {/* Empty state */}
      {tasks.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-text-secondary)' }}>
          <div style={{ marginBottom: '8px', fontSize: 'var(--font-body-size)' }}>
            No tasks for today
          </div>
          <div style={{ fontSize: '14px' }}>
            Schedule a task or start working on something!
          </div>
        </div>
      )}
    </div>
  );
}
