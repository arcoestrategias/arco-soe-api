type StrategicProjectsDashboardResponse = {
  summary: {
    totalProjects: number;
    avgCompliance: number; // 0..100, promedio de progressProject
    totalBudget: number; // Σ project.budget
    totalExecuted: number; // Σ task.budget (tareas CLO)
  };
  projects: Array<{
    id: string;
    name: string;
    description?: string | null;
    fromAt?: string | null;
    untilAt?: string | null;
    budget: number; // project.budget
    executed: number; // Σ task.budget (CLO)
    tasksClosed: number; // count CLO
    tasksTotal: number; // count total
    compliance: number; // progressProject (0..100)
    objectiveId?: string | null;
    objectiveName?: string | null;
    factorsTotal: number; // count factors
  }>;
};
