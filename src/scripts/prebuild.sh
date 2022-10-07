rm -rf $1
git worktree add --detach $1
(cd dist; git checkout --orphan gh-pages)
(cd dist; git reset --hard)
(cd dist; git pull -s ours --no-edit origin gh-pages --allow-unrelated-histories || echo "Could not pull from origin.")
