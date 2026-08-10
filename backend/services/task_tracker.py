import threading
from typing import Dict, List, Optional, Any

class TaskTracker:
    def __init__(self):
        self._tasks: Dict[str, Dict[str, Any]] = {}
        self._lock = threading.Lock()

    def create_task(self, task_id: str, total_items: int = 0, status: str = "pending") -> Dict[str, Any]:
        """
        Crea un nuevo registro de tarea en memoria.
        """
        with self._lock:
            task_data = {
                "status": status,
                "total_items": total_items,
                "processed_items": 0,
                "percentage": 0.0,
                "errors": []
            }
            self._tasks[task_id] = task_data
            return task_data

    def get_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        """
        Devuelve la información de la tarea si existe.
        """
        with self._lock:
            task = self._tasks.get(task_id)
            if task is not None:
                return task.copy()
            return None

    def update_task(
        self,
        task_id: str,
        status: Optional[str] = None,
        processed_items: Optional[int] = None,
        total_items: Optional[int] = None,
        errors: Optional[List[str]] = None,
        add_errors: Optional[List[str]] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Actualiza el estado de la tarea existente de forma segura.
        Calcula el porcentaje automáticamente si varían los ítems.
        """
        with self._lock:
            if task_id not in self._tasks:
                return None
            
            task = self._tasks[task_id]
            
            if status is not None:
                task["status"] = status
                
            if total_items is not None:
                task["total_items"] = total_items
                
            if processed_items is not None:
                task["processed_items"] = processed_items
                
            if errors is not None:
                task["errors"] = list(errors)
            elif add_errors is not None:
                task["errors"].extend(add_errors)

            # Recalcular porcentaje
            total = task["total_items"]
            processed = task["processed_items"]
            if total > 0:
                task["percentage"] = round((processed / total) * 100, 2)
            else:
                task["percentage"] = 0.0
                
            return task.copy()

    def delete_task(self, task_id: str) -> bool:
        """
        Elimina la tarea del registro de forma segura.
        """
        with self._lock:
            if task_id in self._tasks:
                del self._tasks[task_id]
                return True
            return False

# Singleton para uso compartido en la aplicación
task_tracker = TaskTracker()
