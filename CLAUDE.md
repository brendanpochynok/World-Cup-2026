# Claude Code Instructions

## Pull Requests

After pushing a branch and creating a PR, **always squash-merge it to main immediately**. Do not wait for the user to ask.

Steps every time:
1. Push branch
2. Create PR (draft is fine)
3. Un-draft the PR if needed (`update_pull_request draft: false`)
4. Squash-merge to main (`merge_pull_request merge_method: "squash"`)
