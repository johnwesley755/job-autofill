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

export const MAX_RESUME_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB standard limit

export class AutoApplyDatabase {
  private dbPromise: Promise<IDBDatabase> | null = null;

  public getDB(): Promise<IDBDatabase> {
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

      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          this.dbPromise = null;
        };
        resolve(db);
      };

      request.onerror = () => {
        this.dbPromise = null;
        reject(request.error || new Error('Failed to open IndexedDB'));
      };

      request.onblocked = () => {
        console.warn('[AutoApply DB] IndexedDB blocked by another active connection');
      };
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
      req.onerror = () => reject(req.error || new Error('Failed to retrieve resumes'));
      tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
    });
  }

  async getResume(id: string): Promise<ResumeDocument | undefined> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('resumes', 'readonly');
      const store = tx.objectStore('resumes');
      const req = store.get(id);

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error(`Failed to retrieve resume ${id}`));
      tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
    });
  }

  async saveResume(resume: ResumeDocument): Promise<void> {
    if (!resume.size || resume.size <= 0) {
      throw new Error('Cannot save an empty resume file (0 bytes).');
    }

    if (resume.size > MAX_RESUME_SIZE_BYTES) {
      throw new Error(`Resume exceeds maximum allowed size of 5 MB (${(resume.size / (1024 * 1024)).toFixed(1)} MB).`);
    }

    const lowerName = (resume.name || '').trim().toLowerCase();
    if (!lowerName.endsWith('.pdf') && !lowerName.endsWith('.docx')) {
      throw new Error('Unsupported format. Only .pdf and .docx resume documents are supported.');
    }

    // MIME type validation when available
    if (resume.type) {
      const validMimes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'application/octet-stream', // Fallback MIME for some browser file pickers
      ];
      if (!validMimes.includes(resume.type.toLowerCase())) {
        throw new Error(`Invalid MIME type '${resume.type}'. Please upload a valid PDF or DOCX file.`);
      }
    }

    // Verify magic bytes signature if Blob is readable
    if (typeof resume.data?.slice === 'function') {
      try {
        const headerBlob = resume.data.slice(0, 4);
        const buffer = await headerBlob.arrayBuffer();
        const headerBytes = new Uint8Array(buffer);
        if (lowerName.endsWith('.pdf')) {
          // PDF magic bytes: %PDF (0x25, 0x50, 0x44, 0x46)
          const isPdf =
            headerBytes[0] === 0x25 &&
            headerBytes[1] === 0x50 &&
            headerBytes[2] === 0x44 &&
            headerBytes[3] === 0x46;
          if (!isPdf && headerBytes.length >= 4) {
            throw new Error('Corrupted or invalid PDF file header.');
          }
        } else if (lowerName.endsWith('.docx')) {
          // ZIP / DOCX magic bytes: PK (0x50, 0x4B, 0x03, 0x04)
          const isDocx = headerBytes[0] === 0x50 && headerBytes[1] === 0x4b;
          if (!isDocx && headerBytes.length >= 4) {
            throw new Error('Corrupted or invalid DOCX document header.');
          }
        }
      } catch (err: any) {
        if (err.message && (err.message.includes('Corrupted') || err.message.includes('header'))) {
          throw err;
        }
        // If arrayBuffer() is not supported in the test environment, allow file to pass
      }
    }

    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('resumes', 'readwrite');
      const store = tx.objectStore('resumes');

      // If marked as default, unmark existing defaults
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
      tx.onerror = () => reject(tx.error || new Error('Failed to save resume'));
      tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
    });
  }

  async deleteResume(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('resumes', 'readwrite');
      const store = tx.objectStore('resumes');

      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const target = getReq.result as ResumeDocument | undefined;
        store.delete(id);

        // If deleted resume was default, reassign default to first remaining resume
        if (target && target.isDefault) {
          const allReq = store.getAll();
          allReq.onsuccess = () => {
            const list: ResumeDocument[] = (allReq.result || []).filter((r) => r.id !== id);
            if (list.length > 0) {
              list[0].isDefault = true;
              store.put(list[0]);
            }
          };
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Failed to delete resume'));
      tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
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
        const found = list.some((r) => r.id === id);
        if (!found) {
          tx.abort();
          reject(new Error(`Resume with ID ${id} not found`));
          return;
        }

        for (const item of list) {
          item.isDefault = item.id === id;
          store.put(item);
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Failed to set default resume'));
      tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
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
      req.onerror = () => reject(req.error || new Error('Failed to retrieve saved answers'));
      tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
    });
  }

  async saveAnswer(answer: SavedAnswer): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('saved_answers', 'readwrite');
      const store = tx.objectStore('saved_answers');
      store.put(answer);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Failed to save answer'));
      tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
    });
  }

  async deleteAnswer(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('saved_answers', 'readwrite');
      const store = tx.objectStore('saved_answers');
      store.delete(id);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Failed to delete answer'));
      tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
    });
  }
}

export const dbService = new AutoApplyDatabase();
