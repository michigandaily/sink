WORKTREE_PATH=.sink-github-deploy-worktree-$1

# build artifacts
if [[ $2 = "true" ]] 
then
  yarn build
else
  echo "Skipping build step."
fi

# initialize worktree
rm -rf $WORKTREE_PATH
git worktree add --detach $WORKTREE_PATH
(cd $WORKTREE_PATH; git checkout --orphan $3)
(cd $WORKTREE_PATH; git reset --hard)
(cd $WORKTREE_PATH; git pull -s ours --no-edit origin $3 --allow-unrelated-histories || echo "Could not pull from origin.")

cp -r $1/* $WORKTREE_PATH/

# deploy build artifacts
BRANCH=$(git branch --show-current)
(cd $WORKTREE_PATH; git add --all)
(cd $WORKTREE_PATH; git commit -m "Build output as of $(git log '--format=format:%H' $BRANCH -1)" || echo "No changes to commit.")
(cd $WORKTREE_PATH; git push -u origin $3)

# clean up worktree
git worktree remove $WORKTREE_PATH
git branch -D $3
rm -rf $WORKTREE_PATH
