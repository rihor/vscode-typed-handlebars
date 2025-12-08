import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import { TemplateInterface, PropertyDefinition } from './types';

export class DtsParser {
  parseTemplateInterface(filePath: string): TemplateInterface | null {
    if (!fs.existsSync(filePath)) return null;
    
    try {
      const sourceText = fs.readFileSync(filePath, 'utf-8');
      const sourceFile = ts.createSourceFile(
        filePath,
        sourceText,
        ts.ScriptTarget.Latest,
        true
      );
      
      return this.extractTemplateInterface(sourceFile);
    } catch (error) {
      console.error(`Error parsing ${filePath}:`, error);
      return null;
    }
  }
  
  private extractTemplateInterface(sourceFile: ts.SourceFile): TemplateInterface | null {
    let templateInterface: TemplateInterface | null = null;
    
    ts.forEachChild(sourceFile, (node) => {
      if (ts.isInterfaceDeclaration(node) && node.name.getText() === 'Template') {
        templateInterface = this.parseInterfaceProperties(node);
      }
    });
    
    return templateInterface;
  }
  
  private parseInterfaceProperties(node: ts.InterfaceDeclaration): TemplateInterface {
    const properties: PropertyDefinition[] = [];
    
    node.members.forEach((member) => {
      if (ts.isPropertySignature(member)) {
        properties.push(this.parseProperty(member));
      }
    });
    
    return { properties };
  }
  
  private parseProperty(member: ts.PropertySignature): PropertyDefinition {
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
  
  private parseType(typeNode: ts.TypeNode | undefined): string {
    if (!typeNode) return 'any';
    return typeNode.getText();
  }
  
  private parseNestedProperties(typeNode: ts.TypeNode | undefined): PropertyDefinition[] | undefined {
    if (!typeNode) return undefined;
    
    // Handle object types
    if (ts.isTypeLiteralNode(typeNode)) {
      const properties: PropertyDefinition[] = [];
      
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