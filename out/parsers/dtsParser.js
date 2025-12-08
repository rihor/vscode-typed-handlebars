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
exports.DtsParser = void 0;
const ts = __importStar(require("typescript"));
const fs = __importStar(require("fs"));
class DtsParser {
    parseTemplateInterface(filePath) {
        if (!fs.existsSync(filePath))
            return null;
        try {
            const sourceText = fs.readFileSync(filePath, 'utf-8');
            const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true);
            return this.extractTemplateInterface(sourceFile);
        }
        catch (error) {
            console.error(`Error parsing ${filePath}:`, error);
            return null;
        }
    }
    extractTemplateInterface(sourceFile) {
        let templateInterface = null;
        ts.forEachChild(sourceFile, (node) => {
            if (ts.isInterfaceDeclaration(node) && node.name.getText() === 'Template') {
                templateInterface = this.parseInterfaceProperties(node);
            }
        });
        return templateInterface;
    }
    parseInterfaceProperties(node) {
        const properties = [];
        node.members.forEach((member) => {
            if (ts.isPropertySignature(member)) {
                properties.push(this.parseProperty(member));
            }
        });
        return { properties };
    }
    parseProperty(member) {
        const name = member.name?.getText() || 'unknown';
        const typeNode = member.type;
        const type = typeNode ? this.parseType(typeNode) : 'any';
        const optional = member.questionToken !== undefined;
        const nested = this.parseNestedProperties(typeNode);
        return {
            name,
            type,
            optional,
            nested
        };
    }
    parseType(typeNode) {
        if (!typeNode)
            return 'any';
        return typeNode.getText();
    }
    parseNestedProperties(typeNode) {
        if (!typeNode)
            return undefined;
        // Handle object types
        if (ts.isTypeLiteralNode(typeNode)) {
            const properties = [];
            typeNode.members.forEach((member) => {
                if (ts.isPropertySignature(member)) {
                    properties.push(this.parseProperty(member));
                }
            });
            return properties;
        }
        // Handle interface references
        if (ts.isTypeReferenceNode(typeNode)) {
            // For now, we don't resolve external interface references
            // This could be enhanced in the future
            return undefined;
        }
        return undefined;
    }
}
exports.DtsParser = DtsParser;
//# sourceMappingURL=dtsParser.js.map