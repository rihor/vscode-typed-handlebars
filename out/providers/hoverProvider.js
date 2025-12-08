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
exports.HandlebarsHoverProvider = void 0;
const vscode = __importStar(require("vscode"));
const dtsParser_1 = require("../parsers/dtsParser");
const interfaceCache_1 = require("../cache/interfaceCache");
const fileUtils_1 = require("../utils/fileUtils");
class HandlebarsHoverProvider {
    constructor() {
        this.parser = new dtsParser_1.DtsParser();
        this.cache = new interfaceCache_1.InterfaceCache();
    }
    async provideHover(document, position, token) {
        const config = vscode.workspace.getConfiguration('handlebars.intellisense');
        if (!config.get('enabled')) {
            return null;
        }
        const templateInterface = await this.getTemplateInterface(document);
        if (!templateInterface) {
            return null;
        }
        const wordRange = document.getWordRangeAtPosition(position, /[\w\[\].]+/);
        if (!wordRange) {
            return null;
        }
        const word = document.getText(wordRange);
        const propertyInfo = this.findPropertyInfo(word, templateInterface);
        if (!propertyInfo) {
            return null;
        }
        const markdown = new vscode.MarkdownString();
        markdown.appendCodeblock(`${propertyInfo.name}: ${propertyInfo.type}${propertyInfo.optional ? '?' : ''}`, 'typescript');
        if (propertyInfo.optional) {
            markdown.appendMarkdown('\n\n*Optional property*');
        }
        return new vscode.Hover(markdown, wordRange);
    }
    async getTemplateInterface(document) {
        const dtsPath = (0, fileUtils_1.getDtsPath)(document.uri.fsPath);
        if (!dtsPath)
            return null;
        // Check cache first
        const config = vscode.workspace.getConfiguration('handlebars.intellisense');
        if (config.get('cacheEnabled')) {
            const cached = this.cache.get(dtsPath);
            if (cached)
                return cached;
        }
        // Parse and cache
        const templateInterface = this.parser.parseTemplateInterface(dtsPath);
        if (templateInterface && config.get('cacheEnabled')) {
            this.cache.set(dtsPath, templateInterface);
        }
        return templateInterface;
    }
    findPropertyInfo(word, templateInterface) {
        // Handle direct property access
        for (const prop of templateInterface.properties) {
            if (prop.name === word) {
                return {
                    name: prop.name,
                    type: prop.type,
                    optional: prop.optional
                };
            }
            // Handle nested property access (e.g., "user.name", "posts[0].title")
            if (word.startsWith(prop.name + '.')) {
                const nestedPath = word.substring(prop.name.length + 1);
                const nestedInfo = this.findNestedProperty(nestedPath, prop);
                if (nestedInfo) {
                    return {
                        name: nestedInfo.name,
                        type: nestedInfo.type,
                        optional: nestedInfo.optional || prop.optional
                    };
                }
            }
            // Handle array access (e.g., "posts[0]")
            const arrayMatch = word.match(new RegExp(`^${prop.name}\\[(\\d+)\\]`));
            if (arrayMatch && prop.type.includes('Array')) {
                const arrayType = this.extractArrayType(prop.type);
                if (arrayType) {
                    return {
                        name: `${prop.name}[${arrayMatch[1]}]`,
                        type: arrayType,
                        optional: prop.optional
                    };
                }
            }
        }
        return null;
    }
    findNestedProperty(path, parent) {
        if (!parent.nested)
            return null;
        const parts = path.split('.');
        let current = parent;
        for (const part of parts) {
            if (current.nested) {
                const found = current.nested.find((prop) => prop.name === part);
                if (!found)
                    return null;
                current = found;
            }
            else {
                return null;
            }
        }
        return {
            name: path,
            type: current.type,
            optional: current.optional
        };
    }
    extractArrayType(arrayType) {
        // Extract type from Array<Type> or Type[]
        const arrayMatch = arrayType.match(/Array<(.+)>/);
        if (arrayMatch) {
            return arrayMatch[1];
        }
        const bracketMatch = arrayType.match(/(.+)\[\]$/);
        if (bracketMatch) {
            return bracketMatch[1];
        }
        return null;
    }
    dispose() {
        this.cache.dispose();
    }
}
exports.HandlebarsHoverProvider = HandlebarsHoverProvider;
//# sourceMappingURL=hoverProvider.js.map