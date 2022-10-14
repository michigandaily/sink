rm -rf $1
git worktree add --detach $1
(cd $1; git checkout --orphan gh-pages)
(cd $1; git reset --hard)
(cd $1; git pull -s ours --no-edit origin gh-pages --allow-unrelated-histories || echo "Could not pull from origin.")

yarn build

BRANCH=$(git branch --show-current)
(cd $1; git add --all)
(cd $1; git commit -m "Build output as of $(git log '--format=format:%H' $BRANCH -1)" || echo "No changes to commit.")
(cd $1; git push -u origin gh-pages)
git worktree remove $1
git branch -D gh-pages
