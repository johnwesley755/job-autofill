/**
 * IndexedDB Repository for Resumes and Saved Answers
 * Database Name: autoapply_db
 * Stores:
 *  - resumes: { id, name, size, type, isDefault, uploadedAt, data: Blob / ArrayBuffer }
 *  - saved_answers: { id, questionText, normalizedKey, answer, category, tags, updatedAt }
 */

export interface ResumeDocument {
  id: string;
  name: string;
  size: number;
  type: string; // 'application/pdf' | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  isDefault: boolean;
  uploadedAt: string;
  targetRole?: string;
  data: Blob;
}

export interface SavedAnswer {
  id: string;
  questionText: string;
  normalizedKey: string;
  answer: string;
  category: 'general' | 'diversity' | 'legal' | 'technical' | 'custom';
  tags: string[];
  updatedAt: string;
}

const DB_NAME = 'autoapply_db';
const DB_VERSION = 1;

class AutoApplyDatabase {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB is not supported in this environment'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('resumes')) {
          const resumeStore = db.createObjectStore('resumes', { keyPath: 'id' });
          resumeStore.createIndex('isDefault', 'isDefault', { unique: false });
          resumeStore.createIndex('uploadedAt', 'uploadedAt', { unique: false });
        }
        if (!db.objectStoreNames.contains('saved_answers')) {
          const answerStore = db.createObjectStore('saved_answers', { keyPath: 'id' });
          answerStore.createIndex('normalizedKey', 'normalizedKey', { unique: false });
          answerStore.createIndex('category', 'category', { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  // --- Resume Methods ---
  async getAllResumes(): Promise<ResumeDocument[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('resumes', 'readonly');
      const store = tx.objectStore('resumes');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async getResume(id: string): Promise<ResumeDocument | undefined> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('resumes', 'readonly');
      const store = tx.objectStore('resumes');
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async saveResume(resume: ResumeDocument): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('resumes', 'readwrite');
      const store = tx.objectStore('resumes');

      // If marked as default, unmark others
      if (resume.isDefault) {
        const allReq = store.getAll();
        allReq.onsuccess = () => {
          const list: ResumeDocument[] = allReq.result || [];
          for (const item of list) {
            if (item.id !== resume.id && item.isDefault) {
              item.isDefault = false;
              store.put(item);
            }
          }
          store.put(resume);
        };
      } else {
        store.put(resume);
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async deleteResume(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('resumes', 'readwrite');
      const store = tx.objectStore('resumes');
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async setDefaultResume(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('resumes', 'readwrite');
      const store = tx.objectStore('resumes');
      const allReq = store.getAll();
      allReq.onsuccess = () => {
        const list: ResumeDocument[] = allReq.result || [];
        for (const item of list) {
          item.isDefault = item.id === id;
          store.put(item);
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // --- Saved Answers Methods ---
  async getAllAnswers(): Promise<SavedAnswer[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('saved_answers', 'readonly');
      const store = tx.objectStore('saved_answers');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async saveAnswer(answer: SavedAnswer): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('saved_answers', 'readwrite');
      const store = tx.objectStore('saved_answers');
      store.put(answer);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async deleteAnswer(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('saved_answers', 'readwrite');
      const store = tx.objectStore('saved_answers');
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

export const dbService = new AutoApplyDatabase();
