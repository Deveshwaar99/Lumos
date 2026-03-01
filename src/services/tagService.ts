import { getDatabase } from '../db/database';
import { Tag } from '../models/types';
import { generateId } from '../utils/uuid';

const TAG_COLORS = [
  '#FF7043', '#42A5F5', '#AB47BC', '#26A69A', '#EC407A',
  '#FFA726', '#78909C', '#5C6BC0', '#9CCC65', '#EF5350',
];

function mapRow(row: any): Tag {
  return { id: row.id, name: row.name, color: row.color };
}

export const tagService = {
  async getAll(): Promise<Tag[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>('SELECT * FROM tags ORDER BY name');
    return rows.map(mapRow);
  },

  async create(name: string, color?: string): Promise<Tag> {
    const db = await getDatabase();
    const id = generateId();
    const tagColor = color ?? TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];
    await db.runAsync(
      'INSERT INTO tags (id, name, color) VALUES (?, ?, ?)',
      id, name.trim(), tagColor,
    );
    return { id, name: name.trim(), color: tagColor };
  },

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM transaction_tags WHERE tag_id = ?', id);
    await db.runAsync('DELETE FROM tags WHERE id = ?', id);
  },

  async setTransactionTags(transactionId: string, tagIds: string[]): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM transaction_tags WHERE transaction_id = ?', transactionId);
    for (const tagId of tagIds) {
      await db.runAsync(
        'INSERT OR IGNORE INTO transaction_tags (transaction_id, tag_id) VALUES (?, ?)',
        transactionId, tagId,
      );
    }
  },

  async getTagsForTransaction(transactionId: string): Promise<Tag[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT t.* FROM tags t
       JOIN transaction_tags tt ON t.id = tt.tag_id
       WHERE tt.transaction_id = ?
       ORDER BY t.name`,
      transactionId,
    );
    return rows.map(mapRow);
  },

  async getTagsForTransactions(transactionIds: string[]): Promise<Map<string, Tag[]>> {
    if (transactionIds.length === 0) return new Map();
    const db = await getDatabase();
    const placeholders = transactionIds.map(() => '?').join(',');
    const rows = await db.getAllAsync<any>(
      `SELECT tt.transaction_id, t.id, t.name, t.color
       FROM transaction_tags tt
       JOIN tags t ON t.id = tt.tag_id
       WHERE tt.transaction_id IN (${placeholders})`,
      ...transactionIds,
    );
    const map = new Map<string, Tag[]>();
    for (const row of rows) {
      const tag = { id: row.id, name: row.name, color: row.color };
      const existing = map.get(row.transaction_id) ?? [];
      existing.push(tag);
      map.set(row.transaction_id, existing);
    }
    return map;
  },
};
