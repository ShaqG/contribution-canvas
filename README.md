# Contribution Canvas · 贡献图画布

用浏览器打开 [index.html](index.html) 即可离线编辑。首次打开是当年的空白画布，可以选择 2008 年至当年之间的任意年份。

1. 点击色块设置画笔。鼠标可以拖着画，触屏可以点按。用键盘时，按方向键选日期，按空格着色。
2. 输入最多 8 个英文字母、数字或空格，将像素文字叠加到画布。选橡皮擦可以擦掉单格，撤销可恢复上一笔。
3. 点击 **导出 JSON**，把文件保存到此目录。文件名包含所选年份，也可以随时导入图案继续编辑。

每格的数字是计划新增的提交数。实际主页会将这些提交与已有活动合并，颜色深浅可能和预览不同。

下图是 2025 年的示例。下载 [HELLO WORLD 图案](hello-world-2025.json)，在编辑器中导入就能查看和修改。

![HELLO WORLD 贡献图预览](hello-world-2025.png)

## 生成本地 Git 仓库

需要 Python 3.8 或更新版本，以及可以通过命令行调用的 Git。把下面的 `contributions-YEAR.json` 换成实际导出的文件名，先查看日期范围和提交总数。

```powershell
python repo_generator.py contributions-YEAR.json --dry-run
```

生成仓库时，选择一个尚不存在的输出目录，并填写 GitHub 账号已关联的邮箱。可以在 GitHub 的邮箱设置中查看用于提交的地址。

```powershell
python repo_generator.py contributions-YEAR.json --output artwork --name "YOUR_NAME" --email "YOUR_GITHUB_EMAIL"
git -C artwork log --format="%aI %s"
```

脚本会在新目录的 `main` 分支生成图案提交。作者和提交时间都设为所选日期的北京时间中午。生成的仓库会注明这些提交用于图案创作。

## 显示在 GitHub 主页

确认本地历史后，可以在 GitHub 建立一个独立空仓库，例如 `contribution-art`。创建时跳过 README、许可证和 `.gitignore`，然后手动推送。

```powershell
git -C artwork remote add origin https://github.com/YOUR_USERNAME/contribution-art.git
git -C artwork push -u origin main
```

确认 GitHub 仓库的默认分支是 `main`，再在个人主页切换到所选年份。GitHub 会根据作者日期和邮箱等条件统计提交。[查看 GitHub 贡献规则](https://docs.github.com/en/account-and-profile/reference/profile-contributions-reference)

设计流程参考 [Mechmallow/git_matrix](https://github.com/Mechmallow/git_matrix)。

本工具采用 [MIT 许可证](LICENSE)。
