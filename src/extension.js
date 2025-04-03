const vscode = require('vscode');
const { spawn } = require('child_process');
const path = require('path');
const { getPythonPath, showInfo, showError } = require('./utils');

let statusBarItem;

function activate(context) {
    // 初始化状态栏
    statusBarItem = createStatusBar();
    context.subscriptions.push(statusBarItem);

    // 命令配置集合
    const commands = [
        {command: 'gitnav.showPanel',   commandType: 'panel' },
        {command: 'gitnav.prev',        commandType: 'prev' },
        {command: 'gitnav.next',        commandType: 'next' },
        {command: 'gitnav.init',        commandType: 'init' },
        {command: 'gitnav.head',        commandType: 'head' },
        {command: 'gitnav.custom',      commandType: 'custom' }
    ];

    // 批量注册命令
    commands.forEach(({ command, commandType }) => {
        const disposable = vscode.commands.registerCommand(command, async () =>
            await handleCommand(context, commandType)
        );
        context.subscriptions.push(disposable);
    });
}

// 统一命令处理
const handleCommand = async (context, commandType) => {
    const workspacePath = vscode.workspace.rootPath;
    if (!workspacePath) return await showError('请先打开Git仓库目录');

    const pythonScript = context.asAbsolutePath(path.join('src', 'gitnav.py'));
    const target = commandType === 'custom'
        ? await getCustomInput()
        : commandType === 'panel'
        ? await showNavigationPanel()
        : commandType;

    if (!target) return;

    await executePythonProcess(pythonScript, workspacePath, target);
};

// 封装Python执行逻辑
const executePythonProcess = async (script, cwd, target) => {
    const pythonProcess = spawn(getPythonPath(), [script, target], { cwd });

    pythonProcess.stdout.on('data', async data => {
        const message = data.toString();
        updateStatusBar(message);
        console.log(message);
        await showInfo(message);
    });

    pythonProcess.stderr.on('data', async data => {
        await showError(`导航失败: ${data}`);
    });
};

const getCustomInput = async () => vscode.window.showInputBox({
    prompt: '输入提交哈希、序号、分支或标签',
    placeHolder: '示例：3a8b2c1 或 feature/login',
    validateInput: text => text ? null : '请输入有效标识'
});

// 显示导航选择面板
const showNavigationPanel = async () => {
    const makeOption = (label, target) => ({
        label: `${label} ➔ ${target}`,
        target
    });

    const options = [
        makeOption('⬅️ 上一提交', 'prev'),
        makeOption('➡️ 下一提交', 'next'),
        makeOption('🏠 初始提交', 'init'),
        makeOption('🎯 最新提交', 'head'),
        {
            ...makeOption('🔢 自定义输入', 'custom'),
            execute: async () => {
                return await getCustomInput();
            }
        }
    ];

    const selection = await vscode.window.showQuickPick(options, {
        placeHolder: '选择导航方式 (输入首字母快速定位)'
    });

    return selection?.execute ? await selection.execute() : selection?.target;
}

// 状态栏创建
const createStatusBar = () => {
    const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    item.text = '$(git-branch) GitNav';
    item.command = 'gitnav.showPanel';
    item.tooltip = '打开GitNav面板';
    item.show();
    return item;
};

// 更新状态栏信息
function updateStatusBar(message) {
    match = extractCommitInfo(message)
    if (match) {
        const {idx, hash} = match;
        statusBarItem.text = `$(git-commit) GitNav: #${idx} | ${hash.slice(0, 5)}`;
    } else {
        console.log("No match found in the message.");
    }
}

// 从文本中提取提交序号和哈希
function extractCommitInfo(text) {
    const regex = /提交序号:\s*(\d+).*?提交哈希:\s*([a-f0-9]{40})/s;
    const match = text.match(regex);
    if (match) {
        console.log(match)
        return {
            idx: match[1],
            hash: match[2]
        };
    }
    return null;
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
