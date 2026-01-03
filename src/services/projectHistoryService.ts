/**
 * Supabase Project History Service
 * Proje geçmişini cloud'da saklar
 */

import { supabase } from '@/lib/supabase';
import type { ProjectHistory } from '@/types/projectHistory.types';
import type { TenderData } from '@/types/tender.types';

export interface ProjectHistoryDB {
  id: string;
  user_id: string;
  name: string;
  file_name: string;
  created_at: string;
  updated_at: string;
  item_count: number;
  matched_count: number;
  total_amount: number;
  status: 'active' | 'completed' | 'archived';
  data: TenderData[];
}

/**
 * Tüm projeleri getir
 */
export async function getProjects(): Promise<ProjectHistory[]> {
  const { data, error } = await supabase
    .from('project_history')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Projeler yüklenirken hata:', error);
    throw error;
  }

  return (data || []).map(mapDBToProjectHistory);
}

/**
 * Tek bir projeyi getir
 */
export async function getProject(id: string): Promise<ProjectHistory | null> {
  const { data, error } = await supabase
    .from('project_history')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('Proje yüklenirken hata:', error);
    throw error;
  }

  return data ? mapDBToProjectHistory(data) : null;
}

/**
 * Yeni proje oluştur
 */
export async function createProject(
  name: string,
  fileName: string,
  data: TenderData[]
): Promise<ProjectHistory> {
  const { data: userData } = await supabase.auth.getUser();
  
  if (!userData.user) {
    throw new Error('Kullanıcı oturumu bulunamadı');
  }

  const matchedCount = data.filter(item => item.birimFiyat !== undefined).length;
  const totalAmount = data.reduce((sum, item) => sum + (item.tutar || 0), 0);

  const { data: project, error } = await supabase
    .from('project_history')
    .insert({
      user_id: userData.user.id,
      name,
      file_name: fileName,
      item_count: data.length,
      matched_count: matchedCount,
      total_amount: totalAmount,
      status: 'active',
      data
    })
    .select()
    .single();

  if (error) {
    console.error('Proje oluşturulurken hata:', error);
    throw error;
  }

  return mapDBToProjectHistory(project);
}

/**
 * Projeyi güncelle
 */
export async function updateProject(
  id: string,
  updates: Partial<{
    name: string;
    data: TenderData[];
    status: 'active' | 'completed' | 'archived';
  }>
): Promise<ProjectHistory> {
  const updateData: Record<string, unknown> = {};
  
  if (updates.name) updateData.name = updates.name;
  if (updates.status) updateData.status = updates.status;
  
  if (updates.data) {
    updateData.data = updates.data;
    updateData.item_count = updates.data.length;
    updateData.matched_count = updates.data.filter(item => item.birimFiyat !== undefined).length;
    updateData.total_amount = updates.data.reduce((sum, item) => sum + (item.tutar || 0), 0);
  }

  const { data: project, error } = await supabase
    .from('project_history')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Proje güncellenirken hata:', error);
    throw error;
  }

  return mapDBToProjectHistory(project);
}

/**
 * Projeyi sil
 */
export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase
    .from('project_history')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Proje silinirken hata:', error);
    throw error;
  }
}

/**
 * DB formatından frontend formatına dönüştür
 */
function mapDBToProjectHistory(db: ProjectHistoryDB): ProjectHistory {
  return {
    id: db.id,
    name: db.name,
    fileName: db.file_name,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
    itemCount: db.item_count,
    matchedCount: db.matched_count,
    totalAmount: db.total_amount,
    status: db.status,
    data: db.data
  };
}
