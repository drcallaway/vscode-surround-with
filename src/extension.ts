'use strict';

import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {

    let ifSurround = vscode.commands.registerCommand('extension.surroundWithIf', async () => {
        var { editor, startLine, endLine, selection } = await processSelection();

        // surround with if
        await editor.edit(currentText => {
            currentText.replace(startLine.range.union(endLine.range), surroundWithIf(selection));
        });

        // highlight if condition
        await editor.edit(() => {
            const position = new vscode.Position(startLine.lineNumber, startLine.firstNonWhitespaceCharacterIndex + 4);
            editor.selection = new vscode.Selection(position, position);
        });
    });

    let trySurround = vscode.commands.registerCommand('extension.surroundWithTry', async () => {
        var { editor, startLine, endLine, selection, lines } = await processSelection();

        // surround with try/catch
        await editor.edit(currentText => {
            currentText.replace(startLine.range.union(endLine.range), surroundWithTry(selection));
        });

        // highlight catch variable
        await editor.edit(() => {
            const catchBodyLineNumber = startLine.lineNumber + lines.length + 2;
            const catchLine = editor.document.lineAt(catchBodyLineNumber);
            const position = new vscode.Position(catchLine.lineNumber, catchLine.text.length);
            editor.selection = new vscode.Selection(position, position);
        });
    });

    context.subscriptions.push(ifSurround);
    context.subscriptions.push(trySurround);
}

async function processSelection() {
    const editor = vscode.window.activeTextEditor;
    let selection = editor.selection;
    if (selection.isEmpty) {
        selection = getCurrentLineSelection(selection);
    }
    let lines = getSelectLines(selection);
    const startLine = lines[0];
    let endLine = lines[lines.length - 1];
    if (selection.end.character === 0) {
        // if end selection is at the start of the last line, update selection to not include that line
        await editor.edit(currentText => {
            editor.selection = new vscode.Selection(new vscode.Position(startLine.lineNumber, 0), new vscode.Position(endLine.lineNumber - 1, endLine.range.end.character));
        });
        selection = editor.selection;
        lines = getSelectLines(selection);
        endLine = lines[lines.length - 1];
    }
    return { editor, startLine, endLine, selection, lines };
}

function surroundWithIf(selection: vscode.Selection) {
    let lines = getSelectLines(selection);
    const { prefix } = getPrefixAndIndent(lines[0]);
    return [
        `${prefix}if () {`,
        ...indentLines(lines),
        `${prefix}}`
    ].join('\n');
}

function surroundWithTry(selection: vscode.Selection) {
    let lines = getSelectLines(selection);
    const { prefix, indent } = getPrefixAndIndent(lines[0]);
    return [
        `${prefix}try {`,
        ...indentLines(lines),
        `${prefix}} catch (error) {`,
        `${prefix}${indent}console.error(error);`,
        `${prefix}}`,
    ].join('\n');
}

function getCurrentLineSelection(selection: vscode.Selection) {
    const pos = selection.active;
    let line = vscode.window.activeTextEditor.document.lineAt(pos.line);
    return line.range as vscode.Selection;
}

function getPrefixAndIndent(line: vscode.TextLine) {
    let indentLength = line.firstNonWhitespaceCharacterIndex;
    const { tabSize, insertSpaces } = vscode.window.activeTextEditor.options;
    return {
        indent: new Array((tabSize as number) + 1).join(insertSpaces ? ' ' : '\t'),
        prefix: new Array(indentLength + 1).join(insertSpaces ? ' ' : '\t')
    };
}

function getSelectLines(selection: vscode.Selection): vscode.TextLine[] {
    let lines = [];
    for (let i = selection.start.line; i < selection.end.line + 1; i++) {
        lines.push(vscode.window.activeTextEditor.document.lineAt(i));
    }
    return lines;
}

function indentLines(lines: vscode.TextLine[]) {
    const { tabSize, insertSpaces } = vscode.window.activeTextEditor.options;
    let prefix = insertSpaces ? new Array((tabSize as number) + 1).join(' ') : '\t';
    return lines.map(line => prefix + line.text);
}
