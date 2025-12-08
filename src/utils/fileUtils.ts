import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export function getDtsPath(hbsPath: string): string | null {
  const parsed = path.parse(hbsPath);
  const dtsPath = path.join(parsed.dir, parsed.name + '.d.ts');
  return fs.existsSync(dtsPath) ? dtsPath : null;
}

export function isHandlebarsFile(document: vscode.TextDocument): boolean {
  const supportedExtensions = ['.hbs', '.handlebars', '.hbr', '.tpl'];
  const fileName = path.basename(document.uri.fsPath);
  return supportedExtensions.some(ext => fileName.endsWith(ext));
}

enum ParseState {
  NORMAL = 0,
  OPEN_EXPRESSION = 1,
  HELPER_BLOCK = 2,
  HELPER_ARGS = 3,
  PROPERTY_ACCESS = 4
}

class HandlebarsContextParser {
  private state = ParseState.NORMAL;
  private helperName = '';
  private propertyPath = '';
  private lastChar = '';
  
  parse(line: string, position: number): CompletionContext {
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
          } else if (char === '/') {
            // Closing expression
            this.state = ParseState.NORMAL;
          } else if (char !== ' ' && char !== '\t') {
            this.state = ParseState.PROPERTY_ACCESS;
            this.propertyPath = char;
          }
          break;
          
        case ParseState.HELPER_BLOCK:
          if (char === ' ' || char === '\t') {
            if (this.helperName.length > 0) {
              this.state = ParseState.HELPER_ARGS;
            }
          } else if (char === '}') {
            this.state = ParseState.NORMAL;
          } else {
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
          } else if (char === '.') {
            this.propertyPath += char;
          } else if (/[a-zA-Z0-9_\[\]]/.test(char)) {
            this.propertyPath += char;
          }
          break;
      }
    }
    
    return this.getContext();
  }
  
  private getContext(): CompletionContext {
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

export function parseCompletionContext(linePrefix: string): CompletionContext {
  const trimmed = linePrefix.trim();
  
  // Let the state machine handle everything - no regex needed!
  const parser = new HandlebarsContextParser();
  return parser.parse(trimmed, trimmed.length);
}

export interface CompletionContext {
  type: 'helper' | 'property' | 'expression-start' | 'unknown';
  helperName?: string;
  arguments?: string;
  basePath?: string;
  isNested?: boolean;
}
