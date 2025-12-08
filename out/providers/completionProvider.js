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
exports.HandlebarsCompletionProvider = void 0;
const vscode = __importStar(require("vscode"));
const dtsParser_1 = require("../parsers/dtsParser");
const interfaceCache_1 = require("../cache/interfaceCache");
const fileUtils_1 = require("../utils/fileUtils");
class HandlebarsCompletionProvider {
    constructor() {
        this.parser = new dtsParser_1.DtsParser();
        this.cache = new interfaceCache_1.InterfaceCache();
        this.messageShown = false;
    }
    async provideCompletionItems(document, position, token, context) {
        const config = vscode.workspace.getConfiguration('handlebars.intellisense');
        if (!config.get('enabled')) {
            return [];
        }
        const templateInterface = await this.getTemplateInterface(document);
        const linePrefix = document.getText(new vscode.Range(position.line, 0, position.line, position.character));
        const completionContext = (0, fileUtils_1.parseCompletionContext)(linePrefix);
        // Debug logging
        console.log('[Handlebars Completion]', {
            linePrefix: JSON.stringify(linePrefix),
            position: position.character,
            triggerChar: context.triggerCharacter,
            triggerKind: context.triggerKind,
            contextType: completionContext.type,
            helperName: completionContext.helperName,
            basePath: completionContext.basePath,
            hasTemplateInterface: !!templateInterface
        });
        // Handle each context type, checking for templateInterface where needed
        switch (completionContext.type) {
            case 'expression-start':
                if (!templateInterface) {
                    return this.getHandlebarsHelpers(completionContext);
                }
                return this.getRootProperties(templateInterface).concat(this.getHandlebarsHelpers(completionContext));
            case 'property':
                if (!templateInterface) {
                    return [];
                }
                if (completionContext.basePath) {
                    return this.getPropertyCompletions(completionContext.basePath, templateInterface);
                }
                break;
            case 'helper':
                if (completionContext.helperName) {
                    if (!templateInterface) {
                        // Show popup message when template not found
                        this.showTemplateNotFoundMessage();
                        return [];
                    }
                    return this.getHelperCompletions(completionContext.helperName, templateInterface);
                }
                return this.getHandlebarsHelpers(completionContext);
        }
        // Fallback
        return this.getHandlebarsHelpers(completionContext);
    }
    async getTemplateInterface(document) {
        const dtsPath = (0, fileUtils_1.getDtsPath)(document.uri.fsPath);
        // Debug: Log file discovery
        console.log('[Handlebars Completion] getDtsPath:', {
            hbsFile: document.uri.fsPath,
            dtsPath: dtsPath
        });
        if (!dtsPath) {
            console.log('[Handlebars Completion] No .d.ts file found');
            return null;
        }
        // Check cache first
        const config = vscode.workspace.getConfiguration('handlebars.intellisense');
        if (config.get('cacheEnabled')) {
            const cached = this.cache.get(dtsPath);
            if (cached) {
                console.log('[Handlebars Completion] Using cached template interface');
                return cached;
            }
        }
        // Parse and cache
        const templateInterface = this.parser.parseTemplateInterface(dtsPath);
        // Debug: Log parsing result
        console.log('[Handlebars Completion] Template interface parsed:', {
            dtsPath,
            found: !!templateInterface,
            propertyCount: templateInterface?.properties.length || 0
        });
        if (templateInterface && config.get('cacheEnabled')) {
            this.cache.set(dtsPath, templateInterface);
        }
        return templateInterface;
    }
    getRootProperties(templateInterface) {
        return templateInterface.properties.map(prop => {
            const item = new vscode.CompletionItem(prop.name, vscode.CompletionItemKind.Variable);
            item.detail = prop.type;
            item.documentation = new vscode.MarkdownString(`\`${prop.type}${prop.optional ? '?' : ''}\``);
            if (prop.optional) {
                item.insertText = prop.name;
            }
            return item;
        });
    }
    getPropertyCompletions(basePath, templateInterface) {
        const parts = basePath.split('.');
        let current;
        // Find the base property
        for (const prop of templateInterface.properties) {
            if (prop.name === parts[0]) {
                current = prop;
                break;
            }
        }
        if (!current)
            return [];
        // Navigate through nested properties
        for (let i = 1; i < parts.length; i++) {
            if (current.nested) {
                current = current.nested.find(n => n.name === parts[i]);
                if (!current)
                    return [];
            }
            else {
                return [];
            }
        }
        // Return completions for the final property
        if (current.nested) {
            return current.nested.map(prop => {
                const item = new vscode.CompletionItem(prop.name, vscode.CompletionItemKind.Property);
                item.detail = prop.type;
                item.documentation = new vscode.MarkdownString(`\`${prop.type}${prop.optional ? '?' : ''}\``);
                return item;
            });
        }
        return [];
    }
    getHelperCompletions(helperName, templateInterface) {
        switch (helperName) {
            case 'if':
            case 'unless':
                return this.getConditionalCompletions(templateInterface);
            case 'each':
                return this.getEachCompletions(templateInterface);
            case 'with':
                return this.getWithCompletions(templateInterface);
            default:
                return [];
        }
    }
    getConditionalCompletions(templateInterface) {
        const completions = [];
        // Add optional properties (primary use case for conditionals)
        templateInterface.properties
            .filter(prop => prop.optional)
            .forEach(prop => {
            const item = new vscode.CompletionItem(prop.name, vscode.CompletionItemKind.Variable);
            item.detail = `Optional: ${prop.type}`;
            item.insertText = prop.name;
            item.documentation = new vscode.MarkdownString(`Checks if \`${prop.name}\` exists and is truthy\n\nType: \`${prop.type}?\``);
            item.sortText = '1_' + prop.name; // Sort optional first
            completions.push(item);
        });
        // Add array properties (to check if array has items)
        templateInterface.properties
            .filter(prop => this.isArrayType(prop.type) && !prop.optional)
            .forEach(prop => {
            const item = new vscode.CompletionItem(prop.name, vscode.CompletionItemKind.Variable);
            item.detail = `Array: ${prop.type}`;
            item.insertText = prop.name;
            item.documentation = new vscode.MarkdownString(`Checks if \`${prop.name}\` has items\n\nType: \`${prop.type}\``);
            item.sortText = '2_' + prop.name; // Sort arrays second
            completions.push(item);
        });
        // Add object properties (to check if object exists)
        templateInterface.properties
            .filter(prop => this.isObjectType(prop.type) && !prop.optional && !this.isArrayType(prop.type))
            .forEach(prop => {
            const item = new vscode.CompletionItem(prop.name, vscode.CompletionItemKind.Variable);
            item.detail = `Object: ${prop.type}`;
            item.insertText = prop.name;
            item.documentation = new vscode.MarkdownString(`Checks if \`${prop.name}\` exists\n\nType: \`${prop.type}\``);
            item.sortText = '3_' + prop.name; // Sort objects third
            completions.push(item);
        });
        // Add nested optional properties with full paths
        templateInterface.properties.forEach(prop => {
            if (prop.nested) {
                this.addNestedOptionalProperties(prop.nested, prop.name, completions);
            }
        });
        return completions;
    }
    addNestedOptionalProperties(properties, basePath, completions) {
        properties.forEach(prop => {
            const fullPath = `${basePath}.${prop.name}`;
            if (prop.optional) {
                const item = new vscode.CompletionItem(fullPath, vscode.CompletionItemKind.Variable);
                item.detail = `Conditional check for ${prop.name}`;
                item.insertText = fullPath;
                item.documentation = new vscode.MarkdownString(`Checks if \`${fullPath}\` exists and is truthy`);
                completions.push(item);
            }
            if (prop.nested) {
                this.addNestedOptionalProperties(prop.nested, fullPath, completions);
            }
        });
    }
    getEachCompletions(templateInterface) {
        return templateInterface.properties
            .filter(prop => prop.type.includes('Array') || prop.type.includes('[]'))
            .map(prop => {
            const item = new vscode.CompletionItem(prop.name, vscode.CompletionItemKind.Variable);
            item.detail = `Iterate over ${prop.name}`;
            item.insertText = prop.name;
            item.documentation = new vscode.MarkdownString(`Iterates over the \`${prop.name}\` array\n\nType: \`${prop.type}\``);
            return item;
        });
    }
    getWithCompletions(templateInterface) {
        return templateInterface.properties
            .filter(prop => prop.type.includes('{') || prop.type.includes('object'))
            .map(prop => {
            const item = new vscode.CompletionItem(prop.name, vscode.CompletionItemKind.Variable);
            item.detail = `Change context to ${prop.name}`;
            item.insertText = prop.name;
            item.documentation = new vscode.MarkdownString(`Changes the context to \`${prop.name}\`\n\nType: \`${prop.type}\``);
            return item;
        });
    }
    getHandlebarsHelpers(completionContext) {
        const helpers = [
            { name: 'if', detail: 'Conditional block' },
            { name: 'unless', detail: 'Negative conditional block' },
            { name: 'each', detail: 'Iterate over array' },
            { name: 'with', detail: 'Change context' },
            { name: 'this', detail: 'Current context' },
            { name: 'else', detail: 'Else block for if/unless' },
            { name: 'lookup', detail: 'Lookup property in context' }
        ];
        return helpers.map(helper => {
            const item = new vscode.CompletionItem(helper.name, vscode.CompletionItemKind.Function);
            item.detail = helper.detail;
            item.documentation = new vscode.MarkdownString(`Handlebars helper: ${helper.detail}`);
            // Add insert text for helpers that need it
            if (['if', 'unless', 'each', 'with'].includes(helper.name)) {
                item.insertText = new vscode.SnippetString(`${helper.name} $1`);
            }
            return item;
        });
    }
    showTemplateNotFoundMessage() {
        // Only show once per session to avoid spam
        if (this.messageShown) {
            return;
        }
        this.messageShown = true;
        vscode.window.showInformationMessage('Handlebars IntelliSense: No Template interface found. ' +
            'Create a .d.ts file with the same name as your .hbs file containing a "Template" interface.');
    }
    isArrayType(type) {
        // Check for Array<T>, T[], ReadonlyArray<T>
        return type.includes('Array<') ||
            type.includes('[]') ||
            type.includes('ReadonlyArray<');
    }
    isObjectType(type) {
        // Check for object literals { } or explicit "object" type
        return type.includes('{') || type.includes('object');
    }
    dispose() {
        this.cache.dispose();
    }
}
exports.HandlebarsCompletionProvider = HandlebarsCompletionProvider;
//# sourceMappingURL=completionProvider.js.map