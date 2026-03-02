import { getDatabase } from '../db/database';
import { Category } from '../models/types';
import { generateId } from '../utils/uuid';

function mapRow(row: any): Category {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    icon: row.icon,
    color: row.color,
  };
}

export const categoryService = {
  async getAll(): Promise<Category[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM categories ORDER BY name',
    );
    return rows.map(mapRow);
  },

  async getByType(type: 'income' | 'expense'): Promise<Category[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM categories WHERE type = ? ORDER BY name',
      type,
    );
    return rows.map(mapRow);
  },

  async getById(id: string): Promise<Category | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<any>(
      'SELECT * FROM categories WHERE id = ?',
      id,
    );
    return row ? mapRow(row) : null;
  },

  async create(data: Omit<Category, 'id'>): Promise<Category> {
    const db = await getDatabase();
    const id = generateId();
    await db.runAsync(
      'INSERT INTO categories (id, name, type, icon, color) VALUES (?, ?, ?, ?, ?)',
      id,
      data.name,
      data.type,
      data.icon,
      data.color,
    );
    return { id, ...data };
  },

  async update(id: string, data: Partial<Omit<Category, 'id'>>): Promise<void> {
    const db = await getDatabase();
    const fields: string[] = [];
    const values: any[] = [];
    if (data.name !== undefined) {
      fields.push('name = ?');
      values.push(data.name);
    }
    if (data.type !== undefined) {
      fields.push('type = ?');
      values.push(data.type);
    }
    if (data.icon !== undefined) {
      fields.push('icon = ?');
      values.push(data.icon);
    }
    if (data.color !== undefined) {
      fields.push('color = ?');
      values.push(data.color);
    }
    if (fields.length === 0) return;
    values.push(id);
    await db.runAsync(
      `UPDATE categories SET ${fields.join(', ')} WHERE id = ?`,
      ...values,
    );
  },

  async delete(id: string): Promise<{ success: boolean; message?: string }> {
    const db = await getDatabase();
    const usage = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM transactions WHERE category_id = ?',
      id,
    );
    if (usage && usage.count > 0) {
      return {
        success: false,
        message: `Category is used by ${usage.count} transaction(s). Please reassign them first.`,
      };
    }
    await db.runAsync('DELETE FROM categories WHERE id = ?', id);
    return { success: true };
  },

  async getTransactionCount(id: string): Promise<number> {
    const db = await getDatabase();
    const result = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM transactions WHERE category_id = ?',
      id,
    );
    return result?.count ?? 0;
  },
};
