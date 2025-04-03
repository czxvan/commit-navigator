const vscode = require('vscode');
const { spawn } = require('child_process');
const path = require('path');

// 创建状态栏指示器
let statusBarItem;

function activate(context) {
    // 初始化状态栏
    statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
    );
    statusBarItem.text = '$(git-branch) 提交导航';
    statusBarItem.command = 'commitNavigator.navigate';
    statusBarItem.tooltip = '点击切换Git提交';
    statusBarItem.show();

    // 注册主命令
    const disposable = vscode.commands.registerCommand('commitNavigator.navigate', async () => {
        const target = await showNavigationPanel();
        if (!target) return;

        const workspacePath = vscode.workspace.rootPath;
        if (!workspacePath) {
            vscode.window.showErrorMessage('请先打开Git仓库目录');
            return;
        }

        // 获取Python脚本绝对路径
        const pythonScript = context.asAbsolutePath(
            path.join('src', 'navigator.py')
        );

        // 执行Python脚本
        const pythonProcess = spawn(getPythonPath(), [pythonScript, target], {
            cwd: workspacePath
        });

        // 处理输出结果
        pythonProcess.stdout.on('data', (data) => {
            updateStatusBar(data.toString());
            vscode.window.showInformationMessage(data.toString());
        });

        // 处理错误信息
        pythonProcess.stderr.on('data', (data) => {
            vscode.window.showErrorMessage(`导航失败: ${data}`);
        });
    });

    context.subscriptions.push(disposable, statusBarItem);
}

// 跨平台获取Python路径
function getPythonPath() {
    return process.platform === 'win32' ? 'python.exe' : 'python3';
}

// 显示导航选择面板
async function showNavigationPanel() {
    const options = [
        { label: '⬅️ 上一提交', target: 'prev' },
        { label: '➡️ 下一提交', target: 'next' },
        { label: '🏠 初始提交', target: 'init' },
        { label: '🎯 最新提交', target: 'head' },
        { label: '🔢 输入哈希/序号...', target: 'custom' }
    ];

    const selection = await vscode.window.showQuickPick(options, {
        placeHolder: '选择导航方式'
    });

    if (!selection) return null;

    if (selection.target === 'custom') {
        return await vscode.window.showInputBox({
            prompt: '输入提交哈希、序号、分支或标签',
            placeHolder: '示例：3a8b2c1 或 feature/login',
            validateInput: text => text ? null : '请输入有效标识'
        });
    }
    return selection.target;
}

// 更新状态栏信息
function updateStatusBar(message) {
    const match = message.match(/提交序号: (\d+).*提交哈希: (\w+)/);
    if (match) {
        statusBarItem.text = `$(git-commit) ${match[1]} | ${match[2].substring(0,7)}`;
    }
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};