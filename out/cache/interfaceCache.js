"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.InterfaceCache = void 0;
const vscode = __importStar(require("vscode"));
class InterfaceCache {
    constructor() {
        this.cache = new Map();
        this.disposables = [];
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
    get(filePath) {
        const cached = this.cache.get(filePath);
        if (!cached)
            return null;
        // Check if file has been modified
        try {
            const stats = require('fs').statSync(filePath);
            if (stats.mtimeMs > cached.lastModified) {
                this.cache.delete(filePath);
                return null;
            }
        }
        catch {
            this.cache.delete(filePath);
            return null;
        }
        return cached.data;
    }
    set(filePath, data) {
        try {
            const stats = require('fs').statSync(filePath);
            this.cache.set(filePath, {
                data,
                lastModified: stats.mtimeMs
            });
        }
        catch {
            // If we can't get file stats, don't cache
        }
    }
    invalidate(filePath) {
        this.cache.delete(filePath);
    }
    clear() {
        this.cache.clear();
    }
    dispose() {
        this.disposables.forEach(d => d.dispose());
    }
}
exports.InterfaceCache = InterfaceCache;
//# sourceMappingURL=interfaceCache.js.map