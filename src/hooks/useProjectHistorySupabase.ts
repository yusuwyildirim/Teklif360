/**
 * useProjectHistory Hook - Supabase ile proje geçmişi yönetimi
 */

import { useState, useEffect, useCallback } from 'react';
import { ProjectHistory } from '@/types/projectHistory.types';
import { TenderData } from '@/types/tender.types';
import { useAuth } from '@/contexts/AuthContext';
import * as projectService from '@/services/projectHistoryService';

export const useProjectHistory = () => {
  const [projects, setProjects] = useState<ProjectHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Projeleri yükle
  const loadProjects = useCallback(async () => {
    if (!user) {
      setProjects([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await projectService.getProjects();
      setProjects(data);
    } catch (err) {
      console.error('Projeler yüklenirken hata:', err);
      setError('Projeler yüklenemedi');
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Kullanıcı değişince projeleri yükle
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Yeni proje kaydet
  const saveProject = async (
    name: string,
    fileName: string,
    data: TenderData[]
  ): Promise<ProjectHistory | null> => {
    if (!user) {
      setError('Oturum açmanız gerekiyor');
      return null;
    }

    try {
      setError(null);
      const project = await projectService.createProject(name, fileName, data);
      setProjects(prev => [project, ...prev]);
      return project;
    } catch (err) {
      console.error('Proje kaydedilirken hata:', err);
      setError('Proje kaydedilemedi');
      return null;
    }
  };

  // Projeyi güncelle
  const updateProject = async (
    id: string,
    updates: Partial<{
      name: string;
      data: TenderData[];
      status: 'active' | 'completed' | 'archived';
    }>
  ): Promise<boolean> => {
    try {
      setError(null);
      const updated = await projectService.updateProject(id, updates);
      setProjects(prev => prev.map(p => p.id === id ? updated : p));
      return true;
    } catch (err) {
      console.error('Proje güncellenirken hata:', err);
      setError('Proje güncellenemedi');
      return false;
    }
  };

  // Projeyi sil
  const deleteProject = async (projectId: string): Promise<boolean> => {
    try {
      setError(null);
      await projectService.deleteProject(projectId);
      setProjects(prev => prev.filter(p => p.id !== projectId));
      return true;
    } catch (err) {
      console.error('Proje silinirken hata:', err);
      setError('Proje silinemedi');
      return false;
    }
  };

  // Tüm projeleri sil
  const deleteAllProjects = async (): Promise<boolean> => {
    try {
      setError(null);
      for (const project of projects) {
        await projectService.deleteProject(project.id);
      }
      setProjects([]);
      return true;
    } catch (err) {
      console.error('Projeler silinirken hata:', err);
      setError('Projeler silinemedi');
      return false;
    }
  };

  // Tek bir projeyi getir
  const getProject = (projectId: string): ProjectHistory | undefined => {
    return projects.find(p => p.id === projectId);
  };

  // Projeyi async olarak getir
  const fetchProject = async (projectId: string): Promise<ProjectHistory | null> => {
    try {
      return await projectService.getProject(projectId);
    } catch (err) {
      console.error('Proje yüklenirken hata:', err);
      return null;
    }
  };

  return {
    projects,
    loading,
    error,
    saveProject,
    updateProject,
    deleteProject,
    deleteAllProjects,
    getProject,
    fetchProject,
    loadProjects
  };
};
