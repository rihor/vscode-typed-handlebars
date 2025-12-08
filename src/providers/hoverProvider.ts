import * as vscode from 'vscode';
import { DtsParser } from '../parsers/dtsParser';
import { TemplateInterface, PropertyInfo } from '../parsers/types';
import { InterfaceCache } from '../cache/interfaceCache';
import { getDtsPath } from '../utils/fileUtils';

export class HandlebarsHoverProvider implements vscode.HoverProvider {
  private parser = new DtsParser();
  private cache = new InterfaceCache();
  
  async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): Promise<vscode.Hover | null> {
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
  
  private async getTemplateInterface(document: vscode.TextDocument): Promise<TemplateInterface | null> {
    const dtsPath = getDtsPath(document.uri.fsPath);
    if (!dtsPath) return null;
    
    // Check cache first
    const config = vscode.workspace.getConfiguration('handlebars.intellisense');
    if (config.get('cacheEnabled')) {
      const cached = this.cache.get(dtsPath);
      if (cached) return cached;
    }
    
    // Parse and cache
    const templateInterface = this.parser.parseTemplateInterface(dtsPath);
    if (templateInterface && config.get('cacheEnabled')) {
      this.cache.set(dtsPath, templateInterface);
    }
    
    return templateInterface;
  }
  
  private findPropertyInfo(word: string, templateInterface: TemplateInterface): PropertyInfo | null {
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
  
  private findNestedProperty(path: string, parent: any): PropertyInfo | null {
    if (!parent.nested) return null;
    
    const parts = path.split('.');
    let current: any = parent;
    
    for (const part of parts) {
      if (current.nested) {
        const found = current.nested.find((prop: any) => prop.name === part);
        if (!found) return null;
        current = found;
      } else {
        return null;
      }
    }
    
    return {
      name: path,
      type: current.type,
      optional: current.optional
    };
  }
  
  private extractArrayType(arrayType: string): string | null {
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
  
  dispose(): void {
    this.cache.dispose();
  }
}