WORKTREE_PATH=.sink-github-deploy-worktree
BUILD_PATH=$1
SHOULD_BUILD=$2
DEPLOYMENT_BRANCH=$3
PACKAGE_MANAGER=$4

# build artifacts
if [[ $SHOULD_BUILD = "true" ]] 
then
  $PACKAGE_MANAGER run build
else
  echo "Skipping build step."
fi

# clean up worktree
if git worktree list --porcelain -z | grep -q $WORKTREE_PATH; then
  git worktree remove $WORKTREE_PATH
fi

if git show-ref --quiet refs/heads/$DEPLOYMENT_BRANCH; then
  git branch -D $DEPLOYMENT_BRANCH
fi

# initialize worktree
git worktree add --detach $WORKTREE_PATH
(cd $WORKTREE_PATH; git checkout --orphan $DEPLOYMENT_BRANCH)
(cd $WORKTREE_PATH; git reset --hard)
(cd $WORKTREE_PATH; git pull -s ours --no-edit origin $DEPLOYMENT_BRANCH --allow-unrelated-histories || echo "Could not pull from origin.")

cp -r $BUILD_PATH/* $WORKTREE_PATH/

# deploy build artifacts
BRANCH=$(git branch --show-current)
(cd $WORKTREE_PATH; git add --all)
(cd $WORKTREE_PATH; git commit -m "Build output as of $(git log '--format=format:%H' $BRANCH -1)" || echo "No changes to commit.")
(cd $WORKTREE_PATH; git push -u origin $DEPLOYMENT_BRANCH)

# clean up worktree
git worktree remove $WORKTREE_PATH
git branch -D $DEPLOYMENT_BRANCH
