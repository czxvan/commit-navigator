import argparse
from git import Repo
from git.exc import GitError

class CommitNavigator:
    def __init__(self):
        self.repo = Repo(search_parent_directories=True)
        self.commits = list(self.repo.iter_commits(all=True, reverse=True))  # 按时间顺序排列
        self.current_commit = self.repo.head.commit

    def find_current_index(self):
        for idx, commit in enumerate(self.commits):
            if commit.hexsha == self.current_commit.hexsha:
                return idx
        raise ValueError("Current commit not found in history")

    def navigate(self, direction_or_target):
        if direction_or_target == "init":
            target_commit = self.commits[0]
        elif direction_or_target == "head":
            target_commit = self.commits[-1]
        elif direction_or_target == "next" or direction_or_target == "prev":
            current_idx = self.find_current_index()
            if direction_or_target == "next":
                target_idx = current_idx + 1
                if target_idx >= len(self.commits):
                    print("已处于最新提交")
                    return
            elif direction_or_target == "prev":
                target_idx = current_idx - 1
                if target_idx < 0:
                    print("已处于最旧提交")
                    return
            target_commit = self.commits[target_idx]
        elif direction_or_target.isdigit():
            target_idx = int(direction_or_target)
            if target_idx < 0 or target_idx >= len(self.commits):
                print("无效的提交序号")
                return
            target_commit = self.commits[target_idx]
        elif direction_or_target in self.repo.branches:
            target_commit = self.repo.branches[direction_or_target].commit
        elif direction_or_target in self.repo.tags:
            target_commit = self.repo.tags[direction_or_target].commit
        else:
            try:
                target_commit = next(commit for commit in self.commits if commit.hexsha.startswith(direction_or_target))
            except StopIteration:
                print("无效的提交哈希值、分支或标签")
                return

        self._checkout_commit(target_commit)
        self._show_status(target_commit)

    def _checkout_commit(self, commit):
        try:
            self.repo.git.checkout(commit.hexsha)
        except GitError as e:
            print(f"切换失败: {str(e)}")
            exit(1)

    def _show_status(self, commit):
        current_index = self.find_current_index()
        print(f"\n当前位于分离头指针状态 (detached HEAD)")
        print(f"提交序号: {current_index}")
        print(f"提交哈希: {commit.hexsha}")
        print(f"提交信息: {commit.message.splitlines()[0]}")
        print(f"提交时间: {commit.committed_datetime.strftime('%Y-%m-%d %H:%M')}")
        print(f"作者: {commit.author.name}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Git提交导航器")
    parser.add_argument("direction_or_target", help="导航方向或目标 (next, prev, init, head, 提交序号、哈希值、分支或标签)")
    args = parser.parse_args()

    navigator = CommitNavigator()
    navigator.navigate(args.direction_or_target)