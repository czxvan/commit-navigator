const vscode = require('vscode');

function getPythonPath() {
    return process.platform === 'win32' ? 'python.exe' : 'python3';
}

async function showInfo(message) {
    await vscode.window.showInformationMessage(message).then(() => {
        setTimeout(() => {
            vscode.commands.executeCommand('workbench.action.closeMessages');
        }, 2000);
    });
}

async function showError(message) {
    await vscode.window.showErrorMessage(message).then(() => {
        setTimeout(() => {
            vscode.commands.executeCommand('workbench.action.closeMessages');
        }, 2000);
    });
}

module.exports = {
    getPythonPath,
    showInfo,
    showError,
};