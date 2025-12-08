import * as vscode from 'vscode';
import { HandlebarsCompletionProvider } from './providers/completionProvider';
import { HandlebarsHoverProvider } from './providers/hoverProvider';
import { isHandlebarsFile } from './utils/fileUtils';

export function activate(context: vscode.ExtensionContext) {
  console.log('Handlebars IntelliSense extension is now active!');
  
  // Document selector for all Handlebars file types
  const documentSelector = [
    { language: 'handlebars', scheme: 'file' },
    { language: 'handlebars', scheme: 'untitled' }
  ];
  
  // Register completion provider
  const completionProvider = new HandlebarsCompletionProvider();
  const completionRegistration = vscode.languages.registerCompletionItemProvider(
    documentSelector,
    completionProvider,
    '{{', '#', ' ', '.', '['
  );
  
  // Register hover provider
  const hoverProvider = new HandlebarsHoverProvider();
  const hoverRegistration = vscode.languages.registerHoverProvider(
    documentSelector,
    hoverProvider
  );
  
  // Register disposables
  context.subscriptions.push(
    completionRegistration,
    hoverProvider,
    completionProvider,
    hoverProvider
  );
  
  // Log activation
  console.log('Handlebars IntelliSense providers registered for:', documentSelector);
}

export function deactivate() {
  console.log('Handlebars IntelliSense extension deactivated');
}