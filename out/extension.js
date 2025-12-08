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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const completionProvider_1 = require("./providers/completionProvider");
const hoverProvider_1 = require("./providers/hoverProvider");
function activate(context) {
    console.log('Handlebars IntelliSense extension is now active!');
    // Document selector for all Handlebars file types
    const documentSelector = [
        { language: 'handlebars', scheme: 'file' },
        { language: 'handlebars', scheme: 'untitled' }
    ];
    // Register completion provider
    const completionProvider = new completionProvider_1.HandlebarsCompletionProvider();
    const completionRegistration = vscode.languages.registerCompletionItemProvider(documentSelector, completionProvider, '{{', '#', ' ', '.', '[');
    // Register hover provider
    const hoverProvider = new hoverProvider_1.HandlebarsHoverProvider();
    const hoverRegistration = vscode.languages.registerHoverProvider(documentSelector, hoverProvider);
    // Register disposables
    context.subscriptions.push(completionRegistration, hoverProvider, completionProvider, hoverProvider);
    // Log activation
    console.log('Handlebars IntelliSense providers registered for:', documentSelector);
}
function deactivate() {
    console.log('Handlebars IntelliSense extension deactivated');
}
//# sourceMappingURL=extension.js.map