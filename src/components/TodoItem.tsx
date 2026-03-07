interface TodoItemProps {
  variant?: "default" | "new" | "project-header";
  text: string;
  checked?: boolean;
  onCheck?: (checked: boolean) => void;
  onClick?: () => void;
  onAddNew?: () => void;
}

function TodoItem({
  variant = "default",
  text,
  checked = false,
  onCheck,
  onClick,
  onAddNew,
}: TodoItemProps) {
  if (variant === "project-header") {
    return (
      <div className="todo-item todo-item--header" onClick={onClick}>
        <span className="todo-item-text">{text}</span>
      </div>
    );
  }

  if (variant === "new") {
    return (
      <div className="todo-item todo-item--new" onClick={onAddNew}>
        <svg className="todo-item-plus" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
        <span className="todo-item-text">{text}</span>
      </div>
    );
  }

  return (
    <div className="todo-item" onClick={onClick}>
      <label className="todo-item-checkbox" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onCheck?.(e.target.checked)}
        />
        <span className="todo-item-checkmark" />
      </label>
      <span className={`todo-item-text${checked ? " todo-item-text--checked" : ""}`}>
        {text}
      </span>
    </div>
  );
}

export default TodoItem;
