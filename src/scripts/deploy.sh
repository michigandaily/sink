rm -rf $1
git worktree add --detach $1
(cd dist; git checkout --orphan gh-pages)
(cd dist; git reset --hard)
(cd dist; git pull -s ours --no-edit origin gh-pages --allow-unrelated-histories || echo "Could not pull from origin.")

yarn build

BRANCH=$(git branch --show-current)
(cd dist; git add --all)
(cd dist; git commit -m "Build output as of $(git log '--format=format:%H' $BRANCH -1)" || echo "No changes to commit.")
(cd dist; git push -u origin gh-pages)
git worktree remove $1
git branch -D gh-pages
