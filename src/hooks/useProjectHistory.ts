import { useState, useEffect } from 'react';
import { ProjectHistory, ProjectHistoryStorage } from '@/types/projectHistory.types';

const STORAGE_KEY = 'teklif360_project_history';

export const useProjectHistory = () => {
  const [projects, setProjects] = useState<ProjectHistory[]>([]);

  // Load projects from localStorage on mount
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data: ProjectHistoryStorage = JSON.parse(stored);
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error('Error loading project history:', error);
      setProjects([]);
    }
  };

  const saveProject = (project: ProjectHistory) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      let data: ProjectHistoryStorage = {
        projects: [],
        lastUpdated: new Date().toISOString()
      };

      if (stored) {
        data = JSON.parse(stored);
      }

      // Add new project at the beginning (most recent first)
      data.projects = [project, ...data.projects];
      data.lastUpdated = new Date().toISOString();

      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setProjects(data.projects);

      return true;
    } catch (error) {
      console.error('Error saving project:', error);
      return false;
    }
  };

  const deleteProject = (projectId: string) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return false;

      const data: ProjectHistoryStorage = JSON.parse(stored);
      data.projects = data.projects.filter(p => p.id !== projectId);
      data.lastUpdated = new Date().toISOString();

      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setProjects(data.projects);

      return true;
    } catch (error) {
      console.error('Error deleting project:', error);
      return false;
    }
  };

  const deleteAllProjects = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setProjects([]);
      return true;
    } catch (error) {
      console.error('Error deleting all projects:', error);
      return false;
    }
  };

  const getProject = (projectId: string): ProjectHistory | undefined => {
    return projects.find(p => p.id === projectId);
  };

  return {
    projects,
    saveProject,
    deleteProject,
    deleteAllProjects,
    getProject,
    loadProjects
  };
};
