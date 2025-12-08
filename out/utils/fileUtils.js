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
exports.getDtsPath = getDtsPath;
exports.isHandlebarsFile = isHandlebarsFile;
exports.parseCompletionContext = parseCompletionContext;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
function getDtsPath(hbsPath) {
    const parsed = path.parse(hbsPath);
    const dtsPath = path.join(parsed.dir, parsed.name + '.d.ts');
    return fs.existsSync(dtsPath) ? dtsPath : null;
}
function isHandlebarsFile(document) {
    const supportedExtensions = ['.hbs', '.handlebars', '.hbr', '.tpl'];
    const fileName = path.basename(document.uri.fsPath);
    return supportedExtensions.some(ext => fileName.endsWith(ext));
}
var ParseState;
(function (ParseState) {
    ParseState[ParseState["NORMAL"] = 0] = "NORMAL";
    ParseState[ParseState["OPEN_EXPRESSION"] = 1] = "OPEN_EXPRESSION";
    ParseState[ParseState["HELPER_BLOCK"] = 2] = "HELPER_BLOCK";
    ParseState[ParseState["HELPER_ARGS"] = 3] = "HELPER_ARGS";
    ParseState[ParseState["PROPERTY_ACCESS"] = 4] = "PROPERTY_ACCESS";
})(ParseState || (ParseState = {}));
class HandlebarsContextParser {
    constructor() {
        this.state = ParseState.NORMAL;
        this.helperName = '';
        this.propertyPath = '';
        this.lastChar = '';
    }
    parse(line, position) {
        // Reset state for fresh parse
        this.state = ParseState.NORMAL;
        this.helperName = '';
        this.propertyPath = '';
        this.lastChar = '';
        const chars = line.substring(0, position);
        for (let i = 0; i < chars.length; i++) {
            const char = chars[i];
            this.lastChar = char;
            switch (this.state) {
                case ParseState.NORMAL:
                    if (char === '{' && i + 1 < chars.length && chars[i + 1] === '{') {
                        this.state = ParseState.OPEN_EXPRESSION;
                        i++; // Skip second {
                    }
                    break;
                case ParseState.OPEN_EXPRESSION:
                    if (char === '#') {
                        this.state = ParseState.HELPER_BLOCK;
                        this.helperName = '';
                    }
                    else if (char === '/') {
                        // Closing expression
                        this.state = ParseState.NORMAL;
                    }
                    else if (char !== ' ' && char !== '\t') {
                        this.state = ParseState.PROPERTY_ACCESS;
                        this.propertyPath = char;
                    }
                    break;
                case ParseState.HELPER_BLOCK:
                    if (char === ' ' || char === '\t') {
                        if (this.helperName.length > 0) {
                            this.state = ParseState.HELPER_ARGS;
                        }
                    }
                    else if (char === '}') {
                        this.state = ParseState.NORMAL;
                    }
                    else {
                        this.helperName += char;
                    }
                    break;
                case ParseState.HELPER_ARGS:
                    if (char === '}') {
                        this.state = ParseState.NORMAL;
                    }
                    // Stay in HELPER_ARGS state - don't switch to property access
                    // The completion provider will handle suggesting properties based on helper name
                    break;
                case ParseState.PROPERTY_ACCESS:
                    if (char === '}') {
                        this.state = ParseState.NORMAL;
                    }
                    else if (char === '.') {
                        this.propertyPath += char;
                    }
                    else if (/[a-zA-Z0-9_\[\]]/.test(char)) {
                        this.propertyPath += char;
                    }
                    break;
            }
        }
        return this.getContext();
    }
    getContext() {
        switch (this.state) {
            case ParseState.HELPER_BLOCK:
                return {
                    type: 'helper',
                    helperName: this.helperName,
                    arguments: ''
                };
            case ParseState.HELPER_ARGS:
                return {
                    type: 'helper',
                    helperName: this.helperName,
                    arguments: ''
                };
            case ParseState.PROPERTY_ACCESS:
                return {
                    type: 'property',
                    basePath: this.propertyPath.split('.')[0],
                    isNested: this.propertyPath.includes('.')
                };
            case ParseState.OPEN_EXPRESSION:
                return {
                    type: 'expression-start'
                };
            default:
                // Check if we ended at a helper name without space
                if (this.helperName && this.lastChar !== ' ' && this.lastChar !== '\t') {
                    return {
                        type: 'helper',
                        helperName: this.helperName,
                        arguments: ''
                    };
                }
                return { type: 'unknown' };
        }
    }
}
function parseCompletionContext(linePrefix) {
    const trimmed = linePrefix.trim();
    // Let the state machine handle everything - no regex needed!
    const parser = new HandlebarsContextParser();
    return parser.parse(trimmed, trimmed.length);
}
//# sourceMappingURL=fileUtils.js.map