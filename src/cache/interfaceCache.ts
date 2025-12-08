import * as vscode from 'vscode';
import { TemplateInterface, PropertyInfo } from '../parsers/types';

export class InterfaceCache {
  private cache = new Map<string, { data: TemplateInterface; lastModified: number }>();
  private disposables: vscode.Disposable[] = [];
  
  constructor() {
    // Watch for file changes to invalidate cache
    const fileWatcher = vscode.workspace.createFileSystemWatcher('**/*.d.ts');
    
    fileWatcher.onDidChange(uri => {
      this.invalidate(uri.fsPath);
    });
    
    fileWatcher.onDidDelete(uri => {
      this.invalidate(uri.fsPath);
    });
    
    this.disposables.push(fileWatcher);
  }
  
  get(filePath: string): TemplateInterface | null {
    const cached = this.cache.get(filePath);
    if (!cached) return null;
    
    // Check if file has been modified
    try {
      const stats = require('fs').statSync(filePath);
      if (stats.mtimeMs > cached.lastModified) {
        this.cache.delete(filePath);
        return null;
      }
    } catch {
      this.cache.delete(filePath);
      return null;
    }
    
    return cached.data;
  }
  
  set(filePath: string, data: TemplateInterface): void {
    try {
      const stats = require('fs').statSync(filePath);
      this.cache.set(filePath, {
        data,
        lastModified: stats.mtimeMs
      });
    } catch {
      // If we can't get file stats, don't cache
    }
  }
  
  invalidate(filePath: string): void {
    this.cache.delete(filePath);
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  dispose(): void {
    this.disposables.forEach(d => d.dispose());
  }
}